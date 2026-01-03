/**
 * OnboardingWizard Component
 * 4-step tenant onboarding wizard
 * Based on market research: Rentvine, DoorLoop, COHO
 *
 * Steps:
 * 1. Verify Info - Personal information verification
 * 2. Payment Method - Add payment method (skippable)
 * 3. Notifications - Set notification preferences
 * 4. Review & Accept - Accept terms and complete
 */

import React, { useState, useCallback } from 'react';
import {
  User,
  CreditCard,
  Bell,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Building2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import {
  updateTenantProfile,
  completeOnboarding,
  updateCommunicationPreferences,
} from '../../services/tenantAuthService';
import type {
  PersonalInfoStep,
  PaymentMethodStep,
  NotificationPreferencesStep,
  TermsAcceptanceStep,
  OnboardingStep,
} from '../../types/tenant-onboarding';

// ============================================
// TYPES
// ============================================

interface OnboardingWizardProps {
  tenantId: string;
  tenantEmail: string;
  propertyName?: string;
  unitName?: string;
  initialData?: Partial<PersonalInfoStep>;
  onComplete: () => void;
  onCancel?: () => void;
}

interface OnboardingData {
  personal_info?: PersonalInfoStep;
  payment_method?: PaymentMethodStep;
  notification_preferences?: NotificationPreferencesStep;
  terms_acceptance?: TermsAcceptanceStep;
}

interface StepInfo {
  number: OnboardingStep;
  title: string;
  description: string;
  icon: React.ElementType;
}

// ============================================
// CONSTANTS
// ============================================

const STEPS: StepInfo[] = [
  { number: 1, title: 'Verify Info', description: 'Verify your personal information', icon: User },
  { number: 2, title: 'Payment Method', description: 'Add a payment method (optional)', icon: CreditCard },
  { number: 3, title: 'Notifications', description: 'Set your notification preferences', icon: Bell },
  { number: 4, title: 'Review & Accept', description: 'Review and accept terms', icon: FileCheck },
];

// ============================================
// COMPONENT
// ============================================

export default function OnboardingWizard({
  tenantId,
  tenantEmail,
  propertyName,
  unitName,
  initialData,
  onComplete,
  onCancel,
}: OnboardingWizardProps) {
  // ============================================
  // STATE
  // ============================================

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [data, setData] = useState<OnboardingData>(() => ({
    personal_info: {
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      phone: initialData?.phone || '',
      email: tenantEmail,
      emergency_contact_name: initialData?.emergency_contact_name || '',
      emergency_contact_phone: initialData?.emergency_contact_phone || '',
      emergency_contact_relationship: initialData?.emergency_contact_relationship || '',
    },
    payment_method: { skip_payment_setup: false },
    notification_preferences: {
      email_payment_reminders: true,
      email_payment_receipts: true,
      email_maintenance_updates: true,
      email_lease_notifications: true,
      email_announcements: true,
      email_marketing: false,
      email_digest_frequency: 'immediate',
    },
    terms_acceptance: {
      terms_accepted: false,
      privacy_policy_accepted: false,
      electronic_signature_consent: false,
    },
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const progress = calculateProgress(currentStep, data);
  const currentStepInfo = STEPS.find((s) => s.number === currentStep)!;

  // ============================================
  // VALIDATION
  // ============================================

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.personal_info?.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!data.personal_info?.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!data.personal_info?.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = (): boolean => {
    const terms = data.terms_acceptance;
    if (!terms?.terms_accepted || !terms?.privacy_policy_accepted || !terms?.electronic_signature_consent) {
      setErrors({ terms: 'Please accept all terms to continue' });
      return false;
    }
    setErrors({});
    return true;
  };

  // ============================================
  // NAVIGATION
  // ============================================

  const handleNext = useCallback(() => {
    setSubmitError(null);

    // Validate current step
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 4 && !validateStep4()) return;

    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as OnboardingStep);
      setErrors({});
    }
  }, [currentStep, data]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as OnboardingStep);
      setErrors({});
      setSubmitError(null);
    }
  }, [currentStep]);

  const handleSkipPayment = useCallback(() => {
    setData((prev) => ({
      ...prev,
      payment_method: { skip_payment_setup: true },
    }));
    setCurrentStep(3);
    setErrors({});
  }, []);

  // ============================================
  // FORM HANDLERS
  // ============================================

  const updatePersonalInfo = (field: keyof PersonalInfoStep, value: string) => {
    setData((prev) => ({
      ...prev,
      personal_info: {
        ...prev.personal_info!,
        [field]: value,
      },
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateNotificationPref = (field: keyof NotificationPreferencesStep, value: boolean) => {
    setData((prev) => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences!,
        [field]: value,
      },
    }));
  };

  const updateTermsAcceptance = (field: keyof TermsAcceptanceStep, value: boolean) => {
    setData((prev) => ({
      ...prev,
      terms_acceptance: {
        ...prev.terms_acceptance!,
        [field]: value,
      },
    }));
    // Clear terms error
    if (errors.terms) {
      setErrors({});
    }
  };

  // ============================================
  // SUBMIT
  // ============================================

  const handleComplete = async () => {
    if (!validateStep4()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Update tenant profile
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
          setSubmitError(profileResult.error || 'Failed to update profile');
          return;
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
          setSubmitError(prefsResult.error || 'Failed to update notification preferences');
          return;
        }
      }

      // 3. Complete onboarding
      const completeResult = await completeOnboarding();

      if (!completeResult.success) {
        setSubmitError(completeResult.error || 'Failed to complete onboarding');
        return;
      }

      onComplete();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER STEPS
  // ============================================

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name"
          value={data.personal_info?.first_name || ''}
          onChange={(e) => updatePersonalInfo('first_name', e.target.value)}
          error={errors.first_name}
          placeholder="Enter your first name"
        />
        <Input
          label="Last Name"
          value={data.personal_info?.last_name || ''}
          onChange={(e) => updatePersonalInfo('last_name', e.target.value)}
          error={errors.last_name}
          placeholder="Enter your last name"
        />
      </div>

      <Input
        label="Phone"
        type="tel"
        value={data.personal_info?.phone || ''}
        onChange={(e) => updatePersonalInfo('phone', e.target.value)}
        error={errors.phone}
        placeholder="Enter your phone number"
      />

      <Input
        label="Email"
        type="email"
        value={tenantEmail}
        readOnly
        className="bg-neutral-lighter cursor-not-allowed"
      />

      <div className="pt-4 border-t border-neutral-light">
        <h3 className="text-lg font-medium text-neutral-dark mb-4">Emergency Contact (Optional)</h3>
        <div className="space-y-4">
          <Input
            label="Emergency Contact Name"
            value={data.personal_info?.emergency_contact_name || ''}
            onChange={(e) => updatePersonalInfo('emergency_contact_name', e.target.value)}
            placeholder="Enter emergency contact name"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Emergency Contact Phone"
              type="tel"
              value={data.personal_info?.emergency_contact_phone || ''}
              onChange={(e) => updatePersonalInfo('emergency_contact_phone', e.target.value)}
              placeholder="Enter phone number"
            />
            <Input
              label="Relationship"
              value={data.personal_info?.emergency_contact_relationship || ''}
              onChange={(e) => updatePersonalInfo('emergency_contact_relationship', e.target.value)}
              placeholder="e.g., Spouse, Parent"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Add a payment method for convenient rent payments
            </p>
            <p className="text-sm text-blue-700 mt-1">
              You can skip this step and add a payment method later from your dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center py-8">
        <CreditCard className="w-16 h-16 text-neutral-medium mx-auto mb-4" />
        <p className="text-neutral-dark mb-6">
          Payment method setup will be available in the next update.
        </p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <p className="text-neutral-medium">
        Choose which notifications you'd like to receive via email.
      </p>

      <div className="space-y-4">
        <Checkbox
          label="Payment Reminders"
          checked={data.notification_preferences?.email_payment_reminders}
          onChange={(e) => updateNotificationPref('email_payment_reminders', e.target.checked)}
        />
        <Checkbox
          label="Payment Receipts"
          checked={data.notification_preferences?.email_payment_receipts}
          onChange={(e) => updateNotificationPref('email_payment_receipts', e.target.checked)}
        />
        <Checkbox
          label="Maintenance Updates"
          checked={data.notification_preferences?.email_maintenance_updates}
          onChange={(e) => updateNotificationPref('email_maintenance_updates', e.target.checked)}
        />
        <Checkbox
          label="Lease Notifications"
          checked={data.notification_preferences?.email_lease_notifications}
          onChange={(e) => updateNotificationPref('email_lease_notifications', e.target.checked)}
        />
        <Checkbox
          label="Property Announcements"
          checked={data.notification_preferences?.email_announcements}
          onChange={(e) => updateNotificationPref('email_announcements', e.target.checked)}
        />
        <Checkbox
          label="Marketing & Promotions"
          checked={data.notification_preferences?.email_marketing}
          onChange={(e) => updateNotificationPref('email_marketing', e.target.checked)}
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="bg-neutral-lighter rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-neutral-dark">Summary</h3>
        <div className="text-sm text-neutral-medium space-y-1">
          <p>
            <span className="font-medium">Name:</span> {data.personal_info?.first_name} {data.personal_info?.last_name}
          </p>
          <p>
            <span className="font-medium">Email:</span> {tenantEmail}
          </p>
          <p>
            <span className="font-medium">Phone:</span> {data.personal_info?.phone}
          </p>
          {propertyName && (
            <p>
              <span className="font-medium">Property:</span> {propertyName}
              {unitName && ` - ${unitName}`}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Checkbox
          label="I agree to the Terms of Service"
          checked={data.terms_acceptance?.terms_accepted}
          onChange={(e) => updateTermsAcceptance('terms_accepted', e.target.checked)}
        />
        <Checkbox
          label="I agree to the Privacy Policy"
          checked={data.terms_acceptance?.privacy_policy_accepted}
          onChange={(e) => updateTermsAcceptance('privacy_policy_accepted', e.target.checked)}
        />
        <Checkbox
          label="I consent to Electronic Signature"
          checked={data.terms_acceptance?.electronic_signature_consent}
          onChange={(e) => updateTermsAcceptance('electronic_signature_consent', e.target.checked)}
        />
      </div>

      {errors.terms && (
        <p className="text-sm text-status-error flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {errors.terms}
        </p>
      )}

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {submitError}
          </p>
        </div>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div data-testid="onboarding-wizard" className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {propertyName && (
            <div className="flex items-center gap-2 text-neutral-medium">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">{propertyName}</span>
              {unitName && <span className="text-sm">- {unitName}</span>}
            </div>
          )}
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div
            data-testid="progress-bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 bg-neutral-lighter rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-accent-green transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Indicator */}
        <div data-testid="step-indicator" className="flex items-center justify-between">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = step.number === currentStep;
            const isCompleted = step.number < currentStep;

            return (
              <div
                key={step.number}
                data-testid={`step-${step.number}`}
                aria-current={isActive ? 'step' : undefined}
                className={`flex flex-col items-center flex-1 ${
                  step.number < STEPS.length ? 'relative' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                    isActive
                      ? 'bg-accent-green text-white'
                      : isCompleted
                      ? 'bg-accent-green/20 text-accent-green'
                      : 'bg-neutral-lighter text-neutral-medium'
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span
                  className={`text-xs font-medium text-center ${
                    isActive ? 'text-neutral-dark' : 'text-neutral-medium'
                  }`}
                >
                  {step.title}
                </span>
                {step.number < STEPS.length && (
                  <div
                    className={`absolute top-5 left-1/2 w-full h-0.5 ${
                      isCompleted ? 'bg-accent-green/20' : 'bg-neutral-lighter'
                    }`}
                    style={{ marginLeft: '20px', width: 'calc(100% - 40px)' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-neutral-medium mt-4">
          Step {currentStep} of {STEPS.length}
        </p>
      </div>

      {/* Step Title */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-neutral-dark">{currentStepInfo.title}</h2>
        <p className="text-neutral-medium">{currentStepInfo.description}</p>
      </div>

      {/* Step Content */}
      <div className="mb-8">{renderCurrentStep()}</div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-neutral-light">
        {currentStep > 1 ? (
          <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        ) : (
          <div />
        )}

        <div className="flex gap-3">
          {currentStep === 2 && (
            <Button variant="ghost" onClick={handleSkipPayment}>
              Skip for Later
            </Button>
          )}

          {currentStep < 4 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} loading={isSubmitting} disabled={isSubmitting}>
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateProgress(step: OnboardingStep, data: OnboardingData): number {
  // If all steps completed with data, return 100
  if (
    data.personal_info?.first_name &&
    data.payment_method &&
    data.notification_preferences &&
    data.terms_acceptance?.terms_accepted &&
    data.terms_acceptance?.privacy_policy_accepted &&
    data.terms_acceptance?.electronic_signature_consent
  ) {
    return 100;
  }

  // Calculate based on current step
  switch (step) {
    case 1:
      return 0;
    case 2:
      return 25;
    case 3:
      return 50;
    case 4:
      return 75;
    default:
      return 0;
  }
}
