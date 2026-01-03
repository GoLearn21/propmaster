import { useState, useEffect } from 'react';
import { generateRentRollReport } from '../../services/reportsService';

interface RentRollViewProps {
  filters: any;
}

export default function RentRollView({ filters }: RentRollViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await generateRentRollReport(filters);
      setData(result);
    } catch (error) {
      console.error('Failed to load Rent Roll report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>;
  }

  const totalRent = data.reduce((sum, item) => sum + (item.rent || 0), 0);
  const occupiedUnits = data.filter(item => item.status === 'occupied').length;
  const occupancyRate = data.length > 0 ? (occupiedUnits / data.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-teal-50 p-4 rounded-lg">
          <div className="text-sm text-teal-700">Total Units</div>
          <div className="text-2xl font-semibold text-teal-900 mt-1">{data.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-700">Occupied</div>
          <div className="text-2xl font-semibold text-green-900 mt-1">{occupiedUnits}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-700">Occupancy Rate</div>
          <div className="text-2xl font-semibold text-blue-900 mt-1">{occupancyRate.toFixed(1)}%</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-purple-700">Monthly Rent</div>
          <div className="text-2xl font-semibold text-purple-900 mt-1">${totalRent.toLocaleString()}</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Bed/Bath</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sq Ft</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rent</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lease End</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{item.property}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.unit}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.tenant}</td>
                <td className="px-6 py-4 text-sm text-center text-gray-600">{item.bedrooms}/{item.bathrooms}</td>
                <td className="px-6 py-4 text-sm text-center text-gray-600">{item.sqft}</td>
                <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                  ${item.rent?.toLocaleString() || '0'}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.status === 'occupied' ? 'bg-green-100 text-green-800' :
                    item.status === 'vacant' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.leaseEnd || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
