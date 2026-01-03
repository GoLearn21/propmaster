import { supabase } from '../../../lib/supabase';
import type { Lease, LeaseStats, CreateLeaseInput, LeaseFilters, ExpiringLease } from '../types/lease';

// Extended lease interfaces for comprehensive management
export interface LeaseDocument {
  id: string;
  lease_id: string;
  name: string;
  type: string;
  url: string;
  uploaded_at: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'expired';
}

export interface LeasePayment {
  id: string;
  lease_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  payment_method?: string;
  late_fee?: number;
}

export interface LeaseRenewal {
  id: string;
  original_lease_id: string;
  new_lease_id?: string;
  proposed_end_date: string;
  proposed_rent?: number;
  status: 'proposed' | 'accepted' | 'declined' | 'expired';
  tenant_response?: string;
  created_at: string;
  response_deadline: string;
}

export interface LeaseAnalytics {
  revenue_trends: Array<{
    month: string;
    revenue: number;
    lease_count: number;
  }>;
  occupancy_trends: Array<{
    date: string;
    occupancy_rate: number;
  }>;
  renewal_rates: {
    overall: number;
    by_property: Record<string, number>;
  };
  average_lease_duration: number;
  tenant_satisfaction: number;
}

// Get all leases with filters
export async function getLeases(filters?: LeaseFilters) {
  let query = supabase
    .from('leases')
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      tenant:tenants(id, first_name, last_name, email, phone)
    `)
    .order('start_date', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.lease_type) {
    query = query.eq('lease_type', filters.lease_type);
  }

  if (filters?.expiring_before) {
    query = query.lte('end_date', filters.expiring_before);
  }

  if (filters?.expiring_after) {
    query = query.gte('end_date', filters.expiring_after);
  }

  if (filters?.search) {
    query = query.or(`lease_number.ilike.%${filters.search}%,tenants.first_name.ilike.%${filters.search}%,tenants.last_name.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Get leases for a specific property
export async function getPropertyLeases(propertyId: string, filters?: LeaseFilters) {
  let query = supabase
    .from('leases')
    .select(`
      *,
      unit:units(id, unit_number),
      tenant:tenants(id, first_name, last_name, email, phone)
    `)
    .eq('property_id', propertyId)
    .order('start_date', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Get lease by ID
export async function getLease(id: string) {
  const { data, error } = await supabase
    .from('leases')
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      tenant:tenants(id, first_name, last_name, email, phone)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Create new lease
export async function createLease(input: CreateLeaseInput) {
  const { data, error } = await supabase
    .from('leases')
    .insert([{
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      tenant:tenants(id, first_name, last_name, email, phone)
    `)
    .single();

  if (error) throw error;

  // Update unit status to occupied if lease is active
  if (input.status === 'active' && input.unit_id) {
    await supabase
      .from('units')
      .update({ status: 'occupied' })
      .eq('id', input.unit_id);
  }

  return data;
}

// Update lease
export async function updateLease(id: string, updates: Partial<Lease>) {
  const { data, error } = await supabase
    .from('leases')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      tenant:tenants(id, first_name, last_name, email, phone)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Delete lease
export async function deleteLease(id: string) {
  // Get lease details first
  const lease = await getLease(id);
  
  const { error } = await supabase
    .from('leases')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Update unit status to vacant if lease was active
  if (lease.status === 'active' && lease.unit_id) {
    await supabase
      .from('units')
      .update({ status: 'vacant' })
      .eq('id', lease.unit_id);
  }

  return true;
}

// Terminate lease
export async function terminateLease(id: string) {
  const lease = await getLease(id);
  
  const { data, error } = await supabase
    .from('leases')
    .update({ 
      status: 'terminated',
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      tenant:tenants(id, first_name, last_name, email, phone)
    `)
    .single();

  if (error) throw error;

  // Update unit status to vacant
  if (lease.unit_id) {
    await supabase
      .from('units')
      .update({ status: 'vacant' })
      .eq('id', lease.unit_id);
  }

  return data;
}

// Renew lease
export async function renewLease(id: string, newEndDate: string) {
  const lease = await getLease(id);
  
  const { data, error } = await supabase
    .from('leases')
    .update({ 
      status: 'renewed',
      end_date: newEndDate,
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      tenant:tenants(id, first_name, last_name, email, phone)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Get lease statistics
export async function getLeaseStats(propertyId?: string): Promise<LeaseStats> {
  let query = supabase
    .from('leases')
    .select('status, end_date, monthly_rent');

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  const { data: leases } = await query;

  const total_leases = leases?.length || 0;
  const active_leases = leases?.filter(l => l.status === 'active').length || 0;
  const pending_leases = leases?.filter(l => l.status === 'pending').length || 0;
  const expired_leases = leases?.filter(l => l.status === 'expired').length || 0;
  
  // Get expiring soon (within 60 days)
  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
  
  const expiring_soon = leases?.filter(l => 
    l.status === 'active' && 
    new Date(l.end_date) <= sixtyDaysFromNow
  ).length || 0;

  const total_monthly_rent = leases
    ?.filter(l => l.status === 'active')
    ?.reduce((sum, l) => sum + (l.monthly_rent || 0), 0) || 0;

  return {
    total_leases,
    active_leases,
    expiring_soon,
    expired_leases,
    pending_leases,
    total_monthly_rent,
    occupancy_rate: total_leases > 0 ? (active_leases / total_leases) * 100 : 0,
  };
}

// Get expiring leases
export async function getExpiringLeases(daysAhead: number = 60): Promise<ExpiringLease[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data: leases, error } = await supabase
    .from('leases')
    .select(`
      *,
      property:properties(name),
      unit:units(unit_number),
      tenant:tenants(first_name, last_name)
    `)
    .eq('status', 'active')
    .lte('end_date', futureDate.toISOString().split('T')[0])
    .order('end_date', { ascending: true });

  if (error) throw error;

  return (leases || []).map(lease => {
    const endDate = new Date(lease.end_date);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: lease.id,
      lease_number: lease.lease_number,
      property_name: lease.property?.name || 'N/A',
      unit_number: lease.unit?.unit_number || 'N/A',
      tenant_name: lease.tenant ? `${lease.tenant.first_name} ${lease.tenant.last_name}` : 'N/A',
      end_date: lease.end_date,
      days_until_expiration: daysUntilExpiration,
      monthly_rent: lease.monthly_rent,
      renewal_required: daysUntilExpiration <= 30,
    };
  });
}

// Advanced Lease Analytics Functions

// Get comprehensive lease analytics
export async function getLeaseAnalytics(propertyId?: string): Promise<LeaseAnalytics> {
  let query = supabase.from('leases').select('*');
  
  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  const { data: leases } = await query;

  // Mock implementation - in real app, this would be complex analytics
  const currentDate = new Date();
  const revenue_trends = [];
  const occupancy_trends = [];
  
  // Generate 12 months of data
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    const monthStr = date.toISOString().slice(0, 7);
    
    const monthLeases = leases?.filter(lease => 
      lease.status === 'active' && 
      new Date(lease.start_date) <= date && 
      new Date(lease.end_date) >= date
    ) || [];
    
    const revenue = monthLeases.reduce((sum, lease) => sum + (lease.monthly_rent || 0), 0);
    const totalUnits = 100; // This would come from units table
    const occupancyRate = totalUnits > 0 ? (monthLeases.length / totalUnits) * 100 : 0;
    
    revenue_trends.push({
      month: monthStr,
      revenue,
      lease_count: monthLeases.length
    });
    
    occupancy_trends.push({
      date: monthStr,
      occupancy_rate: occupancyRate
    });
  }

  const renewalRates = {
    overall: 78.5,
    by_property: {
      'Property A': 82.1,
      'Property B': 75.3,
      'Property C': 79.2
    }
  };

  return {
    revenue_trends,
    occupancy_trends,
    renewal_rates: renewalRates,
    average_lease_duration: 12.4,
    tenant_satisfaction: 4.2
  };
}

// Get lease documents
export async function getLeaseDocuments(leaseId: string): Promise<LeaseDocument[]> {
  const { data: documents, error } = await supabase
    .from('lease_documents')
    .select('*')
    .eq('lease_id', leaseId)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return documents || [];
}

// Upload lease document
export async function uploadLeaseDocument(
  leaseId: string, 
  file: File, 
  name: string, 
  type: string
): Promise<LeaseDocument> {
  const fileName = `${leaseId}/${Date.now()}-${file.name}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('lease-documents')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: document, error } = await supabase
    .from('lease_documents')
    .insert([{
      lease_id: leaseId,
      name,
      type,
      url: uploadData.path,
      uploaded_at: new Date().toISOString(),
      status: 'draft'
    }])
    .select()
    .single();

  if (error) throw error;
  return document;
}

// Get lease payments
export async function getLeasePayments(leaseId: string): Promise<LeasePayment[]> {
  const { data: payments, error } = await supabase
    .from('lease_payments')
    .select('*')
    .eq('lease_id', leaseId)
    .order('due_date', { ascending: false });

  if (error) throw error;
  return payments || [];
}

// Record lease payment
export async function recordLeasePayment(payment: Omit<LeasePayment, 'id'>): Promise<LeasePayment> {
  const { data, error } = await supabase
    .from('lease_payments')
    .insert([{
      ...payment,
      paid_date: payment.status === 'paid' ? new Date().toISOString() : null
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get lease renewals
export async function getLeaseRenewals(propertyId?: string): Promise<LeaseRenewal[]> {
  let query = supabase
    .from('lease_renewals')
    .select('*, original_lease:leases(*), new_lease:leases(*)')
    .order('created_at', { ascending: false });

  if (propertyId) {
    query = query.eq('original_lease.property_id', propertyId);
  }

  const { data: renewals, error } = await query;
  if (error) throw error;
  return renewals || [];
}

// Create lease renewal request
export async function createLeaseRenewal(
  leaseId: string, 
  proposedEndDate: string, 
  proposedRent?: number
): Promise<LeaseRenewal> {
  const responseDeadline = new Date();
  responseDeadline.setDate(responseDeadline.getDate() + 30); // 30 days to respond

  const { data, error } = await supabase
    .from('lease_renewals')
    .insert([{
      original_lease_id: leaseId,
      proposed_end_date: proposedEndDate,
      proposed_rent: proposedRent,
      status: 'proposed',
      created_at: new Date().toISOString(),
      response_deadline: responseDeadline.toISOString()
    }])
    .select('*, original_lease:leases(*), new_lease:leases(*)')
    .single();

  if (error) throw error;
  return data;
}

// Respond to lease renewal
export async function respondToLeaseRenewal(
  renewalId: string, 
  accepted: boolean, 
  tenantResponse?: string
): Promise<LeaseRenewal> {
  const status = accepted ? 'accepted' : 'declined';
  
  const { data, error } = await supabase
    .from('lease_renewals')
    .update({
      status,
      tenant_response: tenantResponse
    })
    .eq('id', renewalId)
    .select('*, original_lease:leases(*), new_lease:leases(*)')
    .single();

  if (error) throw error;
  return data;
}

// Get rent roll (monthly rent by property)
export async function getRentRoll(propertyId?: string): Promise<Record<string, number>> {
  let query = supabase
    .from('leases')
    .select('monthly_rent, property:properties(name)')
    .eq('status', 'active');

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  const { data: leases } = await query;

  return (leases || []).reduce((acc, lease) => {
    const propertyName = lease.property?.name || 'Unknown';
    acc[propertyName] = (acc[propertyName] || 0) + (lease.monthly_rent || 0);
    return acc;
  }, {} as Record<string, number>);
}

// Generate lease report
export async function generateLeaseReport(
  format: 'pdf' | 'excel' | 'csv',
  filters?: {
    propertyId?: string;
    dateRange?: { start: string; end: string };
    status?: string[];
  }
): Promise<{ url: string; filename: string }> {
  // This would integrate with a report generation service
  // For now, return mock data
  return {
    url: `/reports/lease-report-${Date.now()}.${format}`,
    filename: `lease-report-${new Date().toISOString().split('T')[0]}.${format}`
  };
}

// Send lease expiration reminders
export async function sendExpirationReminders(leaseIds?: string[]): Promise<void> {
  let query = supabase
    .from('leases')
    .select('*, tenant:tenants(*), property:properties(*)')
    .eq('status', 'active');

  if (leaseIds) {
    query = query.in('id', leaseIds);
  } else {
    // Send reminders for leases expiring in next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    query = query.lte('end_date', thirtyDaysFromNow.toISOString().split('T')[0]);
  }

  const { data: leases } = await query;

  // In real app, this would send emails/SMS through a service
  for (const lease of leases || []) {
    console.log(`Sending expiration reminder for lease ${lease.lease_number} to ${lease.tenant?.email}`);
  }
}

// Bulk lease operations
export async function bulkUpdateLeaseStatus(
  leaseIds: string[], 
  status: Lease['status']
): Promise<void> {
  const { error } = await supabase
    .from('leases')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .in('id', leaseIds);

  if (error) throw error;
}

export async function bulkExtendLeases(
  leaseIds: string[], 
  extensionDays: number
): Promise<void> {
  const { data: leases } = await supabase
    .from('leases')
    .select('end_date')
    .in('id', leaseIds);

  for (const lease of leases || []) {
    const newEndDate = new Date(lease.end_date);
    newEndDate.setDate(newEndDate.getDate() + extensionDays);

    await supabase
      .from('leases')
      .update({
        end_date: newEndDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', lease.id);
  }
}

// Lease compliance and audit functions
export async function getLeaseComplianceReport(propertyId?: string) {
  const { data: leases } = await supabase
    .from('leases')
    .select(`
      *,
      property:properties(*),
      unit:units(*),
      tenant:tenants(*)
    `)
    .eq('status', 'active');

  // Mock compliance checks
  const complianceIssues = [];
  
  for (const lease of leases || []) {
    // Check if lease has required documents
    const { data: documents } = await supabase
      .from('lease_documents')
      .select('*')
      .eq('lease_id', lease.id)
      .eq('type', 'lease_agreement')
      .eq('status', 'signed');

    if (!documents || documents.length === 0) {
      complianceIssues.push({
        lease_id: lease.id,
        issue: 'Missing signed lease agreement',
        severity: 'high'
      });
    }

    // Check if insurance is required and provided
    // Check if background checks are complete
    // Check if security deposit is received
  }

  return {
    total_leases: leases?.length || 0,
    compliance_issues: complianceIssues,
    compliance_rate: leases ? ((leases.length - complianceIssues.length) / leases.length) * 100 : 0
  };
}