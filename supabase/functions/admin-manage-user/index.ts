// supabase/functions/admin-manage-user/index.ts
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getAuthenticatedClient, getServiceRoleClient } from '../_shared/supabaseClient.ts';
import { verifyUserIdentity, requireRole, AuthError } from '../_shared/auth.ts';
import { checkRateLimit, getClientIdentifier } from '../_shared/rateLimiter.ts';
import {
  parseJsonBody,
  validateUuid,
  validateEnum,
  validateString,
  ValidationError,
  sanitizeLogData,
} from '../_shared/validator.ts';

const ALLOWED_ROLES = [
  'Super Admin',
  'Admin',
  'Normal User',
  'Guest',
  'Fleet Manager',
  'Dispatcher',
  'Accountant',
] as const;

type UserRole = typeof ALLOWED_ROLES[number];

interface AdminManageUserRequest {
  action: 'change_role' | 'suspend' | 'activate';
  targetUserId: string;
  newRole?: UserRole;
  reason?: string;
}

export async function handler(req: Request): Promise<Response> {
  // 1. CORS Preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method Not Allowed. Use POST.', 'METHOD_NOT_ALLOWED', 405);
  }

  try {
    // 2. Client Authentication & Identity Verification
    const authClient = getAuthenticatedClient(req);
    const { user: callerUser, profile: callerProfile } = await verifyUserIdentity(authClient, req);

    // 3. Authorization Check: Must be Admin or Super Admin
    requireRole(callerProfile, ['Admin', 'Super Admin']);

    // 4. Rate Limiting: Max 30 user management actions per minute per admin
    const rateLimitKey = getClientIdentifier(req, callerProfile.id);
    const rateLimit = checkRateLimit(rateLimitKey, 30, 60000);
    if (!rateLimit.allowed) {
      return errorResponse(
        `Rate limit exceeded for administrative operations. Retry in ${rateLimit.resetSeconds}s.`,
        'RATE_LIMIT_EXCEEDED',
        429
      );
    }

    // 5. Request Payload Validation
    const body = await parseJsonBody<AdminManageUserRequest>(req);
    const action = validateEnum(body.action, ['change_role', 'suspend', 'activate'] as const, 'action');
    const targetUserId = validateUuid(body.targetUserId, 'targetUserId');
    const reason = body.reason ? validateString(body.reason, 'reason', 1, 200) : 'Administrative role update';

    // 6. Privileged Execution using Service Role Client
    const serviceClient = getServiceRoleClient();

    // Fetch Target User Profile
    const { data: targetProfile, error: targetError } = await serviceClient
      .from('profiles')
      .select('id, email, role, organization_id, full_name')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return errorResponse('Target user does not exist in directory.', 'USER_NOT_FOUND', 404);
    }

    // 7. Security Policy Rules Enforcement:
    // a. Tenant isolation: Admin can only manage users in their own organization (Super Admin can manage any)
    if (callerProfile.role !== 'Super Admin' && callerProfile.organization_id !== targetProfile.organization_id) {
      return errorResponse(
        'Access denied: Cross-organizational operator management is prohibited.',
        'TENANT_VIOLATION',
        403
      );
    }

    // b. Prevent Self-Escalation or modifying self role
    if (callerUser.id === targetUserId && action === 'change_role') {
      return errorResponse(
        'Security violation: Operators are prohibited from modifying their own privilege level.',
        'SELF_ESCALATION_BLOCKED',
        403
      );
    }

    // c. Prevent elevating anyone to Super Admin unless caller is already Super Admin
    if (action === 'change_role') {
      const newRole = validateEnum(body.newRole, ALLOWED_ROLES, 'newRole');

      if (newRole === 'Super Admin' && callerProfile.role !== 'Super Admin') {
        return errorResponse(
          'Security violation: Only verified Super Administrators can grant the Super Admin role.',
          'SUPER_ADMIN_ELEVATION_BLOCKED',
          403
        );
      }

      // d. Prevent demoting a Super Admin unless caller is Super Admin
      if (targetProfile.role === 'Super Admin' && callerProfile.role !== 'Super Admin') {
        return errorResponse(
          'Security violation: Regular Administrators cannot alter the role of a Super Administrator.',
          'SUPER_ADMIN_PROTECTED',
          403
        );
      }

      // Update Supabase Auth app_metadata (Trusted Server Side)
      const { error: authAdminError } = await serviceClient.auth.admin.updateUserById(targetUserId, {
        app_metadata: { role: newRole },
      });
      if (authAdminError) {
        console.error('[Admin Edge Function] Auth metadata update notice:', authAdminError.message);
      }

      // Update database profile
      const { error: updateProfileError } = await serviceClient
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', targetUserId);

      if (updateProfileError) {
        throw new Error(`Failed to update user profile role: ${updateProfileError.message}`);
      }

      // Record immutable audit log
      await serviceClient.from('audit_logs').insert({
        organization_id: callerProfile.organization_id,
        user_id: callerUser.id,
        user_email: callerProfile.email,
        action: 'CHANGE_USER_ROLE',
        entity_type: 'USER_PROFILE',
        entity_id: targetUserId,
        details: {
          previous_role: targetProfile.role,
          new_role: newRole,
          reason,
          modified_by: callerProfile.email,
        },
      });

      console.info(
        `[AUDIT] Role changed for ${targetProfile.email}: ${targetProfile.role} -> ${newRole} by ${callerProfile.email}`
      );

      return jsonResponse({
        success: true,
        message: `Successfully updated user role to '${newRole}'.`,
        data: {
          userId: targetUserId,
          previousRole: targetProfile.role,
          newRole,
          organizationId: targetProfile.organization_id,
        },
      });
    }

    if (action === 'suspend' || action === 'activate') {
      const isSuspended = action === 'suspend';

      // Ban/unban in Supabase Auth
      const { error: banError } = await serviceClient.auth.admin.updateUserById(targetUserId, {
        ban_duration: isSuspended ? '876000h' : 'none', // 100 years or none
      });

      if (banError) {
        console.error('[Admin Edge Function] Ban update notice:', banError.message);
      }

      // Audit log
      await serviceClient.from('audit_logs').insert({
        organization_id: callerProfile.organization_id,
        user_id: callerUser.id,
        user_email: callerProfile.email,
        action: isSuspended ? 'SUSPEND_USER' : 'ACTIVATE_USER',
        entity_type: 'USER_PROFILE',
        entity_id: targetUserId,
        details: { reason, modified_by: callerProfile.email },
      });

      return jsonResponse({
        success: true,
        message: `User account successfully ${isSuspended ? 'suspended' : 'activated'}.`,
        data: { userId: targetUserId, status: isSuspended ? 'suspended' : 'active' },
      });
    }

    return errorResponse('Invalid action specified.', 'INVALID_ACTION', 400);
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.code, err.status);
    }
    if (err instanceof ValidationError) {
      return errorResponse(err.message, err.code, err.status);
    }

    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Admin Edge Function] Unhandled Exception:', sanitizeLogData({ message: errorMsg }));
    return errorResponse('Internal server error during administrative execution.', 'INTERNAL_ERROR', 500);
  }
}

// Default export for Deno / Supabase runtime
if (typeof Deno !== 'undefined' && 'serve' in Deno) {
  // @ts-ignore: Deno runtime typing
  Deno.serve(handler);
}
