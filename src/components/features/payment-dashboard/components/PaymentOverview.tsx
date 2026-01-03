import React from 'react';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Badge';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CreditCard,
  Calendar,
  Target,
  Users,
  Building
} from 'lucide-react';
import { PaymentMetrics } from '../types';

interface PaymentOverviewProps {
  metrics: PaymentMetrics | null;
  loading: boolean;
  filters: any;
}

export const PaymentOverview: React.FC<PaymentOverviewProps> = ({
  metrics,
  loading
}) => {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6" data-testid="loading-placeholder">
            <div className="animate-pulse">
              <div className="h-4 bg-neutral-light rounded mb-2"></div>
              <div className="h-8 bg-neutral-light rounded mb-2"></div>
              <div className="h-3 bg-neutral-light rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const metricCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(metrics.totalRevenue),
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: DollarSign,
      description: 'All-time collection total',
      color: 'text-accent-green'
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(metrics.monthlyRevenue),
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      description: 'Current month collections',
      color: 'text-primary'
    },
    {
      title: 'Outstanding Balance',
      value: formatCurrency(metrics.outstandingBalance),
      change: '-3.1%',
      changeType: 'negative' as const,
      icon: AlertTriangle,
      description: 'Total unpaid amounts',
      color: 'text-accent-pink'
    },
    {
      title: 'Collection Rate',
      value: formatPercentage(metrics.collectionRate),
      change: '+2.4%',
      changeType: 'positive' as const,
      icon: Target,
      description: 'Payments collected on time',
      color: 'text-accent-green'
    }
  ];

  const secondaryMetrics = [
    {
      title: 'Pending Payments',
      value: metrics.pendingPayments.toString(),
      icon: Calendar,
      description: 'Payments awaiting processing',
      color: 'text-primary-light'
    },
    {
      title: 'Paid This Month',
      value: formatCurrency(metrics.paidThisMonth),
      icon: CreditCard,
      description: 'Successful payments this month',
      color: 'text-accent-green'
    },
    {
      title: 'Overdue Amount',
      value: formatCurrency(metrics.overdueAmount),
      icon: AlertTriangle,
      description: 'Past due payments',
      color: 'text-accent-pink'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Primary Metrics */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-h3 text-neutral-black font-semibold">
            Payment Overview
          </h2>
          <Badge variant="secondary" className="bg-accent-green text-accent-foreground">
            <TrendingUp className="h-3 w-3 mr-1" />
            +5.2% vs last month
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card 
                key={card.title} 
                className="p-6 bg-white hover:shadow-lg transition-shadow duration-200 border border-border"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-neutral-lighter">
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <Badge 
                    variant={card.changeType === 'positive' ? 'success' : 'destructive'}
                    className="text-xs"
                  >
                    {card.change}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-small font-medium text-neutral-medium">
                    {card.title}
                  </h3>
                  <p className="text-h3 font-bold text-neutral-black">
                    {card.value}
                  </p>
                  <p className="text-tiny text-neutral-medium">
                    {card.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Secondary Metrics */}
      <div>
        <h3 className="text-h4 text-neutral-black font-semibold mb-4">
          Additional Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {secondaryMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card 
                key={metric.title} 
                className="p-6 bg-neutral-lighter hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded-lg bg-white">
                    <Icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-small font-medium text-neutral-medium">
                      {metric.title}
                    </p>
                    <p className="text-h4 font-bold text-neutral-black">
                      {metric.value}
                    </p>
                    <p className="text-tiny text-neutral-medium mt-1">
                      {metric.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="bg-primary rounded-lg p-6 text-primary-foreground">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-90" />
            <p className="text-h4 font-bold">127</p>
            <p className="text-small opacity-90">Active Tenants</p>
          </div>
          <div className="text-center">
            <Building className="h-8 w-8 mx-auto mb-2 opacity-90" />
            <p className="text-h4 font-bold">23</p>
            <p className="text-small opacity-90">Properties</p>
          </div>
          <div className="text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-90" />
            <p className="text-h4 font-bold">1st</p>
            <p className="text-small opacity-90">Next Billing Day</p>
          </div>
          <div className="text-center">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-90" />
            <p className="text-h4 font-bold">95.8%</p>
            <p className="text-small opacity-90">Target Collection Rate</p>
          </div>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h4 text-neutral-black font-semibold">
            Recent Activity Summary
          </h3>
          <button className="text-primary text-small font-medium hover:underline">
            View All Activity →
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-status-success bg-opacity-10 rounded-lg">
              <span className="text-small font-medium text-neutral-black">Payments Today</span>
              <Badge variant="success">24</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-status-warning bg-opacity-10 rounded-lg">
              <span className="text-small font-medium text-neutral-black">Overdue Notices</span>
              <Badge variant="warning">7</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-status-error bg-opacity-10 rounded-lg">
              <span className="text-small font-medium text-neutral-black">Failed Payments</span>
              <Badge variant="destructive">2</Badge>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <div className="space-y-3">
              <h4 className="text-small font-semibold text-neutral-black mb-3">
                Payment Trends (Last 6 Months)
              </h4>
              <div className="flex items-end space-x-2 h-16">
                {[65, 78, 82, 75, 88, 91].map((height, index) => (
                  <div
                    key={index}
                    className="bg-accent-green rounded-t flex-1 transition-all duration-300 hover:bg-accent-green-hover"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-tiny text-neutral-medium">
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
                <span>Dec</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};