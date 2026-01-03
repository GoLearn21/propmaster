import { useState, useEffect } from 'react';
import { generateProfitLossReport } from '../../services/reportsService';

interface ProfitLossViewProps {
  filters: any;
}

export default function ProfitLossView({ filters }: ProfitLossViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await generateProfitLossReport(filters);
      setData(result);
    } catch (error) {
      console.error('Failed to load Profit & Loss report:', error);
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
      {/* Summary */}
      <div className="bg-teal-50 p-6 rounded-lg">
        <div className="text-center">
          <div className="text-sm text-teal-700 uppercase tracking-wide">Net Income</div>
          <div className="text-4xl font-bold text-teal-900 mt-2">
            ${data.netIncome.toLocaleString()}
          </div>
          <div className="text-sm text-teal-600 mt-1">{data.properties} Properties</div>
        </div>
      </div>

      {/* Income Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-green-50 px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-green-900">Income</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Rental Income</span>
            <span className="font-semibold text-gray-900">${data.income.rentalIncome.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Late Fees</span>
            <span className="font-semibold text-gray-900">${data.income.lateFees.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Other Income</span>
            <span className="font-semibold text-gray-900">${data.income.otherIncome.toLocaleString()}</span>
          </div>
          <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total Income</span>
            <span className="text-lg font-bold text-green-600">${data.income.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Expenses Section */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-red-50 px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-red-900">Expenses</h3>
        </div>
        <div className="p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Maintenance</span>
            <span className="font-semibold text-gray-900">${data.expenses.maintenance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Utilities</span>
            <span className="font-semibold text-gray-900">${data.expenses.utilities.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Insurance</span>
            <span className="font-semibold text-gray-900">${data.expenses.insurance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Property Tax</span>
            <span className="font-semibold text-gray-900">${data.expenses.propertyTax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Management Fees</span>
            <span className="font-semibold text-gray-900">${data.expenses.management.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Repairs</span>
            <span className="font-semibold text-gray-900">${data.expenses.repairs.toLocaleString()}</span>
          </div>
          <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total Expenses</span>
            <span className="text-lg font-bold text-red-600">${data.expenses.total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
