import { useState, useEffect } from 'react';
import { Share, Save, Toggle, RotateCcw } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface PaymentAllocationSettingsProps {
  propertyId?: string;
  onUpdate?: () => void;
}

interface PaymentAllocationSettings {
  id?: string;
  property_id: string;
  auto_allocation_enabled: boolean;
  allocation_method: 'fifo' | 'priority' | 'custom' | 'equal_distribution';
  default_priorities: string[];
  split_payments_allowed: boolean;
  partial_payments_allowed: boolean;
  minimum_partial_payment: number;
  allocation_rules: {
    rule_type: string;
    enabled: boolean;
    priority: number;
    conditions: Record<string, any>;
  }[];
  bank_account_routing: {
    primary_account?: string;
    backup_account?: string;
    split_percentage?: number;
  };
  notifications: {
    allocation_confirmation: boolean;
    allocation_dispute: boolean;
    landlord_notification: boolean;
  };
  created_at?: string;
  updated_at?: string;
}

export default function PaymentAllocationSettings({ propertyId, onUpdate }: PaymentAllocationSettingsProps) {
  const [settings, setSettings] = useState<PaymentAllocationSettings>({
    property_id: propertyId || '',
    auto_allocation_enabled: true,
    allocation_method: 'fifo',
    default_priorities: ['rent', 'fees', 'utilities', 'maintenance', 'other'],
    split_payments_allowed: true,
    partial_payments_allowed: true,
    minimum_partial_payment: 25,
    allocation_rules: [
      {
        rule_type: 'rent_allocation',
        enabled: true,
        priority: 1,
        conditions: { category: 'rent', max_amount: null }
      },
      {
        rule_type: 'fee_allocation',
        enabled: true,
        priority: 2,
        conditions: { category: 'fees', max_amount: null }
      },
      {
        rule_type: 'utility_allocation',
        enabled: false,
        priority: 3,
        conditions: { category: 'utilities', max_amount: null }
      }
    ],
    bank_account_routing: {
      primary_account: '',
      backup_account: '',
      split_percentage: 0
    },
    notifications: {
      allocation_confirmation: true,
      allocation_dispute: false,
      landlord_notification: true
    }
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
        .from('property_payment_allocation')
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
      console.error('Failed to load payment allocation settings:', error);
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
        .from('property_payment_allocation')
        .upsert(settingsData);

      if (error) throw error;

      onUpdate?.();
    } catch (error) {
      console.error('Failed to save payment allocation settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PaymentAllocationSettings>(
    key: K,
    value: PaymentAllocationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateAllocationRule = (ruleType: string, updates: any) => {
    setSettings(prev => ({
      ...prev,
      allocation_rules: prev.allocation_rules.map(rule =>
        rule.rule_type === ruleType ? { ...rule, ...updates } : rule
      )
    }));
  };

  const toggleRule = (ruleType: string) => {
    const rule = settings.allocation_rules.find(r => r.rule_type === ruleType);
    if (rule) {
      updateAllocationRule(ruleType, { enabled: !rule.enabled });
    }
  };

  const resetToDefaults = () => {
    setSettings(prev => ({
      ...prev,
      auto_allocation_enabled: true,
      allocation_method: 'fifo' as const,
      split_payments_allowed: true,
      partial_payments_allowed: true
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
          <Share className="w-6 h-6 text-teal-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Allocation</h3>
            <p className="text-sm text-gray-600">Configure automatic payment receiving and distribution</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Allocation Settings */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">General Settings</h4>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto_allocation"
                checked={settings.auto_allocation_enabled}
                onChange={(e) => updateSetting('auto_allocation_enabled', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="auto_allocation" className="ml-2 text-sm text-gray-700">
                Enable automatic payment allocation
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allocation Method
              </label>
              <select
                value={settings.allocation_method}
                onChange={(e) => updateSetting('allocation_method', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="fifo">First In, First Out</option>
                <option value="priority">Priority Based</option>
                <option value="custom">Custom Rules</option>
                <option value="equal_distribution">Equal Distribution</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {settings.allocation_method === 'fifo' && 'Allocate to oldest unpaid charges first'}
                {settings.allocation_method === 'priority' && 'Allocate based on set priorities'}
                {settings.allocation_method === 'custom' && 'Use custom allocation rules'}
                {settings.allocation_method === 'equal_distribution' && 'Distribute payment equally across all charges'}
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="split_payments"
                checked={settings.split_payments_allowed}
                onChange={(e) => updateSetting('split_payments_allowed', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="split_payments" className="ml-2 text-sm text-gray-700">
                Allow split payments
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="partial_payments"
                checked={settings.partial_payments_allowed}
                onChange={(e) => updateSetting('partial_payments_allowed', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="partial_payments" className="ml-2 text-sm text-gray-700">
                Accept partial payments
              </label>
            </div>

            {settings.partial_payments_allowed && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Partial Payment ($)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={settings.minimum_partial_payment}
                  onChange={(e) => updateSetting('minimum_partial_payment', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bank Account Routing */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Bank Account Routing</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Account ID
              </label>
              <input
                type="text"
                value={settings.bank_account_routing.primary_account || ''}
                onChange={(e) => updateSetting('bank_account_routing', {
                  ...settings.bank_account_routing,
                  primary_account: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Primary account identifier"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Backup Account ID
              </label>
              <input
                type="text"
                value={settings.bank_account_routing.backup_account || ''}
                onChange={(e) => updateSetting('bank_account_routing', {
                  ...settings.bank_account_routing,
                  backup_account: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Backup account identifier (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Split Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={settings.bank_account_routing.split_percentage || 0}
                onChange={(e) => updateSetting('bank_account_routing', {
                  ...settings.bank_account_routing,
                  split_percentage: parseInt(e.target.value)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Percentage to route to primary account (remaining goes to backup)
              </p>
            </div>
          </div>
        </div>

        {/* Allocation Rules */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
          <h4 className="text-md font-medium text-gray-900 mb-4">Allocation Rules</h4>
          <p className="text-sm text-gray-600 mb-4">
            Define which charges get priority when allocating payments
          </p>
          
          <div className="space-y-4">
            {settings.allocation_rules.map((rule) => (
              <div key={rule.rule_type} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600">
                      <span className="text-sm font-medium">#{rule.priority}</span>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 capitalize">
                        {rule.rule_type.replace('_', ' ')}
                      </h5>
                      <p className="text-sm text-gray-500">
                        {rule.rule_type === 'rent_allocation' && 'Allocate to current month rent first'}
                        {rule.rule_type === 'fee_allocation' && 'Allocate to fees and charges'}
                        {rule.rule_type === 'utility_allocation' && 'Allocate to utility charges'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleRule(rule.rule_type)}
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={rule.priority}
                      onChange={(e) => updateAllocationRule(rule.rule_type, {
                        priority: parseInt(e.target.value)
                      })}
                      disabled={!rule.enabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={rule.conditions.category || ''}
                      onChange={(e) => updateAllocationRule(rule.rule_type, {
                        conditions: {
                          ...rule.conditions,
                          category: e.target.value
                        }
                      })}
                      disabled={!rule.enabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      placeholder="Category name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Amount ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rule.conditions.max_amount || ''}
                      onChange={(e) => updateAllocationRule(rule.rule_type, {
                        conditions: {
                          ...rule.conditions,
                          max_amount: e.target.value ? parseFloat(e.target.value) : null
                        }
                      })}
                      disabled={!rule.enabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      placeholder="No limit"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
          <h4 className="text-md font-medium text-gray-900 mb-4">Notifications</h4>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allocation_confirmation"
                checked={settings.notifications.allocation_confirmation}
                onChange={(e) => updateSetting('notifications', {
                  ...settings.notifications,
                  allocation_confirmation: e.target.checked
                })}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="allocation_confirmation" className="ml-2 text-sm text-gray-700">
                Send allocation confirmation to tenants
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="allocation_dispute"
                checked={settings.notifications.allocation_dispute}
                onChange={(e) => updateSetting('notifications', {
                  ...settings.notifications,
                  allocation_dispute: e.target.checked
                })}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="allocation_dispute" className="ml-2 text-sm text-gray-700">
                Allow allocation dispute notifications
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="landlord_notification"
                checked={settings.notifications.landlord_notification}
                onChange={(e) => updateSetting('notifications', {
                  ...settings.notifications,
                  landlord_notification: e.target.checked
                })}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="landlord_notification" className="ml-2 text-sm text-gray-700">
                Notify landlord of allocation changes
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}