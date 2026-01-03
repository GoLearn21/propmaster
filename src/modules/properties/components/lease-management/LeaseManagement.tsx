import { useState, useEffect } from 'react';
import { FileText, Plus, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { Lease, LeaseStats } from '../../types/lease';
import { getLeases, getLeaseStats, getExpiringLeases } from '../../services/leaseService';
import LeaseList from './LeaseList';
import LeaseStatsCards from './LeaseStatsCards';
import LeaseWizard from './LeaseWizard';
import ExpiringLeasesModal from './ExpiringLeasesModal';
import CreateLeaseModal from './CreateLeaseModal';

interface LeaseManagementProps {
  propertyId?: string;
  onLeaseUpdate?: () => void;
}

export default function LeaseManagement({ propertyId, onLeaseUpdate }: LeaseManagementProps) {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [stats, setStats] = useState<LeaseStats | null>(null);
  const [expiringLeases, setExpiringLeases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'active' | 'all' | 'expiring'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLeaseWizard, setShowLeaseWizard] = useState(false);
  const [showExpiringModal, setShowExpiringModal] = useState(false);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadData();
  }, [propertyId, view, refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leasesData, statsData, expiringData] = await Promise.all([
        getLeases(propertyId ? { } : {}),
        getLeaseStats(propertyId),
        getExpiringLeases(60)
      ]);

      // Filter leases based on view
      let filteredLeases = leasesData;
      if (view === 'active') {
        filteredLeases = leasesData.filter(lease => lease.status === 'active');
      } else if (view === 'expiring') {
        const expiringIds = expiringData.map(el => el.id);
        filteredLeases = leasesData.filter(lease => expiringIds.includes(lease.id));
      }

      setLeases(propertyId 
        ? filteredLeases.filter(lease => lease.property_id === propertyId)
        : filteredLeases
      );
      setStats(statsData);
      setExpiringLeases(expiringData);
    } catch (error) {
      console.error('Failed to load lease data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaseCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    onLeaseUpdate?.();
    setShowCreateModal(false);
    setShowLeaseWizard(false);
  };

  const handleLeaseUpdated = () => {
    setRefreshTrigger(prev => prev + 1);
    onLeaseUpdate?.();
    setSelectedLease(null);
  };

  const handleLeaseDeleted = () => {
    setRefreshTrigger(prev => prev + 1);
    onLeaseUpdate?.();
    setSelectedLease(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lease Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage lease agreements and track property occupancy
          </p>
        </div>
        <div className="flex gap-3">
          {stats?.expiring_soon > 0 && (
            <button
              onClick={() => setShowExpiringModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50"
            >
              <AlertTriangle className="w-4 h-4" />
              Expiring Soon ({stats.expiring_soon})
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" />
            Create Lease
          </button>
          <button
            onClick={() => setShowLeaseWizard(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FileText className="w-4 h-4" />
            Lease Wizard
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && <LeaseStatsCards stats={stats} />}

      {/* View Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'active', label: 'Active Leases', count: stats?.active_leases || 0 },
            { key: 'all', label: 'All Leases', count: stats?.total_leases || 0 },
            { key: 'expiring', label: 'Expiring Soon', count: stats?.expiring_soon || 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                view === tab.key
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  view === tab.key
                    ? 'bg-teal-100 text-teal-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Lease List */}
      <LeaseList 
        leases={leases}
        onLeaseUpdate={handleLeaseUpdated}
        onLeaseDelete={handleLeaseDeleted}
        onLeaseEdit={(lease) => setSelectedLease(lease)}
      />

      {/* Modals */}
      {showCreateModal && (
        <CreateLeaseModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleLeaseCreated}
          lease={selectedLease}
          propertyId={propertyId}
        />
      )}

      {showLeaseWizard && (
        <LeaseWizard
          isOpen={showLeaseWizard}
          onClose={() => setShowLeaseWizard(false)}
          onSuccess={handleLeaseCreated}
          propertyId={propertyId}
        />
      )}

      {showExpiringModal && (
        <ExpiringLeasesModal
          isOpen={showExpiringModal}
          onClose={() => setShowExpiringModal(false)}
          leases={expiringLeases}
          onLeaseUpdate={handleLeaseUpdated}
        />
      )}
    </div>
  );
}