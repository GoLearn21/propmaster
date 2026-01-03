import { useState, useEffect } from 'react';
import { CreditCard, Save, DollarSign, Banknote, Smartphone } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface PaymentInstructionsSettingsProps {
  propertyId?: string;
  onUpdate?: () => void;
}

interface PaymentMethod {
  id: string;
  type: 'online' | 'bank_transfer' | 'check' | 'cash' | 'money_order';
  name: string;
  enabled: boolean;
  instructions: string;
  fees?: number;
  processing_time?: string;
  account_details?: {
    account_name?: string;
    account_number?: string;
    routing_number?: string;
    bank_name?: string;
    address?: string;
  };
}

interface PaymentInstructionsSettings {
  id?: string;
  property_id: string;
  primary_payment_methods: PaymentMethod[];
  accepted_payment_types: string[];
  rent_due_day: number;
  late_fee_grace_period: number;
  auto_allocation_enabled: boolean;
  allocation_priority: string[];
  require_receipt_number: boolean;
  payment_address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    po_box?: string;
  };
  online_portal_info?: {
    portal_url?: string;
    portal_instructions?: string;
  };
  bank_account_info?: {
    account_name?: string;
    account_number?: string;
    routing_number?: string;
    bank_name?: string;
    address?: string;
  };
  created_at?: string;
  updated_at?: string;
}

const defaultPaymentMethods: PaymentMethod[] = [
  {
    id: 'online_portal',
    type: 'online',
    name: 'Online Payment Portal',
    enabled: true,
    instructions: 'Pay securely online through your tenant portal using a credit card, debit card, or ACH bank transfer.',
    fees: 0,
    processing_time: 'Instant'
  },
  {
    id: 'bank_transfer',
    type: 'bank_transfer',
    name: 'Bank Transfer',
    enabled: true,
    instructions: 'Send payment directly from your bank account using online banking or mobile app.',
    processing_time: '1-3 business days'
  },
  {
    id: 'check',
    type: 'check',
    name: 'Personal Check',
    enabled: true,
    instructions: 'Mail or drop off a personal check made payable to the property management company.',
    processing_time: '3-5 business days'
  },
  {
    id: 'money_order',
    type: 'money_order',
    name: 'Money Order',
    enabled: false,
    instructions: 'Purchase a money order and mail it to the property address.',
    processing_time: '3-5 business days'
  },
  {
    id: 'cash',
    type: 'cash',
    name: 'Cash Payment',
    enabled: false,
    instructions: 'Cash payments are not accepted.',
    processing_time: 'Instant'
  }
];

export default function PaymentInstructionsSettings({ propertyId, onUpdate }: PaymentInstructionsSettingsProps) {
  const [settings, setSettings] = useState<PaymentInstructionsSettings>({
    property_id: propertyId || '',
    primary_payment_methods: defaultPaymentMethods,
    accepted_payment_types: ['online', 'bank_transfer', 'check'],
    rent_due_day: 1,
    late_fee_grace_period: 5,
    auto_allocation_enabled: true,
    allocation_priority: ['rent', 'fees', 'utilities', 'other'],
    require_receipt_number: false
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingMethod, setEditingMethod] = useState<string | null>(null);

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
        .from('property_payment_instructions')
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
      console.error('Failed to load payment instruction settings:', error);
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
        .from('property_payment_instructions')
        .upsert(settingsData);

      if (error) throw error;

      onUpdate?.();
    } catch (error) {
      console.error('Failed to save payment instruction settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PaymentInstructionsSettings>(
    key: K,
    value: PaymentInstructionsSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updatePaymentMethod = (methodId: string, updates: Partial<PaymentMethod>) => {
    setSettings(prev => ({
      ...prev,
      primary_payment_methods: prev.primary_payment_methods.map(method =>
        method.id === methodId ? { ...method, ...updates } : method
      )
    }));
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <Smartphone className="w-5 h-5" />;
      case 'bank_transfer':
        return <Banknote className="w-5 h-5" />;
      case 'check':
        return <CreditCard className="w-5 h-5" />;
      case 'cash':
        return <DollarSign className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
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
          <CreditCard className="w-6 h-6 text-teal-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Payment Instructions</h3>
            <p className="text-sm text-gray-600">Specify how tenants should make rent payments</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Payment Schedule</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rent Due Day
              </label>
              <select
                value={settings.rent_due_day}
                onChange={(e) => updateSetting('rent_due_day', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>Day {day} of the month</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Late Fee Grace Period (days)
              </label>
              <input
                type="number"
                min="0"
                max="15"
                value={settings.late_fee_grace_period}
                onChange={(e) => updateSetting('late_fee_grace_period', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

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
                id="require_receipt"
                checked={settings.require_receipt_number}
                onChange={(e) => updateSetting('require_receipt_number', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="require_receipt" className="ml-2 text-sm text-gray-700">
                Require receipt number for payments
              </label>
            </div>
          </div>
        </div>

        {/* Payment Address */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Payment Mailing Address</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={settings.payment_address?.street || ''}
                onChange={(e) => updateSetting('payment_address', {
                  ...settings.payment_address,
                  street: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={settings.payment_address?.city || ''}
                  onChange={(e) => updateSetting('payment_address', {
                    ...settings.payment_address,
                    city: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={settings.payment_address?.state || ''}
                  onChange={(e) => updateSetting('payment_address', {
                    ...settings.payment_address,
                    state: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="State"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                value={settings.payment_address?.zip || ''}
                onChange={(e) => updateSetting('payment_address', {
                  ...settings.payment_address,
                  zip: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                P.O. Box (Optional)
              </label>
              <input
                type="text"
                value={settings.payment_address?.po_box || ''}
                onChange={(e) => updateSetting('payment_address', {
                  ...settings.payment_address,
                  po_box: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="P.O. Box 123"
              />
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
          <h4 className="text-md font-medium text-gray-900 mb-4">Payment Methods</h4>
          <div className="space-y-4">
            {settings.primary_payment_methods.map((method) => (
              <div key={method.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600">
                      {getPaymentMethodIcon(method.type)}
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900">{method.name}</h5>
                      <p className="text-sm text-gray-500">
                        {method.processing_time && `Processing time: ${method.processing_time}`}
                        {method.fees !== undefined && ` • Fee: $${method.fees}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`method-${method.id}`}
                      checked={method.enabled}
                      onChange={(e) => updatePaymentMethod(method.id, { enabled: e.target.checked })}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`method-${method.id}`} className="text-sm text-gray-700">
                      Enabled
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions for Tenants
                  </label>
                  <textarea
                    value={method.instructions}
                    onChange={(e) => updatePaymentMethod(method.id, { instructions: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter payment instructions..."
                  />
                </div>

                {method.type === 'bank_transfer' && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Name
                      </label>
                      <input
                        type="text"
                        value={settings.bank_account_info?.account_name || ''}
                        onChange={(e) => updateSetting('bank_account_info', {
                          ...settings.bank_account_info,
                          account_name: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Account Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={settings.bank_account_info?.bank_name || ''}
                        onChange={(e) => updateSetting('bank_account_info', {
                          ...settings.bank_account_info,
                          bank_name: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Bank Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={settings.bank_account_info?.account_number || ''}
                        onChange={(e) => updateSetting('bank_account_info', {
                          ...settings.bank_account_info,
                          account_number: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Account Number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Routing Number
                      </label>
                      <input
                        type="text"
                        value={settings.bank_account_info?.routing_number || ''}
                        onChange={(e) => updateSetting('bank_account_info', {
                          ...settings.bank_account_info,
                          routing_number: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="Routing Number"
                      />
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