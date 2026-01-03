import { supabase } from '../lib/supabase';
import { Decimal } from 'decimal.js';
import type {
  Payment,
  PaymentMethodDetails,
  PaymentIntent,
  PaymentDashboardMetrics,
  CreatePaymentInput,
  ProcessPaymentInput,
  SetupAutopayInput,
  TenantPaymentPortalData,
  BillingSchedule
} from '../types';

export class PaymentService {
  // Payment Dashboard Methods
  static async getPaymentDashboardMetrics(propertyId?: string): Promise<PaymentDashboardMetrics> {
    let query = supabase
      .from('payments')
      .select(`
        amount,
        status,
        payment_method,
        late_fee,
        processing_fee,
        payment_date,
        created_at,
        lease:leases!inner(property_id)
      `);

    if (propertyId) {
      query = query.eq('lease.property_id', propertyId);
    }

    const { data: payments, error } = await query;

    if (error) throw error;

    // Calculate metrics from payment data using Decimal.js for penny-perfect precision
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const totalCollected = payments
      ?.filter(p => p.status === 'paid')
      ?.reduce((sum, p) => sum.plus(new Decimal(p.amount || 0)), new Decimal(0))
      .toNumber() || 0;

    const pendingPayments = payments
      ?.filter(p => p.status === 'pending')?.length || 0;

    const overduePayments = payments
      ?.filter(p => p.status === 'overdue')?.length || 0;

    const lateFeesCollected = payments
      ?.filter(p => p.status === 'paid')
      ?.reduce((sum, p) => sum.plus(new Decimal(p.late_fee || 0)), new Decimal(0))
      .toNumber() || 0;

    const paidPayments = payments?.filter(p => p.status === 'paid') || [];
    const collectionRate = payments?.length ?
      (paidPayments.length / payments.length) * 100 : 0;

    const avgDaysToCollect = paidPayments.length > 0 ?
      paidPayments.reduce((sum, p) => {
        const created = new Date(p.created_at);
        const paid = new Date(p.payment_date);
        return sum + Math.floor((paid.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / paidPayments.length : 0;

    const outstandingBalance = payments
      ?.filter(p => ['pending', 'overdue'].includes(p.status))
      ?.reduce((sum, p) => sum.plus(new Decimal(p.amount || 0)), new Decimal(0))
      .toNumber() || 0;

    const paymentMethodBreakdown = {
      ach: payments?.filter(p => p.payment_method === 'ach')?.length || 0,
      credit_card: payments?.filter(p => p.payment_method === 'credit_card')?.length || 0,
      other: payments?.filter(p => !['ach', 'credit_card'].includes(p.payment_method))?.length || 0,
    };

    return {
      total_collected: totalCollected,
      pending_payments: pendingPayments,
      overdue_payments: overduePayments,
      late_fees_collected: lateFeesCollected,
      collection_rate: collectionRate,
      avg_days_to_collect: avgDaysToCollect,
      outstanding_balance: outstandingBalance,
      payment_method_breakdown: paymentMethodBreakdown,
    };
  }

  static async getRecentPayments(propertyId?: string, limit = 10): Promise<Payment[]> {
    let query = supabase
      .from('payments')
      .select(`
        *,
        tenant:tenants(*),
        lease:leases(*),
        property:leases(property:properties(*))
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (propertyId) {
      query = query.eq('lease.property_id', propertyId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  static async getPaymentHistory(filters?: {
    tenantId?: string;
    propertyId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Payment[]> {
    let query = supabase
      .from('payments')
      .select(`
        *,
        tenant:tenants(*),
        lease:leases(*),
        property:leases(property:properties(*))
      `)
      .order('payment_date', { ascending: false });

    if (filters?.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
    }
    if (filters?.propertyId) {
      query = query.eq('lease.property_id', filters.propertyId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.dateFrom) {
      query = query.gte('payment_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('payment_date', filters.dateTo);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  // Tenant Payment Portal Methods
  static async getTenantPaymentPortalData(tenantId: string): Promise<TenantPaymentPortalData> {
    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError) throw tenantError;

    // Get active lease
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();

    if (leaseError) throw leaseError;

    // Get outstanding balance
    const { data: outstandingPayments, error: balanceError } = await supabase
      .from('payments')
      .select('amount')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'overdue']);

    if (balanceError) throw balanceError;

    // Use Decimal.js for penny-perfect precision
    const outstandingBalance = outstandingPayments
      ?.reduce((sum, p) => sum.plus(new Decimal(p.amount || 0)), new Decimal(0))
      .toNumber() || 0;

    // Get billing schedule for next due date
    const { data: billingSchedule, error: scheduleError } = await supabase
      .from('billing_schedules')
      .select('next_due_date')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();

    const nextDueDate = billingSchedule?.next_due_date || '';

    // Get payment methods
    const { data: paymentMethods, error: methodsError } = await supabase
      .from('tenant_payment_methods')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    if (methodsError) throw methodsError;

    // Get recent payments
    const { data: recentPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('payment_date', { ascending: false })
      .limit(5);

    if (paymentsError) throw paymentsError;

    // Check autopay status
    const { data: autopaySchedule } = await supabase
      .from('billing_schedules')
      .select('auto_pay_enabled')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();

    return {
      tenant,
      lease,
      outstanding_balance: outstandingBalance,
      next_due_date: nextDueDate,
      payment_methods: paymentMethods || [],
      recent_payments: recentPayments || [],
      autopay_enabled: autopaySchedule?.auto_pay_enabled || false,
    };
  }

  // Payment Processing Methods
  static async createPaymentIntent(input: {
    amount: number;
    currency?: string;
    tenantId: string;
    leaseId: string;
    description?: string;
  }): Promise<PaymentIntent> {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount: input.amount,
        currency: input.currency || 'usd',
        metadata: {
          tenant_id: input.tenantId,
          lease_id: input.leaseId,
          description: input.description || 'Rent Payment',
        },
      },
    });

    if (error) throw error;

    return data.data;
  }

  static async confirmPayment(input: ProcessPaymentInput): Promise<Payment> {
    const { data, error } = await supabase.functions.invoke('confirm-payment', {
      body: input,
    });

    if (error) throw error;

    return data.data;
  }

  static async recordPayment(input: CreatePaymentInput): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        ...input,
        payment_date: input.payment_date || new Date().toISOString(),
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        tenant:tenants(*),
        lease:leases(*)
      `)
      .single();

    if (error) throw error;

    return data;
  }

  // Payment Method Management
  static async addPaymentMethod(tenantId: string, stripePaymentMethodId: string): Promise<PaymentMethodDetails> {
    const { data, error } = await supabase.functions.invoke('add-payment-method', {
      body: {
        tenant_id: tenantId,
        stripe_payment_method_id: stripePaymentMethodId,
      },
    });

    if (error) throw error;

    return data.data;
  }

  static async getPaymentMethods(tenantId: string): Promise<PaymentMethodDetails[]> {
    const { data, error } = await supabase
      .from('tenant_payment_methods')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    if (error) throw error;

    return data || [];
  }

  static async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
    const { error } = await supabase
      .from('tenant_payment_methods')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', paymentMethodId);

    if (error) throw error;

    return true;
  }

  static async setDefaultPaymentMethod(tenantId: string, paymentMethodId: string): Promise<boolean> {
    // First, unset all as default
    await supabase
      .from('tenant_payment_methods')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);

    // Then set the specified one as default
    const { error } = await supabase
      .from('tenant_payment_methods')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', paymentMethodId);

    if (error) throw error;

    return true;
  }

  // Autopay Management
  static async setupAutopay(input: SetupAutopayInput): Promise<BillingSchedule> {
    const { data, error } = await supabase.functions.invoke('setup-autopay', {
      body: input,
    });

    if (error) throw error;

    return data.data;
  }

  static async cancelAutopay(tenantId: string): Promise<boolean> {
    const { error } = await supabase
      .from('billing_schedules')
      .update({ 
        auto_pay_enabled: false, 
        payment_method_id: null,
        updated_at: new Date().toISOString() 
      })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    if (error) throw error;

    return true;
  }

  // Late Fee Management
  static async applyLateFee(tenantId: string, amount: number, daysLate: number): Promise<void> {
    const { error } = await supabase.functions.invoke('apply-late-fee', {
      body: {
        tenant_id: tenantId,
        amount,
        days_late: daysLate,
      },
    });

    if (error) throw error;
  }

  static async waiveLateFee(lateFeeId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('late_fees')
      .update({
        waived: true,
        waiver_reason: reason,
        waived_at: new Date().toISOString(),
      })
      .eq('id', lateFeeId);

    if (error) throw error;
  }
}