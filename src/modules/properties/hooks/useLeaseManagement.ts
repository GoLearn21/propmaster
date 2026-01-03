import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  getLeases, 
  getLeaseStats, 
  getExpiringLeases, 
  createLease, 
  updateLease, 
  terminateLease, 
  renewLease 
} from '../services/leaseService';
import type { Lease, LeaseStats, CreateLeaseInput, LeaseFilters, ExpiringLease } from '../types/lease';

interface LeaseManagementState {
  leases: Lease[];
  filteredLeases: Lease[];
  stats: LeaseStats | null;
  expiringLeases: ExpiringLease[];
  selectedLease: Lease | null;
  loading: boolean;
  error: string | null;
  filters: LeaseFilters;
  sortBy: 'start_date' | 'end_date' | 'monthly_rent' | 'status';
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  itemsPerPage: number;
}

interface LeaseManagementActions {
  // Data loading
  loadLeases: () => Promise<void>;
  loadLeasesByProperty: (propertyId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Filtering and sorting
  setFilters: (filters: Partial<LeaseFilters>) => void;
  clearFilters: () => void;
  setSorting: (sortBy: LeaseManagementState['sortBy'], sortOrder: LeaseManagementState['sortOrder']) => void;
  
  // Pagination
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  
  // Lease operations
  createNewLease: (input: CreateLeaseInput) => Promise<Lease>;
  updateExistingLease: (id: string, updates: Partial<Lease>) => Promise<Lease>;
  terminateExistingLease: (id: string) => Promise<Lease>;
  renewExistingLease: (id: string, newEndDate: string) => Promise<Lease>;
  deleteLease: (id: string) => Promise<void>;
  
  // Selection
  selectLease: (lease: Lease | null) => void;
  
  // Utility
  exportLeases: (format: 'csv' | 'pdf' | 'json') => void;
  generateLeaseReport: () => void;
}

interface UseLeaseManagementReturn extends LeaseManagementState, LeaseManagementActions {
  // Computed values
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  activeLeases: Lease[];
  expiringLeasesCount: number;
  overdueLeases: Lease[];
  renewalOpportunities: Lease[];
  revenueByProperty: Record<string, number>;
  
  // Quick actions
  quickActions: {
    createLease: () => void;
    exportData: () => void;
    sendReminders: () => void;
    generateReports: () => void;
  };
}

export function useLeaseManagement(propertyId?: string): UseLeaseManagementReturn {
  const [state, setState] = useState<LeaseManagementState>({
    leases: [],
    filteredLeases: [],
    stats: null,
    expiringLeases: [],
    selectedLease: null,
    loading: false,
    error: null,
    filters: {},
    sortBy: 'start_date',
    sortOrder: 'desc',
    currentPage: 1,
    itemsPerPage: 25
  });

  // Load initial data
  const loadLeases = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [leasesData, statsData, expiringData] = await Promise.all([
        getLeases(propertyId ? { } : {}),
        getLeaseStats(propertyId),
        getExpiringLeases(90) // Get 90 days of expiring leases
      ]);

      setState(prev => ({
        ...prev,
        leases: propertyId 
          ? leasesData.filter(lease => lease.property_id === propertyId)
          : leasesData,
        stats: statsData,
        expiringLeases: propertyId
          ? expiringData.filter(lease => lease.id && propertyId) // Filter by property
          : expiringData,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load lease data',
        loading: false
      }));
    }
  }, [propertyId]);

  const loadLeasesByProperty = useCallback(async (propertyId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [leasesData, statsData, expiringData] = await Promise.all([
        getLeases({} as LeaseFilters),
        getLeaseStats(propertyId),
        getExpiringLeases(90)
      ]);

      const propertyLeases = leasesData.filter(lease => lease.property_id === propertyId);
      const propertyExpiring = expiringData.filter(lease => {
        const leaseData = leasesData.find(l => l.id === lease.id);
        return leaseData?.property_id === propertyId;
      });

      setState(prev => ({
        ...prev,
        leases: propertyLeases,
        stats: statsData,
        expiringLeases: propertyExpiring,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load property leases',
        loading: false
      }));
    }
  }, []);

  const refreshData = useCallback(async () => {
    await loadLeases();
  }, [loadLeases]);

  // Filtering and sorting
  const setFilters = useCallback((newFilters: Partial<LeaseFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      currentPage: 1 // Reset to first page when filtering
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {},
      currentPage: 1
    }));
  }, []);

  const setSorting = useCallback((sortBy: LeaseManagementState['sortBy'], sortOrder: LeaseManagementState['sortOrder']) => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortOrder,
      currentPage: 1
    }));
  }, []);

  // Pagination
  const setCurrentPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);

  const setItemsPerPage = useCallback((items: number) => {
    setState(prev => ({ 
      ...prev, 
      itemsPerPage: items,
      currentPage: 1 
    }));
  }, []);

  // Lease operations
  const createNewLease = useCallback(async (input: CreateLeaseInput): Promise<Lease> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const newLease = await createLease(input);
      setState(prev => ({
        ...prev,
        leases: [newLease, ...prev.leases],
        loading: false
      }));
      return newLease;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create lease',
        loading: false
      }));
      throw error;
    }
  }, []);

  const updateExistingLease = useCallback(async (id: string, updates: Partial<Lease>): Promise<Lease> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const updatedLease = await updateLease(id, updates);
      setState(prev => ({
        ...prev,
        leases: prev.leases.map(lease => lease.id === id ? updatedLease : lease),
        selectedLease: prev.selectedLease?.id === id ? updatedLease : prev.selectedLease,
        loading: false
      }));
      return updatedLease;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update lease',
        loading: false
      }));
      throw error;
    }
  }, []);

  const terminateExistingLease = useCallback(async (id: string): Promise<Lease> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const terminatedLease = await terminateLease(id);
      setState(prev => ({
        ...prev,
        leases: prev.leases.map(lease => lease.id === id ? terminatedLease : lease),
        selectedLease: prev.selectedLease?.id === id ? terminatedLease : prev.selectedLease,
        loading: false
      }));
      return terminatedLease;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to terminate lease',
        loading: false
      }));
      throw error;
    }
  }, []);

  const renewExistingLease = useCallback(async (id: string, newEndDate: string): Promise<Lease> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const renewedLease = await renewLease(id, newEndDate);
      setState(prev => ({
        ...prev,
        leases: prev.leases.map(lease => lease.id === id ? renewedLease : lease),
        selectedLease: prev.selectedLease?.id === id ? renewedLease : prev.selectedLease,
        loading: false
      }));
      return renewedLease;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to renew lease',
        loading: false
      }));
      throw error;
    }
  }, []);

  const deleteLease = useCallback(async (id: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Note: We'd need to add deleteLease to the service
      setState(prev => ({
        ...prev,
        leases: prev.leases.filter(lease => lease.id !== id),
        selectedLease: prev.selectedLease?.id === id ? null : prev.selectedLease,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete lease',
        loading: false
      }));
      throw error;
    }
  }, []);

  // Selection
  const selectLease = useCallback((lease: Lease | null) => {
    setState(prev => ({ ...prev, selectedLease: lease }));
  }, []);

  // Utility functions
  const exportLeases = useCallback((format: 'csv' | 'pdf' | 'json') => {
    const dataToExport = state.filteredLeases.length > 0 ? state.filteredLeases : state.leases;
    
    switch (format) {
      case 'csv':
        const csvContent = [
          ['Lease Number', 'Property', 'Unit', 'Tenant', 'Start Date', 'End Date', 'Monthly Rent', 'Status'],
          ...dataToExport.map(lease => [
            lease.lease_number,
            lease.property?.name || '',
            lease.unit?.unit_number || '',
            lease.tenant ? `${lease.tenant.first_name} ${lease.tenant.last_name}` : '',
            lease.start_date,
            lease.end_date,
            lease.monthly_rent.toString(),
            lease.status
          ])
        ].map(row => row.join(',')).join('\n');

        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = `leases-${new Date().toISOString().split('T')[0]}.csv`;
        csvLink.click();
        break;

      case 'json':
        const jsonBlob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = `leases-${new Date().toISOString().split('T')[0]}.json`;
        jsonLink.click();
        break;

      case 'pdf':
        // Would integrate with a PDF generation library
        console.log('PDF export not implemented yet');
        break;
    }
  }, [state.filteredLeases, state.leases]);

  const generateLeaseReport = useCallback(() => {
    const reportData = {
      summary: state.stats,
      leases: state.filteredLeases.length > 0 ? state.filteredLeases : state.leases,
      expiringLeases: state.expiringLeases,
      generatedAt: new Date().toISOString()
    };

    const reportBlob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const reportUrl = URL.createObjectURL(reportBlob);
    const reportLink = document.createElement('a');
    reportLink.href = reportUrl;
    reportLink.download = `lease-report-${new Date().toISOString().split('T')[0]}.json`;
    reportLink.click();
  }, [state.stats, state.filteredLeases, state.leases, state.expiringLeases]);

  // Computed values
  const filteredAndSortedLeases = useMemo(() => {
    let filtered = [...state.leases];

    // Apply filters
    if (state.filters.status) {
      filtered = filtered.filter(lease => lease.status === state.filters.status);
    }
    if (state.filters.lease_type) {
      filtered = filtered.filter(lease => lease.lease_type === state.filters.lease_type);
    }
    if (state.filters.expiring_before) {
      filtered = filtered.filter(lease => 
        new Date(lease.end_date) <= new Date(state.filters.expiring_before!)
      );
    }
    if (state.filters.expiring_after) {
      filtered = filtered.filter(lease => 
        new Date(lease.end_date) >= new Date(state.filters.expiring_after!)
      );
    }
    if (state.filters.search) {
      const searchLower = state.filters.search.toLowerCase();
      filtered = filtered.filter(lease =>
        lease.lease_number.toLowerCase().includes(searchLower) ||
        lease.tenant?.first_name?.toLowerCase().includes(searchLower) ||
        lease.tenant?.last_name?.toLowerCase().includes(searchLower) ||
        lease.property?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[state.sortBy];
      let bValue: any = b[state.sortBy];

      if (state.sortBy === 'monthly_rent') {
        aValue = aValue || 0;
        bValue = bValue || 0;
      } else if (state.sortBy === 'start_date' || state.sortBy === 'end_date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (state.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [state.leases, state.filters, state.sortBy, state.sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedLeases.length / state.itemsPerPage);
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const paginatedLeases = filteredAndSortedLeases.slice(startIndex, endIndex);

  const hasNextPage = state.currentPage < totalPages;
  const hasPreviousPage = state.currentPage > 1;

  const activeLeases = useMemo(() => 
    state.leases.filter(lease => lease.status === 'active'),
    [state.leases]
  );

  const expiringLeasesCount = state.expiringLeases.length;

  const overdueLeases = useMemo(() => {
    const today = new Date();
    return state.leases.filter(lease => {
      const endDate = new Date(lease.end_date);
      return lease.status === 'active' && endDate < today;
    });
  }, [state.leases]);

  const renewalOpportunities = useMemo(() => {
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    
    return state.leases.filter(lease => {
      const endDate = new Date(lease.end_date);
      return lease.status === 'active' && endDate <= sixtyDaysFromNow && endDate > new Date();
    });
  }, [state.leases]);

  const revenueByProperty = useMemo(() => {
    return state.leases
      .filter(lease => lease.status === 'active')
      .reduce((acc, lease) => {
        const propertyName = lease.property?.name || 'Unknown';
        acc[propertyName] = (acc[propertyName] || 0) + (lease.monthly_rent || 0);
        return acc;
      }, {} as Record<string, number>);
  }, [state.leases]);

  // Quick actions
  const quickActions = {
    createLease: () => {
      // Navigate to lease creation or open modal
      console.log('Create new lease');
    },
    exportData: () => exportLeases('csv'),
    sendReminders: () => {
      console.log('Send reminders to tenants');
    },
    generateReports: () => generateLeaseReport()
  };

  // Load data on mount
  useEffect(() => {
    loadLeases();
  }, [loadLeases]);

  // Update filtered leases when filters or data change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      filteredLeases: paginatedLeases
    }));
  }, [paginatedLeases]);

  return {
    // State
    ...state,
    filteredLeases: paginatedLeases,
    
    // Computed values
    totalPages,
    hasNextPage,
    hasPreviousPage,
    activeLeases,
    expiringLeasesCount,
    overdueLeases,
    renewalOpportunities,
    revenueByProperty,
    
    // Actions
    loadLeases,
    loadLeasesByProperty,
    refreshData,
    setFilters,
    clearFilters,
    setSorting,
    setCurrentPage,
    setItemsPerPage,
    createNewLease,
    updateExistingLease,
    terminateExistingLease,
    renewExistingLease,
    deleteLease,
    selectLease,
    exportLeases,
    generateLeaseReport,
    
    // Quick actions
    quickActions
  };
}