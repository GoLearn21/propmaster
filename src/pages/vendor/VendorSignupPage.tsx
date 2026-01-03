/**
 * VendorSignupPage
 * Invite-based and self-registration for service vendors
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Check, X, AlertCircle, Loader2, Wrench, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { validateInviteCode, submitRegistrationRequest, SERVICE_CATEGORIES } from '../../services/vendor/vendorInviteService';
import { supabase } from '../../lib/supabase';
import { calculatePasswordStrength, getPasswordErrors } from '../../schemas/tenant-onboarding.schema';
import type { PasswordStrength } from '../../types/tenant-onboarding';

// ============================================
// CONSTANTS
// ============================================

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: 'This invite link is invalid. Please check the link or contact the property manager.',
  EXPIRED: 'This invite has expired. Please contact the property manager for a new invite.',
  ALREADY_USED: 'This invite has already been used. If you already have an account, please log in.',
  REVOKED: 'This invite has been revoked. Please contact the property manager.',
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

export default function VendorSignupPage() {
  const { inviteCode } = useParams<{ inviteCode?: string }>();
  const navigate = useNavigate();

  // Mode: invite-based or self-registration
  const [mode, setMode] = useState<'invite' | 'register'>(inviteCode ? 'invite' : 'register');

  // Validate invite code if provided
  const {
    data: invite,
    isLoading: isValidating,
    isError: hasInviteError,
  } = useQuery({
    queryKey: ['vendor-invite', inviteCode],
    queryFn: () => validateInviteCode(inviteCode!),
    enabled: !!inviteCode && mode === 'invite',
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Invite signup form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  // Self-registration form state
  const [regForm, setRegForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    company_name: '',
    service_categories: [] as string[],
    license_number: '',
    insurance_info: '',
    website_url: '',
    years_in_business: '',
    additional_info: '',
  });
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Password validation
  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);
  const passwordErrors = useMemo(() => getPasswordErrors(password), [password]);
  const passwordsMatch = password === confirmPassword;

  const requirementsMet = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.check(password),
  }));

  const isFormValid = useMemo(() => {
    return (
      passwordStrength.score >= 3 &&
      passwordsMatch &&
      confirmPassword.length > 0
    );
  }, [passwordStrength, passwordsMatch, confirmPassword]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordTouched(true);
    setConfirmTouched(true);

    if (!isFormValid || !invite || !inviteCode) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invite.email!,
        password,
        options: {
          data: {
            first_name: invite.first_name || '',
            last_name: invite.last_name || '',
            user_type: 'vendor',
          },
        },
      });

      if (authError) {
        setSubmitError(authError.message);
        return;
      }

      if (!authData.user) {
        setSubmitError('Failed to create user account');
        return;
      }

      // Update vendor record with user_id
      const { error: vendorError } = await supabase
        .from('vendors')
        .update({
          user_id: authData.user.id,
          portal_access: true,
          first_name: invite.first_name,
          last_name: invite.last_name,
        })
        .eq('id', invite.vendor_id);

      if (vendorError) {
        console.error('Failed to link vendor:', vendorError);
      }

      // Mark invite as used
      await supabase
        .from('vendor_invites')
        .update({ used_at: new Date().toISOString(), status: 'accepted' })
        .eq('invite_code', inviteCode);

      navigate('/vendor/dashboard');
    } catch (error) {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSubmitting(true);
    setRegError(null);

    if (regForm.service_categories.length === 0) {
      setRegError('Please select at least one service category');
      setRegSubmitting(false);
      return;
    }

    try {
      const result = await submitRegistrationRequest({
        ...regForm,
        years_in_business: regForm.years_in_business ? parseInt(regForm.years_in_business) : undefined,
      });

      if (result.success) {
        setRegSuccess(true);
      } else {
        setRegError(result.error || 'Failed to submit registration request');
      }
    } catch (error) {
      setRegError('An unexpected error occurred. Please try again.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const toggleServiceCategory = (category: string) => {
    setRegForm((prev) => ({
      ...prev,
      service_categories: prev.service_categories.includes(category)
        ? prev.service_categories.filter((c) => c !== category)
        : [...prev.service_categories, category],
    }));
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (mode === 'invite' && isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-neutral-300">Validating your invite...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE - INVALID INVITE
  // ============================================

  if (mode === 'invite' && inviteCode && (hasInviteError || !invite?.valid)) {
    const errorCode = invite?.error_code;
    const errorMessage = errorCode
      ? ERROR_MESSAGES[errorCode] || 'This invite link is invalid.'
      : 'Failed to validate invite. Please try again.';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {errorCode === 'EXPIRED' ? 'Invite Expired' :
             errorCode === 'ALREADY_USED' ? 'Invite Already Used' :
             'Invalid Invite'}
          </h1>
          <p className="text-gray-600 dark:text-neutral-300 mb-6">{errorMessage}</p>
          <div className="space-y-3">
            <Button onClick={() => setMode('register')} className="w-full">
              Request Access Instead
            </Button>
            <Link
              to="/vendor/login"
              className="block text-blue-600 hover:text-blue-700 font-medium"
            >
              Already have an account? Login here
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ============================================
  // REGISTRATION SUCCESS
  // ============================================

  if (regSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Request Submitted!
          </h1>
          <p className="text-gray-600 dark:text-neutral-300 mb-6">
            Your registration request has been submitted. A property manager will review your request and you'll receive an email once approved.
          </p>
          <Link to="/vendor/login">
            <Button className="w-full">Return to Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // ============================================
  // MAIN FORM
  // ============================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Wrench className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">PropMaster</h1>
          <p className="text-gray-600 dark:text-neutral-300 mt-2">Vendor Portal</p>
        </div>

        <Card className="p-8">
          {/* Mode Toggle (only show if no invite code) */}
          {!inviteCode && (
            <div className="flex mb-6 bg-gray-100 dark:bg-neutral-700 rounded-lg p-1">
              <button
                onClick={() => setMode('invite')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === 'invite'
                    ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow'
                    : 'text-gray-600 dark:text-neutral-300'
                }`}
              >
                Have an Invite?
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mode === 'register'
                    ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow'
                    : 'text-gray-600 dark:text-neutral-300'
                }`}
              >
                Request Access
              </button>
            </div>
          )}

          {/* Invite-Based Signup Form */}
          {mode === 'invite' && invite?.valid && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Welcome, {invite.first_name || invite.company_name || 'Vendor'}!
                </h2>
                <p className="text-gray-600 dark:text-neutral-300 mt-1">
                  Create your account to access job assignments
                </p>
              </div>

              <form onSubmit={handleInviteSubmit} className="space-y-6">
                <Input
                  label="Email"
                  type="email"
                  value={invite.email || ''}
                  readOnly
                  className="bg-gray-50 dark:bg-neutral-700 cursor-not-allowed"
                />

                <div>
                  <div className="relative">
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[34px] text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-neutral-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${STRENGTH_COLORS[passwordStrength.strength]}`}
                            style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-neutral-200">
                          {STRENGTH_LABELS[passwordStrength.strength]}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 space-y-1">
                    {requirementsMet.map((req) => (
                      <div
                        key={req.id}
                        className={`flex items-center gap-2 text-sm ${
                          req.met ? 'text-blue-600' : 'text-gray-500 dark:text-neutral-400'
                        }`}
                      >
                        {req.met ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {req.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <Input
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
                    className="absolute right-3 top-[34px] text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {submitError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {submitError}
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={!isFormValid || isSubmitting}>
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </>
          )}

          {/* Self-Registration Form */}
          {mode === 'register' && (
            <>
              <div className="text-center mb-6">
                <UserPlus className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Become a Vendor
                </h2>
                <p className="text-gray-600 dark:text-neutral-300 mt-1">
                  Submit your business information for approval
                </p>
              </div>

              <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={regForm.first_name}
                    onChange={(e) => setRegForm({ ...regForm, first_name: e.target.value })}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={regForm.last_name}
                    onChange={(e) => setRegForm({ ...regForm, last_name: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="Email"
                  type="email"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  required
                />

                <Input
                  label="Phone"
                  type="tel"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                />

                <Input
                  label="Company Name"
                  value={regForm.company_name}
                  onChange={(e) => setRegForm({ ...regForm, company_name: e.target.value })}
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    Services Offered *
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 dark:border-neutral-600 rounded-md">
                    {SERVICE_CATEGORIES.map((category) => (
                      <label
                        key={category}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          regForm.service_categories.includes(category)
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-gray-100 dark:hover:bg-neutral-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={regForm.service_categories.includes(category)}
                          onChange={() => toggleServiceCategory(category)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm">{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="License Number"
                    value={regForm.license_number}
                    onChange={(e) => setRegForm({ ...regForm, license_number: e.target.value })}
                    placeholder="Optional"
                  />
                  <Input
                    label="Years in Business"
                    type="number"
                    value={regForm.years_in_business}
                    onChange={(e) => setRegForm({ ...regForm, years_in_business: e.target.value })}
                    placeholder="Optional"
                  />
                </div>

                <Input
                  label="Website URL"
                  type="url"
                  value={regForm.website_url}
                  onChange={(e) => setRegForm({ ...regForm, website_url: e.target.value })}
                  placeholder="https://..."
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">
                    Insurance Information
                  </label>
                  <textarea
                    value={regForm.insurance_info}
                    onChange={(e) => setRegForm({ ...regForm, insurance_info: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:text-white"
                    rows={2}
                    placeholder="Insurance carrier and policy info..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">
                    Additional Information
                  </label>
                  <textarea
                    value={regForm.additional_info}
                    onChange={(e) => setRegForm({ ...regForm, additional_info: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:text-white"
                    rows={2}
                    placeholder="Any additional information about your services..."
                  />
                </div>

                {regError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {regError}
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={regSubmitting}>
                  {regSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </form>
            </>
          )}

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-neutral-300 text-sm">
              Already have an account?{' '}
              <Link to="/vendor/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Login here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
