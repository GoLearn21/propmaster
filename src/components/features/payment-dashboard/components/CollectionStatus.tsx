import React, { useState } from 'react';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { 
  TrendingUp, 
  Users, 
  Building, 
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { CollectionStatus as CollectionStatusType } from '../types';

interface CollectionStatusProps {
  data: CollectionStatusType | null;
  loading: boolean;
}

export const CollectionStatus: React.FC<CollectionStatusProps> = ({
  data,
  loading
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-light rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-neutral-light rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-neutral-light rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  const statusMetrics = [
    {
      title: 'Total Properties',
      value: data.totalProperties.toString(),
      icon: Building,
      color: 'text-primary',
      bgColor: 'bg-primary bg-opacity-10',
      change: '+2',
      changeType: 'positive' as const
    },
    {
      title: 'Total Tenants',
      value: data.totalTenants.toString(),
      icon: Users,
      color: 'text-accent-green',
      bgColor: 'bg-accent-green bg-opacity-10',
      change: '+8',
      changeType: 'positive' as const
    },
    {
      title: 'Collection Rate',
      value: `${data.collectionRate.toFixed(1)}%`,
      icon: Target,
      color: 'text-accent-green',
      bgColor: 'bg-accent-green bg-opacity-10',
      change: '+2.4%',
      changeType: 'positive' as const
    },
    {
      title: 'Avg Days to Pay',
      value: data.averageDaysToPay.toString(),
      icon: Clock,
      color: 'text-status-warning',
      bgColor: 'bg-status-warning bg-opacity-10',
      change: '-1.2',
      changeType: 'positive' as const
    }
  ];

  const statusBreakdown = [
    {
      status: 'Current',
      count: data.paymentStatus.current,
      percentage: (data.paymentStatus.current / data.totalTenants) * 100,
      color: 'bg-status-success',
      icon: CheckCircle
    },
    {
      status: 'Past Due',
      count: data.paymentStatus.pastDue,
      percentage: (data.paymentStatus.pastDue / data.totalTenants) * 100,
      color: 'bg-status-warning',
      icon: AlertTriangle
    },
    {
      status: 'Severely Delinquent',
      count: data.paymentStatus.severelyDelinquent,
      percentage: (data.paymentStatus.severelyDelinquent / data.totalTenants) * 100,
      color: 'bg-status-error',
      icon: Clock
    }
  ];

  // Mock chart data for demonstration
  const monthlyTrend = [
    { month: 'Jul', revenue: 85000, collection: 92 },
    { month: 'Aug', revenue: 87000, collection: 94 },
    { month: 'Sep', revenue: 89000, collection: 96 },
    { month: 'Oct', revenue: 91000, collection: 95 },
    { month: 'Nov', revenue: 93000, collection: 97 },
    { month: 'Dec', revenue: 95000, collection: 98 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-h3 text-neutral-black font-semibold">
          Payment Collection Status
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as 'month' | 'quarter' | 'year')}
            className="select text-small"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Detailed Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card 
              key={metric.title} 
              className="p-6 bg-white hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
                <Badge 
                  variant={metric.changeType === 'positive' ? 'success' : 'destructive'}
                  className="text-xs flex items-center gap-1"
                >
                  {metric.changeType === 'positive' ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {metric.change}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-small font-medium text-neutral-medium">
                  {metric.title}
                </h3>
                <p className="text-h3 font-bold text-neutral-black">
                  {metric.value}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Status Breakdown and Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Breakdown */}
        <Card className="p-6">
          <h3 className="text-h4 text-neutral-black font-semibold mb-4">
            Payment Status Breakdown
          </h3>
          
          <div className="space-y-4">
            {statusBreakdown.map((status) => {
              const Icon = status.icon;
              return (
                <div key={status.status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${status.color.replace('bg-', 'text-')}`} />
                      <span className="text-small font-medium text-neutral-black">
                        {status.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-small font-semibold text-neutral-black">
                        {status.count}
                      </span>
                      <span className="text-tiny text-neutral-medium ml-2">
                        ({status.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-neutral-light rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${status.color}`}
                      style={{ width: `${status.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-tiny text-neutral-medium">
              <span>Total Outstanding</span>
              <span className="font-semibold text-neutral-black">
                {formatCurrency(data.totalOutstanding)}
              </span>
            </div>
          </div>
        </Card>

        {/* Collection Trend */}
        <Card className="p-6">
          <h3 className="text-h4 text-neutral-black font-semibold mb-4">
            Collection Rate Trend
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-end justify-between h-32">
              {monthlyTrend.map((month, index) => (
                <div key={month.month} className="flex flex-col items-center gap-2 flex-1">
                  <div 
                    className="bg-accent-green rounded-t transition-all duration-300 hover:bg-accent-green-hover w-full max-w-8"
                    style={{ height: `${month.collection}%` }}
                  />
                  <span className="text-tiny text-neutral-medium text-center">
                    {month.month}
                  </span>
                </div>
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

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-small text-neutral-medium">Average Collection Rate</span>
              <Badge variant="success" className="font-semibold">
                95.3%
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Trend */}
      <Card className="p-6">
        <h3 className="text-h4 text-neutral-black font-semibold mb-6">
          Revenue & Collection Performance
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="text-small font-semibold text-neutral-black mb-4">
              Monthly Revenue Trend
            </h4>
            <div className="space-y-3">
              {monthlyTrend.map((month, index) => (
                <div key={month.month} className="flex items-center justify-between p-3 bg-neutral-lighter rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-neutral-medium" />
                    <span className="text-small font-medium text-neutral-black">
                      {month.month} 2024
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-small font-semibold text-neutral-black">
                      {formatCurrency(month.revenue)}
                    </p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-accent-green" />
                      <span className="text-tiny text-accent-green">
                        {month.collection}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-small font-semibold text-neutral-black mb-4">
              Collection Performance Metrics
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-accent-green bg-opacity-10 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-small font-medium text-neutral-black">
                    On-Time Collection Rate
                  </span>
                  <span className="text-h4 font-bold text-accent-green">
                    87.2%
                  </span>
                </div>
                <p className="text-tiny text-neutral-medium">
                  Payments received within grace period
                </p>
              </div>

              <div className="p-4 bg-status-warning bg-opacity-10 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-small font-medium text-neutral-black">
                    Late Payment Recovery
                  </span>
                  <span className="text-h4 font-bold text-status-warning">
                    73.8%
                  </span>
                </div>
                <p className="text-tiny text-neutral-medium">
                  Late payments eventually collected
                </p>
              </div>

              <div className="p-4 bg-primary bg-opacity-10 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-small font-medium text-neutral-black">
                    Average Collection Time
                  </span>
                  <span className="text-h4 font-bold text-primary">
                    {data.averageDaysToPay} days
                  </span>
                </div>
                <p className="text-tiny text-neutral-medium">
                  Time from due date to payment
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Items */}
      <Card className="p-6">
        <h3 className="text-h4 text-neutral-black font-semibold mb-4">
          Recommended Actions
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-status-warning rounded-lg bg-status-warning bg-opacity-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-status-warning" />
              <span className="text-small font-semibold text-neutral-black">
                Follow Up Required
              </span>
            </div>
            <p className="text-tiny text-neutral-medium mb-3">
              {data.paymentStatus.pastDue + data.paymentStatus.severelyDelinquent} tenants need payment reminders
            </p>
            <Button size="sm" className="w-full bg-status-warning hover:bg-status-warning-hover">
              Send Reminders
            </Button>
          </div>

          <div className="p-4 border border-primary rounded-lg bg-primary bg-opacity-5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="text-small font-semibold text-neutral-black">
                Optimization Opportunity
              </span>
            </div>
            <p className="text-tiny text-neutral-medium mb-3">
              Set up auto-billing for current payers
            </p>
            <Button size="sm" variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-white">
              Enable Auto-Billing
            </Button>
          </div>

          <div className="p-4 border border-accent-green rounded-lg bg-accent-green bg-opacity-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-accent-green" />
              <span className="text-small font-semibold text-neutral-black">
                Success Story
              </span>
            </div>
            <p className="text-tiny text-neutral-medium mb-3">
              Collection rate up 2.4% this month
            </p>
            <Button size="sm" variant="outline" className="w-full border-accent-green text-accent-green hover:bg-accent-green hover:text-white">
              View Report
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};