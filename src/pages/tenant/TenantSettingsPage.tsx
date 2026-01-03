/**
 * TenantSettingsPage
 * Manage notification preferences
 * Based on market research: Email-only notifications
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, AlertCircle, Bell } from 'lucide-react';
import {
  getCurrentTenant,
  updateCommunicationPreferences,
  type Tenant,
  type CommunicationPreferences,
} from '../../services/tenantAuthService';

// ============================================
// TYPES
// ============================================

interface ToggleSetting {
  id: keyof CommunicationPreferences;
  label: string;
  description: string;
}

// ============================================
// CONSTANTS
// ============================================

const NOTIFICATION_SETTINGS: ToggleSetting[] = [
  {
    id: 'email',
    label: 'Email Notifications',
    description: 'Receive notifications via email',
  },
  {
    id: 'payment_reminders',
    label: 'Payment Reminders',
    description: 'Get reminders about upcoming and overdue payments',
  },
  {
    id: 'maintenance_updates',
    label: 'Maintenance Updates',
    description: 'Stay informed about maintenance request status changes',
  },
  {
    id: 'lease_notifications',
    label: 'Lease Notifications',
    description: 'Receive updates about lease renewals and changes',
  },
];

// ============================================
// TOGGLE SWITCH COMPONENT
// ============================================

interface ToggleSwitchProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-neutral-lighter last:border-b-0">
      <div className="flex-1 pr-4">
        <label htmlFor={id} className="text-neutral-black font-medium cursor-pointer">
          {label}
        </label>
        <p className="text-sm text-neutral-medium mt-1">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          checked ? 'bg-primary' : 'bg-neutral-light'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

export default function TenantSettingsPage() {
  const navigate = useNavigate();

  // State
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<CommunicationPreferences>({
    email: true,
    sms: false,
    push: false,
    payment_reminders: true,
    maintenance_updates: true,
    lease_notifications: true,
  });

  // ============================================
  // EFFECTS
  // ============================================

  // Load tenant data
  useEffect(() => {
    const loadTenant = async () => {
      try {
        const currentTenant = await getCurrentTenant();

        if (!currentTenant) {
          navigate('/tenant/login');
          return;
        }

        setTenant(currentTenant);
        if (currentTenant.communication_preferences) {
          setPreferences(currentTenant.communication_preferences);
        }
      } catch (error) {
        console.error('Error loading tenant:', error);
        navigate('/tenant/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadTenant();
  }, [navigate]);

  // Clear success message after delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleToggle = async (key: keyof CommunicationPreferences, value: boolean) => {
    // Optimistically update UI
    const previousValue = preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setSuccessMessage(null);
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const result = await updateCommunicationPreferences({ [key]: value });

      if (result.success) {
        setSuccessMessage('Preferences saved successfully');
      } else {
        // Revert on failure
        setPreferences((prev) => ({ ...prev, [key]: previousValue }));
        setErrorMessage(result.error || 'Failed to update preferences');
      }
    } catch (error) {
      // Revert on error
      setPreferences((prev) => ({ ...prev, [key]: previousValue }));
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-lightest">
        <div data-testid="loading-state" className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-neutral-dark">Loading settings...</p>
        </div>
      </div>
    );
  }

  // No tenant (should redirect)
  if (!tenant) {
    return null;
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-neutral-lightest py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-black">Settings</h1>
          <p className="text-neutral-medium mt-2">
            Manage your notification preferences
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <Check className="w-4 h-4" />
              {successMessage}
            </p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errorMessage}
            </p>
          </div>
        )}

        {/* Notification Preferences */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-neutral-black">
              Notification Preferences
            </h2>
          </div>

          <div className="divide-y divide-neutral-lighter">
            {NOTIFICATION_SETTINGS.map((setting) => (
              <ToggleSwitch
                key={setting.id}
                id={`toggle-${setting.id}`}
                label={setting.label}
                description={setting.description}
                checked={preferences[setting.id]}
                onChange={(value) => handleToggle(setting.id, value)}
                disabled={isSaving}
              />
            ))}
          </div>

          <p className="text-sm text-neutral-medium mt-6">
            Changes are saved automatically when you toggle a setting.
          </p>
        </div>
      </div>
    </div>
  );
}
