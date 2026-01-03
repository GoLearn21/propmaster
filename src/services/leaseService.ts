/**
 * Lease Service
 * Comprehensive lease management service with CRUD operations
 * Follows patterns from market leaders: DoorLoop, Rentvine, Buildium
 */

import { supabase } from '../lib/supabase';

export interface Lease {
  id: string;
  lease_number?: string;
  property_id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  status: 'draft' | 'pending' | 'active' | 'expired' | 'terminated';
  lease_type?: string;
  rent_due_day?: number;
  late_fee_amount?: number;
  late_fee_grace_days?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
  // Joined relations
  property?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  unit?: {
    id: string;
    unit_number: string;
    bedrooms?: number;
    bathrooms?: number;
    square_feet?: number;
  };
  tenant?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

export interface LeasePayment {
  id: string;
  lease_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  status: string;
  late_fee?: number;
  notes?: string;
}

export interface LeaseDocument {
  id: string;
  lease_id?: string;
  file_name: string;
  file_url?: string;
  document_type: string;
  uploaded_at: string;
  status?: string;
}

export interface CreateLeaseInput {
  property_id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  lease_type?: string;
  rent_due_day?: number;
  late_fee_amount?: number;
  late_fee_grace_days?: number;
  notes?: string;
}

export const leaseService = {
  /**
   * Get all leases with filtering and pagination
   */
  async getLeases(options?: {
    status?: string;
    property_id?: string;
    tenant_id?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<{ data: Lease[]; count: number }> {
    let query = supabase
      .from('leases')
      .select(`
        *,
        property:properties(id, name, address, city, state, zip_code),
        unit:units(id, unit_number, bedrooms, bathrooms, square_feet),
        tenant:tenants(id, first_name, last_name, email, phone)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.property_id) {
      query = query.eq('property_id', options.property_id);
    }

    if (options?.tenant_id) {
      query = query.eq('tenant_id', options.tenant_id);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data as Lease[], count: count || 0 };
  },

  /**
   * Get a single lease by ID with all related data
   */
  async getLeaseById(leaseId: string): Promise<Lease | null> {
    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(id, name, address, city, state, zip_code),
        unit:units(id, unit_number, bedrooms, bathrooms, square_feet),
        tenant:tenants(id, first_name, last_name, email, phone)
      `)
      .eq('id', leaseId)
      .single();

    if (error) {
      console.error('Error fetching lease:', error);
      return null;
    }

    return data as Lease;
  },

  /**
   * Create a new lease
   */
  async createLease(input: CreateLeaseInput): Promise<Lease> {
    // Generate lease number
    const leaseNumber = `L-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabase
      .from('leases')
      .insert({
        ...input,
        lease_number: leaseNumber,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        property:properties(id, name, address, city, state, zip_code),
        unit:units(id, unit_number, bedrooms, bathrooms, square_feet),
        tenant:tenants(id, first_name, last_name, email, phone)
      `)
      .single();

    if (error) throw error;

    // Update unit status to occupied
    await supabase
      .from('units')
      .update({ status: 'occupied' })
      .eq('id', input.unit_id);

    return data as Lease;
  },

  /**
   * Update an existing lease
   */
  async updateLease(leaseId: string, updates: Partial<Lease>): Promise<Lease> {
    const { data, error } = await supabase
      .from('leases')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', leaseId)
      .select(`
        *,
        property:properties(id, name, address, city, state, zip_code),
        unit:units(id, unit_number, bedrooms, bathrooms, square_feet),
        tenant:tenants(id, first_name, last_name, email, phone)
      `)
      .single();

    if (error) throw error;
    return data as Lease;
  },

  /**
   * Terminate a lease
   */
  async terminateLease(leaseId: string, reason?: string): Promise<void> {
    const { data: lease, error: fetchError } = await supabase
      .from('leases')
      .select('unit_id')
      .eq('id', leaseId)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('leases')
      .update({
        status: 'terminated',
        notes: reason ? `Terminated: ${reason}` : 'Lease terminated',
        updated_at: new Date().toISOString()
      })
      .eq('id', leaseId);

    if (error) throw error;

    // Update unit status back to vacant
    if (lease?.unit_id) {
      await supabase
        .from('units')
        .update({ status: 'vacant' })
        .eq('id', lease.unit_id);
    }
  },

  /**
   * Get payment history for a lease
   */
  async getLeasePayments(leaseId: string): Promise<LeasePayment[]> {
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('lease_id', leaseId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error fetching lease payments:', error);
      return [];
    }

    return data as LeasePayment[];
  },

  /**
   * Get documents for a lease
   */
  async getLeaseDocuments(leaseId: string): Promise<LeaseDocument[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('lease_id', leaseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lease documents:', error);
      return [];
    }

    return data as LeaseDocument[];
  },

  /**
   * Upload a document for a lease
   */
  async uploadLeaseDocument(
    leaseId: string,
    file: File,
    documentType: string
  ): Promise<LeaseDocument> {
    // Upload file to Supabase storage
    const fileName = `${leaseId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get lease details to get property_id
    const { data: lease } = await supabase
      .from('leases')
      .select('property_id')
      .eq('id', leaseId)
      .single();

    // Create document record
    const { data, error } = await supabase
      .from('documents')
      .insert({
        lease_id: leaseId,
        property_id: lease?.property_id,
        file_name: file.name,
        file_url: uploadData?.path,
        document_type: documentType,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as LeaseDocument;
  },

  /**
   * Get expiring leases (within specified days)
   */
  async getExpiringLeases(daysAhead: number = 60): Promise<Lease[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        property:properties(id, name, address),
        unit:units(id, unit_number),
        tenant:tenants(id, first_name, last_name, email, phone)
      `)
      .eq('status', 'active')
      .gte('end_date', today)
      .lte('end_date', futureDateStr)
      .order('end_date', { ascending: true });

    if (error) throw error;
    return data as Lease[];
  },

  /**
   * Get lease statistics
   */
  async getLeaseStats(): Promise<{
    total: number;
    active: number;
    expiring: number;
    expired: number;
    monthlyRevenue: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    const sixtyDaysStr = sixtyDaysFromNow.toISOString().split('T')[0];

    const [totalResult, activeResult, expiringResult, expiredResult, revenueResult] = await Promise.all([
      supabase.from('leases').select('id', { count: 'exact', head: true }),
      supabase.from('leases').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('leases').select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('end_date', today)
        .lte('end_date', sixtyDaysStr),
      supabase.from('leases').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
      supabase.from('leases').select('monthly_rent').eq('status', 'active')
    ]);

    const monthlyRevenue = (revenueResult.data || []).reduce(
      (sum, lease) => sum + (lease.monthly_rent || 0), 0
    );

    return {
      total: totalResult.count || 0,
      active: activeResult.count || 0,
      expiring: expiringResult.count || 0,
      expired: expiredResult.count || 0,
      monthlyRevenue
    };
  },

  /**
   * Download lease document
   */
  async downloadDocument(documentId: string): Promise<string | null> {
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('file_url')
      .eq('id', documentId)
      .single();

    if (docError || !doc?.file_url) return null;

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_url, 3600); // 1 hour expiry

    if (error) return null;
    return data.signedUrl;
  }
};

export default leaseService;
