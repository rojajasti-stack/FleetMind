// supabase/functions/_shared/rateLimiter.ts

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * In-memory sliding window rate limiter for Edge Functions.
 *
 * @param key Unique identifier (e.g. User ID, IP address, Device ID)
 * @param maxRequests Maximum allowed requests in the time window
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs = 60000
): RateLimitResult {
  cleanupStaleEntries(windowMs);

  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldestTimestamp = record.timestamps[0];
    const resetSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
    };
  }

  record.timestamps.push(now);
  const remaining = maxRequests - record.timestamps.length;
  const resetSeconds = Math.ceil(windowMs / 1000);

  return {
    allowed: true,
    remaining,
    resetSeconds,
  };
}

export function getClientIdentifier(req: Request, fallbackId?: string): string {
  const forwardedFor = req.headers.get('x-forwarded-for') || '';
  const realIp = req.headers.get('x-real-ip') || '';
  const ip = forwardedFor.split(',')[0].trim() || realIp || '127.0.0.1';
  return fallbackId ? `user:${fallbackId}` : `ip:${ip}`;
}
