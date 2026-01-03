import { supabase } from '../lib/supabase';

export interface BackgroundCheck {
  id: string;
  applicantName: string;
  applicantEmail: string;
  propertyName: string;
  unitNumber: string;
  status: 'pending' | 'in-progress' | 'completed' | 'flagged';
  creditScore: number | null;
  criminalRecord: 'clear' | 'minor' | 'major' | 'pending';
  evictionHistory: 'none' | 'resolved' | 'active' | 'pending';
  employmentVerified: boolean | null;
  incomeVerified: boolean | null;
  requestedDate: string;
  completedDate: string | null;
  cost: number;
  recommendation: 'approve' | 'approve-conditional' | 'deny' | 'pending';
}

export const backgroundChecksService = {
  async getBackgroundChecks(): Promise<BackgroundCheck[]> {
    try {
      // Query with joins to get tenant and property information
      const { data, error } = await supabase
        .from('background_checks')
        .select(`
          *,
          tenant:tenants(id, first_name, last_name, email),
          application:lease_applications(
            id,
            unit:units(
              id,
              unit_number,
              property:properties(id, name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(check => {
        // Extract names from joined data
        const tenant = check.tenant as any;
        const application = check.application as any;
        const unit = application?.unit;
        const property = unit?.property;

        // Calculate recommendation based on checks
        let recommendation: 'approve' | 'approve-conditional' | 'deny' | 'pending' = 'pending';
        
        if (check.status === 'completed') {
          const creditScore = check.credit_score || 0;
          const hasCriminalRecord = check.criminal_record;
          const hasEviction = check.eviction_history;
          const employmentOk = check.employment_verified;
          const incomeOk = check.income_verified;
          
          if (creditScore >= 700 && !hasCriminalRecord && !hasEviction && employmentOk && incomeOk) {
            recommendation = 'approve';
          } else if (creditScore >= 650 && employmentOk) {
            recommendation = 'approve-conditional';
          } else if (creditScore < 550 || hasCriminalRecord || hasEviction) {
            recommendation = 'deny';
          } else {
            recommendation = 'approve-conditional';
          }
        }

        // Map criminal record to severity
        let criminalRecord: 'clear' | 'minor' | 'major' | 'pending' = 'pending';
        if (check.status === 'completed') {
          criminalRecord = check.criminal_record ? 'major' : 'clear';
        }

        // Map eviction history
        let evictionHistory: 'none' | 'resolved' | 'active' | 'pending' = 'pending';
        if (check.status === 'completed') {
          evictionHistory = check.eviction_history ? 'active' : 'none';
        }

        // Map status to match frontend enum
        let status: 'pending' | 'in-progress' | 'completed' | 'flagged' = 'pending';
        if (check.status === 'completed' || check.status === 'complete') {
          status = 'completed';
        } else if (check.status === 'in_progress' || check.status === 'in-progress' || check.status === 'processing') {
          status = 'in-progress';
        } else if (check.status === 'failed' || check.status === 'flagged') {
          status = 'flagged';
        } else {
          status = 'pending';
        }

        return {
          id: check.id,
          applicantName: tenant ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Unknown Applicant' : 'Unknown Applicant',
          applicantEmail: tenant?.email || 'unknown@email.com',
          propertyName: property?.name || 'Unknown Property',
          unitNumber: unit?.unit_number || 'Unknown Unit',
          status,
          creditScore: check.credit_score,
          criminalRecord,
          evictionHistory,
          employmentVerified: check.employment_verified,
          incomeVerified: check.income_verified,
          requestedDate: check.created_at,
          completedDate: check.completed_at,
          cost: 45.00,
          recommendation
        };
      });
    } catch (error) {
      console.error('Error fetching background checks:', error);
      throw error;
    }
  }
};
