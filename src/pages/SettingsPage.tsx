import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Bell,
  Shield,
  Settings as SettingsIcon,
  HelpCircle,
  Globe,
  DollarSign,
  Lock,
  Mail,
  Phone,
  Camera,
  Save,
  Download,
  Upload,
  LogOut,
  Smartphone,
  CreditCard,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  Loader,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Breadcrumb, Badge } from '../components/ui';
import toast from 'react-hot-toast';
import { 
  getOrCreateUserSettings, 
  updateUserSettings, 
  exportUserData,
  type UserSettings 
} from '../services/settingsService';
import { supabase } from '../lib/supabase';

type SettingsTab = 'profile' | 'property' | 'notifications' | 'security' | 'system' | 'help';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const userSettings = await getOrCreateUserSettings();
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      await updateUserSettings(settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      toast.loading('Preparing your data export...');
      
      // Call the edge function to export data
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/export-user-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ format: 'json' }),
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `propmaster-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss();
      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.dismiss();
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleImportData = () => {
    toast('Data import feature coming soon!');
  };

  const updateSetting = (key: keyof UserSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Failed to load settings. Please refresh the page.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'property', label: 'Property Management', icon: <Building2 className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'system', label: 'System', icon: <SettingsIcon className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
    { id: 'help', label: 'Help & Support', icon: <HelpCircle className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Settings' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and application preferences</p>
        </div>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as SettingsTab)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal and business information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Photo */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-10 w-10 text-blue-600" />
                      </div>
                      <button className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700">
                        <Camera className="h-3 w-3" />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{settings.full_name || 'No name set'}</h3>
                      <p className="text-sm text-gray-600">{settings.email || 'No email set'}</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Change Photo
                      </Button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={settings.full_name || ''}
                        onChange={(e) => updateSetting('full_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={settings.email || ''}
                        onChange={(e) => updateSetting('email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={settings.phone || ''}
                        onChange={(e) => updateSetting('phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={settings.company_name || ''}
                        onChange={(e) => updateSetting('company_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timezone
                      </label>
                      <select
                        value={settings.timezone || 'America/New_York'}
                        onChange={(e) => updateSetting('timezone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Language
                      </label>
                      <select
                        value={settings.language || 'English'}
                        onChange={(e) => updateSetting('language', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Property Management Tab */}
          {activeTab === 'property' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Default Property Settings</CardTitle>
                  <CardDescription>Configure default values for new properties</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Lease Term (months)
                    </label>
                    <input
                      type="number"
                      value={settings.default_lease_term_months || 12}
                      onChange={(e) => updateSetting('default_lease_term_months', parseInt(e.target.value))}
                      className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Late Fee Amount
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={settings.late_fee_amount || 50}
                        onChange={(e) => updateSetting('late_fee_amount', parseFloat(e.target.value))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-gray-600">USD</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grace Period (days)
                    </label>
                    <input
                      type="number"
                      value={settings.grace_period_days || 5}
                      onChange={(e) => updateSetting('grace_period_days', parseInt(e.target.value))}
                      className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={settings.auto_rent_reminders ?? true}
                        onChange={(e) => updateSetting('auto_rent_reminders', e.target.checked)}
                        className="rounded" 
                      />
                      <span className="text-sm text-gray-700">Automatically send rent reminders</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={settings.online_payment_enabled ?? true}
                        onChange={(e) => updateSetting('online_payment_enabled', e.target.checked)}
                        className="rounded" 
                      />
                      <span className="text-sm text-gray-700">Enable online rent payment portal</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Manage accepted payment methods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">Credit/Debit Card</p>
                          <p className="text-sm text-gray-600">Visa, Mastercard, Amex</p>
                        </div>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">ACH Bank Transfer</p>
                          <p className="text-sm text-gray-600">Direct bank account transfer</p>
                        </div>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg opacity-60">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">Check</p>
                          <p className="text-sm text-gray-600">Physical or digital check</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Inactive</Badge>
                    </div>
                  </div>

                  <Button variant="outline">
                    <Building2 className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email Notifications */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Mail className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Email Notifications</h3>
                  </div>
                  <div className="space-y-3 ml-7">
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Task reminders and updates</span>
                      <input
                        type="checkbox"
                        checked={settings.email_tasks ?? true}
                        onChange={(e) => updateSetting('email_tasks', e.target.checked)}
                        className="rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Payment confirmations</span>
                      <input
                        type="checkbox"
                        checked={settings.email_payments ?? true}
                        onChange={(e) => updateSetting('email_payments', e.target.checked)}
                        className="rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Maintenance requests</span>
                      <input
                        type="checkbox"
                        checked={settings.email_maintenance ?? true}
                        onChange={(e) => updateSetting('email_maintenance', e.target.checked)}
                        className="rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Lease renewals and expirations</span>
                      <input
                        type="checkbox"
                        checked={settings.email_leases ?? false}
                        onChange={(e) => updateSetting('email_leases', e.target.checked)}
                        className="rounded"
                      />
                    </label>
                  </div>
                </div>

                {/* SMS Notifications */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Smartphone className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">SMS Notifications</h3>
                  </div>
                  <div className="space-y-3 ml-7">
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Urgent maintenance issues</span>
                      <input
                        type="checkbox"
                        checked={settings.sms_important ?? false}
                        onChange={(e) => updateSetting('sms_important', e.target.checked)}
                        className="rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Task deadlines</span>
                      <input
                        type="checkbox"
                        checked={settings.sms_tasks ?? false}
                        onChange={(e) => updateSetting('sms_tasks', e.target.checked)}
                        className="rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Payment received</span>
                      <input
                        type="checkbox"
                        checked={settings.sms_payments ?? true}
                        onChange={(e) => updateSetting('sms_payments', e.target.checked)}
                        className="rounded"
                      />
                    </label>
                  </div>
                </div>

                {/* Push Notifications */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Bell className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Push Notifications</h3>
                  </div>
                  <div className="space-y-3 ml-7">
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">All notifications</span>
                      <input
                        type="checkbox"
                        checked={settings.push_notifications ?? true}
                        onChange={(e) => updateSetting('push_notifications', e.target.checked)}
                        className="rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Maintenance updates only</span>
                      <input
                        type="checkbox"
                        checked={settings.push_maintenance ?? true}
                        onChange={(e) => updateSetting('push_maintenance', e.target.checked)}
                        className="rounded"
                      />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>System Preferences</CardTitle>
                  <CardDescription>Configure application behavior and appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Format
                    </label>
                    <select 
                      value={settings.date_format || 'MM/DD/YYYY'}
                      onChange={(e) => updateSetting('date_format', e.target.value)}
                      className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select 
                      value={settings.currency || 'USD'}
                      onChange={(e) => updateSetting('currency', e.target.value)}
                      className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option>USD - US Dollar ($)</option>
                      <option>EUR - Euro (€)</option>
                      <option>GBP - British Pound (£)</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={settings.dark_mode ?? false}
                        onChange={(e) => updateSetting('dark_mode', e.target.checked)}
                        className="rounded" 
                      />
                      <span className="text-sm text-gray-700">Enable dark mode</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={settings.show_onboarding_tips ?? true}
                        onChange={(e) => updateSetting('show_onboarding_tips', e.target.checked)}
                        className="rounded" 
                      />
                      <span className="text-sm text-gray-700">Show onboarding tips</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>Export, import, and manage your data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Download className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">Export Data</p>
                        <p className="text-sm text-gray-600">Download all your data as CSV or JSON</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportData} disabled={exporting}>
                      {exporting ? 'Exporting...' : 'Export'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Upload className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Import Data</p>
                        <p className="text-sm text-gray-600">Upload data from spreadsheets or other systems</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleImportData}>
                      Import
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-900">
                      Data exports may take several minutes for large datasets. You'll receive an email when ready.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Password & Authentication</CardTitle>
                  <CardDescription>Manage your login credentials and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Password</p>
                      <p className="text-sm text-gray-600">
                        Last changed: {settings.updated_at ? new Date(settings.updated_at).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Change Password
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                      <p className="text-sm text-gray-700">
                        {settings.two_factor_enabled ? 'Enabled' : 'Add an extra layer of security'}
                      </p>
                    </div>
                    <Button
                      variant={settings.two_factor_enabled ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => {
                        updateSetting('two_factor_enabled', !settings.two_factor_enabled);
                        toast.success(settings.two_factor_enabled ? '2FA disabled' : '2FA enabled');
                      }}
                    >
                      {settings.two_factor_enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Session Timeout (minutes)
                    </label>
                    <select
                      value={settings.session_timeout_minutes || 30}
                      onChange={(e) => updateSetting('session_timeout_minutes', parseInt(e.target.value))}
                      className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>Manage devices where you're currently logged in</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">Chrome on Mac OS</p>
                        <p className="text-sm text-gray-600">Current session • New York, USA</p>
                      </div>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">iPhone 14 Pro</p>
                        <p className="text-sm text-gray-600">2 hours ago • New York, USA</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Revoke
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out All Other Sessions
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Help & Support Tab */}
          {activeTab === 'help' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Help Resources</CardTitle>
                  <CardDescription>Get assistance and learn more about PropMaster</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a
                    href="#"
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Documentation</p>
                        <p className="text-sm text-gray-600">Comprehensive guides and tutorials</p>
                      </div>
                    </div>
                    <span className="text-blue-600">→</span>
                  </a>

                  <a
                    href="#"
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">FAQs</p>
                        <p className="text-sm text-gray-600">Answers to common questions</p>
                      </div>
                    </div>
                    <span className="text-blue-600">→</span>
                  </a>

                  <a
                    href="#"
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Contact Support</p>
                        <p className="text-sm text-gray-600">Get help from our support team</p>
                      </div>
                    </div>
                    <span className="text-blue-600">→</span>
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                  <CardDescription>Application version and status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Version</span>
                    <span className="text-sm font-medium text-gray-900">2.5.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Updated</span>
                    <span className="text-sm font-medium text-gray-900">November 1, 2025</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge variant="success">All Systems Operational</Badge>
                  </div>

                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full">
                      <Info className="h-4 w-4 mr-2" />
                      View Release Notes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Feedback</CardTitle>
                  <CardDescription>Help us improve PropMaster</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    We'd love to hear your thoughts, suggestions, or feature requests.
                  </p>
                  <Button variant="primary">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Feedback
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
