// Transaction Summary Charts Component
import { useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  CreditCard, 
  FileText 
} from 'lucide-react';
import type { TransactionSummary, TransactionFilters } from '../../types/transaction';
import { TRANSACTION_CATEGORY_LABELS } from '../../types/transaction';

interface TransactionSummaryChartsProps {
  summary: TransactionSummary | null;
  loading: boolean;
  filters: TransactionFilters;
}

const CHART_COLORS = [
  '#059669', '#dc2626', '#2563eb', '#7c3aed', '#ea580c',
  '#0891b2', '#be123c', '#4338ca', '#059669', '#dc2626'
];

export default function TransactionSummaryCharts({ summary, loading, filters }: TransactionSummaryChartsProps) {
  // Prepare chart data
  const incomeData = useMemo(() => {
    if (!summary?.income_by_category) return [];
    
    return Object.entries(summary.income_by_category)
      .map(([category, amount]) => ({
        name: TRANSACTION_CATEGORY_LABELS[category as keyof typeof TRANSACTION_CATEGORY_LABELS] || category,
        value: amount,
        amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [summary?.income_by_category]);

  const expenseData = useMemo(() => {
    if (!summary?.expense_by_category) return [];
    
    return Object.entries(summary.expense_by_category)
      .map(([category, amount]) => ({
        name: TRANSACTION_CATEGORY_LABELS[category as keyof typeof TRANSACTION_CATEGORY_LABELS] || category,
        value: amount,
        amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [summary?.expense_by_category]);

  const monthlyData = useMemo(() => {
    if (!summary?.monthly_totals) return [];
    
    return Object.entries(summary.monthly_totals)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        income: data.income,
        expense: data.expense,
        net: data.net,
        incomeFormatted: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.income),
        expenseFormatted: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.expense),
        netFormatted: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.net)
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [summary?.monthly_totals]);

  const paymentMethodData = useMemo(() => {
    if (!summary?.payment_method_breakdown) return [];
    
    return Object.entries(summary.payment_method_breakdown)
      .map(([method, amount]) => ({
        name: method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: amount,
        amount: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [summary?.payment_method_breakdown]);

  const typeSummaryData = useMemo(() => {
    if (!summary?.transaction_type_summary) return [];
    
    return Object.entries(summary.transaction_type_summary)
      .map(([type, data]) => ({
        type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: data.count,
        total: data.total,
        average: data.total / data.count,
        totalFormatted: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.total),
        averageFormatted: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.total / data.count)
      }))
      .sort((a, b) => b.total - a.total);
  }, [summary?.transaction_type_summary]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Summary Data</h3>
        <p className="text-gray-600">No transaction summary available for the selected period.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'amount' ? entry.payload.amount : `${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                  Object.values(summary.income_by_category).reduce((sum, val) => sum + val, 0)
                )}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                  Object.values(summary.expense_by_category).reduce((sum, val) => sum + val, 0)
                )}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Income</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                  Object.values(summary.income_by_category).reduce((sum, val) => sum + val, 0) -
                  Object.values(summary.expense_by_category).reduce((sum, val) => sum + val, 0)
                )}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transaction Types</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {Object.keys(summary.transaction_type_summary).length}
              </p>
            </div>
            <Receipt className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Category Pie Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Income by Category</h3>
          {incomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incomeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {incomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No income data available
            </div>
          )}
        </div>

        {/* Expense by Category Pie Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Expense by Category</h3>
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No expense data available
            </div>
          )}
        </div>

        {/* Monthly Trends Bar Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Income vs Expenses</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="income" fill="#059669" name="Income" />
                <Bar dataKey="expense" fill="#dc2626" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No monthly data available
            </div>
          )}
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h3>
          {paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentMethodData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No payment method data available
            </div>
          )}
        </div>
      </div>

      {/* Transaction Type Summary Table */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Type Summary</h3>
        {typeSummaryData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {typeSummaryData.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {item.totalFormatted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.averageFormatted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No transaction type data available
          </div>
        )}
      </div>
    </div>
  );
}