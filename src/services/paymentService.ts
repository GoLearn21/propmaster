import { supabase } from '../lib/supabase';

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentRequest {
  amount: number;
  currency?: string;
  leaseId: string;
  tenantId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export const paymentService = {
  /**
   * Create a payment intent for rent payment
   */
  async createPaymentIntent(request: PaymentRequest): Promise<PaymentIntent> {
    try {
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: request
      });

      if (error) {
        console.error('Payment intent creation failed:', error);
        throw new Error(error.message || 'Failed to create payment intent');
      }

      if (data.error) {
        throw new Error(data.error.message || 'Payment processing failed');
      }

      return data.data;
    } catch (error) {
      console.error('Payment service error:', error);
      throw error;
    }
  },

  /**
   * Get payment history for a tenant
   */
  async getPaymentHistory(tenantId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  },

  /**
   * Get all payments
   */
  async getAllPayments(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          tenant:tenants(id, first_name, last_name, email),
          lease:leases(
            id,
            monthly_rent,
            unit:units(
              id,
              unit_number,
              property:properties(id, name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  },

  /**
   * Update payment status (after Stripe webhook confirmation)
   */
  async updatePaymentStatus(paymentId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }
};
