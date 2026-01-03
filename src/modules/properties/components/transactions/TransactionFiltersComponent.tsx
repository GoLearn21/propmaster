// Transaction Filters Component
import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Filter, 
  X, 
  Building2, 
  CreditCard, 
  FileText, 
  DollarSign
} from 'lucide-react';
import { 
  TRANSACTION_TYPE_LABELS, 
  TRANSACTION_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  STATUS_LABELS,
  type TransactionFilters,
  type TransactionType,
  type TransactionCategory,
  type PaymentMethod,
  type TransactionStatus
} from '../../types/transaction';
import type { BankAccount } from '../../types/transaction';

interface TransactionFiltersComponentProps {
  filters: TransactionFilters;
  bankAccounts: BankAccount[];
  onFiltersChange: (filters: TransactionFilters) => void;
  onClearFilters: () => void;
}

export default function TransactionFiltersComponent({
  filters,
  bankAccounts,
  onFiltersChange,
  onClearFilters
}: TransactionFiltersComponentProps) {
  const [localFilters, setLocalFilters] = useState<TransactionFilters>(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (field: keyof TransactionFilters, value: any) => {
    const updatedFilters = { ...localFilters, [field]: value };
    setLocalFilters(updatedFilters);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
  };

  const clearAllFilters = () => {
    setLocalFilters({});
    onClearFilters();
  };

  const hasActiveFilters = Object.keys(localFilters).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">Filter Transactions</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-teal-600 hover:text-teal-700"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="date"
              value={localFilters.start_date || ''}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="date"
              value={localFilters.end_date || ''}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Amount Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Min Amount
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={localFilters.amount_min || ''}
              onChange={(e) => handleFilterChange('amount_min', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Amount
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={localFilters.amount_max || ''}
              onChange={(e) => handleFilterChange('amount_max', e.target.value ? parseFloat(e.target.value) : undefined)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="No limit"
            />
          </div>
        </div>

        {/* Basic Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transaction Type
          </label>
          <select
            value={localFilters.transaction_type || ''}
            onChange={(e) => handleFilterChange('transaction_type', e.target.value || undefined)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={localFilters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {Object.entries(TRANSACTION_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={localFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={localFilters.payment_method || ''}
              onChange={(e) => handleFilterChange('payment_method', e.target.value || undefined)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="">All Methods</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-4">
          <h5 className="text-md font-medium text-gray-900 mb-4">Advanced Filters</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Account
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={localFilters.bank_account_id || ''}
                  onChange={(e) => handleFilterChange('bank_account_id', e.target.value || undefined)}
                  className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">All Accounts</option>
                  {bankAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.nickname} - {account.bank_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="unreconciled-only"
                checked={localFilters.unreconciled_only || false}
                onChange={(e) => handleFilterChange('unreconciled_only', e.target.checked || undefined)}
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="unreconciled-only" className="ml-2 text-sm text-gray-700">
                Unreconciled Only
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={localFilters.reference_number || ''}
                  onChange={(e) => handleFilterChange('reference_number', e.target.value || undefined)}
                  className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Search reference..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Filters Button */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={clearAllFilters}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Reset Filters
        </button>
        <button
          onClick={applyFilters}
          className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Apply Filters
        </button>
      </div>
    </div>
  );
}