import { useState } from 'react';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  FileText, 
  Calendar, 
  User,
  DollarSign,
  Building,
  Hash
} from 'lucide-react';
import type { Lease } from '../../types/lease';
import { terminateLease, deleteLease } from '../../services/leaseService';
import toast from 'react-hot-toast';

interface LeaseListProps {
  leases: Lease[];
  onLeaseUpdate: () => void;
  onLeaseDelete: () => void;
  onLeaseEdit: (lease: Lease) => void;
}

export default function LeaseList({ leases, onLeaseUpdate, onLeaseDelete, onLeaseEdit }: LeaseListProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: string, lease: Lease) => {
    setActionLoading(lease.id);
    try {
      switch (action) {
        case 'terminate':
          if (confirm('Are you sure you want to terminate this lease?')) {
            await terminateLease(lease.id);
            toast.success('Lease terminated successfully');
            onLeaseUpdate();
          }
          break;
        case 'delete':
          if (confirm('Are you sure you want to delete this lease? This action cannot be undone.')) {
            await deleteLease(lease.id);
            toast.success('Lease deleted successfully');
            onLeaseDelete();
          }
          break;
        case 'edit':
          onLeaseEdit(lease);
          break;
        case 'documents':
          // Navigate to lease documents
          window.open(`/documents/lease/${lease.id}`, '_blank');
          break;
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to ${action} lease`);
    } finally {
      setActionLoading(null);
    }
  };

  if (leases.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No leases found</h3>
        <p className="text-gray-600">
          Create your first lease to get started with lease management.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lease Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property/Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Term
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rent
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leases.map((lease) => (
              <tr key={lease.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Hash className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {lease.lease_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {lease.lease_type === 'fixed' ? 'Fixed Term' : 'Month-to-Month'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Building className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {lease.property?.name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Unit {lease.unit?.unit_number || 'N/A'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {lease.tenant 
                          ? `${lease.tenant.first_name} ${lease.tenant.last_name}`
                          : 'Unassigned'
                        }
                      </div>
                      {lease.tenant && (
                        <div className="text-sm text-gray-500">
                          {lease.tenant.email}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-900">
                        {new Date(lease.start_date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        to {new Date(lease.end_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end">
                    <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        ${lease.monthly_rent?.toLocaleString()}
                      </div>
                      {lease.security_deposit && lease.security_deposit > 0 && (
                        <div className="text-sm text-gray-500">
                          Deposit: ${lease.security_deposit.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    lease.status === 'active' ? 'bg-green-100 text-green-800' :
                    lease.status === 'expired' ? 'bg-red-100 text-red-800' :
                    lease.status === 'terminated' ? 'bg-gray-100 text-gray-800' :
                    lease.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {lease.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="relative">
                    <button
                      disabled={actionLoading === lease.id}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      onClick={() => {
                        const dropdown = document.getElementById(`lease-actions-${lease.id}`);
                        dropdown?.classList.toggle('hidden');
                      }}
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    
                    <div
                      id={`lease-actions-${lease.id}`}
                      className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                    >
                      <div className="py-1">
                        <button
                          onClick={() => handleAction('edit', lease)}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Lease
                        </button>
                        <button
                          onClick={() => handleAction('documents', lease)}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Documents
                        </button>
                        {lease.status === 'active' && (
                          <button
                            onClick={() => handleAction('terminate', lease)}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Terminate
                          </button>
                        )}
                        <button
                          onClick={() => handleAction('delete', lease)}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}