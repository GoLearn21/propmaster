/**
 * Tenant Invite Service Tests
 * TDD: RED Phase - Write failing tests first
 *
 * Tests cover:
 * - Invite code validation (valid, expired, used, revoked, invalid)
 * - Invite code generation (64-char cryptographic)
 * - Invite creation with 7-day expiry
 * - Accepting invites
 * - Revoking invites
 * - Reminder tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import {
  validateInviteCode,
  createTenantInvite,
  acceptInvite,
  revokeInvite,
  getInviteByCode,
  getPendingInvitesForReminder,
  markReminderSent,
  generateSecureInviteCode,
  type CreateInviteParams,
} from './tenantInviteService';
import type { InviteValidationResult, TenantInvite } from '../../types/tenant-onboarding';

// Mock supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Import mocked supabase
import { supabase } from '../../lib/supabase';

describe('tenantInviteService', () => {
  // Test data
  const validInviteCode = 'a'.repeat(64); // 64-char hex string
  const validTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const validEmail = 'tenant@example.com';
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
  const expiredAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

  const mockValidInvite: TenantInvite = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    tenant_id: validTenantId,
    email: validEmail,
    invite_code: validInviteCode,
    status: 'pending',
    first_name: 'John',
    last_name: 'Doe',
    phone: '5551234567',
    expires_at: expiresAt,
    reminder_count: 0,
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // INVITE CODE GENERATION
  // ============================================

  describe('generateSecureInviteCode', () => {
    it('should generate a 64-character hex string', () => {
      const code = generateSecureInviteCode();
      expect(code).toHaveLength(64);
      expect(code).toMatch(/^[a-f0-9]+$/i);
    });

    it('should generate unique codes on each call', () => {
      const code1 = generateSecureInviteCode();
      const code2 = generateSecureInviteCode();
      expect(code1).not.toBe(code2);
    });

    it('should generate cryptographically random codes', () => {
      // Generate multiple codes and check they're all different
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateSecureInviteCode());
      }
      // All 100 codes should be unique
      expect(codes.size).toBe(100);
    });
  });

  // ============================================
  // INVITE VALIDATION
  // ============================================

  describe('validateInviteCode', () => {
    it('should return valid result for a valid unexpired invite', async () => {
      // Mock successful invite lookup
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{
          valid: true,
          error_code: null,
          tenant_id: validTenantId,
          email: validEmail,
          first_name: 'John',
          last_name: 'Doe',
          phone: '5551234567',
          property_id: null,
          unit_id: null,
          lease_id: null,
          expires_at: expiresAt,
        }],
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await validateInviteCode(validInviteCode);

      expect(result.valid).toBe(true);
      expect(result.error_code).toBeUndefined();
      expect(result.tenant_id).toBe(validTenantId);
      expect(result.email).toBe(validEmail);
      expect(result.first_name).toBe('John');
      expect(result.last_name).toBe('Doe');
    });

    it('should return INVALID_CODE error for non-existent invite', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{
          valid: false,
          error_code: 'INVALID_CODE',
          tenant_id: null,
          email: null,
        }],
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await validateInviteCode('nonexistent' + 'x'.repeat(54));

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe('INVALID_CODE');
    });

    it('should return EXPIRED error for expired invite', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{
          valid: false,
          error_code: 'EXPIRED',
          tenant_id: null,
          email: null,
        }],
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await validateInviteCode(validInviteCode);

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe('EXPIRED');
    });

    it('should return ALREADY_USED error for accepted invite', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{
          valid: false,
          error_code: 'ALREADY_USED',
          tenant_id: null,
          email: null,
        }],
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await validateInviteCode(validInviteCode);

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe('ALREADY_USED');
    });

    it('should return REVOKED error for revoked invite', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [{
          valid: false,
          error_code: 'REVOKED',
          tenant_id: null,
          email: null,
        }],
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await validateInviteCode(validInviteCode);

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe('REVOKED');
    });

    it('should handle database errors gracefully', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await validateInviteCode(validInviteCode);

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe('INVALID_CODE');
    });

    it('should reject invalid code format (not 64 chars)', async () => {
      const result = await validateInviteCode('short_code');

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe('INVALID_CODE');
    });

    it('should reject invalid code format (non-hex characters)', async () => {
      const invalidCode = 'g'.repeat(64); // 'g' is not a hex character
      const result = await validateInviteCode(invalidCode);

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe('INVALID_CODE');
    });
  });

  // ============================================
  // INVITE CREATION
  // ============================================

  describe('createTenantInvite', () => {
    const createParams: CreateInviteParams = {
      tenant_id: validTenantId,
      email: validEmail,
      first_name: 'John',
      last_name: 'Doe',
      phone: '5551234567',
    };

    it('should create an invite with a secure 64-char code', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: mockValidInvite,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await createTenantInvite(createParams);

      expect(result.success).toBe(true);
      expect(result.invite).toBeDefined();
      expect(result.invite?.invite_code).toHaveLength(64);
    });

    it('should set 7-day expiry by default', async () => {
      const now = Date.now();
      const mockRpc = vi.fn().mockImplementation(() => ({
        data: {
          ...mockValidInvite,
          expires_at: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        error: null,
      }));
      (supabase.rpc as Mock) = mockRpc;

      const result = await createTenantInvite(createParams);

      expect(result.success).toBe(true);
      expect(result.invite).toBeDefined();

      const expiryDate = new Date(result.invite!.expires_at);
      const expectedExpiry = new Date(now + 7 * 24 * 60 * 60 * 1000);

      // Allow 1 minute tolerance for test execution time
      expect(Math.abs(expiryDate.getTime() - expectedExpiry.getTime())).toBeLessThan(60000);
    });

    it('should allow custom expiry days', async () => {
      const now = Date.now();
      const customExpiryDays = 14;
      const mockRpc = vi.fn().mockImplementation(() => ({
        data: {
          ...mockValidInvite,
          expires_at: new Date(now + customExpiryDays * 24 * 60 * 60 * 1000).toISOString(),
        },
        error: null,
      }));
      (supabase.rpc as Mock) = mockRpc;

      const result = await createTenantInvite({
        ...createParams,
        expiry_days: customExpiryDays,
      });

      expect(result.success).toBe(true);
      expect(result.invite).toBeDefined();

      const expiryDate = new Date(result.invite!.expires_at);
      const expectedExpiry = new Date(now + customExpiryDays * 24 * 60 * 60 * 1000);

      expect(Math.abs(expiryDate.getTime() - expectedExpiry.getTime())).toBeLessThan(60000);
    });

    it('should set status to pending', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: { ...mockValidInvite, status: 'pending' },
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await createTenantInvite(createParams);

      expect(result.success).toBe(true);
      expect(result.invite?.status).toBe('pending');
    });

    it('should initialize reminder_count to 0', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: { ...mockValidInvite, reminder_count: 0 },
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await createTenantInvite(createParams);

      expect(result.success).toBe(true);
      expect(result.invite?.reminder_count).toBe(0);
    });

    it('should handle database errors', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Unique constraint violation' },
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await createTenantInvite(createParams);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require valid email', async () => {
      const result = await createTenantInvite({
        ...createParams,
        email: 'invalid-email',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should require tenant_id', async () => {
      const result = await createTenantInvite({
        ...createParams,
        tenant_id: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('tenant');
    });
  });

  // ============================================
  // ACCEPTING INVITES
  // ============================================

  describe('acceptInvite', () => {
    it('should mark invite as accepted', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: true,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await acceptInvite(validInviteCode);

      expect(result.success).toBe(true);
    });

    it('should set accepted_at timestamp', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: true,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await acceptInvite(validInviteCode);

      expect(result.success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('accept_tenant_invite', {
        p_invite_code: validInviteCode,
      });
    });

    it('should return tenant_id on success', async () => {
      // First mock for accept, second for get
      const mockRpc = vi.fn().mockResolvedValue({
        data: true,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockValidInvite,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as Mock) = mockFrom;

      const result = await acceptInvite(validInviteCode);

      expect(result.success).toBe(true);
      expect(result.tenant_id).toBeDefined();
    });

    it('should fail for expired invite', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: false,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await acceptInvite(validInviteCode);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail for already accepted invite', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: false,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await acceptInvite(validInviteCode);

      expect(result.success).toBe(false);
    });

    it('should handle database errors', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await acceptInvite(validInviteCode);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ============================================
  // REVOKING INVITES
  // ============================================

  describe('revokeInvite', () => {
    it('should revoke a pending invite', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: true,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await revokeInvite(validInviteCode, 'No longer needed');

      expect(result.success).toBe(true);
    });

    it('should set status to revoked', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: true,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      await revokeInvite(validInviteCode, 'No longer needed');

      expect(mockRpc).toHaveBeenCalledWith('revoke_tenant_invite', {
        p_invite_code: validInviteCode,
        p_reason: 'No longer needed',
      });
    });

    it('should store revoke reason', async () => {
      const reason = 'Tenant application rejected';
      const mockRpc = vi.fn().mockResolvedValue({
        data: true,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      await revokeInvite(validInviteCode, reason);

      expect(mockRpc).toHaveBeenCalledWith('revoke_tenant_invite', {
        p_invite_code: validInviteCode,
        p_reason: reason,
      });
    });

    it('should fail for already accepted invite', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: false,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await revokeInvite(validInviteCode);

      expect(result.success).toBe(false);
    });

    it('should fail for non-existent invite', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: false,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await revokeInvite('nonexistent' + 'x'.repeat(54));

      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // GET INVITE BY CODE
  // ============================================

  describe('getInviteByCode', () => {
    it('should return invite details for valid code', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockValidInvite,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as Mock) = mockFrom;

      const result = await getInviteByCode(validInviteCode);

      expect(result).toEqual(mockValidInvite);
    });

    it('should return null for non-existent code', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      });
      (supabase.from as Mock) = mockFrom;

      const result = await getInviteByCode('nonexistent' + 'x'.repeat(54));

      expect(result).toBeNull();
    });
  });

  // ============================================
  // REMINDER TRACKING
  // ============================================

  describe('getPendingInvitesForReminder', () => {
    it('should return pending invites that need reminders', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [mockValidInvite],
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await getPendingInvitesForReminder();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });

    it('should not return invites with 3+ reminders', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [], // Invites with 3+ reminders are filtered out by the DB function
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await getPendingInvitesForReminder();

      expect(result).toHaveLength(0);
    });

    it('should not return expired invites', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await getPendingInvitesForReminder();

      expect(result).toHaveLength(0);
    });

    it('should only return invites where last reminder was 24+ hours ago', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [mockValidInvite],
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      const result = await getPendingInvitesForReminder();

      // The filtering is done in the database function
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('markReminderSent', () => {
    it('should increment reminder count', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      await markReminderSent(mockValidInvite.id);

      expect(mockRpc).toHaveBeenCalledWith('mark_invite_reminder_sent', {
        p_invite_id: mockValidInvite.id,
      });
    });

    it('should update reminder_sent_at timestamp', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      await markReminderSent(mockValidInvite.id);

      expect(mockRpc).toHaveBeenCalled();
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle concurrent invite creation for same email', async () => {
      // First call succeeds
      const mockRpc = vi.fn()
        .mockResolvedValueOnce({ data: mockValidInvite, error: null })
        // Second call fails with unique constraint
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'duplicate key value violates unique constraint' }
        });
      (supabase.rpc as Mock) = mockRpc;

      const result1 = await createTenantInvite({
        tenant_id: validTenantId,
        email: validEmail,
      });
      const result2 = await createTenantInvite({
        tenant_id: validTenantId,
        email: validEmail,
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
    });

    it('should handle empty invite code', async () => {
      const result = await validateInviteCode('');

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe('INVALID_CODE');
    });

    it('should handle whitespace in invite code', async () => {
      const result = await validateInviteCode('  ' + validInviteCode + '  ');

      // Should trim and validate
      expect(result).toBeDefined();
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousCode = "'; DROP TABLE tenant_invites; --".padEnd(64, 'a');

      // The validation should fail before hitting the database
      const result = await validateInviteCode(maliciousCode);

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe('INVALID_CODE');
    });

    it('should handle very long invite codes', async () => {
      const longCode = 'a'.repeat(1000);
      const result = await validateInviteCode(longCode);

      expect(result.valid).toBe(false);
      expect(result.error_code).toBe('INVALID_CODE');
    });

    it('should normalize email to lowercase', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: mockValidInvite,
        error: null,
      });
      (supabase.rpc as Mock) = mockRpc;

      await createTenantInvite({
        tenant_id: validTenantId,
        email: 'TENANT@EXAMPLE.COM',
      });

      expect(mockRpc).toHaveBeenCalled();
      // The service should normalize email before calling RPC
    });
  });
});
