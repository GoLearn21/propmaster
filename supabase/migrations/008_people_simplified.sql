-- People Module - Simplified Migration
DO $$ BEGIN CREATE TYPE person_type AS ENUM ('tenant', 'owner', 'vendor', 'prospect'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tenant_status AS ENUM ('current', 'past', 'future', 'evicted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE owner_status AS ENUM ('active', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE vendor_status AS ENUM ('active', 'inactive', 'blacklisted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE prospect_status AS ENUM ('new', 'contacted', 'tour_scheduled', 'application_submitted', 'approved', 'rejected', 'converted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE lead_source AS ENUM ('website', 'zillow', 'apartments_com', 'referral', 'social_media', 'walk_in', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('direct_deposit', 'check', 'paypal', 'venmo', 'wire_transfer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE service_category AS ENUM ('plumbing', 'electrical', 'hvac', 'general_maintenance', 'landscaping', 'cleaning', 'pest_control', 'appliance_repair', 'roofing', 'painting', 'flooring', 'legal', 'accounting', 'insurance', 'property_management', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type person_type NOT NULL,
  first_name TEXT NOT NULL,
  middle_initial TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS people_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE UNIQUE,
  status owner_status DEFAULT 'active',
  tax_id TEXT,
  payment_method payment_method DEFAULT 'direct_deposit',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS people_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE UNIQUE,
  status vendor_status DEFAULT 'active',
  business_name TEXT NOT NULL,
  service_categories service_category[] DEFAULT ARRAY[]::service_category[],
  hourly_rate DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS people_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE UNIQUE,
  lead_source lead_source,
  lead_status prospect_status DEFAULT 'new',
  desired_move_in_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_people_type ON people(type);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);

ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on people" ON people;
CREATE POLICY "Allow all operations on people" ON people FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations on people_owners" ON people_owners;
CREATE POLICY "Allow all operations on people_owners" ON people_owners FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations on people_vendors" ON people_vendors;
CREATE POLICY "Allow all operations on people_vendors" ON people_vendors FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all operations on people_prospects" ON people_prospects;
CREATE POLICY "Allow all operations on people_prospects" ON people_prospects FOR ALL USING (true) WITH CHECK (true);

INSERT INTO people (type, first_name, last_name, email, phone) 
SELECT 'tenant'::person_type, first_name, last_name, email, phone FROM tenants ON CONFLICT (email) DO NOTHING;

DO $$
DECLARE p_id UUID;
BEGIN
  INSERT INTO people (type, first_name, last_name, email, phone) VALUES ('owner', 'Robert', 'Wilson', 'robert.wilson@propmaster.io', '(555) 111-2233') ON CONFLICT DO NOTHING RETURNING id INTO p_id;
  IF p_id IS NOT NULL THEN INSERT INTO people_owners (person_id) VALUES (p_id) ON CONFLICT DO NOTHING; END IF;
  
  INSERT INTO people (type, first_name, last_name, email, phone) VALUES ('vendor', 'Mike', 'Johnson', 'mike@abcplumbing.io', '(555) 987-6543') ON CONFLICT DO NOTHING RETURNING id INTO p_id;
  IF p_id IS NOT NULL THEN INSERT INTO people_vendors (person_id, business_name) VALUES (p_id, 'ABC Plumbing') ON CONFLICT DO NOTHING; END IF;
  
  INSERT INTO people (type, first_name, last_name, email, phone) VALUES ('prospect', 'Sarah', 'Johnson', 'sarah.j@prospect.io', '(555) 234-5678') ON CONFLICT DO NOTHING RETURNING id INTO p_id;
  IF p_id IS NOT NULL THEN INSERT INTO people_prospects (person_id, lead_source, lead_status) VALUES (p_id, 'website', 'new') ON CONFLICT DO NOTHING; END IF;
END $$;
