export interface PaymentMetrics {
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  overdueAmount: number;
  monthlyChange: number;
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'failed';
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutstandingBalance {
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  totalOutstanding: number;
  oldestInvoice: string;
  daysOverdue: number;
  lastPaymentDate?: string;
  paymentMethod?: string;
}

export interface CollectionStatus {
  propertyId: string;
  propertyName: string;
  totalUnits: number;
  paidUnits: number;
  pendingUnits: number;
  overdueUnits: number;
  collectionRate: number;
  averageDaysToPay: number;
  lastMonthChange: number;
}

export interface BillingConfiguration {
  id: string;
  propertyId: string;
  propertyName: string;
  rentDueDay: number;
  lateFeeType: 'flat' | 'percentage';
  lateFeeAmount: number;
  gracePeriod: number;
  reminderSettings: {
    firstReminder: number;
    secondReminder: number;
    finalNotice: number;
  };
  autopayEnabled: boolean;
  autopaySettings?: {
    day: number;
    method: string;
  };
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  tenantId: string;
  type: 'bank_account' | 'credit_card' | 'debit_card';
  isDefault: boolean;
  bankName?: string;
  accountLastFour?: string;
  cardLastFour?: string;
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuickStat {
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
}

export interface PaymentDashboardProps {
  propertyId?: string;
  tenantId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Enhanced Payment Types for Phase 3 Implementation
export interface Payment {
  id: string;
  tenant_id: string;
  lease_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'ach' | 'credit_card' | 'debit_card' | 'check' | 'cash';
  status: 'paid' | 'pending' | 'overdue' | 'failed' | 'processing' | 'cancelled';
  reference_number?: string;
  stripe_payment_intent_id?: string;
  processing_fee?: number;
  late_fee?: number;
  total_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  tenant?: Tenant;
  lease?: Lease;
  property?: Property;
  payment_method_details?: PaymentMethodDetails;
  allocation?: PaymentAllocation[];
}

export interface PaymentMethodDetails {
  id: string;
  tenant_id: string;
  stripe_payment_method_id: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string; // Visa, Mastercard, etc.
  exp_month?: number;
  exp_year?: number;
  bank_name?: string;
  account_type?: 'checking' | 'savings';
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  allocation_type: 'rent' | 'late_fee' | 'security_deposit' | 'utility' | 'other';
  amount: number;
  description?: string;
  created_at: string;
}

export interface BillingSchedule {
  id: string;
  tenant_id: string;
  lease_id: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  due_day: number;
  auto_pay_enabled: boolean;
  payment_method_id?: string;
  next_due_date: string;
  status: 'active' | 'paused' | 'cancelled';
  grace_period_days: number;
  late_fee_amount?: number;
  late_fee_percentage?: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentReminder {
  id: string;
  tenant_id: string;
  billing_schedule_id: string;
  reminder_type: 'email' | 'sms' | 'both';
  days_before_due: number;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: string;
  created_at: string;
}

export interface LateFee {
  id: string;
  tenant_id: string;
  lease_id: string;
  payment_id?: string;
  amount: number;
  days_late: number;
  calculation_method: 'fixed' | 'percentage' | 'daily';
  applied_date: string;
  waived: boolean;
  waiver_reason?: string;
  waived_by?: string;
  waived_at?: string;
  created_at: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  client_secret: string;
  payment_method_id?: string;
  metadata?: Record<string, string>;
  created_at: string;
}

export interface PaymentDashboardMetrics {
  total_collected: number;
  pending_payments: number;
  overdue_payments: number;
  late_fees_collected: number;
  collection_rate: number;
  avg_days_to_collect: number;
  outstanding_balance: number;
  payment_method_breakdown: {
    ach: number;
    credit_card: number;
    other: number;
  };
}

// Form Types for Payment Components
export interface CreatePaymentInput {
  tenant_id: string;
  lease_id: string;
  amount: number;
  payment_method: Payment['payment_method'];
  payment_date?: string;
  notes?: string;
}

export interface ProcessPaymentInput {
  payment_intent_id: string;
  payment_method_id: string;
  amount: number;
  metadata?: Record<string, string>;
}

export interface SetupAutopayInput {
  tenant_id: string;
  lease_id: string;
  payment_method_id: string;
  amount: number;
  due_day: number;
}

export interface TenantPaymentPortalData {
  tenant: Tenant;
  lease: Lease;
  outstanding_balance: number;
  next_due_date: string;
  payment_methods: PaymentMethodDetails[];
  recent_payments: Payment[];
  autopay_enabled: boolean;
}

// Phase 4: Application, Screening, and eSignature Types
export interface Application {
  id: string;
  property_id: string;
  unit_id: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn';
  applicant_type: 'primary' | 'co_applicant' | 'guarantor';
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;
  
  // Personal Information
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  ssn?: string;
  
  // Address Information
  current_address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    move_in_date?: string;
    rent_amount?: number;
    landlord_name?: string;
    landlord_phone?: string;
  };
  previous_addresses?: Array<{
    street: string;
    city: string;
    state: string;
    zip: string;
    move_in_date: string;
    move_out_date: string;
  }>;
  
  // Employment Information
  employment: {
    employer_name: string;
    job_title: string;
    employment_type: 'full_time' | 'part_time' | 'contract' | 'self_employed' | 'unemployed';
    monthly_income: number;
    start_date: string;
    supervisor_name?: string;
    supervisor_phone?: string;
  };
  additional_income?: Array<{
    source: string;
    monthly_amount: number;
    description?: string;
  }>;
  
  // Emergency Contact
  emergency_contact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  
  // Pets and Additional Info
  pets?: Array<{
    type: string;
    breed?: string;
    weight?: number;
    name: string;
  }>;
  vehicles?: Array<{
    make: string;
    model: string;
    year: number;
    license_plate: string;
    color: string;
  }>;
  
  // Relations
  property?: Property;
  unit?: Unit;
  documents?: ApplicationDocument[];
  screening_results?: TenantScreeningResult[];
  lease_document?: LeaseDocument;
}

export interface ApplicationDocument {
  id: string;
  application_id: string;
  document_type: 'id' | 'income' | 'employment' | 'bank_statement' | 'reference' | 'other';
  file_name: string;
  file_url: string;
  file_size: number;
  upload_date: string;
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
}

export interface TenantScreeningResult {
  id: string;
  application_id: string;
  screening_provider: 'transunion' | 'checkr';
  provider_request_id: string;
  status: 'pending' | 'completed' | 'failed';
  report_types: Array<'credit' | 'criminal' | 'eviction' | 'income'>;
  cost: number;
  created_at: string;
  completed_at?: string;
  
  // Screening Results
  credit_score?: number;
  credit_rating?: 'excellent' | 'good' | 'fair' | 'poor';
  criminal_records?: Array<{
    type: string;
    date: string;
    description: string;
    severity: 'misdemeanor' | 'felony' | 'infraction';
  }>;
  eviction_records?: Array<{
    date: string;
    court: string;
    status: 'filed' | 'judgment' | 'dismissed';
    amount?: number;
  }>;
  income_verification?: {
    verified: boolean;
    monthly_income?: number;
    employment_verified?: boolean;
  };
  
  // Risk Assessment
  overall_risk: 'low' | 'medium' | 'high';
  recommendation: 'approve' | 'approve_with_conditions' | 'reject';
  risk_factors?: string[];
  
  // FCRA Compliance
  adverse_action_required?: boolean;
  adverse_action_sent?: boolean;
  adverse_action_date?: string;
}

export interface LeaseDocument {
  id: string;
  application_id?: string;
  tenant_id?: string;
  lease_id?: string;
  template_id: string;
  document_name: string;
  document_type: 'lease' | 'addendum' | 'amendment' | 'notice';
  
  // eSignature Information
  signature_provider: 'dropbox_sign' | 'docusign';
  signature_request_id?: string;
  status: 'draft' | 'sent_for_signature' | 'partially_signed' | 'fully_signed' | 'declined' | 'expired';
  
  // Document URLs
  unsigned_document_url?: string;
  signed_document_url?: string;
  
  // Signing Information
  signers: Array<{
    name: string;
    email: string;
    role: 'tenant' | 'landlord' | 'guarantor' | 'witness';
    status: 'pending' | 'signed' | 'declined';
    signed_at?: string;
    ip_address?: string;
  }>;
  
  // Dates
  created_at: string;
  sent_at?: string;
  completed_at?: string;
  expires_at?: string;
}

export interface ApplicationReview {
  id: string;
  application_id: string;
  reviewer_id: string;
  reviewer_name: string;
  status: 'approved' | 'rejected' | 'needs_info';
  decision_reason?: string;
  conditions?: string[];
  notes?: string;
  reviewed_at: string;
  
  // Scoring
  credit_score_rating?: number; // 1-10
  income_adequacy_rating?: number; // 1-10
  rental_history_rating?: number; // 1-10
  overall_rating?: number; // 1-10
  
  // Follow-up Actions
  follow_up_required?: boolean;
  follow_up_items?: string[];
  lease_terms?: {
    rent_amount: number;
    security_deposit: number;
    lease_start_date: string;
    lease_end_date: string;
    special_conditions?: string[];
  };
}

// Form Input Types for Phase 4
export interface CreateApplicationInput {
  property_id: string;
  unit_id: string;
  applicant_type: Application['applicant_type'];
  
  // Personal Info
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  
  // Current Address
  current_address: Application['current_address'];
  
  // Employment
  employment: Application['employment'];
  
  // Emergency Contact
  emergency_contact: Application['emergency_contact'];
}

export interface RequestScreeningInput {
  application_id: string;
  report_types: Array<'credit' | 'criminal' | 'eviction' | 'income'>;
  provider?: 'transunion' | 'checkr';
}

export interface CreateLeaseDocumentInput {
  application_id: string;
  template_id: string;
  document_name: string;
  lease_terms: {
    rent_amount: number;
    security_deposit: number;
    lease_start_date: string;
    lease_end_date: string;
    payment_day: number;
  };
  signers: Array<{
    name: string;
    email: string;
    role: LeaseDocument['signers'][0]['role'];
  }>;
}

export interface ApplicationFilters {
  property_id?: string;
  status?: Application['status'];
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface ScreeningFilters {
  application_id?: string;
  status?: TenantScreeningResult['status'];
  risk_level?: TenantScreeningResult['overall_risk'];
  provider?: TenantScreeningResult['screening_provider'];
}