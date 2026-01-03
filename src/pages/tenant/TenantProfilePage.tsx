/**
 * TenantProfilePage
 * View and edit tenant profile information
 * Based on market research: Rentvine, DoorLoop, COHO
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, AlertCircle, Edit2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getCurrentTenant, updateTenantProfile, type Tenant } from '../../services/tenantAuthService';

// ============================================
// CONSTANTS
// ============================================

const PHONE_REGEX = /^[0-9]{10}$/;

// ============================================
// TYPES
// ============================================

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

// ============================================
// COMPONENT
// ============================================

export default function TenantProfilePage() {
  const navigate = useNavigate();

  // State
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

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
        setFormData({
          first_name: currentTenant.first_name || '',
          last_name: currentTenant.last_name || '',
          phone: currentTenant.phone || '',
        });
      } catch (error) {
        console.error('Error loading tenant:', error);
        navigate('/tenant/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadTenant();
  }, [navigate]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleEdit = () => {
    setIsEditing(true);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormErrors({});
    setErrorMessage(null);
    // Reset form to original values
    if (tenant) {
      setFormData({
        first_name: tenant.first_name || '',
        last_name: tenant.last_name || '',
        phone: tenant.phone || '',
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }

    if (formData.phone && !PHONE_REGEX.test(formData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const result = await updateTenantProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      });

      if (result.success) {
        setTenant((prev) => (prev ? { ...prev, ...formData } : null));
        setIsEditing(false);
        setSuccessMessage('Profile updated successfully');
      } else {
        setErrorMessage(result.error || 'Failed to update profile');
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Format phone number for display
  const formatPhone = (phone?: string): string => {
    if (!phone) return 'Not provided';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-lightest">
        <div data-testid="loading-state" className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-neutral-dark">Loading profile...</p>
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-neutral-black">Profile</h1>
          {!isEditing && (
            <Button variant="outline" onClick={handleEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
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

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {isEditing ? (
            // Edit Mode
            <div className="space-y-6">
              {/* Email (readonly) */}
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={tenant.email}
                  readOnly
                  className="w-full px-4 py-2 border border-neutral-light rounded-lg bg-neutral-lighter cursor-not-allowed text-neutral-medium"
                />
                <p className="text-xs text-neutral-medium mt-1">
                  Email cannot be changed
                </p>
              </div>

              {/* First Name */}
              <Input
                id="first-name"
                label="First Name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                error={formErrors.first_name}
              />

              {/* Last Name */}
              <Input
                id="last-name"
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                error={formErrors.last_name}
              />

              {/* Phone */}
              <Input
                id="phone"
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                error={formErrors.phone}
                placeholder="5551234567"
              />

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  loading={isSaving}
                  className="flex-1"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            // Display Mode
            <div className="space-y-6">
              {/* Email */}
              <div>
                <h3 className="text-sm font-medium text-neutral-medium mb-1">Email</h3>
                <p className="text-neutral-black">{tenant.email}</p>
              </div>

              {/* First Name */}
              <div>
                <h3 className="text-sm font-medium text-neutral-medium mb-1">First Name</h3>
                <p className="text-neutral-black">{tenant.first_name}</p>
              </div>

              {/* Last Name */}
              <div>
                <h3 className="text-sm font-medium text-neutral-medium mb-1">Last Name</h3>
                <p className="text-neutral-black">{tenant.last_name}</p>
              </div>

              {/* Phone */}
              <div>
                <h3 className="text-sm font-medium text-neutral-medium mb-1">Phone</h3>
                <p className="text-neutral-black">{formatPhone(tenant.phone)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
