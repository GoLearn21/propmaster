import { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface CustomAllocationsSettingsProps {
  propertyId?: string;
  onUpdate?: () => void;
}

interface AllocationRule {
  id: string;
  name: string;
  description: string;
  allocation_order: number;
  enabled: boolean;
  conditions: {
    amount_type: 'fixed' | 'percentage' | 'remaining';
    amount_value: number;
    min_amount?: number;
    max_amount?: number;
    category?: string;
  };
  priority: number;
}

interface CustomAllocationSettings {
  id?: string;
  property_id: string;
  auto_allocation_enabled: boolean;
  allocation_rules: AllocationRule[];
  default_rules: AllocationRule[];
  manual_override_allowed: boolean;
  created_at?: string;
  updated_at?: string;
}

const defaultAllocationRules: AllocationRule[] = [
  {
    id: 'rent',
    name: 'Rent',
    description: 'First apply to current month rent',
    allocation_order: 1,
    enabled: true,
    conditions: {
      amount_type: 'fixed',
      amount_value: 0,
      category: 'rent'
    },
    priority: 1
  },
  {
    id: 'late_fees',
    name: 'Late Fees',
    description: 'Apply to any outstanding late fees',
    allocation_order: 2,
    enabled: true,
    conditions: {
      amount_type: 'fixed',
      amount_value: 0,
      category: 'fees'
    },
    priority: 2
  },
  {
    id: 'utilities',
    name: 'Utilities',
    description: 'Apply to utility charges',
    allocation_order: 3,
    enabled: false,
    conditions: {
      amount_type: 'fixed',
      amount_value: 0,
      category: 'utilities'
    },
    priority: 3
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    description: 'Apply to maintenance charges',
    allocation_order: 4,
    enabled: false,
    conditions: {
      amount_type: 'fixed',
      amount_value: 0,
      category: 'maintenance'
    },
    priority: 4
  },
  {
    id: 'security_deposit',
    name: 'Security Deposit',
    description: 'Apply to security deposit account',
    allocation_order: 5,
    enabled: false,
    conditions: {
      amount_type: 'fixed',
      amount_value: 0,
      category: 'deposit'
    },
    priority: 5
  },
  {
    id: 'pet_fees',
    name: 'Pet Fees',
    description: 'Apply to pet-related charges',
    allocation_order: 6,
    enabled: false,
    conditions: {
      amount_type: 'fixed',
      amount_value: 0,
      category: 'pet_fees'
    },
    priority: 6
  },
  {
    id: 'other',
    name: 'Other Charges',
    description: 'Apply to any remaining charges',
    allocation_order: 7,
    enabled: true,
    conditions: {
      amount_type: 'remaining',
      amount_value: 0,
      category: 'other'
    },
    priority: 7
  }
];

export default function CustomAllocationsSettings({ propertyId, onUpdate }: CustomAllocationsSettingsProps) {
  const [settings, setSettings] = useState<CustomAllocationSettings>({
    property_id: propertyId || '',
    auto_allocation_enabled: true,
    allocation_rules: defaultAllocationRules,
    default_rules: defaultAllocationRules,
    manual_override_allowed: true
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');

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
        .from('property_custom_allocations')
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
      console.error('Failed to load custom allocation settings:', error);
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
        .from('property_custom_allocations')
        .upsert(settingsData);

      if (error) throw error;

      onUpdate?.();
    } catch (error) {
      console.error('Failed to save custom allocation settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof CustomAllocationSettings>(
    key: K,
    value: CustomAllocationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateAllocationRule = (ruleId: string, updates: Partial<AllocationRule>) => {
    setSettings(prev => ({
      ...prev,
      allocation_rules: prev.allocation_rules.map(rule =>
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    }));
  };

  const toggleRule = (ruleId: string) => {
    updateAllocationRule(ruleId, { enabled: !settings.allocation_rules.find(r => r.id === ruleId)?.enabled });
  };

  const moveRule = (ruleId: string, direction: 'up' | 'down') => {
    const rules = [...settings.allocation_rules];
    const currentIndex = rules.findIndex(r => r.id === ruleId);
    
    if (
      (direction === 'up' && currentIndex > 0) ||
      (direction === 'down' && currentIndex < rules.length - 1)
    ) {
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      [rules[currentIndex], rules[newIndex]] = [rules[newIndex], rules[currentIndex]];
      
      // Update allocation_order for all rules
      rules.forEach((rule, index) => {
        rule.allocation_order = index + 1;
        rule.priority = index + 1;
      });
      
      setSettings(prev => ({ ...prev, allocation_rules: rules }));
    }
  };

  const addCustomRule = () => {
    if (newRuleName.trim()) {
      const newRule: AllocationRule = {
        id: `custom_${Date.now()}`,
        name: newRuleName.trim(),
        description: newRuleDescription.trim() || 'Custom allocation rule',
        allocation_order: settings.allocation_rules.length + 1,
        enabled: true,
        conditions: {
          amount_type: 'fixed',
          amount_value: 0,
          category: 'custom'
        },
        priority: settings.allocation_rules.length + 1
      };

      setSettings(prev => ({
        ...prev,
        allocation_rules: [...prev.allocation_rules, newRule]
      }));
      
      setNewRuleName('');
      setNewRuleDescription('');
    }
  };

  const removeRule = (ruleId: string) => {
    setSettings(prev => ({
      ...prev,
      allocation_rules: prev.allocation_rules.filter(rule => rule.id !== ruleId)
    }));
  };

  const resetToDefault = () => {
    setSettings(prev => ({
      ...prev,
      allocation_rules: [...prev.default_rules]
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
          <Settings className="w-6 h-6 text-teal-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Custom Allocations</h3>
            <p className="text-sm text-gray-600">Create custom payment allocation rules and presets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefault}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Allocation Settings</h4>
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

            <div className="flex items-center">
              <input
                type="checkbox"
                id="manual_override"
                checked={settings.manual_override_allowed}
                onChange={(e) => updateSetting('manual_override_allowed', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="manual_override" className="ml-2 text-sm text-gray-700">
                Allow manual allocation override
              </label>
            </div>
          </div>
        </div>

        {/* Add Custom Rule */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Add Custom Rule</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name
              </label>
              <input
                type="text"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter rule name..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newRuleDescription}
                onChange={(e) => setNewRuleDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Describe this allocation rule..."
              />
            </div>

            <button
              onClick={addCustomRule}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              <Plus className="w-4 h-4" />
              Add Custom Rule
            </button>
          </div>
        </div>

        {/* Allocation Rules */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
          <h4 className="text-md font-medium text-gray-900 mb-4">Allocation Rules (Applied in Order)</h4>
          <p className="text-sm text-gray-600 mb-4">
            Rules are applied in priority order. Disable rules you don't want to use.
          </p>
          
          <div className="space-y-3">
            {settings.allocation_rules.map((rule, index) => (
              <div
                key={rule.id}
                className={`border rounded-lg p-4 ${
                  rule.enabled ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      rule.enabled ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {rule.allocation_order}
                    </div>
                    <div>
                      <h5 className={`font-medium ${rule.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                        {rule.name}
                      </h5>
                      <p className={`text-sm ${rule.enabled ? 'text-gray-600' : 'text-gray-400'}`}>
                        {rule.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Move buttons */}
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveRule(rule.id, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveRule(rule.id, 'down')}
                        disabled={index === settings.allocation_rules.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Enable/Disable toggle */}
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

                    {/* Remove button (only for custom rules) */}
                    {rule.id.startsWith('custom_') && (
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Rule conditions */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount Type
                    </label>
                    <select
                      value={rule.conditions.amount_type}
                      onChange={(e) => updateAllocationRule(rule.id, {
                        conditions: {
                          ...rule.conditions,
                          amount_type: e.target.value as 'fixed' | 'percentage' | 'remaining'
                        }
                      })}
                      disabled={!rule.enabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                      <option value="remaining">Remaining Balance</option>
                    </select>
                  </div>

                  {rule.conditions.amount_type !== 'remaining' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount Value
                        {rule.conditions.amount_type === 'percentage' && '%'}
                        {rule.conditions.amount_type === 'fixed' && '$'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step={rule.conditions.amount_type === 'percentage' ? '0.1' : '0.01'}
                        max={rule.conditions.amount_type === 'percentage' ? '100' : undefined}
                        value={rule.conditions.amount_value}
                        onChange={(e) => updateAllocationRule(rule.id, {
                          conditions: {
                            ...rule.conditions,
                            amount_value: parseFloat(e.target.value)
                          }
                        })}
                        disabled={!rule.enabled}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={rule.conditions.category || ''}
                      onChange={(e) => updateAllocationRule(rule.id, {
                        conditions: {
                          ...rule.conditions,
                          category: e.target.value
                        }
                      })}
                      disabled={!rule.enabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                      placeholder="e.g., rent, fees, utilities"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}