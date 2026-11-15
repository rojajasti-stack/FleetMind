// supabase/functions/_shared/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getEnv(name: string): string {
  if (typeof Deno !== 'undefined' && Deno.env) {
    return Deno.env.get(name) || '';
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name] || '';
  }
  return '';
}

/**
 * Returns an authenticated Supabase client scoped to the calling user's JWT.
 * Enforces Row Level Security (RLS) automatically based on auth.uid().
 */
export function getAuthenticatedClient(req: Request): SupabaseClient {
  const supabaseUrl = getEnv('SUPABASE_URL');
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in server environment.');
  }

  const authHeader = req.headers.get('Authorization') || '';

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Returns a privileged Supabase client using the Service Role Key.
 * MUST only be invoked after rigorous identity and authorization verification.
 */
export function getServiceRoleClient(): SupabaseClient {
  const supabaseUrl = getEnv('SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
