import { useState, useEffect } from 'react';
import { Users, Save, UserCheck, Clock, Mail } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface TenantRequestsSettingsProps {
  propertyId?: string;
  onUpdate?: () => void;
}

interface AutoAssignmentRule {
  id: string;
  type: 'manager' | 'maintenance' | 'vendor' | 'contractor';
  name: string;
  enabled: boolean;
  priority: number;
  auto_assign: boolean;
  notification_method: 'email' | 'sms' | 'both';
  assignment_conditions: {
    request_type?: string[];
    priority_level?: string[];
    time_of_day?: { start: string; end: string };
    business_hours_only?: boolean;
  };
}

interface TenantRequestsSettings {
  id?: string;
  property_id: string;
  auto_assignment_enabled: boolean;
  assignment_rules: AutoAssignmentRule[];
  default_response_time_hours: number;
  request_categories: {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    auto_assign: boolean;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }[];
  notifications: {
    new_request_alerts: boolean;
    assignment_notifications: boolean;
    status_change_notifications: boolean;
    completion_notifications: boolean;
    escalation_alerts: boolean;
  };
  workflows: {
    approval_required: boolean;
    auto_close_days: number;
    reminder_schedule: number[];
    escalation_after_hours: number;
  };
  customization: {
    request_form_fields: string[];
    required_fields: string[];
    file_upload_limits: {
      max_files: number;
      max_file_size_mb: number;
      allowed_types: string[];
    };
  };
  created_at?: string;
  updated_at?: string;
}

const defaultCategories = [
  {
    id: 'maintenance',
    name: 'Maintenance Request',
    description: 'General maintenance and repairs',
    enabled: true,
    auto_assign: true,
    priority: 'medium' as const
  },
  {
    id: 'emergency',
    name: 'Emergency',
    description: 'Urgent maintenance issues',
    enabled: true,
    auto_assign: true,
    priority: 'urgent' as const
  },
  {
    id: 'appliance',
    name: 'Appliance Issues',
    description: 'Problems with appliances',
    enabled: true,
    auto_assign: false,
    priority: 'medium' as const
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    description: 'Water, drainage, and plumbing issues',
    enabled: true,
    auto_assign: true,
    priority: 'high' as const
  },
  {
    id: 'electrical',
    name: 'Electrical',
    description: 'Electrical system issues',
    enabled: true,
    auto_assign: true,
    priority: 'high' as const
  },
  {
    id: 'hvac',
    name: 'HVAC',
    description: 'Heating, ventilation, and air conditioning',
    enabled: true,
    auto_assign: true,
    priority: 'medium' as const
  },
  {
    id: 'pest',
    name: 'Pest Control',
    description: 'Pest and wildlife issues',
    enabled: true,
    auto_assign: true,
    priority: 'medium' as const
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    description: 'Cleaning and housekeeping',
    enabled: true,
    auto_assign: false,
    priority: 'low' as const
  }
];

const defaultAssignmentRules: AutoAssignmentRule[] = [
  {
    id: 'property_manager',
    type: 'manager',
    name: 'Property Manager',
    enabled: true,
    priority: 1,
    auto_assign: true,
    notification_method: 'email',
    assignment_conditions: {
      request_type: ['all'],
      priority_level: ['urgent', 'high']
    }
  },
  {
    id: 'maintenance_team',
    type: 'maintenance',
    name: 'Maintenance Team',
    enabled: true,
    priority: 2,
    auto_assign: true,
    notification_method: 'both',
    assignment_conditions: {
      request_type: ['maintenance', 'plumbing', 'electrical', 'hvac'],
      priority_level: ['medium', 'high', 'urgent']
    }
  },
  {
    id: 'vendor_network',
    type: 'vendor',
    name: 'Preferred Vendors',
    enabled: true,
    priority: 3,
    auto_assign: false,
    notification_method: 'email',
    assignment_conditions: {
      request_type: ['specialized'],
      priority_level: ['low', 'medium']
    }
  }
];

export default function TenantRequestsSettings({ propertyId, onUpdate }: TenantRequestsSettingsProps) {
  const [settings, setSettings] = useState<TenantRequestsSettings>({
    property_id: propertyId || '',
    auto_assignment_enabled: true,
    assignment_rules: defaultAssignmentRules,
    default_response_time_hours: 24,
    request_categories: defaultCategories,
    notifications: {
      new_request_alerts: true,
      assignment_notifications: true,
      status_change_notifications: true,
      completion_notifications: true,
      escalation_alerts: true
    },
    workflows: {
      approval_required: false,
      auto_close_days: 30,
      reminder_schedule: [3, 7, 14],
      escalation_after_hours: 48
    },
    customization: {
      request_form_fields: ['description', 'photos', 'priority', 'access_notes'],
      required_fields: ['description'],
      file_upload_limits: {
        max_files: 5,
        max_file_size_mb: 10,
        allowed_types: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']
      }
    }
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'assignment' | 'categories' | 'workflows' | 'notifications'>('assignment');

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
        .from('property_tenant_requests_settings')
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
      console.error('Failed to load tenant requests settings:', error);
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
        .from('property_tenant_requests_settings')
        .upsert(settingsData);

      if (error) throw error;

      onUpdate?.();
    } catch (error) {
      console.error('Failed to save tenant requests settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof TenantRequestsSettings>(
    key: K,
    value: TenantRequestsSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateAssignmentRule = (ruleId: string, updates: Partial<AutoAssignmentRule>) => {
    setSettings(prev => ({
      ...prev,
      assignment_rules: prev.assignment_rules.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    }));
  };

  const updateCategory = (categoryId: string, updates: any) => {
    setSettings(prev => ({
      ...prev,
      request_categories: prev.request_categories.map(category =>
        category.id === categoryId ? { ...category, ...updates } : category
      )
    }));
  };

  const toggleRule = (ruleId: string) => {
    const rule = settings.assignment_rules.find(r => r.id === ruleId);
    if (rule) {
      updateAssignmentRule(ruleId, { enabled: !rule.enabled });
    }
  };

  const toggleCategory = (categoryId: string) => {
    const category = settings.request_categories.find(c => c.id === categoryId);
    if (category) {
      updateCategory(categoryId, { enabled: !category.enabled });
    }
  };

  const resetToDefaults = () => {
    setSettings(prev => ({
      ...prev,
      assignment_rules: [...defaultAssignmentRules],
      request_categories: [...defaultCategories]
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
          <Users className="w-6 h-6 text-teal-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Tenant Requests</h3>
            <p className="text-sm text-gray-600">Auto-assign new tenant requests and configure workflows</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefaults}
            className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Reset to Default
          </button>
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'assignment', label: 'Auto Assignment', icon: UserCheck },
            { key: 'categories', label: 'Request Categories', icon: Clock },
            { key: 'workflows', label: 'Workflows', icon: Users },
            { key: 'notifications', label: 'Notifications', icon: Mail },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Auto Assignment Tab */}
        {activeTab === 'assignment' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900">Auto Assignment Rules</h4>
                <p className="text-sm text-gray-600">Configure automatic assignment of tenant requests</p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_assignment_enabled"
                  checked={settings.auto_assignment_enabled}
                  onChange={(e) => updateSetting('auto_assignment_enabled', e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_assignment_enabled" className="ml-2 text-sm text-gray-700">
                  Enable auto assignment
                </label>
              </div>
            </div>

            <div className="space-y-4">
              {settings.assignment_rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`border rounded-lg p-4 ${
                    rule.enabled ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        rule.enabled ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {rule.priority}
                      </div>
                      <div>
                        <h5 className={`font-medium ${rule.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                          {rule.name}
                        </h5>
                        <p className="text-sm text-gray-500">
                          {rule.type} • {rule.auto_assign ? 'Auto-assign' : 'Manual'} • 
                          {rule.notification_method === 'email' && ' Email notifications'}
                          {rule.notification_method === 'sms' && ' SMS notifications'}
                          {rule.notification_method === 'both' && ' Email & SMS notifications'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          rule.enabled ? 'bg-teal-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            rule.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {rule.enabled && (
                    <div className="border-t pt-4 mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Auto Assign
                          </label>
                          <select
                            value={rule.auto_assign ? 'yes' : 'no'}
                            onChange={(e) => updateAssignmentRule(rule.id, { 
                              auto_assign: e.target.value === 'yes' 
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notification Method
                          </label>
                          <select
                            value={rule.notification_method}
                            onChange={(e) => updateAssignmentRule(rule.id, { 
                              notification_method: e.target.value as 'email' | 'sms' | 'both'
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            <option value="email">Email</option>
                            <option value="sms">SMS</option>
                            <option value="both">Both</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priority Level
                          </label>
                          <select
                            value={rule.assignment_conditions.priority_level?.join(',') || 'all'}
                            onChange={(e) => updateAssignmentRule(rule.id, {
                              assignment_conditions: {
                                ...rule.assignment_conditions,
                                priority_level: e.target.value === 'all' ? undefined : e.target.value.split(',')
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            <option value="all">All</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Request Types
                          </label>
                          <select
                            value={rule.assignment_conditions.request_type?.join(',') || 'all'}
                            onChange={(e) => updateAssignmentRule(rule.id, {
                              assignment_conditions: {
                                ...rule.assignment_conditions,
                                request_type: e.target.value === 'all' ? ['all'] : e.target.value.split(',')
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            <option value="all">All Types</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="emergency">Emergency</option>
                            <option value="appliance">Appliance</option>
                            <option value="plumbing">Plumbing</option>
                            <option value="electrical">Electrical</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Request Categories Tab */}
        {activeTab === 'categories' && (
          <div className="p-6">
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900">Request Categories</h4>
              <p className="text-sm text-gray-600">Configure available request categories and their properties</p>
            </div>

            <div className="space-y-4">
              {settings.request_categories.map((category) => (
                <div
                  key={category.id}
                  className={`border rounded-lg p-4 ${
                    category.enabled ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        category.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                        category.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        category.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {category.priority}
                      </div>
                      <div>
                        <h5 className={`font-medium ${category.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                          {category.name}
                        </h5>
                        <p className="text-sm text-gray-500">{category.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${category.auto_assign ? 'text-teal-600' : 'text-gray-500'}`}>
                        {category.auto_assign ? 'Auto-assign' : 'Manual'}
                      </span>
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          category.enabled ? 'bg-teal-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            category.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {category.enabled && (
                    <div className="border-t pt-4 mt-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priority
                          </label>
                          <select
                            value={category.priority}
                            onChange={(e) => updateCategory(category.id, { 
                              priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`auto_assign_${category.id}`}
                            checked={category.auto_assign}
                            onChange={(e) => updateCategory(category.id, { auto_assign: e.target.checked })}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`auto_assign_${category.id}`} className="ml-2 text-sm text-gray-700">
                            Auto-assign this category
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflows Tab */}
        {activeTab === 'workflows' && (
          <div className="p-6">
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900">Workflow Settings</h4>
              <p className="text-sm text-gray-600">Configure request workflows and automation</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Response Time (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={settings.default_response_time_hours}
                    onChange={(e) => updateSetting('default_response_time_hours', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto-close after (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.workflows.auto_close_days}
                    onChange={(e) => updateSetting('workflows', {
                      ...settings.workflows,
                      auto_close_days: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Escalation after (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={settings.workflows.escalation_after_hours}
                    onChange={(e) => updateSetting('workflows', {
                      ...settings.workflows,
                      escalation_after_hours: parseInt(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="approval_required"
                    checked={settings.workflows.approval_required}
                    onChange={(e) => updateSetting('workflows', {
                      ...settings.workflows,
                      approval_required: e.target.checked
                    })}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="approval_required" className="ml-2 text-sm text-gray-700">
                    Require approval for work completion
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reminder Schedule (days)
                  </label>
                  <div className="space-y-2">
                    {settings.workflows.reminder_schedule.map((day, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={day}
                          onChange={(e) => {
                            const newSchedule = [...settings.workflows.reminder_schedule];
                            newSchedule[index] = parseInt(e.target.value);
                            updateSetting('workflows', {
                              ...settings.workflows,
                              reminder_schedule: newSchedule
                            });
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-sm text-gray-500">days</span>
                        <button
                          onClick={() => {
                            const newSchedule = settings.workflows.reminder_schedule.filter((_, i) => i !== index);
                            updateSetting('workflows', {
                              ...settings.workflows,
                              reminder_schedule: newSchedule
                            });
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newSchedule = [...settings.workflows.reminder_schedule, 7];
                        updateSetting('workflows', {
                          ...settings.workflows,
                          reminder_schedule: newSchedule
                        });
                      }}
                      className="text-sm text-teal-600 hover:text-teal-700"
                    >
                      + Add reminder
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Upload Limits
                  </label>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max files</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={settings.customization.file_upload_limits.max_files}
                        onChange={(e) => updateSetting('customization', {
                          ...settings.customization,
                          file_upload_limits: {
                            ...settings.customization.file_upload_limits,
                            max_files: parseInt(e.target.value)
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Max file size (MB)</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={settings.customization.file_upload_limits.max_file_size_mb}
                        onChange={(e) => updateSetting('customization', {
                          ...settings.customization,
                          file_upload_limits: {
                            ...settings.customization.file_upload_limits,
                            max_file_size_mb: parseInt(e.target.value)
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="p-6">
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900">Notification Settings</h4>
              <p className="text-sm text-gray-600">Configure when and how notifications are sent</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="new_request_alerts"
                    checked={settings.notifications.new_request_alerts}
                    onChange={(e) => updateSetting('notifications', {
                      ...settings.notifications,
                      new_request_alerts: e.target.checked
                    })}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="new_request_alerts" className="ml-2 text-sm text-gray-700">
                    New request alerts
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="assignment_notifications"
                    checked={settings.notifications.assignment_notifications}
                    onChange={(e) => updateSetting('notifications', {
                      ...settings.notifications,
                      assignment_notifications: e.target.checked
                    })}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="assignment_notifications" className="ml-2 text-sm text-gray-700">
                    Assignment notifications
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="status_change_notifications"
                    checked={settings.notifications.status_change_notifications}
                    onChange={(e) => updateSetting('notifications', {
                      ...settings.notifications,
                      status_change_notifications: e.target.checked
                    })}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="status_change_notifications" className="ml-2 text-sm text-gray-700">
                    Status change notifications
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="completion_notifications"
                    checked={settings.notifications.completion_notifications}
                    onChange={(e) => updateSetting('notifications', {
                      ...settings.notifications,
                      completion_notifications: e.target.checked
                    })}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="completion_notifications" className="ml-2 text-sm text-gray-700">
                    Completion notifications
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="escalation_alerts"
                    checked={settings.notifications.escalation_alerts}
                    onChange={(e) => updateSetting('notifications', {
                      ...settings.notifications,
                      escalation_alerts: e.target.checked
                    })}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="escalation_alerts" className="ml-2 text-sm text-gray-700">
                    Escalation alerts
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}