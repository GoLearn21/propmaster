/**
 * Owner Invite Service
 * Handles invite-based and self-registration for property owners
 */

import { supabase } from '../../lib/supabase';
import type { InviteErrorCode, ServiceResponse } from '../../types/tenant-onboarding';

// ============================================
// TYPES
// ============================================

export interface OwnerInvite {
  id: string;
  owner_id: string;
  email: string;
  invite_code: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  first_name?: string;
  last_name?: string;
  phone?: string;
  property_ids?: string[];
  created_by?: string;
  expires_at: string;
  accepted_at?: string;
  used_at?: string;
  reminder_sent_at?: string;
  reminder_count: number;
  revoked_at?: string;
  revoked_by?: string;
  revoke_reason?: string;
  created_at: string;
}

export interface OwnerInviteValidationResult {
  valid: boolean;
  error_code?: InviteErrorCode;
  owner_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  property_ids?: string[];
  expires_at?: string;
}

export interface CreateOwnerInviteParams {
  owner_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  property_ids?: string[];
  expiry_days?: number;
}

export interface OwnerRegistrationRequest {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company_name?: string;
  property_address?: string;
  additional_info?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

// ============================================
// CODE GENERATION & VALIDATION
// ============================================

/**
 * Generate a cryptographically secure 64-character hex invite code
 */
export function generateSecureInviteCode(): string {
  const randomBytes = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 32; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate invite code format (64 hex characters)
 */
function isValidCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim();
  if (trimmed.length !== 64) return false;
  return /^[a-f0-9]+$/i.test(trimmed);
}

// ============================================
// VALIDATE INVITE CODE
// ============================================

/**
 * Validate an owner invite code and return owner data if valid
 */
export async function validateInviteCode(
  inviteCode: string
): Promise<OwnerInviteValidationResult> {
  if (!isValidCodeFormat(inviteCode)) {
    return { valid: false, error_code: 'INVALID_CODE' };
  }

  try {
    const { data, error } = await supabase.rpc('validate_owner_invite_code', {
      p_invite_code: inviteCode.trim(),
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      return { valid: false, error_code: 'INVALID_CODE' };
    }

    const result = data[0];

    if (!result.valid) {
      return { valid: false, error_code: result.error_code as InviteErrorCode };
    }

    return {
      valid: true,
      owner_id: result.owner_id,
      email: result.email,
      first_name: result.first_name,
      last_name: result.last_name,
      phone: result.phone,
      property_ids: result.property_ids,
      expires_at: result.expires_at,
    };
  } catch (err) {
    console.error('Error validating owner invite code:', err);
    return { valid: false, error_code: 'INVALID_CODE' };
  }
}

// ============================================
// ACCEPT INVITE
// ============================================

/**
 * Accept (use) an owner invite code
 */
export async function acceptInvite(
  inviteCode: string
): Promise<{ success: boolean; owner_id?: string; error?: string }> {
  if (!isValidCodeFormat(inviteCode)) {
    return { success: false, error: 'Invalid invite code format' };
  }

  try {
    const invite = await getInviteByCode(inviteCode);

    const { data, error } = await supabase.rpc('accept_owner_invite', {
      p_invite_code: inviteCode.trim(),
    });

    if (error) {
      console.error('Error accepting owner invite:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Invite is no longer valid' };
    }

    return { success: true, owner_id: invite?.owner_id };
  } catch (err) {
    console.error('Error accepting owner invite:', err);
    return { success: false, error: 'Failed to accept invite' };
  }
}

// ============================================
// GET INVITE BY CODE
// ============================================

/**
 * Get invite details by code
 */
export async function getInviteByCode(
  inviteCode: string
): Promise<OwnerInvite | null> {
  if (!isValidCodeFormat(inviteCode)) return null;

  try {
    const { data, error } = await supabase
      .from('owner_invites')
      .select('*')
      .eq('invite_code', inviteCode.trim())
      .single();

    if (error || !data) return null;
    return data as OwnerInvite;
  } catch (err) {
    console.error('Error getting owner invite:', err);
    return null;
  }
}

// ============================================
// SELF-REGISTRATION
// ============================================

/**
 * Submit a self-registration request for owner portal access
 */
export async function submitRegistrationRequest(params: {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company_name?: string;
  property_address?: string;
  additional_info?: string;
}): Promise<ServiceResponse<OwnerRegistrationRequest>> {
  try {
    // Check if email already has a pending request
    const { data: existing } = await supabase
      .from('owner_registration_requests')
      .select('id, status')
      .eq('email', params.email.toLowerCase())
      .eq('status', 'pending')
      .single();

    if (existing) {
      return {
        success: false,
        error: 'A registration request is already pending for this email',
      };
    }

    // Create new request
    const { data, error } = await supabase
      .from('owner_registration_requests')
      .insert({
        email: params.email.toLowerCase(),
        first_name: params.first_name,
        last_name: params.last_name,
        phone: params.phone,
        company_name: params.company_name,
        property_address: params.property_address,
        additional_info: params.additional_info,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting registration request:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as OwnerRegistrationRequest };
  } catch (err) {
    console.error('Error submitting registration request:', err);
    return { success: false, error: 'Failed to submit registration request' };
  }
}

// ============================================
// INVITE URL GENERATION
// ============================================

/**
 * Generate the full invite URL for an owner
 */
export function generateInviteUrl(inviteCode: string): string {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.VITE_APP_URL || 'http://localhost:5173';
  return `${baseUrl}/owner/signup/${inviteCode}`;
}
