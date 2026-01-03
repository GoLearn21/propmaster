import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, FileText, User, Building } from 'lucide-react';
import type { Lease } from '../../types/lease';
import { createLease } from '../../services/leaseService';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';

interface LeaseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  propertyId?: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
}

interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  status: string;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export default function LeaseWizard({ isOpen, onClose, onSuccess, propertyId }: LeaseWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const [formData, setFormData] = useState({
    property_id: propertyId || '',
    unit_id: '',
    tenant_id: '',
    lease_number: `LSE-${Date.now()}`,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    monthly_rent: '',
    security_deposit: '',
    lease_type: 'fixed' as const,
    notes: ''
  });

  const steps = [
    { number: 1, title: 'Property & Unit', icon: Building },
    { number: 2, title: 'Tenant Details', icon: User },
    { number: 3, title: 'Lease Terms', icon: FileText },
  ];

  const totalSteps = steps.length;

  // Load data on mount
  React.useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [propertiesData, unitsData, tenantsData] = await Promise.all([
        supabase.from('properties').select('*'),
        supabase.from('units').select('*'),
        supabase.from('tenants').select('*')
      ]);

      setProperties(propertiesData.data || []);
      setUnits(unitsData.data || []);
      setTenants(tenantsData.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const leaseData = {
        ...formData,
        property_id: formData.property_id || propertyId,
        monthly_rent: parseFloat(formData.monthly_rent),
        security_deposit: parseFloat(formData.security_deposit || '0'),
        tenant_id: formData.tenant_id || null,
        status: 'active' as const
      };

      await createLease(leaseData as any);
      toast.success('Lease created successfully via wizard');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create lease');
    } finally {
      setLoading(false);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return formData.property_id && formData.unit_id;
      case 2:
        return true; // Tenant is optional
      case 3:
        return formData.lease_number && formData.start_date && 
               formData.end_date && formData.monthly_rent;
      default:
        return false;
    }
  };

  const isLastStep = currentStep === totalSteps;

  const filteredUnits = units.filter(unit => 
    !formData.property_id || unit.property_id === formData.property_id
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create Lease - Step {currentStep}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isCompleted ? 'bg-teal-600 text-white' :
                    isActive ? 'bg-teal-100 text-teal-600' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-teal-600' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className="w-16 h-px bg-gray-300 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Property & Unit</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property *
                </label>
                <select
                  required
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value, unit_id: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  disabled={!!propertyId}
                >
                  <option value="">Select property</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name} - {prop.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <select
                  required
                  value={formData.unit_id}
                  onChange={(e) => {
                    const unit = units.find(u => u.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      unit_id: e.target.value,
                      monthly_rent: unit ? String(unit.rent_amount) : formData.monthly_rent
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Select unit</option>
                  {filteredUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number} - {unit.bedrooms}BR/{unit.bathrooms}BA - {unit.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tenant Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant (Optional)
                </label>
                <select
                  value={formData.tenant_id}
                  onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">No tenant assigned yet</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name} - {tenant.email}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  You can assign a tenant later or leave this blank for now.
                </p>
              </div>

              {formData.tenant_id && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Selected Tenant</h4>
                  {(() => {
                    const tenant = tenants.find(t => t.id === formData.tenant_id);
                    return tenant ? (
                      <div className="text-sm text-gray-700">
                        <p>{tenant.first_name} {tenant.last_name}</p>
                        <p>{tenant.email}</p>
                        <p>{tenant.phone}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Lease Terms</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lease Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lease_number}
                    onChange={(e) => setFormData({ ...formData, lease_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lease Type *
                  </label>
                  <select
                    required
                    value={formData.lease_type}
                    onChange={(e) => setFormData({ ...formData, lease_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="fixed">Fixed Term</option>
                    <option value="month-to-month">Month-to-Month</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Rent *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.monthly_rent}
                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Deposit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.security_deposit}
                    onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Additional notes or special conditions..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            
            {isLastStep ? (
              <button
                onClick={handleSubmit}
                disabled={loading || !canProceedToNext()}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Lease'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceedToNext()}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}