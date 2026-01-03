import { useState, useEffect } from 'react';
import { DollarSign, Save, Plus, Trash2, Edit3 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface FeesSettingsProps {
  propertyId?: string;
  onUpdate?: () => void;
}

interface Fee {
  id: string;
  name: string;
  type: 'flat' | 'percentage' | 'monthly' | 'one_time';
  amount: number;
  percentage?: number;
  description: string;
  category: 'late_fee' | 'application_fee' | 'pet_fee' | 'security_deposit' | 'maintenance' | 'utilities' | 'other';
  auto_charge: boolean;
  grace_period_days: number;
  max_amount?: number;
  min_amount?: number;
  taxable: boolean;
  recurring: boolean;
  recurring_frequency?: 'monthly' | 'quarterly' | 'annually';
  enabled: boolean;
}

interface FeesSettings {
  id?: string;
  property_id: string;
  fees: Fee[];
  default_fees: Fee[];
  auto_fee_calculation: boolean;
  late_fee_grace_period: number;
  fee_notification_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

const defaultFees: Fee[] = [
  {
    id: 'late_fee_flat',
    name: 'Late Fee - Flat',
    type: 'flat',
    amount: 50,
    description: 'Flat fee charged for late rent payments',
    category: 'late_fee',
    auto_charge: true,
    grace_period_days: 5,
    taxable: false,
    recurring: false,
    enabled: true
  },
  {
    id: 'late_fee_percentage',
    name: 'Late Fee - Percentage',
    type: 'percentage',
    percentage: 5,
    description: 'Percentage of monthly rent as late fee',
    category: 'late_fee',
    auto_charge: true,
    grace_period_days: 5,
    max_amount: 100,
    taxable: false,
    recurring: false,
    enabled: true
  },
  {
    id: 'application_fee',
    name: 'Application Fee',
    type: 'one_time',
    amount: 50,
    description: 'Fee charged for rental application processing',
    category: 'application_fee',
    auto_charge: false,
    grace_period_days: 0,
    taxable: false,
    recurring: false,
    enabled: true
  },
  {
    id: 'pet_fee',
    name: 'Pet Fee',
    type: 'one_time',
    amount: 300,
    description: 'One-time pet fee',
    category: 'pet_fee',
    auto_charge: false,
    grace_period_days: 0,
    min_amount: 0,
    max_amount: 1000,
    taxable: false,
    recurring: false,
    enabled: true
  },
  {
    id: 'pet_rent',
    name: 'Pet Rent',
    type: 'monthly',
    amount: 25,
    description: 'Monthly pet rent',
    category: 'pet_fee',
    auto_charge: true,
    grace_period_days: 0,
    taxable: false,
    recurring: true,
    recurring_frequency: 'monthly',
    enabled: false
  }
];

export default function FeesSettings({ propertyId, onUpdate }: FeesSettingsProps) {
  const [settings, setSettings] = useState<FeesSettings>({
    property_id: propertyId || '',
    fees: defaultFees,
    default_fees: defaultFees,
    auto_fee_calculation: true,
    late_fee_grace_period: 5,
    fee_notification_enabled: true
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingFee, setEditingFee] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

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
        .from('property_fees_settings')
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
      console.error('Failed to load fees settings:', error);
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
        .from('property_fees_settings')
        .upsert(settingsData);

      if (error) throw error;

      onUpdate?.();
    } catch (error) {
      console.error('Failed to save fees settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof FeesSettings>(
    key: K,
    value: FeesSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateFee = (feeId: string, updates: Partial<Fee>) => {
    setSettings(prev => ({
      ...prev,
      fees: prev.fees.map(fee =>
        fee.id === feeId ? { ...fee, ...updates } : fee
      )
    }));
  };

  const addCustomFee = () => {
    const newFee: Fee = {
      id: `custom_${Date.now()}`,
      name: 'New Fee',
      type: 'flat',
      amount: 0,
      description: 'Custom fee description',
      category: 'other',
      auto_charge: false,
      grace_period_days: 0,
      taxable: false,
      recurring: false,
      enabled: true
    };

    setSettings(prev => ({
      ...prev,
      fees: [...prev.fees, newFee]
    }));
    setEditingFee(newFee.id);
  };

  const removeFee = (feeId: string) => {
    if (feeId.startsWith('custom_')) {
      setSettings(prev => ({
        ...prev,
        fees: prev.fees.filter(fee => fee.id !== feeId)
      }));
      if (editingFee === feeId) {
        setEditingFee(null);
      }
    }
  };

  const resetToDefaults = () => {
    setSettings(prev => ({
      ...prev,
      fees: [...prev.default_fees]
    }));
  };

  const getFeeTypeIcon = (type: string) => {
    switch (type) {
      case 'flat':
      case 'one_time':
        return '$';
      case 'percentage':
        return '%';
      case 'monthly':
        return '📅';
      default:
        return '$';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'late_fee':
        return 'bg-red-100 text-red-800';
      case 'application_fee':
        return 'bg-blue-100 text-blue-800';
      case 'pet_fee':
        return 'bg-purple-100 text-purple-800';
      case 'security_deposit':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'utilities':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          <DollarSign className="w-6 h-6 text-teal-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Fees Settings</h3>
            <p className="text-sm text-gray-600">Manage property fees and charges</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">General Fee Settings</h4>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto_fee_calculation"
                checked={settings.auto_fee_calculation}
                onChange={(e) => updateSetting('auto_fee_calculation', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="auto_fee_calculation" className="ml-2 text-sm text-gray-700">
                Enable automatic fee calculation
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Late Fee Grace Period (days)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={settings.late_fee_grace_period}
                onChange={(e) => updateSetting('late_fee_grace_period', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="fee_notification"
                checked={settings.fee_notification_enabled}
                onChange={(e) => updateSetting('fee_notification_enabled', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="fee_notification" className="ml-2 text-sm text-gray-700">
                Enable fee notifications
              </label>
            </div>
          </div>
        </div>

        {/* Quick Add Fee */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Add New Fee</h4>
          <button
            onClick={addCustomFee}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" />
            Add Custom Fee
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Create custom fees for your property
          </p>
        </div>
      </div>

      {/* Fees List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-md font-medium text-gray-900">Property Fees</h4>
          <p className="text-sm text-gray-600 mt-1">
            Configure all fees and charges for this property
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {settings.fees.map((fee) => (
              <div
                key={fee.id}
                className={`border rounded-lg p-4 ${
                  fee.enabled ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-lg">
                      {getFeeTypeIcon(fee.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className={`font-medium ${fee.enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                          {fee.name}
                        </h5>
                        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(fee.category)}`}>
                          {fee.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className={`text-sm ${fee.enabled ? 'text-gray-600' : 'text-gray-400'}`}>
                        {fee.description}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className={`text-sm ${fee.enabled ? 'text-gray-700' : 'text-gray-400'}`}>
                          {fee.type === 'flat' && `$${fee.amount.toFixed(2)}`}
                          {fee.type === 'percentage' && `${fee.percentage}%`}
                          {fee.type === 'one_time' && `$${fee.amount.toFixed(2)} one-time`}
                          {fee.type === 'monthly' && `$${fee.amount.toFixed(2)}/month`}
                          {fee.recurring && fee.recurring_frequency && (
                            <span className="text-xs text-gray-500">
                              • {fee.recurring_frequency}
                            </span>
                          )}
                        </span>
                        {fee.auto_charge && (
                          <span className="text-xs text-teal-600 bg-teal-100 px-2 py-1 rounded">
                            Auto-charge
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingFee(editingFee === fee.id ? null : fee.id)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {fee.id.startsWith('custom_') && (
                      <button
                        onClick={() => removeFee(fee.id)}
                        className="p-2 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => updateFee(fee.id, { enabled: !fee.enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        fee.enabled ? 'bg-teal-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          fee.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {editingFee === fee.id && (
                  <div className="border-t pt-4 mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fee Name
                        </label>
                        <input
                          type="text"
                          value={fee.name}
                          onChange={(e) => updateFee(fee.id, { name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={fee.type}
                          onChange={(e) => updateFee(fee.id, { 
                            type: e.target.value as any,
                            recurring: e.target.value === 'monthly' ? true : fee.recurring,
                            recurring_frequency: e.target.value === 'monthly' ? 'monthly' : fee.recurring_frequency
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                          <option value="flat">Flat Fee</option>
                          <option value="percentage">Percentage</option>
                          <option value="one_time">One-time</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>

                      {fee.type === 'flat' || fee.type === 'one_time' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={fee.amount}
                            onChange={(e) => updateFee(fee.id, { amount: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      ) : fee.type === 'percentage' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Percentage (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={fee.percentage || 0}
                            onChange={(e) => updateFee(fee.id, { percentage: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Monthly Amount ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={fee.amount}
                            onChange={(e) => updateFee(fee.id, { amount: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          value={fee.category}
                          onChange={(e) => updateFee(fee.id, { category: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                          <option value="late_fee">Late Fee</option>
                          <option value="application_fee">Application Fee</option>
                          <option value="pet_fee">Pet Fee</option>
                          <option value="security_deposit">Security Deposit</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="utilities">Utilities</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={fee.description}
                        onChange={(e) => updateFee(fee.id, { description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Describe this fee..."
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`auto_charge_${fee.id}`}
                          checked={fee.auto_charge}
                          onChange={(e) => updateFee(fee.id, { auto_charge: e.target.checked })}
                          className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`auto_charge_${fee.id}`} className="ml-2 text-sm text-gray-700">
                          Auto-charge
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`taxable_${fee.id}`}
                          checked={fee.taxable}
                          onChange={(e) => updateFee(fee.id, { taxable: e.target.checked })}
                          className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`taxable_${fee.id}`} className="ml-2 text-sm text-gray-700">
                          Taxable
                        </label>
                      </div>

                      {fee.type === 'monthly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Frequency
                          </label>
                          <select
                            value={fee.recurring_frequency || 'monthly'}
                            onChange={(e) => updateFee(fee.id, { recurring_frequency: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="annually">Annually</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Amount ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={fee.min_amount || ''}
                          onChange={(e) => updateFee(fee.id, { 
                            min_amount: e.target.value ? parseFloat(e.target.value) : undefined 
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="No minimum"
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
                          value={fee.max_amount || ''}
                          onChange={(e) => updateFee(fee.id, { 
                            max_amount: e.target.value ? parseFloat(e.target.value) : undefined 
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="No maximum"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}