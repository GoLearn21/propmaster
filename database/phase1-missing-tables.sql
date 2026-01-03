-- Phase 1: Critical Missing Tables for PropMaster
-- Execute this SQL in Supabase SQL Editor to create missing tables

-- ============================================================================
-- BANK ACCOUNTS TABLE
-- Stores bank account information for properties (for direct deposit, autopay)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('checking', 'savings')),
  routing_number VARCHAR(9) NOT NULL,
  account_number_last4 VARCHAR(4) NOT NULL, -- Store only last 4 digits for security
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick property lookup
CREATE INDEX IF NOT EXISTS idx_bank_accounts_property_id ON bank_accounts(property_id);

-- Ensure only one primary account per property
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_primary
  ON bank_accounts(property_id)
  WHERE is_primary = true;

-- ============================================================================
-- PROPERTY OWNERSHIP TABLE
-- Tracks ownership relationships and distribution percentages
-- ============================================================================
CREATE TABLE IF NOT EXISTS property_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES people(id) ON DELETE CASCADE,
  ownership_percentage DECIMAL(5,2) NOT NULL CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
  start_date DATE NOT NULL,
  end_date DATE,
  distribution_method VARCHAR(50) CHECK (distribution_method IN ('direct_deposit', 'check', 'wire', 'ach')),
  tax_id VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, owner_id, start_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_ownership_property_id ON property_ownership(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_owner_id ON property_ownership(owner_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_active ON property_ownership(property_id)
  WHERE end_date IS NULL;

-- ============================================================================
-- WORK ORDERS TABLE (COMPLETE VERSION)
-- Comprehensive work order tracking with vendor assignment and costs
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES people(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) CHECK (category IN (
    'plumbing', 'electrical', 'hvac', 'appliances', 'carpentry',
    'painting', 'flooring', 'roofing', 'landscaping', 'cleaning', 'other'
  )),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'
  )),
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  started_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  tenant_id UUID REFERENCES people(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES people(id),
  assigned_to UUID REFERENCES people(id),
  photos JSONB DEFAULT '[]'::jsonb, -- Array of photo URLs
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for work orders
CREATE INDEX IF NOT EXISTS idx_work_orders_property_id ON work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_unit_id ON work_orders(unit_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vendor_id ON work_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_category ON work_orders(category);

-- ============================================================================
-- PAYMENT TEMPLATES TABLE
-- For autopay and recurring payment scheduling
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  payment_method_id VARCHAR(255), -- Stripe payment method ID or similar
  payment_method_type VARCHAR(50) CHECK (payment_method_type IN ('card', 'ach', 'bank_account')),
  amount DECIMAL(10,2) NOT NULL,
  frequency VARCHAR(50) DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  last_processed_date DATE,
  next_due_date DATE,
  auto_process BOOLEAN DEFAULT true, -- Auto-charge on due date
  send_reminder BOOLEAN DEFAULT true, -- Send reminder before charging
  reminder_days INTEGER DEFAULT 3, -- Days before due date to send reminder
  retry_on_failure BOOLEAN DEFAULT true,
  max_retry_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for payment templates
CREATE INDEX IF NOT EXISTS idx_payment_templates_tenant_id ON payment_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_templates_lease_id ON payment_templates(lease_id);
CREATE INDEX IF NOT EXISTS idx_payment_templates_active ON payment_templates(is_active)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_payment_templates_next_due ON payment_templates(next_due_date)
  WHERE is_active = true;

-- ============================================================================
-- AUDIT LOGS TABLE
-- Comprehensive audit trail for compliance and security
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- May reference auth.users but kept flexible
  user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  changes JSONB, -- Store before/after values
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(255), -- For tracing related actions
  severity VARCHAR(50) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

-- ============================================================================
-- LEASE AMENDMENTS TABLE
-- Track changes to active leases
-- ============================================================================
CREATE TABLE IF NOT EXISTS lease_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  amendment_number INTEGER NOT NULL, -- Sequential number per lease
  amendment_type VARCHAR(100) NOT NULL CHECK (amendment_type IN (
    'rent_increase', 'rent_decrease', 'term_extension', 'term_reduction',
    'add_tenant', 'remove_tenant', 'pet_addendum', 'parking_change', 'other'
  )),
  effective_date DATE NOT NULL,
  description TEXT,
  changes JSONB NOT NULL, -- Structured changes (e.g., {"rent": {"old": 1500, "new": 1600}})
  signed_document_url TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'signed', 'active', 'expired', 'cancelled')),
  created_by UUID REFERENCES people(id),
  signed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lease_id, amendment_number)
);

-- Indexes for lease amendments
CREATE INDEX IF NOT EXISTS idx_lease_amendments_lease_id ON lease_amendments(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_amendments_status ON lease_amendments(status);
CREATE INDEX IF NOT EXISTS idx_lease_amendments_effective_date ON lease_amendments(effective_date);

-- ============================================================================
-- PAYMENT HISTORY TABLE (Enhanced)
-- Track all payment attempts, successes, failures for better reconciliation
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  payment_template_id UUID REFERENCES payment_templates(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN ('card', 'ach', 'cash', 'check', 'wire', 'other')),
  payment_method_id VARCHAR(255), -- Stripe payment method ID
  transaction_id VARCHAR(255), -- External payment processor transaction ID
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),
  failure_reason TEXT,
  payment_date DATE,
  due_date DATE,
  late_fee DECIMAL(10,2) DEFAULT 0,
  processed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  metadata JSONB, -- Additional payment metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for payment history
CREATE INDEX IF NOT EXISTS idx_payment_history_tenant_id ON payment_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_lease_id ON payment_history(lease_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON payment_history(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_due_date ON payment_history(due_date);

-- ============================================================================
-- EXPENSES TABLE
-- Track property-related expenses for accurate P&L reporting
-- ============================================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  category VARCHAR(100) NOT NULL CHECK (category IN (
    'maintenance', 'repairs', 'utilities', 'insurance', 'property_tax',
    'hoa_fees', 'mortgage', 'management_fees', 'advertising', 'legal',
    'accounting', 'cleaning', 'landscaping', 'supplies', 'other'
  )),
  vendor_id UUID REFERENCES people(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  expense_date DATE NOT NULL,
  payment_method VARCHAR(50),
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  is_tax_deductible BOOLEAN DEFAULT true,
  tax_category VARCHAR(100), -- For tax reporting
  paid BOOLEAN DEFAULT false,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for expenses
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_paid ON expenses(paid);

-- ============================================================================
-- RECURRING CHARGES TABLE
-- For scheduled charges (rent, utilities, fees, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS recurring_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  charge_type VARCHAR(100) NOT NULL CHECK (charge_type IN (
    'rent', 'late_fee', 'pet_rent', 'parking', 'utilities', 'storage', 'other'
  )),
  amount DECIMAL(10,2) NOT NULL,
  frequency VARCHAR(50) DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'annual')),
  start_date DATE NOT NULL,
  end_date DATE,
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for recurring charges
CREATE INDEX IF NOT EXISTS idx_recurring_charges_tenant_id ON recurring_charges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recurring_charges_lease_id ON recurring_charges(lease_id);
CREATE INDEX IF NOT EXISTS idx_recurring_charges_active ON recurring_charges(is_active)
  WHERE is_active = true;

-- ============================================================================
-- COMMENTS TABLE
-- Universal comments/notes system for any entity
-- ============================================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100) NOT NULL, -- 'property', 'unit', 'tenant', 'work_order', etc.
  entity_id UUID NOT NULL,
  user_id UUID REFERENCES people(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true, -- Internal vs visible to tenant/owner
  mentions JSONB DEFAULT '[]'::jsonb, -- Array of mentioned user IDs
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of file URLs
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For threaded comments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Sample bank account
INSERT INTO bank_accounts (property_id, account_name, bank_name, account_type, routing_number, account_number_last4, is_primary)
SELECT
  id,
  'Property Operating Account',
  'Chase Bank',
  'checking',
  '021000021',
  '1234',
  true
FROM properties
LIMIT 1
ON CONFLICT DO NOTHING;

-- Sample expense categories (for reference)
COMMENT ON COLUMN expenses.category IS 'maintenance|repairs|utilities|insurance|property_tax|hoa_fees|mortgage|management_fees|advertising|legal|accounting|cleaning|landscaping|supplies|other';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Phase 1 database tables created successfully!';
  RAISE NOTICE 'Created tables: bank_accounts, property_ownership, work_orders, payment_templates, audit_logs, lease_amendments, payment_history, expenses, recurring_charges, comments';
END $$;
