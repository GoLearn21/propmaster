import { useState, useEffect } from 'react';
import { generateUndepositedFundsReport } from '../../services/reportsService';

export default function UndepositedFundsView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await generateUndepositedFundsReport();
      setData(result);
    } catch (error) {
      console.error('Failed to load Undeposited Funds report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>;
  }

  const totalUndeposited = data.reduce((sum, item) => sum + item.amount, 0);
  const checkCount = data.filter(item => item.paymentMethod === 'Check').length;
  const cashCount = data.filter(item => item.paymentMethod === 'Cash').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm text-yellow-700">Total Undeposited</div>
          <div className="text-2xl font-semibold text-yellow-900 mt-1">${totalUndeposited.toLocaleString()}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-700">Total Payments</div>
          <div className="text-2xl font-semibold text-blue-900 mt-1">{data.length}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-purple-700">Checks</div>
          <div className="text-2xl font-semibold text-purple-900 mt-1">{checkCount}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-700">Cash</div>
          <div className="text-2xl font-semibold text-green-900 mt-1">{cashCount}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Payment Method</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((payment, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-600">{payment.date}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{payment.tenant}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{payment.property}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{payment.unit}</td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                  ${payment.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    payment.paymentMethod === 'Check' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {payment.paymentMethod}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    {payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-12">
          <div className="text-green-600 text-lg font-semibold">No undeposited funds!</div>
          <div className="text-gray-500 mt-2">All payments have been deposited</div>
        </div>
      )}
    </div>
  );
}
