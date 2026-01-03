import { useState, useEffect } from 'react';
import { generatePropertyReservesReport } from '../../services/reportsService';

interface PropertyReservesViewProps {
  filters: any;
}

export default function PropertyReservesView({ filters }: PropertyReservesViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await generatePropertyReservesReport(filters);
      setData(result);
    } catch (error) {
      console.error('Failed to load Property Reserves report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>;
  }

  const totalReserves = data.reduce((sum, item) => sum + item.currentReserve, 0);
  const avgFundingPercent = data.length > 0 
    ? data.reduce((sum, item) => sum + item.percentFunded, 0) / data.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-teal-50 p-4 rounded-lg">
          <div className="text-sm text-teal-700">Total Reserves</div>
          <div className="text-2xl font-semibold text-teal-900 mt-1">${totalReserves.toLocaleString()}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-700">Properties</div>
          <div className="text-2xl font-semibold text-blue-900 mt-1">{data.length}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-700">Avg Funding</div>
          <div className="text-2xl font-semibold text-green-900 mt-1">{avgFundingPercent.toFixed(1)}%</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current Reserve</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Target Reserve</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Funded</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monthly Contribution</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Expense</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.property}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.address}</td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                  ${item.currentReserve.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">
                  ${item.targetReserve.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          item.percentFunded >= 100 ? 'bg-green-500' :
                          item.percentFunded >= 75 ? 'bg-blue-500' :
                          item.percentFunded >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(item.percentFunded, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.percentFunded.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">
                  ${item.monthlyContribution.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div>{item.lastCapitalExpense}</div>
                  <div className="text-xs text-gray-500">{item.lastExpenseDate}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
