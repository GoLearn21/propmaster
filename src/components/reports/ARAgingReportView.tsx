import { useState, useEffect } from 'react';
import { generateARAgingReport } from '../../services/reportsService';

interface ARAgingReportViewProps {
  filters: any;
}

export default function ARAgingReportView({ filters }: ARAgingReportViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await generateARAgingReport(filters);
      setData(result);
    } catch (error) {
      console.error('Failed to load A/R Aging report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>;
  }

  const totals = data.reduce((acc, item) => {
    acc.total += item.balance;
    if (item.daysOverdue <= 30) acc['0-30'] += item.balance;
    else if (item.daysOverdue <= 60) acc['31-60'] += item.balance;
    else if (item.daysOverdue <= 90) acc['61-90'] += item.balance;
    else acc['90+'] += item.balance;
    return acc;
  }, { total: 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600">Total Outstanding</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            ${totals.total.toLocaleString()}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-700">0-30 Days</div>
          <div className="text-2xl font-semibold text-green-900 mt-1">
            ${totals['0-30'].toLocaleString()}
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm text-yellow-700">31-60 Days</div>
          <div className="text-2xl font-semibold text-yellow-900 mt-1">
            ${totals['31-60'].toLocaleString()}
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-sm text-orange-700">61-90 Days</div>
          <div className="text-2xl font-semibold text-orange-900 mt-1">
            ${totals['61-90'].toLocaleString()}
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-sm text-red-700">90+ Days</div>
          <div className="text-2xl font-semibold text-red-900 mt-1">
            ${totals['90+'].toLocaleString()}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Days Overdue</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aging Bucket</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.tenant}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.property}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  ${item.balance.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600">{item.daysOverdue}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.agingBucket === '0-30 days' ? 'bg-green-100 text-green-800' :
                    item.agingBucket === '31-60 days' ? 'bg-yellow-100 text-yellow-800' :
                    item.agingBucket === '61-90 days' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.agingBucket}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
