/**
 * Tenant Onboarding Validation Schemas
 * Zod schemas for form validation in signup and onboarding flows
 * Based on industry standards and password requirements
 */

import { z } from 'zod';
import { PASSWORD_REQUIREMENTS } from '../types/tenant-onboarding';

// ============================================
// HELPER SCHEMAS
// ============================================

/**
 * Phone number validation (US format)
 */
export const phoneSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number is too long')
  .regex(
    /^[\d\s\-\(\)\+]+$/,
    'Phone number can only contain digits, spaces, dashes, and parentheses'
  )
  .transform((val) => val.replace(/\D/g, '')); // Strip non-digits for storage

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(5, 'Email is too short')
  .max(255, 'Email is too long')
  .toLowerCase()
  .trim();

/**
 * Name validation (first/last)
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .trim();

/**
 * Invite code validation (64 hex characters)
 */
export const inviteCodeSchema = z
  .string()
  .length(64, 'Invalid invite code')
  .regex(/^[a-f0-9]+$/i, 'Invalid invite code format');

// ============================================
// PASSWORD VALIDATION
// ============================================

/**
 * Password validation with strength requirements
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_REQUIREMENTS.MIN_LENGTH, `Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`)
  .max(128, 'Password is too long')
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /\d/.test(password),
    'Password must contain at least one number'
  )
  .refine(
    (password) => /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
    'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)'
  );

/**
 * Password confirmation helper
 */
export const passwordConfirmSchema = z.object({
  password: passwordSchema,
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

// ============================================
// SIGNUP SCHEMA
// ============================================

/**
 * Signup form validation schema
 */
export const signupFormSchema = z.object({
  invite_code: inviteCodeSchema,
  email: emailSchema,
  password: passwordSchema,
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export type SignupFormValues = z.infer<typeof signupFormSchema>;

// ============================================
// ONBOARDING STEP SCHEMAS
// ============================================

/**
 * Step 1: Personal info verification
 */
export const personalInfoSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  phone: phoneSchema,
  email: emailSchema, // Readonly, from invite
  emergency_contact_name: z.string().max(100).optional().or(z.literal('')),
  emergency_contact_phone: z.string()
    .regex(/^[\d\s\-\(\)\+]*$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  emergency_contact_relationship: z.string().max(50).optional().or(z.literal('')),
});

export type PersonalInfoFormValues = z.infer<typeof personalInfoSchema>;

/**
 * Step 2: Payment method setup (optional step)
 */
export const paymentMethodSchema = z.object({
  skip_payment_setup: z.boolean().default(false),
  payment_method_id: z.string().optional(),
  payment_method_type: z.enum(['card', 'bank_account']).optional(),
  payment_method_last4: z.string().length(4).optional(),
});

export type PaymentMethodFormValues = z.infer<typeof paymentMethodSchema>;

/**
 * Step 3: Notification preferences
 */
export const notificationPreferencesSchema = z.object({
  email_payment_reminders: z.boolean().default(true),
  email_payment_receipts: z.boolean().default(true),
  email_maintenance_updates: z.boolean().default(true),
  email_lease_notifications: z.boolean().default(true),
  email_announcements: z.boolean().default(true),
  email_marketing: z.boolean().default(false),
  email_digest_frequency: z.enum(['immediate', 'daily', 'weekly', 'never']).default('immediate'),
});

export type NotificationPreferencesFormValues = z.infer<typeof notificationPreferencesSchema>;

/**
 * Step 4: Terms acceptance
 */
export const termsAcceptanceSchema = z.object({
  terms_accepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Terms of Service',
  }),
  privacy_policy_accepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Privacy Policy',
  }),
  electronic_signature_consent: z.boolean().refine((val) => val === true, {
    message: 'You must consent to electronic signatures',
  }),
});

export type TermsAcceptanceFormValues = z.infer<typeof termsAcceptanceSchema>;

/**
 * Complete onboarding data schema
 */
export const completeOnboardingSchema = z.object({
  personal_info: personalInfoSchema,
  payment_method: paymentMethodSchema.optional(),
  notification_preferences: notificationPreferencesSchema,
  terms_acceptance: termsAcceptanceSchema,
});

export type CompleteOnboardingValues = z.infer<typeof completeOnboardingSchema>;

// ============================================
// PROFILE UPDATE SCHEMAS
// ============================================

/**
 * Update profile schema
 */
export const updateProfileSchema = z.object({
  first_name: nameSchema.optional(),
  last_name: nameSchema.optional(),
  phone: phoneSchema.optional(),
  emergency_contact_name: z.string().max(100).optional().or(z.literal('')),
  emergency_contact_phone: z.string()
    .regex(/^[\d\s\-\(\)\+]*$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  emergency_contact_relationship: z.string().max(50).optional().or(z.literal('')),
  profile_image_url: z.string().url().optional().or(z.literal('')),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

/**
 * Update notification preferences schema
 */
export const updateNotificationPreferencesSchema = notificationPreferencesSchema.partial();

export type UpdateNotificationPreferencesFormValues = z.infer<typeof updateNotificationPreferencesSchema>;

// ============================================
// PASSWORD RESET SCHEMAS
// ============================================

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/**
 * Change password schema (for logged-in users)
 */
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
  confirm_password: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
}).refine((data) => data.current_password !== data.new_password, {
  message: 'New password must be different from current password',
  path: ['new_password'],
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// ============================================
// INVITE MANAGEMENT SCHEMAS (PM-facing)
// ============================================

/**
 * Create invite schema (for property managers)
 */
export const createInviteSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant ID'),
  email: emailSchema,
  first_name: nameSchema.optional(),
  last_name: nameSchema.optional(),
  phone: phoneSchema.optional(),
  property_id: z.string().uuid('Invalid property ID').optional(),
  unit_id: z.string().uuid('Invalid unit ID').optional(),
  lease_id: z.string().uuid('Invalid lease ID').optional(),
  expiry_days: z.number().int().min(1).max(30).default(7),
});

export type CreateInviteFormValues = z.infer<typeof createInviteSchema>;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate password strength score (0-4)
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
} {
  const requirements = {
    minLength: password.length >= PASSWORD_REQUIREMENTS.MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
  };

  const score = Object.values(requirements).filter(Boolean).length;

  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 1) {
    strength = 'weak';
  } else if (score <= 2) {
    strength = 'fair';
  } else if (score <= 3) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return { score, strength, requirements };
}

/**
 * Get password validation errors
 */
export function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];

  if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
    errors.push(`At least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('At least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('At least one special character');
  }

  return errors;
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}
