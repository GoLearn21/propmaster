import { supabase } from '../lib/supabase';

export interface Lease {
  id: string;
  property_id: string;
  unit_id: string;
  tenant_id: string | null;
  lease_number: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  status: 'active' | 'expired' | 'terminated' | 'renewed';
  lease_type: 'fixed' | 'month-to-month';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RentalUnit {
  id: string;
  property_id: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  rent_amount: number;
  status: 'vacant' | 'occupied' | 'maintenance';
  lease?: Lease;
  tenant?: any;
  property?: any;
}

// Get all rentals with property and tenant data
export async function getRentals() {
  const { data, error } = await supabase
    .from('units')
    .select(`
      *,
      properties (name, address),
      tenants (first_name, last_name, email, phone)
    `)
    .order('unit_number');

  if (error) throw error;
  return data || [];
}

// Get leases
export async function getLeases(filters?: { status?: string; property_id?: string }) {
  let query = supabase
    .from('leases')
    .select(`
      *,
      properties (name, address),
      units (unit_number),
      tenants (first_name, last_name, email)
    `)
    .order('start_date', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.property_id) {
    query = query.eq('property_id', filters.property_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Create lease
export async function createLease(lease: Omit<Lease, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('leases')
    .insert([lease])
    .select()
    .single();

  if (error) throw error;
  
  // Update unit status to occupied
  if (lease.unit_id) {
    await supabase
      .from('units')
      .update({ status: 'occupied' })
      .eq('id', lease.unit_id);
  }

  return data;
}

// Update lease
export async function updateLease(id: string, updates: Partial<Lease>) {
  const { data, error } = await supabase
    .from('leases')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Terminate lease
export async function terminateLease(id: string) {
  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .update({ status: 'terminated', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (leaseError) throw leaseError;

  // Update unit status to vacant
  if (lease.unit_id) {
    await supabase
      .from('units')
      .update({ status: 'vacant' })
      .eq('id', lease.unit_id);
  }

  return lease;
}

// Get rental statistics
export async function getRentalStats() {
  const { data: units } = await supabase.from('units').select('status, rent_amount');
  
  const total = units?.length || 0;
  const occupied = units?.filter(u => u.status === 'occupied').length || 0;
  const vacant = units?.filter(u => u.status === 'vacant').length || 0;
  const maintenance = units?.filter(u => u.status === 'maintenance').length || 0;
  const totalRent = units?.reduce((sum, u) => sum + (u.status === 'occupied' ? u.rent_amount : 0), 0) || 0;
  const potentialRent = units?.reduce((sum, u) => sum + u.rent_amount, 0) || 0;

  return {
    total,
    occupied,
    vacant,
    maintenance,
    occupancyRate: total > 0 ? (occupied / total) * 100 : 0,
    totalRent,
    potentialRent,
    lossFromVacancy: potentialRent - totalRent,
  };
}
