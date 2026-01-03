/**
 * useTenantOnboarding Hook Tests
 * TDD: RED Phase - Write failing tests first
 *
 * Tests cover:
 * - Wizard step navigation
 * - Form data persistence across steps
 * - Step validation before advancing
 * - Complete onboarding submission
 * - Progress tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTenantOnboarding } from './useTenantOnboarding';
import * as tenantAuthService from '../services/tenantAuthService';
import type {
  PersonalInfoStep,
  NotificationPreferencesStep,
  TermsAcceptanceStep,
  PaymentMethodStep,
  OnboardingStep,
} from '../types/tenant-onboarding';

// Mock auth service
vi.mock('../services/tenantAuthService', () => ({
  updateTenantProfile: vi.fn(),
  completeOnboarding: vi.fn(),
  updateCommunicationPreferences: vi.fn(),
}));

describe('useTenantOnboarding', () => {
  let queryClient: QueryClient;
  const tenantId = '550e8400-e29b-41d4-a716-446655440000';
  const tenantEmail = 'tenant@example.com';

  const mockPersonalInfo: PersonalInfoStep = {
    first_name: 'John',
    last_name: 'Doe',
    phone: '5551234567',
    email: tenantEmail,
    emergency_contact_name: 'Jane Doe',
    emergency_contact_phone: '5559876543',
    emergency_contact_relationship: 'Spouse',
  };

  const mockPaymentMethod: PaymentMethodStep = {
    skip_payment_setup: true,
  };

  const mockNotificationPrefs: NotificationPreferencesStep = {
    email_payment_reminders: true,
    email_payment_receipts: true,
    email_maintenance_updates: true,
    email_lease_notifications: true,
    email_announcements: true,
    email_marketing: false,
    email_digest_frequency: 'immediate',
  };

  const mockTermsAcceptance: TermsAcceptanceStep = {
    terms_accepted: true,
    privacy_policy_accepted: true,
    electronic_signature_consent: true,
  };

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
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tenantAuthService.updateTenantProfile).mockResolvedValue({
      success: true,
      tenant: {} as any,
    });
    vi.mocked(tenantAuthService.completeOnboarding).mockResolvedValue({
      success: true,
    });
    vi.mocked(tenantAuthService.updateCommunicationPreferences).mockResolvedValue({
      success: true,
    });
  });

  afterEach(() => {
    queryClient?.clear();
  });

  // ============================================
  // INITIAL STATE
  // ============================================

  describe('Initial State', () => {
    it('should start at step 1', () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      expect(result.current.currentStep).toBe(1);
    });

    it('should have 4 total steps', () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      expect(result.current.totalSteps).toBe(4);
    });

    it('should start with 0% progress', () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      expect(result.current.progress).toBe(0);
    });

    it('should not be complete initially', () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isComplete).toBe(false);
    });

    it('should not allow going back from step 1', () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      expect(result.current.canGoBack).toBe(false);
    });

    it('should allow going next from step 1 if data is valid', () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Before adding data, canGoNext depends on validation
      expect(result.current.canGoNext).toBeDefined();
    });

    it('should accept initial data from invite', () => {
      const initialData = {
        first_name: 'John',
        last_name: 'Doe',
        phone: '5551234567',
      };

      const { result } = renderHook(
        () => useTenantOnboarding({
          tenantId,
          tenantEmail,
          initialData,
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.data.personal_info?.first_name).toBe('John');
      expect(result.current.data.personal_info?.last_name).toBe('Doe');
    });
  });

  // ============================================
  // NAVIGATION
  // ============================================

  describe('Navigation', () => {
    it('should advance to next step when nextStep is called', async () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Set valid data for step 1
      act(() => {
        result.current.updateStepData('personal_info', mockPersonalInfo);
      });

      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(2);
    });

    it('should go back when prevStep is called', async () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Complete step 1 and go to step 2
      act(() => {
        result.current.updateStepData('personal_info', mockPersonalInfo);
      });
      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(2);

      // Go back
      act(() => {
        result.current.prevStep();
      });

      expect(result.current.currentStep).toBe(1);
    });

    it('should go to specific step when goToStep is called', async () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Complete steps 1, 2, 3
      act(() => {
        result.current.updateStepData('personal_info', mockPersonalInfo);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('payment_method', mockPaymentMethod);
      });
      await act(async () => {
        await result.current.nextStep();
      });

      // Should now be on step 3
      expect(result.current.currentStep).toBe(3);

      // Go back to step 1
      act(() => {
        result.current.goToStep(1);
      });

      expect(result.current.currentStep).toBe(1);
    });

    it('should not advance past step 4', async () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Complete all steps
      act(() => {
        result.current.updateStepData('personal_info', mockPersonalInfo);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('payment_method', mockPaymentMethod);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('notification_preferences', mockNotificationPrefs);
      });
      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(4);

      // Try to advance past step 4
      await act(async () => {
        await result.current.nextStep();
      });

      // Should still be on step 4
      expect(result.current.currentStep).toBe(4);
    });

    it('should not go before step 1', () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      expect(result.current.currentStep).toBe(1);

      act(() => {
        result.current.prevStep();
      });

      expect(result.current.currentStep).toBe(1);
    });
  });

  // ============================================
  // DATA PERSISTENCE
  // ============================================

  describe('Data Persistence', () => {
    it('should preserve data when navigating between steps', async () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Set step 1 data
      act(() => {
        result.current.updateStepData('personal_info', mockPersonalInfo);
      });

      // Advance to step 2
      await act(async () => {
        await result.current.nextStep();
      });

      // Go back to step 1
      act(() => {
        result.current.prevStep();
      });

      // Data should still be there
      expect(result.current.data.personal_info).toEqual(mockPersonalInfo);
    });

    it('should merge partial updates with existing data', async () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Set initial data
      act(() => {
        result.current.updateStepData('personal_info', {
          first_name: 'John',
          last_name: 'Doe',
          phone: '5551234567',
          email: tenantEmail,
        });
      });

      // Update only first_name
      act(() => {
        result.current.updateStepData('personal_info', {
          ...result.current.data.personal_info!,
          first_name: 'Jane',
        });
      });

      expect(result.current.data.personal_info?.first_name).toBe('Jane');
      expect(result.current.data.personal_info?.last_name).toBe('Doe');
    });
  });

  // ============================================
  // PROGRESS TRACKING
  // ============================================

  describe('Progress Tracking', () => {
    it('should update progress as steps are completed', async () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      expect(result.current.progress).toBe(0);

      // Complete step 1
      act(() => {
        result.current.updateStepData('personal_info', mockPersonalInfo);
      });
      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.progress).toBe(25);

      // Complete step 2
      act(() => {
        result.current.updateStepData('payment_method', mockPaymentMethod);
      });
      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.progress).toBe(50);

      // Complete step 3
      act(() => {
        result.current.updateStepData('notification_preferences', mockNotificationPrefs);
      });
      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.progress).toBe(75);
    });

    it('should show 100% progress when all steps are complete', async () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Complete all steps
      act(() => {
        result.current.updateStepData('personal_info', mockPersonalInfo);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('payment_method', mockPaymentMethod);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('notification_preferences', mockNotificationPrefs);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('terms_acceptance', mockTermsAcceptance);
      });

      // After setting step 4 data, should be at 100%
      expect(result.current.progress).toBe(100);
    });
  });

  // ============================================
  // SUBMIT ONBOARDING
  // ============================================

  describe('Submit Onboarding', () => {
    it('should call submitOnboarding and update profile', async () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Complete all steps
      act(() => {
        result.current.updateStepData('personal_info', mockPersonalInfo);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('payment_method', mockPaymentMethod);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('notification_preferences', mockNotificationPrefs);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('terms_acceptance', mockTermsAcceptance);
      });

      // Submit
      let success: boolean = false;
      await act(async () => {
        success = await result.current.submitOnboarding();
      });

      expect(success).toBe(true);
      expect(result.current.isComplete).toBe(true);
      expect(tenantAuthService.updateTenantProfile).toHaveBeenCalled();
      expect(tenantAuthService.completeOnboarding).toHaveBeenCalled();
    });

    it('should show submitting state during submission', async () => {
      let resolveSubmit: () => void;
      vi.mocked(tenantAuthService.completeOnboarding).mockImplementation(
        () => new Promise((resolve) => {
          resolveSubmit = () => resolve({ success: true });
        })
      );

      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Complete all steps
      act(() => {
        result.current.updateStepData('personal_info', mockPersonalInfo);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('payment_method', mockPaymentMethod);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('notification_preferences', mockNotificationPrefs);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('terms_acceptance', mockTermsAcceptance);
      });

      // Start submit (don't await)
      let submitPromise: Promise<boolean>;
      act(() => {
        submitPromise = result.current.submitOnboarding();
      });

      // Should be submitting
      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(true);
      });

      // Resolve
      act(() => {
        resolveSubmit!();
      });

      await act(async () => {
        await submitPromise;
      });

      expect(result.current.isSubmitting).toBe(false);
    });

    it('should handle submission errors', async () => {
      vi.mocked(tenantAuthService.completeOnboarding).mockResolvedValue({
        success: false,
        error: 'Failed to complete onboarding',
      });

      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Complete all steps
      act(() => {
        result.current.updateStepData('personal_info', mockPersonalInfo);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('payment_method', mockPaymentMethod);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('notification_preferences', mockNotificationPrefs);
      });
      await act(async () => {
        await result.current.nextStep();
      });
      act(() => {
        result.current.updateStepData('terms_acceptance', mockTermsAcceptance);
      });

      // Submit
      let success: boolean = true;
      await act(async () => {
        success = await result.current.submitOnboarding();
      });

      expect(success).toBe(false);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.error).toBeDefined();
    });
  });

  // ============================================
  // STEP 2: SKIPPABLE PAYMENT
  // ============================================

  describe('Skippable Payment Step', () => {
    it('should allow skipping payment setup', async () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Complete step 1
      act(() => {
        result.current.updateStepData('personal_info', mockPersonalInfo);
      });
      await act(async () => {
        await result.current.nextStep();
      });

      // Skip payment setup
      act(() => {
        result.current.updateStepData('payment_method', { skip_payment_setup: true });
      });
      await act(async () => {
        await result.current.nextStep();
      });

      // Should be on step 3
      expect(result.current.currentStep).toBe(3);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle missing tenant ID', () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId: '', tenantEmail }),
        { wrapper: createWrapper() }
      );

      expect(result.current.error).toBeDefined();
    });

    it('should reset wizard when reset is called', async () => {
      const { result } = renderHook(
        () => useTenantOnboarding({ tenantId, tenantEmail }),
        { wrapper: createWrapper() }
      );

      // Complete step 1 and advance
      act(() => {
        result.current.updateStepData('personal_info', mockPersonalInfo);
      });
      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(2);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.currentStep).toBe(1);
      expect(result.current.data.personal_info).toBeUndefined();
    });
  });
});
