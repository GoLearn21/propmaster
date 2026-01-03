/**
 * Owner Authentication Service
 * Handles owner portal authentication, session management, and financial data access
 */

import { supabase } from '../lib/supabase';
import { Owner, AuthResponse } from '../types/auth';
import { Session } from '@supabase/supabase-js';

/**
 * Login an owner
 */
export async function loginOwner(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<AuthResponse> {
  try {
    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return {
        success: false,
        error: authError.message || 'Authentication failed',
      };
    }

    if (!authData.session || !authData.user) {
      return {
        success: false,
        error: 'No session created',
      };
    }

    // Get owner profile
    const owner = await getCurrentOwner();

    if (!owner) {
      // Sign out if not an owner
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'No owner profile found. Please contact your property manager.',
      };
    }

    // Check if owner account is active
    if (owner.status !== 'active') {
      await supabase.auth.signOut();
      return {
        success: false,
        error: `Your owner account is ${owner.status}. Please contact your property manager.`,
      };
    }

    // Check if portal access is granted
    if (!owner.portal_access) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Portal access not granted. Please contact your property manager.',
      };
    }

    return {
      success: true,
      user: owner,
      session: authData.session,
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred during login',
    };
  }
}

/**
 * Logout an owner
 */
export async function logoutOwner(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

/**
 * Get current owner profile
 */
export async function getCurrentOwner(): Promise<Owner | null> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return null;
    }

    // Get owner profile from database
    const { data: ownerData, error } = await supabase
      .from('owners')
      .select(`
        *,
        property_ownership(property_id)
      `)
      .eq('user_id', session.user.id)
      .eq('role', 'owner')
      .single();

    if (error) {
      console.error('Error fetching owner profile:', error);
      return null;
    }

    if (!ownerData) {
      return null;
    }

    // Extract property IDs from ownership records
    const ownedProperties = ownerData.property_ownership?.map((po: any) => po.property_id) || [];

    // Map database fields to Owner type
    const owner: Owner = {
      id: ownerData.id,
      email: ownerData.email || session.user.email || '',
      role: 'owner',
      first_name: ownerData.first_name || '',
      last_name: ownerData.last_name || '',
      phone_number: ownerData.phone_number,
      profile_image_url: ownerData.profile_image_url,
      status: ownerData.status || 'active',
      created_at: ownerData.created_at,
      updated_at: ownerData.updated_at,
      owned_properties: ownedProperties,
      total_units: ownerData.total_units,
      portfolio_value: ownerData.portfolio_value,
      preferred_contact_method: ownerData.preferred_contact_method || 'email',
      portal_access: ownerData.portal_access !== false,
      financial_reporting_preference: ownerData.financial_reporting_preference || 'monthly',
    };

    return owner;
  } catch (error) {
    console.error('Get current owner error:', error);
    return null;
  }
}

/**
 * Update owner profile
 */
export async function updateOwnerProfile(updates: Partial<Owner>): Promise<AuthResponse> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Update owner profile in database
    const { data, error } = await supabase
      .from('owners')
      .update({
        first_name: updates.first_name,
        last_name: updates.last_name,
        phone_number: updates.phone_number,
        profile_image_url: updates.profile_image_url,
        preferred_contact_method: updates.preferred_contact_method,
        financial_reporting_preference: updates.financial_reporting_preference,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to update profile',
      };
    }

    // Get updated owner profile
    const owner = await getCurrentOwner();

    return {
      success: true,
      user: owner || undefined,
    };
  } catch (error: any) {
    console.error('Update owner profile error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Get financial reports for owner's properties
 */
export async function getOwnerFinancialReports(
  ownerId: string,
  timeframe: 'monthly' | 'quarterly' | 'annual' = 'monthly'
): Promise<any> {
  try {
    // Get owner's properties
    const { data: properties, error: propError } = await supabase
      .from('property_ownership')
      .select('property_id, properties(*)')
      .eq('owner_id', ownerId);

    if (propError) {
      console.error('Error fetching properties:', propError);
      return null;
    }

    const propertyIds = properties?.map((p) => p.property_id) || [];

    if (propertyIds.length === 0) {
      return {
        total_revenue: 0,
        total_expenses: 0,
        net_income: 0,
        properties: [],
      };
    }

    // Get payment history (revenue)
    const { data: payments } = await supabase
      .from('payment_history')
      .select('amount, payment_date, property_id')
      .in('property_id', propertyIds)
      .eq('status', 'completed');

    // Get expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, expense_date, property_id, category')
      .in('property_id', propertyIds);

    const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    return {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: totalRevenue - totalExpenses,
      properties: properties?.map((p) => p.properties),
      payments,
      expenses,
    };
  } catch (error) {
    console.error('Get owner financial reports error:', error);
    return null;
  }
}

/**
 * Get property performance metrics
 */
export async function getPropertyPerformance(propertyIds: string[]): Promise<any[]> {
  try {
    if (propertyIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        units(count),
        leases!inner(
          id,
          status,
          rent_amount,
          start_date,
          end_date
        )
      `)
      .in('id', propertyIds);

    if (error) {
      console.error('Error fetching property performance:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Get property performance error:', error);
    return [];
  }
}
