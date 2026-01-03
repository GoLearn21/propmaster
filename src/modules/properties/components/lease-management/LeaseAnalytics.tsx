import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Home, 
  Users,
  BarChart3,
  PieChart,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

import type { Lease, LeaseStats } from '../types/lease';

interface LeaseAnalyticsProps {
  leases: Lease[];
  stats: LeaseStats | null;
  propertyId?: string;
}

interface MonthlyRevenue {
  month: string;
  year: number;
  revenue: number;
  leases_count: number;
  average_rent: number;
}

interface LeaseTypeAnalytics {
  type: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface ExpirationAnalytics {
  month: string;
  year: number;
  expiring_leases: number;
  risk_revenue: number;
}

export default function LeaseAnalytics({ leases, stats, propertyId }: LeaseAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'3months' | '6months' | '12months' | '24months'>('12months');
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'occupancy' | 'renewals'>('revenue');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const monthlyRevenue = useMemo((): MonthlyRevenue[] => {
    const revenueByMonth = new Map<string, MonthlyRevenue>();
    const currentDate = new Date();
    
    // Initialize months for the selected time range
    for (let i = 0; i < (timeRange === '3months' ? 3 : timeRange === '6months' ? 6 : timeRange === '12months' ? 12 : 24); i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonth.set(monthYear, {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        year: date.getFullYear(),
        revenue: 0,
        leases_count: 0,
        average_rent: 0
      });
    }

    // Calculate revenue from active leases
    leases.filter(lease => lease.status === 'active').forEach(lease => {
      const leaseStart = new Date(lease.start_date);
      const leaseEnd = new Date(lease.end_date);
      
      // Check if lease overlaps with the time range
      const monthsToCheck = Array.from(revenueByMonth.keys());
      monthsToCheck.forEach(monthYear => {
        const [year, month] = monthYear.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59);
        
        if (leaseStart <= monthEnd && leaseEnd >= monthStart) {
          const existing = revenueByMonth.get(monthYear)!;
          existing.revenue += lease.monthly_rent || 0;
          existing.leases_count += 1;
          existing.average_rent = existing.revenue / existing.leases_count;
        }
      });
    });

    return Array.from(revenueByMonth.values()).sort((a, b) => 
      new Date(a.year, a.months?.indexOf(a.month) || 0).getTime() - 
      new Date(b.year, b.months?.indexOf(b.month) || 0).getTime()
    );
  }, [leases, timeRange]);

  const leaseTypeAnalytics = useMemo((): LeaseTypeAnalytics[] => {
    const typeMap = new Map<string, { count: number; revenue: number }>();
    
    leases.forEach(lease => {
      const type = lease.lease_type === 'fixed' ? 'Fixed Term' : 'Month-to-Month';
      const existing = typeMap.get(type) || { count: 0, revenue: 0 };
      existing.count += 1;
      existing.revenue += lease.monthly_rent || 0;
      typeMap.set(type, existing);
    });

    const totalLeases = leases.length;
    return Array.from(typeMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      revenue: data.revenue,
      percentage: totalLeases > 0 ? (data.count / totalLeases) * 100 : 0
    }));
  }, [leases]);

  const expirationAnalytics = useMemo((): ExpirationAnalytics[] => {
    const expirationMap = new Map<string, ExpirationAnalytics>();
    const currentDate = new Date();
    
    // Initialize next 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() + i);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      expirationMap.set(monthYear, {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        year: date.getFullYear(),
        expiring_leases: 0,
        risk_revenue: 0
      });
    }

    leases.filter(lease => lease.status === 'active').forEach(lease => {
      const expirationDate = new Date(lease.end_date);
      const monthYear = `${expirationDate.getFullYear()}-${String(expirationDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (expirationMap.has(monthYear)) {
        const existing = expirationMap.get(monthYear)!;
        existing.expiring_leases += 1;
        existing.risk_revenue += lease.monthly_rent || 0;
      }
    });

    return Array.from(expirationMap.values());
  }, [leases]);

  const averageLeaseDuration = useMemo(() => {
    const durations = leases
      .filter(lease => lease.start_date && lease.end_date)
      .map(lease => {
        const start = new Date(lease.start_date);
        const end = new Date(lease.end_date);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)); // in months
      });
    
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }, [leases]);

  const renewalRate = useMemo(() => {
    const renewedLeases = leases.filter(lease => lease.status === 'renewed').length;
    const totalExpiringLeases = leases.filter(lease => 
      ['active', 'expired', 'renewed'].includes(lease.status)
    ).length;
    
    return totalExpiringLeases > 0 ? (renewedLeases / totalExpiringLeases) * 100 : 0;
  }, [leases]);

  const exportData = () => {
    const data = {
      monthlyRevenue,
      leaseTypeAnalytics,
      expirationAnalytics,
      summary: {
        totalLeases: leases.length,
        activeLeases: stats?.active_leases || 0,
        totalRevenue: stats?.total_monthly_rent || 0,
        averageLeaseDuration: averageLeaseDuration.toFixed(1),
        renewalRate: renewalRate.toFixed(1),
        occupancyRate: stats?.occupancy_rate || 0
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lease-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lease Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive insights into lease performance and trends
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
            <option value="24months">Last 24 Months</option>
          </select>
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Lease Duration</p>
              <p className="text-2xl font-bold text-gray-900">{averageLeaseDuration.toFixed(1)}</p>
              <p className="text-xs text-gray-500">months</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Renewal Rate</p>
              <p className="text-2xl font-bold text-gray-900">{renewalRate.toFixed(1)}%</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                vs last period
              </p>
            </div>
            <RefreshCw className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats?.total_monthly_rent?.toLocaleString() || 0}</p>
              <p className="text-xs text-gray-500">monthly</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.occupancy_rate?.toFixed(1) || 0}%</p>
              <p className="text-xs text-gray-500">
                {stats?.active_leases || 0} of {stats?.total_leases || 0} units
              </p>
            </div>
            <Home className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Monthly Revenue</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {monthlyRevenue.slice(-6).map((month, index) => (
              <div key={month.month} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{month.month} {month.year}</span>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">${month.revenue.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{month.leases_count} leases</div>
                  </div>
                  <div 
                    className="bg-teal-500 h-2 rounded-full"
                    style={{ 
                      width: `${Math.max(20, (month.revenue / Math.max(...monthlyRevenue.map(m => m.revenue))) * 100)}px` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lease Type Distribution */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Lease Type Distribution</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {leaseTypeAnalytics.map((type) => (
              <div key={type.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{type.type}</span>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">{type.count} leases</span>
                    <span className="text-xs text-gray-500 ml-2">({type.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-teal-500 h-2 rounded-full"
                    style={{ width: `${type.percentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">
                  Revenue: ${type.revenue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expiration Risk Analysis */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Lease Expiration Risk Analysis</h3>
          <TrendingDown className="w-5 h-5 text-red-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-sm font-medium text-gray-600">Month</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Expiring Leases</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Risk Revenue</th>
                <th className="text-left py-2 text-sm font-medium text-gray-600">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {expirationAnalytics.filter(month => month.expiring_leases > 0).slice(0, 6).map((month) => (
                <tr key={month.month} className="border-b">
                  <td className="py-3 text-sm text-gray-900">
                    {month.month} {month.year}
                  </td>
                  <td className="py-3 text-sm text-gray-900">
                    {month.expiring_leases}
                  </td>
                  <td className="py-3 text-sm text-gray-900">
                    ${month.risk_revenue.toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      month.expiring_leases > 3
                        ? 'bg-red-100 text-red-800'
                        : month.expiring_leases > 1
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {month.expiring_leases > 3 ? 'High' : month.expiring_leases > 1 ? 'Medium' : 'Low'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Performance Trends</h3>
          <div className="flex gap-2">
            {['revenue', 'occupancy', 'renewals'].map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric as any)}
                className={`px-3 py-1 rounded-lg text-sm font-medium capitalize ${
                  selectedMetric === metric
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {metric}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Revenue Growth</h4>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-bold text-gray-900">+12.5%</span>
              <span className="text-sm text-gray-600">vs last period</span>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Occupancy Trend</h4>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-2xl font-bold text-gray-900">+2.3%</span>
              <span className="text-sm text-gray-600">improvement</span>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Renewal Success</h4>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-2xl font-bold text-gray-900">87.2%</span>
              <span className="text-sm text-gray-600">success rate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}