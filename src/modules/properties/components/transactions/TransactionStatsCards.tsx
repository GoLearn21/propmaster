// Transaction Statistics Cards Component
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Activity
} from 'lucide-react';
import type { TransactionStats } from '../../types/transaction';

interface TransactionStatsCardsProps {
  stats: TransactionStats | null;
  loading: boolean;
  onFilterChange: (dateRange: { start_date: string; end_date: string }) => void;
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: React.ReactNode;
  color: 'green' | 'red' | 'blue' | 'yellow' | 'gray';
  loading?: boolean;
}

function StatCard({ title, value, change, icon, color, loading = false }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  const iconColorClasses = {
    green: 'text-green-500',
    red: 'text-red-500',
    blue: 'text-blue-500',
    yellow: 'text-yellow-500',
    gray: 'text-gray-500',
  };

  const changeColorClasses = {
    increase: 'text-green-600',
    decrease: 'text-red-600',
    neutral: 'text-gray-600',
  };

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    }
    return val;
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
        </div>
        {change && (
          <div className="mt-4">
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {formatValue(value)}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-lg border ${colorClasses[color]} flex items-center justify-center`}>
          <div className={iconColorClasses[color]}>
            {icon}
          </div>
        </div>
      </div>
      
      {change && (
        <div className="mt-4 flex items-center gap-1">
          <TrendingUp 
            className={`w-4 h-4 ${
              change.type === 'decrease' ? 'rotate-180' : ''
            } ${changeColorClasses[change.type]}`} 
          />
          <span className={`text-sm font-medium ${changeColorClasses[change.type]}`}>
            {change.type === 'increase' ? '+' : ''}{change.value}%
          </span>
          <span className="text-sm text-gray-500">vs last month</span>
        </div>
      )}
    </div>
  );
}

export default function TransactionStatsCards({ stats, loading, onFilterChange }: TransactionStatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleQuickFilter = (period: 'today' | 'week' | 'month' | 'quarter') => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    onFilterChange({
      start_date: startDate.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    });
  };

  if (!stats && !loading) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Transaction Data</h3>
        <p className="text-gray-600">No transactions found for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Quick Filters</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQuickFilter('today')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => handleQuickFilter('week')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              This Week
            </button>
            <button
              onClick={() => handleQuickFilter('month')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => handleQuickFilter('quarter')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              This Quarter
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Income */}
        <StatCard
          title="Total Income"
          value={stats?.income_amount || 0}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
          loading={loading}
        />

        {/* Total Expenses */}
        <StatCard
          title="Total Expenses"
          value={stats?.expense_amount || 0}
          icon={<TrendingDown className="w-6 h-6" />}
          color="red"
          loading={loading}
        />

        {/* Net Income */}
        <StatCard
          title="Net Income"
          value={stats?.net_amount || 0}
          icon={<TrendingUp className="w-6 h-6" />}
          color={stats && stats.net_amount >= 0 ? 'green' : 'red'}
          loading={loading}
        />

        {/* Total Transactions */}
        <StatCard
          title="Total Transactions"
          value={stats?.total_transactions || 0}
          icon={<Activity className="w-6 h-6" />}
          color="blue"
          loading={loading}
        />

        {/* Pending Transactions */}
        <StatCard
          title="Pending Transactions"
          value={stats?.pending_amount || 0}
          change={{
            value: stats?.pending_transactions || 0,
            type: stats && stats.pending_transactions > 0 ? 'increase' : 'neutral'
          }}
          icon={<Clock className="w-6 h-6" />}
          color="yellow"
          loading={loading}
        />

        {/* Approved Transactions */}
        <StatCard
          title="Approved Transactions"
          value={stats?.approved_amount || 0}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          loading={loading}
        />

        {/* Overdue Transactions */}
        <StatCard
          title="Overdue Amount"
          value={stats?.overdue_amount || 0}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
          loading={loading}
        />

        {/* Unreconciled Transactions */}
        <StatCard
          title="Unreconciled Amount"
          value={stats?.unreconciled_amount || 0}
          icon={<FileText className="w-6 h-6" />}
          color="gray"
          loading={loading}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Transaction Count Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Transaction Counts</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Income Transactions</span>
              <span className="text-sm font-medium text-green-600">
                {stats?.income_transactions || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Expense Transactions</span>
              <span className="text-sm font-medium text-red-600">
                {stats?.expense_transactions || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="text-sm font-medium text-yellow-600">
                {stats?.pending_transactions || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Approved</span>
              <span className="text-sm font-medium text-green-600">
                {stats?.approved_transactions || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Key Metrics</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Transaction</span>
              <span className="text-sm font-medium text-gray-900">
                {stats?.total_transactions 
                  ? formatCurrency((stats.total_amount || 0) / stats.total_transactions)
                  : '$0.00'
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Income Ratio</span>
              <span className="text-sm font-medium text-green-600">
                {stats && stats.total_amount > 0 
                  ? `${((stats.income_amount / stats.total_amount) * 100).toFixed(1)}%`
                  : '0.0%'
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Expense Ratio</span>
              <span className="text-sm font-medium text-red-600">
                {stats && stats.total_amount > 0 
                  ? `${((stats.expense_amount / stats.total_amount) * 100).toFixed(1)}%`
                  : '0.0%'
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Net Margin</span>
              <span className={`text-sm font-medium ${
                stats && stats.net_amount >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats && stats.income_amount > 0 
                  ? `${((stats.net_amount / stats.income_amount) * 100).toFixed(1)}%`
                  : '0.0%'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Reconciliation Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Reconciliation</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Unreconciled</span>
              <span className="text-sm font-medium text-gray-900">
                {stats?.unreconciled_transactions || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Unreconciled Amount</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(stats?.unreconciled_amount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Reconciliation Rate</span>
              <span className="text-sm font-medium text-blue-600">
                {stats?.total_transactions && stats.unreconciled_transactions !== undefined
                  ? `${(((stats.total_transactions - stats.unreconciled_transactions) / stats.total_transactions) * 100).toFixed(1)}%`
                  : '100.0%'
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overdue Items</span>
              <span className="text-sm font-medium text-red-600">
                {stats?.overdue_transactions || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}