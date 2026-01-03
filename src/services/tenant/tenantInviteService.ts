/**
 * Tenant Invite Service
 * Handles invite-only tenant registration flow
 * Based on market research: Rentvine, DoorLoop, COHO
 */

import { supabase } from '../../lib/supabase';
import type {
  TenantInvite,
  InviteValidationResult,
  InviteErrorCode,
  ServiceResponse,
  INVITE_EXPIRY_DAYS,
} from '../../types/tenant-onboarding';
import { emailSchema } from '../../schemas/tenant-onboarding.schema';

// ============================================
// TYPES
// ============================================

export interface CreateInviteParams {
  tenant_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  property_id?: string;
  unit_id?: string;
  lease_id?: string;
  expiry_days?: number;
}

export interface CreateInviteResult {
  success: boolean;
  invite?: TenantInvite;
  error?: string;
}

export interface AcceptInviteResult {
  success: boolean;
  tenant_id?: string;
  error?: string;
}

export interface RevokeInviteResult {
  success: boolean;
  error?: string;
}

// ============================================
// CODE GENERATION & VALIDATION
// ============================================

/**
 * Generate a cryptographically secure 64-character hex invite code
 * Uses Web Crypto API for browser compatibility
 */
export function generateSecureInviteCode(): string {
  // Generate 32 random bytes (256 bits)
  const randomBytes = new Uint8Array(32);

  // Use crypto.getRandomValues for cryptographic randomness
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for test environments
    for (let i = 0; i < 32; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Convert to hex string (64 characters)
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate invite code format (64 hex characters)
 */
function isValidCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }

  const trimmed = code.trim();

  // Must be exactly 64 characters
  if (trimmed.length !== 64) {
    return false;
  }

  // Must be valid hex (only 0-9, a-f, A-F)
  return /^[a-f0-9]+$/i.test(trimmed);
}

// ============================================
// VALIDATE INVITE CODE
// ============================================

/**
 * Validate an invite code and return tenant data if valid
 * Uses database function for secure validation
 */
export async function validateInviteCode(
  inviteCode: string
): Promise<InviteValidationResult> {
  // First validate format locally to avoid unnecessary DB calls
  if (!isValidCodeFormat(inviteCode)) {
    return {
      valid: false,
      error_code: 'INVALID_CODE',
    };
  }

  try {
    const { data, error } = await supabase.rpc('validate_invite_code', {
      p_invite_code: inviteCode.trim(),
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return {
        valid: false,
        error_code: 'INVALID_CODE',
      };
    }

    const result = data[0];

    if (!result.valid) {
      return {
        valid: false,
        error_code: result.error_code as InviteErrorCode,
      };
    }

    return {
      valid: true,
      tenant_id: result.tenant_id,
      email: result.email,
      first_name: result.first_name,
      last_name: result.last_name,
      phone: result.phone,
      property_id: result.property_id,
      unit_id: result.unit_id,
      lease_id: result.lease_id,
      expires_at: result.expires_at,
    };
  } catch (err) {
    console.error('Error validating invite code:', err);
    return {
      valid: false,
      error_code: 'INVALID_CODE',
    };
  }
}

// ============================================
// CREATE INVITE
// ============================================

/**
 * Create a new tenant invite
 * PM-facing function to generate invite for tenant
 */
export async function createTenantInvite(
  params: CreateInviteParams
): Promise<CreateInviteResult> {
  // Validate required fields
  if (!params.tenant_id || params.tenant_id.trim() === '') {
    return {
      success: false,
      error: 'tenant_id is required',
    };
  }

  // Validate email format
  const emailResult = emailSchema.safeParse(params.email);
  if (!emailResult.success) {
    return {
      success: false,
      error: 'Valid email is required',
    };
  }

  const normalizedEmail = emailResult.data;
  const expiryDays = params.expiry_days ?? 7; // Default 7 days

  try {
    const { data, error } = await supabase.rpc('create_tenant_invite', {
      p_tenant_id: params.tenant_id,
      p_email: normalizedEmail,
      p_first_name: params.first_name || null,
      p_last_name: params.last_name || null,
      p_phone: params.phone || null,
      p_property_id: params.property_id || null,
      p_unit_id: params.unit_id || null,
      p_lease_id: params.lease_id || null,
      p_expiry_days: expiryDays,
    });

    if (error) {
      console.error('Error creating invite:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      invite: data as TenantInvite,
    };
  } catch (err) {
    console.error('Error creating invite:', err);
    return {
      success: false,
      error: 'Failed to create invite',
    };
  }
}

// ============================================
// ACCEPT INVITE
// ============================================

/**
 * Accept (use) an invite code
 * Called during tenant signup after creating auth user
 */
export async function acceptInvite(
  inviteCode: string
): Promise<AcceptInviteResult> {
  if (!isValidCodeFormat(inviteCode)) {
    return {
      success: false,
      error: 'Invalid invite code format',
    };
  }

  try {
    // First get the invite to get tenant_id
    const invite = await getInviteByCode(inviteCode);

    const { data, error } = await supabase.rpc('accept_tenant_invite', {
      p_invite_code: inviteCode.trim(),
    });

    if (error) {
      console.error('Error accepting invite:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Invite is no longer valid (expired or already used)',
      };
    }

    return {
      success: true,
      tenant_id: invite?.tenant_id,
    };
  } catch (err) {
    console.error('Error accepting invite:', err);
    return {
      success: false,
      error: 'Failed to accept invite',
    };
  }
}

// ============================================
// REVOKE INVITE
// ============================================

/**
 * Revoke a pending invite
 * PM-facing function to cancel an invite
 */
export async function revokeInvite(
  inviteCode: string,
  reason?: string
): Promise<RevokeInviteResult> {
  if (!isValidCodeFormat(inviteCode)) {
    return {
      success: false,
      error: 'Invalid invite code format',
    };
  }

  try {
    const { data, error } = await supabase.rpc('revoke_tenant_invite', {
      p_invite_code: inviteCode.trim(),
      p_reason: reason || null,
    });

    if (error) {
      console.error('Error revoking invite:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Invite could not be revoked (may already be accepted or expired)',
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error('Error revoking invite:', err);
    return {
      success: false,
      error: 'Failed to revoke invite',
    };
  }
}

// ============================================
// GET INVITE BY CODE
// ============================================

/**
 * Get invite details by code
 * Does not validate status - just retrieves the record
 */
export async function getInviteByCode(
  inviteCode: string
): Promise<TenantInvite | null> {
  if (!isValidCodeFormat(inviteCode)) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('tenant_invites')
      .select('*')
      .eq('invite_code', inviteCode.trim())
      .single();

    if (error || !data) {
      return null;
    }

    return data as TenantInvite;
  } catch (err) {
    console.error('Error getting invite:', err);
    return null;
  }
}

// ============================================
// REMINDER FUNCTIONS
// ============================================

/**
 * Get pending invites that need reminder emails
 * Used by cron job for auto-reminders (Rentvine pattern)
 */
export async function getPendingInvitesForReminder(): Promise<TenantInvite[]> {
  try {
    const { data, error } = await supabase.rpc('get_invites_for_reminder');

    if (error) {
      console.error('Error getting invites for reminder:', error);
      return [];
    }

    return (data as TenantInvite[]) || [];
  } catch (err) {
    console.error('Error getting invites for reminder:', err);
    return [];
  }
}

/**
 * Mark reminder as sent for an invite
 * Increments reminder_count and updates reminder_sent_at
 */
export async function markReminderSent(inviteId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('mark_invite_reminder_sent', {
      p_invite_id: inviteId,
    });

    if (error) {
      console.error('Error marking reminder sent:', error);
    }
  } catch (err) {
    console.error('Error marking reminder sent:', err);
  }
}

// ============================================
// INVITE LISTING (PM-facing)
// ============================================

/**
 * Get all invites for a property (for property managers)
 */
export async function getInvitesByProperty(
  propertyId: string
): Promise<TenantInvite[]> {
  try {
    const { data, error } = await supabase
      .from('tenant_invites')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting invites by property:', error);
      return [];
    }

    return (data as TenantInvite[]) || [];
  } catch (err) {
    console.error('Error getting invites by property:', err);
    return [];
  }
}

/**
 * Get invite by tenant ID
 */
export async function getInviteByTenantId(
  tenantId: string
): Promise<TenantInvite | null> {
  try {
    const { data, error } = await supabase
      .from('tenant_invites')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data as TenantInvite;
  } catch (err) {
    console.error('Error getting invite by tenant ID:', err);
    return null;
  }
}

// ============================================
// INVITE URL GENERATION
// ============================================

/**
 * Generate the full invite URL for a tenant
 */
export function generateInviteUrl(inviteCode: string): string {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.VITE_APP_URL || 'http://localhost:5173';

  return `${baseUrl}/tenant/signup/${inviteCode}`;
}

/**
 * Send invite email to tenant
 * This would typically trigger an edge function or email service
 */
export async function sendInviteEmail(
  inviteId: string
): Promise<ServiceResponse> {
  try {
    // Get invite details
    const { data: invite, error: inviteError } = await supabase
      .from('tenant_invites')
      .select(`
        *,
        properties:property_id (name, address),
        units:unit_id (name, unit_number)
      `)
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      return {
        success: false,
        error: 'Invite not found',
      };
    }

    // Generate invite URL
    const inviteUrl = generateInviteUrl(invite.invite_code);

    // Trigger email via edge function (to be implemented)
    const { error: emailError } = await supabase.functions.invoke('send-tenant-invite-email', {
      body: {
        to: invite.email,
        firstName: invite.first_name,
        lastName: invite.last_name,
        inviteUrl,
        propertyName: invite.properties?.name,
        propertyAddress: invite.properties?.address,
        unitName: invite.units?.name || invite.units?.unit_number,
        expiresAt: invite.expires_at,
      },
    });

    if (emailError) {
      console.error('Error sending invite email:', emailError);
      return {
        success: false,
        error: 'Failed to send invite email',
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error('Error sending invite email:', err);
    return {
      success: false,
      error: 'Failed to send invite email',
    };
  }
}

// ============================================
// RESEND INVITE
// ============================================

/**
 * Resend an invite (creates new code, extends expiry)
 */
export async function resendInvite(inviteId: string): Promise<CreateInviteResult> {
  try {
    // Get existing invite
    const { data: existingInvite, error: fetchError } = await supabase
      .from('tenant_invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (fetchError || !existingInvite) {
      return {
        success: false,
        error: 'Invite not found',
      };
    }

    // Revoke old invite
    await revokeInvite(existingInvite.invite_code, 'Resent with new code');

    // Create new invite with same details
    return createTenantInvite({
      tenant_id: existingInvite.tenant_id,
      email: existingInvite.email,
      first_name: existingInvite.first_name,
      last_name: existingInvite.last_name,
      phone: existingInvite.phone,
      property_id: existingInvite.property_id,
      unit_id: existingInvite.unit_id,
      lease_id: existingInvite.lease_id,
    });
  } catch (err) {
    console.error('Error resending invite:', err);
    return {
      success: false,
      error: 'Failed to resend invite',
    };
  }
}
