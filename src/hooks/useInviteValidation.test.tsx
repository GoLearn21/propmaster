/**
 * useInviteValidation Hook Tests
 * TDD: RED Phase - Write failing tests first
 *
 * Tests cover:
 * - Invite code validation from URL params
 * - Loading/validating states
 * - Error handling for various error codes
 * - Pre-filling tenant data on success
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useParams } from 'react-router-dom';
import React from 'react';
import { useInviteValidation } from './useInviteValidation';
import * as inviteService from '../services/tenant/tenantInviteService';
import type { InviteValidationResult } from '../types/tenant-onboarding';

// Mock react-router-dom useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
  };
});

// Mock invite service
vi.mock('../services/tenant/tenantInviteService', () => ({
  validateInviteCode: vi.fn(),
}));

describe('useInviteValidation', () => {
  let queryClient: QueryClient;
  const validInviteCode = 'a'.repeat(64);
  const validTenantId = '550e8400-e29b-41d4-a716-446655440000';

  const mockValidResult: InviteValidationResult = {
    valid: true,
    tenant_id: validTenantId,
    email: 'tenant@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '5551234567',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // Wrapper with QueryClient and Router
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no invite code in URL
    (useParams as ReturnType<typeof vi.fn>).mockReturnValue({});
  });

  afterEach(() => {
    queryClient?.clear();
  });

  // ============================================
  // BASIC FUNCTIONALITY
  // ============================================

  describe('Basic Functionality', () => {
    it('should extract invite code from URL params', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue(mockValidResult);

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(inviteService.validateInviteCode).toHaveBeenCalledWith(validInviteCode);
    });

    it('should accept invite code as prop instead of URL param', async () => {
      const propInviteCode = 'b'.repeat(64);
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue(mockValidResult);

      const { result } = renderHook(
        () => useInviteValidation({ inviteCode: propInviteCode }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(inviteService.validateInviteCode).toHaveBeenCalledWith(propInviteCode);
    });

    it('should return invite data when validation succeeds', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue(mockValidResult);

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(true);
      });

      expect(result.current.invite).toEqual(mockValidResult);
      expect(result.current.invite?.email).toBe('tenant@example.com');
      expect(result.current.invite?.first_name).toBe('John');
      expect(result.current.invite?.last_name).toBe('Doe');
    });
  });

  // ============================================
  // LOADING STATES
  // ============================================

  describe('Loading States', () => {
    it('should start with isValidating=true when invite code is present', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });

      // Create a promise that doesn't resolve immediately
      let resolveValidation: (value: InviteValidationResult) => void;
      const validationPromise = new Promise<InviteValidationResult>((resolve) => {
        resolveValidation = resolve;
      });
      vi.mocked(inviteService.validateInviteCode).mockReturnValue(validationPromise);

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      // Should be validating initially
      expect(result.current.isValidating).toBe(true);
      expect(result.current.isLoading).toBe(true);

      // Resolve and wait
      act(() => {
        resolveValidation!(mockValidResult);
      });

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });
    });

    it('should set isValidating=false after validation completes', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue(mockValidResult);

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should not validate when no invite code is present', () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({});

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      // Should not be loading or validating
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isValidating).toBe(false);
      expect(result.current.invite).toBeNull();
      expect(inviteService.validateInviteCode).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    it('should handle INVALID_CODE error', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue({
        valid: false,
        error_code: 'INVALID_CODE',
      });

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errorCode).toBe('INVALID_CODE');
      expect(result.current.errorMessage).toContain('invalid');
    });

    it('should handle EXPIRED error', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue({
        valid: false,
        error_code: 'EXPIRED',
      });

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });

      expect(result.current.errorCode).toBe('EXPIRED');
      expect(result.current.errorMessage).toContain('expired');
    });

    it('should handle ALREADY_USED error', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue({
        valid: false,
        error_code: 'ALREADY_USED',
      });

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });

      expect(result.current.errorCode).toBe('ALREADY_USED');
      expect(result.current.errorMessage).toContain('already');
    });

    it('should handle REVOKED error', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue({
        valid: false,
        error_code: 'REVOKED',
      });

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });

      expect(result.current.errorCode).toBe('REVOKED');
      expect(result.current.errorMessage).toContain('revoked');
    });

    it('should handle network errors gracefully', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errorMessage).toBeDefined();
    });
  });

  // ============================================
  // REVALIDATION
  // ============================================

  describe('Revalidation', () => {
    it('should provide a refetch function', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue(mockValidResult);

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });

    it('should revalidate when refetch is called', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue(mockValidResult);

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(inviteService.validateInviteCode).toHaveBeenCalledTimes(1);

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(inviteService.validateInviteCode).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================
  // PRE-FILL DATA
  // ============================================

  describe('Pre-fill Data', () => {
    it('should provide pre-filled form data for signup', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue(mockValidResult);

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(true);
      });

      expect(result.current.prefillData).toEqual({
        email: 'tenant@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone: '5551234567',
      });
    });

    it('should return empty prefillData when validation fails', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue({
        valid: false,
        error_code: 'INVALID_CODE',
      });

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.hasError).toBe(true);
      });

      expect(result.current.prefillData).toBeNull();
    });
  });

  // ============================================
  // EXPIRY TRACKING
  // ============================================

  describe('Expiry Tracking', () => {
    it('should calculate days until expiry', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });

      const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue({
        ...mockValidResult,
        expires_at: fiveDaysFromNow,
      });

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(true);
      });

      expect(result.current.daysUntilExpiry).toBeGreaterThanOrEqual(4);
      expect(result.current.daysUntilExpiry).toBeLessThanOrEqual(5);
    });

    it('should flag invites expiring soon (< 2 days)', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });

      const oneDayFromNow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue({
        ...mockValidResult,
        expires_at: oneDayFromNow,
      });

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(true);
      });

      expect(result.current.isExpiringSoon).toBe(true);
    });

    it('should not flag invites with plenty of time', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue(mockValidResult); // 7 days

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(true);
      });

      expect(result.current.isExpiringSoon).toBe(false);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle empty invite code in URL', () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: '',
      });

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
      expect(result.current.invite).toBeNull();
    });

    it('should prefer prop inviteCode over URL param', async () => {
      const urlCode = 'a'.repeat(64);
      const propCode = 'b'.repeat(64);

      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: urlCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue(mockValidResult);

      const { result } = renderHook(
        () => useInviteValidation({ inviteCode: propCode }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(inviteService.validateInviteCode).toHaveBeenCalledWith(propCode);
      expect(inviteService.validateInviteCode).not.toHaveBeenCalledWith(urlCode);
    });

    it('should handle invite with missing optional fields', async () => {
      (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
        inviteCode: validInviteCode,
      });
      vi.mocked(inviteService.validateInviteCode).mockResolvedValue({
        valid: true,
        tenant_id: validTenantId,
        email: 'tenant@example.com',
        expires_at: mockValidResult.expires_at,
        // first_name, last_name, phone are undefined
      });

      const { result } = renderHook(() => useInviteValidation(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isValid).toBe(true);
      });

      expect(result.current.prefillData?.email).toBe('tenant@example.com');
      expect(result.current.prefillData?.first_name).toBeUndefined();
    });
  });
});
