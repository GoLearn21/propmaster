import { useState, useEffect } from 'react';
import { Settings, FileText, DollarSign, Calendar, AlertTriangle, Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface PropertyLeaseSettingsProps {
  propertyId?: string;
  onSettingsUpdate?: () => void;
}

interface LeaseSettings {
  id?: string;
  property_id: string;
  auto_lease_renewal: boolean;
  renewal_notice_days: number;
  default_lease_term: number;
  default_security_deposit_months: number;
  late_fee_type: 'flat' | 'percentage';
  late_fee_amount: number;
  grace_period_days: number;
  pet_policy: 'allowed' | 'not_allowed' | 'conditional';
  pet_deposit: number;
  smoking_policy: 'allowed' | 'not_allowed' | 'designated_areas';
  guest_policy_days: number;
  maintenance_policy: string;
  utility_policy: string;
  parking_policy: string;
  created_at?: string;
  updated_at?: string;
}

export default function PropertyLeaseSettings({ propertyId, onSettingsUpdate }: PropertyLeaseSettingsProps) {
  const [settings, setSettings] = useState<LeaseSettings>({
    property_id: propertyId || '',
    auto_lease_renewal: false,
    renewal_notice_days: 60,
    default_lease_term: 12,
    default_security_deposit_months: 1,
    late_fee_type: 'flat',
    late_fee_amount: 50,
    grace_period_days: 5,
    pet_policy: 'conditional',
    pet_deposit: 300,
    smoking_policy: 'not_allowed',
    guest_policy_days: 7,
    maintenance_policy: 'Standard maintenance policy applies',
    utility_policy: 'Tenant responsible for utilities unless specified',
    parking_policy: 'One parking space per unit included'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'general' | 'fees' | 'policies'>('general');

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
        .from('property_lease_settings')
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
      console.error('Failed to load settings:', error);
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
        .from('property_lease_settings')
        .upsert(settingsData);

      if (error) throw error;

      onSettingsUpdate?.();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof LeaseSettings>(key: K, value: LeaseSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lease Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure default lease terms and policies for this property
          </p>
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

      {/* Section Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'general', label: 'General Settings', icon: Settings },
            { key: 'fees', label: 'Fees & Deposits', icon: DollarSign },
            { key: 'policies', label: 'Policies', icon: FileText },
          ].map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Section Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeSection === 'general' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">General Lease Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Lease Term (months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.default_lease_term}
                  onChange={(e) => updateSetting('default_lease_term', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Renewal Notice Period (days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="120"
                  value={settings.renewal_notice_days}
                  onChange={(e) => updateSetting('renewal_notice_days', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grace Period (days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={settings.grace_period_days}
                  onChange={(e) => updateSetting('grace_period_days', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_renewal"
                  checked={settings.auto_lease_renewal}
                  onChange={(e) => updateSetting('auto_lease_renewal', e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_renewal" className="ml-2 text-sm text-gray-700">
                  Enable automatic lease renewal
                </label>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'fees' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Fees & Deposits</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Security Deposit (months of rent)
                </label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  step="0.5"
                  value={settings.default_security_deposit_months}
                  onChange={(e) => updateSetting('default_security_deposit_months', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pet Deposit ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.pet_deposit}
                  onChange={(e) => updateSetting('pet_deposit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Late Fee Type
                </label>
                <select
                  value={settings.late_fee_type}
                  onChange={(e) => updateSetting('late_fee_type', e.target.value as 'flat' | 'percentage')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="flat">Flat Fee</option>
                  <option value="percentage">Percentage of Rent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Late Fee Amount
                  {settings.late_fee_type === 'percentage' && '%'}
                  {settings.late_fee_type === 'flat' && '$'}
                </label>
                <input
                  type="number"
                  min="0"
                  step={settings.late_fee_type === 'percentage' ? '0.1' : '1'}
                  max={settings.late_fee_type === 'percentage' ? '100' : '1000'}
                  value={settings.late_fee_amount}
                  onChange={(e) => updateSetting('late_fee_amount', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'policies' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Property Policies</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pet Policy
                </label>
                <select
                  value={settings.pet_policy}
                  onChange={(e) => updateSetting('pet_policy', e.target.value as 'allowed' | 'not_allowed' | 'conditional')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="allowed">Pets Allowed</option>
                  <option value="not_allowed">No Pets Allowed</option>
                  <option value="conditional">Conditional (case by case)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Smoking Policy
                </label>
                <select
                  value={settings.smoking_policy}
                  onChange={(e) => updateSetting('smoking_policy', e.target.value as 'allowed' | 'not_allowed' | 'designated_areas')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="allowed">Smoking Allowed</option>
                  <option value="not_allowed">No Smoking</option>
                  <option value="designated_areas">Designated Areas Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Policy (max days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.guest_policy_days}
                  onChange={(e) => updateSetting('guest_policy_days', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maintenance Policy
                </label>
                <textarea
                  value={settings.maintenance_policy}
                  onChange={(e) => updateSetting('maintenance_policy', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Describe maintenance responsibilities and procedures..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Utility Policy
                </label>
                <textarea
                  value={settings.utility_policy}
                  onChange={(e) => updateSetting('utility_policy', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Describe which utilities are included or tenant-paid..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parking Policy
                </label>
                <textarea
                  value={settings.parking_policy}
                  onChange={(e) => updateSetting('parking_policy', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Describe parking arrangements and policies..."
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}