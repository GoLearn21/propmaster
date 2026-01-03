import { supabase } from '../lib/supabase';

export interface LeaseApplication {
  id: string;
  property_id: string;
  unit_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  desired_move_in_date: string;
  employment_status: string;
  annual_income: number;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'withdrawn';
  screening_status?: 'not_started' | 'in_progress' | 'completed' | 'failed';
  screening_score?: number;
  notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

// Get applications with filters
export async function getApplications(filters?: {
  status?: string;
  propertyId?: string;
  unitId?: string;
}) {
  let query = supabase
    .from('lease_applications')
    .select(`
      *,
      properties (name, address),
      units (unit_number, rent_amount)
    `)
    .order('submitted_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.propertyId) {
    query = query.eq('property_id', filters.propertyId);
  }

  if (filters?.unitId) {
    query = query.eq('unit_id', filters.unitId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Get pending applications
export async function getPendingApplications() {
  return getApplications({ status: 'pending' });
}

// Create application
export async function createApplication(application: Omit<LeaseApplication, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('lease_applications')
    .insert([{
      ...application,
      submitted_at: application.submitted_at || new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update application
export async function updateApplication(id: string, updates: Partial<LeaseApplication>) {
  const { data, error } = await supabase
    .from('lease_applications')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Approve application
export async function approveApplication(id: string, reviewedBy: string) {
  return updateApplication(id, {
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewedBy
  });
}

// Reject application
export async function rejectApplication(id: string, reviewedBy: string, notes?: string) {
  return updateApplication(id, {
    status: 'rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewedBy,
    notes
  });
}

// Start screening
export async function startScreening(id: string) {
  return updateApplication(id, {
    screening_status: 'in_progress'
  });
}

// Complete screening
export async function completeScreening(id: string, score: number) {
  return updateApplication(id, {
    screening_status: 'completed',
    screening_score: score,
    status: score >= 650 ? 'approved' : 'reviewing'
  });
}

// Delete application
export async function deleteApplication(id: string) {
  const { error } = await supabase
    .from('lease_applications')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
