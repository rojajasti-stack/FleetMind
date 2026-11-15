// supabase/functions/_shared/auth.ts
import { SupabaseClient, User } from '@supabase/supabase-js';
import { getServiceRoleClient } from './supabaseClient.ts';

export interface VerifiedUserProfile {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  full_name: string;
}

export class AuthError extends Error {
  public status: number;
  public code: string;

  constructor(message: string, status = 401, code = 'UNAUTHORIZED') {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Extracts Bearer token, verifies identity against Supabase Auth,
 * and loads the authoritative profile and role from the database.
 */
export async function verifyUserIdentity(
  client: SupabaseClient,
  req: Request
): Promise<{ user: User; profile: VerifiedUserProfile }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or malformed Authorization header with Bearer token.', 401, 'MISSING_AUTH_HEADER');
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    throw new AuthError('Empty Bearer authentication token provided.', 401, 'INVALID_TOKEN');
  }

  // 1. Verify JWT via Supabase Auth
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) {
    throw new AuthError('Invalid or expired authentication session. Please re-authenticate.', 401, 'EXPIRED_SESSION');
  }

  const user = authData.user;

  // 2. Load authoritative profile from database using service role to prevent spoofing
  const serviceClient = getServiceRoleClient();
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('id, email, role, organization_id, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new AuthError('User profile not found in organizational directory.', 403, 'PROFILE_NOT_FOUND');
  }

  return {
    user,
    profile: {
      id: profile.id,
      email: profile.email || user.email || '',
      role: profile.role || 'Guest',
      organization_id: profile.organization_id || '00000000-0000-0000-0000-000000000001',
      full_name: profile.full_name || 'Fleet Operator',
    },
  };
}

/**
 * Enforces role-based authorization check against verified database profile.
 */
export function requireRole(profile: VerifiedUserProfile, allowedRoles: string[]): void {
  // Super Admin always has full bypass
  if (profile.role === 'Super Admin') return;

  if (!allowedRoles.includes(profile.role)) {
    throw new AuthError(
      `Access denied: Operation requires one of [${allowedRoles.join(', ')}]. Current role: '${profile.role}'.`,
      403,
      'INSUFFICIENT_PRIVILEGES'
    );
  }
}
