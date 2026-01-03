import { useState, useEffect } from 'react';
import { FileText, Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface RentalApplicationsSettingsProps {
  propertyId?: string;
  onUpdate?: () => void;
}

interface RentalApplicationSettings {
  id?: string;
  property_id: string;
  accept_applications: boolean;
  require_screening: boolean;
  background_check_required: boolean;
  credit_score_minimum: number | null;
  income_to_rent_ratio: number;
  application_fee: number;
  screening_fee: number;
  pet_fee: number;
  require_guarantor: boolean;
  max_occupants: number;
  employment_verification: boolean;
  reference_required: boolean;
  minimum_lease_term: number;
  maximum_lease_term: number;
  custom_questions: string[];
  created_at?: string;
  updated_at?: string;
}

export default function RentalApplicationsSettings({ propertyId, onUpdate }: RentalApplicationsSettingsProps) {
  const [settings, setSettings] = useState<RentalApplicationSettings>({
    property_id: propertyId || '',
    accept_applications: true,
    require_screening: true,
    background_check_required: true,
    credit_score_minimum: 650,
    income_to_rent_ratio: 3,
    application_fee: 50,
    screening_fee: 25,
    pet_fee: 300,
    require_guarantor: false,
    max_occupants: 4,
    employment_verification: true,
    reference_required: true,
    minimum_lease_term: 6,
    maximum_lease_term: 24,
    custom_questions: []
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');

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
        .from('property_application_settings')
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
      console.error('Failed to load rental application settings:', error);
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
        .from('property_application_settings')
        .upsert(settingsData);

      if (error) throw error;

      onUpdate?.();
    } catch (error) {
      console.error('Failed to save rental application settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof RentalApplicationSettings>(
    key: K,
    value: RentalApplicationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const addCustomQuestion = () => {
    if (newQuestion.trim()) {
      setSettings(prev => ({
        ...prev,
        custom_questions: [...prev.custom_questions, newQuestion.trim()]
      }));
      setNewQuestion('');
    }
  };

  const removeCustomQuestion = (index: number) => {
    setSettings(prev => ({
      ...prev,
      custom_questions: prev.custom_questions.filter((_, i) => i !== index)
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
          <FileText className="w-6 h-6 text-teal-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Rental Applications</h3>
            <p className="text-sm text-gray-600">Configure rental application requirements and settings</p>
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
        {/* Application Requirements */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Application Requirements</h4>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="accept_applications"
                checked={settings.accept_applications}
                onChange={(e) => updateSetting('accept_applications', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="accept_applications" className="ml-2 text-sm text-gray-700">
                Accept new rental applications
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="require_screening"
                checked={settings.require_screening}
                onChange={(e) => updateSetting('require_screening', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="require_screening" className="ml-2 text-sm text-gray-700">
                Require background/credit screening
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="background_check_required"
                checked={settings.background_check_required}
                onChange={(e) => updateSetting('background_check_required', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="background_check_required" className="ml-2 text-sm text-gray-700">
                Background check required
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="employment_verification"
                checked={settings.employment_verification}
                onChange={(e) => updateSetting('employment_verification', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="employment_verification" className="ml-2 text-sm text-gray-700">
                Employment verification required
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="reference_required"
                checked={settings.reference_required}
                onChange={(e) => updateSetting('reference_required', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="reference_required" className="ml-2 text-sm text-gray-700">
                References required
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="require_guarantor"
                checked={settings.require_guarantor}
                onChange={(e) => updateSetting('require_guarantor', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="require_guarantor" className="ml-2 text-sm text-gray-700">
                Require guarantor for applicants under 21
              </label>
            </div>
          </div>
        </div>

        {/* Financial Requirements */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Financial Requirements</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Credit Score
              </label>
              <input
                type="number"
                min="300"
                max="850"
                value={settings.credit_score_minimum || ''}
                onChange={(e) => updateSetting('credit_score_minimum', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="650"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Income to Rent Ratio
              </label>
              <input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={settings.income_to_rent_ratio}
                onChange={(e) => updateSetting('income_to_rent_ratio', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Example: 3 means income must be 3x rent</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Occupants
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.max_occupants}
                onChange={(e) => updateSetting('max_occupants', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lease Term Range (months)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="1"
                  value={settings.minimum_lease_term}
                  onChange={(e) => updateSetting('minimum_lease_term', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Min"
                />
                <input
                  type="number"
                  min="1"
                  value={settings.maximum_lease_term}
                  onChange={(e) => updateSetting('maximum_lease_term', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fees */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Application Fees</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Application Fee ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.application_fee}
                onChange={(e) => updateSetting('application_fee', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Screening Fee ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.screening_fee}
                onChange={(e) => updateSetting('screening_fee', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pet Fee ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.pet_fee}
                onChange={(e) => updateSetting('pet_fee', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Custom Questions */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Custom Application Questions</h4>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter custom question..."
                onKeyPress={(e) => e.key === 'Enter' && addCustomQuestion()}
              />
              <button
                onClick={addCustomQuestion}
                className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {settings.custom_questions.map((question, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 flex-1">{question}</span>
                  <button
                    onClick={() => removeCustomQuestion(index)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {settings.custom_questions.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No custom questions added</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}