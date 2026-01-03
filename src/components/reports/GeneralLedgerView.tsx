import { useState, useEffect } from 'react';
import { generateGeneralLedgerReport } from '../../services/reportsService';

interface GeneralLedgerViewProps {
  filters: any;
}

export default function GeneralLedgerView({ filters }: GeneralLedgerViewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await generateGeneralLedgerReport(filters);
      setData(result);
    } catch (error) {
      console.error('Failed to load General Ledger report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>;
  }

  const totalDebits = data.reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalCredits = data.reduce((sum, item) => sum + (item.credit || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-teal-50 p-4 rounded-lg">
          <div className="text-sm text-teal-700">Total Transactions</div>
          <div className="text-2xl font-semibold text-teal-900 mt-1">{data.length}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-sm text-red-700">Total Debits</div>
          <div className="text-2xl font-semibold text-red-900 mt-1">${totalDebits.toLocaleString()}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-700">Total Credits</div>
          <div className="text-2xl font-semibold text-green-900 mt-1">${totalCredits.toLocaleString()}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((transaction, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-600">{transaction.date}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{transaction.account}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{transaction.description}</td>
                <td className="px-6 py-4 text-sm text-right text-red-600">
                  {transaction.debit ? `$${transaction.debit.toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-right text-green-600">
                  {transaction.credit ? `$${transaction.credit.toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                  ${transaction.balance.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
