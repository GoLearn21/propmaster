// Transaction Management Types for Property Module

// Transaction Type Classifications
export type TransactionType = 
  // Tenant Transactions
  | 'post_charge'
  | 'receive_payment'
  | 'issue_credit'
  | 'give_refund'
  | 'withhold_deposit'
  // Vendor Transactions
  | 'create_bill'
  | 'pay_bills'
  | 'add_credit'
  | 'management_fees'
  // Owner Transactions
  | 'owner_contribution'
  | 'owner_distribution'
  // Other Transactions
  | 'journal_entry'
  | 'bank_transfer'
  | 'bank_deposit'
  | 'expense'
  | 'check';

export type TransactionStatus = 'draft' | 'pending' | 'approved' | 'cleared' | 'void' | 'cancelled';

export type PaymentMethod = 
  | 'cash'
  | 'check'
  | 'credit_card'
  | 'debit_card'
  | 'ach'
  | 'bank_transfer'
  | 'online'
  | 'money_order'
  | 'credit'
  | 'adjustment';

// Transaction Category
export type TransactionCategory = 
  | 'rental_income'
  | 'late_fees'
  | 'pet_fees'
  | 'parking_fees'
  | 'utilities'
  | 'maintenance'
  | 'repairs'
  | 'improvements'
  | 'insurance'
  | 'taxes'
  | 'management_fees'
  | 'utilities_bills'
  | 'vendor_payments'
  | 'owner_distribution'
  | 'owner_contribution'
  | 'bank_charges'
  | 'other_income'
  | 'other_expense';

// Core Transaction Interface
export interface Transaction {
  id: string;
  organization_id: string;
  property_id?: string;
  unit_id?: string;
  lease_id?: string;
  
  // Transaction Details
  transaction_type: TransactionType;
  status: TransactionStatus;
  category: TransactionCategory;
  amount: number;
  currency: string;
  
  // Date Information
  transaction_date: string;
  due_date?: string;
  paid_date?: string;
  
  // Payment Information
  payment_method?: PaymentMethod;
  check_number?: string;
  bank_account_id?: string;
  
  // Parties Involved
  tenant_id?: string;
  vendor_id?: string;
  owner_id?: string;
  
  // Description and Reference
  description: string;
  reference_number?: string;
  memo?: string;
  
  // Accounting
  gl_account?: string;
  tax_amount?: number;
  
  // Audit Trail
  created_by: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  
  // Reconciliation
  bank_reconciled: boolean;
  bank_reconciliation_date?: string;
  
  // Attachments
  attachments?: string[];
  
  // Related Records
  parent_transaction_id?: string; // For partial payments, refunds, etc.
  
  // Metadata
  metadata?: Record<string, any>;
}

// Create Transaction Input
export interface CreateTransactionInput {
  property_id?: string;
  unit_id?: string;
  lease_id?: string;
  transaction_type: TransactionType;
  category: TransactionCategory;
  amount: number;
  transaction_date: string;
  due_date?: string;
  payment_method?: PaymentMethod;
  check_number?: string;
  bank_account_id?: string;
  tenant_id?: string;
  vendor_id?: string;
  owner_id?: string;
  description: string;
  reference_number?: string;
  memo?: string;
  gl_account?: string;
  tax_amount?: number;
  attachments?: string[];
  metadata?: Record<string, any>;
}

// Update Transaction Input
export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  id: string;
  status?: TransactionStatus;
  paid_date?: string;
  approved_by?: string;
  approved_at?: string;
  bank_reconciled?: boolean;
  bank_reconciliation_date?: string;
}

// Transaction Filters
export interface TransactionFilters {
  property_id?: string;
  unit_id?: string;
  lease_id?: string;
  tenant_id?: string;
  vendor_id?: string;
  owner_id?: string;
  transaction_type?: TransactionType;
  category?: TransactionCategory;
  status?: TransactionStatus;
  payment_method?: PaymentMethod;
  start_date?: string;
  end_date?: string;
  amount_min?: number;
  amount_max?: number;
  bank_account_id?: string;
  search?: string;
  unreconciled_only?: boolean;
}

// Transaction Statistics
export interface TransactionStats {
  total_transactions: number;
  total_amount: number;
  pending_transactions: number;
  pending_amount: number;
  approved_transactions: number;
  approved_amount: number;
  overdue_transactions: number;
  overdue_amount: number;
  unreconciled_transactions: number;
  unreconciled_amount: number;
  income_transactions: number;
  income_amount: number;
  expense_transactions: number;
  expense_amount: number;
  net_amount: number;
}

// Transaction Summary for Reporting
export interface TransactionSummary {
  income_by_category: Record<TransactionCategory, number>;
  expense_by_category: Record<TransactionCategory, number>;
  monthly_totals: Record<string, { income: number; expense: number; net: number }>;
  payment_method_breakdown: Record<PaymentMethod, number>;
  transaction_type_summary: Record<TransactionType, { count: number; total: number }>;
}

// Transaction Wizard Step Types
export interface TransactionWizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

// Bank Account Interface (extended from property types)
export interface BankAccount {
  id: string;
  organization_id: string;
  nickname: string;
  bank_name: string;
  account_type: 'checking' | 'savings' | 'money_market' | 'credit_line';
  account_number: string;
  routing_number: string;
  balance?: number;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Transaction Import/Export Types
export interface TransactionImportRecord {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category?: string;
  bank_account_id?: string;
  matched?: boolean;
  transaction_id?: string;
}

export interface TransactionBatch {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_transactions: number;
  processed_transactions: number;
  failed_transactions: number;
  created_at: string;
  completed_at?: string;
  created_by: string;
}

// Bank Reconciliation Types
export interface BankReconciliation {
  id: string;
  organization_id: string;
  bank_account_id: string;
  statement_date: string;
  statement_balance: number;
  book_balance: number;
  reconciled_balance: number;
  difference: number;
  status: 'pending' | 'completed' | 'disputed';
  created_by: string;
  created_at: string;
  completed_at?: string;
  notes?: string;
}

export interface ReconciliationTransaction {
  transaction_id: string;
  amount: number;
  date: string;
  description: string;
  matched: boolean;
  matched_by?: string;
  matched_at?: string;
  discrepancy_type?: 'amount' | 'date' | 'missing' | 'extra';
}

// Transaction Templates for Recurring Transactions
export interface TransactionTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  transaction_type: TransactionType;
  category: TransactionCategory;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_date: string;
  is_active: boolean;
  property_id?: string;
  unit_id?: string;
  tenant_id?: string;
  vendor_id?: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

// Constants
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  // Tenant Transactions
  post_charge: 'Post Charge',
  receive_payment: 'Receive Payment',
  issue_credit: 'Issue Credit',
  give_refund: 'Give Refund',
  withhold_deposit: 'Withhold Deposit',
  
  // Vendor Transactions
  create_bill: 'Create Bill',
  pay_bills: 'Pay Bills',
  add_credit: 'Add Credit',
  management_fees: 'Management Fees',
  
  // Owner Transactions
  owner_contribution: 'Owner Contribution',
  owner_distribution: 'Owner Distribution',
  
  // Other Transactions
  journal_entry: 'Journal Entry',
  bank_transfer: 'Bank Transfer',
  bank_deposit: 'Bank Deposit',
  expense: 'Expense',
  check: 'Check',
};

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  rental_income: 'Rental Income',
  late_fees: 'Late Fees',
  pet_fees: 'Pet Fees',
  parking_fees: 'Parking Fees',
  utilities: 'Utilities',
  maintenance: 'Maintenance',
  repairs: 'Repairs',
  improvements: 'Improvements',
  insurance: 'Insurance',
  taxes: 'Property Taxes',
  management_fees: 'Management Fees',
  utilities_bills: 'Utilities Bills',
  vendor_payments: 'Vendor Payments',
  owner_distribution: 'Owner Distribution',
  owner_contribution: 'Owner Contribution',
  bank_charges: 'Bank Charges',
  other_income: 'Other Income',
  other_expense: 'Other Expense',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  ach: 'ACH Transfer',
  bank_transfer: 'Bank Transfer',
  online: 'Online Payment',
  money_order: 'Money Order',
  credit: 'Credit',
  adjustment: 'Adjustment',
};

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  cleared: 'Cleared',
  void: 'Void',
  cancelled: 'Cancelled',
};

// Transaction Action Types
export type TransactionAction = 
  | 'view'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'void'
  | 'clear'
  | 'export'
  | 'reconcile'
  | 'duplicate'
  | 'refund'
  | 'partial_payment';

// Service Response Types
export interface TransactionServiceResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}