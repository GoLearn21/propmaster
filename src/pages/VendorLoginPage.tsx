/**
 * Vendor Login Page
 * Simple, reliable login page for vendor portal
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { vendorLogger } from '../services/portalLogger';
import { Wrench, Eye, EyeOff, AlertCircle, UserPlus, Loader2 } from 'lucide-react';

export default function VendorLoginPage() {
  const navigate = useNavigate();
  const auth = useVendorAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Log component mount
  useEffect(() => {
    vendorLogger.ui.componentMounted('VendorLoginPage');
    vendorLogger.nav.pageView('/vendor/login');
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (auth.initialized && !auth.loading && auth.isAuthenticated && auth.hasPortalAccess) {
      vendorLogger.nav.redirect('/vendor/login', '/vendor/dashboard', 'Already authenticated');
      navigate('/vendor/dashboard', { replace: true });
    }
  }, [auth.initialized, auth.loading, auth.isAuthenticated, auth.hasPortalAccess, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    vendorLogger.ui.userAction('submit', 'login_form', { email });

    if (!email || !password) {
      setError('Please enter both email and password');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await auth.login(email, password, rememberMe);

      if (result.success) {
        vendorLogger.info('LOGIN_SUCCESS', 'Navigating to dashboard');
        navigate('/vendor/dashboard', { replace: true });
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      vendorLogger.error('LOGIN_ERROR', 'Unexpected login error', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth state
  if (!auth.initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Wrench className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">PropMaster</h1>
          <p className="text-gray-600 mt-2">Vendor Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Welcome Back</h2>
            <p className="text-gray-600 mt-1">Sign in to access your assigned jobs</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your.email@example.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <Link
                to="/vendor/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || auth.loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                Want to become a vendor?
              </p>
              <Link
                to="/vendor/signup"
                className="inline-flex items-center justify-center w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Sign Up / Request Access
              </Link>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <a
                href="mailto:support@propmaster.com"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>

        {/* Demo Credentials (Development Only) */}
        {import.meta.env.DEV && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <p className="font-medium text-yellow-800 mb-2">Demo Credentials:</p>
            <p className="text-gray-700">Email: demo@vendor.com</p>
            <p className="text-gray-700">Password: Demo123!</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>© 2024 PropMaster. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="/privacy" className="hover:text-gray-900">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="/terms" className="hover:text-gray-900">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
