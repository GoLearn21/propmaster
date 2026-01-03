import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { Application } from '../../../../types';
import { ApplicationService } from '../../../../services/applications';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';

interface CreateApplicationModalProps {
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
}

export default function CreateApplicationModal({
  isOpen,
  onClose,
  onSuccess,
  propertyId
}: CreateApplicationModalProps) {
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  
  const [formData, setFormData] = useState({
    property_id: propertyId || '',
    unit_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    current_address: {
      street: '',
      city: '',
      state: '',
      zip: '',
    },
    employment: {
      employer_name: '',
      job_title: '',
      employment_type: 'full_time' as const,
      monthly_income: 0,
      start_date: '',
    },
    emergency_contact: {
      name: '',
      relationship: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [propertiesData, unitsData] = await Promise.all([
        supabase.from('properties').select('*'),
        supabase.from('units').select('*')
      ]);

      setProperties(propertiesData.data || []);
      setUnits(unitsData.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const applicationData = {
        ...formData,
        property_id: formData.property_id || propertyId,
        applicant_type: 'primary' as const,
      };

      await ApplicationService.createApplication(applicationData as any);
      toast.success('Application created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create application');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredUnits = units.filter(unit => 
    !formData.property_id || unit.property_id === formData.property_id
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create Rental Application</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                    {prop.name}
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
                onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Select unit</option>
                {filteredUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth *
            </label>
            <input
              type="date"
              required
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Current Address</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Street Address"
                value={formData.current_address.street}
                onChange={(e) => setFormData({
                  ...formData,
                  current_address: { ...formData.current_address, street: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  value={formData.current_address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    current_address: { ...formData.current_address, city: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={formData.current_address.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    current_address: { ...formData.current_address, state: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="ZIP"
                  value={formData.current_address.zip}
                  onChange={(e) => setFormData({
                    ...formData,
                    current_address: { ...formData.current_address, zip: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Employment</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Employer Name"
                value={formData.employment.employer_name}
                onChange={(e) => setFormData({
                  ...formData,
                  employment: { ...formData.employment, employer_name: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Job Title"
                value={formData.employment.job_title}
                onChange={(e) => setFormData({
                  ...formData,
                  employment: { ...formData.employment, job_title: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Monthly Income"
                  value={formData.employment.monthly_income}
                  onChange={(e) => setFormData({
                    ...formData,
                    employment: { ...formData.employment, monthly_income: parseFloat(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <input
                  type="date"
                  placeholder="Start Date"
                  value={formData.employment.start_date}
                  onChange={(e) => setFormData({
                    ...formData,
                    employment: { ...formData.employment, start_date: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Emergency Contact</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.emergency_contact.name}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_contact: { ...formData.emergency_contact, name: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Relationship"
                  value={formData.emergency_contact.relationship}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergency_contact: { ...formData.emergency_contact, relationship: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.emergency_contact.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergency_contact: { ...formData.emergency_contact, phone: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}