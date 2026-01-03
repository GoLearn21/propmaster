import { useState } from 'react';
import { X, Calendar, AlertTriangle, FileText, User, Building } from 'lucide-react';
import type { ExpiringLease } from '../../types/lease';
import { renewLease } from '../../services/leaseService';
import toast from 'react-hot-toast';

interface ExpiringLeasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  leases: ExpiringLease[];
  onLeaseUpdate: () => void;
}

export default function ExpiringLeasesModal({ isOpen, onClose, leases, onLeaseUpdate }: ExpiringLeasesModalProps) {
  const [renewalLoading, setRenewalLoading] = useState<string | null>(null);
  const [selectedLease, setSelectedLease] = useState<ExpiringLease | null>(null);
  const [showRenewalModal, setShowRenewalModal] = useState(false);

  const handleRenewal = async (lease: ExpiringLease) => {
    setSelectedLease(lease);
    setShowRenewalModal(true);
  };

  const confirmRenewal = async () => {
    if (!selectedLease) return;
    
    setRenewalLoading(selectedLease.id);
    try {
      // Calculate new end date (1 year from current end date)
      const currentEndDate = new Date(selectedLease.end_date);
      const newEndDate = new Date(currentEndDate.setFullYear(currentEndDate.getFullYear() + 1));
      
      await renewLease(selectedLease.id, newEndDate.toISOString().split('T')[0]);
      toast.success('Lease renewed successfully');
      onLeaseUpdate();
      setShowRenewalModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to renew lease');
    } finally {
      setRenewalLoading(null);
    }
  };

  const getDaysUntilExpiration = (days: number) => {
    if (days <= 0) return 'Expired';
    if (days === 1) return '1 day';
    if (days <= 30) return `${days} days`;
    if (days <= 60) return `${Math.ceil(days / 30)} months`;
    return `${Math.ceil(days / 30)} months`;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 30) return 'text-red-600 bg-red-50 border-red-200';
    if (days <= 60) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Expiring Leases</h2>
                <p className="text-sm text-gray-600">
                  {leases.length} lease{leases.length !== 1 ? 's' : ''} expiring within 60 days
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {leases.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Expiring Leases</h3>
                <p className="text-gray-600">
                  All your leases are in good standing with no expiring soon.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {leases.map((lease) => (
                  <div
                    key={lease.id}
                    className={`border rounded-lg p-6 ${getUrgencyColor(lease.days_until_expiration)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Lease Details */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4" />
                            <span className="font-medium">Lease #{lease.lease_number}</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <p className="font-medium text-gray-900">
                              {lease.property_name}
                            </p>
                            <p className="text-gray-600">
                              Unit {lease.unit_number}
                            </p>
                          </div>
                        </div>

                        {/* Tenant Info */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4" />
                            <span className="font-medium">Tenant</span>
                          </div>
                          <p className="text-sm text-gray-900">{lease.tenant_name}</p>
                        </div>

                        {/* Dates */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Expires</span>
                          </div>
                          <p className="text-sm text-gray-900">
                            {new Date(lease.end_date).toLocaleDateString()}
                          </p>
                          <p className={`text-xs font-medium ${
                            lease.days_until_expiration <= 30 ? 'text-red-600' :
                            lease.days_until_expiration <= 60 ? 'text-orange-600' :
                            'text-yellow-600'
                          }`}>
                            {getDaysUntilExpiration(lease.days_until_expiration)}
                          </p>
                        </div>

                        {/* Rent */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Building className="w-4 h-4" />
                            <span className="font-medium">Monthly Rent</span>
                          </div>
                          <p className="text-sm text-gray-900">
                            ${lease.monthly_rent.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => handleRenewal(lease)}
                          disabled={renewalLoading === lease.id}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm"
                        >
                          Renew Lease
                        </button>
                        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                          View Details
                        </button>
                      </div>
                    </div>

                    {lease.renewal_required && (
                      <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            Action Required: Lease expires within 30 days
                          </span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">
                          Consider reaching out to the tenant to discuss renewal terms.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {leases.filter(l => l.days_until_expiration <= 30).length} leases need immediate attention
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Renewal Confirmation Modal */}
      {showRenewalModal && selectedLease && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Lease Renewal</h3>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="text-sm space-y-2">
                  <p><strong>Lease:</strong> #{selectedLease.lease_number}</p>
                  <p><strong>Property:</strong> {selectedLease.property_name}</p>
                  <p><strong>Unit:</strong> {selectedLease.unit_number}</p>
                  <p><strong>Tenant:</strong> {selectedLease.tenant_name}</p>
                  <p><strong>Current End Date:</strong> {new Date(selectedLease.end_date).toLocaleDateString()}</p>
                  <p><strong>New End Date:</strong> {
                    new Date(new Date(selectedLease.end_date).setFullYear(
                      new Date(selectedLease.end_date).getFullYear() + 1
                    )).toLocaleDateString()
                  }</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRenewalModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRenewal}
                  disabled={renewalLoading === selectedLease.id}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {renewalLoading === selectedLease.id ? 'Renewing...' : 'Confirm Renewal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}