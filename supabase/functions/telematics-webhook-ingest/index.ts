// supabase/functions/telematics-webhook-ingest/index.ts
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getServiceRoleClient, getEnv } from '../_shared/supabaseClient.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';
import {
  validateNumber,
  validateString,
  ValidationError,
  sanitizeLogData,
} from '../_shared/validator.ts';

interface TelematicsPing {
  device_id: string;
  bus_number: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  fuel_level?: number;
  battery_level?: number;
  odometer?: number;
  engine_status?: 'running' | 'idle' | 'stopped';
  fault_codes?: string[];
}

/**
 * Computes HMAC-SHA256 digest of payload for webhook signature verification.
 */
export async function computeHmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time comparison to prevent side-channel timing attacks on signatures.
 */
export function secureTimingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function handler(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method Not Allowed. Use POST.', 'METHOD_NOT_ALLOWED', 405);
  }

  // 1. PUBLIC ENDPOINT JUSTIFICATION & SECURITY POSTURE:
  // This webhook is intentionally public because embedded IoT telematics units (e.g. Teltonika, Tramigo)
  // in fleet buses stream high-frequency GPS telematics over cellular networks without browser session cookies.
  // Security is strictly enforced via pre-shared HMAC-SHA256 signatures, timestamp replay gates, and device rate limits.

  const webhookSecret = getEnv('TELEMATICS_WEBHOOK_SECRET') || 'fleetmind_telematics_hmac_secret_2026';
  const rawSignatureHeader = req.headers.get('X-FleetMind-Signature') || req.headers.get('x-signature') || '';
  const timestampHeader = req.headers.get('X-FleetMind-Timestamp') || req.headers.get('x-timestamp') || '';

  if (!rawSignatureHeader) {
    return errorResponse(
      'Missing required X-FleetMind-Signature header for telematics webhook verification.',
      'MISSING_SIGNATURE',
      401
    );
  }

  if (!timestampHeader) {
    return errorResponse(
      'Missing required X-FleetMind-Timestamp header for replay attack prevention.',
      'MISSING_TIMESTAMP',
      401
    );
  }

  // 2. Replay Attack Prevention (5-minute maximum tolerance)
  const incomingTime = Number(timestampHeader);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDifference = Math.abs(currentTime - (incomingTime > 1e11 ? Math.floor(incomingTime / 1000) : incomingTime));

  if (isNaN(timeDifference) || timeDifference > 300) {
    return errorResponse(
      `Timestamp drift (${timeDifference}s) exceeds acceptable 300s window. Possible replay attack detected.`,
      'TIMESTAMP_EXPIRED',
      403
    );
  }

  // 3. Read Raw Body & Verify HMAC Signature
  const rawBody = await req.text();
  const signaturePayload = `${timestampHeader}.${rawBody}`;
  const expectedSignature = await computeHmacSha256(webhookSecret, signaturePayload);
  const providedSignature = rawSignatureHeader.replace(/^sha256=/i, '').trim();

  if (!secureTimingSafeEqual(expectedSignature.toLowerCase(), providedSignature.toLowerCase())) {
    console.warn('[Security Warning] Telematics HMAC signature mismatch from remote IP');
    return errorResponse('Invalid cryptographic signature. Webhook payload rejected.', 'INVALID_SIGNATURE', 403);
  }

  try {
    const payload: TelematicsPing = JSON.parse(rawBody);

    // 4. Input Validation
    const deviceId = validateString(payload.device_id, 'device_id', 3, 64);
    const busNumber = validateString(payload.bus_number, 'bus_number', 2, 32);
    const lat = validateNumber(payload.latitude, 'latitude', -90, 90);
    const lng = validateNumber(payload.longitude, 'longitude', -180, 180);
    const speed = validateNumber(payload.speed, 'speed', 0, 250);
    const heading = validateNumber(payload.heading, 'heading', 0, 360);
    const batteryLevel = payload.battery_level !== undefined ? validateNumber(payload.battery_level, 'battery_level', 0, 100) : 95;
    const fuelLevel = payload.fuel_level !== undefined ? validateNumber(payload.fuel_level, 'fuel_level', 0, 100) : 80;

    // 5. Rate Limiting: Max 120 telematics pings per minute per device
    const rateLimit = checkRateLimit(`device:${deviceId}`, 120, 60000);
    if (!rateLimit.allowed) {
      return errorResponse(
        `Rate limit exceeded for telematics device ${deviceId}. Throttling applied.`,
        'RATE_LIMIT_EXCEEDED',
        429
      );
    }

    // 6. Trusted Execution using Service Role
    const serviceClient = getServiceRoleClient();

    // Verify Bus exists in fleet
    const { data: bus, error: busError } = await serviceClient
      .from('buses')
      .select('id, bus_number, organization_id, status')
      .eq('bus_number', busNumber)
      .maybeSingle();

    if (busError || !bus) {
      return errorResponse(`Bus '${busNumber}' is not registered in fleet database.`, 'BUS_NOT_FOUND', 404);
    }

    // Update GPS vehicle live tracking record
    const { error: gpsError } = await serviceClient
      .from('gps_vehicles')
      .upsert({
        bus_id: bus.id,
        bus_number: bus.bus_number,
        lat,
        lng,
        speed,
        heading,
        status: bus.status,
        battery_level: batteryLevel,
        fuel_level: fuelLevel,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'bus_id' });

    if (gpsError) {
      console.error('[Telematics Webhook] GPS upsert warning:', gpsError.message);
    }

    // Overspeeding alert detection (> 95 km/h)
    if (speed > 95) {
      await serviceClient.from('notifications').insert({
        organization_id: bus.organization_id,
        title: `Overspeeding Alert: ${bus.bus_number}`,
        message: `Vehicle ${bus.bus_number} clocked at ${speed} km/h (benchmark limit 80 km/h). Location: (${lat.toFixed(4)}, ${lng.toFixed(4)}).`,
        type: 'trip',
        severity: 'critical',
        read: false,
      });
    }

    // Fault code alert detection
    if (payload.fault_codes && payload.fault_codes.length > 0) {
      await serviceClient.from('notifications').insert({
        organization_id: bus.organization_id,
        title: `OBD-II Fault Detected: ${bus.bus_number}`,
        message: `Diagnostic trouble codes reported: ${payload.fault_codes.join(', ')}`,
        type: 'maintenance',
        severity: 'warning',
        read: false,
      });
    }

    return jsonResponse({
      success: true,
      acknowledged: true,
      data: {
        busNumber: bus.bus_number,
        deviceId,
        recordedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return errorResponse(err.message, err.code, err.status);
    }
    const errorMsg = err instanceof Error ? err.message : 'Telemetry Ingestion Error';
    console.error('[Telematics Webhook] Ingestion error:', sanitizeLogData({ message: errorMsg }));
    return errorResponse('Failed to ingest telemetry ping.', 'INGESTION_ERROR', 500);
  }
}

// Default export for Deno / Supabase runtime
if (typeof Deno !== 'undefined' && 'serve' in Deno) {
  // @ts-ignore: Deno runtime typing
  Deno.serve(handler);
}
