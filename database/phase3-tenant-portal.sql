-- =====================================================
-- Phase 3: Tenant Portal Database Schema
-- =====================================================
-- Self-service tenant portal with authentication,
-- payments, maintenance requests, and lease management
-- =====================================================

-- Drop existing tables if they exist (for development only)
-- Comment out these lines for production deployment
-- DROP TABLE IF EXISTS tenant_vehicles CASCADE;
-- DROP TABLE IF EXISTS tenant_emergency_contacts CASCADE;
-- DROP TABLE IF EXISTS tenant_portal_sessions CASCADE;

-- =====================================================
-- 1. TENANT PORTAL SESSIONS
-- =====================================================
-- Tracks tenant login sessions for audit and security

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

-- Indexes for session queries
CREATE INDEX IF NOT EXISTS idx_portal_sessions_tenant ON tenant_portal_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_user ON tenant_portal_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_login_time ON tenant_portal_sessions(login_time DESC);

COMMENT ON TABLE tenant_portal_sessions IS 'Tenant portal login sessions for audit and security tracking';
COMMENT ON COLUMN tenant_portal_sessions.session_duration_minutes IS 'Duration of session in minutes, calculated on logout';

-- =====================================================
-- 2. TENANT EMERGENCY CONTACTS
-- =====================================================
-- Emergency contact information for tenants

CREATE TABLE IF NOT EXISTS tenant_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Validation constraints
  CONSTRAINT valid_phone CHECK (phone ~ '^[0-9+\-\(\) ]+$'),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes for emergency contact queries
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_tenant ON tenant_emergency_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_primary ON tenant_emergency_contacts(tenant_id, is_primary) WHERE is_primary = true;

COMMENT ON TABLE tenant_emergency_contacts IS 'Emergency contact information for tenants';
COMMENT ON COLUMN tenant_emergency_contacts.is_primary IS 'Primary emergency contact (first to be called)';

-- =====================================================
-- 3. TENANT VEHICLES
-- =====================================================
-- Tenant vehicle information for parking management

CREATE TABLE IF NOT EXISTS tenant_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  color VARCHAR(50),
  license_plate VARCHAR(20) NOT NULL,
  state VARCHAR(2),
  parking_spot VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Validation constraints
  CONSTRAINT valid_year CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 2),
  CONSTRAINT valid_license_plate CHECK (license_plate ~ '^[A-Z0-9\-]+$')
);

-- Indexes for vehicle queries
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON tenant_vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_license ON tenant_vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_parking_spot ON tenant_vehicles(parking_spot) WHERE parking_spot IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON tenant_vehicles(tenant_id, is_active) WHERE is_active = true;

COMMENT ON TABLE tenant_vehicles IS 'Tenant vehicle information for parking management';
COMMENT ON COLUMN tenant_vehicles.is_active IS 'Vehicle is currently in use (tenant may have multiple vehicles)';

-- =====================================================
-- 4. TENANT TABLE MODIFICATIONS
-- =====================================================
-- Add portal-specific columns to existing tenants table

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'user_id') THEN
    ALTER TABLE tenants ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'portal_access') THEN
    ALTER TABLE tenants ADD COLUMN portal_access BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'portal_last_login') THEN
    ALTER TABLE tenants ADD COLUMN portal_last_login TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'portal_onboarding_completed') THEN
    ALTER TABLE tenants ADD COLUMN portal_onboarding_completed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'communication_preferences') THEN
    ALTER TABLE tenants ADD COLUMN communication_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": false, "payment_reminders": true, "maintenance_updates": true, "lease_notifications": true}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'profile_photo_url') THEN
    ALTER TABLE tenants ADD COLUMN profile_photo_url TEXT;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_portal_access ON tenants(portal_access) WHERE portal_access = true;
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email) WHERE email IS NOT NULL;

COMMENT ON COLUMN tenants.user_id IS 'Supabase auth user ID for tenant portal access';
COMMENT ON COLUMN tenants.portal_access IS 'Tenant has been granted portal access';
COMMENT ON COLUMN tenants.portal_last_login IS 'Last time tenant logged into portal';
COMMENT ON COLUMN tenants.portal_onboarding_completed IS 'Tenant completed portal onboarding wizard';
COMMENT ON COLUMN tenants.communication_preferences IS 'JSON object with email, sms, push notification preferences';

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Ensure tenants can only access their own data

-- Enable RLS on tenant portal tables
ALTER TABLE tenant_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_vehicles ENABLE ROW LEVEL SECURITY;

-- Tenant portal sessions policies
CREATE POLICY tenant_sessions_select ON tenant_portal_sessions
  FOR SELECT USING (
    user_id = auth.uid() OR
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

CREATE POLICY tenant_sessions_insert ON tenant_portal_sessions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

-- Emergency contacts policies
CREATE POLICY tenant_emergency_select ON tenant_emergency_contacts
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

CREATE POLICY tenant_emergency_insert ON tenant_emergency_contacts
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

CREATE POLICY tenant_emergency_update ON tenant_emergency_contacts
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

CREATE POLICY tenant_emergency_delete ON tenant_emergency_contacts
  FOR DELETE USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

-- Vehicles policies
CREATE POLICY tenant_vehicles_select ON tenant_vehicles
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

CREATE POLICY tenant_vehicles_insert ON tenant_vehicles
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

CREATE POLICY tenant_vehicles_update ON tenant_vehicles
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

CREATE POLICY tenant_vehicles_delete ON tenant_vehicles
  FOR DELETE USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

-- =====================================================
-- 6. DATABASE FUNCTIONS
-- =====================================================

-- Function to calculate session duration on logout
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.logout_time IS NOT NULL AND OLD.logout_time IS NULL THEN
    NEW.session_duration_minutes := EXTRACT(EPOCH FROM (NEW.logout_time - NEW.login_time)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session duration
DROP TRIGGER IF EXISTS update_session_duration ON tenant_portal_sessions;
CREATE TRIGGER update_session_duration
  BEFORE UPDATE ON tenant_portal_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_duration();

-- Function to enforce only one primary emergency contact per tenant
CREATE OR REPLACE FUNCTION enforce_single_primary_contact()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE tenant_emergency_contacts
    SET is_primary = false
    WHERE tenant_id = NEW.tenant_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single primary contact
DROP TRIGGER IF EXISTS enforce_primary_contact ON tenant_emergency_contacts;
CREATE TRIGGER enforce_primary_contact
  BEFORE INSERT OR UPDATE ON tenant_emergency_contacts
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION enforce_single_primary_contact();

-- Function to update tenant's last login timestamp
CREATE OR REPLACE FUNCTION update_tenant_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tenants
  SET portal_last_login = NEW.login_time
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last login
DROP TRIGGER IF EXISTS update_last_login ON tenant_portal_sessions;
CREATE TRIGGER update_last_login
  AFTER INSERT ON tenant_portal_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_last_login();

-- =====================================================
-- 7. SAMPLE DATA (Development Only)
-- =====================================================
-- Uncomment to insert sample data for testing

-- Sample tenant with portal access
-- INSERT INTO tenants (first_name, last_name, email, phone, portal_access, status)
-- VALUES
--   ('John', 'Doe', 'john.doe@example.com', '555-0100', true, 'active'),
--   ('Jane', 'Smith', 'jane.smith@example.com', '555-0101', true, 'active');

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================
-- Run these to verify schema was created correctly

-- Verify Phase 3 tables exist
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'tenant_portal_sessions',
    'tenant_emergency_contacts',
    'tenant_vehicles'
  );

  IF table_count = 3 THEN
    RAISE NOTICE 'Phase 3 database tables created successfully!';
    RAISE NOTICE 'Created tables: tenant_portal_sessions, tenant_emergency_contacts, tenant_vehicles';
    RAISE NOTICE 'Total new tables: 3';
  ELSE
    RAISE WARNING 'Expected 3 tables but found %', table_count;
  END IF;
END $$;

-- Verify tenant table modifications
DO $$
DECLARE
  column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'tenants'
  AND column_name IN (
    'user_id',
    'portal_access',
    'portal_last_login',
    'portal_onboarding_completed',
    'communication_preferences',
    'profile_photo_url'
  );

  IF column_count = 6 THEN
    RAISE NOTICE 'Tenant table modifications completed successfully!';
    RAISE NOTICE 'Added columns: user_id, portal_access, portal_last_login, portal_onboarding_completed, communication_preferences, profile_photo_url';
  ELSE
    RAISE WARNING 'Expected 6 new columns but found %', column_count;
  END IF;
END $$;

-- Count indexes created
SELECT
  schemaname,
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'tenant_portal_sessions',
  'tenant_emergency_contacts',
  'tenant_vehicles',
  'tenants'
)
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Verify RLS is enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'tenant_portal_sessions',
  'tenant_emergency_contacts',
  'tenant_vehicles'
)
ORDER BY tablename;

-- =====================================================
-- END OF PHASE 3 DATABASE SCHEMA
-- =====================================================

RAISE NOTICE '==============================================';
RAISE NOTICE 'Phase 3: Tenant Portal Schema Completed';
RAISE NOTICE '==============================================';
RAISE NOTICE 'Tables Created: 3';
RAISE NOTICE '  - tenant_portal_sessions';
RAISE NOTICE '  - tenant_emergency_contacts';
RAISE NOTICE '  - tenant_vehicles';
RAISE NOTICE '';
RAISE NOTICE 'Tenant Table Enhanced: 6 new columns';
RAISE NOTICE 'Row Level Security: Enabled on all tables';
RAISE NOTICE 'Database Functions: 3 triggers created';
RAISE NOTICE '==============================================';
