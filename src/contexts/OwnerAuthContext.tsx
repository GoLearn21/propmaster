/**
 * Owner Authentication Context
 * Provides global owner authentication state across the owner portal
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Owner,
  getCurrentOwner,
  loginOwner,
  logoutOwner,
  updateOwnerProfile,
} from '../services/ownerAuthService';
import { Session } from '@supabase/supabase-js';

/**
 * Context interface
 */
interface OwnerAuthContextType {
  owner: Owner | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Owner>) => Promise<{ success: boolean; error?: string }>;
  refreshOwner: () => Promise<void>;
  isAuthenticated: boolean;
  hasPortalAccess: boolean;
}

/**
 * Create context
 */
const OwnerAuthContext = createContext<OwnerAuthContextType | undefined>(undefined);

/**
 * Provider component
 */
export function OwnerAuthProvider({ children }: { children: React.ReactNode }) {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize auth state
   */
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Get current session
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (currentSession) {
          setSession(currentSession);

          // Get owner profile
          const ownerProfile = await getCurrentOwner();
          if (mounted) {
            setOwner(ownerProfile);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setError('Failed to initialize authentication');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Owner auth state changed:', event);

      if (!mounted) return;

      setSession(newSession);

      if (newSession) {
        // User signed in or token refreshed
        const ownerProfile = await getCurrentOwner();
        if (mounted) {
          setOwner(ownerProfile);
        }
      } else {
        // User signed out
        if (mounted) {
          setOwner(null);
        }
      }
    });

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Login handler
   */
  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      setLoading(true);

      const result = await loginOwner(email, password, rememberMe);

      if (result.success) {
        setOwner((result.user as Owner) || null);
        setSession(result.session || null);
      } else {
        setError(result.error || 'Login failed');
      }

      return result;
    } catch (err) {
      const errorMessage = 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout handler
   */
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await logoutOwner();
      setOwner(null);
      setSession(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update profile handler
   */
  const updateProfile = async (
    updates: Partial<Owner>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      const result = await updateOwnerProfile(updates);

      if (result.success && result.user) {
        setOwner(result.user as Owner);
      } else {
        setError(result.error || 'Profile update failed');
      }

      return result;
    } catch (err) {
      const errorMessage = 'Failed to update profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Refresh owner data
   */
  const refreshOwner = async (): Promise<void> => {
    try {
      const ownerProfile = await getCurrentOwner();
      setOwner(ownerProfile);
    } catch (err) {
      console.error('Refresh owner error:', err);
      setError('Failed to refresh owner data');
    }
  };

  /**
   * Computed values
   */
  const isAuthenticated = !!session && !!owner;
  const hasPortalAccess = !!owner?.portal_access && owner?.status === 'active';

  /**
   * Context value
   */
  const value: OwnerAuthContextType = {
    owner,
    session,
    loading,
    error,
    login,
    logout,
    updateProfile,
    refreshOwner,
    isAuthenticated,
    hasPortalAccess,
  };

  return <OwnerAuthContext.Provider value={value}>{children}</OwnerAuthContext.Provider>;
}

/**
 * Hook to use owner auth context
 */
export function useOwnerAuth(): OwnerAuthContextType {
  const context = useContext(OwnerAuthContext);

  if (context === undefined) {
    throw new Error('useOwnerAuth must be used within an OwnerAuthProvider');
  }

  return context;
}

/**
 * Hook to require authenticated owner (redirects if not authenticated)
 */
export function useRequireOwnerAuth(): OwnerAuthContextType {
  const context = useOwnerAuth();

  useEffect(() => {
    if (!context.loading && !context.isAuthenticated) {
      // Redirect to login
      window.location.href = '/owner/login';
    }

    if (!context.loading && context.isAuthenticated && !context.hasPortalAccess) {
      // Redirect to access denied page
      window.location.href = '/owner/access-denied';
    }
  }, [context.loading, context.isAuthenticated, context.hasPortalAccess]);

  return context;
}
