/**
 * People Service
 * Service layer for managing all person types (Tenants, Owners, Vendors, Prospects)
 *
 * PRODUCTION VERSION - No mock data fallbacks
 */

import { supabase } from '../lib/supabase';

// Types
export type PersonType = 'tenant' | 'owner' | 'vendor' | 'prospect';
export type TenantStatus = 'current' | 'past' | 'future' | 'evicted';
export type OwnerStatus = 'active' | 'inactive';
export type VendorStatus = 'active' | 'inactive' | 'blacklisted';
export type ProspectStatus = 'new' | 'contacted' | 'tour_scheduled' | 'application_submitted' | 'approved' | 'rejected' | 'converted';
export type LeadSource = 'website' | 'zillow' | 'apartments_com' | 'referral' | 'social_media' | 'walk_in' | 'other';

export interface Person {
  id: string;
  type: PersonType;
  first_name: string;
  middle_initial?: string;
  last_name: string;
  date_of_birth?: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  photo_url?: string;
  notes?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant extends Person {
  type: 'tenant';
  tenant_info?: {
    balance_due?: number;
    monthly_rent?: number;
    lease_start_date?: string;
    lease_end_date?: string;
  };
}

export interface Owner extends Person {
  type: 'owner';
  owner_info?: {
    tax_id?: string;
    payment_method?: string;
    distribution_day?: number;
  };
}

export interface Vendor extends Person {
  type: 'vendor';
  vendor_info?: {
    business_name: string;
    license_number?: string;
    service_categories?: string[];
    hourly_rate?: number;
    average_rating?: number;
  };
}

export interface Prospect extends Person {
  type: 'prospect';
  prospect_info?: {
    lead_source?: LeadSource;
    lead_status?: ProspectStatus;
    desired_move_in_date?: string;
    budget_min?: number;
    budget_max?: number;
  };
}

export interface PeopleStatistics {
  tenants: {
    total: number;
    balance_due: number;
    missing_contact_info: number;
    new_this_month: number;
    portal_not_signed: number;
    invalid_emails: number;
  };
  owners: {
    total: number;
    properties_owned: number;
    monthly_distribution: number;
  };
  vendors: {
    total: number;
    active_jobs: number;
    avg_rating: number;
  };
  prospects: {
    total: number;
    contacted_this_week: number;
    tours_scheduled: number;
    applications_submitted: number;
  };
}

/**
 * Get all people with optional filtering
 */
export async function getPeople(
  type?: PersonType,
  searchTerm?: string,
  filters?: {
    status?: string;
    hasBalance?: boolean;
  }
): Promise<Person[]> {
  let query = supabase
    .from('people')
    .select('*')
    .order('created_at', { ascending: false });

  // Filter by type
  if (type) {
    query = query.eq('type', type);
  }

  // Search
  if (searchTerm && searchTerm.length >= 2) {
    query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
  }

  // Status filter
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching people:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get tenant-specific data with balance information
 */
export async function getTenants(searchTerm?: string, filters?: { status?: string; hasBalance?: boolean }): Promise<Tenant[]> {
  const people = await getPeople('tenant', searchTerm, filters);

  // Get tenant-specific data
  const { data: tenantsData, error } = await supabase
    .from('tenants')
    .select('id, person_id, email, balance_due, rent_amount as monthly_rent, lease_start_date, lease_end_date');

  if (error) {
    console.error('Error fetching tenant details:', error);
    // Continue with just people data - tenant_info will be empty
  }

  // Map tenant data to people
  const tenantMap = new Map(tenantsData?.map(t => [t.person_id || t.email, t]) || []);

  return people.map(person => ({
    ...person,
    type: 'tenant' as const,
    tenant_info: tenantMap.get(person.id) || tenantMap.get(person.email) || undefined
  }));
}

/**
 * Get owners with owner-specific data
 */
export async function getOwners(searchTerm?: string): Promise<Owner[]> {
  const people = await getPeople('owner', searchTerm);

  const { data: ownersData, error } = await supabase
    .from('people_owners')
    .select('*');

  if (error) {
    console.error('Error fetching owner details:', error);
    // Continue with just people data
  }

  const ownerMap = new Map(ownersData?.map(o => [o.person_id, o]) || []);

  return people.map(person => ({
    ...person,
    type: 'owner' as const,
    owner_info: ownerMap.get(person.id) || undefined
  }));
}

/**
 * Get vendors with vendor-specific data
 */
export async function getVendors(searchTerm?: string): Promise<Vendor[]> {
  const people = await getPeople('vendor', searchTerm);

  const { data: vendorsData, error } = await supabase
    .from('people_vendors')
    .select('*');

  if (error) {
    console.error('Error fetching vendor details:', error);
    // Continue with just people data
  }

  const vendorMap = new Map(vendorsData?.map(v => [v.person_id, v]) || []);

  return people.map(person => ({
    ...person,
    type: 'vendor' as const,
    vendor_info: vendorMap.get(person.id) || undefined
  }));
}

/**
 * Get prospects with prospect-specific data
 */
export async function getProspects(searchTerm?: string, filters?: { status?: ProspectStatus }): Promise<Prospect[]> {
  const people = await getPeople('prospect', searchTerm);

  let query = supabase.from('people_prospects').select('*');
  if (filters?.status) {
    query = query.eq('lead_status', filters.status);
  }

  const { data: prospectsData, error } = await query;

  if (error) {
    console.error('Error fetching prospect details:', error);
    // Continue with just people data
  }

  const prospectMap = new Map(prospectsData?.map(p => [p.person_id, p]) || []);

  return people.map(person => ({
    ...person,
    type: 'prospect' as const,
    prospect_info: prospectMap.get(person.id) || undefined
  }));
}

/**
 * Get statistics for all person types
 */
export async function getPeopleStatistics(): Promise<PeopleStatistics> {
  // Get counts by type
  const { data: counts, error: countsError } = await supabase
    .from('people')
    .select('type');

  if (countsError) {
    console.error('Error fetching people counts:', countsError);
    throw countsError;
  }

  const tenantCount = counts?.filter(p => p.type === 'tenant').length || 0;
  const ownerCount = counts?.filter(p => p.type === 'owner').length || 0;
  const vendorCount = counts?.filter(p => p.type === 'vendor').length || 0;
  const prospectCount = counts?.filter(p => p.type === 'prospect').length || 0;

  // Get tenant statistics
  const { data: tenantStats } = await supabase
    .from('tenants')
    .select('balance_due, email');

  const balanceDue = tenantStats?.reduce((sum, t) => sum + (Number(t.balance_due) || 0), 0) || 0;
  const missingContactInfo = tenantStats?.filter(t => !t.email).length || 0;

  // Get new tenants this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: newTenants } = await supabase
    .from('people')
    .select('id')
    .eq('type', 'tenant')
    .gte('created_at', startOfMonth.toISOString());

  // Get portal and email statistics
  const { data: allTenants } = await supabase
    .from('people')
    .select('id, email, phone')
    .eq('type', 'tenant');

  const portalNotSigned = allTenants?.filter(t => !t.email || t.email === '').length || 0;
  const invalidEmails = allTenants?.filter(t => t.email && !isValidEmail(t.email)).length || 0;

  // Get vendor ratings
  const { data: vendorRatings } = await supabase
    .from('people_vendors')
    .select('average_rating');

  const avgVendorRating = vendorRatings?.length
    ? vendorRatings.reduce((sum, v) => sum + (Number(v.average_rating) || 0), 0) / vendorRatings.length
    : 0;

  // Get prospect stats
  const { data: prospectStats } = await supabase
    .from('people_prospects')
    .select('lead_status, created_at');

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const contactedThisWeek = prospectStats?.filter(p =>
    p.lead_status === 'contacted' && new Date(p.created_at) > oneWeekAgo
  ).length || 0;

  const toursScheduled = prospectStats?.filter(p => p.lead_status === 'tour_scheduled').length || 0;
  const applicationsSubmitted = prospectStats?.filter(p => p.lead_status === 'application_submitted').length || 0;

  return {
    tenants: {
      total: tenantCount,
      balance_due: balanceDue,
      missing_contact_info: missingContactInfo,
      new_this_month: newTenants?.length || 0,
      portal_not_signed: portalNotSigned,
      invalid_emails: invalidEmails
    },
    owners: {
      total: ownerCount,
      properties_owned: await getOwnersPropertiesCount(),
      monthly_distribution: await getOwnersMonthlyDistribution()
    },
    vendors: {
      total: vendorCount,
      active_jobs: await getVendorsActiveJobs(),
      avg_rating: avgVendorRating
    },
    prospects: {
      total: prospectCount,
      contacted_this_week: contactedThisWeek,
      tours_scheduled: toursScheduled,
      applications_submitted: applicationsSubmitted
    }
  };
}

/**
 * Create a new person
 */
export async function createPerson(person: Partial<Person>, typeSpecificData?: any): Promise<Person> {
  // Insert into people table
  const { data: personData, error: personError } = await supabase
    .from('people')
    .insert([{
      type: person.type,
      first_name: person.first_name,
      middle_initial: person.middle_initial,
      last_name: person.last_name,
      date_of_birth: person.date_of_birth,
      email: person.email,
      phone: person.phone,
      company: person.company,
      job_title: person.job_title,
      notes: person.notes,
      status: person.status
    }])
    .select()
    .single();

  if (personError) {
    // Handle duplicate email error with user-friendly message
    if (personError.code === '23505' && personError.message?.includes('people_email_key')) {
      throw new Error(`A person with email "${person.email}" already exists. Please use a different email address.`);
    }
    throw personError;
  }

  // Insert type-specific data
  if (typeSpecificData && personData) {
    let typeTable = '';
    let typeData: any = { person_id: personData.id };

    switch (person.type) {
      case 'owner':
        typeTable = 'people_owners';
        typeData = { ...typeData, ...typeSpecificData };
        break;
      case 'vendor':
        typeTable = 'people_vendors';
        typeData = { ...typeData, ...typeSpecificData };
        break;
      case 'prospect':
        typeTable = 'people_prospects';
        typeData = { ...typeData, ...typeSpecificData };
        break;
    }

    if (typeTable) {
      const { error: typeError } = await supabase
        .from(typeTable)
        .insert([typeData]);

      if (typeError) {
        console.error(`Error inserting ${person.type} data:`, typeError);
      }
    }
  }

  return personData;
}

/**
 * Update a person
 */
export async function updatePerson(id: string, updates: Partial<Person>): Promise<Person> {
  const { data, error } = await supabase
    .from('people')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating person:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a person
 */
export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting person:', error);
    throw error;
  }
}

/**
 * Helper function to validate email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Calculate total number of properties owned by all owners
 */
async function getOwnersPropertiesCount(): Promise<number> {
  const { data, error } = await supabase
    .from('property_ownership')
    .select('property_id')
    .is('end_date', null); // Only active ownerships

  if (error) {
    console.error('Error fetching property ownership:', error);
    return 0;
  }

  // Count unique properties
  const uniqueProperties = new Set(data?.map(o => o.property_id) || []);
  return uniqueProperties.size;
}

/**
 * Calculate total monthly distribution amount for all owners
 */
async function getOwnersMonthlyDistribution(): Promise<number> {
  // Get all active leases to calculate total revenue
  const { data: leases, error: leasesError } = await supabase
    .from('leases')
    .select('monthly_rent, property_id')
    .eq('status', 'active');

  if (leasesError) {
    console.error('Error fetching leases for distribution:', leasesError);
    return 0;
  }

  // Group revenue by property
  const propertyRevenue = new Map<string, number>();
  leases?.forEach(lease => {
    const currentRevenue = propertyRevenue.get(lease.property_id) || 0;
    propertyRevenue.set(lease.property_id, currentRevenue + (lease.monthly_rent || 0));
  });

  // Get ownership percentages
  const { data: ownerships, error: ownershipError } = await supabase
    .from('property_ownership')
    .select('property_id, ownership_percentage')
    .is('end_date', null);

  if (ownershipError) {
    console.error('Error fetching ownerships for distribution:', ownershipError);
    return 0;
  }

  // Calculate total distributions
  let totalDistribution = 0;
  ownerships?.forEach(ownership => {
    const revenue = propertyRevenue.get(ownership.property_id) || 0;
    const ownerShare = revenue * (ownership.ownership_percentage / 100);
    totalDistribution += ownerShare;
  });

  return Math.round(totalDistribution * 100) / 100;
}

/**
 * Calculate total number of active jobs for all vendors
 */
async function getVendorsActiveJobs(): Promise<number> {
  const { count, error } = await supabase
    .from('work_orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'scheduled', 'in_progress']);

  if (error) {
    console.error('Error fetching active jobs:', error);
    return 0;
  }

  return count || 0;
}
