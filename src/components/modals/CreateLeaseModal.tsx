import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createLease, updateLease, type Lease } from '../../services/rentalsService';
import toast from 'react-hot-toast';

interface CreateLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lease?: Lease | null;
  properties?: any[];
  units?: any[];
  tenants?: any[];
}

export default function CreateLeaseModal({
  isOpen,
  onClose,
  onSuccess,
  lease,
  properties = [],
  units = [],
  tenants = []
}: CreateLeaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    property_id: '',
    unit_id: '',
    tenant_id: '',
    lease_number: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    security_deposit: '',
    status: 'active',
    lease_type: 'fixed',
    notes: ''
  });

  useEffect(() => {
    if (lease) {
      setFormData({
        property_id: lease.property_id,
        unit_id: lease.unit_id,
        tenant_id: lease.tenant_id || '',
        lease_number: lease.lease_number,
        start_date: lease.start_date,
        end_date: lease.end_date,
        monthly_rent: String(lease.monthly_rent),
        security_deposit: String(lease.security_deposit || ''),
        status: lease.status,
        lease_type: lease.lease_type,
        notes: lease.notes || ''
      });
    } else {
      // Generate lease number
      setFormData(prev => ({
        ...prev,
        lease_number: `LSE-${Date.now()}`
      }));
    }
  }, [lease]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const leaseData = {
        ...formData,
        monthly_rent: parseFloat(formData.monthly_rent),
        security_deposit: parseFloat(formData.security_deposit || '0'),
        tenant_id: formData.tenant_id || null
      };

      if (lease) {
        await updateLease(lease.id, leaseData);
        toast.success('Lease updated successfully');
      } else {
        await createLease(leaseData as any);
        toast.success('Lease created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save lease');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {lease ? 'Edit Lease' : 'Create New Lease'}
          </h2>
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
                onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                {units
                  .filter(u => !formData.property_id || u.property_id === formData.property_id)
                  .map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant
            </label>
            <select
              value={formData.tenant_id}
              onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">Select tenant (optional)</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.first_name} {tenant.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lease Number *
              </label>
              <input
                type="text"
                required
                value={formData.lease_number}
                onChange={(e) => setFormData({ ...formData, lease_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lease Type *
              </label>
              <select
                required
                value={formData.lease_type}
                onChange={(e) => setFormData({ ...formData, lease_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="fixed">Fixed Term</option>
                <option value="month-to-month">Month-to-Month</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rent *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.monthly_rent}
                onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Security Deposit
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.security_deposit}
                onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
              <option value="renewed">Renewed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Additional notes..."
            />
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
              {loading ? 'Saving...' : lease ? 'Update Lease' : 'Create Lease'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
