-- ============================================================================
-- PROPMASTER COMPLETE DATABASE SCHEMA SETUP
-- ============================================================================
-- This file combines all Phase 1, 2, and 3 schemas for complete deployment
-- Execute this entire file in Supabase SQL Editor to set up the database
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: CRITICAL MISSING TABLES FOR PROPMASTER
-- ============================================================================

-- BANK ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('checking', 'savings')),
  routing_number VARCHAR(9) NOT NULL,
  account_number_last4 VARCHAR(4) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_property_id ON bank_accounts(property_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_primary
  ON bank_accounts(property_id)
  WHERE is_primary = true;

COMMENT ON TABLE bank_accounts IS 'Bank account information for properties (for direct deposit, autopay)';

-- PROPERTY OWNERSHIP TABLE
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

CREATE INDEX IF NOT EXISTS idx_property_ownership_property_id ON property_ownership(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_owner_id ON property_ownership(owner_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_active ON property_ownership(end_date) WHERE end_date IS NULL;

COMMENT ON TABLE property_ownership IS 'Tracks ownership relationships and distribution percentages';

-- WORK ORDERS TABLE (may already exist, using IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES people(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES people(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) CHECK (category IN (
    'plumbing', 'electrical', 'hvac', 'appliances', 'carpentry',
    'painting', 'flooring', 'roofing', 'landscaping', 'cleaning', 'other'
  )),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN (
    'open', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold'
  )),
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  scheduled_date DATE,
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_property_id ON work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_vendor_id ON work_orders(vendor_id);

-- PAYMENT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS payment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  payment_method VARCHAR(50) CHECK (payment_method IN ('credit_card', 'ach', 'bank_transfer', 'check', 'cash')),
  autopay_enabled BOOLEAN DEFAULT false,
  stripe_payment_method_id VARCHAR(255),
  last_payment_date DATE,
  next_payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_templates_lease_id ON payment_templates(lease_id);
CREATE INDEX IF NOT EXISTS idx_payment_templates_tenant_id ON payment_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_templates_autopay ON payment_templates(autopay_enabled) WHERE autopay_enabled = true;

-- PAYMENT HISTORY TABLE
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN ('credit_card', 'ach', 'bank_transfer', 'check', 'cash')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_lease_id ON payment_history(lease_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_tenant_id ON payment_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_date ON payment_history(payment_date DESC);

-- EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES people(id) ON DELETE SET NULL,
  category VARCHAR(100) CHECK (category IN (
    'maintenance', 'repairs', 'utilities', 'insurance', 'taxes',
    'management_fees', 'marketing', 'legal', 'capital_improvement', 'other'
  )),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  payment_method VARCHAR(50) CHECK (payment_method IN ('credit_card', 'ach', 'bank_transfer', 'check', 'cash')),
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- LEASE AMENDMENTS TABLE
CREATE TABLE IF NOT EXISTS lease_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  amendment_type VARCHAR(100) CHECK (amendment_type IN (
    'rent_change', 'term_extension', 'tenant_change', 'pet_policy', 'parking', 'other'
  )),
  description TEXT NOT NULL,
  effective_date DATE NOT NULL,
  document_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lease_amendments_lease_id ON lease_amendments(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_amendments_effective_date ON lease_amendments(effective_date DESC);

-- RECURRING CHARGES TABLE
CREATE TABLE IF NOT EXISTS recurring_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  charge_type VARCHAR(100) CHECK (charge_type IN (
    'rent', 'pet_rent', 'parking', 'storage', 'utility', 'late_fee', 'other'
  )),
  amount DECIMAL(10,2) NOT NULL,
  frequency VARCHAR(50) CHECK (frequency IN ('monthly', 'quarterly', 'annually', 'one_time')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_charge_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_charges_lease_id ON recurring_charges(lease_id);
CREATE INDEX IF NOT EXISTS idx_recurring_charges_active ON recurring_charges(is_active) WHERE is_active = true;

-- COMMENTS TABLE
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_table VARCHAR(100) NOT NULL,
  related_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_related ON comments(related_table, related_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

DO $$ BEGIN RAISE NOTICE 'Phase 1: Created 10 tables successfully'; END $$;

-- ============================================================================
-- PHASE 2: AUTOMATION & WORKFLOWS TABLES
-- ============================================================================

-- LEASE RENEWAL OFFERS TABLE
CREATE TABLE IF NOT EXISTS lease_renewal_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  current_rent DECIMAL(10,2) NOT NULL,
  proposed_rent DECIMAL(10,2) NOT NULL,
  rent_increase_percentage DECIMAL(5,2) NOT NULL,
  current_end_date DATE NOT NULL,
  proposed_start_date DATE NOT NULL,
  proposed_end_date DATE NOT NULL,
  offer_sent_date DATE NOT NULL,
  offer_expiration_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'countered')),
  tenant_response_date DATE,
  counter_offer_rent DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lease_renewal_offers_lease_id ON lease_renewal_offers(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_renewal_offers_status ON lease_renewal_offers(status);

-- MAINTENANCE SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) CHECK (category IN (
    'plumbing', 'electrical', 'hvac', 'appliances', 'carpentry',
    'painting', 'flooring', 'roofing', 'landscaping', 'cleaning', 'other'
  )),
  frequency VARCHAR(50) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual')),
  last_completed_date DATE,
  next_due_date DATE,
  estimated_cost DECIMAL(10,2),
  assigned_vendor_id UUID REFERENCES people(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_property_id ON maintenance_schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due ON maintenance_schedules(next_due_date) WHERE is_active = true;

-- APPROVAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_table VARCHAR(100) NOT NULL,
  related_id UUID NOT NULL,
  request_type VARCHAR(100) CHECK (request_type IN ('expense', 'work_order', 'lease', 'vendor', 'other')),
  amount DECIMAL(10,2),
  description TEXT NOT NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_related ON approval_requests(related_table, related_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);

-- APPROVAL THRESHOLDS TABLE
CREATE TABLE IF NOT EXISTS approval_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  threshold_amount DECIMAL(10,2) NOT NULL,
  auto_approve_below DECIMAL(10,2) DEFAULT 0,
  requires_multiple_approvers BOOLEAN DEFAULT false,
  approver_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_thresholds_property_id ON approval_thresholds(property_id);

-- Insert default thresholds
INSERT INTO approval_thresholds (property_id, category, threshold_amount, auto_approve_below, requires_multiple_approvers, approver_count)
VALUES
  (NULL, 'maintenance', 500, 200, false, 1),
  (NULL, 'repairs', 1000, 300, false, 1),
  (NULL, 'capital_improvement', 2000, 0, true, 2),
  (NULL, 'emergency', 5000, 500, false, 1)
ON CONFLICT DO NOTHING;

-- NOTIFICATIONS TABLE (may already exist)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  type VARCHAR(100) CHECK (type IN (
    'payment_reminder', 'payment_received', 'maintenance_update',
    'lease_renewal', 'lease_expiring', 'system', 'other'
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  related_table VARCHAR(100),
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read) WHERE is_read = false;

-- AUTOMATED JOBS LOG TABLE
CREATE TABLE IF NOT EXISTS automated_jobs_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(255) NOT NULL,
  job_type VARCHAR(100) CHECK (job_type IN (
    'autopay_processing', 'lease_renewal', 'maintenance_schedule',
    'work_order_routing', 'approval_expiration', 'other'
  )),
  status VARCHAR(50) CHECK (status IN ('running', 'completed', 'failed')),
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_automated_jobs_log_job_name ON automated_jobs_log(job_name);
CREATE INDEX IF NOT EXISTS idx_automated_jobs_log_started_at ON automated_jobs_log(started_at DESC);

-- VENDOR PERFORMANCE METRICS TABLE
CREATE TABLE IF NOT EXISTS vendor_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES people(id) ON DELETE CASCADE,
  total_jobs_completed INTEGER DEFAULT 0,
  total_jobs_cancelled INTEGER DEFAULT 0,
  avg_completion_time_hours DECIMAL(10,2),
  avg_rating DECIMAL(3,2),
  total_revenue DECIMAL(10,2) DEFAULT 0,
  on_time_percentage DECIMAL(5,2),
  last_job_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_performance_vendor_id ON vendor_performance_metrics(vendor_id);

DO $$ BEGIN RAISE NOTICE 'Phase 2: Created 7 automation tables successfully'; END $$;

-- ============================================================================
-- PHASE 3: TENANT PORTAL TABLES
-- ============================================================================

-- TENANT PORTAL SESSIONS TABLE
CREATE TABLE IF NOT EXISTS tenant_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_time TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_sessions_tenant ON tenant_portal_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_user ON tenant_portal_sessions(user_id);

-- TENANT EMERGENCY CONTACTS TABLE
CREATE TABLE IF NOT EXISTS tenant_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_tenant ON tenant_emergency_contacts(tenant_id);

-- TENANT VEHICLES TABLE
CREATE TABLE IF NOT EXISTS tenant_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  color VARCHAR(50),
  license_plate VARCHAR(20),
  state VARCHAR(2),
  parking_spot VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON tenant_vehicles(tenant_id);

-- ENHANCE TENANTS TABLE FOR PORTAL ACCESS
DO $$
BEGIN
  -- Add portal-specific columns to tenants table
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT false;
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_last_login TIMESTAMP WITH TIME ZONE;
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_onboarding_completed BOOLEAN DEFAULT false;
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": false}';
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

  RAISE NOTICE 'Phase 3: Enhanced tenants table with portal columns';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Phase 3: Tenant portal columns already exist';
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_portal_access ON tenants(portal_access) WHERE portal_access = true;

DO $$ BEGIN RAISE NOTICE 'Phase 3: Created 3 tenant portal tables successfully'; END $$;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE tenant_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant portal
CREATE POLICY tenant_portal_sessions_policy ON tenant_portal_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY tenant_emergency_contacts_policy ON tenant_emergency_contacts
  FOR ALL USING (tenant_id IN (
    SELECT id FROM tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY tenant_vehicles_policy ON tenant_vehicles
  FOR ALL USING (tenant_id IN (
    SELECT id FROM tenants WHERE user_id = auth.uid()
  ));

DO $$ BEGIN RAISE NOTICE 'RLS policies created for tenant portal tables'; END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'bank_accounts', 'property_ownership', 'work_orders', 'payment_templates',
    'payment_history', 'expenses', 'audit_logs', 'lease_amendments',
    'recurring_charges', 'comments', 'lease_renewal_offers', 'maintenance_schedules',
    'approval_requests', 'approval_thresholds', 'notifications',
    'automated_jobs_log', 'vendor_performance_metrics',
    'tenant_portal_sessions', 'tenant_emergency_contacts', 'tenant_vehicles'
  );

  RAISE NOTICE '====================================================';
  RAISE NOTICE 'PropMaster Database Setup Complete!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Tables created: % out of 20', table_count;
  RAISE NOTICE 'Phase 1: 10 core tables';
  RAISE NOTICE 'Phase 2: 7 automation tables';
  RAISE NOTICE 'Phase 3: 3 tenant portal tables';
  RAISE NOTICE '====================================================';
END $$;

COMMIT;
