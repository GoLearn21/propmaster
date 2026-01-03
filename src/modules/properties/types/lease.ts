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
  pet_deposit?: number;
  application_fee?: number;
  status: 'active' | 'expired' | 'terminated' | 'renewed' | 'pending' | 'draft';
  lease_type: 'fixed' | 'month-to-month';
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Enhanced fields
  late_fee_pct?: number;
  late_fee_flat?: number;
  grace_period_days?: number;
  renewal_notice_days?: number;
  allowed_pets?: boolean;
  pet_deposit_per_pet?: number;
  smoking_allowed?: boolean;
  utilities_included?: string[];
  parking_spaces?: number;
  additional_terms?: string;
  auto_renewal?: boolean;
  auto_renewal_notice_days?: number;
  rent_increase_pct?: number;
  renter_insurance_required?: boolean;
  min_liability_coverage?: number;
  
  // Payment schedule
  payment_schedule?: {
    frequency: 'monthly' | 'quarterly' | 'annually';
    due_day: number;
    payment_methods: string[];
    late_fee_pct: number;
    late_fee_flat: number;
  };
  
  // Relations
  property?: {
    id: string;
    name: string;
    address: string;
    type: string;
  };
  unit?: {
    id: string;
    unit_number: string;
    bedrooms: number;
    bathrooms: number;
    square_feet?: number;
    amenities?: string[];
  };
  tenant?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    credit_score?: number;
    employment_status?: string;
  };
  
  // Computed fields
  duration_months?: number;
  total_rent?: number;
  days_until_expiration?: number;
  is_expiring_soon?: boolean;
}

export interface LeaseStats {
  total_leases: number;
  active_leases: number;
  expiring_soon: number;
  expired_leases: number;
  pending_leases: number;
  total_monthly_rent: number;
  occupancy_rate: number;
}

export interface CreateLeaseInput {
  property_id: string;
  unit_id: string;
  tenant_id?: string;
  lease_number: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit?: number;
  status?: Lease['status'];
  lease_type: Lease['lease_type'];
  notes?: string;
}

export interface LeaseFilters {
  status?: Lease['status'];
  lease_type?: Lease['lease_type'];
  expiring_before?: string;
  expiring_after?: string;
  search?: string;
}

export interface ExpiringLease {
  id: string;
  lease_number: string;
  property_name: string;
  unit_number: string;
  tenant_name: string;
  tenant_email?: string;
  tenant_phone?: string;
  end_date: string;
  days_until_expiration: number;
  monthly_rent: number;
  renewal_required: boolean;
  reminder_sent?: boolean;
  last_contact_date?: string;
}

// Enhanced interfaces for comprehensive lease management

export interface LeaseDocument {
  id: string;
  lease_id: string;
  name: string;
  type: 'lease_agreement' | 'addendum' | 'notice' | 'payment_receipt' | 'inspection_report' | 'maintenance_request' | 'other';
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'expired';
  tags: string[];
  description?: string;
  expiration_date?: string;
  signature_required?: boolean;
  signed_at?: string;
  signed_by?: string;
}

export interface LeasePayment {
  id: string;
  lease_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial' | 'cancelled';
  payment_method?: 'credit_card' | 'bank_transfer' | 'check' | 'cash' | 'other';
  late_fee?: number;
  notes?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaseRenewal {
  id: string;
  original_lease_id: string;
  new_lease_id?: string;
  proposed_end_date: string;
  proposed_rent?: number;
  rent_increase_pct?: number;
  status: 'proposed' | 'accepted' | 'declined' | 'expired' | 'countered';
  tenant_response?: string;
  manager_notes?: string;
  created_at: string;
  response_deadline: string;
  responded_at?: string;
  
  // Relations
  original_lease?: Lease;
  new_lease?: Lease;
}

export interface LeaseAnalytics {
  revenue_trends: Array<{
    month: string;
    revenue: number;
    lease_count: number;
    avg_rent: number;
  }>;
  occupancy_trends: Array<{
    date: string;
    occupancy_rate: number;
    occupied_units: number;
    total_units: number;
  }>;
  renewal_rates: {
    overall: number;
    by_property: Record<string, number>;
    by_lease_type: Record<string, number>;
  };
  average_lease_duration: number;
  tenant_satisfaction: number;
  maintenance_requests: number;
  payment_collection_rate: number;
  lease_upgrades: number;
}

export interface LeaseCompliance {
  id: string;
  lease_id: string;
  check_type: 'insurance' | 'background_check' | 'security_deposit' | 'lease_agreement' | 'addendums';
  status: 'compliant' | 'non_compliant' | 'pending' | 'expired';
  checked_at: string;
  expires_at?: string;
  details?: string;
  evidence_url?: string;
}

export interface LeaseTemplate {
  id: string;
  name: string;
  description: string;
  lease_type: 'residential' | 'commercial';
  template_data: {
    default_terms: Partial<Lease>;
    clauses: string[];
    required_documents: string[];
    payment_terms: any;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface LeaseWorkflow {
  id: string;
  lease_id: string;
  step: 'created' | 'pending_tenant' | 'pending_documents' | 'pending_signature' | 'active' | 'expiring' | 'renewal' | 'terminated';
  status: 'pending' | 'completed' | 'skipped' | 'failed';
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
}

export interface LeaseNotification {
  id: string;
  lease_id: string;
  type: 'expiration' | 'renewal' | 'payment' | 'document' | 'maintenance' | 'compliance' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'archived';
  created_at: string;
  read_at?: string;
  action_required: boolean;
  action_url?: string;
  expires_at?: string;
}

export interface LeaseSearchFilters {
  query?: string;
  property_ids?: string[];
  unit_ids?: string[];
  tenant_ids?: string[];
  status?: Lease['status'][];
  lease_type?: Lease['lease_type'][];
  date_range?: {
    start_date?: string;
    end_date?: string;
    move_in_date?: string;
    move_out_date?: string;
  };
  rent_range?: {
    min?: number;
    max?: number;
  };
  duration_range?: {
    min_months?: number;
    max_months?: number;
  };
  tags?: string[];
  has_pets?: boolean;
  smoking_allowed?: boolean;
  parking_included?: boolean;
}

export interface LeaseSortOptions {
  field: 'start_date' | 'end_date' | 'monthly_rent' | 'created_at' | 'updated_at' | 'tenant_name' | 'property_name';
  direction: 'asc' | 'desc';
}

export interface LeaseComparison {
  leases: Lease[];
  metrics: {
    avg_rent: number;
    total_rent: number;
    avg_duration: number;
    occupancy_rate: number;
    renewal_rate: number;
  };
  differences: Array<{
    field: string;
    values: any[];
    impact: 'positive' | 'negative' | 'neutral';
  }>;
}

export interface LeaseExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  fields: string[];
  filters?: LeaseSearchFilters;
  sort?: LeaseSortOptions;
  include_relations?: boolean;
  include_payments?: boolean;
  include_documents?: boolean;
  date_format?: string;
  currency?: string;
}