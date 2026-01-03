import { useState, useEffect } from 'react';
import { Bell, Save, Mail, MessageSquare } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface PaymentNotificationsSettingsProps {
  propertyId?: string;
  onUpdate?: () => void;
}

interface PaymentNotificationSettings {
  id?: string;
  property_id: string;
  email_notifications_enabled: boolean;
  text_notifications_enabled: boolean;
  payment_reminder_days: number[];
  late_payment_notice_days: number[];
  payment_confirmation_receipt: boolean;
  landlord_email_notifications: boolean;
  landlord_text_notifications: boolean;
  reminder_email_template: string;
  late_notice_email_template: string;
  payment_received_template: string;
  custom_notification_settings: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export default function PaymentNotificationsSettings({ propertyId, onUpdate }: PaymentNotificationsSettingsProps) {
  const [settings, setSettings] = useState<PaymentNotificationSettings>({
    property_id: propertyId || '',
    email_notifications_enabled: true,
    text_notifications_enabled: true,
    payment_reminder_days: [3, 1],
    late_payment_notice_days: [1, 5, 10],
    payment_confirmation_receipt: true,
    landlord_email_notifications: true,
    landlord_text_notifications: false,
    reminder_email_template: 'Dear {tenant_name}, this is a friendly reminder that your rent payment of ${amount} is due on {due_date}. Please make your payment to avoid late fees.',
    late_notice_email_template: 'Dear {tenant_name}, your rent payment of ${amount} was due on {due_date}. Please make your payment immediately to avoid additional late fees.',
    payment_received_template: 'Thank you {tenant_name}, we have received your payment of ${amount} for {month} {year}.',
    custom_notification_settings: {}
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newReminderDay, setNewReminderDay] = useState('');
  const [newLateNoticeDay, setNewLateNoticeDay] = useState('');

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
        .from('property_payment_notification_settings')
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
      console.error('Failed to load payment notification settings:', error);
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
        .from('property_payment_notification_settings')
        .upsert(settingsData);

      if (error) throw error;

      onUpdate?.();
    } catch (error) {
      console.error('Failed to save payment notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof PaymentNotificationSettings>(
    key: K,
    value: PaymentNotificationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const addReminderDay = () => {
    const day = parseInt(newReminderDay);
    if (day > 0 && !settings.payment_reminder_days.includes(day)) {
      setSettings(prev => ({
        ...prev,
        payment_reminder_days: [...prev.payment_reminder_days, day].sort((a, b) => a - b)
      }));
      setNewReminderDay('');
    }
  };

  const removeReminderDay = (day: number) => {
    setSettings(prev => ({
      ...prev,
      payment_reminder_days: prev.payment_reminder_days.filter(d => d !== day)
    }));
  };

  const addLateNoticeDay = () => {
    const day = parseInt(newLateNoticeDay);
    if (day > 0 && !settings.late_payment_notice_days.includes(day)) {
      setSettings(prev => ({
        ...prev,
        late_payment_notice_days: [...prev.late_payment_notice_days, day].sort((a, b) => a - b)
      }));
      setNewLateNoticeDay('');
    }
  };

  const removeLateNoticeDay = (day: number) => {
    setSettings(prev => ({
      ...prev,
      late_payment_notice_days: prev.late_payment_notice_days.filter(d => d !== day)
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
          <Bell className="w-6 h-6 text-teal-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Rent & Payment Notifications</h3>
            <p className="text-sm text-gray-600">Configure automated payment reminders and notifications</p>
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
        {/* Notification Channels */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-gray-600" />
            Notification Channels
          </h4>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="email_notifications"
                checked={settings.email_notifications_enabled}
                onChange={(e) => updateSetting('email_notifications_enabled', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="email_notifications" className="ml-2 text-sm text-gray-700">
                Enable email notifications to tenants
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="text_notifications"
                checked={settings.text_notifications_enabled}
                onChange={(e) => updateSetting('text_notifications_enabled', e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="text_notifications" className="ml-2 text-sm text-gray-700">
                Enable text notifications to tenants
              </label>
            </div>

            <div className="border-t pt-4 mt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Landlord Notifications</h5>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="landlord_email_notifications"
                  checked={settings.landlord_email_notifications}
                  onChange={(e) => updateSetting('landlord_email_notifications', e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="landlord_email_notifications" className="ml-2 text-sm text-gray-700">
                  Email notifications to landlord
                </label>
              </div>

              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="landlord_text_notifications"
                  checked={settings.landlord_text_notifications}
                  onChange={(e) => updateSetting('landlord_text_notifications', e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="landlord_text_notifications" className="ml-2 text-sm text-gray-700">
                  Text notifications to landlord
                </label>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="payment_confirmation_receipt"
                  checked={settings.payment_confirmation_receipt}
                  onChange={(e) => updateSetting('payment_confirmation_receipt', e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="payment_confirmation_receipt" className="ml-2 text-sm text-gray-700">
                  Send payment confirmation receipts
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Reminders */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Payment Reminders</h4>
          <p className="text-sm text-gray-600 mb-4">Send reminders before rent is due</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Schedule
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={newReminderDay}
                  onChange={(e) => setNewReminderDay(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Days before due"
                />
                <button
                  onClick={addReminderDay}
                  className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {settings.payment_reminder_days.map((day) => (
                  <span
                    key={day}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm"
                  >
                    {day} days before
                    <button
                      onClick={() => removeReminderDay(day)}
                      className="text-teal-600 hover:text-teal-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Late Payment Notices */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Late Payment Notices</h4>
          <p className="text-sm text-gray-600 mb-4">Send notices after rent is overdue</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notice Schedule
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={newLateNoticeDay}
                  onChange={(e) => setNewLateNoticeDay(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Days after due"
                />
                <button
                  onClick={addLateNoticeDay}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {settings.late_payment_notice_days.map((day) => (
                  <span
                    key={day}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                  >
                    {day} days after
                    <button
                      onClick={() => removeLateNoticeDay(day)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Email Templates */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
          <h4 className="text-md font-medium text-gray-900 mb-4">Email Templates</h4>
          <p className="text-sm text-gray-600 mb-4">Customize notification emails with variables like {'{tenant_name}'}, {'{amount}'}, {'{due_date}'}</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Reminder Template
              </label>
              <textarea
                value={settings.reminder_email_template}
                onChange={(e) => updateSetting('reminder_email_template', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter reminder email template..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Late Payment Notice Template
              </label>
              <textarea
                value={settings.late_notice_email_template}
                onChange={(e) => updateSetting('late_notice_email_template', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter late notice email template..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Confirmation Template
              </label>
              <textarea
                value={settings.payment_received_template}
                onChange={(e) => updateSetting('payment_received_template', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Enter payment confirmation template..."
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="text-sm font-medium text-blue-900 mb-2">Available Variables</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-800">
                <div>{'{tenant_name}'}</div>
                <div>{'{amount}'}</div>
                <div>{'{due_date}'}</div>
                <div>{'{month} {year}'}</div>
                <div>{'{property_name}'}</div>
                <div>{'{unit_number}'}</div>
                <div>{'{landlord_name}'}</div>
                <div>{'{late_fee}'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}