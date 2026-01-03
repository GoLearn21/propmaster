import { supabase } from '../../../lib/supabase';

export interface PropertySettings {
  id?: string;
  property_id: string;
  section: string;
  settings: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface SettingsSection {
  name: string;
  component: string;
  description: string;
  order: number;
}

// Settings sections configuration
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    name: 'rental_applications',
    component: 'RentalApplicationsSettings',
    description: 'Configure rental application requirements and screening',
    order: 1
  },
  {
    name: 'payment_notifications',
    component: 'PaymentNotificationsSettings',
    description: 'Setup automated payment reminders and notifications',
    order: 2
  },
  {
    name: 'payment_instructions',
    component: 'PaymentInstructionsSettings',
    description: 'Specify tenant payment instructions and methods',
    order: 3
  },
  {
    name: 'custom_allocations',
    component: 'CustomAllocationsSettings',
    description: 'Create custom payment allocation rules and presets',
    order: 4
  },
  {
    name: 'payment_allocation',
    component: 'PaymentAllocationSettings',
    description: 'Configure automatic payment receiving and distribution',
    order: 5
  },
  {
    name: 'fees_settings',
    component: 'FeesSettings',
    description: 'Manage property fees and charges',
    order: 6
  },
  {
    name: 'tenant_portal',
    component: 'TenantPortalSettings',
    description: 'Configure resident portal access and features',
    order: 7
  },
  {
    name: 'tenant_requests',
    component: 'TenantRequestsSettings',
    description: 'Auto-assign new tenant requests and configure workflows',
    order: 8
  }
];

// Generic settings service functions
export class SettingsService {
  
  // Load all settings for a property
  static async getAllPropertySettings(propertyId: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase
        .from('property_settings')
        .select('*')
        .eq('property_id', propertyId);

      if (error) throw error;

      const settings: Record<string, any> = {};
      data?.forEach(setting => {
        settings[setting.section] = setting.settings;
      });

      return settings;
    } catch (error) {
      console.error('Failed to load property settings:', error);
      throw error;
    }
  }

  // Load settings for a specific section
  static async getPropertySettings(propertyId: string, section: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('property_settings')
        .select('*')
        .eq('property_id', propertyId)
        .eq('section', section)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data?.settings || null;
    } catch (error) {
      console.error(`Failed to load ${section} settings:`, error);
      throw error;
    }
  }

  // Save settings for a specific section
  static async savePropertySettings(
    propertyId: string,
    section: string,
    settings: any
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('property_settings')
        .upsert({
          property_id: propertyId,
          section: section,
          settings: settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error(`Failed to save ${section} settings:`, error);
      throw error;
    }
  }

  // Delete settings for a specific section
  static async deletePropertySettings(propertyId: string, section: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('property_settings')
        .delete()
        .eq('property_id', propertyId)
        .eq('section', section);

      if (error) throw error;
    } catch (error) {
      console.error(`Failed to delete ${section} settings:`, error);
      throw error;
    }
  }

  // Get settings sections configuration
  static getSettingsSections(): SettingsSection[] {
    return SETTINGS_SECTIONS.sort((a, b) => a.order - b.order);
  }

  // Get section configuration by name
  static getSectionConfig(sectionName: string): SettingsSection | undefined {
    return SETTINGS_SECTIONS.find(section => section.name === sectionName);
  }

  // Export settings to JSON
  static async exportPropertySettings(propertyId: string): Promise<any> {
    try {
      const settings = await this.getAllPropertySettings(propertyId);
      return {
        property_id: propertyId,
        exported_at: new Date().toISOString(),
        settings: settings
      };
    } catch (error) {
      console.error('Failed to export property settings:', error);
      throw error;
    }
  }

  // Import settings from JSON
  static async importPropertySettings(
    propertyId: string,
    settingsData: Record<string, any>
  ): Promise<void> {
    try {
      const promises = Object.entries(settingsData).map(([section, settings]) =>
        this.savePropertySettings(propertyId, section, settings)
      );

      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to import property settings:', error);
      throw error;
    }
  }

  // Reset section to defaults
  static async resetSectionToDefaults(
    propertyId: string,
    section: string
  ): Promise<void> {
    try {
      await this.deletePropertySettings(propertyId, section);
    } catch (error) {
      console.error(`Failed to reset ${section} settings:`, error);
      throw error;
    }
  }

  // Validate settings data
  static validateSettings(section: string, data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (section) {
      case 'rental_applications':
        if (!data.accept_applications && data.accept_applications !== undefined) {
          // Validation for application settings
        }
        break;
      
      case 'payment_notifications':
        if (data.email_notifications_enabled === false && data.text_notifications_enabled === false) {
          errors.push('At least one notification method must be enabled');
        }
        break;
      
      case 'payment_instructions':
        if (!data.payment_methods || data.payment_methods.length === 0) {
          errors.push('At least one payment method must be configured');
        }
        break;
      
      case 'tenant_portal':
        if (data.portal_enabled && !data.portal_url) {
          errors.push('Portal URL is required when portal is enabled');
        }
        break;
      
      case 'fees_settings':
        if (!data.fees || data.fees.length === 0) {
          errors.push('At least one fee must be configured');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get default settings for a section
  static getDefaultSettings(section: string): any {
    const defaults: Record<string, any> = {
      rental_applications: {
        accept_applications: true,
        require_screening: true,
        credit_score_minimum: 650,
        application_fee: 50,
        pet_fee: 300
      },
      payment_notifications: {
        email_notifications_enabled: true,
        text_notifications_enabled: true,
        payment_reminder_days: [3, 1],
        late_payment_notice_days: [1, 5, 10]
      },
      payment_instructions: {
        accepted_payment_types: ['online', 'bank_transfer', 'check'],
        rent_due_day: 1,
        late_fee_grace_period: 5,
        auto_allocation_enabled: true
      },
      custom_allocations: {
        auto_allocation_enabled: true,
        allocation_rules: []
      },
      payment_allocation: {
        auto_allocation_enabled: true,
        allocation_method: 'fifo',
        split_payments_allowed: true,
        partial_payments_allowed: true
      },
      fees_settings: {
        auto_fee_calculation: true,
        late_fee_grace_period: 5,
        fees: []
      },
      tenant_portal: {
        portal_enabled: true,
        portal_name: 'Tenant Portal',
        features: {
          online_payments: true,
          maintenance_requests: true
        }
      },
      tenant_requests: {
        auto_assignment_enabled: true,
        default_response_time_hours: 24,
        request_categories: []
      }
    };

    return defaults[section] || {};
  }
}

// Specific service functions for complex settings
export const PropertySettingsService = {
  // Lease settings (existing table)
  async getLeaseSettings(propertyId: string) {
    const { data, error } = await supabase
      .from('property_lease_settings')
      .select('*')
      .eq('property_id', propertyId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async saveLeaseSettings(propertyId: string, settings: any) {
    const { data, error } = await supabase
      .from('property_lease_settings')
      .upsert({
        property_id: propertyId,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Application settings
  async getApplicationSettings(propertyId: string) {
    const { data, error } = await supabase
      .from('property_application_settings')
      .select('*')
      .eq('property_id', propertyId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async saveApplicationSettings(propertyId: string, settings: any) {
    const { data, error } = await supabase
      .from('property_application_settings')
      .upsert({
        property_id: propertyId,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // And similar methods for other specific setting types...
  // This would be extended based on the actual database schema
};

export default SettingsService;