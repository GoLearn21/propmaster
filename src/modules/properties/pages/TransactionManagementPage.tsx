// Transaction Management Dashboard Page
import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  Filter,
  Plus,
  Search,
  Download,
  RefreshCw,
  Calendar,
  CreditCard,
  Building2,
  Users,
  Receipt,
  FileText,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Check,
  X,
  Banknote,
  ArrowUpDown
} from 'lucide-react';
import { useTransactionManagement } from '../hooks/useTransactionManagement';
import { 
  TRANSACTION_TYPE_LABELS, 
  TRANSACTION_CATEGORY_LABELS, 
  PAYMENT_METHOD_LABELS,
  STATUS_LABELS,
  type Transaction,
  type TransactionFilters
} from '../types/transaction';
import TransactionCreationModal from '../components/transactions/TransactionCreationModal';
import TransactionDetailsModal from '../components/transactions/TransactionDetailsModal';
import TransactionFiltersComponent from '../components/transactions/TransactionFiltersComponent';
import TransactionStatsCards from '../components/transactions/TransactionStatsCards';
import TransactionSummaryCharts from '../components/transactions/TransactionSummaryCharts';

interface TransactionManagementPageProps {
  propertyId?: string;
}

export default function TransactionManagementPage({ propertyId }: TransactionManagementPageProps) {
  const [state, actions] = useTransactionManagement({ propertyId });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'summary'>('table');
  const [sortField, setSortField] = useState<string>('transaction_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const {
    transactions,
    transactionStats,
    transactionSummary,
    bankAccounts,
    transactionTemplates,
    currentPage,
    totalTransactions,
    hasMore,
    filters,
    searchQuery,
    loading,
    loadingStats,
    error,
    selectedTransactions
  } = state;

  const {
    setFilters,
    clearFilters,
    setSearchQuery,
    setCurrentPage,
    goToNextPage,
    goToPreviousPage,
    approveTransactionById,
    voidTransactionById,
    loadTransaction,
    toggleTransactionSelection,
    exportSelectedTransactions,
    exportFilteredTransactions,
    refreshData
  } = actions;

  // Load initial data
  useEffect(() => {
    if (propertyId) {
      setFilters({ property_id: propertyId });
    }
  }, [propertyId]);

  // Handle transaction sorting
  const sortedTransactions = [...transactions].sort((a, b) => {
    let aValue = a[sortField as keyof Transaction];
    let bValue = b[sortField as keyof Transaction];

    if (sortField === 'amount') {
      aValue = Number(aValue);
      bValue = Number(bValue);
    } else if (sortField === 'transaction_date') {
      aValue = new Date(aValue as string).getTime();
      bValue = new Date(bValue as string).getTime();
    } else if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle transaction status changes
  const handleApproveTransaction = async (id: string) => {
    await approveTransactionById(id);
  };

  const handleVoidTransaction = async (id: string) => {
    const reason = prompt('Enter reason for voiding this transaction:');
    if (reason) {
      await voidTransactionById(id, reason);
    }
  };

  // Handle transaction creation success
  const handleTransactionCreated = (transaction: Transaction) => {
    setShowCreateModal(false);
    // Transaction will be automatically refreshed by the hook
  };

  // Handle view transaction details
  const handleViewTransaction = (id: string) => {
    setSelectedTransactionId(id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'void': return <X className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAmountColor = (transaction: Transaction) => {
    const incomeCategories = ['rental_income', 'late_fees', 'pet_fees', 'parking_fees', 'other_income'];
    return incomeCategories.includes(transaction.category) ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Transaction Management
              {propertyId && <span className="text-sm font-normal text-gray-600 ml-2">• Property Specific</span>}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage all property-related financial transactions
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Transaction
            </button>
            <button
              onClick={refreshData}
              disabled={loading}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-8 mt-6 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="px-8 py-6">
        <TransactionStatsCards 
          stats={transactionStats}
          loading={loadingStats}
          onFilterChange={(dateRange) => setFilters(dateRange)}
        />
      </div>

      {/* Summary Charts */}
      <div className="px-8 pb-6">
        <TransactionSummaryCharts 
          summary={transactionSummary}
          loading={loadingStats}
          filters={filters}
        />
      </div>

      {/* Toolbar */}
      <div className="px-8 py-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search and Filters */}
            <div className="flex items-center gap-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                  showFilters 
                    ? 'bg-teal-50 border-teal-200 text-teal-700' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('summary')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    viewMode === 'summary' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Summary
                </button>
              </div>

              {/* Export Buttons */}
              {selectedTransactions.length > 0 && (
                <button
                  onClick={exportSelectedTransactions}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Selected ({selectedTransactions.length})
                </button>
              )}
              <button
                onClick={() => exportFilteredTransactions(filters)}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export All
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <TransactionFiltersComponent
                filters={filters}
                bankAccounts={bankAccounts}
                onFiltersChange={setFilters}
                onClearFilters={clearFilters}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 pb-8">
        {viewMode === 'table' && (
          <div className="bg-white rounded-lg border border-gray-200">
            {/* Table Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Transactions ({totalTransactions})
                </h3>
                {selectedTransactions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {selectedTransactions.length} selected
                    </span>
                    <button
                      onClick={() => actions.clearSelection()}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              </div>
            )}

            {/* Table */}
            {!loading && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              actions.selectMultipleTransactions(sortedTransactions.map(t => t.id));
                            } else {
                              actions.clearSelection();
                            }
                          }}
                          checked={selectedTransactions.length === sortedTransactions.length}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort('transaction_date')}
                          className="flex items-center gap-1 hover:text-gray-700"
                        >
                          Date
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <button
                          onClick={() => handleSort('amount')}
                          className="flex items-center gap-1 hover:text-gray-700"
                        >
                          Amount
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Property
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedTransactions.includes(transaction.id)}
                            onChange={() => toggleTransactionSelection(transaction.id)}
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transaction.transaction_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {TRANSACTION_TYPE_LABELS[transaction.transaction_type]}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={transaction.description}>
                            {transaction.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {TRANSACTION_CATEGORY_LABELS[transaction.category]}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getAmountColor(transaction)}`}>
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(transaction.status)}
                            <span className="text-sm text-gray-900">
                              {STATUS_LABELS[transaction.status]}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.property?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewTransaction(transaction.id)}
                              className="text-teal-600 hover:text-teal-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {transaction.status === 'draft' && (
                              <>
                                <button
                                  onClick={() => handleApproveTransaction(transaction.id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleVoidTransaction(transaction.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Void"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && totalTransactions > 0 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(currentPage - 1) * 50 + 1} to {Math.min(currentPage * 50, totalTransactions)} of {totalTransactions} results
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-2 text-sm text-gray-700">
                      Page {currentPage}
                    </span>
                    <button
                      onClick={goToNextPage}
                      disabled={!hasMore}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedTransactions.map((transaction) => (
              <div key={transaction.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(transaction.status)}
                    <span className="text-sm text-gray-600">
                      {STATUS_LABELS[transaction.status]}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedTransactions.includes(transaction.id)}
                    onChange={() => toggleTransactionSelection(transaction.id)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </div>
                
                <h3 className="font-medium text-gray-900 mb-2">
                  {TRANSACTION_TYPE_LABELS[transaction.transaction_type]}
                </h3>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {transaction.description}
                </p>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-semibold ${getAmountColor(transaction)}">
                    {formatCurrency(transaction.amount)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(transaction.transaction_date)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {TRANSACTION_CATEGORY_LABELS[transaction.category]}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleViewTransaction(transaction.id)}
                      className="p-1 text-teal-600 hover:text-teal-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {transaction.status === 'draft' && (
                      <button
                        onClick={() => handleApproveTransaction(transaction.id)}
                        className="p-1 text-green-600 hover:text-green-900"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'summary' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Transaction Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Income by Category */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Income by Category</h4>
                <div className="space-y-2">
                  {transactionSummary && Object.entries(transactionSummary.income_by_category).map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {TRANSACTION_CATEGORY_LABELS[category as keyof typeof TRANSACTION_CATEGORY_LABELS]}
                      </span>
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expense by Category */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Expense by Category</h4>
                <div className="space-y-2">
                  {transactionSummary && Object.entries(transactionSummary.expense_by_category).map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {TRANSACTION_CATEGORY_LABELS[category as keyof typeof TRANSACTION_CATEGORY_LABELS]}
                      </span>
                      <span className="text-sm font-medium text-red-600">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <TransactionCreationModal
          propertyId={propertyId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleTransactionCreated}
        />
      )}

      {selectedTransactionId && (
        <TransactionDetailsModal
          transactionId={selectedTransactionId}
          onClose={() => setSelectedTransactionId(null)}
          onUpdate={() => {
            setSelectedTransactionId(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
}