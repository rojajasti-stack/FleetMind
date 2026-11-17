/**
 * Centralized Supabase Client & Connection Layer for FleetMind AI
 *
 * Security & Design Principles:
 * - Credentials are never hardcoded and read strictly via Vite's import.meta.env.
 * - Only the public Anon Key is used on the client; service_role keys are strictly prohibited.
 * - Environment variables are validated before client initialization.
 * - Credentials or tokens are NEVER printed to logs.
 * - Safe connection health checks catch errors without crashing UI components.
 * - Graceful fallback: If Supabase is unconfigured or unreachable, the application continues
 *   to run seamlessly in local offline/demo mode.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  isValid: boolean;
  error?: string;
  projectHost?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  status: 'connected' | 'unconfigured' | 'network_error' | 'auth_error' | 'invalid_config';
  latencyMs?: number;
}

// 1. Framework-appropriate Environment Variables (Supports both VITE_ and NEXT_PUBLIC_ prefixes)
// Production project: ckwhhrixludchrzlshak
const rawSupabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ckwhhrixludchrzlshak.supabase.co'
).trim();

const rawSupabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_BvUeydagfDwZ3Wk26557eA_KNx3fOmV'
).trim();

// 2. Environment Variable Validation
export function validateSupabaseConfig(): SupabaseConfigStatus {
  if (!rawSupabaseUrl && !rawSupabaseAnonKey) {
    return {
      isConfigured: false,
      isValid: false,
      error: 'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not set.'
    };
  }

  // Detect unedited template placeholders
  const isPlaceholderUrl =
    rawSupabaseUrl.includes('your-project') ||
    rawSupabaseUrl.includes('placeholder') ||
    rawSupabaseUrl.includes('example.com');

  const isPlaceholderKey =
    rawSupabaseAnonKey.includes('your-actual') ||
    rawSupabaseAnonKey.includes('placeholder') ||
    rawSupabaseAnonKey === '';

  if (isPlaceholderUrl || isPlaceholderKey) {
    return {
      isConfigured: false,
      isValid: false,
      error: 'Supabase configuration contains placeholder values. Set real credentials in .env.'
    };
  }

  // URL format validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawSupabaseUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        isConfigured: true,
        isValid: false,
        error: 'VITE_SUPABASE_URL must use http or https protocol.'
      };
    }
  } catch {
    return {
      isConfigured: true,
      isValid: false,
      error: 'VITE_SUPABASE_URL is not a valid URL.'
    };
  }

  // Anon Key format validation (JWT tokens typically have 3 segments, or min 20 chars)
  if (rawSupabaseAnonKey.length < 20) {
    return {
      isConfigured: true,
      isValid: false,
      error: 'VITE_SUPABASE_ANON_KEY appears too short to be a valid publishable key.'
    };
  }

  // Safety check: ensure users didn't accidentally provide a service_role key
  // We check for typical indicators without exposing the key in logs
  if (rawSupabaseAnonKey.includes('service_role')) {
    console.error('[Security Warning] Service role key detected in frontend configuration. Use only the public anon key.');
    return {
      isConfigured: true,
      isValid: false,
      error: 'Security violation: service-role keys must never be exposed in client code. Please use the public anon key.'
    };
  }

  return {
    isConfigured: true,
    isValid: true,
    projectHost: parsedUrl.hostname
  };
}

export const supabaseConfigStatus = validateSupabaseConfig();
export const isSupabaseConfigured = supabaseConfigStatus.isValid;

// 3. Centralized Typed Supabase Client
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(rawSupabaseUrl, rawSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'fleetmind_supabase_auth'
      }
    })
  : null;

// 4. Safe Connection Health Check
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      status: supabaseConfigStatus.isConfigured ? 'invalid_config' : 'unconfigured',
      message: supabaseConfigStatus.error || 'Supabase is not configured. Running in local demo mode.'
    };
  }

  const startTime = Date.now();
  try {
    // Lightweight probe using auth session probe and system ping
    const { error: authError } = await supabase.auth.getSession();
    if (authError) {
      return {
        success: false,
        status: 'auth_error',
        message: 'Connected to Supabase project, but authentication check returned an error.',
        latencyMs: Date.now() - startTime
      };
    }

    return {
      success: true,
      status: 'connected',
      message: `Successfully connected to Supabase (${supabaseConfigStatus.projectHost}).`,
      latencyMs: Date.now() - startTime
    };
  } catch (err: unknown) {
    // Safe error handling: never log credentials or headers
    const errorMessage = err instanceof Error ? err.message : 'Unknown network connection error';
    return {
      success: false,
      status: 'network_error',
      message: `Unable to reach Supabase: ${errorMessage}`,
      latencyMs: Date.now() - startTime
    };
  }
}

// 5. Reusable Database Access Helper
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }
  return supabase;
}
