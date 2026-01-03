// Tenants service
import { supabase } from '../lib/supabase';
import type { Tenant, CreateTenantInput, Lease, Payment, CreateLeaseInput } from '../types';

export const tenantsService = {
  // Fetch all tenants
  async getAll(): Promise<Tenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select(`
        *,
        leases:tenant_leases(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Tenant[];
  },

  // Fetch tenant by ID
  async getById(id: string): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .select(`
        *,
        leases:tenant_leases(*),
        payments:payments(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Tenant;
  },

  // Create new tenant
  async create(input: CreateTenantInput): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .insert({
        ...input,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data as Tenant;
  },

  // Update tenant
  async update(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Tenant;
  },

  // Delete tenant
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Create lease for tenant
  async createLease(input: CreateLeaseInput): Promise<Lease> {
    const { data, error } = await supabase
      .from('tenant_leases')
      .insert({
        ...input,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    
    // Update tenant status to active if lease is created
    await this.update(input.tenant_id, {
      status: 'active',
      move_in_date: input.start_date,
    });
    
    return data as Lease;
  },

  // Get tenant leases
  async getLeases(tenantId: string): Promise<Lease[]> {
    const { data, error } = await supabase
      .from('tenant_leases')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Lease[];
  },

  // Get tenant payments
  async getPayments(tenantId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data as Payment[];
  },

  // Record payment
  async recordPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single();

    if (error) throw error;
    return data as Payment;
  },
};
