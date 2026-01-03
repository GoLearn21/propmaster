import React, { useState } from 'react';
import { 
  usePaymentDashboardMetrics, 
  useRecentPayments, 
  usePaymentHistory 
} from '../../hooks/usePayments';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { 
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  Users,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface PaymentDashboardProps {
  propertyId?: string;
}

export function PaymentDashboard({ propertyId }: PaymentDashboardProps) {
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    error: metricsError,
    refetch: refetchMetrics 
  } = usePaymentDashboardMetrics(propertyId);
  
  const { 
    data: recentPayments, 
    isLoading: paymentsLoading 
  } = useRecentPayments(propertyId, 10);
  
  const { 
    data: paymentHistory, 
    isLoading: historyLoading 
  } = usePaymentHistory({
    propertyId,
    status: selectedStatus === 'all' ? undefined : selectedStatus,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'danger';
      case 'failed':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="h-4 w-4" />;
      case 'ach':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (metricsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Payment Data</h3>
          <p className="text-gray-500 mb-4">Unable to load payment dashboard data.</p>
          <Button onClick={() => refetchMetrics()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payments Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor rent collection, track payments, and manage billing
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button>
            <DollarSign className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Collected</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics?.total_collected || 0)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                This month
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics?.outstanding_balance || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {metrics?.pending_payments || 0} pending payments
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Collection Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(metrics?.collection_rate || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Avg {metrics?.avg_days_to_collect?.toFixed(1) || 0} days to collect
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Late Fees</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics?.late_fees_collected || 0)}
              </p>
              <p className="text-sm text-red-500 mt-1">
                {metrics?.overdue_payments || 0} overdue payments
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
            <p className="font-medium text-gray-900">ACH/Bank Transfer</p>
            <p className="text-sm text-gray-500">{metrics?.payment_method_breakdown.ach || 0} payments</p>
          </div>
          <div className="text-center">
            <div className="h-16 w-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
            <p className="font-medium text-gray-900">Credit/Debit Card</p>
            <p className="text-sm text-gray-500">{metrics?.payment_method_breakdown.credit_card || 0} payments</p>
          </div>
          <div className="text-center">
            <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <Users className="h-8 w-8 text-gray-600" />
            </div>
            <p className="font-medium text-gray-900">Other Methods</p>
            <p className="text-sm text-gray-500">{metrics?.payment_method_breakdown.other || 0} payments</p>
          </div>
        </div>
      </Card>

      {/* Recent Payments */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Payments</h3>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>

        {paymentsLoading ? (
          <div className="animate-pulse">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <Table
            headers={[
              'Tenant',
              'Property',
              'Amount',
              'Method',
              'Status',
              'Date',
              'Actions'
            ]}
            rows={recentPayments?.map((payment) => [
              <div key={`tenant-${payment.id}`}>
                <div className="font-medium text-gray-900">
                  {payment.tenant?.first_name} {payment.tenant?.last_name}
                </div>
                <div className="text-sm text-gray-500">{payment.tenant?.email}</div>
              </div>,
              <div key={`property-${payment.id}`} className="text-sm text-gray-600">
                {payment.property?.name}
              </div>,
              <div key={`amount-${payment.id}`} className="font-medium text-gray-900">
                {formatCurrency(payment.amount)}
                {payment.late_fee && (
                  <div className="text-xs text-red-500">
                    +{formatCurrency(payment.late_fee)} late fee
                  </div>
                )}
              </div>,
              <div key={`method-${payment.id}`} className="flex items-center">
                {getPaymentMethodIcon(payment.payment_method)}
                <span className="ml-2 text-sm text-gray-600 capitalize">
                  {payment.payment_method.replace('_', ' ')}
                </span>
              </div>,
              <Badge 
                key={`status-${payment.id}`} 
                variant={getStatusBadgeVariant(payment.status)}
              >
                {payment.status}
              </Badge>,
              <div key={`date-${payment.id}`} className="text-sm text-gray-600">
                {new Date(payment.payment_date).toLocaleDateString()}
              </div>,
              <div key={`actions-${payment.id}`} className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  View
                </Button>
                {payment.status === 'failed' && (
                  <Button variant="outline" size="sm">
                    Retry
                  </Button>
                )}
              </div>,
            ]) || []}
            className="mt-4"
          />
        )}
      </Card>
    </div>
  );
}