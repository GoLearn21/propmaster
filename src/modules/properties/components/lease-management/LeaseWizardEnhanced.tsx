import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  User, 
  Building, 
  DollarSign,
  Calendar,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Info,
  Home,
  CreditCard,
  Clock,
  Shield
} from 'lucide-react';

import type { Lease } from '../../types/lease';
import { createLease } from '../../services/leaseService';

interface LeaseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  propertyId?: string;
  existingLease?: Lease;
  mode?: 'create' | 'edit' | 'renew';
}

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
}

interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  status: string;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  square_feet?: number;
  amenities?: string[];
}

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  credit_score?: number;
  employment_status?: string;
}

interface LeaseTerm {
  id: string;
  name: string;
  duration_months: number;
  description: string;
}

interface PaymentSchedule {
  frequency: 'monthly' | 'quarterly' | 'annually';
  due_day: number;
  late_fee_pct: number;
  late_fee_flat: number;
}

export default function LeaseWizard({ 
  isOpen, 
  onClose, 
  onSuccess, 
  propertyId, 
  existingLease,
  mode = 'create' 
}: LeaseWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [leaseTerms, setLeaseTerms] = useState<LeaseTerm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    property_id: propertyId || '',
    unit_id: '',
    tenant_id: '',
    lease_number: `LSE-${Date.now()}`,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    monthly_rent: '',
    security_deposit: '',
    pet_deposit: '',
    application_fee: '',
    lease_type: 'fixed' as const,
    status: 'pending' as const,
    notes: '',
    
    // Advanced fields
    late_fee_pct: 5,
    late_fee_flat: 75,
    grace_period_days: 5,
    renewal_notice_days: 60,
    allowed_pets: false,
    pet_deposit_per_pet: 300,
    smoking_allowed: false,
    utilities_included: [] as string[],
    parking_spaces: 0,
    additional_terms: '',
    
    // Payment schedule
    payment_schedule: {
      frequency: 'monthly' as const,
      due_day: 1,
      payment_methods: ['credit_card', 'bank_transfer', 'check'] as string[]
    } as PaymentSchedule,
    
    // Auto-renewal
    auto_renewal: false,
    auto_renewal_notice_days: 30,
    rent_increase_pct: 3,
    
    // Insurance requirements
    renter_insurance_required: true,
    min_liability_coverage: 100000
  });

  const steps = [
    { 
      number: 1, 
      title: 'Property & Unit', 
      icon: Building,
      description: 'Select property and unit details'
    },
    { 
      number: 2, 
      title: 'Tenant Selection', 
      icon: User,
      description: 'Choose or add tenant information'
    },
    { 
      number: 3, 
      title: 'Lease Terms', 
      icon: FileText,
      description: 'Set lease duration and conditions'
    },
    { 
      number: 4, 
      title: 'Financial Terms', 
      icon: DollarSign,
      description: 'Configure rent and fees'
    },
    { 
      number: 5, 
      title: 'Additional Terms', 
      icon: Shield,
      description: 'Set policies and requirements'
    },
    { 
      number: 6, 
      title: 'Review & Create', 
      icon: CheckCircle,
      description: 'Confirm details and create lease'
    }
  ];

  const totalSteps = steps.length;

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Initialize form data if editing
  useEffect(() => {
    if (existingLease && mode === 'edit') {
      setFormData({
        property_id: existingLease.property_id || '',
        unit_id: existingLease.unit_id || '',
        tenant_id: existingLease.tenant_id || '',
        lease_number: existingLease.lease_number,
        start_date: existingLease.start_date,
        end_date: existingLease.end_date,
        monthly_rent: existingLease.monthly_rent?.toString() || '',
        security_deposit: existingLease.security_deposit?.toString() || '',
        pet_deposit: '',
        application_fee: '',
        lease_type: existingLease.lease_type,
        status: existingLease.status,
        notes: existingLease.notes || '',
        // Initialize other fields with defaults
        late_fee_pct: 5,
        late_fee_flat: 75,
        grace_period_days: 5,
        renewal_notice_days: 60,
        allowed_pets: false,
        pet_deposit_per_pet: 300,
        smoking_allowed: false,
        utilities_included: [],
        parking_spaces: 0,
        additional_terms: '',
        payment_schedule: {
          frequency: 'monthly',
          due_day: 1,
          late_fee_pct: 5,
          late_fee_flat: 75
        },
        auto_renewal: false,
        auto_renewal_notice_days: 30,
        rent_increase_pct: 3,
        renter_insurance_required: true,
        min_liability_coverage: 100000
      });
    }
  }, [existingLease, mode]);

  const loadData = async () => {
    try {
      // Mock data - in real app, this would come from API
      setProperties([
        { id: '1', name: 'Sunset Apartments', address: '123 Main St', type: 'Multi-Family' },
        { id: '2', name: 'Oak Ridge Homes', address: '456 Oak Ave', type: 'Single-Family' }
      ]);
      
      setUnits([
        { id: '1', property_id: '1', unit_number: '101', status: 'vacant', bedrooms: 2, bathrooms: 1, rent_amount: 1200, square_feet: 900 },
        { id: '2', property_id: '1', unit_number: '102', status: 'vacant', bedrooms: 2, bathrooms: 2, rent_amount: 1400, square_feet: 1100 },
        { id: '3', property_id: '2', unit_number: 'A1', status: 'vacant', bedrooms: 3, bathrooms: 2, rent_amount: 1800, square_feet: 1400 }
      ]);
      
      setTenants([
        { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', phone: '555-0123', credit_score: 750 },
        { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', phone: '555-0124', credit_score: 680 }
      ]);

      setLeaseTerms([
        { id: '1', name: '6 Month Lease', duration_months: 6, description: 'Short-term lease option' },
        { id: '2', name: '12 Month Lease', duration_months: 12, description: 'Standard lease term' },
        { id: '3', name: '18 Month Lease', duration_months: 18, description: 'Extended lease option' },
        { id: '4', name: '24 Month Lease', duration_months: 24, description: 'Long-term lease option' }
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const filteredTenants = useMemo(() => {
    if (!searchTerm) return tenants;
    return tenants.filter(tenant =>
      `${tenant.first_name} ${tenant.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tenants, searchTerm]);

  const filteredUnits = useMemo(() => {
    let filtered = units;
    if (formData.property_id) {
      filtered = filtered.filter(unit => unit.property_id === formData.property_id);
    }
    return filtered;
  }, [units, formData.property_id]);

  const selectedProperty = properties.find(p => p.id === formData.property_id);
  const selectedUnit = units.find(u => u.id === formData.unit_id);
  const selectedTenant = tenants.find(t => t.id === formData.tenant_id);

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
        property_id: formData.property_id || propertyId,
        unit_id: formData.unit_id,
        tenant_id: formData.tenant_id || null,
        lease_number: formData.lease_number,
        start_date: formData.start_date,
        end_date: formData.end_date,
        monthly_rent: parseFloat(formData.monthly_rent),
        security_deposit: parseFloat(formData.security_deposit || '0'),
        lease_type: formData.lease_type,
        status: formData.status,
        notes: formData.notes
      };

      await createLease(leaseData as any);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to create lease:', error);
      // Show error message
    } finally {
      setLoading(false);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return formData.property_id && formData.unit_id;
      case 2:
        return true; // Tenant is optional in wizard
      case 3:
        return formData.lease_number && formData.start_date && formData.end_date;
      case 4:
        return formData.monthly_rent && parseFloat(formData.monthly_rent) > 0;
      case 5:
        return true; // Additional terms are optional
      case 6:
        return true; // Review step
      default:
        return false;
    }
  };

  const isLastStep = currentStep === totalSteps;

  const calculateLeaseDuration = () => {
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.round(diffDays / 30.44); // Average days per month
    return diffMonths;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Property & Unit</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property *
                </label>
                <select
                  value={formData.property_id}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    property_id: e.target.value, 
                    unit_id: '' 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  disabled={!!propertyId}
                >
                  <option value="">Select property</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name} - {prop.address} ({prop.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit *
                </label>
                <select
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
                  disabled={!formData.property_id}
                >
                  <option value="">Select unit</option>
                  {filteredUnits.filter(unit => unit.status === 'vacant').map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      Unit {unit.unit_number} - {unit.bedrooms}BR/{unit.bathrooms}BA 
                      {unit.square_feet && ` - ${unit.square_feet} sq ft`}
                      - ${unit.rent_amount}/month ({unit.status})
                    </option>
                  ))}
                </select>
              </div>

              {selectedUnit && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Unit Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Bedrooms:</span>
                      <span className="ml-2 font-medium">{selectedUnit.bedrooms}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Bathrooms:</span>
                      <span className="ml-2 font-medium">{selectedUnit.bathrooms}</span>
                    </div>
                    {selectedUnit.square_feet && (
                      <div>
                        <span className="text-gray-600">Square Feet:</span>
                        <span className="ml-2 font-medium">{selectedUnit.square_feet}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Current Rent:</span>
                      <span className="ml-2 font-medium">${selectedUnit.rent_amount}/month</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tenant Information</h3>
              
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search tenants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tenant (Optional)
                </label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {filteredTenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      onClick={() => setFormData({ ...formData, tenant_id: tenant.id })}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.tenant_id === tenant.id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {tenant.first_name} {tenant.last_name}
                          </h4>
                          <p className="text-sm text-gray-600">{tenant.email}</p>
                          <p className="text-sm text-gray-600">{tenant.phone}</p>
                          {tenant.credit_score && (
                            <span className={`inline-block mt-1 px-2 py-1 rounded text-xs ${
                              tenant.credit_score >= 700 ? 'bg-green-100 text-green-800' :
                              tenant.credit_score >= 650 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              Credit Score: {tenant.credit_score}
                            </span>
                          )}
                        </div>
                        {formData.tenant_id === tenant.id && (
                          <CheckCircle className="w-5 h-5 text-teal-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  You can assign a tenant later or proceed without tenant assignment.
                </p>
              </div>

              <div className="flex justify-center">
                <button className="flex items-center gap-2 px-4 py-2 text-teal-600 hover:text-teal-700">
                  <Plus className="w-4 h-4" />
                  Add New Tenant
                </button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Lease Terms & Duration</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lease Number *
                  </label>
                  <input
                    type="text"
                    value={formData.lease_number}
                    onChange={(e) => setFormData({ ...formData, lease_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lease Type *
                  </label>
                  <select
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      start_date: e.target.value,
                      end_date: formData.lease_type === 'fixed' 
                        ? new Date(new Date(e.target.value).setMonth(
                            new Date(e.target.value).getMonth() + 12
                          )).toISOString().split('T')[0]
                        : formData.end_date
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    disabled={formData.lease_type === 'month-to-month'}
                  />
                </div>
              </div>

              {formData.start_date && formData.end_date && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-900">Lease Duration</span>
                  </div>
                  <p className="text-sm text-blue-800">
                    Approximately {calculateLeaseDuration()} months ({Math.round((calculateLeaseDuration() / 12) * 10) / 10} years)
                  </p>
                </div>
              )}

              {/* Quick lease term templates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Templates
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {leaseTerms.map((term) => (
                    <button
                      key={term.id}
                      type="button"
                      onClick={() => {
                        const startDate = new Date(formData.start_date);
                        const endDate = new Date(startDate);
                        endDate.setMonth(endDate.getMonth() + term.duration_months);
                        
                        setFormData({
                          ...formData,
                          end_date: endDate.toISOString().split('T')[0]
                        });
                      }}
                      className="p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <div className="font-medium text-sm">{term.name}</div>
                      <div className="text-xs text-gray-600">{term.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Terms</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rent ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthly_rent}
                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Security Deposit ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.security_deposit}
                    onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pet Deposit ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pet_deposit}
                    onChange={(e) => setFormData({ ...formData, pet_deposit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Application Fee ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.application_fee}
                    onChange={(e) => setFormData({ ...formData, application_fee: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Late Fee Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={formData.late_fee_pct}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      late_fee_pct: parseFloat(e.target.value) || 0 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Late Fee Flat Amount ($)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.late_fee_flat}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      late_fee_flat: parseFloat(e.target.value) || 0 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Due Day
                </label>
                <select
                  value={formData.payment_schedule.due_day}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    payment_schedule: {
                      ...formData.payment_schedule,
                      due_day: parseInt(e.target.value)
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              {formData.monthly_rent && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Financial Summary</h4>
                  <div className="text-sm text-green-800 space-y-1">
                    <div className="flex justify-between">
                      <span>Monthly Rent:</span>
                      <span className="font-medium">${parseFloat(formData.monthly_rent).toLocaleString()}</span>
                    </div>
                    {formData.security_deposit && (
                      <div className="flex justify-between">
                        <span>Security Deposit:</span>
                        <span className="font-medium">${parseFloat(formData.security_deposit).toLocaleString()}</span>
                      </div>
                    )}
                    {formData.pet_deposit && (
                      <div className="flex justify-between">
                        <span>Pet Deposit:</span>
                        <span className="font-medium">${parseFloat(formData.pet_deposit).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t border-green-200 pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total Move-in Cost:</span>
                        <span>
                          ${(
                            parseFloat(formData.monthly_rent) + 
                            parseFloat(formData.security_deposit || '0') + 
                            parseFloat(formData.pet_deposit || '0')
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Terms & Policies</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center">
                      <input 
                        type="checkbox"
                        checked={formData.allowed_pets}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          allowed_pets: e.target.checked 
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Pets Allowed</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input 
                        type="checkbox"
                        checked={formData.smoking_allowed}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          smoking_allowed: e.target.checked 
                        })}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Smoking Allowed</span>
                    </label>
                  </div>
                </div>

                {formData.allowed_pets && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pet Deposit per Pet ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.pet_deposit_per_pet}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        pet_deposit_per_pet: parseFloat(e.target.value) || 0 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parking Spaces
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={formData.parking_spaces}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      parking_spaces: parseInt(e.target.value) || 0 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox"
                      checked={formData.auto_renewal}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        auto_renewal: e.target.checked 
                      })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Auto-Renewal</span>
                  </label>
                </div>

                {formData.auto_renewal && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto-Renewal Notice (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={formData.auto_renewal_notice_days}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        auto_renewal_notice_days: parseInt(e.target.value) || 30 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Rent Increase (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="15"
                    value={formData.rent_increase_pct}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      rent_increase_pct: parseFloat(e.target.value) || 0 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Terms & Conditions
                  </label>
                  <textarea
                    value={formData.additional_terms}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      additional_terms: e.target.value 
                    })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Any special terms, conditions, or requirements..."
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Review Lease Details</h3>
              
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                {/* Property & Unit */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Property Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Property:</span>
                      <span className="ml-2 font-medium">{selectedProperty?.name || 'Not selected'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Unit:</span>
                      <span className="ml-2 font-medium">{selectedUnit?.unit_number || 'Not selected'}</span>
                    </div>
                  </div>
                </div>

                {/* Tenant */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Tenant Information</h4>
                  <div className="text-sm">
                    <span className="text-gray-600">Tenant:</span>
                    <span className="ml-2 font-medium">
                      {selectedTenant 
                        ? `${selectedTenant.first_name} ${selectedTenant.last_name}`
                        : 'Not assigned yet'
                      }
                    </span>
                  </div>
                </div>

                {/* Lease Terms */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Lease Terms</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Lease Number:</span>
                      <span className="ml-2 font-medium">{formData.lease_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium capitalize">{formData.lease_type.replace('-', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Start Date:</span>
                      <span className="ml-2 font-medium">{formData.start_date}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">End Date:</span>
                      <span className="ml-2 font-medium">{formData.end_date}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-2 font-medium">{calculateLeaseDuration()} months</span>
                    </div>
                  </div>
                </div>

                {/* Financial */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Financial Terms</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Rent:</span>
                      <span className="font-medium">${parseFloat(formData.monthly_rent || '0').toLocaleString()}</span>
                    </div>
                    {formData.security_deposit && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Security Deposit:</span>
                        <span className="font-medium">${parseFloat(formData.security_deposit).toLocaleString()}</span>
                      </div>
                    )}
                    {formData.pet_deposit && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pet Deposit:</span>
                        <span className="font-medium">${parseFloat(formData.pet_deposit).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Late Fee:</span>
                      <span className="font-medium">
                        {formData.late_fee_pct}% + ${formData.late_fee_flat}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Due:</span>
                      <span className="font-medium">Day {formData.payment_schedule.due_day}</span>
                    </div>
                  </div>
                </div>

                {/* Policies */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Policies</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pets Allowed:</span>
                      <span className="font-medium">{formData.allowed_pets ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Smoking:</span>
                      <span className="font-medium">{formData.smoking_allowed ? 'Allowed' : 'Not Allowed'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Auto-Renewal:</span>
                      <span className="font-medium">{formData.auto_renewal ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Parking Spaces:</span>
                      <span className="font-medium">{formData.parking_spaces}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {formData.notes && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {formData.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'edit' ? 'Edit Lease' : 'Create New Lease'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {currentStep} of {totalSteps}: {steps[currentStep - 1]?.description}
            </p>
          </div>
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
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted ? 'border-teal-500 bg-teal-500 text-white' :
                    isActive ? 'border-teal-500 bg-teal-100 text-teal-600' :
                    'border-gray-300 bg-white text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="ml-3 hidden md:block">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-teal-600' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-1 mx-4 rounded ${
                      isCompleted ? 'bg-teal-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {renderStepContent()}
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
                {loading ? 'Creating...' : mode === 'edit' ? 'Update Lease' : 'Create Lease'}
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