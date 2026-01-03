import { useState, useEffect } from 'react';
import { Monitor, Save, Globe, Shield, Bell, FileText } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface TenantPortalSettingsProps {
  propertyId?: string;
  onUpdate?: () => void;
}

interface TenantPortalSettings {
  id?: string;
  property_id: string;
  portal_enabled: boolean;
  portal_url?: string;
  portal_name?: string;
  branding?: {
    primary_color: string;
    logo_url?: string;
    company_name?: string;
  };
  access_control: {
    password_requirements: {
      min_length: number;
      require_uppercase: boolean;
      require_lowercase: boolean;
      require_numbers: boolean;
      require_special_chars: boolean;
    };
    two_factor_required: boolean;
    session_timeout_minutes: number;
    max_login_attempts: number;
  };
  features: {
    online_payments: boolean;
    maintenance_requests: boolean;
    document_uploads: boolean;
    messaging_system: boolean;
    lease_documents: boolean;
    payment_history: boolean;
    maintenance_history: boolean;
    tenant_directory: boolean;
  };
  notifications: {
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    maintenance_request_alerts: boolean;
    payment_reminder_notifications: boolean;
  };
  security: {
    data_encryption: boolean;
    ip_restriction: boolean;
    allowed_ip_ranges?: string[];
    audit_logging: boolean;
  };
  customization: {
    welcome_message?: string;
    terms_of_service?: string;
    privacy_policy?: string;
    custom_css?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export default function TenantPortalSettings({ propertyId, onUpdate }: TenantPortalSettingsProps) {
  const [settings, setSettings] = useState<TenantPortalSettings>({
    property_id: propertyId || '',
    portal_enabled: true,
    portal_url: '',
    portal_name: 'Tenant Portal',
    branding: {
      primary_color: '#0d9488',
      company_name: 'Property Management'
    },
    access_control: {
      password_requirements: {
        min_length: 8,
        require_uppercase: true,
        require_lowercase: true,
        require_numbers: true,
        require_special_chars: false
      },
      two_factor_required: false,
      session_timeout_minutes: 120,
      max_login_attempts: 5
    },
    features: {
      online_payments: true,
      maintenance_requests: true,
      document_uploads: true,
      messaging_system: true,
      lease_documents: true,
      payment_history: true,
      maintenance_history: true,
      tenant_directory: false
    },
    notifications: {
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      maintenance_request_alerts: true,
      payment_reminder_notifications: true
    },
    security: {
      data_encryption: true,
      ip_restriction: false,
      audit_logging: true
    },
    customization: {
      welcome_message: 'Welcome to your tenant portal!',
    }
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testPortalAccess, setTestPortalAccess] = useState(false);

  useEffect(() => {
    if (propertyId) {
      loadSettings();
    }
  }, [propertyId]);

  const loadSettings = async () => {
    if (!propertyId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('property_tenant_portal_settings')
        .select('*')
        .eq('property_id', propertyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load tenant portal settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!propertyId) return;

    setSaving(true);
    try {
      const settingsData = {
        ...settings,
        property_id: propertyId,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('property_tenant_portal_settings')
        .upsert(settingsData);

      if (error) throw error;

      onUpdate?.();
    } catch (error) {
      console.error('Failed to save tenant portal settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof TenantPortalSettings>(
    key: K,
    value: TenantPortalSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedSetting = (section: keyof TenantPortalSettings, subsection: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [subsection]: value
      }
    }));
  };

  const updatePasswordRequirement = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      access_control: {
        ...prev.access_control,
        password_requirements: {
          ...prev.access_control.password_requirements,
          [key]: value
        }
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-6 h-6 text-teal-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tenant Portal</h3>
            <p className="text-sm text-gray-600">Configure resident portal access and features</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {settings.portal_enabled && (
            <button
              onClick={() => setTestPortalAccess(!testPortalAccess)}
              className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Test Portal Access
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portal Access */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-600" />
            Portal Access
          </h4>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="portal_enabled"
                checked={settings.portal_enabled}
                onChange={(e) => updateSetting('portal_enabled', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="portal_enabled" className="ml-2 text-sm text-gray-700">
                Enable tenant portal access
              </label>
            </div>

            {settings.portal_enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portal Name
                  </label>
                  <input
                    type="text"
                    value={settings.portal_name || ''}
                    onChange={(e) => updateSetting('portal_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Tenant Portal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portal URL
                  </label>
                  <input
                    type="url"
                    value={settings.portal_url || ''}
                    onChange={(e) => updateSetting('portal_url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="https://portal.property.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={settings.branding?.primary_color || '#0d9488'}
                    onChange={(e) => updateNestedSetting('branding', 'primary_color', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={settings.branding?.company_name || ''}
                    onChange={(e) => updateNestedSetting('branding', 'company_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Property Management Company"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={settings.branding?.logo_url || ''}
                    onChange={(e) => updateNestedSetting('branding', 'logo_url', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-600" />
            Security
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Requirements
              </label>
              <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Minimum Length</label>
                  <input
                    type="number"
                    min="6"
                    max="20"
                    value={settings.access_control.password_requirements.min_length}
                    onChange={(e) => updatePasswordRequirement('min_length', parseInt(e.target.value))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="require_uppercase"
                    checked={settings.access_control.password_requirements.require_uppercase}
                    onChange={(e) => updatePasswordRequirement('require_uppercase', e.target.checked)}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="require_uppercase" className="ml-2 text-sm text-gray-700">
                    Require uppercase letters
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="require_lowercase"
                    checked={settings.access_control.password_requirements.require_lowercase}
                    onChange={(e) => updatePasswordRequirement('require_lowercase', e.target.checked)}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="require_lowercase" className="ml-2 text-sm text-gray-700">
                    Require lowercase letters
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="require_numbers"
                    checked={settings.access_control.password_requirements.require_numbers}
                    onChange={(e) => updatePasswordRequirement('require_numbers', e.target.checked)}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="require_numbers" className="ml-2 text-sm text-gray-700">
                    Require numbers
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="require_special_chars"
                    checked={settings.access_control.password_requirements.require_special_chars}
                    onChange={(e) => updatePasswordRequirement('require_special_chars', e.target.checked)}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="require_special_chars" className="ml-2 text-sm text-gray-700">
                    Require special characters
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="two_factor_required"
                checked={settings.access_control.two_factor_required}
                onChange={(e) => updateNestedSetting('access_control', 'two_factor_required', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="two_factor_required" className="ml-2 text-sm text-gray-700">
                Require two-factor authentication
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                min="15"
                max="480"
                value={settings.access_control.session_timeout_minutes}
                onChange={(e) => updateNestedSetting('access_control', 'session_timeout_minutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Login Attempts
              </label>
              <input
                type="number"
                min="3"
                max="10"
                value={settings.access_control.max_login_attempts}
                onChange={(e) => updateNestedSetting('access_control', 'max_login_attempts', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="data_encryption"
                checked={settings.security.data_encryption}
                onChange={(e) => updateNestedSetting('security', 'data_encryption', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="data_encryption" className="ml-2 text-sm text-gray-700">
                Enable data encryption
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="audit_logging"
                checked={settings.security.audit_logging}
                onChange={(e) => updateNestedSetting('security', 'audit_logging', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="audit_logging" className="ml-2 text-sm text-gray-700">
                Enable audit logging
              </label>
            </div>
          </div>
        </div>

        {/* Portal Features */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
          <h4 className="text-md font-medium text-gray-900 mb-4">Portal Features</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="online_payments"
                checked={settings.features.online_payments}
                onChange={(e) => updateNestedSetting('features', 'online_payments', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="online_payments" className="ml-2 text-sm text-gray-700">
                Online Payments
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="maintenance_requests"
                checked={settings.features.maintenance_requests}
                onChange={(e) => updateNestedSetting('features', 'maintenance_requests', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="maintenance_requests" className="ml-2 text-sm text-gray-700">
                Maintenance Requests
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="document_uploads"
                checked={settings.features.document_uploads}
                onChange={(e) => updateNestedSetting('features', 'document_uploads', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="document_uploads" className="ml-2 text-sm text-gray-700">
                Document Uploads
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="messaging_system"
                checked={settings.features.messaging_system}
                onChange={(e) => updateNestedSetting('features', 'messaging_system', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="messaging_system" className="ml-2 text-sm text-gray-700">
                Messaging System
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="lease_documents"
                checked={settings.features.lease_documents}
                onChange={(e) => updateNestedSetting('features', 'lease_documents', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="lease_documents" className="ml-2 text-sm text-gray-700">
                Lease Documents
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="payment_history"
                checked={settings.features.payment_history}
                onChange={(e) => updateNestedSetting('features', 'payment_history', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="payment_history" className="ml-2 text-sm text-gray-700">
                Payment History
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="maintenance_history"
                checked={settings.features.maintenance_history}
                onChange={(e) => updateNestedSetting('features', 'maintenance_history', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="maintenance_history" className="ml-2 text-sm text-gray-700">
                Maintenance History
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="tenant_directory"
                checked={settings.features.tenant_directory}
                onChange={(e) => updateNestedSetting('features', 'tenant_directory', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="tenant_directory" className="ml-2 text-sm text-gray-700">
                Tenant Directory
              </label>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600" />
            Notifications
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="email_notifications"
                checked={settings.notifications.email_notifications}
                onChange={(e) => updateNestedSetting('notifications', 'email_notifications', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="email_notifications" className="ml-2 text-sm text-gray-700">
                Email Notifications
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="sms_notifications"
                checked={settings.notifications.sms_notifications}
                onChange={(e) => updateNestedSetting('notifications', 'sms_notifications', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="sms_notifications" className="ml-2 text-sm text-gray-700">
                SMS Notifications
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="push_notifications"
                checked={settings.notifications.push_notifications}
                onChange={(e) => updateNestedSetting('notifications', 'push_notifications', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="push_notifications" className="ml-2 text-sm text-gray-700">
                Push Notifications
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="maintenance_request_alerts"
                checked={settings.notifications.maintenance_request_alerts}
                onChange={(e) => updateNestedSetting('notifications', 'maintenance_request_alerts', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="maintenance_request_alerts" className="ml-2 text-sm text-gray-700">
                Maintenance Alerts
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="payment_reminder_notifications"
                checked={settings.notifications.payment_reminder_notifications}
                onChange={(e) => updateNestedSetting('notifications', 'payment_reminder_notifications', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="payment_reminder_notifications" className="ml-2 text-sm text-gray-700">
                Payment Reminders
              </label>
            </div>
          </div>
        </div>

        {/* Customization */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Customization
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Welcome Message
              </label>
              <textarea
                value={settings.customization?.welcome_message || ''}
                onChange={(e) => updateNestedSetting('customization', 'welcome_message', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Welcome message displayed on portal login..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terms of Service
              </label>
              <textarea
                value={settings.customization?.terms_of_service || ''}
                onChange={(e) => updateNestedSetting('customization', 'terms_of_service', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Terms of service content..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Privacy Policy
              </label>
              <textarea
                value={settings.customization?.privacy_policy || ''}
                onChange={(e) => updateNestedSetting('customization', 'privacy_policy', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Privacy policy content..."
              />
            </div>
          </div>
        </div>
      </div>

      {testPortalAccess && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Portal Access Test</h4>
          </div>
          <p className="text-sm text-blue-800 mt-2">
            Portal URL: {settings.portal_url || 'https://portal.example.com'} • 
            Portal Name: {settings.portal_name || 'Tenant Portal'} • 
            Status: {settings.portal_enabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
      )}
    </div>
  );
}