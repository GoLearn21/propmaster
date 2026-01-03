// Transaction Management Hook
import { useState, useEffect, useCallback } from 'react';
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  TransactionStats,
  TransactionSummary,
  PaginatedTransactions,
  BankAccount,
  TransactionTemplate
} from '../types/transaction';
import {
  getTransactions,
  getPropertyTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  voidTransaction,
  getTransactionStats,
  getTransactionSummary,
  getBankAccounts,
  createBankAccount,
  getTransactionTemplates,
  createTransactionFromTemplate,
  bulkApproveTransactions,
  bulkDeleteTransactions,
  exportTransactionsToCSV
} from '../services/transactionService';

interface UseTransactionManagementOptions {
  propertyId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface TransactionManagementState {
  // Data
  transactions: Transaction[];
  transactionStats: TransactionStats | null;
  transactionSummary: TransactionSummary | null;
  bankAccounts: BankAccount[];
  transactionTemplates: TransactionTemplate[];
  
  // Pagination
  currentPage: number;
  totalTransactions: number;
  hasMore: boolean;
  
  // Filters and Search
  filters: TransactionFilters;
  searchQuery: string;
  
  // Loading States
  loading: boolean;
  loadingStats: boolean;
  loadingSummary: boolean;
  loadingExport: boolean;
  
  // Error State
  error: string | null;
  
  // Selected Items
  selectedTransactions: string[];
  selectedTransaction: Transaction | null;
}

interface TransactionManagementActions {
  // Data Loading
  loadTransactions: (page?: number, filters?: TransactionFilters) => Promise<void>;
  loadTransactionStats: (filters?: TransactionFilters) => Promise<void>;
  loadTransactionSummary: (filters?: TransactionFilters) => Promise<void>;
  loadBankAccounts: () => Promise<void>;
  loadTransactionTemplates: () => Promise<void>;
  
  // Transaction Operations
  createNewTransaction: (input: CreateTransactionInput) => Promise<Transaction | null>;
  updateExistingTransaction: (input: UpdateTransactionInput) => Promise<Transaction | null>;
  removeTransaction: (id: string) => Promise<boolean>;
  approveTransactionById: (id: string) => Promise<boolean>;
  voidTransactionById: (id: string, reason?: string) => Promise<boolean>;
  loadTransaction: (id: string) => Promise<Transaction | null>;
  
  // Bulk Operations
  approveMultipleTransactions: (ids: string[]) => Promise<boolean>;
  deleteMultipleTransactions: (ids: string[]) => Promise<boolean>;
  
  // Template Operations
  createFromTemplate: (templateId: string, date: string) => Promise<Transaction | null>;
  
  // Filter and Search
  setFilters: (filters: TransactionFilters) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  
  // Pagination
  setCurrentPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  
  // Selection
  selectTransaction: (id: string) => void;
  selectMultipleTransactions: (ids: string[]) => void;
  clearSelection: () => void;
  toggleTransactionSelection: (id: string) => void;
  
  // Export
  exportSelectedTransactions: () => void;
  exportFilteredTransactions: (filters?: TransactionFilters) => void;
  
  // Utility
  refreshData: () => Promise<void>;
  reset: () => void;
}

export function useTransactionManagement(options: UseTransactionManagementOptions = {}): [
  TransactionManagementState,
  TransactionManagementActions
] {
  const {
    propertyId,
    autoRefresh = true,
    refreshInterval = 30000 // 30 seconds
  } = options;

  // State
  const [state, setState] = useState<TransactionManagementState>({
    transactions: [],
    transactionStats: null,
    transactionSummary: null,
    bankAccounts: [],
    transactionTemplates: [],
    currentPage: 1,
    totalTransactions: 0,
    hasMore: false,
    filters: propertyId ? { property_id: propertyId } : {},
    searchQuery: '',
    loading: false,
    loadingStats: false,
    loadingSummary: false,
    loadingExport: false,
    error: null,
    selectedTransactions: [],
    selectedTransaction: null
  });

  // Default filters
  const defaultFilters: TransactionFilters = {
    ...(propertyId ? { property_id: propertyId } : {}),
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
    end_date: new Date().toISOString().split('T')[0] // Today
  };

  // Load Transactions
  const loadTransactions = useCallback(async (page: number = 1, filters?: TransactionFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const finalFilters = filters || state.filters;
      const result = propertyId 
        ? await getPropertyTransactions(propertyId, finalFilters, page, 50)
        : await getTransactions(finalFilters, page, 50);

      setState(prev => ({
        ...prev,
        transactions: result.transactions,
        currentPage: result.page,
        totalTransactions: result.total,
        hasMore: result.has_more,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load transactions'
      }));
    }
  }, [propertyId, state.filters]);

  // Load Transaction Stats
  const loadTransactionStats = useCallback(async (filters?: TransactionFilters) => {
    setState(prev => ({ ...prev, loadingStats: true }));
    
    try {
      const finalFilters = filters || state.filters;
      const stats = await getTransactionStats(finalFilters);
      
      setState(prev => ({
        ...prev,
        transactionStats: stats,
        loadingStats: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loadingStats: false,
        error: error instanceof Error ? error.message : 'Failed to load transaction stats'
      }));
    }
  }, [state.filters]);

  // Load Transaction Summary
  const loadTransactionSummary = useCallback(async (filters?: TransactionFilters) => {
    setState(prev => ({ ...prev, loadingSummary: true }));
    
    try {
      const finalFilters = filters || state.filters;
      const summary = await getTransactionSummary(finalFilters);
      
      setState(prev => ({
        ...prev,
        transactionSummary: summary,
        loadingSummary: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loadingSummary: false,
        error: error instanceof Error ? error.message : 'Failed to load transaction summary'
      }));
    }
  }, [state.filters]);

  // Load Bank Accounts
  const loadBankAccounts = useCallback(async () => {
    try {
      const accounts = await getBankAccounts();
      setState(prev => ({ ...prev, bankAccounts: accounts }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load bank accounts'
      }));
    }
  }, []);

  // Load Transaction Templates
  const loadTransactionTemplates = useCallback(async () => {
    try {
      const templates = await getTransactionTemplates(propertyId);
      setState(prev => ({ ...prev, transactionTemplates: templates }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load transaction templates'
      }));
    }
  }, [propertyId]);

  // Create Transaction
  const createNewTransaction = useCallback(async (input: CreateTransactionInput) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const transaction = await createTransaction(input);
      await loadTransactions(state.currentPage);
      await loadTransactionStats();
      await loadTransactionSummary();
      
      setState(prev => ({
        ...prev,
        loading: false,
        selectedTransaction: transaction
      }));
      
      return transaction;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create transaction'
      }));
      return null;
    }
  }, [state.currentPage]);

  // Update Transaction
  const updateExistingTransaction = useCallback(async (input: UpdateTransactionInput) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const transaction = await updateTransaction(input);
      await loadTransactions(state.currentPage);
      
      setState(prev => ({
        ...prev,
        loading: false,
        selectedTransaction: transaction
      }));
      
      return transaction;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to update transaction'
      }));
      return null;
    }
  }, [state.currentPage]);

  // Delete Transaction
  const removeTransaction = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await deleteTransaction(id);
      await loadTransactions(state.currentPage);
      await loadTransactionStats();
      await loadTransactionSummary();
      
      setState(prev => ({
        ...prev,
        loading: false,
        selectedTransactions: prev.selectedTransactions.filter(tid => tid !== id)
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to delete transaction'
      }));
      return false;
    }
  }, [state.currentPage]);

  // Approve Transaction
  const approveTransactionById = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await approveTransaction(id);
      await loadTransactions(state.currentPage);
      await loadTransactionStats();
      
      setState(prev => ({ ...prev, loading: false }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to approve transaction'
      }));
      return false;
    }
  }, [state.currentPage]);

  // Void Transaction
  const voidTransactionById = useCallback(async (id: string, reason?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await voidTransaction(id, reason);
      await loadTransactions(state.currentPage);
      
      setState(prev => ({ ...prev, loading: false }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to void transaction'
      }));
      return false;
    }
  }, [state.currentPage]);

  // Load Single Transaction
  const loadTransaction = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const transaction = await getTransaction(id);
      setState(prev => ({
        ...prev,
        selectedTransaction: transaction,
        loading: false
      }));
      
      return transaction;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load transaction'
      }));
      return null;
    }
  }, []);

  // Bulk Operations
  const approveMultipleTransactions = useCallback(async (ids: string[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await bulkApproveTransactions(ids);
      await loadTransactions(state.currentPage);
      await loadTransactionStats();
      
      setState(prev => ({
        ...prev,
        loading: false,
        selectedTransactions: []
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to approve transactions'
      }));
      return false;
    }
  }, [state.currentPage]);

  const deleteMultipleTransactions = useCallback(async (ids: string[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await bulkDeleteTransactions(ids);
      await loadTransactions(state.currentPage);
      await loadTransactionStats();
      await loadTransactionSummary();
      
      setState(prev => ({
        ...prev,
        loading: false,
        selectedTransactions: []
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to delete transactions'
      }));
      return false;
    }
  }, [state.currentPage]);

  // Create from Template
  const createFromTemplate = useCallback(async (templateId: string, date: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const transaction = await createTransactionFromTemplate(templateId, date);
      await loadTransactions(state.currentPage);
      await loadTransactionStats();
      await loadTransactionSummary();
      
      setState(prev => ({
        ...prev,
        loading: false,
        selectedTransaction: transaction
      }));
      
      return transaction;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create transaction from template'
      }));
      return null;
    }
  }, [state.currentPage]);

  // Filter and Search
  const setFilters = useCallback((filters: TransactionFilters) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
      currentPage: 1
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: propertyId ? { property_id: propertyId } : {},
      currentPage: 1
    }));
  }, [propertyId]);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      filters: { ...prev.filters, search: query || undefined }
    }));
  }, []);

  // Pagination
  const setCurrentPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);

  const goToNextPage = useCallback(() => {
    if (state.hasMore) {
      setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
    }
  }, [state.hasMore]);

  const goToPreviousPage = useCallback(() => {
    if (state.currentPage > 1) {
      setState(prev => ({ ...prev, currentPage: prev.currentPage - 1 }));
    }
  }, [state.currentPage]);

  // Selection
  const selectTransaction = useCallback((id: string) => {
    setState(prev => ({ ...prev, selectedTransactions: [id] }));
  }, []);

  const selectMultipleTransactions = useCallback((ids: string[]) => {
    setState(prev => ({ ...prev, selectedTransactions: ids }));
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedTransactions: [] }));
  }, []);

  const toggleTransactionSelection = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      selectedTransactions: prev.selectedTransactions.includes(id)
        ? prev.selectedTransactions.filter(tid => tid !== id)
        : [...prev.selectedTransactions, id]
    }));
  }, []);

  // Export
  const exportSelectedTransactions = useCallback(() => {
    const selected = state.transactions.filter(t => state.selectedTransactions.includes(t.id));
    if (selected.length === 0) return;
    
    setState(prev => ({ ...prev, loadingExport: true }));
    try {
      exportTransactionsToCSV(selected);
      setState(prev => ({ ...prev, loadingExport: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loadingExport: false,
        error: 'Failed to export transactions'
      }));
    }
  }, [state.transactions, state.selectedTransactions]);

  const exportFilteredTransactions = useCallback((filters?: TransactionFilters) => {
    setState(prev => ({ ...prev, loadingExport: true }));
    
    getTransactions(filters || state.filters, 1, 10000) // Large limit for export
      .then(result => {
        exportTransactionsToCSV(result.transactions);
        setState(prev => ({ ...prev, loadingExport: false }));
      })
      .catch(error => {
        setState(prev => ({
          ...prev,
          loadingExport: false,
          error: 'Failed to export transactions'
        }));
      });
  }, [state.filters]);

  // Utility
  const refreshData = useCallback(async () => {
    await Promise.all([
      loadTransactions(state.currentPage),
      loadTransactionStats(),
      loadTransactionSummary(),
      loadBankAccounts(),
      loadTransactionTemplates()
    ]);
  }, [state.currentPage]);

  const reset = useCallback(() => {
    setState({
      transactions: [],
      transactionStats: null,
      transactionSummary: null,
      bankAccounts: [],
      transactionTemplates: [],
      currentPage: 1,
      totalTransactions: 0,
      hasMore: false,
      filters: propertyId ? { property_id: propertyId } : {},
      searchQuery: '',
      loading: false,
      loadingStats: false,
      loadingSummary: false,
      loadingExport: false,
      error: null,
      selectedTransactions: [],
      selectedTransaction: null
    });
  }, [propertyId]);

  // Effects
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshData]);

  useEffect(() => {
    if (state.filters.search !== state.searchQuery) {
      loadTransactions(1);
    }
  }, [state.filters, loadTransactions]);

  useEffect(() => {
    loadTransactions(state.currentPage);
  }, [state.currentPage]);

  // Actions object
  const actions: TransactionManagementActions = {
    loadTransactions,
    loadTransactionStats,
    loadTransactionSummary,
    loadBankAccounts,
    loadTransactionTemplates,
    createNewTransaction,
    updateExistingTransaction,
    removeTransaction,
    approveTransactionById,
    voidTransactionById,
    loadTransaction,
    approveMultipleTransactions,
    deleteMultipleTransactions,
    createFromTemplate,
    setFilters,
    clearFilters,
    setSearchQuery,
    setCurrentPage,
    goToNextPage,
    goToPreviousPage,
    selectTransaction,
    selectMultipleTransactions,
    clearSelection,
    toggleTransactionSelection,
    exportSelectedTransactions,
    exportFilteredTransactions,
    refreshData,
    reset
  };

  return [state, actions];
}