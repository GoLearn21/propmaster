import { useState, useEffect } from 'react';
import { generateCashFlowReport } from '../../services/reportsService';

interface CashFlowViewProps {
  filters: any;
}

export default function CashFlowView({ filters }: CashFlowViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await generateCashFlowReport(filters);
      setData(result);
    } catch (error) {
      console.error('Failed to load Cash Flow report:', error);
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
      {/* Operating Activities */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-green-50 px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-green-900">Operating Activities</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Net Income</span>
            <span className="font-semibold text-gray-900">${data.operatingActivities.netIncome.toLocaleString()}</span>
          </div>
          <div className="ml-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Depreciation</span>
              <span className="text-gray-700">${data.operatingActivities.adjustments.depreciation.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">A/R Change</span>
              <span className="text-gray-700">${data.operatingActivities.adjustments.accountsReceivableChange.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">A/P Change</span>
              <span className="text-gray-700">${data.operatingActivities.adjustments.accountsPayableChange.toLocaleString()}</span>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
            <span className="font-semibold text-gray-900">Net Cash from Operations</span>
            <span className="font-bold text-green-600">${data.operatingActivities.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Investing Activities */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-blue-50 px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-blue-900">Investing Activities</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Property Acquisitions</span>
            <span className="font-semibold text-gray-900">${data.investingActivities.propertyAcquisitions.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Capital Improvements</span>
            <span className="font-semibold text-gray-900">${data.investingActivities.capitalImprovements.toLocaleString()}</span>
          </div>
          <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
            <span className="font-semibold text-gray-900">Net Cash from Investing</span>
            <span className="font-bold text-blue-600">${data.investingActivities.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Financing Activities */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-purple-50 px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-purple-900">Financing Activities</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Mortgage Payments</span>
            <span className="font-semibold text-gray-900">${data.financingActivities.mortgagePayments.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Owner Contributions</span>
            <span className="font-semibold text-gray-900">${data.financingActivities.ownerContributions.toLocaleString()}</span>
          </div>
          <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
            <span className="font-semibold text-gray-900">Net Cash from Financing</span>
            <span className="font-bold text-purple-600">${data.financingActivities.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Net Cash Flow Summary */}
      <div className="bg-teal-50 p-6 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-teal-900">Net Cash Flow</span>
          <span className={`text-2xl font-bold ${data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${data.netCashFlow.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
