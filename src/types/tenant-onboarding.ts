/**
 * Tenant Onboarding Types
 * Types for invite-only registration and onboarding wizard
 * Based on market research: Rentvine, DoorLoop, COHO
 */

// ============================================
// INVITE TYPES
// ============================================

/**
 * Invite status values
 */
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

/**
 * Invite validation error codes
 */
export type InviteErrorCode =
  | 'INVALID_CODE'
  | 'ALREADY_USED'
  | 'EXPIRED'
  | 'REVOKED';

/**
 * Tenant invite record
 */
export interface TenantInvite {
  id: string;
  tenant_id: string;
  email: string;
  invite_code: string;
  status: InviteStatus;
  first_name?: string;
  last_name?: string;
  phone?: string;
  property_id?: string;
  unit_id?: string;
  lease_id?: string;
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

/**
 * Result of validating an invite code
 */
export interface InviteValidationResult {
  valid: boolean;
  error_code?: InviteErrorCode;
  tenant_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  property_id?: string;
  unit_id?: string;
  lease_id?: string;
  expires_at?: string;
}

/**
 * Input for creating a new tenant invite
 */
export interface CreateInviteInput {
  tenant_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  property_id?: string;
  unit_id?: string;
  lease_id?: string;
  expiry_days?: number; // Default 7 days
}

// ============================================
// SIGNUP TYPES
// ============================================

/**
 * Password strength levels
 */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/**
 * Password validation result
 */
export interface PasswordValidation {
  isValid: boolean;
  strength: PasswordStrength;
  score: number; // 0-4
  errors: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

/**
 * Signup form data
 */
export interface SignupFormData {
  invite_code: string;
  email: string; // Pre-filled, readonly
  password: string;
  confirm_password: string;
}

/**
 * Signup result
 */
export interface SignupResult {
  success: boolean;
  user_id?: string;
  tenant_id?: string;
  error?: string;
  requires_onboarding: boolean;
}

// ============================================
// ONBOARDING TYPES
// ============================================

/**
 * Onboarding wizard steps
 */
export type OnboardingStep = 1 | 2 | 3 | 4;

/**
 * Step 1: Personal info verification
 */
export interface PersonalInfoStep {
  first_name: string;
  last_name: string;
  phone: string;
  email: string; // Readonly, from invite
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
}

/**
 * Step 2: Payment method setup (skippable)
 */
export interface PaymentMethodStep {
  skip_payment_setup: boolean;
  payment_method_id?: string; // Stripe payment method ID if added
  payment_method_type?: 'card' | 'bank_account';
  payment_method_last4?: string;
}

/**
 * Step 3: Notification preferences
 */
export interface NotificationPreferencesStep {
  email_payment_reminders: boolean;
  email_payment_receipts: boolean;
  email_maintenance_updates: boolean;
  email_lease_notifications: boolean;
  email_announcements: boolean;
  email_marketing: boolean;
  email_digest_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

/**
 * Step 4: Terms acceptance
 */
export interface TermsAcceptanceStep {
  terms_accepted: boolean;
  privacy_policy_accepted: boolean;
  electronic_signature_consent: boolean;
  acceptance_timestamp?: string;
  acceptance_ip?: string;
}

/**
 * Complete onboarding data (all steps combined)
 */
export interface OnboardingData {
  personal_info: PersonalInfoStep;
  payment_method?: PaymentMethodStep;
  notification_preferences: NotificationPreferencesStep;
  terms_acceptance: TermsAcceptanceStep;
}

/**
 * Onboarding state for the wizard
 */
export interface OnboardingState {
  current_step: OnboardingStep;
  steps_completed: OnboardingStep[];
  data: Partial<OnboardingData>;
  is_submitting: boolean;
  error?: string;
}

/**
 * Onboarding wizard props
 */
export interface OnboardingWizardProps {
  tenant_id: string;
  tenant_email: string;
  initial_data?: Partial<PersonalInfoStep>;
  property_name?: string;
  unit_name?: string;
  on_complete: () => void;
  on_cancel?: () => void;
}

/**
 * Step component props
 */
export interface StepComponentProps {
  data: Partial<OnboardingData>;
  on_next: (step_data: any) => void;
  on_back: () => void;
  is_first_step: boolean;
  is_last_step: boolean;
  is_submitting: boolean;
}

// ============================================
// PROFILE TYPES
// ============================================

/**
 * Tenant profile update input
 */
export interface UpdateProfileInput {
  first_name?: string;
  last_name?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  profile_image_url?: string;
}

/**
 * Notification preferences update input
 */
export interface UpdateNotificationPreferencesInput {
  email_payment_reminders?: boolean;
  email_payment_receipts?: boolean;
  email_maintenance_updates?: boolean;
  email_lease_notifications?: boolean;
  email_announcements?: boolean;
  email_marketing?: boolean;
  email_digest_frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
}

/**
 * Tenant notification preferences
 */
export interface TenantNotificationPreferences {
  id: string;
  tenant_id: string;
  email_payment_reminders: boolean;
  email_payment_receipts: boolean;
  email_maintenance_updates: boolean;
  email_lease_notifications: boolean;
  email_announcements: boolean;
  email_marketing: boolean;
  email_digest_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  created_at: string;
  updated_at: string;
}

// ============================================
// PASSWORD RESET TYPES
// ============================================

/**
 * Password reset request input
 */
export interface ForgotPasswordInput {
  email: string;
}

/**
 * Password reset result
 */
export interface ForgotPasswordResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Reset password input
 */
export interface ResetPasswordInput {
  token: string;
  password: string;
  confirm_password: string;
}

/**
 * Reset password result
 */
export interface ResetPasswordResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Change password input (for logged-in users)
 */
export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// ============================================
// SERVICE RESPONSE TYPES
// ============================================

/**
 * Generic service response
 */
export interface ServiceResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  error_code?: string;
}

/**
 * Invite service response types
 */
export type ValidateInviteResponse = ServiceResponse<InviteValidationResult>;
export type CreateInviteResponse = ServiceResponse<TenantInvite>;
export type AcceptInviteResponse = ServiceResponse<{ tenant_id: string }>;

/**
 * Signup service response
 */
export type SignupResponse = ServiceResponse<SignupResult>;

/**
 * Onboarding service response
 */
export type CompleteOnboardingResponse = ServiceResponse<{
  completed: boolean;
  redirect_url: string;
}>;

// ============================================
// FORM VALIDATION TYPES
// ============================================

/**
 * Form field error
 */
export interface FormFieldError {
  field: string;
  message: string;
}

/**
 * Form validation result
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: FormFieldError[];
}

// ============================================
// UI STATE TYPES
// ============================================

/**
 * Loading states for async operations
 */
export interface LoadingState {
  isLoading: boolean;
  isValidating: boolean;
  isSubmitting: boolean;
}

/**
 * Error state
 */
export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
  retry?: () => void;
}

/**
 * Invite validation hook state
 */
export interface UseInviteValidationState extends LoadingState, ErrorState {
  invite: InviteValidationResult | null;
  isValid: boolean;
}

/**
 * Onboarding hook state
 */
export interface UseTenantOnboardingState {
  currentStep: OnboardingStep;
  totalSteps: 4;
  progress: number; // 0-100
  data: Partial<OnboardingData>;
  isComplete: boolean;
  canGoBack: boolean;
  canGoNext: boolean;
  goToStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateStepData: <K extends keyof OnboardingData>(key: K, data: OnboardingData[K]) => void;
  submitOnboarding: () => Promise<boolean>;
  isSubmitting: boolean;
  error: string | null;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Password requirements (industry standard)
 */
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: true,
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

/**
 * Onboarding step labels
 */
export const ONBOARDING_STEP_LABELS: Record<OnboardingStep, string> = {
  1: 'Verify Info',
  2: 'Payment Method',
  3: 'Notifications',
  4: 'Review & Accept',
} as const;

/**
 * Onboarding step descriptions
 */
export const ONBOARDING_STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
  1: 'Verify your personal information',
  2: 'Add a payment method (optional)',
  3: 'Set your notification preferences',
  4: 'Review and accept terms',
} as const;

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesStep = {
  email_payment_reminders: true,
  email_payment_receipts: true,
  email_maintenance_updates: true,
  email_lease_notifications: true,
  email_announcements: true,
  email_marketing: false,
  email_digest_frequency: 'immediate',
} as const;

/**
 * Invite expiry duration in days
 */
export const INVITE_EXPIRY_DAYS = 7;

/**
 * Max reminder count (Rentvine pattern)
 */
export const MAX_INVITE_REMINDERS = 3;
