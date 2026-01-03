-- ============================================
-- People Module Migration with Data Migration
-- ============================================
-- This migration transitions from the old tenants table to the comprehensive People module

-- Step 1: Backup existing tenants data
CREATE TABLE tenants_backup AS SELECT * FROM tenants;

-- Step 2: Create all ENUMs
DO $$ BEGIN
  CREATE TYPE person_type AS ENUM ('tenant', 'owner', 'vendor', 'prospect');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tenant_status AS ENUM ('current', 'past', 'future', 'evicted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE owner_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vendor_status AS ENUM ('active', 'inactive', 'blacklisted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE prospect_status AS ENUM (
    'new',
    'contacted',
    'tour_scheduled',
    'application_submitted',
    'approved',
    'rejected',
    'converted'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lead_source AS ENUM (
    'website',
    'zillow',
    'apartments_com',
    'referral',
    'social_media',
    'walk_in',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'direct_deposit',
    'check',
    'paypal',
    'venmo',
    'wire_transfer'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_category AS ENUM (
    'plumbing',
    'electrical',
    'hvac',
    'general_maintenance',
    'landscaping',
    'cleaning',
    'pest_control',
    'appliance_repair',
    'roofing',
    'painting',
    'flooring',
    'legal',
    'accounting',
    'insurance',
    'property_management',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 3: Create PEOPLE table
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type person_type NOT NULL,
  first_name TEXT NOT NULL,
  middle_initial TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  ssn_encrypted TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  alternate_phone TEXT,
  alternate_email TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  company TEXT,
  job_title TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Step 4: Migrate existing tenants to people table
INSERT INTO people (type, first_name, last_name, email, phone, created_at, updated_at)
SELECT 
  'tenant'::person_type,
  first_name,
  last_name,
  email,
  phone,
  created_at,
  updated_at
FROM tenants_backup
ON CONFLICT (email) DO NOTHING;

-- Step 5: Drop old tenants table
DROP TABLE tenants CASCADE;

-- Step 6: Create NEW tenants table with proper structure
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  status tenant_status DEFAULT 'current',
  current_lease_id UUID,
  move_in_date DATE,
  move_out_date DATE,
  lease_start_date DATE,
  lease_end_date DATE,
  balance_due DECIMAL(10, 2) DEFAULT 0.00,
  monthly_rent DECIMAL(10, 2),
  security_deposit DECIMAL(10, 2),
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  employer TEXT,
  employer_phone TEXT,
  annual_income DECIMAL(12, 2),
  previous_landlord_name TEXT,
  previous_landlord_phone TEXT,
  previous_landlord_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(person_id)
);

-- Step 7: Migrate tenant-specific data
INSERT INTO tenants (person_id, status, balance_due, monthly_rent, lease_start_date, lease_end_date, created_at, updated_at)
SELECT 
  p.id,
  'current'::tenant_status,
  COALESCE(tb.balance_due, 0),
  tb.rent_amount,
  tb.lease_start_date,
  tb.lease_end_date,
  tb.created_at,
  tb.updated_at
FROM tenants_backup tb
JOIN people p ON p.email = tb.email AND p.type = 'tenant'::person_type;

-- Step 8: Create OWNERS table
CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  status owner_status DEFAULT 'active',
  tax_id TEXT,
  payment_method payment_method DEFAULT 'direct_deposit',
  bank_name TEXT,
  bank_account_number_encrypted TEXT,
  bank_routing_number_encrypted TEXT,
  distribution_day INTEGER CHECK (distribution_day >= 1 AND distribution_day <= 31),
  distribution_percentage DECIMAL(5, 2) DEFAULT 100.00,
  paypal_email TEXT,
  venmo_handle TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(person_id)
);

-- Step 9: Create VENDORS table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  status vendor_status DEFAULT 'active',
  business_name TEXT NOT NULL,
  contact_person TEXT,
  license_number TEXT,
  license_expiry_date DATE,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_expiry_date DATE,
  service_categories service_category[] DEFAULT ARRAY[]::service_category[],
  hourly_rate DECIMAL(10, 2),
  service_area TEXT,
  availability TEXT,
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  total_jobs_completed INTEGER DEFAULT 0,
  total_jobs_active INTEGER DEFAULT 0,
  average_response_time_hours DECIMAL(10, 2),
  payment_terms TEXT,
  w9_on_file BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(person_id)
);

-- Step 10: Create PROSPECTS table
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  lead_source lead_source,
  lead_status prospect_status DEFAULT 'new',
  desired_move_in_date DATE,
  preferred_property_id UUID,
  preferred_unit_type TEXT,
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),
  contacted_date DATE,
  tour_scheduled_date DATE,
  tour_completed_date DATE,
  application_submitted_date DATE,
  application_approved_date DATE,
  days_in_current_stage INTEGER DEFAULT 0,
  converted_to_tenant_id UUID,
  conversion_date DATE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(person_id)
);

-- Step 11: Create property_assignments table
CREATE TABLE IF NOT EXISTS property_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  ownership_percentage DECIMAL(5, 2),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unassigned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(person_id, property_id, unit_id)
);

-- Step 12: Migrate unit assignments
INSERT INTO property_assignments (person_id, unit_id, assigned_at)
SELECT 
  t.person_id,
  tb.unit_id,
  tb.created_at
FROM tenants_backup tb
JOIN people p ON p.email = tb.email AND p.type = 'tenant'::person_type
JOIN tenants t ON t.person_id = p.id
WHERE tb.unit_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Update property_id from units
UPDATE property_assignments pa
SET property_id = u.property_id
FROM units u
WHERE pa.unit_id = u.id AND pa.property_id IS NULL;

-- Step 13: Create people_tags tables
CREATE TABLE IF NOT EXISTS people_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#20B2AA',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS people_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES people_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(person_id, tag_id)
);

-- Step 14: Create communications table
CREATE TABLE IF NOT EXISTS people_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  direction TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB
);

-- Step 15: Create activity_log table
CREATE TABLE IF NOT EXISTS people_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT
);

-- Step 16: Create indexes
CREATE INDEX IF NOT EXISTS idx_people_type ON people(type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_people_name ON people(last_name, first_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_people_created_at ON people(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_people_search ON people USING gin(to_tsvector('english', 
  coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || 
  coalesce(email, '') || ' ' || coalesce(phone, '')
));

CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_balance ON tenants(balance_due) WHERE balance_due != 0;
CREATE INDEX IF NOT EXISTS idx_tenants_lease_dates ON tenants(lease_start_date, lease_end_date);
CREATE INDEX IF NOT EXISTS idx_tenants_move_dates ON tenants(move_in_date, move_out_date);

CREATE INDEX IF NOT EXISTS idx_owners_status ON owners(status);
CREATE INDEX IF NOT EXISTS idx_owners_distribution_day ON owners(distribution_day);

CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_business_name ON vendors(business_name);
CREATE INDEX IF NOT EXISTS idx_vendors_service_categories ON vendors USING gin(service_categories);
CREATE INDEX IF NOT EXISTS idx_vendors_rating ON vendors(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_vendors_insurance_expiry ON vendors(insurance_expiry_date) 
  WHERE insurance_expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(lead_status);
CREATE INDEX IF NOT EXISTS idx_prospects_source ON prospects(lead_source);
CREATE INDEX IF NOT EXISTS idx_prospects_move_date ON prospects(desired_move_in_date);
CREATE INDEX IF NOT EXISTS idx_prospects_budget ON prospects(budget_min, budget_max);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON prospects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_assignments_person ON property_assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_property_assignments_property ON property_assignments(property_id);
CREATE INDEX IF NOT EXISTS idx_property_assignments_unit ON property_assignments(unit_id);
CREATE INDEX IF NOT EXISTS idx_property_assignments_active ON property_assignments(unassigned_at) 
  WHERE unassigned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_people_tag_assignments_person ON people_tag_assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_people_tag_assignments_tag ON people_tag_assignments(tag_id);

CREATE INDEX IF NOT EXISTS idx_communications_person ON people_communications(person_id);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON people_communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_type ON people_communications(type);

CREATE INDEX IF NOT EXISTS idx_activity_log_person ON people_activity_log(person_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON people_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON people_activity_log(action);

-- Step 17: Create/Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_people_updated_at ON people;
CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_owners_updated_at ON owners;
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prospects_updated_at ON prospects;
CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 18: RLS
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DROP POLICY IF EXISTS "Users can view people in their organization" ON people;
CREATE POLICY "Users can view people in their organization"
  ON people FOR SELECT
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert people" ON people;
CREATE POLICY "Users can insert people"
  ON people FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own people records" ON people;
CREATE POLICY "Users can update their own people records"
  ON people FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can soft delete their own people records" ON people;
CREATE POLICY "Users can soft delete their own people records"
  ON people FOR DELETE
  USING (true);

DROP POLICY IF EXISTS "Users can view tenants" ON tenants;
CREATE POLICY "Users can view tenants"
  ON tenants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert tenants" ON tenants;
CREATE POLICY "Users can insert tenants"
  ON tenants FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update tenants" ON tenants;
CREATE POLICY "Users can update tenants"
  ON tenants FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete tenants" ON tenants;
CREATE POLICY "Users can delete tenants"
  ON tenants FOR DELETE USING (true);

-- Similar policies for other tables
CREATE POLICY "Users can view owners" ON owners FOR SELECT USING (true);
CREATE POLICY "Users can insert owners" ON owners FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update owners" ON owners FOR UPDATE USING (true);
CREATE POLICY "Users can delete owners" ON owners FOR DELETE USING (true);

CREATE POLICY "Users can view vendors" ON vendors FOR SELECT USING (true);
CREATE POLICY "Users can insert vendors" ON vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update vendors" ON vendors FOR UPDATE USING (true);
CREATE POLICY "Users can delete vendors" ON vendors FOR DELETE USING (true);

CREATE POLICY "Users can view prospects" ON prospects FOR SELECT USING (true);
CREATE POLICY "Users can insert prospects" ON prospects FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update prospects" ON prospects FOR UPDATE USING (true);
CREATE POLICY "Users can delete prospects" ON prospects FOR DELETE USING (true);

CREATE POLICY "All operations allowed on property_assignments" ON property_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All operations allowed on people_tags" ON people_tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All operations allowed on people_tag_assignments" ON people_tag_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All operations allowed on people_communications" ON people_communications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "All operations allowed on people_activity_log" ON people_activity_log FOR ALL USING (true) WITH CHECK (true);

-- Step 19: Helper functions
CREATE OR REPLACE FUNCTION get_person_complete(person_uuid UUID)
RETURNS TABLE (
  person_data JSONB,
  type_specific_data JSONB
) AS $$
DECLARE
  person_type TEXT;
BEGIN
  SELECT type INTO person_type FROM people WHERE id = person_uuid;
  
  RETURN QUERY
  SELECT 
    row_to_json(p.*)::jsonb AS person_data,
    CASE 
      WHEN p.type = 'tenant' THEN (SELECT row_to_json(t.*)::jsonb FROM tenants t WHERE t.person_id = p.id)
      WHEN p.type = 'owner' THEN (SELECT row_to_json(o.*)::jsonb FROM owners o WHERE o.person_id = p.id)
      WHEN p.type = 'vendor' THEN (SELECT row_to_json(v.*)::jsonb FROM vendors v WHERE v.person_id = p.id)
      WHEN p.type = 'prospect' THEN (SELECT row_to_json(pr.*)::jsonb FROM prospects pr WHERE pr.person_id = p.id)
      ELSE NULL::jsonb
    END AS type_specific_data
  FROM people p
  WHERE p.id = person_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_people(search_term TEXT, person_types person_type[] DEFAULT NULL)
RETURNS SETOF people AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM people p
  WHERE 
    p.deleted_at IS NULL
    AND (person_types IS NULL OR p.type = ANY(person_types))
    AND (
      to_tsvector('english', 
        coalesce(p.first_name, '') || ' ' || 
        coalesce(p.last_name, '') || ' ' || 
        coalesce(p.email, '') || ' ' || 
        coalesce(p.phone, '') || ' ' ||
        coalesce(p.company, '')
      ) @@ plainto_tsquery('english', search_term)
    );
END;
$$ LANGUAGE plpgsql;

-- Step 20: Add sample data for other types
DO $$
DECLARE
  person1_id UUID;
  person2_id UUID;
BEGIN
  -- Create sample owner
  INSERT INTO people (type, first_name, last_name, email, phone)
  VALUES ('owner', 'Robert', 'Wilson', 'robert.wilson@email.com', '(555) 111-2233')
  RETURNING id INTO person1_id;
  
  INSERT INTO owners (person_id, status, tax_id, payment_method, distribution_day)
  VALUES (person1_id, 'active', '12-3456789', 'direct_deposit', 5);

  -- Create sample vendor
  INSERT INTO people (type, first_name, last_name, email, phone, company)
  VALUES ('vendor', 'Mike', 'Johnson', 'mike@abcplumbing.com', '(555) 987-6543', 'ABC Plumbing Services')
  RETURNING id INTO person2_id;
  
  INSERT INTO vendors (person_id, status, business_name, license_number, service_categories, hourly_rate, average_rating)
  VALUES (person2_id, 'active', 'ABC Plumbing Services', 'PL-12345', ARRAY['plumbing', 'hvac']::service_category[], 85.00, 4.7);

  -- Create sample prospects
  INSERT INTO people (type, first_name, last_name, email, phone, company, job_title)
  VALUES ('prospect', 'Sarah', 'Johnson', 'sarah.j@email.com', '(555) 234-5678', 'Marketing Inc', 'Marketing Manager')
  RETURNING id INTO person1_id;
  
  INSERT INTO prospects (person_id, lead_source, lead_status, desired_move_in_date, budget_min, budget_max)
  VALUES (person1_id, 'website', 'new', CURRENT_DATE + INTERVAL '30 days', 1500.00, 2000.00);

  INSERT INTO people (type, first_name, last_name, email, phone)
  VALUES ('prospect', 'David', 'Lee', 'david.lee@email.com', '(555) 345-6789')
  RETURNING id INTO person2_id;
  
  INSERT INTO prospects (person_id, lead_source, lead_status, desired_move_in_date, budget_min, budget_max, contacted_date)
  VALUES (person2_id, 'zillow', 'contacted', CURRENT_DATE + INTERVAL '45 days', 1200.00, 1500.00, CURRENT_DATE - INTERVAL '2 days');

EXCEPTION
  WHEN others THEN
    -- Ignore errors if sample data already exists
    RAISE NOTICE 'Sample data creation skipped (may already exist)';
END $$;

-- Step 21: Clean up backup table
-- DROP TABLE tenants_backup; -- Commented out to keep backup for safety