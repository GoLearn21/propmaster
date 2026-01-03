/**
 * Billing Configuration Hooks
 * React Query hooks for billing configurations CRUD operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface BillingConfiguration {
  id: string;
  property_id: string;
  state: 'NC' | 'SC' | 'GA';
  late_fee_type: 'percentage' | 'flat' | 'daily';
  late_fee_amount: number;
  grace_period_days: number;
  max_late_fee_amount: number | null;
  billing_day: number;
  prorate_partial_months: boolean;
  auto_generate_invoices: boolean;
  accept_partial_payments: boolean;
  payment_methods: string[];
  reminder_days_before_due: number;
  reminder_days_after_due: number;
  send_reminder_emails: boolean;
  send_reminder_sms: boolean;
  compliance_status: 'compliant' | 'warning' | 'non_compliant';
  last_compliance_check: string | null;
  compliance_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  property?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    total_units: number;
    occupied_units: number;
  };
}

export interface BillingPendingAction {
  id: string;
  billing_configuration_id: string;
  property_id: string;
  action_type: 'late_fee_review' | 'billing_day_change' | 'compliance_update' | 'reminder_config' | 'approval_needed' | 'rate_adjustment' | 'payment_method_update';
  description: string;
  priority: 'high' | 'medium' | 'low';
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  created_at: string;
}

export interface StateComplianceRule {
  id: string;
  state: 'NC' | 'SC' | 'GA';
  state_name: string;
  max_late_fee_percent: number | null;
  min_late_fee_amount: number | null;
  grace_period_required: number;
  max_security_deposit_months: number | null;
  return_deadline_days: number;
  interest_required: boolean;
  late_fee_citation: string;
  security_deposit_citation: string;
  description: string;
}

export interface PropertyWithBilling extends BillingConfiguration {
  unitCount: number;
  occupiedUnits: number;
  avgRent: number;
  pendingActions: BillingPendingAction[];
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const billingKeys = {
  all: ['billing'] as const,
  configurations: () => [...billingKeys.all, 'configurations'] as const,
  configuration: (id: string) => [...billingKeys.configurations(), id] as const,
  byProperty: (propertyId: string) => [...billingKeys.configurations(), 'property', propertyId] as const,
  byState: (state: string) => [...billingKeys.configurations(), 'state', state] as const,
  pendingActions: () => [...billingKeys.all, 'pending-actions'] as const,
  pendingActionsByProperty: (propertyId: string) => [...billingKeys.pendingActions(), propertyId] as const,
  stateRules: () => [...billingKeys.all, 'state-rules'] as const,
  stateRule: (state: string) => [...billingKeys.stateRules(), state] as const,
  stats: () => [...billingKeys.all, 'stats'] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all billing configurations with property data
 */
export function useBillingConfigurations(state?: 'NC' | 'SC' | 'GA' | 'all') {
  return useQuery({
    queryKey: state && state !== 'all' ? billingKeys.byState(state) : billingKeys.configurations(),
    queryFn: async () => {
      let query = supabase
        .from('billing_configurations')
        .select(`
          *,
          property:properties(
            id,
            name,
            address,
            city,
            state,
            total_units,
            occupied_units
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (state && state !== 'all') {
        query = query.eq('state', state);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[BillingConfig] Query error:', error);
        throw error;
      }

      return (data || []) as BillingConfiguration[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch billing configuration by property ID
 */
export function useBillingConfigurationByProperty(propertyId: string) {
  return useQuery({
    queryKey: billingKeys.byProperty(propertyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_configurations')
        .select(`
          *,
          property:properties(
            id,
            name,
            address,
            city,
            state,
            total_units,
            occupied_units
          )
        `)
        .eq('property_id', propertyId)
        .single();

      if (error) throw error;
      return data as BillingConfiguration;
    },
    enabled: !!propertyId,
  });
}

/**
 * Fetch pending actions for billing configurations
 */
export function useBillingPendingActions(propertyId?: string) {
  return useQuery({
    queryKey: propertyId ? billingKeys.pendingActionsByProperty(propertyId) : billingKeys.pendingActions(),
    queryFn: async () => {
      let query = supabase
        .from('billing_pending_actions')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: true })
        .order('due_date', { ascending: true });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[BillingActions] Query error:', error);
        throw error;
      }

      return (data || []) as BillingPendingAction[];
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch state compliance rules
 */
export function useStateComplianceRules() {
  return useQuery({
    queryKey: billingKeys.stateRules(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('state_compliance_rules')
        .select('*')
        .order('state');

      if (error) {
        console.error('[StateRules] Query error:', error);
        throw error;
      }

      return (data || []) as StateComplianceRule[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - rules don't change often
  });
}

/**
 * Fetch billing statistics
 */
export function useBillingStats() {
  return useQuery({
    queryKey: billingKeys.stats(),
    queryFn: async () => {
      // Get all configurations
      const { data: configs, error: configError } = await supabase
        .from('billing_configurations')
        .select('state, compliance_status')
        .eq('is_active', true);

      if (configError) throw configError;

      // Get pending actions count
      const { count: pendingCount, error: actionError } = await supabase
        .from('billing_pending_actions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (actionError) throw actionError;

      // Calculate stats
      const stats = {
        total: configs?.length || 0,
        byState: { NC: 0, SC: 0, GA: 0 } as Record<string, number>,
        byCompliance: { compliant: 0, warning: 0, non_compliant: 0 } as Record<string, number>,
        pendingActions: pendingCount || 0,
      };

      (configs || []).forEach(c => {
        if (stats.byState[c.state] !== undefined) stats.byState[c.state]++;
        if (stats.byCompliance[c.compliance_status] !== undefined) stats.byCompliance[c.compliance_status]++;
      });

      return stats;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

interface CreateBillingConfigInput {
  property_id: string;
  state: 'NC' | 'SC' | 'GA';
  late_fee_type?: 'percentage' | 'flat' | 'daily';
  late_fee_amount?: number;
  grace_period_days?: number;
  billing_day?: number;
}

/**
 * Create a new billing configuration
 */
export function useCreateBillingConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBillingConfigInput) => {
      const { data, error } = await supabase
        .from('billing_configurations')
        .insert({
          property_id: input.property_id,
          state: input.state,
          late_fee_type: input.late_fee_type || 'percentage',
          late_fee_amount: input.late_fee_amount || 5,
          grace_period_days: input.grace_period_days || 5,
          billing_day: input.billing_day || 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}

interface UpdateBillingConfigInput {
  id: string;
  late_fee_type?: 'percentage' | 'flat' | 'daily';
  late_fee_amount?: number;
  grace_period_days?: number;
  billing_day?: number;
  send_reminder_emails?: boolean;
  send_reminder_sms?: boolean;
}

/**
 * Update a billing configuration
 */
export function useUpdateBillingConfiguration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBillingConfigInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('billing_configurations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
      if (data?.property_id) {
        queryClient.invalidateQueries({ queryKey: billingKeys.byProperty(data.property_id) });
      }
    },
  });
}

/**
 * Complete a pending action
 */
export function useCompletePendingAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('billing_pending_actions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.pendingActions() });
      queryClient.invalidateQueries({ queryKey: billingKeys.stats() });
    },
  });
}

/**
 * Dismiss a pending action
 */
export function useDismissPendingAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('billing_pending_actions')
        .update({
          status: 'dismissed',
        })
        .eq('id', actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.pendingActions() });
      queryClient.invalidateQueries({ queryKey: billingKeys.stats() });
    },
  });
}

// ============================================================================
// HELPER - Combined Properties with Billing (for BillingConfiguration component)
// ============================================================================

/**
 * Fetch properties with their billing configurations and pending actions
 * This replaces the generatePropertyData() mock function
 */
export function usePropertiesWithBilling(state?: 'NC' | 'SC' | 'GA' | 'all') {
  const configsQuery = useBillingConfigurations(state);
  const actionsQuery = useBillingPendingActions();

  const isLoading = configsQuery.isLoading || actionsQuery.isLoading;
  const error = configsQuery.error || actionsQuery.error;

  // Combine the data
  const data = !isLoading && configsQuery.data
    ? configsQuery.data.map(config => {
        const property = config.property;
        const actions = (actionsQuery.data || []).filter(
          a => a.property_id === config.property_id
        );

        return {
          ...config,
          unitCount: property?.total_units || 0,
          occupiedUnits: property?.occupied_units || 0,
          avgRent: 0, // Would need to calculate from units table
          pendingActions: actions,
        } as PropertyWithBilling;
      })
    : [];

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      configsQuery.refetch();
      actionsQuery.refetch();
    },
  };
}
