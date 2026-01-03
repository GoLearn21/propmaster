/**
 * Phase 3: Tenant Login Page
 * Authentication interface for tenant portal access
 * With comprehensive logging and robust error handling
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Checkbox } from '../components/ui/Checkbox';
import { Card } from '../components/ui/Card';
import { useRedirectIfAuthenticated } from '../contexts/TenantAuthContext';
import { tenantLogger } from '../services/portalLogger';
import toast from 'react-hot-toast';

/**
 * Tenant Login Page Component
 */
export default function TenantLoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loading: authLoading, initialized } = useRedirectIfAuthenticated('/tenant/dashboard');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Log component mount
  useEffect(() => {
    tenantLogger.ui.componentMounted('TenantLoginPage');
    tenantLogger.nav.pageView('/tenant/login');
    return () => {
      tenantLogger.debug('UI_UNMOUNT', 'TenantLoginPage unmounted');
    };
  }, []);

  /**
   * Handle login form submission
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    tenantLogger.ui.userAction('submit', 'login_form', { email });

    try {
      // Validate inputs
      if (!email || !password) {
        setError('Please enter both email and password');
        setIsSubmitting(false);
        return;
      }

      // Attempt login
      const result = await login(email, password, rememberMe);

      if (result.success) {
        tenantLogger.info('LOGIN_SUCCESS', 'Navigating to dashboard');
        toast.success('Welcome back!');

        // Redirect based on onboarding status
        if (result.requires_onboarding) {
          navigate('/tenant/onboarding', { replace: true });
        } else {
          navigate('/tenant/dashboard', { replace: true });
        }
      } else {
        setError(result.error || 'Login failed');
        toast.error(result.error || 'Login failed');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      tenantLogger.error('LOGIN_ERROR', 'Unexpected login error', error);
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle Google OAuth login
   */
  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);

    tenantLogger.ui.userAction('click', 'google_login_button');

    try {
      const result = await loginWithGoogle();

      if (!result.success) {
        setError(result.error || 'Google sign-in failed');
        toast.error(result.error || 'Google sign-in failed');
      }
      // If successful, the page will redirect via OAuth flow
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      tenantLogger.error('GOOGLE_LOGIN_ERROR', 'Google login error', error);
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setGoogleLoading(false);
    }
  };

  /**
   * Show loading while checking auth state
   */
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-3" />
          <p className="text-neutral-dark dark:text-neutral-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 px-4">
      <Card className="w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-darkest dark:text-white mb-2">
            Tenant Portal
          </h1>
          <p className="text-neutral-dark dark:text-neutral-300">
            Welcome back! Sign in to access your account.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-dark dark:text-neutral-200 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-neutral dark:text-neutral-400" />
              </div>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10"
                required
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-dark dark:text-neutral-200 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-neutral dark:text-neutral-400" />
              </div>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-10 pr-10"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-neutral dark:text-neutral-400" />
                ) : (
                  <Eye className="h-5 w-5 text-neutral dark:text-neutral-400" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="ml-2 text-sm text-neutral-dark dark:text-neutral-300">Remember me</span>
            </label>

            <Link
              to="/tenant/forgot-password"
              className="text-sm text-primary hover:text-primary-dark transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isSubmitting || googleLoading || authLoading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-light dark:border-neutral-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-neutral-800 text-neutral dark:text-neutral-400">Or continue with</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full flex items-center justify-center gap-3"
          onClick={handleGoogleLogin}
          disabled={isSubmitting || googleLoading || authLoading}
        >
          {googleLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </>
          )}
        </Button>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-neutral-light dark:border-neutral-700 text-center text-sm text-neutral-dark dark:text-neutral-300">
          <p>
            New tenant?{' '}
            <Link
              to="/tenant/signup"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              Create an account
            </Link>
          </p>
          <p className="mt-4">
            Need help?{' '}
            <Link
              to="/tenant/support"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              Contact support
            </Link>
          </p>
        </div>

        {/* Demo Credentials (Development Only) */}
        {import.meta.env.DEV && (
          <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg text-sm">
            <p className="font-medium text-warning-dark dark:text-yellow-200 mb-2">Demo Credentials:</p>
            <p className="text-neutral-dark dark:text-neutral-300">Email: demo@tenant.com</p>
            <p className="text-neutral-dark dark:text-neutral-300">Password: Demo123!</p>
          </div>
        )}
      </Card>
    </div>
  );
}
