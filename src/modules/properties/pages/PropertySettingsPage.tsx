import { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

// Import all settings components
import RentalApplicationsSettings from '../components/settings/RentalApplicationsSettings';
import PaymentNotificationsSettings from '../components/settings/PaymentNotificationsSettings';
import PaymentInstructionsSettings from '../components/settings/PaymentInstructionsSettings';
import CustomAllocationsSettings from '../components/settings/CustomAllocationsSettings';
import PaymentAllocationSettings from '../components/settings/PaymentAllocationSettings';
import FeesSettings from '../components/settings/FeesSettings';
import TenantPortalSettings from '../components/settings/TenantPortalSettings';
import TenantRequestsSettings from '../components/settings/TenantRequestsSettings';

interface PropertySettingsPageProps {
  propertyId?: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
}

interface SettingsSection {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<any>;
  category: 'lease' | 'applications' | 'payments' | 'portal' | 'requests';
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'rental_applications',
    name: 'Rental Applications',
    description: 'Edit property rental applications',
    icon: Settings,
    component: RentalApplicationsSettings,
    category: 'applications'
  },
  {
    id: 'rent_payment_notifications',
    name: 'Rent & Payment Notifications',
    description: 'Configure email and text notifications',
    icon: Settings,
    component: PaymentNotificationsSettings,
    category: 'payments'
  },
  {
    id: 'payment_instructions',
    name: 'Payment Instructions',
    description: 'Specify tenant payment instructions',
    icon: Settings,
    component: PaymentInstructionsSettings,
    category: 'payments'
  },
  {
    id: 'custom_allocations',
    name: 'Custom Allocations',
    description: 'Add custom allocation presets',
    icon: Settings,
    component: CustomAllocationsSettings,
    category: 'payments'
  },
  {
    id: 'payment_allocation',
    name: 'Payment Allocation',
    description: 'Edit automatic payment receiving',
    icon: Settings,
    component: PaymentAllocationSettings,
    category: 'payments'
  },
  {
    id: 'fees_settings',
    name: 'Fees Settings',
    description: 'Manage property fees',
    icon: Settings,
    component: FeesSettings,
    category: 'lease'
  },
  {
    id: 'tenant_portal',
    name: 'Tenant Portal',
    description: 'Resident portal access settings',
    icon: Settings,
    component: TenantPortalSettings,
    category: 'portal'
  },
  {
    id: 'tenant_requests',
    name: 'Tenant Requests',
    description: 'Auto-assign new tenant requests',
    icon: Settings,
    component: TenantRequestsSettings,
    category: 'requests'
  }
];

export default function PropertySettingsPage({ propertyId }: PropertySettingsPageProps) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>(SETTINGS_SECTIONS[0].id);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'lease' | 'applications' | 'payments' | 'portal' | 'requests'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (propertyId) {
      loadProperty();
    }
  }, [propertyId]);

  const loadProperty = async () => {
    if (!propertyId) return;

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, type')
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      setProperty(data);
    } catch (error) {
      console.error('Failed to load property:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsUpdate = async () => {
    setSaving(true);
    // You could implement save all functionality here
    setTimeout(() => {
      setSaving(false);
    }, 1000);
  };

  const filteredSections = activeCategory === 'all' 
    ? SETTINGS_SECTIONS 
    : SETTINGS_SECTIONS.filter(section => section.category === activeCategory);

  const getCurrentSection = () => {
    return SETTINGS_SECTIONS.find(section => section.id === activeSection);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'lease':
        return '📋';
      case 'applications':
        return '📝';
      case 'payments':
        return '💳';
      case 'portal':
        return '🖥️';
      case 'requests':
        return '👥';
      default:
        return '⚙️';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const currentSection = getCurrentSection();
  const CurrentComponent = currentSection?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">
              Property Settings
            </h1>
            {property && (
              <p className="text-sm text-gray-600 mt-1">
                {property.name} • {property.address}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              saving ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
            }`}>
              {saving ? 'Saving...' : 'All Changes Saved'}
            </span>
            <button
              onClick={handleSettingsUpdate}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save All
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 h-screen overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
            
            {/* Category Filter */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All Settings', icon: '⚙️' },
                  { key: 'lease', label: 'Lease & Fees', icon: '📋' },
                  { key: 'applications', label: 'Applications', icon: '📝' },
                  { key: 'payments', label: 'Payments', icon: '💳' },
                  { key: 'portal', label: 'Tenant Portal', icon: '🖥️' },
                  { key: 'requests', label: 'Requests', icon: '👥' }
                ].map((category) => (
                  <button
                    key={category.key}
                    onClick={() => setActiveCategory(category.key as any)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeCategory === category.key
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{category.icon}</span>
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Settings Cards */}
            <div className="space-y-3">
              {filteredSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      isActive
                        ? 'border-teal-200 bg-teal-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        isActive ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-medium ${
                          isActive ? 'text-teal-900' : 'text-gray-900'
                        }`}>
                          {section.name}
                        </h3>
                        <p className={`text-xs mt-1 ${
                          isActive ? 'text-teal-700' : 'text-gray-500'
                        }`}>
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {CurrentComponent && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <CurrentComponent
                  propertyId={propertyId}
                  onUpdate={handleSettingsUpdate}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}