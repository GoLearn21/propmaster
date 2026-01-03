import { useState, useEffect } from 'react';
import { generateBalanceSheetReport } from '../../services/reportsService';

interface BalanceSheetViewProps {
  filters: any;
}

export default function BalanceSheetView({ filters }: BalanceSheetViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await generateBalanceSheetReport(filters);
      setData(result);
    } catch (error) {
      console.error('Failed to load Balance Sheet report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
    </div>;
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Assets Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-green-50 px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-green-900">Assets</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Property Value</span>
            <span className="font-semibold text-gray-900">${data.assets.propertyValue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Cash on Hand</span>
            <span className="font-semibold text-gray-900">${data.assets.cashOnHand.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Accounts Receivable</span>
            <span className="font-semibold text-gray-900">${data.assets.accountsReceivable.toLocaleString()}</span>
          </div>
          <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total Assets</span>
            <span className="text-lg font-bold text-green-600">${data.assets.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Liabilities Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-red-50 px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-red-900">Liabilities</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Mortgage Payable</span>
            <span className="font-semibold text-gray-900">${data.liabilities.mortgagePayable.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Security Deposits</span>
            <span className="font-semibold text-gray-900">${data.liabilities.securityDeposits.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Accounts Payable</span>
            <span className="font-semibold text-gray-900">${data.liabilities.accountsPayable.toLocaleString()}</span>
          </div>
          <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total Liabilities</span>
            <span className="text-lg font-bold text-red-600">${data.liabilities.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Equity Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-blue-50 px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-blue-900">Equity</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Owner's Equity</span>
            <span className="font-semibold text-gray-900">${data.equity.ownersEquity.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Retained Earnings</span>
            <span className="font-semibold text-gray-900">${data.equity.retainedEarnings.toLocaleString()}</span>
          </div>
          <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total Equity</span>
            <span className="text-lg font-bold text-blue-600">${data.equity.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-teal-50 p-6 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-teal-900">Total Liabilities & Equity</span>
          <span className="text-2xl font-bold text-teal-900">${data.totalLiabilitiesAndEquity.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
