/**
 * Vendor Authentication Context
 * Provides global vendor authentication state across the vendor portal
 * With comprehensive logging and robust error handling
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Vendor,
  getCurrentVendor,
  loginVendor,
  logoutVendor,
  updateVendorProfile,
} from '../services/vendorAuthService';
import { vendorLogger } from '../services/portalLogger';
import { Session } from '@supabase/supabase-js';

/**
 * Context interface
 */
interface VendorAuthContextType {
  vendor: Vendor | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Vendor>) => Promise<{ success: boolean; error?: string }>;
  refreshVendor: () => Promise<void>;
  isAuthenticated: boolean;
  hasPortalAccess: boolean;
  isDemo: boolean;
}

/**
 * Create context
 */
const VendorAuthContext = createContext<VendorAuthContextType | undefined>(undefined);

/**
 * Check if demo session exists and is valid
 */
function getDemoSession(): { vendor: Vendor; isDemo: true } | null {
  try {
    const demoSession = localStorage.getItem('demo_vendor_session');
    if (demoSession) {
      const parsed = JSON.parse(demoSession);
      if (parsed.isDemo && parsed.vendor) {
        return { vendor: parsed.vendor, isDemo: true };
      }
    }
  } catch (err) {
    vendorLogger.warn('AUTH_DEMO_SESSION', 'Failed to parse demo session', { error: String(err) });
    localStorage.removeItem('demo_vendor_session');
  }
  return null;
}

/**
 * Provider component
 */
export function VendorAuthProvider({ children }: { children: React.ReactNode }) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);

  /**
   * Initialize auth state
   */
  useEffect(() => {
    mountedRef.current = true;

    async function initializeAuth() {
      // Prevent double initialization
      if (initializingRef.current) {
        vendorLogger.debug('AUTH_INIT', 'Initialization already in progress, skipping');
        return;
      }
      initializingRef.current = true;

      vendorLogger.info('AUTH_INIT', 'Initializing vendor auth context');
      vendorLogger.perf.measureStart('auth_init');

      try {
        // First check for demo session
        const demoData = getDemoSession();
        if (demoData) {
          vendorLogger.auth.sessionRestored(demoData.vendor.id);
          vendorLogger.info('AUTH_DEMO', 'Demo session restored', {
            vendorId: demoData.vendor.id,
            email: demoData.vendor.email
          });

          if (mountedRef.current) {
            setVendor(demoData.vendor);
            setSession({ user: { id: 'demo-user-002', email: demoData.vendor.email } } as any);
            setIsDemo(true);
            setLoading(false);
            setInitialized(true);
          }
          vendorLogger.perf.measureEnd('auth_init');
          return;
        }

        // Get current Supabase session
        vendorLogger.debug('AUTH_INIT', 'Checking Supabase session');
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          vendorLogger.error('AUTH_SESSION_ERROR', 'Failed to get session', sessionError);
        }

        if (!mountedRef.current) {
          vendorLogger.debug('AUTH_INIT', 'Component unmounted during init, aborting');
          return;
        }

        if (currentSession) {
          vendorLogger.debug('AUTH_INIT', 'Found existing Supabase session', {
            userId: currentSession.user.id
          });
          setSession(currentSession);

          // Get vendor profile
          const vendorProfile = await getCurrentVendor();
          if (mountedRef.current) {
            if (vendorProfile) {
              vendorLogger.auth.sessionRestored(vendorProfile.id);
              setVendor(vendorProfile);
            } else {
              vendorLogger.warn('AUTH_INIT', 'Session exists but no vendor profile found');
            }
          }
        } else {
          vendorLogger.debug('AUTH_INIT', 'No existing session found');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        vendorLogger.error('AUTH_INIT_ERROR', 'Failed to initialize authentication', error);
        if (mountedRef.current) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setInitialized(true);
        }
        vendorLogger.perf.measureEnd('auth_init');
      }
    }

    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        vendorLogger.debug('AUTH_STATE_CHANGE', `Auth state changed: ${event}`, { event });

        if (!mountedRef.current) return;

        // Check if demo session exists - if so, don't let Supabase override it
        const demoData = getDemoSession();
        if (demoData) {
          vendorLogger.debug('AUTH_STATE_CHANGE', 'Demo session active, ignoring Supabase event');
          return;
        }

        setSession(newSession);

        if (newSession) {
          vendorLogger.info('AUTH_STATE_CHANGE', 'User session updated', {
            event,
            userId: newSession.user.id
          });
          const vendorProfile = await getCurrentVendor();
          if (mountedRef.current) {
            setVendor(vendorProfile);
          }
        } else {
          vendorLogger.info('AUTH_STATE_CHANGE', 'User signed out');
          if (mountedRef.current) {
            setVendor(null);
            setIsDemo(false);
          }
        }
      }
    );

    // Cleanup
    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      vendorLogger.debug('AUTH_CLEANUP', 'Auth context cleanup');
    };
  }, []);

  /**
   * Login handler
   */
  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    vendorLogger.auth.loginAttempt(email);
    vendorLogger.perf.measureStart('login');

    try {
      setError(null);
      setLoading(true);

      const result = await loginVendor(email, password, rememberMe);

      if (result.success) {
        const vendorData = result.user as Vendor;
        vendorLogger.auth.loginSuccess(vendorData?.id || 'unknown', email);
        setVendor(vendorData || null);
        setSession(result.session || null);
        setIsDemo(email === 'demo@vendor.com');
      } else {
        vendorLogger.auth.loginFailure(email, result.error || 'Unknown error');
        setError(result.error || 'Login failed');
      }

      vendorLogger.perf.measureEnd('login');
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      vendorLogger.auth.loginFailure(email, 'Unexpected error', error);
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      vendorLogger.perf.measureEnd('login');
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout handler
   */
  const logout = useCallback(async (): Promise<void> => {
    vendorLogger.auth.logout(vendor?.id);
    vendorLogger.perf.measureStart('logout');

    try {
      setLoading(true);
      await logoutVendor();
      setVendor(null);
      setSession(null);
      setIsDemo(false);
      setError(null);
      vendorLogger.info('AUTH_LOGOUT', 'Logout completed successfully');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      vendorLogger.error('AUTH_LOGOUT_ERROR', 'Logout failed', error);
      setError('Failed to logout');
    } finally {
      setLoading(false);
      vendorLogger.perf.measureEnd('logout');
    }
  }, [vendor?.id]);

  /**
   * Update profile handler
   */
  const updateProfile = useCallback(async (
    updates: Partial<Vendor>
  ): Promise<{ success: boolean; error?: string }> => {
    vendorLogger.data.mutationStart('update', 'vendor_profile');

    try {
      setError(null);

      // For demo users, update the local state only
      if (isDemo) {
        vendorLogger.info('PROFILE_UPDATE', 'Demo profile update (local only)', { updates });
        const updatedVendor = { ...vendor, ...updates } as Vendor;
        setVendor(updatedVendor);

        // Update demo session in localStorage
        const demoSession = localStorage.getItem('demo_vendor_session');
        if (demoSession) {
          const parsed = JSON.parse(demoSession);
          parsed.vendor = updatedVendor;
          localStorage.setItem('demo_vendor_session', JSON.stringify(parsed));
        }

        vendorLogger.data.mutationSuccess('update', 'vendor_profile');
        return { success: true };
      }

      const result = await updateVendorProfile(updates);

      if (result.success && result.user) {
        vendorLogger.data.mutationSuccess('update', 'vendor_profile', vendor?.id);
        setVendor(result.user as Vendor);
      } else {
        vendorLogger.data.mutationError('update', 'vendor_profile', new Error(result.error || 'Unknown error'));
        setError(result.error || 'Profile update failed');
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      vendorLogger.data.mutationError('update', 'vendor_profile', error);
      const errorMessage = 'Failed to update profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [vendor, isDemo]);

  /**
   * Refresh vendor data
   */
  const refreshVendor = useCallback(async (): Promise<void> => {
    vendorLogger.data.fetchStart('vendor_profile');

    try {
      // For demo users, just log
      if (isDemo) {
        vendorLogger.debug('REFRESH', 'Demo vendor refresh (no-op)');
        return;
      }

      const vendorProfile = await getCurrentVendor();
      setVendor(vendorProfile);
      vendorLogger.data.fetchSuccess('vendor_profile');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      vendorLogger.data.fetchError('vendor_profile', error);
      setError('Failed to refresh vendor data');
    }
  }, [isDemo]);

  /**
   * Computed values
   */
  const isAuthenticated = !!session && !!vendor;
  const hasPortalAccess = !!vendor?.portal_access && vendor?.status === 'active';

  /**
   * Context value
   */
  const value: VendorAuthContextType = {
    vendor,
    session,
    loading,
    error,
    initialized,
    login,
    logout,
    updateProfile,
    refreshVendor,
    isAuthenticated,
    hasPortalAccess,
    isDemo,
  };

  return <VendorAuthContext.Provider value={value}>{children}</VendorAuthContext.Provider>;
}

/**
 * Default context value for when context is not available
 * This prevents "cannot read properties of undefined" errors
 */
const defaultContextValue: VendorAuthContextType = {
  vendor: null,
  session: null,
  loading: true,
  error: null,
  initialized: false,
  login: async () => ({ success: false, error: 'Context not initialized' }),
  logout: async () => {},
  updateProfile: async () => ({ success: false, error: 'Context not initialized' }),
  refreshVendor: async () => {},
  isAuthenticated: false,
  hasPortalAccess: false,
  isDemo: false,
};

/**
 * Hook to use vendor auth context
 */
export function useVendorAuth(): VendorAuthContextType {
  const context = useContext(VendorAuthContext);

  if (context === undefined) {
    console.error('useVendorAuth must be used within a VendorAuthProvider');
    // Return a safe default instead of throwing to prevent crashes
    return defaultContextValue;
  }

  return context;
}

/**
 * Hook to require authenticated vendor
 * Returns auth context and handles redirects via React Router
 * IMPORTANT: Must be used within a Router context
 */
export function useRequireVendorAuth(): VendorAuthContextType {
  const context = useVendorAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedRef = useRef(false);
  const pathname = location?.pathname || '/vendor/dashboard';

  useEffect(() => {
    // Wait for initialization to complete
    if (!context.initialized || context.loading) {
      return;
    }

    // Prevent double redirects
    if (redirectedRef.current) {
      return;
    }

    if (!context.isAuthenticated) {
      vendorLogger.auth.unauthorized(pathname);
      vendorLogger.nav.redirect(pathname, '/vendor/login', 'Not authenticated');
      redirectedRef.current = true;
      navigate('/vendor/login', { replace: true, state: { from: pathname } });
      return;
    }

    if (!context.hasPortalAccess) {
      vendorLogger.nav.redirect(pathname, '/vendor/access-denied', 'No portal access');
      redirectedRef.current = true;
      navigate('/vendor/access-denied', { replace: true });
      return;
    }

    // Log successful page access
    vendorLogger.nav.pageView(pathname);
  }, [context.initialized, context.loading, context.isAuthenticated, context.hasPortalAccess, navigate, pathname]);

  return context;
}

/**
 * Hook for pages that should redirect away if already authenticated
 * (e.g., login page)
 */
export function useRedirectIfAuthenticated(redirectTo: string = '/vendor/dashboard'): VendorAuthContextType {
  const context = useVendorAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedRef = useRef(false);
  const currentPath = location?.pathname || '/vendor/login';

  useEffect(() => {
    // Wait for initialization
    if (!context.initialized || context.loading) {
      return;
    }

    // Prevent double redirects
    if (redirectedRef.current) {
      return;
    }

    if (context.isAuthenticated && context.hasPortalAccess) {
      vendorLogger.nav.redirect(currentPath, redirectTo, 'Already authenticated');
      redirectedRef.current = true;
      navigate(redirectTo, { replace: true });
    }
  }, [context.initialized, context.loading, context.isAuthenticated, context.hasPortalAccess, navigate, redirectTo, currentPath]);

  return context;
}
