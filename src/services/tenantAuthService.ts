/**
 * Phase 3: Tenant Authentication Service
 * Handles tenant login, session management, and authorization
 */

import { supabase } from '../lib/supabase';

/**
 * Interface definitions
 */
export interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  unit_id?: string;
  move_in_date?: string;
  move_out_date?: string;
  balance_due: number;
  status: string;
  user_id?: string;
  portal_access: boolean;
  portal_last_login?: string;
  portal_onboarding_completed: boolean;
  communication_preferences: CommunicationPreferences;
  profile_photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CommunicationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  payment_reminders: boolean;
  maintenance_updates: boolean;
  lease_notifications: boolean;
}

export interface LoginResult {
  success: boolean;
  tenant?: Tenant;
  session?: any;
  error?: string;
  requires_onboarding?: boolean;
}

export interface SignupResult {
  success: boolean;
  tenant?: Tenant;
  error?: string;
  verification_sent?: boolean;
}

export interface PortalSession {
  id: string;
  tenant_id: string;
  user_id: string;
  login_time: string;
  logout_time?: string;
  ip_address?: string;
  user_agent?: string;
  session_duration_minutes?: number;
}

// Demo credentials for development/testing
const DEMO_TENANT = {
  email: 'demo@tenant.com',
  password: 'Demo123!',
  tenant: {
    id: 'demo-tenant-001',
    first_name: 'Demo',
    last_name: 'Tenant',
    email: 'demo@tenant.com',
    phone: '(555) 100-0001',
    unit_id: 'demo-unit-001',
    move_in_date: '2024-01-01',
    balance_due: 0,
    status: 'active',
    user_id: 'demo-user-001',
    portal_access: true,
    portal_onboarding_completed: true,
    communication_preferences: {
      email: true,
      sms: true,
      push: true,
      payment_reminders: true,
      maintenance_updates: true,
      lease_notifications: true,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: new Date().toISOString(),
  } as Tenant,
};

/**
 * Login tenant with email and password
 * Creates portal session record and updates last login timestamp
 */
export async function loginTenant(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<LoginResult> {
  try {
    // Check for demo login (development mode)
    if (email === DEMO_TENANT.email && password === DEMO_TENANT.password) {
      console.log('Demo tenant login successful');
      // Store demo session in localStorage
      localStorage.setItem('demo_tenant_session', JSON.stringify({
        tenant: DEMO_TENANT.tenant,
        isDemo: true,
        loginTime: new Date().toISOString(),
      }));
      return {
        success: true,
        tenant: DEMO_TENANT.tenant,
        session: { user: { id: 'demo-user-001', email: DEMO_TENANT.email } } as any,
        requires_onboarding: false,
      };
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return {
        success: false,
        error: authError.message,
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    // Get tenant record
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (tenantError || !tenant) {
      // User exists but not linked to tenant
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'No tenant account found for this user',
      };
    }

    // Check if portal access is enabled
    if (!tenant.portal_access) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Portal access not enabled. Please contact property management.',
      };
    }

    // Check if tenant is active
    if (tenant.status !== 'active') {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Tenant account is not active',
      };
    }

    // Create portal session record
    const sessionData: Partial<PortalSession> = {
      tenant_id: tenant.id,
      user_id: authData.user.id,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
    };

    const { error: sessionError } = await supabase
      .from('tenant_portal_sessions')
      .insert(sessionData);

    if (sessionError) {
      console.error('Failed to create session record:', sessionError);
      // Don't fail login if session record creation fails
    }

    return {
      success: true,
      tenant,
      session: authData.session,
      requires_onboarding: !tenant.portal_onboarding_completed,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during login',
    };
  }
}

/**
 * Sign up new tenant (property manager must create invite first)
 */
export async function signupTenant(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  inviteCode: string
): Promise<SignupResult> {
  try {
    // Verify invite code exists and hasn't been used
    const { data: inviteData, error: inviteError } = await supabase
      .from('tenant_invites')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('email', email)
      .single();

    if (inviteError || !inviteData) {
      return {
        success: false,
        error: 'Invalid or expired invite code',
      };
    }

    if (inviteData.used_at) {
      return {
        success: false,
        error: 'This invite code has already been used',
      };
    }

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (authError) {
      return {
        success: false,
        error: authError.message,
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Failed to create user account',
      };
    }

    // Update tenant record with user_id
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .update({
        user_id: authData.user.id,
        portal_access: true,
        first_name: firstName,
        last_name: lastName,
      })
      .eq('id', inviteData.tenant_id)
      .select()
      .single();

    if (tenantError) {
      // Rollback: delete auth user if tenant update fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return {
        success: false,
        error: 'Failed to link account to tenant profile',
      };
    }

    // Mark invite as used
    await supabase
      .from('tenant_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', inviteData.id);

    return {
      success: true,
      tenant,
      verification_sent: true,
    };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during signup',
    };
  }
}

/**
 * Logout tenant and record session end
 */
export async function logoutTenant(): Promise<void> {
  try {
    // Check for demo session and clear it
    const demoSession = localStorage.getItem('demo_tenant_session');
    if (demoSession) {
      localStorage.removeItem('demo_tenant_session');
      console.log('Demo tenant session cleared');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Update most recent session with logout time
      await supabase
        .from('tenant_portal_sessions')
        .update({ logout_time: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('logout_time', null)
        .order('login_time', { ascending: false })
        .limit(1);
    }

    // Sign out from Supabase
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Logout error:', error);
    // Still try to sign out even if session update fails
    await supabase.auth.signOut();
  }
}

/**
 * Get current authenticated tenant
 */
export async function getCurrentTenant(): Promise<Tenant | null> {
  try {
    // Check for demo session first
    const demoSession = localStorage.getItem('demo_tenant_session');
    if (demoSession) {
      try {
        const parsed = JSON.parse(demoSession);
        if (parsed.isDemo && parsed.tenant) {
          return parsed.tenant;
        }
      } catch {
        // Invalid demo session, continue to check Supabase
        localStorage.removeItem('demo_tenant_session');
      }
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !tenant) {
      return null;
    }

    return tenant;
  } catch (error) {
    console.error('Get current tenant error:', error);
    return null;
  }
}

/**
 * Request password reset
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/tenant/reset-password`,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: 'Failed to send password reset email',
    };
  }
}

/**
 * Update password
 */
export async function updatePassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Update password error:', error);
    return {
      success: false,
      error: 'Failed to update password',
    };
  }
}

/**
 * Update tenant profile
 */
export async function updateTenantProfile(
  updates: Partial<Tenant>
): Promise<{ success: boolean; tenant?: Tenant; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Get tenant ID
    const { data: currentTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!currentTenant) {
      return {
        success: false,
        error: 'Tenant not found',
      };
    }

    // Update tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', currentTenant.id)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      tenant,
    };
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      success: false,
      error: 'Failed to update profile',
    };
  }
}

/**
 * Complete portal onboarding
 */
export async function completeOnboarding(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await updateTenantProfile({
      portal_onboarding_completed: true,
    });

    return {
      success: result.success,
      error: result.error,
    };
  } catch (error) {
    console.error('Complete onboarding error:', error);
    return {
      success: false,
      error: 'Failed to complete onboarding',
    };
  }
}

/**
 * Get tenant's portal sessions (for security/audit)
 */
export async function getPortalSessions(limit: number = 10): Promise<PortalSession[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data: sessions, error } = await supabase
      .from('tenant_portal_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('login_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get sessions error:', error);
      return [];
    }

    return sessions || [];
  } catch (error) {
    console.error('Get sessions error:', error);
    return [];
  }
}

/**
 * Helper: Get client IP address (best effort)
 */
async function getClientIP(): Promise<string | undefined> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return undefined;
  }
}

/**
 * Verify tenant has portal access
 */
export async function verifyPortalAccess(): Promise<boolean> {
  try {
    const tenant = await getCurrentTenant();

    if (!tenant) {
      return false;
    }

    return tenant.portal_access && tenant.status === 'active';
  } catch {
    return false;
  }
}

/**
 * Update communication preferences
 */
export async function updateCommunicationPreferences(
  preferences: Partial<CommunicationPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenant = await getCurrentTenant();

    if (!tenant) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const updatedPreferences = {
      ...tenant.communication_preferences,
      ...preferences,
    };

    const result = await updateTenantProfile({
      communication_preferences: updatedPreferences,
    });

    return {
      success: result.success,
      error: result.error,
    };
  } catch (error) {
    console.error('Update preferences error:', error);
    return {
      success: false,
      error: 'Failed to update communication preferences',
    };
  }
}

/**
 * Sign in with Google OAuth
 * Initiates OAuth flow and redirects to Google sign-in
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/tenant/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Google OAuth error:', error);
    return {
      success: false,
      error: 'Failed to initiate Google sign-in',
    };
  }
}

/**
 * Handle OAuth callback and link to tenant
 * Called after user returns from Google OAuth
 */
export async function handleOAuthCallback(): Promise<LoginResult> {
  try {
    // Get the session from the URL (Supabase handles this automatically)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return {
        success: false,
        error: 'OAuth authentication failed',
      };
    }

    const user = session.user;
    if (!user || !user.email) {
      return {
        success: false,
        error: 'Failed to get user information from OAuth',
      };
    }

    // Check if this user is already linked to a tenant
    let tenant = await getCurrentTenant();

    if (tenant) {
      // Existing tenant - check access
      if (!tenant.portal_access) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Portal access not enabled. Please contact property management.',
        };
      }

      if (tenant.status !== 'active') {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Tenant account is not active',
        };
      }

      // Create portal session record
      await createPortalSession(tenant.id, user.id);

      // Update last login
      await supabase
        .from('tenants')
        .update({ portal_last_login: new Date().toISOString() })
        .eq('id', tenant.id);

      return {
        success: true,
        tenant,
        session,
        requires_onboarding: !tenant.portal_onboarding_completed,
      };
    }

    // User not linked to tenant - check if there's a tenant with matching email
    const { data: tenantByEmail, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('email', user.email)
      .single();

    if (tenantError || !tenantByEmail) {
      // No tenant found with this email
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'No tenant account found for this email. Please contact property management.',
      };
    }

    // Check if tenant has portal access enabled
    if (!tenantByEmail.portal_access) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Portal access not enabled. Please contact property management.',
      };
    }

    // Check if tenant is active
    if (tenantByEmail.status !== 'active') {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Tenant account is not active',
      };
    }

    // Link the OAuth user to the tenant
    const { data: updatedTenant, error: updateError } = await supabase
      .from('tenants')
      .update({
        user_id: user.id,
        portal_last_login: new Date().toISOString(),
        // Update name from Google if not set
        first_name: tenantByEmail.first_name || user.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: tenantByEmail.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
      })
      .eq('id', tenantByEmail.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to link OAuth user to tenant:', updateError);
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Failed to link your Google account to tenant profile',
      };
    }

    // Create portal session record
    await createPortalSession(tenantByEmail.id, user.id);

    return {
      success: true,
      tenant: updatedTenant,
      session,
      requires_onboarding: !updatedTenant.portal_onboarding_completed,
    };
  } catch (error) {
    console.error('OAuth callback error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during authentication',
    };
  }
}

/**
 * Helper: Create portal session record
 */
async function createPortalSession(tenantId: string, userId: string): Promise<void> {
  try {
    const sessionData: Partial<PortalSession> = {
      tenant_id: tenantId,
      user_id: userId,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
    };

    await supabase.from('tenant_portal_sessions').insert(sessionData);
  } catch (error) {
    console.error('Failed to create session record:', error);
    // Don't fail the login if session record creation fails
  }
}

/**
 * Check if user signed in via OAuth (for UI display)
 */
export async function isOAuthUser(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if the user has OAuth identity
    return user.app_metadata?.provider === 'google' ||
           user.identities?.some(i => i.provider === 'google') ||
           false;
  } catch {
    return false;
  }
}

/**
 * Get OAuth provider info for connected accounts
 */
export async function getConnectedOAuthProviders(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.identities) return [];

    return user.identities.map(i => i.provider);
  } catch {
    return [];
  }
}
