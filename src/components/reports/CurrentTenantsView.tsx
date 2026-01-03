import { useState, useEffect } from 'react';
import { generateCurrentTenantsReport } from '../../services/reportsService';

interface CurrentTenantsViewProps {
  filters: any;
}

export default function CurrentTenantsView({ filters }: CurrentTenantsViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await generateCurrentTenantsReport(filters);
      setData(result);
    } catch (error) {
      console.error('Failed to load Current Tenants report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-teal-50 p-4 rounded-lg">
        <div className="text-sm text-teal-700">Total Tenants</div>
        <div className="text-2xl font-semibold text-teal-900 mt-1">{data.length}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rent</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lease End</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((tenant, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{tenant.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{tenant.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{tenant.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{tenant.property}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{tenant.unit}</td>
                <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                  ${tenant.rent?.toLocaleString() || '0'}
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  <span className={tenant.balance > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                    ${tenant.balance?.toLocaleString() || '0'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{tenant.leaseEnd || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
