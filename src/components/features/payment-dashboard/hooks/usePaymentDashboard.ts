import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import {
  PaymentMetrics,
  PaymentHistoryItem,
  OutstandingBalance,
  CollectionStatus,
  PaymentDashboardFilters
} from '../types';

/**
 * Payment Dashboard Service - Real Supabase Implementation
 * Replaces mock data with actual database queries
 */
class PaymentDashboardService {
  async getPaymentMetrics(filters: PaymentDashboardFilters): Promise<PaymentMetrics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all payments - use actual column names from database
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, status, paid_date, created_at, payment_type');

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      throw paymentsError;
    }

    // Fetch tenants for outstanding balances
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, balance_due, rent_amount');

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      throw tenantsError;
    }

    // Calculate metrics
    const allPayments = payments || [];
    const allTenants = tenants || [];

    // Total revenue (all-time paid payments)
    const totalRevenue = allPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Monthly revenue (paid this month) - use paid_date
    const monthlyRevenue = allPayments
      .filter(p => p.status === 'paid' && p.paid_date && new Date(p.paid_date) >= startOfMonth)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Outstanding balance from tenants
    const outstandingBalance = allTenants
      .reduce((sum, t) => sum + (t.balance_due || 0), 0);

    // Pending payments count
    const pendingPayments = allPayments.filter(p => p.status === 'pending').length;

    // Overdue amount (payments with status 'overdue' or past due_date with pending status)
    const overdueAmount = allPayments
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Paid this month - use paid_date
    const paidThisMonth = allPayments
      .filter(p => p.status === 'paid' && p.paid_date && new Date(p.paid_date) >= startOfMonth)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Collection rate (paid vs total)
    const totalPaymentsCount = allPayments.length;
    const paidPaymentsCount = allPayments.filter(p => p.status === 'paid').length;
    const collectionRate = totalPaymentsCount > 0
      ? paidPaymentsCount / totalPaymentsCount
      : 0;

    return {
      totalRevenue,
      monthlyRevenue,
      outstandingBalance,
      collectionRate,
      pendingPayments,
      overdueAmount,
      paidThisMonth
    };
  }

  async getPaymentHistory(filters: PaymentDashboardFilters): Promise<PaymentHistoryItem[]> {
    // Use actual database columns - no nested joins since FK relationships don't exist
    let query = supabase
      .from('payments')
      .select(`
        id,
        amount,
        status,
        payment_method,
        paid_date,
        due_date,
        created_at,
        payment_number,
        notes,
        payment_type,
        tenant_id,
        property_id
      `)
      .order('paid_date', { ascending: false, nullsFirst: false })
      .limit(50);

    // Apply date filters using paid_date
    if (filters.dateRange?.start) {
      query = query.gte('paid_date', filters.dateRange.start);
    }
    if (filters.dateRange?.end) {
      query = query.lte('paid_date', filters.dateRange.end);
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }

    // Get tenant and property details separately
    const payments = data || [];
    const tenantIds = [...new Set(payments.map(p => p.tenant_id).filter(Boolean))];
    const propertyIds = [...new Set(payments.map(p => p.property_id).filter(Boolean))];

    // Fetch tenants
    let tenantsMap = new Map<string, any>();
    if (tenantIds.length > 0) {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, first_name, last_name, email')
        .in('id', tenantIds);
      (tenants || []).forEach(t => tenantsMap.set(t.id, t));
    }

    // Fetch properties
    let propertiesMap = new Map<string, any>();
    if (propertyIds.length > 0) {
      const { data: properties } = await supabase
        .from('properties')
        .select('id, name')
        .in('id', propertyIds);
      (properties || []).forEach(p => propertiesMap.set(p.id, p));
    }

    // Map to PaymentHistoryItem format
    return payments.map((payment: any) => {
      const tenant = tenantsMap.get(payment.tenant_id);
      const property = propertiesMap.get(payment.property_id);

      return {
        id: payment.id,
        tenantId: payment.tenant_id || '',
        tenantName: tenant
          ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || tenant.email
          : 'Unknown',
        propertyId: payment.property_id || '',
        propertyName: property?.name || 'Unknown Property',
        amount: payment.amount || 0,
        type: payment.payment_type || 'rent',
        status: this.mapPaymentStatus(payment.status),
        dueDate: payment.due_date || payment.created_at || '',
        paidDate: payment.status === 'paid' ? payment.paid_date : undefined,
        method: this.mapPaymentMethod(payment.payment_method),
        description: payment.notes || `${payment.payment_type || 'Payment'}`,
        referenceNumber: payment.payment_number
      };
    });
  }

  async getOutstandingBalances(): Promise<OutstandingBalance[]> {
    // Fetch tenants with outstanding balances - use actual schema
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select(`
        id,
        first_name,
        last_name,
        email,
        balance_due,
        rent_amount,
        unit_id
      `)
      .gt('balance_due', 0)
      .order('balance_due', { ascending: false });

    if (tenantsError) {
      console.error('Error fetching outstanding balances:', tenantsError);
      throw tenantsError;
    }

    // Get unit details to find property
    const unitIds = [...new Set((tenants || []).map(t => t.unit_id).filter(Boolean))];
    let unitsMap = new Map<string, any>();
    let propertiesMap = new Map<string, any>();

    if (unitIds.length > 0) {
      const { data: units } = await supabase
        .from('units')
        .select('id, unit_number, property_id')
        .in('id', unitIds);

      (units || []).forEach(u => unitsMap.set(u.id, u));

      // Get properties
      const propertyIds = [...new Set((units || []).map(u => u.property_id).filter(Boolean))];
      if (propertyIds.length > 0) {
        const { data: properties } = await supabase
          .from('properties')
          .select('id, name')
          .in('id', propertyIds);
        (properties || []).forEach(p => propertiesMap.set(p.id, p));
      }
    }

    // Get last payment for each tenant - use paid_date
    const { data: lastPayments } = await supabase
      .from('payments')
      .select('tenant_id, amount, paid_date')
      .eq('status', 'paid')
      .order('paid_date', { ascending: false });

    const lastPaymentMap = new Map<string, { amount: number; date: string }>();
    (lastPayments || []).forEach((p: any) => {
      if (!lastPaymentMap.has(p.tenant_id) && p.paid_date) {
        lastPaymentMap.set(p.tenant_id, {
          amount: p.amount,
          date: p.paid_date
        });
      }
    });

    return (tenants || []).map((tenant: any) => {
      const unit = unitsMap.get(tenant.unit_id);
      const property = unit ? propertiesMap.get(unit.property_id) : null;
      const daysOverdue = this.calculateDaysOverdue(tenant.balance_due, tenant.rent_amount);

      return {
        id: tenant.id,
        tenantId: tenant.id,
        tenantName: tenant.first_name && tenant.last_name
          ? `${tenant.first_name} ${tenant.last_name}`.trim()
          : tenant.email || 'Unknown',
        propertyId: unit?.property_id || '',
        propertyName: property?.name || 'Unknown Property',
        unitNumber: unit?.unit_number || '',
        totalOutstanding: tenant.balance_due || 0,
        daysOverdue,
        status: this.getOverdueStatus(daysOverdue),
        items: [{
          type: 'rent',
          description: 'Outstanding Rent',
          amount: tenant.balance_due || 0,
          dueDate: new Date().toISOString(),
          daysOverdue
        }],
        lastPayment: lastPaymentMap.get(tenant.id)
      };
    });
  }

  async getCollectionStatus(): Promise<CollectionStatus> {
    // Get property count
    const { count: propertyCount } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true });

    // Get tenant counts and balances
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, balance_due, rent_amount');

    const allTenants = tenants || [];
    const totalTenants = allTenants.length;

    // Categorize by payment status
    let current = 0;
    let pastDue = 0;
    let severelyDelinquent = 0;

    allTenants.forEach((tenant: any) => {
      const balance = tenant.balance_due || 0;
      const rent = tenant.rent_amount || 0;

      if (balance <= 0) {
        current++;
      } else if (balance <= rent) {
        pastDue++;
      } else {
        severelyDelinquent++;
      }
    });

    // Calculate outstanding total
    const totalOutstanding = allTenants.reduce(
      (sum, t: any) => sum + (t.balance_due || 0),
      0
    );

    // Get payment stats for collection rate - use actual column names
    const { data: payments } = await supabase
      .from('payments')
      .select('id, status, created_at, paid_date, due_date');

    const allPayments = payments || [];
    const paidPayments = allPayments.filter((p: any) => p.status === 'paid');

    const collectionRate = allPayments.length > 0
      ? (paidPayments.length / allPayments.length) * 100
      : 0;

    // Calculate average days to pay - use due_date and paid_date
    let totalDays = 0;
    let countWithDays = 0;
    paidPayments.forEach((p: any) => {
      if (p.due_date && p.paid_date) {
        const due = new Date(p.due_date);
        const paid = new Date(p.paid_date);
        const days = Math.max(0, Math.floor((paid.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
        totalDays += days;
        countWithDays++;
      }
    });
    const averageDaysToPay = countWithDays > 0 ? totalDays / countWithDays : 0;

    return {
      totalProperties: propertyCount || 0,
      totalTenants,
      paymentStatus: {
        current,
        pastDue,
        severelyDelinquent
      },
      collectionRate,
      averageDaysToPay,
      totalOutstanding
    };
  }

  // Helper methods
  private mapPaymentStatus(status: string): PaymentHistoryItem['status'] {
    const statusMap: Record<string, PaymentHistoryItem['status']> = {
      'paid': 'completed',
      'pending': 'pending',
      'failed': 'failed',
      'overdue': 'pending',
      'refunded': 'refunded',
      'partial': 'partial'
    };
    return statusMap[status] || 'pending';
  }

  private mapPaymentMethod(method: string): PaymentHistoryItem['method'] {
    const methodMap: Record<string, PaymentHistoryItem['method']> = {
      'credit_card': 'credit_card',
      'ach': 'ach',
      'check': 'check',
      'cash': 'cash',
      'bank_transfer': 'bank_transfer',
      'online': 'credit_card',  // Map online payments to credit_card
      'stripe': 'credit_card'   // Map stripe to credit_card
    };
    return methodMap[method] || 'bank_transfer';
  }

  private calculateDaysOverdue(balance: number, rent: number): number {
    if (balance <= 0) return 0;
    // Estimate days based on balance to rent ratio
    // In production, this would check against actual due dates
    const monthsOverdue = Math.floor(balance / rent);
    return Math.max(0, monthsOverdue * 30);
  }

  private getOverdueStatus(daysOverdue: number): OutstandingBalance['status'] {
    if (daysOverdue <= 0) return 'current';
    if (daysOverdue <= 30) return 'past_due';
    return 'severely_delinquent';
  }
}

const service = new PaymentDashboardService();

export const usePaymentDashboard = () => {
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [outstandingBalances, setOutstandingBalances] = useState<OutstandingBalance[]>([]);
  const [collectionStatus, setCollectionStatus] = useState<CollectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<PaymentDashboardFilters>({
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    propertyIds: [],
    status: [],
    paymentType: [],
    amountRange: { min: 0, max: 10000 }
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load all data in parallel
      const [metricsData, historyData, balancesData, collectionData] = await Promise.allSettled([
        service.getPaymentMetrics(filters),
        service.getPaymentHistory(filters),
        service.getOutstandingBalances(),
        service.getCollectionStatus()
      ]);

      // Handle metrics
      if (metricsData.status === 'fulfilled') {
        setMetrics(metricsData.value);
      } else {
        console.error('Failed to load metrics:', metricsData.reason);
        throw new Error('Failed to load payment metrics');
      }

      // Handle payment history
      if (historyData.status === 'fulfilled') {
        setPaymentHistory(historyData.value);
      } else {
        console.error('Failed to load history:', historyData.reason);
        throw new Error('Failed to load payment history');
      }

      // Handle outstanding balances
      if (balancesData.status === 'fulfilled') {
        setOutstandingBalances(balancesData.value);
      } else {
        console.error('Failed to load balances:', balancesData.reason);
        throw new Error('Failed to load outstanding balances');
      }

      // Handle collection status
      if (collectionData.status === 'fulfilled') {
        setCollectionStatus(collectionData.value);
      } else {
        console.error('Failed to load collection status:', collectionData.reason);
        throw new Error('Failed to load collection status');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error loading payment dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  const updateFilters = useCallback((newFilters: PaymentDashboardFilters) => {
    setFilters(newFilters);
  }, []);

  const exportData = useCallback(async () => {
    try {
      setLoading(true);

      const exportData = {
        metrics,
        paymentHistory,
        outstandingBalances,
        collectionStatus,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-dashboard-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      setError('Failed to export data');
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  }, [metrics, paymentHistory, outstandingBalances, collectionStatus]);

  // Calculate derived data
  const summaryStats = {
    totalRevenue: metrics?.totalRevenue || 0,
    monthlyRevenue: metrics?.monthlyRevenue || 0,
    outstandingBalance: metrics?.outstandingBalance || 0,
    collectionRate: metrics?.collectionRate || 0,
    totalTenants: collectionStatus?.totalTenants || 0,
    totalProperties: collectionStatus?.totalProperties || 0,
    paymentStatus: collectionStatus?.paymentStatus || {
      current: 0,
      pastDue: 0,
      severelyDelinquent: 0
    }
  };

  return {
    // Data
    metrics,
    paymentHistory,
    outstandingBalances,
    collectionStatus,
    filters,
    summaryStats,

    // State
    loading,
    error,

    // Actions
    refreshData,
    updateFilters,
    exportData
  };
};
