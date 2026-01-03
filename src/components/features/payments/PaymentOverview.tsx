import React from 'react';
import { PaymentMetrics, QuickStat } from './types';

interface PaymentOverviewProps {
  metrics: PaymentMetrics;
  loading?: boolean;
}

export const PaymentOverview: React.FC<PaymentOverviewProps> = ({ metrics, loading = false }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const quickStats: QuickStat[] = [
    {
      label: 'Total Collected',
      value: `$${metrics.totalCollected.toLocaleString()}`,
      change: metrics.monthlyChange,
      changeType: metrics.monthlyChange >= 0 ? 'positive' : 'negative',
      icon: '💰'
    },
    {
      label: 'Outstanding',
      value: `$${metrics.totalOutstanding.toLocaleString()}`,
      icon: '📋'
    },
    {
      label: 'Collection Rate',
      value: `${metrics.collectionRate}%`,
      icon: '📊'
    },
    {
      label: 'Overdue',
      value: `$${metrics.overdueAmount.toLocaleString()}`,
      icon: '⚠️'
    }
  ];

  const getStatusBadge = (value: number, threshold: number, type: 'positive' | 'negative' | 'warning') => {
    const colors = {
      positive: 'bg-green-100 text-green-800',
      negative: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type]}`}>
        {type === 'positive' ? '↑' : type === 'negative' ? '↓' : '⚠'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                {stat.icon && <span className="text-lg">{stat.icon}</span>}
              </div>
              <div className="mt-2">
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                {stat.change !== undefined && (
                  <div className="mt-1 flex items-center">
                    {getStatusBadge(
                      stat.change,
                      0,
                      stat.changeType || 'neutral'
                    )}
                    <p className="ml-2 text-sm text-gray-500">
                      {stat.change > 0 ? '+' : ''}{stat.change}% from last month
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentOverview;