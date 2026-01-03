import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  DollarSign,
  Home,
  Users,
  RefreshCw,
  Download,
  Upload,
  Bell
} from 'lucide-react';

import LeaseManagement from '../components/lease-management/LeaseManagement';
import LeaseAnalytics from '../components/lease-management/LeaseAnalytics';
import LeaseNotifications from '../components/lease-management/LeaseNotifications';
import PaymentTracking from '../components/lease-management/PaymentTracking';
import DocumentManager from '../components/lease-management/DocumentManager';
import ESignatureIntegration from '../components/lease-management/ESignatureIntegration';

import { getLeases, getLeaseStats, getExpiringLeases } from '../services/leaseService';
import type { Lease, LeaseStats } from '../types/lease';

type ViewType = 'dashboard' | 'analytics' | 'payments' | 'documents' | 'notifications';

export default function LeaseManagementPage() {
  const navigate = useNavigate();
  const { propertyId } = useParams<{ propertyId?: string }>();
  
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [leases, setLeases] = useState<Lease[]>([]);
  const [stats, setStats] = useState<LeaseStats | null>(null);
  const [expiringLeases, setExpiringLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadData();
  }, [propertyId, refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leasesData, statsData, expiringData] = await Promise.all([
        getLeases(propertyId ? { } : {}),
        getLeaseStats(propertyId),
        getExpiringLeases(60)
      ]);

      setLeases(propertyId 
        ? leasesData.filter(lease => lease.property_id === propertyId)
        : leasesData
      );
      setStats(statsData);
      setExpiringLeases(expiringData);
    } catch (error) {
      console.error('Failed to load lease data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaseUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'analytics':
        return <LeaseAnalytics leases={leases} stats={stats} propertyId={propertyId} />;
      case 'payments':
        return <PaymentTracking leases={leases} propertyId={propertyId} onUpdate={handleLeaseUpdate} />;
      case 'documents':
        return <DocumentManager leases={leases} propertyId={propertyId} />;
      case 'notifications':
        return <LeaseNotifications expiringLeases={expiringLeases} stats={stats} />;
      default:
        return (
          <LeaseManagement 
            propertyId={propertyId} 
            onLeaseUpdate={handleLeaseUpdate} 
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const navigationItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      count: stats?.active_leases,
      alert: stats?.expiring_soon > 0 ? stats.expiring_soon : undefined
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: TrendingUp,
      count: undefined
    },
    {
      key: 'payments',
      label: 'Payments',
      icon: DollarSign,
      count: undefined
    },
    {
      key: 'documents',
      label: 'Documents',
      icon: FileText,
      count: undefined
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: Bell,
      count: undefined,
      alert: stats?.expiring_soon > 0 ? stats.expiring_soon : undefined
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {propertyId ? 'Property Lease Management' : 'Lease Management'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Comprehensive lease management and tracking system
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          {stats && (
            <div className="pb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-teal-50 to-teal-100 p-4 rounded-lg border border-teal-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-teal-600">Active Leases</p>
                      <p className="text-2xl font-bold text-teal-900">{stats.active_leases}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-teal-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Monthly Revenue</p>
                      <p className="text-2xl font-bold text-blue-900">${stats.total_monthly_rent.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Expiring Soon</p>
                      <p className="text-2xl font-bold text-orange-900">{stats.expiring_soon}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Occupancy Rate</p>
                      <p className="text-2xl font-bold text-purple-900">{stats.occupancy_rate.toFixed(1)}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="pb-6">
            <div className="flex space-x-8 overflow-x-auto">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.key;
                
                return (
                  <button
                    key={item.key}
                    onClick={() => setCurrentView(item.key as ViewType)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap relative ${
                      isActive
                        ? 'bg-teal-100 text-teal-700 border border-teal-300'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {item.alert && item.alert > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {item.alert > 9 ? '9+' : item.alert}
                      </span>
                    )}
                    {item.count !== undefined && item.count > 0 && (
                      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                        isActive
                          ? 'bg-teal-200 text-teal-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
}