/**
 * TenantSignupPage
 * Invite-based tenant registration
 * Based on market research: Rentvine, DoorLoop, COHO
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useInviteValidation } from '../../hooks/useInviteValidation';
import { signupTenant } from '../../services/tenantAuthService';
import { calculatePasswordStrength, getPasswordErrors } from '../../schemas/tenant-onboarding.schema';
import type { PasswordStrength } from '../../types/tenant-onboarding';

// ============================================
// CONSTANTS
// ============================================

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: 'This invite link is invalid. Please check the link or contact your property manager.',
  EXPIRED: 'This invite has expired. Please contact your property manager for a new invite.',
  ALREADY_USED: 'This invite has already been used. If you already have an account, please log in.',
  REVOKED: 'This invite has been revoked. Please contact your property manager.',
};

const PASSWORD_REQUIREMENTS = [
  { id: 'minLength', label: '8 characters minimum', check: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', check: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', check: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', check: (p: string) => /\d/.test(p) },
  { id: 'specialChar', label: 'One special character', check: (p: string) => /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(p) },
];

const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  weak: 'bg-red-500',
  fair: 'bg-orange-500',
  good: 'bg-yellow-500',
  strong: 'bg-green-500',
};

const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

// ============================================
// COMPONENT
// ============================================

export default function TenantSignupPage() {
  const { inviteCode } = useParams<{ inviteCode?: string }>();
  const navigate = useNavigate();

  // Validate invite code
  const {
    isValidating,
    isValid,
    hasError,
    errorCode,
    invite,
  } = useInviteValidation({ inviteCode });

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  // Password validation
  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);
  const passwordErrors = useMemo(() => getPasswordErrors(password), [password]);
  const passwordsMatch = password === confirmPassword;

  // Check all requirements
  const requirementsMet = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.check(password),
  }));

  // Form validation
  const isFormValid = useMemo(() => {
    return (
      passwordStrength.score >= 3 && // At least 'good' strength
      passwordsMatch &&
      confirmPassword.length > 0
    );
  }, [passwordStrength, passwordsMatch, confirmPassword]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordTouched(true);
    setConfirmTouched(true);

    if (!isFormValid || !invite || !inviteCode) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await signupTenant(
        invite.email!,
        password,
        invite.first_name || '',
        invite.last_name || '',
        inviteCode
      );

      if (result.success) {
        navigate('/tenant/onboarding');
      } else {
        setSubmitError(result.error || 'Failed to create account. Please try again.');
      }
    } catch (error) {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-lightest">
        <div data-testid="loading-state" className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-neutral-dark">Validating your invite...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE - NO INVITE CODE
  // ============================================

  if (!inviteCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-lightest px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-status-error mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-black mb-2">
            Invite Code Required
          </h1>
          <p className="text-neutral-medium mb-6">
            An invite code is required to create a tenant account. Please use the link provided in your invitation email.
          </p>
          <Link
            to="/tenant/login"
            className="text-primary hover:text-primary-dark font-medium"
          >
            Already have an account? Login here
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE - INVALID INVITE
  // ============================================

  if (hasError || !isValid) {
    const errorMessage = errorCode
      ? ERROR_MESSAGES[errorCode] || 'This invite link is invalid.'
      : 'Failed to validate invite. Please try again.';

    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-lightest px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-status-error mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-black mb-2">
            {errorCode === 'EXPIRED' ? 'Invite Expired' :
             errorCode === 'ALREADY_USED' ? 'Invite Already Used' :
             'Invalid Invite'}
          </h1>
          <p className="text-neutral-medium mb-6">{errorMessage}</p>
          <Link
            to="/tenant/login"
            className="text-primary hover:text-primary-dark font-medium"
          >
            Already have an account? Login here
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // SIGNUP FORM
  // ============================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-lightest px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-black mb-2">
              Welcome, {invite?.first_name || 'Tenant'}!
            </h1>
            <p className="text-neutral-medium">
              Create your account to access your tenant portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (readonly) */}
            <Input
              label="Email"
              type="email"
              value={invite?.email || ''}
              readOnly
              className="bg-neutral-lighter cursor-not-allowed"
            />

            {/* Password */}
            <div>
              <div className="relative">
                <Input
                  id="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  placeholder="Create a strong password"
                  aria-describedby="password-requirements password-strength"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-neutral-medium hover:text-neutral-dark"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-2" data-testid="password-strength" id="password-strength">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-neutral-lighter rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${STRENGTH_COLORS[passwordStrength.strength]}`}
                        style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-neutral-dark">
                      {STRENGTH_LABELS[passwordStrength.strength]}
                    </span>
                  </div>
                </div>
              )}

              {/* Password Requirements */}
              <div id="password-requirements" className="mt-3 space-y-1">
                {requirementsMet.map((req) => (
                  <div
                    key={req.id}
                    className={`flex items-center gap-2 text-sm ${
                      req.met ? 'text-status-success' : 'text-neutral-medium'
                    }`}
                  >
                    {req.met ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <div className="relative">
                <Input
                  id="confirm-password"
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setConfirmTouched(true)}
                  placeholder="Confirm your password"
                  error={confirmTouched && !passwordsMatch && confirmPassword.length > 0 ? 'Passwords do not match' : undefined}
                  aria-describedby={confirmTouched && !passwordsMatch ? 'confirm-password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-[34px] text-neutral-medium hover:text-neutral-dark"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {submitError}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={!isFormValid || isSubmitting}
              loading={isSubmitting}
            >
              Create Account
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-neutral-medium text-sm">
              Already have an account?{' '}
              <Link
                to="/tenant/login"
                className="text-primary hover:text-primary-dark font-medium"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
