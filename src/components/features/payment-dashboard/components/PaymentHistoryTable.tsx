import React, { useState, useMemo, useCallback } from 'react';
import { Card } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { Table } from '../../../ui/Table';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  User,
  Building,
  DollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  FileSpreadsheet,
  Sliders,
  RefreshCw,
  ChevronDown,
  Check,
} from 'lucide-react';
import { PaymentHistoryItem } from '../types';

interface PaymentHistoryTableProps {
  data: PaymentHistoryItem[];
  loading: boolean;
  filters: any;
}

type SortField = keyof PaymentHistoryItem;
type SortDirection = 'asc' | 'desc';

export const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({
  data,
  loading,
  filters
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('paidDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Modal states
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null);

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    property: 'all',
    method: 'all',
  });

  // Export state
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [exportRange, setExportRange] = useState<'filtered' | 'all'>('filtered');
  const [isExporting, setIsExporting] = useState(false);

  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    // Apply date range filter (from props)
    if (filters?.dateRange) {
      filtered = filtered.filter(item => {
        const itemDate = item.paidDate || item.dueDate;
        return itemDate >= filters.dateRange.start && itemDate <= filters.dateRange.end;
      });
    }

    // Apply amount range filter (from props)
    if (filters?.amountRange) {
      filtered = filtered.filter(item =>
        item.amount >= filters.amountRange.min && item.amount <= filters.amountRange.max
      );
    }

    // Apply advanced filters
    if (advancedFilters.dateFrom) {
      filtered = filtered.filter(item => {
        const itemDate = item.paidDate || item.dueDate;
        return itemDate >= advancedFilters.dateFrom;
      });
    }

    if (advancedFilters.dateTo) {
      filtered = filtered.filter(item => {
        const itemDate = item.paidDate || item.dueDate;
        return itemDate <= advancedFilters.dateTo;
      });
    }

    if (advancedFilters.amountMin) {
      const min = parseFloat(advancedFilters.amountMin);
      filtered = filtered.filter(item => item.amount >= min);
    }

    if (advancedFilters.amountMax) {
      const max = parseFloat(advancedFilters.amountMax);
      filtered = filtered.filter(item => item.amount <= max);
    }

    if (advancedFilters.property !== 'all') {
      filtered = filtered.filter(item =>
        item.propertyName.toLowerCase().includes(advancedFilters.property.toLowerCase())
      );
    }

    if (advancedFilters.method !== 'all') {
      filtered = filtered.filter(item => item.method === advancedFilters.method);
    }

    // Sort data
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle different data types
      if (sortField === 'amount') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (sortField === 'paidDate' || sortField === 'dueDate') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data, searchTerm, statusFilter, typeFilter, sortField, sortDirection, filters, advancedFilters]);

  // Get unique properties for filter dropdown
  const uniqueProperties = useMemo(() => {
    const properties = [...new Set(data.map(item => item.propertyName))];
    return properties.sort();
  }, [data]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (advancedFilters.dateFrom) count++;
    if (advancedFilters.dateTo) count++;
    if (advancedFilters.amountMin) count++;
    if (advancedFilters.amountMax) count++;
    if (advancedFilters.property !== 'all') count++;
    if (advancedFilters.method !== 'all') count++;
    return count;
  }, [statusFilter, typeFilter, advancedFilters]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    setIsExporting(true);

    try {
      const dataToExport = exportRange === 'filtered' ? filteredAndSortedData : data;

      const headers = [
        'Tenant Name',
        'Property',
        'Type',
        'Description',
        'Amount',
        'Status',
        'Method',
        'Due Date',
        'Paid Date',
        'Reference Number',
      ];

      const rows = dataToExport.map(item => [
        item.tenantName,
        item.propertyName,
        item.type.replace('_', ' '),
        item.description,
        item.amount.toFixed(2),
        item.status,
        item.method.replace('_', ' '),
        item.dueDate,
        item.paidDate || 'N/A',
        item.referenceNumber || 'N/A',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(
        <div className="space-y-1">
          <p className="font-medium">Export Successful</p>
          <p className="text-sm text-neutral-medium">
            {dataToExport.length} payments exported to CSV
          </p>
        </div>
      );

      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  }, [filteredAndSortedData, data, exportRange]);

  // Apply advanced filters
  const applyAdvancedFilters = () => {
    setCurrentPage(1); // Reset to first page when applying filters
    setShowFiltersModal(false);
    toast.success('Filters applied');
  };

  // Reset advanced filters
  const resetAdvancedFilters = () => {
    setAdvancedFilters({
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
      property: 'all',
      method: 'all',
    });
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
    toast.success('All filters cleared');
  };

  // View payment details
  const viewPaymentDetails = (payment: PaymentHistoryItem) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) {
      return <ArrowUpDown className="h-4 w-4 text-neutral-medium" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const getStatusBadge = (status: PaymentHistoryItem['status']) => {
    const variants = {
      completed: 'success',
      pending: 'warning',
      failed: 'destructive',
      refunded: 'secondary',
      partial: 'warning'
    } as const;

    return (
      <Badge 
        variant={variants[status] as any}
        className="text-xs font-medium"
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentTypeBadge = (type: PaymentHistoryItem['type']) => {
    const colors = {
      rent: 'bg-primary text-primary-foreground',
      late_fee: 'bg-accent-pink text-white',
      deposit: 'bg-primary-light text-white',
      utility: 'bg-status-info text-white',
      other: 'bg-neutral-medium text-white'
    };

    return (
      <Badge 
        variant="secondary"
        className={`text-xs font-medium ${colors[type]}`}
      >
        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getMethodIcon = (method: PaymentHistoryItem['method']) => {
    const icons = {
      ach: '🏦',
      credit_card: '💳',
      check: '📄',
      cash: '💵',
      bank_transfer: '🏧'
    };
    return icons[method];
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

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-light rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-neutral-light rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-h3 text-neutral-black font-semibold">
          Payment History
        </h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFiltersModal(true)}
            className={activeFiltersCount > 0 ? 'border-primary bg-primary/5' : ''}
          >
            <Sliders className="h-4 w-4 mr-2" />
            More Filters
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 bg-primary text-white text-xs px-1.5 py-0.5 min-w-[20px]">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-neutral-lighter">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 input text-small w-full"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select text-small"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="partial">Partial</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="select text-small"
          >
            <option value="all">All Types</option>
            <option value="rent">Rent</option>
            <option value="late_fee">Late Fee</option>
            <option value="deposit">Deposit</option>
            <option value="utility">Utility</option>
            <option value="other">Other</option>
          </select>

          <div className="text-small text-neutral-medium flex items-center">
            Showing {filteredAndSortedData.length} of {data.length} payments
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-lighter border-b border-border">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-small font-semibold text-neutral-black cursor-pointer hover:bg-neutral-light"
                  onClick={() => handleSort('tenantName')}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Tenant/Property
                    {getSortIcon('tenantName')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-small font-semibold text-neutral-black">
                  Payment Details
                </th>
                <th 
                  className="px-6 py-3 text-left text-small font-semibold text-neutral-black cursor-pointer hover:bg-neutral-light"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Amount
                    {getSortIcon('amount')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-small font-semibold text-neutral-black cursor-pointer hover:bg-neutral-light"
                  onClick={() => handleSort('paidDate')}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date
                    {getSortIcon('paidDate')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-small font-semibold text-neutral-black">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-small font-semibold text-neutral-black">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-small font-semibold text-neutral-black">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.map((payment) => (
                <tr key={payment.id} className="hover:bg-neutral-lighter transition-colors">
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-small font-medium text-neutral-black">
                        {payment.tenantName}
                      </p>
                      <p className="text-tiny text-neutral-medium flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {payment.propertyName}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {getPaymentTypeBadge(payment.type)}
                      <p className="text-small text-neutral-black max-w-xs truncate">
                        {payment.description}
                      </p>
                      {payment.referenceNumber && (
                        <p className="text-tiny text-neutral-medium">
                          Ref: {payment.referenceNumber}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-small font-semibold text-neutral-black">
                      {formatCurrency(payment.amount)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {payment.paidDate ? (
                        <>
                          <p className="text-small text-neutral-black">
                            Paid: {formatDate(payment.paidDate)}
                          </p>
                          <p className="text-tiny text-neutral-medium">
                            Due: {formatDate(payment.dueDate)}
                          </p>
                        </>
                      ) : (
                        <p className="text-small text-neutral-medium">
                          Due: {formatDate(payment.dueDate)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getMethodIcon(payment.method)}</span>
                      <span className="text-small text-neutral-medium capitalize">
                        {payment.method.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-6 py-4">
                    <Button variant="ghost" size="sm" onClick={() => viewPaymentDetails(payment)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-neutral-lighter border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-small text-neutral-medium">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-accent-green bg-opacity-10">
          <div className="text-center">
            <p className="text-h4 font-bold text-accent-green">
              {formatCurrency(filteredAndSortedData.reduce((sum, p) => sum + p.amount, 0))}
            </p>
            <p className="text-small text-neutral-medium">Total Amount</p>
          </div>
        </Card>
        <Card className="p-4 bg-primary bg-opacity-10">
          <div className="text-center">
            <p className="text-h4 font-bold text-primary">
              {filteredAndSortedData.filter(p => p.status === 'completed').length}
            </p>
            <p className="text-small text-neutral-medium">Completed</p>
          </div>
        </Card>
        <Card className="p-4 bg-status-warning bg-opacity-10">
          <div className="text-center">
            <p className="text-h4 font-bold text-status-warning">
              {filteredAndSortedData.filter(p => p.status === 'pending').length}
            </p>
            <p className="text-small text-neutral-medium">Pending</p>
          </div>
        </Card>
        <Card className="p-4 bg-status-error bg-opacity-10">
          <div className="text-center">
            <p className="text-h4 font-bold text-status-error">
              {filteredAndSortedData.filter(p => p.status === 'failed').length}
            </p>
            <p className="text-small text-neutral-medium">Failed</p>
          </div>
        </Card>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">Export Payment History</h2>
                  <p className="text-small text-neutral-medium mt-1">Download data as CSV file</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowExportModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Export Range */}
                <div>
                  <label className="block text-small font-medium text-neutral-black mb-3">
                    Data to Export
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-neutral-lighter">
                      <input
                        type="radio"
                        name="exportRange"
                        checked={exportRange === 'filtered'}
                        onChange={() => setExportRange('filtered')}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="text-small font-medium text-neutral-black">Filtered Results</p>
                        <p className="text-xs text-neutral-medium">
                          {filteredAndSortedData.length} payments matching current filters
                        </p>
                      </div>
                      {exportRange === 'filtered' && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-neutral-lighter">
                      <input
                        type="radio"
                        name="exportRange"
                        checked={exportRange === 'all'}
                        onChange={() => setExportRange('all')}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="text-small font-medium text-neutral-black">All Payments</p>
                        <p className="text-xs text-neutral-medium">
                          {data.length} total payments
                        </p>
                      </div>
                      {exportRange === 'all' && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </label>
                  </div>
                </div>

                {/* File Info */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-small font-medium text-blue-900">CSV Format</p>
                      <p className="text-xs text-blue-700">
                        Compatible with Excel, Google Sheets, and other spreadsheet apps
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowExportModal(false)}>Cancel</Button>
                <Button onClick={handleExportCSV} disabled={isExporting}>
                  {isExporting ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Exporting...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" />Export CSV</>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* More Filters Modal */}
      {showFiltersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">Advanced Filters</h2>
                  <p className="text-small text-neutral-medium mt-1">
                    Refine your payment history search
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowFiltersModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Date Range */}
                <div>
                  <label className="block text-small font-medium text-neutral-black mb-3">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-neutral-medium mb-1">From</label>
                      <input
                        type="date"
                        value={advancedFilters.dateFrom}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-medium mb-1">To</label>
                      <input
                        type="date"
                        value={advancedFilters.dateTo}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Amount Range */}
                <div>
                  <label className="block text-small font-medium text-neutral-black mb-3">
                    <DollarSign className="h-4 w-4 inline mr-2" />
                    Amount Range
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-neutral-medium mb-1">Minimum</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                        <input
                          type="number"
                          value={advancedFilters.amountMin}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full pl-9 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-medium mb-1">Maximum</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                        <input
                          type="number"
                          value={advancedFilters.amountMax}
                          onChange={(e) => setAdvancedFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full pl-9 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Filter */}
                <div>
                  <label className="block text-small font-medium text-neutral-black mb-3">
                    <Building className="h-4 w-4 inline mr-2" />
                    Property
                  </label>
                  <select
                    value={advancedFilters.property}
                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, property: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="all">All Properties</option>
                    {uniqueProperties.map(prop => (
                      <option key={prop} value={prop}>{prop}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Method Filter */}
                <div>
                  <label className="block text-small font-medium text-neutral-black mb-3">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['all', 'ach', 'credit_card', 'check', 'cash', 'bank_transfer'].map(method => (
                      <button
                        key={method}
                        onClick={() => setAdvancedFilters(prev => ({ ...prev, method }))}
                        className={`px-3 py-2 text-small rounded-lg border transition-colors ${
                          advancedFilters.method === method
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {method === 'all' ? 'All' : method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="p-4 bg-neutral-lighter rounded-lg">
                  <p className="text-small font-medium text-neutral-black mb-3">Quick Filters</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                        setAdvancedFilters(prev => ({
                          ...prev,
                          dateFrom: firstDay.toISOString().split('T')[0],
                          dateTo: today.toISOString().split('T')[0],
                        }));
                      }}
                    >
                      This Month
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                        setAdvancedFilters(prev => ({
                          ...prev,
                          dateFrom: lastMonth.toISOString().split('T')[0],
                          dateTo: lastMonthEnd.toISOString().split('T')[0],
                        }));
                      }}
                    >
                      Last Month
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const last90 = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                        setAdvancedFilters(prev => ({
                          ...prev,
                          dateFrom: last90.toISOString().split('T')[0],
                          dateTo: today.toISOString().split('T')[0],
                        }));
                      }}
                    >
                      Last 90 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const today = new Date();
                        const firstDay = new Date(today.getFullYear(), 0, 1);
                        setAdvancedFilters(prev => ({
                          ...prev,
                          dateFrom: firstDay.toISOString().split('T')[0],
                          dateTo: today.toISOString().split('T')[0],
                        }));
                      }}
                    >
                      Year to Date
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={resetAdvancedFilters}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowFiltersModal(false)}>Cancel</Button>
                  <Button onClick={applyAdvancedFilters}>
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">Payment Details</h2>
                  <p className="text-small text-neutral-medium mt-1">
                    {selectedPayment.referenceNumber || 'No reference number'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDetailsModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between p-4 bg-neutral-lighter rounded-lg">
                  <span className="text-small text-neutral-medium">Status</span>
                  {getStatusBadge(selectedPayment.status)}
                </div>

                {/* Amount */}
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-small text-neutral-medium mb-1">Amount</p>
                  <p className="text-h3 font-bold text-neutral-black">
                    {formatCurrency(selectedPayment.amount)}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-small text-neutral-medium mb-1">Tenant</p>
                    <p className="font-medium text-neutral-black">{selectedPayment.tenantName}</p>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-small text-neutral-medium mb-1">Property</p>
                    <p className="font-medium text-neutral-black">{selectedPayment.propertyName}</p>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-small text-neutral-medium mb-1">Type</p>
                    {getPaymentTypeBadge(selectedPayment.type)}
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-small text-neutral-medium mb-1">Method</p>
                    <p className="font-medium text-neutral-black flex items-center gap-2">
                      <span>{getMethodIcon(selectedPayment.method)}</span>
                      {selectedPayment.method.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-small text-neutral-medium mb-1">Due Date</p>
                    <p className="font-medium text-neutral-black">{formatDate(selectedPayment.dueDate)}</p>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-small text-neutral-medium mb-1">Paid Date</p>
                    <p className="font-medium text-neutral-black">
                      {selectedPayment.paidDate ? formatDate(selectedPayment.paidDate) : 'Not paid'}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-small text-neutral-medium mb-1">Description</p>
                  <p className="text-small text-neutral-black">{selectedPayment.description}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Close</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};