/**
 * Owner Login Page
 * Entry point for owner portal authentication
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOwnerAuth } from '../contexts/OwnerAuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Building2, Eye, EyeOff, AlertCircle, UserPlus } from 'lucide-react';

export default function OwnerLoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useOwnerAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    const result = await login(email, password, rememberMe);

    if (result.success) {
      navigate('/owner/dashboard');
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 bg-emerald-600 rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">PropMaster</h1>
          <p className="text-gray-600 dark:text-neutral-300 mt-2">Owner Portal</p>
        </div>

        <Card className="p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome Back</h2>
            <p className="text-gray-600 dark:text-neutral-300 mt-1">Access your property portfolio</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-700 dark:text-white"
                placeholder="your.email@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-700 dark:text-white"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300 dark:border-neutral-600"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-700 dark:text-neutral-300">
                  Remember me
                </label>
              </div>
              <Link
                to="/owner/forgot-password"
                className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Sign Up Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-neutral-700">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-neutral-300 mb-3">
                Don't have an account?
              </p>
              <Link to="/owner/signup">
                <Button variant="outline" className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up / Request Access
                </Button>
              </Link>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-neutral-400">
              Need help?{' '}
              <a
                href="mailto:support@propmaster.com"
                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium"
              >
                Contact Support
              </a>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600 dark:text-neutral-400">
          <p>© 2024 PropMaster. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="/privacy" className="hover:text-gray-900 dark:hover:text-white">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="/terms" className="hover:text-gray-900 dark:hover:text-white">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
