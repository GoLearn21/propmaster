/**
 * Phase 3: Tenant Authentication Context
 * Provides global tenant authentication state across the tenant portal
 * With comprehensive logging and robust error handling
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Tenant,
  getCurrentTenant,
  loginTenant,
  logoutTenant,
  updateTenantProfile,
  signInWithGoogle,
  handleOAuthCallback,
  CommunicationPreferences,
} from '../services/tenantAuthService';
import { tenantLogger } from '../services/portalLogger';
import { Session } from '@supabase/supabase-js';

/**
 * Context interface
 */
interface TenantAuthContextType {
  tenant: Tenant | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string; requires_onboarding?: boolean }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Tenant>) => Promise<{ success: boolean; error?: string }>;
  refreshTenant: () => Promise<void>;
  isAuthenticated: boolean;
  hasPortalAccess: boolean;
  isDemo: boolean;
}

/**
 * Create context
 */
const TenantAuthContext = createContext<TenantAuthContextType | undefined>(undefined);

/**
 * Check if demo session exists and is valid
 */
function getDemoSession(): { tenant: Tenant; isDemo: true } | null {
  try {
    const demoSession = localStorage.getItem('demo_tenant_session');
    if (demoSession) {
      const parsed = JSON.parse(demoSession);
      if (parsed.isDemo && parsed.tenant) {
        return { tenant: parsed.tenant, isDemo: true };
      }
    }
  } catch (err) {
    tenantLogger.warn('AUTH_DEMO_SESSION', 'Failed to parse demo session', { error: String(err) });
    localStorage.removeItem('demo_tenant_session');
  }
  return null;
}

/**
 * Provider component
 */
export function TenantAuthProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
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
        tenantLogger.debug('AUTH_INIT', 'Initialization already in progress, skipping');
        return;
      }
      initializingRef.current = true;

      tenantLogger.info('AUTH_INIT', 'Initializing tenant auth context');
      tenantLogger.perf.measureStart('auth_init');

      try {
        // First check for demo session
        const demoData = getDemoSession();
        if (demoData) {
          tenantLogger.auth.sessionRestored(demoData.tenant.id);
          tenantLogger.info('AUTH_DEMO', 'Demo session restored', {
            tenantId: demoData.tenant.id,
            email: demoData.tenant.email
          });

          if (mountedRef.current) {
            setTenant(demoData.tenant);
            setSession({ user: { id: 'demo-user-001', email: demoData.tenant.email } } as any);
            setIsDemo(true);
            setLoading(false);
            setInitialized(true);
          }
          tenantLogger.perf.measureEnd('auth_init');
          return;
        }

        // Get current Supabase session
        tenantLogger.debug('AUTH_INIT', 'Checking Supabase session');
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          tenantLogger.error('AUTH_SESSION_ERROR', 'Failed to get session', sessionError);
        }

        if (!mountedRef.current) {
          tenantLogger.debug('AUTH_INIT', 'Component unmounted during init, aborting');
          return;
        }

        if (currentSession) {
          tenantLogger.debug('AUTH_INIT', 'Found existing Supabase session', {
            userId: currentSession.user.id
          });
          setSession(currentSession);

          // Get tenant profile
          const tenantProfile = await getCurrentTenant();
          if (mountedRef.current) {
            if (tenantProfile) {
              tenantLogger.auth.sessionRestored(tenantProfile.id);
              setTenant(tenantProfile);
            } else {
              tenantLogger.warn('AUTH_INIT', 'Session exists but no tenant profile found');
            }
          }
        } else {
          tenantLogger.debug('AUTH_INIT', 'No existing session found');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        tenantLogger.error('AUTH_INIT_ERROR', 'Failed to initialize authentication', error);
        if (mountedRef.current) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setInitialized(true);
        }
        tenantLogger.perf.measureEnd('auth_init');
      }
    }

    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        tenantLogger.debug('AUTH_STATE_CHANGE', `Auth state changed: ${event}`, { event });

        if (!mountedRef.current) return;

        // Check if demo session exists - if so, don't let Supabase override it
        const demoData = getDemoSession();
        if (demoData) {
          tenantLogger.debug('AUTH_STATE_CHANGE', 'Demo session active, ignoring Supabase event');
          return;
        }

        setSession(newSession);

        if (newSession) {
          tenantLogger.info('AUTH_STATE_CHANGE', 'User session updated', {
            event,
            userId: newSession.user.id
          });
          const tenantProfile = await getCurrentTenant();
          if (mountedRef.current) {
            setTenant(tenantProfile);
          }
        } else {
          tenantLogger.info('AUTH_STATE_CHANGE', 'User signed out');
          if (mountedRef.current) {
            setTenant(null);
            setIsDemo(false);
          }
        }
      }
    );

    // Cleanup
    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      tenantLogger.debug('AUTH_CLEANUP', 'Auth context cleanup');
    };
  }, []);

  /**
   * Login handler
   */
  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string; requires_onboarding?: boolean }> => {
    tenantLogger.auth.loginAttempt(email);
    tenantLogger.perf.measureStart('login');

    try {
      setError(null);
      setLoading(true);

      const result = await loginTenant(email, password, rememberMe);

      if (result.success) {
        tenantLogger.auth.loginSuccess(result.tenant?.id || 'unknown', email);
        setTenant(result.tenant || null);
        setSession(result.session || null);
        setIsDemo(email === 'demo@tenant.com');
      } else {
        tenantLogger.auth.loginFailure(email, result.error || 'Unknown error');
        setError(result.error || 'Login failed');
      }

      tenantLogger.perf.measureEnd('login');
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      tenantLogger.auth.loginFailure(email, 'Unexpected error', error);
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      tenantLogger.perf.measureEnd('login');
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Google OAuth login handler
   */
  const loginWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    tenantLogger.info('AUTH_GOOGLE', 'Initiating Google OAuth login');

    try {
      setError(null);
      setLoading(true);

      const result = await signInWithGoogle();

      if (!result.success) {
        tenantLogger.auth.loginFailure('google-oauth', result.error || 'Google sign-in failed');
        setError(result.error || 'Google sign-in failed');
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      tenantLogger.auth.loginFailure('google-oauth', 'Unexpected error', error);
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Logout handler
   */
  const logout = useCallback(async (): Promise<void> => {
    tenantLogger.auth.logout(tenant?.id);
    tenantLogger.perf.measureStart('logout');

    try {
      setLoading(true);
      await logoutTenant();
      setTenant(null);
      setSession(null);
      setIsDemo(false);
      setError(null);
      tenantLogger.info('AUTH_LOGOUT', 'Logout completed successfully');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      tenantLogger.error('AUTH_LOGOUT_ERROR', 'Logout failed', error);
      setError('Failed to logout');
    } finally {
      setLoading(false);
      tenantLogger.perf.measureEnd('logout');
    }
  }, [tenant?.id]);

  /**
   * Update profile handler
   */
  const updateProfile = useCallback(async (
    updates: Partial<Tenant>
  ): Promise<{ success: boolean; error?: string }> => {
    tenantLogger.data.mutationStart('update', 'tenant_profile');

    try {
      setError(null);

      // For demo users, update the local state only
      if (isDemo) {
        tenantLogger.info('PROFILE_UPDATE', 'Demo profile update (local only)', { updates });
        const updatedTenant = { ...tenant, ...updates } as Tenant;
        setTenant(updatedTenant);

        // Update demo session in localStorage
        const demoSession = localStorage.getItem('demo_tenant_session');
        if (demoSession) {
          const parsed = JSON.parse(demoSession);
          parsed.tenant = updatedTenant;
          localStorage.setItem('demo_tenant_session', JSON.stringify(parsed));
        }

        tenantLogger.data.mutationSuccess('update', 'tenant_profile');
        return { success: true };
      }

      const result = await updateTenantProfile(updates);

      if (result.success && result.tenant) {
        tenantLogger.data.mutationSuccess('update', 'tenant_profile', tenant?.id);
        setTenant(result.tenant);
      } else {
        tenantLogger.data.mutationError('update', 'tenant_profile', new Error(result.error || 'Unknown error'));
        setError(result.error || 'Profile update failed');
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      tenantLogger.data.mutationError('update', 'tenant_profile', error);
      const errorMessage = 'Failed to update profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [tenant, isDemo]);

  /**
   * Refresh tenant data
   */
  const refreshTenant = useCallback(async (): Promise<void> => {
    tenantLogger.data.fetchStart('tenant_profile');

    try {
      // For demo users, just log
      if (isDemo) {
        tenantLogger.debug('REFRESH', 'Demo tenant refresh (no-op)');
        return;
      }

      const tenantProfile = await getCurrentTenant();
      setTenant(tenantProfile);
      tenantLogger.data.fetchSuccess('tenant_profile');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      tenantLogger.data.fetchError('tenant_profile', error);
      setError('Failed to refresh tenant data');
    }
  }, [isDemo]);

  /**
   * Computed values
   */
  const isAuthenticated = !!session && !!tenant;
  const hasPortalAccess = !!tenant?.portal_access && tenant?.status === 'active';

  /**
   * Context value
   */
  const value: TenantAuthContextType = {
    tenant,
    session,
    loading,
    error,
    initialized,
    login,
    loginWithGoogle,
    logout,
    updateProfile,
    refreshTenant,
    isAuthenticated,
    hasPortalAccess,
    isDemo,
  };

  return (
    <TenantAuthContext.Provider value={value}>
      {children}
    </TenantAuthContext.Provider>
  );
}

/**
 * Default context value for when context is not available
 * This prevents "cannot read properties of undefined" errors
 */
const defaultContextValue: TenantAuthContextType = {
  tenant: null,
  session: null,
  loading: true,
  error: null,
  initialized: false,
  login: async () => ({ success: false, error: 'Context not initialized' }),
  loginWithGoogle: async () => ({ success: false, error: 'Context not initialized' }),
  logout: async () => {},
  updateProfile: async () => ({ success: false, error: 'Context not initialized' }),
  refreshTenant: async () => {},
  isAuthenticated: false,
  hasPortalAccess: false,
  isDemo: false,
};

/**
 * Hook to use tenant auth context
 */
export function useTenantAuth(): TenantAuthContextType {
  const context = useContext(TenantAuthContext);

  if (context === undefined) {
    console.error('useTenantAuth must be used within a TenantAuthProvider');
    // Return a safe default instead of throwing to prevent crashes
    return defaultContextValue;
  }

  return context;
}

/**
 * Hook to require authenticated tenant
 * Returns auth context and handles redirects via React Router
 * IMPORTANT: Must be used within a Router context
 */
export function useRequireTenantAuth(): TenantAuthContextType {
  const context = useTenantAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedRef = useRef(false);
  const pathname = location?.pathname || '/tenant/dashboard';

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
      tenantLogger.auth.unauthorized(pathname);
      tenantLogger.nav.redirect(pathname, '/tenant/login', 'Not authenticated');
      redirectedRef.current = true;
      navigate('/tenant/login', { replace: true, state: { from: pathname } });
      return;
    }

    if (!context.hasPortalAccess) {
      tenantLogger.nav.redirect(pathname, '/tenant/access-denied', 'No portal access');
      redirectedRef.current = true;
      navigate('/tenant/access-denied', { replace: true });
      return;
    }

    // Log successful page access
    tenantLogger.nav.pageView(pathname);
  }, [context.initialized, context.loading, context.isAuthenticated, context.hasPortalAccess, navigate, pathname]);

  return context;
}

/**
 * Hook for pages that should redirect away if already authenticated
 * (e.g., login page)
 */
export function useRedirectIfAuthenticated(redirectTo: string = '/tenant/dashboard'): TenantAuthContextType {
  const context = useTenantAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedRef = useRef(false);
  const currentPath = location?.pathname || '/tenant/login';

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
      tenantLogger.nav.redirect(currentPath, redirectTo, 'Already authenticated');
      redirectedRef.current = true;
      navigate(redirectTo, { replace: true });
    }
  }, [context.initialized, context.loading, context.isAuthenticated, context.hasPortalAccess, navigate, redirectTo, currentPath]);

  return context;
}
