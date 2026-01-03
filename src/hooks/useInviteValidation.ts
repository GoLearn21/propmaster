/**
 * useInviteValidation Hook
 * Validates tenant invite codes from URL params or props
 * Provides pre-fill data for signup form
 */

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { validateInviteCode } from '../services/tenant/tenantInviteService';
import type { InviteValidationResult, InviteErrorCode } from '../types/tenant-onboarding';

// ============================================
// TYPES
// ============================================

export interface UseInviteValidationOptions {
  /** Invite code - if not provided, extracted from URL params */
  inviteCode?: string;
  /** Enable/disable automatic validation */
  enabled?: boolean;
}

export interface UseInviteValidationReturn {
  /** Whether the invite is being validated */
  isValidating: boolean;
  /** Alias for isValidating */
  isLoading: boolean;
  /** Whether validation has completed and invite is valid */
  isValid: boolean;
  /** Whether there's an error */
  hasError: boolean;
  /** The error code if validation failed */
  errorCode?: InviteErrorCode;
  /** Human-readable error message */
  errorMessage?: string;
  /** The validated invite data */
  invite: InviteValidationResult | null;
  /** Pre-fill data for signup form */
  prefillData: PrefillData | null;
  /** Days until invite expires */
  daysUntilExpiry?: number;
  /** Whether invite is expiring soon (< 2 days) */
  isExpiringSoon: boolean;
  /** Refetch/revalidate the invite */
  refetch: () => Promise<void>;
}

export interface PrefillData {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

// ============================================
// ERROR MESSAGES
// ============================================

const ERROR_MESSAGES: Record<InviteErrorCode, string> = {
  INVALID_CODE: 'This invite link is invalid. Please check the link or contact your property manager.',
  EXPIRED: 'This invite has expired. Please contact your property manager for a new invite.',
  ALREADY_USED: 'This invite has already been used. If you already have an account, please log in.',
  REVOKED: 'This invite has been revoked. Please contact your property manager for assistance.',
};

// ============================================
// QUERY KEYS
// ============================================

export const inviteValidationKeys = {
  all: ['invite-validation'] as const,
  validate: (inviteCode: string) => [...inviteValidationKeys.all, 'validate', inviteCode] as const,
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useInviteValidation(
  options: UseInviteValidationOptions = {}
): UseInviteValidationReturn {
  // Get invite code from URL params or options
  const params = useParams<{ inviteCode?: string }>();
  const inviteCode = options.inviteCode || params.inviteCode || '';

  // Determine if we should validate
  const shouldValidate = (options.enabled ?? true) && Boolean(inviteCode);

  // Query for validation
  const {
    data: validationResult,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: inviteValidationKeys.validate(inviteCode),
    queryFn: () => validateInviteCode(inviteCode),
    enabled: shouldValidate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on validation failure
  });

  // Calculate derived values
  const isValid = validationResult?.valid === true;
  const hasError = !isLoading && (isError || (validationResult?.valid === false));
  const errorCode = validationResult?.error_code;

  // Calculate error message
  const errorMessage = useMemo(() => {
    if (!hasError) return undefined;

    if (errorCode) {
      return ERROR_MESSAGES[errorCode] || 'An unknown error occurred.';
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Failed to validate invite. Please try again.';
  }, [hasError, errorCode, error]);

  // Calculate pre-fill data
  const prefillData = useMemo<PrefillData | null>(() => {
    if (!isValid || !validationResult) return null;

    return {
      email: validationResult.email!,
      first_name: validationResult.first_name,
      last_name: validationResult.last_name,
      phone: validationResult.phone,
    };
  }, [isValid, validationResult]);

  // Calculate expiry info
  const expiryInfo = useMemo(() => {
    if (!isValid || !validationResult?.expires_at) {
      return { daysUntilExpiry: undefined, isExpiringSoon: false };
    }

    const expiryDate = new Date(validationResult.expires_at);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      daysUntilExpiry: Math.max(0, diffDays),
      isExpiringSoon: diffDays < 2,
    };
  }, [isValid, validationResult?.expires_at]);

  // Refetch wrapper
  const refetch = async (): Promise<void> => {
    await queryRefetch();
  };

  return {
    isValidating: isLoading || isFetching,
    isLoading,
    isValid,
    hasError,
    errorCode,
    errorMessage,
    invite: isValid ? validationResult : null,
    prefillData,
    daysUntilExpiry: expiryInfo.daysUntilExpiry,
    isExpiringSoon: expiryInfo.isExpiringSoon,
    refetch,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get the invite code from URL parameters
 */
export function getInviteCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const pathParts = window.location.pathname.split('/');
  const signupIndex = pathParts.indexOf('signup');

  if (signupIndex !== -1 && pathParts.length > signupIndex + 1) {
    return pathParts[signupIndex + 1];
  }

  return null;
}

/**
 * Check if an invite code is valid format (64 hex chars)
 */
export function isValidInviteCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  return /^[a-f0-9]{64}$/i.test(code.trim());
}
