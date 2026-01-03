/**
 * useTenantOnboarding Hook
 * Manages the 4-step tenant onboarding wizard state
 * Based on market research: Rentvine, DoorLoop, COHO
 *
 * Steps:
 * 1. Verify Info - Personal information verification
 * 2. Payment Method - Add payment method (skippable)
 * 3. Notifications - Set notification preferences
 * 4. Review & Accept - Accept terms and complete
 */

import { useState, useCallback, useMemo } from 'react';
import {
  updateTenantProfile,
  completeOnboarding,
  updateCommunicationPreferences,
} from '../services/tenantAuthService';
import type {
  OnboardingData,
  PersonalInfoStep,
  PaymentMethodStep,
  NotificationPreferencesStep,
  TermsAcceptanceStep,
  OnboardingStep,
} from '../types/tenant-onboarding';

// ============================================
// TYPES
// ============================================

export interface UseTenantOnboardingOptions {
  /** Tenant ID - required */
  tenantId: string;
  /** Tenant email - required */
  tenantEmail: string;
  /** Initial data from invite (pre-fill) */
  initialData?: Partial<PersonalInfoStep>;
}

export interface UseTenantOnboardingReturn {
  /** Current step (1-4) */
  currentStep: OnboardingStep;
  /** Total number of steps */
  totalSteps: 4;
  /** Progress percentage (0-100) */
  progress: number;
  /** Whether onboarding is complete */
  isComplete: boolean;
  /** Whether user can go back */
  canGoBack: boolean;
  /** Whether user can go next */
  canGoNext: boolean;
  /** All onboarding data collected */
  data: Partial<OnboardingData>;
  /** Whether form is being submitted */
  isSubmitting: boolean;
  /** Error message if any */
  error?: string;
  /** Advance to next step */
  nextStep: () => Promise<void>;
  /** Go back to previous step */
  prevStep: () => void;
  /** Go to specific step */
  goToStep: (step: OnboardingStep) => void;
  /** Update data for a specific step */
  updateStepData: <K extends keyof OnboardingData>(
    key: K,
    data: OnboardingData[K]
  ) => void;
  /** Submit the complete onboarding */
  submitOnboarding: () => Promise<boolean>;
  /** Reset wizard to initial state */
  reset: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const TOTAL_STEPS = 4 as const;

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useTenantOnboarding(
  options: UseTenantOnboardingOptions
): UseTenantOnboardingReturn {
  const { tenantId, tenantEmail, initialData } = options;

  // ============================================
  // STATE
  // ============================================

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [data, setData] = useState<Partial<OnboardingData>>(() => {
    // Initialize with data from invite if provided
    if (initialData) {
      return {
        personal_info: {
          first_name: initialData.first_name || '',
          last_name: initialData.last_name || '',
          phone: initialData.phone || '',
          email: tenantEmail,
          emergency_contact_name: initialData.emergency_contact_name,
          emergency_contact_phone: initialData.emergency_contact_phone,
          emergency_contact_relationship: initialData.emergency_contact_relationship,
        },
      };
    }
    return {};
  });
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // ============================================
  // VALIDATION ERROR FOR MISSING TENANT ID
  // ============================================

  if (!tenantId || tenantId.trim() === '') {
    return {
      currentStep: 1,
      totalSteps: TOTAL_STEPS,
      progress: 0,
      isComplete: false,
      canGoBack: false,
      canGoNext: false,
      data: {},
      isSubmitting: false,
      error: 'Tenant ID is required',
      nextStep: async () => {},
      prevStep: () => {},
      goToStep: () => {},
      updateStepData: () => {},
      submitOnboarding: async () => false,
      reset: () => {},
    };
  }

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const canGoBack = currentStep > 1;
  const canGoNext = currentStep < TOTAL_STEPS;

  // Calculate progress based on completed steps and current data
  const progress = useMemo(() => {
    // If all steps completed with data, return 100
    if (
      data.personal_info &&
      data.payment_method &&
      data.notification_preferences &&
      data.terms_acceptance
    ) {
      return 100;
    }

    // Otherwise, calculate based on current step
    // Step 1 = 0%, Step 2 = 25%, Step 3 = 50%, Step 4 = 75%
    // When step 4 data is set, it becomes 100%
    if (currentStep === 1) {
      return 0;
    }

    // Each completed step adds 25%
    let completedProgress = 0;
    if (currentStep >= 2 && data.personal_info) completedProgress = 25;
    if (currentStep >= 3 && data.payment_method) completedProgress = 50;
    if (currentStep >= 4 && data.notification_preferences) completedProgress = 75;
    if (data.terms_acceptance) completedProgress = 100;

    return completedProgress;
  }, [currentStep, data]);

  // ============================================
  // UPDATE STEP DATA
  // ============================================

  const updateStepData = useCallback(
    <K extends keyof OnboardingData>(key: K, stepData: OnboardingData[K]) => {
      setData((prev) => ({
        ...prev,
        [key]: stepData,
      }));
      // Clear any previous error when user updates data
      setError(undefined);
    },
    []
  );

  // ============================================
  // NAVIGATION
  // ============================================

  const nextStep = useCallback(async () => {
    if (currentStep >= TOTAL_STEPS) return;

    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS) as OnboardingStep);
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep <= 1) return;

    setCurrentStep((prev) => Math.max(prev - 1, 1) as OnboardingStep);
  }, [currentStep]);

  const goToStep = useCallback((step: OnboardingStep) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setCurrentStep(step);
    }
  }, []);

  // ============================================
  // SUBMIT ONBOARDING
  // ============================================

  const submitOnboarding = useCallback(async (): Promise<boolean> => {
    setIsSubmitting(true);
    setError(undefined);

    try {
      // 1. Update tenant profile with personal info
      if (data.personal_info) {
        const profileResult = await updateTenantProfile({
          first_name: data.personal_info.first_name,
          last_name: data.personal_info.last_name,
          phone: data.personal_info.phone,
          emergency_contact_name: data.personal_info.emergency_contact_name,
          emergency_contact_phone: data.personal_info.emergency_contact_phone,
          emergency_contact_relationship: data.personal_info.emergency_contact_relationship,
        });

        if (!profileResult.success) {
          setError(profileResult.error || 'Failed to update profile');
          return false;
        }
      }

      // 2. Update notification preferences
      if (data.notification_preferences) {
        const prefsResult = await updateCommunicationPreferences({
          email_payment_reminders: data.notification_preferences.email_payment_reminders,
          email_payment_receipts: data.notification_preferences.email_payment_receipts,
          email_maintenance_updates: data.notification_preferences.email_maintenance_updates,
          email_lease_notifications: data.notification_preferences.email_lease_notifications,
          email_announcements: data.notification_preferences.email_announcements,
          email_marketing: data.notification_preferences.email_marketing,
        });

        if (!prefsResult.success) {
          setError(prefsResult.error || 'Failed to update notification preferences');
          return false;
        }
      }

      // 3. Mark onboarding as complete
      const completeResult = await completeOnboarding();

      if (!completeResult.success) {
        setError(completeResult.error || 'Failed to complete onboarding');
        return false;
      }

      setIsComplete(true);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [data]);

  // ============================================
  // RESET
  // ============================================

  const reset = useCallback(() => {
    setCurrentStep(1);
    setData({});
    setIsComplete(false);
    setIsSubmitting(false);
    setError(undefined);
  }, []);

  // ============================================
  // RETURN
  // ============================================

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    progress,
    isComplete,
    canGoBack,
    canGoNext,
    data,
    isSubmitting,
    error,
    nextStep,
    prevStep,
    goToStep,
    updateStepData,
    submitOnboarding,
    reset,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get step label for display
 */
export function getStepLabel(step: OnboardingStep): string {
  const labels: Record<OnboardingStep, string> = {
    1: 'Verify Info',
    2: 'Payment Method',
    3: 'Notifications',
    4: 'Review & Accept',
  };
  return labels[step];
}

/**
 * Get step description for display
 */
export function getStepDescription(step: OnboardingStep): string {
  const descriptions: Record<OnboardingStep, string> = {
    1: 'Verify your personal information',
    2: 'Add a payment method (optional)',
    3: 'Set your notification preferences',
    4: 'Review and accept terms',
  };
  return descriptions[step];
}

/**
 * Check if a step can be skipped
 */
export function isStepSkippable(step: OnboardingStep): boolean {
  // Only step 2 (payment method) is skippable
  return step === 2;
}
