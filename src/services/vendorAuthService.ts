/**
 * Vendor Authentication Service
 * Handles vendor portal authentication, session management, and profile operations
 */

import { supabase } from '../lib/supabase';
import { Vendor, AuthResponse } from '../types/auth';
import { Session } from '@supabase/supabase-js';

// Demo credentials for development/testing
const DEMO_VENDOR: Vendor = {
  id: 'demo-vendor-001',
  email: 'demo@vendor.com',
  role: 'vendor',
  first_name: 'Demo',
  last_name: 'Vendor',
  phone_number: '(555) 200-0001',
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: new Date().toISOString(),
  company_name: 'Demo Maintenance Services',
  business_license: 'DEM-12345',
  insurance_policy_number: 'INS-98765',
  insurance_expiry_date: '2026-12-31',
  specialty: 'general',
  service_areas: ['NC', 'SC'],
  hourly_rate: 75,
  rating: 4.8,
  completed_jobs_count: 25,
  active_jobs_count: 3,
  portal_access: true,
};

const DEMO_CREDENTIALS = {
  email: 'demo@vendor.com',
  password: 'Demo123!',
};

/**
 * Login a vendor
 */
export async function loginVendor(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<AuthResponse> {
  try {
    // Check for demo login (development mode)
    if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
      console.log('Demo vendor login successful');
      // Store demo session in localStorage
      localStorage.setItem('demo_vendor_session', JSON.stringify({
        vendor: DEMO_VENDOR,
        isDemo: true,
        loginTime: new Date().toISOString(),
      }));
      return {
        success: true,
        user: DEMO_VENDOR,
        session: { user: { id: 'demo-user-002', email: DEMO_CREDENTIALS.email } } as any,
      };
    }

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

    // Get vendor profile
    const vendor = await getCurrentVendor();

    if (!vendor) {
      // Sign out if not a vendor
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'No vendor profile found. Please contact your property manager.',
      };
    }

    // Check if vendor account is active
    if (vendor.status !== 'active') {
      await supabase.auth.signOut();
      return {
        success: false,
        error: `Your vendor account is ${vendor.status}. Please contact your property manager.`,
      };
    }

    // Check if portal access is granted
    if (!vendor.portal_access) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Portal access not granted. Please contact your property manager.',
      };
    }

    return {
      success: true,
      user: vendor,
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
 * Logout a vendor
 */
export async function logoutVendor(): Promise<void> {
  try {
    // Check for demo session and clear it
    const demoSession = localStorage.getItem('demo_vendor_session');
    if (demoSession) {
      localStorage.removeItem('demo_vendor_session');
      console.log('Demo vendor session cleared');
      return;
    }

    await supabase.auth.signOut();
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

/**
 * Get current vendor profile
 */
export async function getCurrentVendor(): Promise<Vendor | null> {
  try {
    // Check for demo session first
    const demoSession = localStorage.getItem('demo_vendor_session');
    if (demoSession) {
      try {
        const parsed = JSON.parse(demoSession);
        if (parsed.isDemo && parsed.vendor) {
          return parsed.vendor;
        }
      } catch {
        // Invalid demo session, continue to check Supabase
        localStorage.removeItem('demo_vendor_session');
      }
    }

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return null;
    }

    // Get vendor profile from database
    const { data: vendorData, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('role', 'vendor')
      .single();

    if (error) {
      console.error('Error fetching vendor profile:', error);
      return null;
    }

    if (!vendorData) {
      return null;
    }

    // Map database fields to Vendor type
    const vendor: Vendor = {
      id: vendorData.id,
      email: vendorData.email || session.user.email || '',
      role: 'vendor',
      first_name: vendorData.first_name || '',
      last_name: vendorData.last_name || '',
      phone_number: vendorData.phone_number,
      profile_image_url: vendorData.profile_image_url,
      status: vendorData.status || 'active',
      created_at: vendorData.created_at,
      updated_at: vendorData.updated_at,
      company_name: vendorData.company_name || '',
      business_license: vendorData.business_license,
      insurance_policy_number: vendorData.insurance_policy_number,
      insurance_expiry_date: vendorData.insurance_expiry_date,
      specialty: vendorData.specialty || 'general',
      service_areas: vendorData.service_areas || [],
      hourly_rate: vendorData.hourly_rate,
      rating: vendorData.rating,
      completed_jobs_count: vendorData.completed_jobs_count || 0,
      active_jobs_count: vendorData.active_jobs_count || 0,
      portal_access: vendorData.portal_access !== false,
    };

    return vendor;
  } catch (error) {
    console.error('Get current vendor error:', error);
    return null;
  }
}

/**
 * Update vendor profile
 */
export async function updateVendorProfile(
  updates: Partial<Vendor>
): Promise<AuthResponse> {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    // Update vendor profile in database
    const { data, error } = await supabase
      .from('vendors')
      .update({
        first_name: updates.first_name,
        last_name: updates.last_name,
        phone_number: updates.phone_number,
        profile_image_url: updates.profile_image_url,
        company_name: updates.company_name,
        business_license: updates.business_license,
        insurance_policy_number: updates.insurance_policy_number,
        insurance_expiry_date: updates.insurance_expiry_date,
        hourly_rate: updates.hourly_rate,
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

    // Get updated vendor profile
    const vendor = await getCurrentVendor();

    return {
      success: true,
      user: vendor || undefined,
    };
  } catch (error: any) {
    console.error('Update vendor profile error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Get assigned work orders for vendor
 */
export async function getAssignedWorkOrders(
  vendorId: string,
  filters?: {
    status?: string[];
    priority?: string[];
    limit?: number;
  }
): Promise<any[]> {
  try {
    let query = supabase
      .from('work_orders')
      .select(`
        *,
        properties!inner(id, name, address),
        units(id, unit_number)
      `)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching work orders:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Get assigned work orders error:', error);
    return [];
  }
}

/**
 * Update work order status
 */
export async function updateWorkOrderStatus(
  workOrderId: string,
  status: string,
  notes?: string,
  completionPhotos?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.vendor_notes = notes;
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (completionPhotos && completionPhotos.length > 0) {
      updateData.completion_photos = completionPhotos;
    }

    const { error } = await supabase
      .from('work_orders')
      .update(updateData)
      .eq('id', workOrderId);

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to update work order',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Update work order status error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Get vendor payment history
 */
export async function getVendorPayments(
  vendorId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('payment_history')
      .select(`
        *,
        properties(id, name),
        work_orders(id, title, description)
      `)
      .eq('vendor_id', vendorId)
      .order('payment_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Get vendor payments error:', error);
    return [];
  }
}
