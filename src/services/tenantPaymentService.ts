/**
 * Phase 3B: Tenant Payment Service
 * Handles tenant-facing payment operations, integrating with Phase 2 autopay service
 */

import { supabase } from '../lib/supabase';
import { enableAutopay, disableAutopay, getAutopayStatus } from './autopayService';

/**
 * Payment method interface
 */
export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'ach' | 'bank_account';
  last4: string;
  brand?: string; // For credit cards
  bank_name?: string; // For ACH/bank
  is_default: boolean;
  stripe_payment_method_id?: string;
  created_at: string;
}

/**
 * Payment history record
 */
export interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripe_payment_intent_id?: string;
  notes?: string;
  created_at: string;
}

/**
 * Balance information
 */
export interface TenantBalance {
  current_balance: number;
  outstanding_amount: number;
  next_payment_due_date: string | null;
  next_payment_amount: number;
  days_until_due: number;
  is_overdue: boolean;
  autopay_enabled: boolean;
}

/**
 * Get tenant's current balance and payment status
 */
export async function getTenantBalance(tenantId: string): Promise<TenantBalance> {
  try {
    // Get active lease for tenant
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select(`
        id,
        rent_amount,
        start_date,
        end_date,
        status,
        payment_templates (
          id,
          amount,
          due_day,
          next_payment_date,
          autopay_enabled
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single();

    if (leaseError || !lease) {
      return {
        current_balance: 0,
        outstanding_amount: 0,
        next_payment_due_date: null,
        next_payment_amount: 0,
        days_until_due: 0,
        is_overdue: false,
        autopay_enabled: false
      };
    }

    // Get payment history to calculate balance
    const { data: payments, error: paymentsError } = await supabase
      .from('payment_history')
      .select('amount, status, payment_date')
      .eq('lease_id', lease.id)
      .eq('status', 'completed');

    const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Calculate expected payments based on lease duration
    const startDate = new Date(lease.start_date);
    const today = new Date();
    const monthsElapsed = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const expectedPayments = monthsElapsed * Number(lease.rent_amount);
    const outstanding = Math.max(0, expectedPayments - totalPaid);

    // Get next payment info from payment template
    const template = lease.payment_templates?.[0];
    const nextPaymentDate = template?.next_payment_date || null;
    const nextPaymentAmount = template?.amount || lease.rent_amount;
    const autopayEnabled = template?.autopay_enabled || false;

    // Calculate days until due
    let daysUntilDue = 0;
    let isOverdue = false;
    if (nextPaymentDate) {
      const dueDate = new Date(nextPaymentDate);
      daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      isOverdue = daysUntilDue < 0;
    }

    return {
      current_balance: outstanding,
      outstanding_amount: outstanding,
      next_payment_due_date: nextPaymentDate,
      next_payment_amount: Number(nextPaymentAmount),
      days_until_due: daysUntilDue,
      is_overdue: isOverdue,
      autopay_enabled: autopayEnabled
    };
  } catch (error) {
    console.error('Error fetching tenant balance:', error);
    throw new Error('Failed to fetch balance information');
  }
}

/**
 * Get payment history for tenant
 */
export async function getPaymentHistory(
  tenantId: string,
  limit: number = 50
): Promise<PaymentRecord[]> {
  try {
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('payment_date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw new Error('Failed to fetch payment history');
  }
}

/**
 * Make a one-time payment
 */
export async function makePayment(
  tenantId: string,
  leaseId: string,
  amount: number,
  paymentMethodId: string
): Promise<{ success: boolean; payment_id?: string; error?: string }> {
  try {
    // Get property_id from lease
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('property_id')
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      return { success: false, error: 'Lease not found' };
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payment_history')
      .insert({
        lease_id: leaseId,
        tenant_id: tenantId,
        property_id: lease.property_id,
        amount: amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'credit_card', // This should come from payment method type
        status: 'pending',
        stripe_payment_intent_id: paymentMethodId
      })
      .select()
      .single();

    if (paymentError) {
      return { success: false, error: 'Failed to create payment record' };
    }

    // In production, this would process through Stripe
    // For now, we'll mark it as completed
    const { error: updateError } = await supabase
      .from('payment_history')
      .update({ status: 'completed' })
      .eq('id', payment.id);

    if (updateError) {
      return { success: false, error: 'Payment processing failed' };
    }

    return { success: true, payment_id: payment.id };
  } catch (error) {
    console.error('Error processing payment:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Enable autopay for tenant
 */
export async function enableTenantAutopay(
  tenantId: string,
  leaseId: string,
  paymentMethodId: string,
  paymentType: 'credit_card' | 'ach' | 'bank_account'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get lease details
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('rent_amount, payment_templates (*)')
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      return { success: false, error: 'Lease not found' };
    }

    const template = lease.payment_templates?.[0];
    if (!template) {
      return { success: false, error: 'Payment template not found' };
    }

    // Use Phase 2 autopay service
    const result = await enableAutopay(
      tenantId,
      leaseId,
      paymentMethodId,
      paymentType,
      Number(lease.rent_amount),
      template.due_day
    );

    return result;
  } catch (error) {
    console.error('Error enabling autopay:', error);
    return { success: false, error: 'Failed to enable autopay' };
  }
}

/**
 * Disable autopay for tenant
 */
export async function disableTenantAutopay(
  tenantId: string,
  leaseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await disableAutopay(tenantId, leaseId);
    return result;
  } catch (error) {
    console.error('Error disabling autopay:', error);
    return { success: false, error: 'Failed to disable autopay' };
  }
}

/**
 * Get autopay status for tenant
 */
export async function getTenantAutopayStatus(
  tenantId: string,
  leaseId: string
): Promise<{
  enabled: boolean;
  payment_method_id?: string;
  payment_type?: string;
  next_payment_date?: string;
  amount?: number;
}> {
  try {
    const status = await getAutopayStatus(tenantId, leaseId);
    return status;
  } catch (error) {
    console.error('Error fetching autopay status:', error);
    return { enabled: false };
  }
}

/**
 * Get payment methods for tenant
 */
export async function getPaymentMethods(tenantId: string): Promise<PaymentMethod[]> {
  try {
    // In production, this would fetch from Stripe
    // For now, return mock data or fetch from a payment_methods table if it exists

    // Check if tenant has any payment templates
    const { data, error } = await supabase
      .from('payment_templates')
      .select('stripe_payment_method_id, payment_method')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    // Transform to PaymentMethod format
    const methods: PaymentMethod[] = data?.map((pm, index) => ({
      id: pm.stripe_payment_method_id || `pm_${index}`,
      type: pm.payment_method === 'ach' ? 'ach' : 'credit_card',
      last4: '****', // Would come from Stripe
      brand: pm.payment_method === 'credit_card' ? 'Visa' : undefined,
      is_default: index === 0,
      stripe_payment_method_id: pm.stripe_payment_method_id,
      created_at: new Date().toISOString()
    })) || [];

    return methods;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return [];
  }
}

/**
 * Add payment method for tenant
 */
export async function addPaymentMethod(
  tenantId: string,
  paymentMethodId: string,
  type: 'credit_card' | 'ach' | 'bank_account'
): Promise<{ success: boolean; method?: PaymentMethod; error?: string }> {
  try {
    // In production, this would create a payment method in Stripe
    // and store the reference in the database

    const method: PaymentMethod = {
      id: paymentMethodId,
      type: type,
      last4: '****',
      is_default: false,
      stripe_payment_method_id: paymentMethodId,
      created_at: new Date().toISOString()
    };

    return { success: true, method };
  } catch (error) {
    console.error('Error adding payment method:', error);
    return { success: false, error: 'Failed to add payment method' };
  }
}

/**
 * Download payment receipt as PDF
 */
export async function downloadReceipt(paymentId: string): Promise<Blob | null> {
  try {
    // In production, this would generate a PDF receipt
    // For now, return null as placeholder
    console.log('Downloading receipt for payment:', paymentId);
    return null;
  } catch (error) {
    console.error('Error downloading receipt:', error);
    return null;
  }
}

/**
 * Get year-end tax statement
 */
export async function getYearEndStatement(
  tenantId: string,
  year: number
): Promise<{
  total_rent_paid: number;
  payment_count: number;
  payments: PaymentRecord[];
}> {
  try {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data: payments, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .order('payment_date', { ascending: true });

    if (error) throw error;

    const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    return {
      total_rent_paid: totalPaid,
      payment_count: payments?.length || 0,
      payments: payments || []
    };
  } catch (error) {
    console.error('Error fetching year-end statement:', error);
    throw new Error('Failed to generate year-end statement');
  }
}
