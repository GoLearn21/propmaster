/**
 * TenantResetPasswordPage
 * Set new password after reset link
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Check, X, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { updatePassword } from '../../services/tenantAuthService';
import { calculatePasswordStrength } from '../../schemas/tenant-onboarding.schema';
import type { PasswordStrength } from '../../types/tenant-onboarding';

// ============================================
// CONSTANTS
// ============================================

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

export default function TenantResetPasswordPage() {
  // State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  // Password validation
  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);
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
    setConfirmTouched(true);
    setError(null);

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updatePassword(password);

      if (result.success) {
        setIsSuccess(true);
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // SUCCESS STATE
  // ============================================

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-lightest px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-status-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-black mb-2">
            Password Reset Successfully
          </h1>
          <p className="text-neutral-medium mb-6">
            Your password has been reset. You can now log in with your new password.
          </p>
          <Link
            to="/tenant/login"
            className="inline-flex items-center justify-center w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // FORM STATE
  // ============================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-lightest px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-neutral-black mb-2">
              Reset Password
            </h1>
            <p className="text-neutral-medium">
              Enter your new password below.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Password */}
            <div>
              <div className="relative">
                <Input
                  id="new-password"
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
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
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
