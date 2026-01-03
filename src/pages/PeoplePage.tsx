/**
 * People Page - Main container for managing all stakeholders
 * Handles Tenants, Owners, Vendors, and Prospects with tabbed interface
 * Advanced features: Portal status tracking, data quality indicators, contact management
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Building2, 
  Wrench, 
  UserPlus, 
  Search, 
  Filter, 
  Plus,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  MoreHorizontal,
  Star,
  Edit3,
  Trash2,
  Eye,
  PhoneIcon,
  Send,
  User
} from 'lucide-react';
import { 
  getPeopleStatistics, 
  getTenants, 
  getOwners, 
  getVendors, 
  getProspects,
  createPerson,
  updatePerson,
  type Person,
  type Tenant,
  type Owner,
  type Vendor,
  type Prospect,
  type PeopleStatistics
} from '../services/peopleService';
import toast from 'react-hot-toast';

type TabType = 'tenants' | 'owners' | 'vendors' | 'prospects';

/**
 * Helper function to validate email format
 */
const isEmailValid = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

interface StatCardProps {
  label: string;
  value: string | number;
  trend: 'positive' | 'negative' | 'neutral' | 'warning' | 'error';
  onClick?: () => void;
}

function StatCard({ label, value, trend, onClick }: StatCardProps) {
  const trendColors = {
    positive: 'border-green-200 bg-green-50 text-green-800',
    negative: 'border-red-200 bg-red-50 text-red-800',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    error: 'border-red-200 bg-red-50 text-red-800',
    neutral: 'border-neutral bg-white text-neutral-darkest'
  };

  return (
    <div 
      className={`p-4 rounded-lg border ${trendColors[trend]} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-neutral-dark">{label}</div>
        {onClick && (
          <ExternalLink className="w-3 h-3 text-neutral-dark" />
        )}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

/**
 * Create New Person Modal Component
 */
interface CreatePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: TabType;
  onSuccess: () => void;
}

function CreatePersonModal({ isOpen, onClose, type, onSuccess }: CreatePersonModalProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    status: type === 'tenants' ? 'current' : 'active'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createPerson({
        type: type.slice(0, -1) as any, // Remove 's' from type
        ...formData
      });

      toast.success(`${type.slice(0, -1)} created successfully!`);
      onSuccess();
      onClose();
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        status: type === 'tenants' ? 'current' : 'active'
      });
    } catch (error) {
      console.error('Error creating person:', error);
      toast.error('Failed to create person');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">New {type.slice(0, -1)}</h2>
            <button 
              onClick={onClose}
              className="text-neutral-dark hover:text-neutral-darkest"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {(type === 'owners' || type === 'vendors') && (
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">
                  {type === 'vendors' ? 'Business Name' : 'Company'}
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-neutral-dark hover:text-neutral-darkest"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-accent-pink text-white rounded-md hover:bg-accent-pink-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : `Create ${type.slice(0, -1)}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Comprehensive Prospect Form Modal with Multi-Step Wizard
 */
interface ProspectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ProspectFormStep = 'personal_info' | 'contact_info' | 'address' | 'alternate_address' | 'marketing_profile' | 'pets' | 'vehicles' | 'dependents';

interface ProspectFormData {
  // Personal Info
  first_name: string;
  middle_initial: string;
  last_name: string;
  date_of_birth: string;
  ssn: string;
  company: string;
  job_title: string;
  photo_url: string;
  
  // Contact Info
  email: string;
  phone: string;
  
  // Address
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  
  // Alternate Address
  alt_street_address: string;
  alt_city: string;
  alt_state: string;
  alt_zip_code: string;
  alt_country: string;
  // Marketing Profile
  lead_source: string;
  referral_name: string;
  how_did_you_hear: string;
  
  // Pets
  has_pets: boolean;
  pet_type: string;
  pet_count: number;
  pet_weight: string;
  
  // Vehicles
  has_vehicles: boolean;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
  vehicle_plate: string;
  
  // Dependents
  has_dependents: boolean;
  dependents_count: number;
  dependents_ages: string;
  
  // General
  notes: string;
}

function ProspectFormModal({ isOpen, onClose, onSuccess }: ProspectFormModalProps) {
  const [currentStep, setCurrentStep] = useState<ProspectFormStep>('personal_info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<ProspectFormData>>({
    has_pets: false,
    has_vehicles: false,
    has_dependents: false,
    country: 'USA',
    alt_country: 'USA'
  });

  const steps: { id: ProspectFormStep; label: string; icon: React.ElementType }[] = [
    { id: 'personal_info', label: 'Personal Info', icon: User },
    { id: 'contact_info', label: 'Contact Info', icon: Mail },
    { id: 'address', label: 'Address', icon: Building2 },
    { id: 'alternate_address', label: 'Alternate Address', icon: Building2 },
    { id: 'marketing_profile', label: 'Marketing Profile', icon: Star },
    { id: 'pets', label: 'Pets', icon: Users },
    { id: 'vehicles', label: 'Vehicles', icon: Users },
    { id: 'dependents', label: 'Dependents', icon: Users }
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createPerson({
        type: 'prospect',
        first_name: formData.first_name || '',
        last_name: formData.last_name || '',
        middle_initial: formData.middle_initial,
        email: formData.email || '',
        phone: formData.phone,
        company: formData.company,
        job_title: formData.job_title,
        date_of_birth: formData.date_of_birth,
        notes: formData.notes,
        status: 'new'
      });
      
      toast.success('Prospect created successfully!');
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        has_pets: false,
        has_vehicles: false,
        has_dependents: false,
        country: 'USA',
        alt_country: 'USA'
      });
      setCurrentStep('personal_info');
    } catch (error: any) {
      console.error('Error creating prospect:', error);
      // Show specific error message if available
      const errorMessage = error?.message || 'Failed to create prospect';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 'personal_info':
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center mb-4">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                <User className="w-12 h-12 text-gray-400" />
              </div>
              <button className="text-pink-500 text-sm font-medium hover:text-pink-600">
                + Upload Photo
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.first_name || ''}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">M.I.</label>
                <input
                  type="text"
                  maxLength={1}
                  value={formData.middle_initial || ''}
                  onChange={(e) => setFormData({ ...formData, middle_initial: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.last_name || ''}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Of Birth</label>
                <input
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Social Security Number</label>
                <input
                  type="text"
                  value={formData.ssn || ''}
                  onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
                  placeholder="XXX-XX-XXXX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <input
                  type="text"
                  value={formData.company || ''}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={formData.job_title || ''}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 'contact_info':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4">Contact Info</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                These details are required for rent reminders, tenant communications and portal access.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                maxLength={1000}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">{(formData.notes || '').length}/1000 characters</p>
            </div>
          </div>
        );

      case 'address':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4">Address</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                value={formData.street_address || ''}
                onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <input
                  type="text"
                  value={formData.zip_code || ''}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country || 'USA'}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 'alternate_address':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4">Alternate Address</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input
                type="text"
                value={formData.alt_street_address || ''}
                onChange={(e) => setFormData({ ...formData, alt_street_address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.alt_city || ''}
                  onChange={(e) => setFormData({ ...formData, alt_city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={formData.alt_state || ''}
                  onChange={(e) => setFormData({ ...formData, alt_state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <input
                  type="text"
                  value={formData.alt_zip_code || ''}
                  onChange={(e) => setFormData({ ...formData, alt_zip_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.alt_country || 'USA'}
                  onChange={(e) => setFormData({ ...formData, alt_country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );

      case 'marketing_profile':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4">Marketing Profile</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">How did you hear about us?</label>
              <select
                value={formData.lead_source || ''}
                onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                <option value="website">Website</option>
                <option value="zillow">Zillow</option>
                <option value="apartments_com">Apartments.com</option>
                <option value="referral">Referral</option>
                <option value="social_media">Social Media</option>
                <option value="walk_in">Walk-in</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referral Name (if applicable)</label>
              <input
                type="text"
                value={formData.referral_name || ''}
                onChange={(e) => setFormData({ ...formData, referral_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
              <textarea
                value={formData.how_did_you_hear || ''}
                onChange={(e) => setFormData({ ...formData, how_did_you_hear: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'pets':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4">Pets</h3>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="has_pets"
                checked={formData.has_pets}
                onChange={(e) => setFormData({ ...formData, has_pets: e.target.checked })}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="has_pets" className="text-sm font-medium text-gray-700">
                I have pets
              </label>
            </div>

            {formData.has_pets && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pet Type</label>
                    <input
                      type="text"
                      value={formData.pet_type || ''}
                      onChange={(e) => setFormData({ ...formData, pet_type: e.target.value })}
                      placeholder="e.g., Dog, Cat, Bird"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Pets</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.pet_count || ''}
                      onChange={(e) => setFormData({ ...formData, pet_count: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Combined Weight (lbs)</label>
                  <input
                    type="text"
                    value={formData.pet_weight || ''}
                    onChange={(e) => setFormData({ ...formData, pet_weight: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        );

      case 'vehicles':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4">Vehicles</h3>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="has_vehicles"
                checked={formData.has_vehicles}
                onChange={(e) => setFormData({ ...formData, has_vehicles: e.target.checked })}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="has_vehicles" className="text-sm font-medium text-gray-700">
                I have a vehicle
              </label>
            </div>

            {formData.has_vehicles && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    <input
                      type="text"
                      value={formData.vehicle_make || ''}
                      onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={formData.vehicle_model || ''}
                      onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="text"
                      value={formData.vehicle_year || ''}
                      onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                  <input
                    type="text"
                    value={formData.vehicle_plate || ''}
                    onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        );

      case 'dependents':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-4">Dependents</h3>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="has_dependents"
                checked={formData.has_dependents}
                onChange={(e) => setFormData({ ...formData, has_dependents: e.target.checked })}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="has_dependents" className="text-sm font-medium text-gray-700">
                I have dependents
              </label>
            </div>

            {formData.has_dependents && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Dependents</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.dependents_count || ''}
                    onChange={(e) => setFormData({ ...formData, dependents_count: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ages (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.dependents_ages || ''}
                    onChange={(e) => setFormData({ ...formData, dependents_ages: e.target.value })}
                    placeholder="e.g., 5, 8, 12"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-blue-900 text-white p-6 rounded-l-lg">
          <h2 className="text-xl font-semibold mb-6">New Prospect</h2>
          <nav className="space-y-1">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md text-left transition-colors ${
                    currentStep === step.id
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-100 hover:bg-blue-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{step.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {steps.find(s => s.id === currentStep)?.label.toUpperCase()}
            </h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {renderStepContent()}

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                const currentIndex = steps.findIndex(s => s.id === currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1].id);
                }
              }}
              disabled={currentStep === 'personal_info'}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            {currentStep === 'dependents' ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.first_name || !formData.last_name || !formData.email}
                className="px-6 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Prospect'}
              </button>
            ) : (
              <button
                onClick={() => {
                  const currentIndex = steps.findIndex(s => s.id === currentStep);
                  if (currentIndex < steps.length - 1) {
                    setCurrentStep(steps[currentIndex + 1].id);
                  }
                }}
                className="px-4 py-2 text-blue-600 hover:text-blue-800"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 */
interface PersonDetailsModalProps {
  isOpen: boolean;
  person: Person | null;
  onClose: () => void;
  type: TabType;
  onUpdate: () => void;
}

function PersonDetailsModal({ isOpen, person, onClose, type, onUpdate }: PersonDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Person>>({});

  useEffect(() => {
    if (person) {
      setEditData({
        first_name: person.first_name,
        last_name: person.last_name,
        middle_initial: person.middle_initial,
        email: person.email,
        phone: person.phone,
        company: person.company,
        job_title: person.job_title,
        status: person.status
      });
    }
  }, [person]);

  const handleSave = async () => {
    if (!person) return;
    
    setIsSaving(true);
    try {
      await updatePerson(person.id, editData);
      toast.success('Details updated successfully!');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating person:', error);
      toast.error('Failed to update details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (person) {
      setEditData({
        first_name: person.first_name,
        last_name: person.last_name,
        middle_initial: person.middle_initial,
        email: person.email,
        phone: person.phone,
        company: person.company,
        job_title: person.job_title,
        status: person.status
      });
    }
  };

  if (!isOpen || !person) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-primary-light text-primary flex items-center justify-center text-xl font-semibold">
                {(editData.first_name || person.first_name)[0]}{(editData.last_name || person.last_name)[0]}
              </div>
              <div>
                <h2 className="text-xl font-semibold">
                  {editData.first_name || person.first_name} {editData.middle_initial ? `${editData.middle_initial}. ` : ''}{editData.last_name || person.last_name}
                </h2>
                <p className="text-neutral-dark capitalize">{type.slice(0, -1)} Details</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-neutral-dark hover:text-neutral-darkest"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium mb-3">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-dark mb-1">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-neutral-dark" />
                      <span className="text-sm">{person.email}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-dark mb-1">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-neutral-dark" />
                      <span className="text-sm">{person.phone || 'Not provided'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Information */}
            {isEditing && (
              <div>
                <h3 className="text-lg font-medium mb-3">Personal Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-dark mb-1">First Name *</label>
                    <input
                      type="text"
                      value={editData.first_name || ''}
                      onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-dark mb-1">M.I.</label>
                    <input
                      type="text"
                      maxLength={1}
                      value={editData.middle_initial || ''}
                      onChange={(e) => setEditData({ ...editData, middle_initial: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-dark mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={editData.last_name || ''}
                      onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                {(type === 'owners' || type === 'vendors') && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-neutral-dark mb-1">
                      {type === 'vendors' ? 'Business Name' : 'Company'}
                    </label>
                    <input
                      type="text"
                      value={editData.company || ''}
                      onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium mb-3">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-dark mb-1">Created</label>
                  <span className="text-sm">{new Date(person.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-dark mb-1">Status</label>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    {person.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            {/* Type-specific Information */}
            {type === 'tenants' && person.type === 'tenant' && (
              <div>
                <h3 className="text-lg font-medium mb-3">Tenant Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-dark mb-1">Balance Due</label>
                    <span className="text-sm font-semibold">
                      ${((person as Tenant).tenant_info?.balance_due || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-dark mb-1">Monthly Rent</label>
                    <span className="text-sm">
                      ${((person as Tenant).tenant_info?.monthly_rent || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {type === 'vendors' && person.type === 'vendor' && !isEditing && (
              <div>
                <h3 className="text-lg font-medium mb-3">Vendor Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-dark mb-1">Business Name</label>
                    <span className="text-sm">{person.company || 'Not provided'}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-dark mb-1">Average Rating</label>
                    <span className="text-sm flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span>{((person as Vendor).vendor_info?.average_rating || 0).toFixed(1)}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-neutral-lighter">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-neutral-dark hover:text-neutral-darkest"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-neutral-dark hover:text-neutral-darkest"
                >
                  Close
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Edit Details
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PeoplePage() {
  const [activeTab, setActiveTab] = useState<TabType>('tenants');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showPersonDetails, setShowPersonDetails] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['peopleStatistics'],
    queryFn: getPeopleStatistics
  });

  // Fetch data based on active tab
  const { data: people, isLoading, refetch } = useQuery({
    queryKey: ['people', activeTab, searchTerm],
    queryFn: async () => {
      switch (activeTab) {
        case 'tenants':
          return await getTenants(searchTerm);
        case 'owners':
          return await getOwners(searchTerm);
        case 'vendors':
          return await getVendors(searchTerm);
        case 'prospects':
          return await getProspects(searchTerm);
        default:
          return [];
      }
    }
  });

  const tabs = [
    { id: 'tenants' as TabType, label: 'Tenants', icon: Users, count: stats?.tenants.total || 0 },
    { id: 'owners' as TabType, label: 'Owners', icon: Building2, count: stats?.owners.total || 0 },
    { id: 'vendors' as TabType, label: 'Vendors', icon: Wrench, count: stats?.vendors.total || 0 },
    { id: 'prospects' as TabType, label: 'Prospects', icon: UserPlus, count: stats?.prospects.total || 0 }
  ];

  return (
    <div className="min-h-screen bg-neutral-lighter p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-darkest mb-2">People</h1>
        <p className="text-neutral-dark">Manage tenants, owners, vendors, and prospects</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {activeTab === 'tenants' && (
            <>
              <StatCard
                label="Balance Due"
                value={`$${stats.tenants.balance_due.toFixed(2)}`}
                trend={stats.tenants.balance_due > 0 ? 'negative' : 'positive'}
                onClick={() => {
                  // Filter tenants with balance due
                  setActiveFilters({ ...activeFilters, hasBalance: true });
                }}
              />
              <StatCard
                label="Missing Contact Info"
                value={`${stats.tenants.missing_contact_info} Tenants`}
                trend={stats.tenants.missing_contact_info > 0 ? 'warning' : 'positive'}
                onClick={() => {
                  // Filter tenants missing contact info
                  setActiveFilters({ ...activeFilters, missingContactInfo: true });
                }}
              />
              <StatCard
                label="Didn't Sign Into The Portal"
                value={`${stats.tenants.portal_not_signed || 0} Tenants`}
                trend={stats.tenants.portal_not_signed > 0 ? 'warning' : 'positive'}
                onClick={() => {
                  // Filter tenants not in portal
                  setActiveFilters({ ...activeFilters, portalNotSigned: true });
                }}
              />
              <StatCard
                label="Invalid Emails"
                value={`${stats.tenants.invalid_emails || 0} Tenants`}
                trend={stats.tenants.invalid_emails > 0 ? 'error' : 'positive'}
                onClick={() => {
                  // Filter tenants with invalid emails
                  setActiveFilters({ ...activeFilters, invalidEmails: true });
                }}
              />
            </>
          )}
          {activeTab === 'owners' && (
            <>
              <StatCard label="Total Owners" value={`${stats.owners.total}`} trend="neutral" />
              <StatCard label="Properties Owned" value={`${stats.owners.properties_owned}`} trend="neutral" />
              <StatCard label="Monthly Distribution" value={`$${stats.owners.monthly_distribution}`} trend="positive" />
              <StatCard label="Active Leases" value="0" trend="neutral" />
            </>
          )}
          {activeTab === 'vendors' && (
            <>
              <StatCard label="Total Vendors" value={`${stats.vendors.total}`} trend="neutral" />
              <StatCard label="Active Jobs" value={`${stats.vendors.active_jobs}`} trend="neutral" />
              <StatCard label="Average Rating" value={`${stats.vendors.avg_rating.toFixed(1)}/5`} trend="positive" />
              <StatCard label="Response Time" value="N/A" trend="neutral" />
            </>
          )}
          {activeTab === 'prospects' && (
            <>
              <StatCard label="Total Prospects" value={`${stats.prospects.total}`} trend="neutral" />
              <StatCard label="Contacted This Week" value={`${stats.prospects.contacted_this_week}`} trend="positive" />
              <StatCard label="Tours Scheduled" value={`${stats.prospects.tours_scheduled}`} trend="positive" />
              <StatCard label="Applications" value={`${stats.prospects.applications_submitted}`} trend="positive" />
            </>
          )}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-neutral-lighter">
          <div className="flex space-x-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-neutral-dark hover:bg-neutral-lighter'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-white/20'
                      : 'bg-neutral-lighter'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search and Actions Bar */}
        <div className="p-4 border-b border-neutral-lighter flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-dark" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filter Button */}
            <button className="flex items-center space-x-2 px-4 py-2 border border-neutral rounded-md hover:bg-neutral-lighter transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filter (3)</span>
            </button>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-accent-pink text-white rounded-md hover:bg-accent-pink-dark transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>New {activeTab === 'tenants' ? 'Lease' : activeTab.slice(0, -1)}</span>
          </button>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-neutral-dark">Loading...</div>
          ) : people && people.length > 0 ? (
            <table className="w-full">
              <thead className="bg-neutral-lighter">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">
                    <input type="checkbox" className="rounded border-neutral" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">
                    Contact Info
                  </th>
                  {activeTab === 'tenants' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">
                      Balance
                    </th>
                  )}
                  {activeTab === 'tenants' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">
                      Tenant Portal Status
                    </th>
                  )}
                  {activeTab === 'vendors' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">
                      Rating
                    </th>
                  )}
                  {activeTab === 'prospects' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">
                      Status
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-dark uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-lighter">
                {people.map((person: Person) => (
                  <tr key={person.id} className="hover:bg-neutral-lighter">
                    <td className="px-6 py-4">
                      <input type="checkbox" className="rounded border-neutral" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-semibold">
                          {person.first_name[0]}{person.last_name[0]}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-neutral-darkest">
                            {person.first_name} {person.middle_initial ? `${person.middle_initial}. ` : ''}{person.last_name}
                          </div>
                          {activeTab === 'tenants' && (
                            <div className="text-sm text-neutral-dark flex items-center space-x-2">
                              <span>AirBnB 1300 Alberta St</span>
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Current
                              </span>
                            </div>
                          )}
                          {activeTab !== 'tenants' && person.company && (
                            <div className="text-sm text-neutral-dark">{person.company}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${isEmailValid(person.email) ? 'text-neutral-darkest' : 'text-red-600'}`}>
                            {person.email}
                          </span>
                          {!isEmailValid(person.email) && (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="text-sm text-neutral-dark">{person.phone || '(555) 123-4567'}</div>
                        {activeTab === 'tenants' && (
                          <div className="flex space-x-2 mt-2">
                            {!person.email && (
                              <button className="text-xs text-primary hover:text-primary-dark underline">
                                Add Email Address
                              </button>
                            )}
                            {!person.phone && (
                              <button className="text-xs text-primary hover:text-primary-dark underline">
                                Add Phone Number
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    {activeTab === 'tenants' && (
                      <td className="px-6 py-4">
                        <span className={`text-sm font-semibold ${
                          (person as Tenant).tenant_info?.balance_due && (person as Tenant).tenant_info!.balance_due! > 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }`}>
                          ${((person as Tenant).tenant_info?.balance_due || 0).toFixed(2)}
                        </span>
                      </td>
                    )}
                    {activeTab === 'tenants' && (
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          {/* Email Status */}
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isEmailValid(person.email) ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            <Mail className="w-3 h-3 text-white" />
                          </div>
                          {/* Portal Invitation Status */}
                          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-500">
                            <Send className="w-3 h-3 text-white" />
                          </div>
                          {/* Payment Status */}
                          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-400">
                            <span className="text-white text-xs font-bold">$</span>
                          </div>
                        </div>
                      </td>
                    )}
                    {activeTab === 'vendors' && (
                      <td className="px-6 py-4">
                        <span className="text-sm">
                          ⭐ {((person as Vendor).vendor_info?.average_rating || 0).toFixed(1)}
                        </span>
                      </td>
                    )}
                    {activeTab === 'prospects' && (
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {(person as Prospect).prospect_info?.lead_status || 'new'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {activeTab === 'tenants' && (
                          <>
                            <button className="block text-xs text-primary hover:text-primary-dark">
                              Revise email address
                            </button>
                            <button className="block text-xs text-primary hover:text-primary-dark">
                              Send portal invitation
                            </button>
                            <button className="block text-xs text-green-600 hover:text-green-700">
                              All set for now
                            </button>
                          </>
                        )}
                        {activeTab !== 'tenants' && (
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => {
                                setSelectedPerson(person);
                                setShowPersonDetails(true);
                              }}
                              className="text-xs text-primary hover:text-primary-dark"
                            >
                              View Details
                            </button>
                            <button className="text-xs text-neutral-dark hover:text-neutral-darkest">
                              Edit
                            </button>
                          </div>
                        )}
                        <div className="flex items-center space-x-1 mt-1">
                          <MoreHorizontal className="w-4 h-4 text-neutral-dark cursor-pointer hover:text-neutral-darkest" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-neutral-dark">
              No {activeTab} found. {searchTerm && 'Try adjusting your search.'}
            </div>
          )}
        </div>
      </div>

      {/* Create Person Modal - Use ProspectFormModal for prospects */}
      {activeTab === 'prospects' ? (
        <ProspectFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => refetch()}
        />
      ) : (
        <CreatePersonModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          type={activeTab}
          onSuccess={() => refetch()}
        />
      )}

      {/* Person Details Modal */}
      <PersonDetailsModal
        isOpen={showPersonDetails}
        person={selectedPerson}
        onClose={() => {
          setShowPersonDetails(false);
          setSelectedPerson(null);
        }}
        type={activeTab}
        onUpdate={() => refetch()}
      />
    </div>
  );
}