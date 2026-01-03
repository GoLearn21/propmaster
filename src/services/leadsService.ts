import { supabase } from '../lib/supabase';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: 'website' | 'referral' | 'zillow' | 'apartments.com' | 'walk-in' | 'social';
  status: 'new' | 'contacted' | 'qualified' | 'touring' | 'application' | 'converted' | 'lost';
  score: number;
  propertyInterest: string;
  budget: number;
  moveInDate: string;
  lastContact: string;
  notes: string;
  createdAt: string;
}

export const leadsService = {
  /**
   * Get all leads
   */
  async getLeads(): Promise<Lead[]> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database format to frontend format
      return (data || []).map(lead => ({
        id: lead.id,
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source || 'website',
        status: lead.status || 'new',
        score: lead.score || 50,
        propertyInterest: lead.property_interest || '',
        budget: 2500, // Default if not in DB
        moveInDate: '2025-12-01', // Default if not in DB
        lastContact: lead.updated_at || lead.created_at || '',
        notes: lead.notes || '',
        createdAt: lead.created_at || ''
      }));
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  },

  /**
   * Create a new lead
   */
  async createLead(lead: Partial<Lead>): Promise<Lead> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([{
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          status: lead.status || 'new',
          score: lead.score || 50,
          property_interest: lead.propertyInterest,
          notes: lead.notes
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        source: data.source,
        status: data.status,
        score: data.score,
        propertyInterest: data.property_interest,
        budget: 2500,
        moveInDate: '2025-12-01',
        lastContact: data.updated_at,
        notes: data.notes,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  },

  /**
   * Update lead status
   */
  async updateLeadStatus(leadId: string, status: Lead['status']): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating lead status:', error);
      throw error;
    }
  },

  /**
   * Update lead score
   */
  async updateLeadScore(leadId: string, score: number): Promise<void> {
    try {
      const { error} = await supabase
        .from('leads')
        .update({ score, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating lead score:', error);
      throw error;
    }
  }
};
