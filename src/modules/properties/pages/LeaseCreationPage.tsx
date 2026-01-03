import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Calendar,
  DollarSign,
  FileText,
  Users,
  Home,
  CheckCircle,
  AlertCircle,
  Plus,
  Search
} from 'lucide-react';

import LeaseWizard from '../components/lease-management/LeaseWizard';
import { getLeases, getLeaseStats } from '../services/leaseService';
import type { Lease } from '../types/lease';

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
}

interface Unit {
  id: string;
  unit_number: string;
  property_id: string;
  status: string;
  monthly_rent?: number;
}

export default function LeaseCreationPage() {
  const navigate = useNavigate();
  const { propertyId } = useParams<{ propertyId?: string }>();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [leaseData, setLeaseData] = useState<any>({
    property_id: propertyId || '',
    unit_id: '',
    tenant_id: '',
    lease_number: '',
    start_date: '',
    end_date: '',
    monthly_rent: 0,
    security_deposit: 0,
    lease_type: 'fixed',
    status: 'pending',
    notes: ''
  });
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    // Mock data for tenants, properties, and units
    // In a real app, these would come from API calls
    setTenants([
      { id: '1', first_name: 'John', last_name: 'Doe', email: 'john.doe@email.com', phone: '+1234567890' },
      { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@email.com', phone: '+1234567891' },
      { id: '3', first_name: 'Bob', last_name: 'Johnson', email: 'bob.johnson@email.com', phone: '+1234567892' }
    ]);

    if (propertyId) {
      // Load units for specific property
      setUnits([
        { id: '1', unit_number: '101', property_id: propertyId, status: 'vacant', monthly_rent: 1200 },
        { id: '2', unit_number: '102', property_id: propertyId, status: 'occupied', monthly_rent: 1300 },
        { id: '3', unit_number: '201', property_id: propertyId, status: 'vacant', monthly_rent: 1400 }
      ]);
    }
  };

  const steps = [
    { id: 1, title: 'Property & Unit', description: 'Select property and unit' },
    { id: 2, title: 'Tenant Information', description: 'Choose or add tenant' },
    { id: 3, title: 'Lease Terms', description: 'Set dates and rent amount' },
    { id: 4, title: 'Additional Details', description: 'Add notes and preferences' },
    { id: 5, title: 'Review & Create', description: 'Confirm and create lease' }
  ];

  const filteredTenants = tenants.filter(tenant => 
    tenant.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (field: string, value: any) => {
    setLeaseData(prev => ({ ...prev, [field]: value }));
    
    // Auto-update lease number when property and unit are selected
    if (field === 'property_id' || field === 'unit_id') {
      const property = properties.find(p => p.id === value);
      const unit = units.find(u => u.id === value);
      if (property && unit) {
        setLeaseData(prev => ({
          ...prev,
          lease_number: `${property.name.substring(0, 3).toUpperCase()}-${unit.unit_number}-${Date.now().toString().slice(-4)}`
        }));
      }
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = () => {
    // Save as draft logic here
    navigate(-1);
  };

  const handlePreviewLease = () => {
    // Preview lease logic here
    console.log('Preview lease:', leaseData);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return leaseData.property_id && leaseData.unit_id;
      case 2:
        return leaseData.tenant_id;
      case 3:
        return leaseData.start_date && leaseData.end_date && leaseData.monthly_rent > 0;
      case 4:
        return true; // Notes are optional
      case 5:
        return true; // Review step
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Property & Unit Selection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property
                  </label>
                  <select
                    value={leaseData.property_id}
                    onChange={(e) => handleInputChange('property_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select a property</option>
                    {properties.map(property => (
                      <option key={property.id} value={property.id}>
                        {property.name} - {property.address}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    value={leaseData.unit_id}
                    onChange={(e) => handleInputChange('unit_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    disabled={!leaseData.property_id}
                  >
                    <option value="">Select a unit</option>
                    {units.filter(unit => unit.property_id === leaseData.property_id).map(unit => (
                      <option key={unit.id} value={unit.id}>
                        Unit {unit.unit_number} - ${unit.monthly_rent}/month ({unit.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
              <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                {filteredTenants.map(tenant => (
                  <div
                    key={tenant.id}
                    onClick={() => handleInputChange('tenant_id', tenant.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      leaseData.tenant_id === tenant.id
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
                      </div>
                      {leaseData.tenant_id === tenant.id && (
                        <CheckCircle className="w-5 h-5 text-teal-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                <Plus className="w-4 h-4" />
                Add New Tenant
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Lease Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lease Start Date
                </label>
                <input
                  type="date"
                  value={leaseData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lease End Date
                </label>
                <input
                  type="date"
                  value={leaseData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Rent ($)
                </label>
                <input
                  type="number"
                  value={leaseData.monthly_rent}
                  onChange={(e) => handleInputChange('monthly_rent', parseFloat(e.target.value) || 0)}
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
                  value={leaseData.security_deposit}
                  onChange={(e) => handleInputChange('security_deposit', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lease Type
                </label>
                <select
                  value={leaseData.lease_type}
                  onChange={(e) => handleInputChange('lease_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="fixed">Fixed Term</option>
                  <option value="month-to-month">Month-to-Month</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lease Status
                </label>
                <select
                  value={leaseData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Details</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lease Number
                </label>
                <input
                  type="text"
                  value={leaseData.lease_number}
                  onChange={(e) => handleInputChange('lease_number', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Auto-generated if left empty"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={leaseData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Additional notes about the lease..."
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Review Lease Details</h3>
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Property Information</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="inline font-medium text-gray-500">Property:</dt>
                      <dd className="inline ml-2">{properties.find(p => p.id === leaseData.property_id)?.name || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-gray-500">Unit:</dt>
                      <dd className="inline ml-2">{units.find(u => u.id === leaseData.unit_id)?.unit_number || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Tenant Information</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="inline font-medium text-gray-500">Tenant:</dt>
                      <dd className="inline ml-2">
                        {tenants.find(t => t.id === leaseData.tenant_id) 
                          ? `${tenants.find(t => t.id === leaseData.tenant_id)?.first_name} ${tenants.find(t => t.id === leaseData.tenant_id)?.last_name}`
                          : 'N/A'
                        }
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Lease Terms</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="inline font-medium text-gray-500">Start Date:</dt>
                      <dd className="inline ml-2">{leaseData.start_date || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-gray-500">End Date:</dt>
                      <dd className="inline ml-2">{leaseData.end_date || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-gray-500">Monthly Rent:</dt>
                      <dd className="inline ml-2">${leaseData.monthly_rent || 0}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-gray-500">Security Deposit:</dt>
                      <dd className="inline ml-2">${leaseData.security_deposit || 0}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-gray-500">Lease Type:</dt>
                      <dd className="inline ml-2 capitalize">{leaseData.lease_type.replace('-', ' ')}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Additional Info</h4>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="inline font-medium text-gray-500">Lease Number:</dt>
                      <dd className="inline ml-2">{leaseData.lease_number || 'Auto-generated'}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-gray-500">Status:</dt>
                      <dd className="inline ml-2 capitalize">{leaseData.status}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create New Lease</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Step {currentStep} of {steps.length}: {steps[currentStep - 1]?.description}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePreviewLease}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="pb-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      currentStep >= step.id
                        ? 'border-teal-500 bg-teal-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}>
                      {currentStep > step.id ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <span className="text-sm font-medium">{step.id}</span>
                      )}
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <div className={`text-sm font-medium ${
                        currentStep >= step.id ? 'text-teal-600' : 'text-gray-400'
                      }`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-px mx-4 ${
                      currentStep > step.id ? 'bg-teal-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            {renderStepContent()}
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex items-center justify-between p-6 bg-gray-50 border-t">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex gap-3">
              {currentStep < steps.length ? (
                <button
                  onClick={nextStep}
                  disabled={!isStepValid(currentStep)}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next Step
                </button>
              ) : (
                <button
                  onClick={() => console.log('Create lease:', leaseData)}
                  disabled={!isStepValid(currentStep)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Lease
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}