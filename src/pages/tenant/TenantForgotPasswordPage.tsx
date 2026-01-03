/**
 * TenantForgotPasswordPage
 * Request password reset email
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { resetPassword } from '../../services/tenantAuthService';

// ============================================
// CONSTANTS
// ============================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================
// COMPONENT
// ============================================

export default function TenantForgotPasswordPage() {
  // State
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ============================================
  // HANDLERS
  // ============================================

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPassword(email);

      if (result.success) {
        setIsSuccess(true);
      } else {
        setError(result.error || 'Failed to send reset email');
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
            Check Your Email
          </h1>
          <p className="text-neutral-medium mb-6">
            We've sent a password reset link to <strong>{email}</strong>.
            Please check your inbox and follow the instructions to reset your password.
          </p>
          <p className="text-sm text-neutral-medium mb-6">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <Link
            to="/tenant/login"
            className="inline-flex items-center text-primary hover:text-primary-dark font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  // ============================================
  // FORM STATE
  // ============================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-lightest px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-neutral-black mb-2">
              Forgot Password
            </h1>
            <p className="text-neutral-medium">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Email */}
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="tenant@example.com"
              error={error || undefined}
              aria-describedby={error ? 'email-error' : undefined}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/tenant/login"
              className="inline-flex items-center text-primary hover:text-primary-dark font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
