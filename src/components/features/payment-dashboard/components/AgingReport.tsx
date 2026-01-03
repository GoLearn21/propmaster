/**
 * AR Aging Report
 * Shows accounts receivable aging breakdown (Current, 30, 60, 90, 90+ days)
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import {
  Clock,
  AlertTriangle,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  Building,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface AgingBucket {
  label: string;
  amount: number;
  count: number;
  color: string;
  bgColor: string;
}

interface TenantAging {
  tenantId: string;
  tenantName: string;
  propertyName: string;
  unit: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
  lastPaymentDate?: string;
}

interface AgingReportProps {
  loading?: boolean;
}

// Mock data for demonstration - will be replaced with real data from TenantLedgerService
const mockAgingData: TenantAging[] = [
  {
    tenantId: 'tenant-1',
    tenantName: 'Johnson Family',
    propertyName: 'Raleigh Oak Apartments',
    unit: '101A',
    current: 1500,
    days30: 0,
    days60: 0,
    days90: 0,
    over90: 0,
    total: 1500,
    lastPaymentDate: '2025-12-15',
  },
  {
    tenantId: 'tenant-2',
    tenantName: 'Martinez, Roberto',
    propertyName: 'Charlotte Uptown Lofts',
    unit: '405',
    current: 0,
    days30: 1850,
    days60: 0,
    days90: 0,
    over90: 0,
    total: 1850,
    lastPaymentDate: '2025-11-28',
  },
  {
    tenantId: 'tenant-3',
    tenantName: 'Williams Tech LLC',
    propertyName: 'Atlanta Midtown Tower',
    unit: '2201',
    current: 5500,
    days30: 5500,
    days60: 0,
    days90: 0,
    over90: 0,
    total: 11000,
    lastPaymentDate: '2025-11-15',
  },
  {
    tenantId: 'tenant-4',
    tenantName: 'Chen, Amanda',
    propertyName: 'Charleston Harbor View',
    unit: '304',
    current: 0,
    days30: 0,
    days60: 2100,
    days90: 0,
    over90: 0,
    total: 2100,
    lastPaymentDate: '2025-10-20',
  },
  {
    tenantId: 'tenant-5',
    tenantName: 'Smith, James',
    propertyName: 'Decatur Family Homes',
    unit: '12B',
    current: 0,
    days30: 0,
    days60: 0,
    days90: 1800,
    over90: 1800,
    total: 3600,
    lastPaymentDate: '2025-09-05',
  },
];

export const AgingReport: React.FC<AgingReportProps> = ({ loading = false }) => {
  const [tenantAging, setTenantAging] = useState<TenantAging[]>(mockAgingData);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof TenantAging>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterState, setFilterState] = useState<string>('all');

  // Calculate totals for each bucket
  const bucketTotals: AgingBucket[] = [
    {
      label: 'Current',
      amount: tenantAging.reduce((sum, t) => sum + t.current, 0),
      count: tenantAging.filter((t) => t.current > 0).length,
      color: 'text-accent-green',
      bgColor: 'bg-accent-green/10',
    },
    {
      label: '1-30 Days',
      amount: tenantAging.reduce((sum, t) => sum + t.days30, 0),
      count: tenantAging.filter((t) => t.days30 > 0).length,
      color: 'text-accent-orange',
      bgColor: 'bg-accent-orange/10',
    },
    {
      label: '31-60 Days',
      amount: tenantAging.reduce((sum, t) => sum + t.days60, 0),
      count: tenantAging.filter((t) => t.days60 > 0).length,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: '61-90 Days',
      amount: tenantAging.reduce((sum, t) => sum + t.days90, 0),
      count: tenantAging.filter((t) => t.days90 > 0).length,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: '90+ Days',
      amount: tenantAging.reduce((sum, t) => sum + t.over90, 0),
      count: tenantAging.filter((t) => t.over90 > 0).length,
      color: 'text-status-error',
      bgColor: 'bg-red-50',
    },
  ];

  const totalOutstanding = bucketTotals.reduce((sum, b) => sum + b.amount, 0);
  const totalOverdue = bucketTotals.slice(1).reduce((sum, b) => sum + b.amount, 0);

  const toggleRow = (tenantId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(tenantId)) {
      newExpanded.delete(tenantId);
    } else {
      newExpanded.add(tenantId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: keyof TenantAging) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...tenantAging].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const modifier = sortDirection === 'asc' ? 1 : -1;

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * modifier;
    }
    return String(aVal).localeCompare(String(bVal)) * modifier;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Outstanding */}
        <Card className="p-4 col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-small text-neutral-medium">Total Outstanding</span>
          </div>
          <p className="text-h3 font-bold text-neutral-black">{formatCurrency(totalOutstanding)}</p>
          <p className="text-small text-neutral-medium mt-1">
            {tenantAging.length} accounts
          </p>
        </Card>

        {/* Aging Buckets */}
        {bucketTotals.map((bucket) => (
          <Card key={bucket.label} className={`p-4 ${bucket.bgColor}`}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className={`h-4 w-4 ${bucket.color}`} />
              <span className="text-small text-neutral-medium">{bucket.label}</span>
            </div>
            <p className={`text-h4 font-bold ${bucket.color}`}>
              {formatCurrency(bucket.amount)}
            </p>
            <p className="text-small text-neutral-medium mt-1">
              {bucket.count} {bucket.count === 1 ? 'tenant' : 'tenants'}
            </p>
          </Card>
        ))}
      </div>

      {/* Aging Chart Visual */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h4 font-semibold text-neutral-black">Aging Distribution</h3>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {formatCurrency(totalOverdue)} Overdue
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-8 rounded-lg overflow-hidden flex">
          {bucketTotals.map((bucket, index) => {
            const percentage = totalOutstanding > 0 ? (bucket.amount / totalOutstanding) * 100 : 0;
            if (percentage === 0) return null;

            const colors = [
              'bg-accent-green',
              'bg-accent-orange',
              'bg-amber-500',
              'bg-orange-500',
              'bg-status-error',
            ];

            return (
              <div
                key={bucket.label}
                className={`${colors[index]} flex items-center justify-center text-white text-small font-medium transition-all hover:opacity-80`}
                style={{ width: `${percentage}%` }}
                title={`${bucket.label}: ${formatCurrency(bucket.amount)} (${percentage.toFixed(1)}%)`}
              >
                {percentage > 10 && `${percentage.toFixed(0)}%`}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4">
          {bucketTotals.map((bucket, index) => {
            const colors = [
              'bg-accent-green',
              'bg-accent-orange',
              'bg-amber-500',
              'bg-orange-500',
              'bg-status-error',
            ];
            return (
              <div key={bucket.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${colors[index]}`} />
                <span className="text-small text-neutral-medium">{bucket.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Detailed Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-h4 font-semibold text-neutral-black">Tenant Aging Details</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-lighter">
              <tr>
                <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">
                  <button
                    onClick={() => handleSort('tenantName')}
                    className="flex items-center gap-1 hover:text-neutral-black"
                  >
                    Tenant
                    {sortField === 'tenantName' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Property</th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">Current</th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">1-30</th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">31-60</th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">61-90</th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">90+</th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">
                  <button
                    onClick={() => handleSort('total')}
                    className="flex items-center gap-1 hover:text-neutral-black ml-auto"
                  >
                    Total
                    {sortField === 'total' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">Last Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedData.map((tenant) => (
                <React.Fragment key={tenant.tenantId}>
                  <tr
                    className="hover:bg-neutral-lighter/50 cursor-pointer"
                    onClick={() => toggleRow(tenant.tenantId)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-small font-medium text-neutral-black">
                            {tenant.tenantName}
                          </p>
                          <p className="text-small text-neutral-medium">Unit {tenant.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-neutral-medium" />
                        <span className="text-small text-neutral-black">{tenant.propertyName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-small font-medium ${tenant.current > 0 ? 'text-accent-green' : 'text-neutral-medium'}`}>
                        {tenant.current > 0 ? formatCurrency(tenant.current) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-small font-medium ${tenant.days30 > 0 ? 'text-accent-orange' : 'text-neutral-medium'}`}>
                        {tenant.days30 > 0 ? formatCurrency(tenant.days30) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-small font-medium ${tenant.days60 > 0 ? 'text-amber-600' : 'text-neutral-medium'}`}>
                        {tenant.days60 > 0 ? formatCurrency(tenant.days60) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-small font-medium ${tenant.days90 > 0 ? 'text-orange-600' : 'text-neutral-medium'}`}>
                        {tenant.days90 > 0 ? formatCurrency(tenant.days90) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-small font-medium ${tenant.over90 > 0 ? 'text-status-error' : 'text-neutral-medium'}`}>
                        {tenant.over90 > 0 ? formatCurrency(tenant.over90) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-small font-bold text-neutral-black">
                        {formatCurrency(tenant.total)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-small text-neutral-medium">
                        {formatDate(tenant.lastPaymentDate)}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded Row Details */}
                  {expandedRows.has(tenant.tenantId) && (
                    <tr className="bg-neutral-lighter/30">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="flex gap-4">
                          <Button variant="outline" size="sm">
                            View Ledger
                          </Button>
                          <Button variant="outline" size="sm">
                            Send Reminder
                          </Button>
                          <Button variant="outline" size="sm">
                            Create Payment Plan
                          </Button>
                          <Button variant="outline" size="sm">
                            Post Late Fee
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>

            {/* Totals Row */}
            <tfoot className="bg-neutral-light border-t-2 border-border">
              <tr>
                <td className="px-4 py-3 font-semibold text-neutral-black" colSpan={2}>
                  Total ({sortedData.length} tenants)
                </td>
                <td className="px-4 py-3 text-right font-bold text-accent-green">
                  {formatCurrency(bucketTotals[0].amount)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-accent-orange">
                  {formatCurrency(bucketTotals[1].amount)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-amber-600">
                  {formatCurrency(bucketTotals[2].amount)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-orange-600">
                  {formatCurrency(bucketTotals[3].amount)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-status-error">
                  {formatCurrency(bucketTotals[4].amount)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-neutral-black">
                  {formatCurrency(totalOutstanding)}
                </td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AgingReport;
