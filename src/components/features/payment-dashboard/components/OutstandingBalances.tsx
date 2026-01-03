import React, { useState } from 'react';
import { Card } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { 
  AlertTriangle, 
  Clock, 
  Send,
  Eye,
  Download,
  Filter,
  User,
  Building,
  Calendar,
  DollarSign
} from 'lucide-react';
import { OutstandingBalance } from '../types';

interface OutstandingBalancesProps {
  data: OutstandingBalance[];
  loading: boolean;
}

type SortOption = 'daysOverdue' | 'amount' | 'tenant' | 'property';
type FilterStatus = 'all' | 'current' | 'past_due' | 'severely_delinquent';

export const OutstandingBalances: React.FC<OutstandingBalancesProps> = ({
  data,
  loading
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('daysOverdue');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedBalance, setSelectedBalance] = useState<OutstandingBalance | null>(null);

  const filteredData = data.filter(balance => {
    if (filterStatus === 'all') return true;
    return balance.status === filterStatus;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case 'daysOverdue':
        return b.daysOverdue - a.daysOverdue;
      case 'amount':
        return b.totalOutstanding - a.totalOutstanding;
      case 'tenant':
        return a.tenantName.localeCompare(b.tenantName);
      case 'property':
        return a.propertyName.localeCompare(b.propertyName);
      default:
        return 0;
    }
  });

  const getStatusBadge = (status: OutstandingBalance['status']) => {
    const variants = {
      current: 'success',
      past_due: 'warning',
      severely_delinquent: 'destructive'
    } as const;

    const icons = {
      current: '✓',
      past_due: '⚠',
      severely_delinquent: '⛔'
    };

    return (
      <Badge 
        variant={variants[status] as any}
        className="text-xs font-medium flex items-center gap-1"
      >
        <span>{icons[status]}</span>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getDaysOverdueColor = (days: number) => {
    if (days === 0) return 'text-status-success';
    if (days <= 30) return 'text-status-warning';
    return 'text-status-error';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const summaryStats = {
    totalOutstanding: data.reduce((sum, b) => sum + b.totalOutstanding, 0),
    totalTenants: data.length,
    pastDue: data.filter(b => b.status === 'past_due').length,
    severelyDelinquent: data.filter(b => b.status === 'severely_delinquent').length,
    averageDaysOverdue: Math.round(
      data.reduce((sum, b) => sum + b.daysOverdue, 0) / data.length
    )
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-light rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-neutral-light rounded"></div>
              ))}
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-neutral-light rounded"></div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-h3 text-neutral-black font-semibold">
          Outstanding Balances
        </h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Send className="h-4 w-4 mr-2" />
            Send Reminders
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-primary bg-opacity-10">
          <div className="text-center">
            <p className="text-h4 font-bold text-primary">
              {formatCurrency(summaryStats.totalOutstanding)}
            </p>
            <p className="text-small text-neutral-medium">Total Outstanding</p>
          </div>
        </Card>
        
        <Card className="p-4 bg-neutral-lighter">
          <div className="text-center">
            <p className="text-h4 font-bold text-neutral-black">
              {summaryStats.totalTenants}
            </p>
            <p className="text-small text-neutral-medium">Tenants Affected</p>
          </div>
        </Card>
        
        <Card className="p-4 bg-status-warning bg-opacity-10">
          <div className="text-center">
            <p className="text-h4 font-bold text-status-warning">
              {summaryStats.pastDue}
            </p>
            <p className="text-small text-neutral-medium">Past Due</p>
          </div>
        </Card>
        
        <Card className="p-4 bg-status-error bg-opacity-10">
          <div className="text-center">
            <p className="text-h4 font-bold text-status-error">
              {summaryStats.severelyDelinquent}
            </p>
            <p className="text-small text-neutral-medium">Severely Delinquent</p>
          </div>
        </Card>
        
        <Card className="p-4 bg-accent-green bg-opacity-10">
          <div className="text-center">
            <p className="text-h4 font-bold text-accent-green">
              {summaryStats.averageDaysOverdue}
            </p>
            <p className="text-small text-neutral-medium">Avg Days Overdue</p>
          </div>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card className="p-4 bg-neutral-lighter">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-medium" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="select text-small"
              >
                <option value="all">All Statuses</option>
                <option value="current">Current</option>
                <option value="past_due">Past Due</option>
                <option value="severely_delinquent">Severely Delinquent</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-small text-neutral-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="select text-small"
              >
                <option value="daysOverdue">Days Overdue</option>
                <option value="amount">Outstanding Amount</option>
                <option value="tenant">Tenant Name</option>
                <option value="property">Property Name</option>
              </select>
            </div>
          </div>
          
          <p className="text-small text-neutral-medium">
            Showing {sortedData.length} of {data.length} tenants
          </p>
        </div>
      </Card>

      {/* Outstanding Balances List */}
      <div className="space-y-4">
        {sortedData.map((balance) => (
          <Card 
            key={balance.id} 
            className="p-6 hover:shadow-lg transition-shadow duration-200 border border-border"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              {/* Tenant Info */}
              <div className="lg:col-span-3 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-neutral-medium" />
                  <span className="text-small font-semibold text-neutral-black">
                    {balance.tenantName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-neutral-medium" />
                  <span className="text-tiny text-neutral-medium">
                    {balance.propertyName} - Unit {balance.unitNumber}
                  </span>
                </div>
              </div>

              {/* Amount and Status */}
              <div className="lg:col-span-2 text-center">
                <p className="text-h4 font-bold text-neutral-black">
                  {formatCurrency(balance.totalOutstanding)}
                </p>
                {getStatusBadge(balance.status)}
              </div>

              {/* Days Overdue */}
              <div className="lg:col-span-2 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className={`h-4 w-4 ${getDaysOverdueColor(balance.daysOverdue)}`} />
                  <span className={`text-small font-semibold ${getDaysOverdueColor(balance.daysOverdue)}`}>
                    {balance.daysOverdue === 0 ? 'Current' : `${balance.daysOverdue} days`}
                  </span>
                </div>
                <p className="text-tiny text-neutral-medium">overdue</p>
              </div>

              {/* Breakdown Items Count */}
              <div className="lg:col-span-2 text-center">
                <p className="text-small font-medium text-neutral-black">
                  {balance.items.length} item{balance.items.length !== 1 ? 's' : ''}
                </p>
                <p className="text-tiny text-neutral-medium">outstanding</p>
              </div>

              {/* Last Payment */}
              <div className="lg:col-span-2 text-center">
                {balance.lastPayment ? (
                  <>
                    <p className="text-small font-medium text-neutral-black">
                      {formatCurrency(balance.lastPayment.amount)}
                    </p>
                    <p className="text-tiny text-neutral-medium">
                      {formatDate(balance.lastPayment.date)}
                    </p>
                  </>
                ) : (
                  <p className="text-tiny text-neutral-medium">No payments yet</p>
                )}
              </div>

              {/* Actions */}
              <div className="lg:col-span-1 flex justify-center">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBalance(balance)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick breakdown preview */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-tiny">
                {balance.items.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-neutral-lighter rounded">
                    <span className="text-neutral-medium truncate">{item.description}</span>
                    <span className="font-medium text-neutral-black">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                {balance.items.length > 3 && (
                  <div className="flex items-center justify-center p-2 bg-neutral-lighter rounded text-neutral-medium">
                    +{balance.items.length - 3} more items
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed Balance Modal */}
      {selectedBalance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-h3 text-neutral-black">
                Outstanding Balance Details
              </h3>
              <Button 
                variant="ghost" 
                onClick={() => setSelectedBalance(null)}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Tenant Summary */}
              <Card className="p-4 bg-neutral-lighter">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-small font-medium text-neutral-black">
                      {selectedBalance.tenantName}
                    </p>
                    <p className="text-tiny text-neutral-medium">
                      {selectedBalance.propertyName} - Unit {selectedBalance.unitNumber}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-h4 font-bold text-neutral-black">
                      {formatCurrency(selectedBalance.totalOutstanding)}
                    </p>
                    <p className="text-small text-neutral-medium">Total Outstanding</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className={`h-4 w-4 ${getDaysOverdueColor(selectedBalance.daysOverdue)}`} />
                      <span className={`text-small font-semibold ${getDaysOverdueColor(selectedBalance.daysOverdue)}`}>
                        {selectedBalance.daysOverdue === 0 ? 'Current' : `${selectedBalance.daysOverdue} days overdue`}
                      </span>
                    </div>
                    {getStatusBadge(selectedBalance.status)}
                  </div>
                </div>
              </Card>

              {/* Detailed Items */}
              <div>
                <h4 className="text-h4 text-neutral-black mb-4">Outstanding Items</h4>
                <div className="space-y-3">
                  {selectedBalance.items.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-small font-medium text-neutral-black">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-tiny text-neutral-medium flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {formatDate(item.dueDate)}
                            </span>
                            <span className={`text-tiny font-medium ${getDaysOverdueColor(item.daysOverdue)}`}>
                              {item.daysOverdue === 0 ? 'Current' : `${item.daysOverdue} days overdue`}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-small font-bold text-neutral-black">
                            {formatCurrency(item.amount)}
                          </p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {item.type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline">
                  Send Reminder
                </Button>
                <Button variant="outline">
                  Apply Payment
                </Button>
                <Button className="bg-accent-green hover:bg-accent-green-hover">
                  <Send className="h-4 w-4 mr-2" />
                  Send Notice
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};