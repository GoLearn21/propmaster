-- ============================================
-- People Module - Comprehensive Database Schema
-- ============================================
-- This schema supports Tenants, Owners, Vendors, and Prospects
-- with proper relationships, indexes, and Row Level Security

-- ============================================
-- 1. ENUMS
-- ============================================

-- Person types
CREATE TYPE person_type AS ENUM ('tenant', 'owner', 'vendor', 'prospect');

-- Tenant status
CREATE TYPE tenant_status AS ENUM ('current', 'past', 'future', 'evicted');

-- Owner status
CREATE TYPE owner_status AS ENUM ('active', 'inactive');

-- Vendor status
CREATE TYPE vendor_status AS ENUM ('active', 'inactive', 'blacklisted');

-- Prospect status (lead pipeline)
CREATE TYPE prospect_status AS ENUM (
  'new',
  'contacted',
  'tour_scheduled',
  'application_submitted',
  'approved',
  'rejected',
  'converted'
);

-- Lead sources
CREATE TYPE lead_source AS ENUM (
  'website',
  'zillow',
  'apartments_com',
  'referral',
  'social_media',
  'walk_in',
  'other'
);

-- Payment methods for owners
CREATE TYPE payment_method AS ENUM (
  'direct_deposit',
  'check',
  'paypal',
  'venmo',
  'wire_transfer'
);

-- Service categories for vendors
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

-- ============================================
-- 2. CORE PEOPLE TABLE
-- ============================================

CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type discriminator
  type person_type NOT NULL,
  
  -- Personal Information
  first_name TEXT NOT NULL,
  middle_initial TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  ssn_encrypted TEXT, -- Encrypted in application layer or use Supabase Vault
  
  -- Contact Information
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  alternate_phone TEXT,
  alternate_email TEXT,
  
  -- Address
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  
  -- Professional Information
  company TEXT,
  job_title TEXT,
  
  -- Profile
  photo_url TEXT,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX idx_people_type ON people(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_people_email ON people(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_people_name ON people(last_name, first_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_people_created_at ON people(created_at DESC);

-- Full-text search index
CREATE INDEX idx_people_search ON people USING gin(to_tsvector('english', 
  coalesce(first_name, '') || ' ' || 
  coalesce(last_name, '') || ' ' || 
  coalesce(email, '') || ' ' || 
  coalesce(phone, '')
));

-- ============================================
-- 3. TENANTS TABLE
-- ============================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  
  -- Status
  status tenant_status DEFAULT 'current',
  
  -- Lease Information
  current_lease_id UUID, -- Will be FK to leases table
  move_in_date DATE,
  move_out_date DATE,
  lease_start_date DATE,
  lease_end_date DATE,
  
  -- Financial
  balance_due DECIMAL(10, 2) DEFAULT 0.00,
  monthly_rent DECIMAL(10, 2),
  security_deposit DECIMAL(10, 2),
  
  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  
  -- Employment Information
  employer TEXT,
  employer_phone TEXT,
  annual_income DECIMAL(12, 2),
  
  -- Previous Landlord (References)
  previous_landlord_name TEXT,
  previous_landlord_phone TEXT,
  previous_landlord_address TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(person_id)
);

-- Indexes
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_balance ON tenants(balance_due) WHERE balance_due != 0;
CREATE INDEX idx_tenants_lease_dates ON tenants(lease_start_date, lease_end_date);
CREATE INDEX idx_tenants_move_dates ON tenants(move_in_date, move_out_date);

-- ============================================
-- 4. OWNERS TABLE
-- ============================================

CREATE TABLE owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  
  -- Status
  status owner_status DEFAULT 'active',
  
  -- Financial Information
  tax_id TEXT,
  payment_method payment_method DEFAULT 'direct_deposit',
  
  -- Bank Information (encrypted)
  bank_name TEXT,
  bank_account_number_encrypted TEXT,
  bank_routing_number_encrypted TEXT,
  
  -- Distribution Settings
  distribution_day INTEGER CHECK (distribution_day >= 1 AND distribution_day <= 31),
  distribution_percentage DECIMAL(5, 2) DEFAULT 100.00, -- Default 100% if sole owner
  
  -- PayPal/Venmo Info
  paypal_email TEXT,
  venmo_handle TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(person_id)
);

-- Indexes
CREATE INDEX idx_owners_status ON owners(status);
CREATE INDEX idx_owners_distribution_day ON owners(distribution_day);

-- ============================================
-- 5. VENDORS TABLE
-- ============================================

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  
  -- Status
  status vendor_status DEFAULT 'active',
  
  -- Business Information
  business_name TEXT NOT NULL,
  contact_person TEXT,
  
  -- License and Insurance
  license_number TEXT,
  license_expiry_date DATE,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_expiry_date DATE,
  
  -- Service Details
  service_categories service_category[] DEFAULT ARRAY[]::service_category[],
  hourly_rate DECIMAL(10, 2),
  service_area TEXT,
  availability TEXT,
  
  -- Performance Metrics
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  total_jobs_completed INTEGER DEFAULT 0,
  total_jobs_active INTEGER DEFAULT 0,
  average_response_time_hours DECIMAL(10, 2),
  
  -- Payment Terms
  payment_terms TEXT,
  w9_on_file BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(person_id)
);

-- Indexes
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_business_name ON vendors(business_name);
CREATE INDEX idx_vendors_service_categories ON vendors USING gin(service_categories);
CREATE INDEX idx_vendors_rating ON vendors(average_rating DESC);
CREATE INDEX idx_vendors_insurance_expiry ON vendors(insurance_expiry_date) 
  WHERE insurance_expiry_date IS NOT NULL;

-- ============================================
-- 6. PROSPECTS TABLE
-- ============================================

CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  
  -- Lead Information
  lead_source lead_source,
  lead_status prospect_status DEFAULT 'new',
  
  -- Preferences
  desired_move_in_date DATE,
  preferred_property_id UUID, -- FK to properties table
  preferred_unit_type TEXT, -- e.g., "1BR", "2BR", "Studio"
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),
  
  -- Pipeline Tracking
  contacted_date DATE,
  tour_scheduled_date DATE,
  tour_completed_date DATE,
  application_submitted_date DATE,
  application_approved_date DATE,
  
  -- Days in each stage (calculated)
  days_in_current_stage INTEGER DEFAULT 0,
  
  -- Conversion
  converted_to_tenant_id UUID, -- FK to tenants table
  conversion_date DATE,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(person_id)
);

-- Indexes
CREATE INDEX idx_prospects_status ON prospects(lead_status);
CREATE INDEX idx_prospects_source ON prospects(lead_source);
CREATE INDEX idx_prospects_move_date ON prospects(desired_move_in_date);
CREATE INDEX idx_prospects_budget ON prospects(budget_min, budget_max);
CREATE INDEX idx_prospects_created_at ON prospects(created_at DESC);

-- ============================================
-- 7. PROPERTY ASSIGNMENTS TABLE
-- ============================================
-- Links people (especially owners and tenants) to properties and units

CREATE TABLE property_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  
  -- Ownership details (for owners)
  ownership_percentage DECIMAL(5, 2),
  
  -- Assignment dates
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unassigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(person_id, property_id, unit_id)
);

-- Indexes
CREATE INDEX idx_property_assignments_person ON property_assignments(person_id);
CREATE INDEX idx_property_assignments_property ON property_assignments(property_id);
CREATE INDEX idx_property_assignments_unit ON property_assignments(unit_id);
CREATE INDEX idx_property_assignments_active ON property_assignments(unassigned_at) 
  WHERE unassigned_at IS NULL;

-- ============================================
-- 8. PEOPLE TAGS TABLE
-- ============================================
-- Custom tagging system for flexible categorization

CREATE TABLE people_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#20B2AA', -- Default teal
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE people_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES people_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  
  UNIQUE(person_id, tag_id)
);

-- Indexes
CREATE INDEX idx_people_tag_assignments_person ON people_tag_assignments(person_id);
CREATE INDEX idx_people_tag_assignments_tag ON people_tag_assignments(tag_id);

-- ============================================
-- 9. COMMUNICATION LOG TABLE
-- ============================================
-- Track all communications with people

CREATE TABLE people_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  
  -- Communication details
  type TEXT NOT NULL, -- 'email', 'phone', 'sms', 'in_person', 'portal_message'
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  subject TEXT,
  body TEXT,
  
  -- Status
  status TEXT, -- 'sent', 'delivered', 'read', 'failed'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Additional data (JSON for flexibility)
  metadata JSONB
);

-- Indexes
CREATE INDEX idx_communications_person ON people_communications(person_id);
CREATE INDEX idx_communications_created_at ON people_communications(created_at DESC);
CREATE INDEX idx_communications_type ON people_communications(type);

-- ============================================
-- 10. PEOPLE ACTIVITY LOG (Audit Trail)
-- ============================================

CREATE TABLE people_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  
  -- Activity details
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'status_changed', etc.
  entity_type TEXT, -- 'person', 'tenant', 'owner', 'vendor', 'prospect'
  changes JSONB, -- Store before/after values
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT
);

-- Indexes
CREATE INDEX idx_activity_log_person ON people_activity_log(person_id);
CREATE INDEX idx_activity_log_created_at ON people_activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action ON people_activity_log(action);

-- ============================================
-- 11. TRIGGERS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate days in current stage for prospects
CREATE OR REPLACE FUNCTION calculate_prospect_days_in_stage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_status != OLD.lead_status THEN
    NEW.days_in_current_stage = 0;
  ELSE
    NEW.days_in_current_stage = EXTRACT(DAY FROM (NOW() - NEW.updated_at));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_prospect_stage_days BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION calculate_prospect_days_in_stage();

-- Log changes to people_activity_log
CREATE OR REPLACE FUNCTION log_people_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO people_activity_log (person_id, action, entity_type, changes, created_by)
    VALUES (NEW.id, 'created', 'person', row_to_json(NEW)::jsonb, NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO people_activity_log (person_id, action, entity_type, changes, created_by)
    VALUES (
      NEW.id, 
      'updated', 
      'person', 
      jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW)),
      NEW.updated_by
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO people_activity_log (person_id, action, entity_type, changes, created_by)
    VALUES (OLD.id, 'deleted', 'person', row_to_json(OLD)::jsonb, OLD.deleted_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_people_activity AFTER INSERT OR UPDATE OR DELETE ON people
  FOR EACH ROW EXECUTE FUNCTION log_people_changes();

-- ============================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
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

-- RLS Policies for people table
CREATE POLICY "Users can view people in their organization"
  ON people FOR SELECT
  USING (auth.uid() = created_by OR deleted_at IS NULL);

CREATE POLICY "Users can insert people"
  ON people FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own people records"
  ON people FOR UPDATE
  USING (auth.uid() = created_by OR auth.uid() = updated_by);

CREATE POLICY "Users can soft delete their own people records"
  ON people FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for tenants
CREATE POLICY "Users can view tenants"
  ON tenants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM people 
    WHERE people.id = tenants.person_id 
    AND people.deleted_at IS NULL
  ));

CREATE POLICY "Users can insert tenants"
  ON tenants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update tenants"
  ON tenants FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete tenants"
  ON tenants FOR DELETE
  USING (true);

-- RLS Policies for owners (same pattern)
CREATE POLICY "Users can view owners"
  ON owners FOR SELECT USING (true);

CREATE POLICY "Users can insert owners"
  ON owners FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update owners"
  ON owners FOR UPDATE USING (true);

CREATE POLICY "Users can delete owners"
  ON owners FOR DELETE USING (true);

-- RLS Policies for vendors (same pattern)
CREATE POLICY "Users can view vendors"
  ON vendors FOR SELECT USING (true);

CREATE POLICY "Users can insert vendors"
  ON vendors FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update vendors"
  ON vendors FOR UPDATE USING (true);

CREATE POLICY "Users can delete vendors"
  ON vendors FOR DELETE USING (true);

-- RLS Policies for prospects (same pattern)
CREATE POLICY "Users can view prospects"
  ON prospects FOR SELECT USING (true);

CREATE POLICY "Users can insert prospects"
  ON prospects FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update prospects"
  ON prospects FOR UPDATE USING (true);

CREATE POLICY "Users can delete prospects"
  ON prospects FOR DELETE USING (true);

-- RLS Policies for other tables (allowing all operations for now)
CREATE POLICY "All operations allowed on property_assignments"
  ON property_assignments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "All operations allowed on people_tags"
  ON people_tags FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "All operations allowed on people_tag_assignments"
  ON people_tag_assignments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "All operations allowed on people_communications"
  ON people_communications FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "All operations allowed on people_activity_log"
  ON people_activity_log FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 13. SEED DATA
-- ============================================

-- Sample tenants
DO $$
DECLARE
  person1_id UUID;
  person2_id UUID;
  person3_id UUID;
  person4_id UUID;
  person5_id UUID;
  property1_id UUID;
  unit1_id UUID;
BEGIN
  -- Get existing property and unit IDs (assuming they exist from previous migrations)
  SELECT id INTO property1_id FROM properties LIMIT 1;
  SELECT id INTO unit1_id FROM units LIMIT 1;

  -- Create tenant 1
  INSERT INTO people (type, first_name, last_name, email, phone, company, job_title)
  VALUES ('tenant', 'Ashleigh', 'Adams-Johnson', 'ashleigh.adams@email.com', '(208) 250-9362', 'Tech Corp', 'Engineer')
  RETURNING id INTO person1_id;
  
  INSERT INTO tenants (person_id, status, balance_due, monthly_rent, move_in_date, lease_start_date, lease_end_date)
  VALUES (person1_id, 'current', 0, 1500.00, '2024-01-01', '2024-01-01', '2024-12-31');
  
  IF property1_id IS NOT NULL AND unit1_id IS NOT NULL THEN
    INSERT INTO property_assignments (person_id, property_id, unit_id)
    VALUES (person1_id, property1_id, unit1_id);
  END IF;

  -- Create tenant 2
  INSERT INTO people (type, first_name, middle_initial, last_name, email, phone)
  VALUES ('tenant', 'Allen', 'M', 'Blackmon', 'allen.blackmon@email.com', '(208) 123-4567')
  RETURNING id INTO person2_id;
  
  INSERT INTO tenants (person_id, status, balance_due, monthly_rent, move_in_date, lease_start_date, lease_end_date)
  VALUES (person2_id, 'current', 1500.00, 1800.00, '2023-06-01', '2023-06-01', '2024-05-31');

  -- Create tenant 3
  INSERT INTO people (type, first_name, last_name, email, phone)
  VALUES ('tenant', 'Amazon', 'Jeff Bezos', 'amazon@email.com', '(208) 987-6543')
  RETURNING id INTO person3_id;
  
  INSERT INTO tenants (person_id, status, balance_due, monthly_rent, move_in_date, lease_start_date, lease_end_date)
  VALUES (person3_id, 'current', 2000.00, 2000.00, '2023-03-15', '2023-03-15', '2025-03-14');

  -- Create tenant 4
  INSERT INTO people (type, first_name, last_name, email, phone)
  VALUES ('tenant', 'Barb', 'Moore', 'barb.moore@email.com', '(208) 111-2222')
  RETURNING id INTO person4_id;
  
  INSERT INTO tenants (person_id, status, balance_due, monthly_rent, move_in_date, lease_start_date, lease_end_date)
  VALUES (person4_id, 'current', 0, 1600.00, '2024-02-01', '2024-02-01', '2025-01-31');

  -- Create tenant 5
  INSERT INTO people (type, first_name, last_name, email, phone)
  VALUES ('tenant', 'Brooklyn', 'Holloway-Vincent Walker', 'brooklyn@email.com', '(208) 333-4444')
  RETURNING id INTO person5_id;
  
  INSERT INTO tenants (person_id, status, balance_due, monthly_rent, move_in_date, lease_start_date, lease_end_date)
  VALUES (person5_id, 'current', 0, 1750.00, '2023-09-01', '2023-09-01', '2024-08-31');

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
  RETURNING id INTO person3_id;
  
  INSERT INTO prospects (person_id, lead_source, lead_status, desired_move_in_date, budget_min, budget_max)
  VALUES (person3_id, 'website', 'new', CURRENT_DATE + INTERVAL '30 days', 1500.00, 2000.00);

  INSERT INTO people (type, first_name, last_name, email, phone)
  VALUES ('prospect', 'David', 'Lee', 'david.lee@email.com', '(555) 345-6789')
  RETURNING id INTO person4_id;
  
  INSERT INTO prospects (person_id, lead_source, lead_status, desired_move_in_date, budget_min, budget_max, contacted_date)
  VALUES (person4_id, 'zillow', 'contacted', CURRENT_DATE + INTERVAL '45 days', 1200.00, 1500.00, CURRENT_DATE - INTERVAL '2 days');

END $$;

-- ============================================
-- 14. HELPER FUNCTIONS
-- ============================================

-- Function to get all people with their specific type data
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

-- Function to search people across all fields
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

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMENT ON TABLE people IS 'Base table for all person types: tenants, owners, vendors, prospects';
COMMENT ON TABLE tenants IS 'Tenant-specific information and lease details';
COMMENT ON TABLE owners IS 'Property owner information and financial settings';
COMMENT ON TABLE vendors IS 'Service vendor information and performance metrics';
COMMENT ON TABLE prospects IS 'Lead tracking and conversion pipeline';
COMMENT ON TABLE property_assignments IS 'Links people to properties and units';
COMMENT ON TABLE people_tags IS 'Custom tagging system for flexible categorization';
COMMENT ON TABLE people_communications IS 'Communication log for all interactions';
COMMENT ON TABLE people_activity_log IS 'Audit trail of all changes to people records';
