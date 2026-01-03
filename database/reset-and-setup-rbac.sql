-- ============================================
-- RESET AND SETUP RBAC TABLES
-- ============================================
-- This will drop existing vendors/owners tables
-- and recreate them with the correct schema
-- for the RBAC implementation
-- ============================================

-- WARNING: This will delete all data in vendors and owners tables
-- Make sure you backup any important data first!

BEGIN;

-- ============================================
-- STEP 1: DROP EXISTING TABLES
-- ============================================

-- Drop policies first (if they exist)
DROP POLICY IF EXISTS "Vendors can view own profile" ON vendors;
DROP POLICY IF EXISTS "Vendors can update own profile" ON vendors;
DROP POLICY IF EXISTS "Property managers can view all vendors" ON vendors;
DROP POLICY IF EXISTS "Property managers can manage vendors" ON vendors;
DROP POLICY IF EXISTS "Vendors can view assigned work orders" ON work_orders;
DROP POLICY IF EXISTS "Vendors can update assigned work orders" ON work_orders;

DROP POLICY IF EXISTS "Owners can view own profile" ON owners;
DROP POLICY IF EXISTS "Owners can update own profile" ON owners;
DROP POLICY IF EXISTS "Property managers can view all owners" ON owners;
DROP POLICY IF EXISTS "Property managers can manage owners" ON owners;

-- Drop tables
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS owners CASCADE;

RAISE NOTICE '✅ Old tables dropped successfully';

COMMIT;

-- ============================================
-- STEP 2: CREATE NEW TABLES WITH CORRECT SCHEMA
-- ============================================
-- Now copy and paste the ENTIRE contents of:
-- database/rbac-tables.sql
--
-- OR continue with the inline version below:
-- ============================================

BEGIN;

-- ============================================
-- VENDORS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'vendor' CHECK (role = 'vendor'),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  profile_image_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

  -- Vendor-specific fields
  company_name VARCHAR(255) NOT NULL,
  business_license VARCHAR(100),
  insurance_policy_number VARCHAR(100),
  insurance_expiry_date DATE,
  specialty VARCHAR(50) NOT NULL CHECK (specialty IN ('plumbing', 'electrical', 'hvac', 'general', 'landscaping', 'cleaning', 'other')),
  service_areas UUID[] DEFAULT '{}',
  hourly_rate DECIMAL(10, 2),
  rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  completed_jobs_count INTEGER DEFAULT 0,
  active_jobs_count INTEGER DEFAULT 0,
  portal_access BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT vendors_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes for vendors
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_specialty ON vendors(specialty);
CREATE INDEX IF NOT EXISTS idx_vendors_rating ON vendors(rating);

-- ============================================
-- OWNERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'owner' CHECK (role = 'owner'),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  profile_image_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

  -- Owner-specific fields
  total_units INTEGER DEFAULT 0,
  portfolio_value DECIMAL(15, 2),
  preferred_contact_method VARCHAR(20) DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'sms')),
  portal_access BOOLEAN DEFAULT true,
  financial_reporting_preference VARCHAR(20) DEFAULT 'monthly' CHECK (financial_reporting_preference IN ('monthly', 'quarterly', 'annual')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT owners_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes for owners
CREATE INDEX IF NOT EXISTS idx_owners_user_id ON owners(user_id);
CREATE INDEX IF NOT EXISTS idx_owners_email ON owners(email);
CREATE INDEX IF NOT EXISTS idx_owners_status ON owners(status);

-- ============================================
-- UPDATE WORK_ORDERS TABLE
-- ============================================

-- Add vendor_id column to work_orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
    CREATE INDEX idx_work_orders_vendor_id ON work_orders(vendor_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'vendor_notes'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN vendor_notes TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'completion_photos'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN completion_photos TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on vendors table
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Vendors can view and update their own profile
CREATE POLICY "Vendors can view own profile"
  ON vendors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors can update own profile"
  ON vendors FOR UPDATE
  USING (auth.uid() = user_id);

-- Property managers can view all vendors
CREATE POLICY "Property managers can view all vendors"
  ON vendors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE user_id = auth.uid()
    )
  );

-- Property managers can insert/update/delete vendors
CREATE POLICY "Property managers can manage vendors"
  ON vendors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE user_id = auth.uid()
    )
  );

-- Enable RLS on owners table
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;

-- Owners can view and update their own profile
CREATE POLICY "Owners can view own profile"
  ON owners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can update own profile"
  ON owners FOR UPDATE
  USING (auth.uid() = user_id);

-- Property managers can view all owners
CREATE POLICY "Property managers can view all owners"
  ON owners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE user_id = auth.uid()
    )
  );

-- Property managers can insert/update/delete owners
CREATE POLICY "Property managers can manage owners"
  ON owners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- WORK ORDERS RLS for Vendors
-- ============================================

-- Vendors can only view work orders assigned to them
CREATE POLICY "Vendors can view assigned work orders"
  ON work_orders FOR SELECT
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

-- Vendors can update status and notes on their assigned work orders
CREATE POLICY "Vendors can update assigned work orders"
  ON work_orders FOR UPDATE
  USING (
    vendor_id IN (
      SELECT id FROM vendors WHERE user_id = auth.uid()
    )
  );

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ RBAC tables created successfully!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - vendors (with correct schema)';
  RAISE NOTICE '  - owners (with correct schema)';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS policies enabled:';
  RAISE NOTICE '  - Vendors can only see their own data';
  RAISE NOTICE '  - Owners can only see their own data';
  RAISE NOTICE '  - Property managers can manage all';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run: database/create-test-accounts-final.sql';
  RAISE NOTICE '2. Test login at /vendor/login and /owner/login';
  RAISE NOTICE '============================================';
END $$;
