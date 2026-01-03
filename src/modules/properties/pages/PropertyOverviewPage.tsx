import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Home,
  FileText,
  Settings,
  DollarSign,
  Users,
  Calendar,
  Activity,
  AlertTriangle
} from 'lucide-react';
import LeaseManagement from '../components/lease-management/LeaseManagement';
import RentalApplications from '../components/rental-applications/RentalApplications';
import PropertyLeaseSettings from '../components/PropertyLeaseSettings';
import { supabase } from '../../../lib/supabase';

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  created_at: string;
  updated_at: string;
}

export default function PropertyOverviewPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'leases' | 'applications' | 'settings'>('overview');
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('PropertyOverviewPage mounted with propertyId:', propertyId);
    if (propertyId) {
      loadProperty();
    } else {
      console.error('No propertyId found in URL params');
      setLoading(false);
    }
  }, [propertyId]);

  const loadProperty = async () => {
    if (!propertyId) {
      console.error('loadProperty called but propertyId is undefined');
      return;
    }

    console.log('Loading property with ID:', propertyId);

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      console.log('Property query result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Property loaded successfully:', data);
      setProperty(data);
    } catch (error) {
      console.error('Failed to load property:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { 
      key: 'overview', 
      label: 'Overview', 
      icon: Home 
    },
    { 
      key: 'leases', 
      label: 'Leases', 
      icon: FileText,
      badge: 'Property-specific lease management'
    },
    { 
      key: 'applications', 
      label: 'Applications', 
      icon: Users,
      badge: 'Manage rental applications'
    },
    { 
      key: 'settings', 
      label: 'Settings', 
      icon: Settings 
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {property ? property.name : 'Property Management'}
            </h1>
            {property && (
              <p className="text-sm text-gray-600 mt-1">
                {property.address}, {property.city}, {property.state} {property.zip_code} • {property.property_type}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              {property && (
                <>
                  <div className="text-sm font-medium text-gray-900">
                    {property.property_type}
                  </div>
                  <div className="text-xs text-gray-600">Property Type</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <nav className="px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge && !isActive && (
                    <span className="text-xs text-gray-400">({tab.badge})</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Property Type</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {property?.property_type || 'N/A'}
                    </p>
                  </div>
                  <Home className="w-8 h-8 text-gray-400" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Location</p>
                    <p className="text-lg font-bold text-green-600 mt-2">
                      {property ? `${property.city}, ${property.state}` : 'N/A'}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-green-400" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Created</p>
                    <p className="text-lg font-bold text-blue-600 mt-2">
                      {property ? new Date(property.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-400" />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">New lease agreement signed</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Rental application submitted</p>
                    <p className="text-xs text-gray-500">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Lease expiring in 30 days</p>
                    <p className="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => setActiveTab('leases')}
                className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <FileText className="w-8 h-8 text-teal-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Manage Leases</h3>
                <p className="text-sm text-gray-600">
                  Create, edit, and track lease agreements
                </p>
              </button>

              <button
                onClick={() => setActiveTab('applications')}
                className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <Users className="w-8 h-8 text-blue-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Rental Applications</h3>
                <p className="text-sm text-gray-600">
                  Review and approve rental applications
                </p>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <Settings className="w-8 h-8 text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Property Settings</h3>
                <p className="text-sm text-gray-600">
                  Configure lease templates and policies
                </p>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'leases' && (
          <LeaseManagement 
            propertyId={propertyId}
            onLeaseUpdate={() => {
              // Refresh property data if needed
              if (propertyId) loadProperty();
            }}
          />
        )}

        {activeTab === 'applications' && (
          <RentalApplications 
            propertyId={propertyId}
            onApplicationUpdate={() => {
              // Refresh property data if needed
              if (propertyId) loadProperty();
            }}
          />
        )}

        {activeTab === 'settings' && (
          <PropertyLeaseSettings 
            propertyId={propertyId}
            onSettingsUpdate={() => {
              // Settings updated
            }}
          />
        )}
      </div>
    </div>
  );
}