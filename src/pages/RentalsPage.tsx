import { useState, useEffect } from 'react';
import { Home, TrendingUp, DollarSign, Key, Plus } from 'lucide-react';
import { getRentals, getLeases, getRentalStats } from '../services/rentalsService';
import { supabase } from '../lib/supabase';
import CreateLeaseModal from '../components/modals/CreateLeaseModal';
import toast from 'react-hot-toast';

export default function RentalsPage() {
  const [rentals, setRentals] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'units' | 'leases'>('units');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLease, setSelectedLease] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rentalsData, leasesData, statsData] = await Promise.all([
        getRentals(),
        getLeases(),
        getRentalStats(),
      ]);
      setRentals(rentalsData);
      setLeases(leasesData);
      setStats(statsData);

      // Load properties, units, and tenants for the modal
      const { data: props } = await supabase.from('properties').select('*');
      const { data: units } = await supabase.from('units').select('*');
      const { data: tenants } = await supabase.from('tenants').select('*');
      setProperties(props || []);
      setUnits(units || []);
      setTenants(tenants || []);
    } catch (error) {
      console.error('Failed to load rentals:', error);
      toast.error('Failed to load rentals data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
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
            <h1 className="text-2xl font-semibold text-gray-900">Rentals</h1>
            <p className="text-sm text-gray-600 mt-1">Manage properties, units, and leases</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-5 h-5" />
            Create Lease
          </button>
        </div>
      </div>

      {/* Create Lease Modal */}
      <CreateLeaseModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedLease(null);
        }}
        onSuccess={loadData}
        lease={selectedLease}
        properties={properties}
        units={units}
        tenants={tenants}
      />

      {/* Statistics Cards */}
      {stats && (
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Units</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center">
                  <Home className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.occupancyRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.occupied} occupied / {stats.vacant} vacant</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Rent</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">${stats.totalRent.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Actual collected</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vacancy Loss</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">${stats.lossFromVacancy.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Potential revenue</p>
                </div>
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <Key className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex space-x-4">
          <button
            onClick={() => setView('units')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              view === 'units'
                ? 'bg-teal-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Units ({rentals.length})
          </button>
          <button
            onClick={() => setView('leases')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              view === 'leases'
                ? 'bg-teal-600 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Leases ({leases.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {view === 'units' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Bed/Bath</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sq Ft</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rent</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rentals.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{unit.properties?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{unit.unit_number}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600">{unit.bedrooms}/{unit.bathrooms}</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">{unit.square_feet}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      ${unit.rent_amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        unit.status === 'occupied' ? 'bg-green-100 text-green-800' :
                        unit.status === 'vacant' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {unit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {unit.tenants?.[0] 
                        ? `${unit.tenants[0].first_name} ${unit.tenants[0].last_name}`
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lease #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rent</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leases.map((lease) => (
                  <tr key={lease.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{lease.lease_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{lease.properties?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{lease.units?.unit_number || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {lease.tenants ? `${lease.tenants.first_name} ${lease.tenants.last_name}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{lease.start_date}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{lease.end_date}</td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      ${lease.monthly_rent?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        lease.status === 'active' ? 'bg-green-100 text-green-800' :
                        lease.status === 'expired' ? 'bg-red-100 text-red-800' :
                        lease.status === 'terminated' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {lease.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
