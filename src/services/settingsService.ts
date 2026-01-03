import { supabase } from '../lib/supabase';

export interface UserSettings {
  id?: string;
  user_id?: string;
  
  // Profile Settings
  full_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  timezone?: string;
  language?: string;
  profile_photo_url?: string;
  
  // Property Management Settings
  default_lease_term_months?: number;
  late_fee_amount?: number;
  grace_period_days?: number;
  auto_rent_reminders?: boolean;
  online_payment_enabled?: boolean;
  
  // Notification Settings
  email_tasks?: boolean;
  email_payments?: boolean;
  email_maintenance?: boolean;
  email_leases?: boolean;
  sms_important?: boolean;
  sms_tasks?: boolean;
  sms_payments?: boolean;
  push_notifications?: boolean;
  push_maintenance?: boolean;
  
  // System Settings
  date_format?: string;
  currency?: string;
  dark_mode?: boolean;
  show_onboarding_tips?: boolean;
  
  // Security Settings
  two_factor_enabled?: boolean;
  session_timeout_minutes?: number;
  
  // Metadata
  created_at?: string;
  updated_at?: string;
}

/**
 * Get current user's settings
 */
export async function getUserSettings(): Promise<UserSettings | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no settings exist yet, return null (will create default settings)
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    throw error;
  }
}

/**
 * Create default settings for new user
 */
export async function createDefaultSettings(): Promise<UserSettings> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const defaultSettings: Partial<UserSettings> = {
      user_id: user.id,
      full_name: user.user_metadata?.full_name || '',
      email: user.email || '',
      timezone: 'America/New_York',
      language: 'English',
      default_lease_term_months: 12,
      late_fee_amount: 50.00,
      grace_period_days: 5,
      auto_rent_reminders: true,
      online_payment_enabled: true,
      email_tasks: true,
      email_payments: true,
      email_maintenance: true,
      email_leases: false,
      sms_important: false,
      sms_tasks: false,
      sms_payments: true,
      push_notifications: true,
      push_maintenance: true,
      date_format: 'MM/DD/YYYY',
      currency: 'USD',
      dark_mode: false,
      show_onboarding_tips: true,
      two_factor_enabled: false,
      session_timeout_minutes: 30,
    };

    const { data, error } = await supabase
      .from('user_settings')
      .insert([defaultSettings])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating default settings:', error);
    throw error;
  }
}

/**
 * Update user settings
 */
export async function updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Remove fields that shouldn't be updated
    const { id, user_id, created_at, updated_at, ...updateData } = settings;

    const { data, error } = await supabase
      .from('user_settings')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
}

/**
 * Get or create user settings (convenience function)
 */
export async function getOrCreateUserSettings(): Promise<UserSettings> {
  try {
    let settings = await getUserSettings();
    
    if (!settings) {
      settings = await createDefaultSettings();
    }
    
    return settings;
  } catch (error) {
    console.error('Error getting or creating user settings:', error);
    throw error;
  }
}

/**
 * Upload profile photo
 */
export async function uploadProfilePhoto(file: File): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `profile-photos/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Update user settings with photo URL
    await updateUserSettings({ profile_photo_url: publicUrl });

    return publicUrl;
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    throw error;
  }
}

/**
 * Export user data
 */
export async function exportUserData(format: 'csv' | 'json'): Promise<Blob> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch all user data from various tables
    const [
      { data: properties },
      { data: units },
      { data: tenants },
      { data: leases },
      { data: tasks },
      { data: settings },
    ] = await Promise.all([
      supabase.from('properties').select('*'),
      supabase.from('units').select('*'),
      supabase.from('tenants').select('*'),
      supabase.from('leases').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      settings,
      properties: properties || [],
      units: units || [],
      tenants: tenants || [],
      leases: leases || [],
      tasks: tasks || [],
    };

    if (format === 'json') {
      const jsonString = JSON.stringify(exportData, null, 2);
      return new Blob([jsonString], { type: 'application/json' });
    } else {
      // CSV format - create a simple CSV of all properties
      const csvRows = [
        ['Data Type', 'Count', 'Details'],
        ['Properties', properties?.length || 0, 'Property portfolio data'],
        ['Units', units?.length || 0, 'Rental units'],
        ['Tenants', tenants?.length || 0, 'Tenant records'],
        ['Leases', leases?.length || 0, 'Lease agreements'],
        ['Tasks', tasks?.length || 0, 'Maintenance tasks'],
      ];
      
      const csvString = csvRows.map(row => row.join(',')).join('\n');
      return new Blob([csvString], { type: 'text/csv' });
    }
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
}

/**
 * Delete user account and all associated data
 */
export async function deleteUserAccount(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Delete user settings (other data will cascade based on foreign keys)
    const { error } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    // Sign out the user
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
}
