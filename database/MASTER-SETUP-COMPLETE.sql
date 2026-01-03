-- ============================================================================
-- PROPMASTER MASTER DATABASE SETUP - COMPLETE
-- ============================================================================
-- This script creates ALL tables in the correct order
-- Execute this ENTIRE file in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: BASE SCHEMA - Core Foundation Tables
-- ============================================================================

-- Properties Table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  type VARCHAR(100),
  subtype VARCHAR(100),
  total_units INTEGER DEFAULT 1,
  occupied_units INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Units Table
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_number VARCHAR(100) NOT NULL,
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  square_feet INTEGER,
  rent_amount DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for base tables
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);

DO $$ BEGIN RAISE NOTICE 'Step 1: Base schema created (properties, units)'; END $$;

-- ============================================================================
-- STEP 2: PEOPLE MANAGEMENT - Unified People Table
-- ============================================================================

-- Main People table (unified contact management)
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('tenant', 'owner', 'vendor', 'prospect')),
  first_name VARCHAR(100) NOT NULL,
  middle_initial VARCHAR(5),
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  company VARCHAR(255),
  job_title VARCHAR(100),
  photo_url TEXT,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenants table (extends people with tenant-specific info)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  balance_due DECIMAL(10,2) DEFAULT 0.00,
  rent_amount DECIMAL(10,2) DEFAULT 0.00,
  lease_start_date DATE,
  lease_end_date DATE,
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- People Owners table
CREATE TABLE IF NOT EXISTS people_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  tax_id VARCHAR(50),
  payment_method VARCHAR(50),
  distribution_day INTEGER DEFAULT 15,
  monthly_distribution DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- People Vendors table
CREATE TABLE IF NOT EXISTS people_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  license_number VARCHAR(100),
  service_categories TEXT[],
  hourly_rate DECIMAL(8,2),
  average_rating DECIMAL(3,2) DEFAULT 0.0,
  total_jobs INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for people tables
CREATE INDEX IF NOT EXISTS idx_people_type ON people(type);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
CREATE INDEX IF NOT EXISTS idx_people_status ON people(status);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_unit_id ON tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);

DO $$ BEGIN RAISE NOTICE 'Step 2: People management tables created'; END $$;

-- ============================================================================
-- STEP 3: LEASES - Core Lease Management
-- ============================================================================

-- Leases Table
CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  lease_number VARCHAR(50) UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent DECIMAL(10,2) NOT NULL,
  security_deposit DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active',
  lease_type VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);

DO $$ BEGIN RAISE NOTICE 'Step 3: Leases table created'; END $$;

-- ============================================================================
-- STEP 4: PHASE 1 TABLES - Additional Core Tables
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

-- PROPERTY OWNERSHIP TABLE
CREATE TABLE IF NOT EXISTS property_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES people(id) ON DELETE CASCADE,
  ownership_percentage DECIMAL(5,2) NOT NULL CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
  start_date DATE NOT NULL,
  end_date DATE,
  distribution_method VARCHAR(50),
  tax_id VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_ownership_property_id ON property_ownership(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_owner_id ON property_ownership(owner_id);

-- WORK ORDERS TABLE
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES people(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES people(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  scheduled_date DATE,
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_property_id ON work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);

-- PAYMENT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS payment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  payment_method VARCHAR(50),
  autopay_enabled BOOLEAN DEFAULT false,
  stripe_payment_method_id VARCHAR(255),
  last_payment_date DATE,
  next_payment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_templates_lease_id ON payment_templates(lease_id);

-- PAYMENT HISTORY TABLE
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  stripe_payment_intent_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_lease_id ON payment_history(lease_id);

-- EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES people(id) ON DELETE SET NULL,
  category VARCHAR(100),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  payment_method VARCHAR(50),
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- LEASE AMENDMENTS TABLE
CREATE TABLE IF NOT EXISTS lease_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  amendment_type VARCHAR(100),
  description TEXT NOT NULL,
  effective_date DATE NOT NULL,
  document_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lease_amendments_lease_id ON lease_amendments(lease_id);

-- RECURRING CHARGES TABLE
CREATE TABLE IF NOT EXISTS recurring_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  charge_type VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  frequency VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE,
  next_charge_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_charges_lease_id ON recurring_charges(lease_id);

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

DO $$ BEGIN RAISE NOTICE 'Step 4: Phase 1 tables created (10 tables)'; END $$;

-- ============================================================================
-- STEP 5: PHASE 2 TABLES - Automation & Workflows
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
  status VARCHAR(50) DEFAULT 'pending',
  tenant_response_date DATE,
  counter_offer_rent DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lease_renewal_offers_lease_id ON lease_renewal_offers(lease_id);

-- MAINTENANCE SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  frequency VARCHAR(50),
  last_completed_date DATE,
  next_due_date DATE,
  estimated_cost DECIMAL(10,2),
  assigned_vendor_id UUID REFERENCES people(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_property_id ON maintenance_schedules(property_id);

-- APPROVAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_table VARCHAR(100) NOT NULL,
  related_id UUID NOT NULL,
  request_type VARCHAR(100),
  amount DECIMAL(10,2),
  description TEXT NOT NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_related ON approval_requests(related_table, related_id);

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

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  type VARCHAR(100),
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

-- AUTOMATED JOBS LOG TABLE
CREATE TABLE IF NOT EXISTS automated_jobs_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(255) NOT NULL,
  job_type VARCHAR(100),
  status VARCHAR(50),
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_automated_jobs_log_job_name ON automated_jobs_log(job_name);

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

DO $$ BEGIN RAISE NOTICE 'Step 5: Phase 2 automation tables created (7 tables)'; END $$;

-- ============================================================================
-- STEP 6: PHASE 3 TABLES - Tenant Portal
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
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT false;
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_last_login TIMESTAMP WITH TIME ZONE;
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_onboarding_completed BOOLEAN DEFAULT false;
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": false}';
  ALTER TABLE tenants ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Tenant portal columns already exist';
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_portal_access ON tenants(portal_access) WHERE portal_access = true;

DO $$ BEGIN RAISE NOTICE 'Step 6: Phase 3 tenant portal tables created (3 tables)'; END $$;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE tenant_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists first, then create)
DROP POLICY IF EXISTS tenant_portal_sessions_policy ON tenant_portal_sessions;
CREATE POLICY tenant_portal_sessions_policy ON tenant_portal_sessions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS tenant_emergency_contacts_policy ON tenant_emergency_contacts;
CREATE POLICY tenant_emergency_contacts_policy ON tenant_emergency_contacts
  FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS tenant_vehicles_policy ON tenant_vehicles;
CREATE POLICY tenant_vehicles_policy ON tenant_vehicles
  FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid()));

DO $$ BEGIN RAISE NOTICE 'Step 7: RLS policies enabled'; END $$;

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
    'properties', 'units', 'people', 'tenants', 'leases',
    'bank_accounts', 'property_ownership', 'work_orders', 'payment_templates',
    'payment_history', 'expenses', 'audit_logs', 'lease_amendments',
    'recurring_charges', 'comments', 'lease_renewal_offers', 'maintenance_schedules',
    'approval_requests', 'approval_thresholds', 'notifications',
    'automated_jobs_log', 'vendor_performance_metrics',
    'tenant_portal_sessions', 'tenant_emergency_contacts', 'tenant_vehicles'
  );

  RAISE NOTICE '====================================================';
  RAISE NOTICE 'PropMaster Master Database Setup Complete!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Tables created: % out of 25', table_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Foundation: 5 tables (properties, units, people, tenants, leases)';
  RAISE NOTICE 'Phase 1: 10 core tables';
  RAISE NOTICE 'Phase 2: 7 automation tables';
  RAISE NOTICE 'Phase 3: 3 tenant portal tables';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Next step: Run verification script';
  RAISE NOTICE 'Command: node scripts/verify-database.mjs';
  RAISE NOTICE '====================================================';
END $$;

COMMIT;
