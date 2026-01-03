-- People Management Database Schema
-- Core tables for managing tenants, owners, vendors, and prospects

-- 1. Main People table (unified contact management)
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

-- 2. Tenants table (extends people with tenant-specific info)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  balance_due DECIMAL(10,2) DEFAULT 0.00,
  rent_amount DECIMAL(10,2) DEFAULT 0.00,
  lease_start_date DATE,
  lease_end_date DATE,
  property_id UUID,
  unit_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. People Owners table (extends people with owner-specific info)
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

-- 4. People Vendors table (extends people with vendor-specific info)
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

-- 5. People Prospects table (extends people with prospect-specific info)
CREATE TABLE IF NOT EXISTS people_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  lead_source VARCHAR(50) CHECK (lead_source IN ('website', 'zillow', 'apartments_com', 'referral', 'social_media', 'walk_in', 'other')),
  lead_status VARCHAR(50) DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'tour_scheduled', 'application_submitted', 'approved', 'rejected', 'converted')),
  desired_move_in_date DATE,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_people_type ON people(type);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
CREATE INDEX IF NOT EXISTS idx_people_status ON people(status);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_people_prospects_status ON people_prospects(lead_status);
CREATE INDEX IF NOT EXISTS idx_people_prospects_source ON people_prospects(lead_source);

-- Insert sample data for testing
INSERT INTO people (id, type, first_name, last_name, email, phone, status) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'tenant', 'John', 'Doe', 'john.doe@email.com', '(555) 123-4567', 'active'),
  ('550e8400-e29b-41d4-a716-446655440002', 'tenant', 'Jane', 'Smith', 'jane.smith@email.com', '(555) 234-5678', 'active'),
  ('550e8400-e29b-41d4-a716-446655440003', 'owner', 'Robert', 'Johnson', 'robert.johnson@realestate.com', '(555) 345-6789', 'active'),
  ('550e8400-e29b-41d4-a716-446655440004', 'vendor', 'ABC', 'Maintenance', 'contact@abcmaintenance.com', '(555) 456-7890', 'active'),
  ('550e8400-e29b-41d4-a716-446655440005', 'prospect', 'Sarah', 'Wilson', 'sarah.wilson@email.com', '(555) 567-8901', 'new')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenants (id, person_id, email, balance_due, rent_amount, lease_start_date, lease_end_date) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'john.doe@email.com', 1500.00, 2500.00, '2024-01-01', '2024-12-31'),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'jane.smith@email.com', 0.00, 2000.00, '2024-02-01', '2025-01-31')
ON CONFLICT (id) DO NOTHING;

INSERT INTO people_owners (id, person_id, tax_id, distribution_day, monthly_distribution) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'TAX123456789', 15, 5000.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO people_vendors (id, person_id, business_name, average_rating, total_jobs) VALUES
  ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'ABC Maintenance Co.', 4.5, 25)
ON CONFLICT (id) DO NOTHING;

INSERT INTO people_prospects (id, person_id, lead_source, lead_status, desired_move_in_date, budget_min, budget_max) VALUES
  ('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440005', 'website', 'contacted', '2024-12-01', 1800.00, 2800.00)
ON CONFLICT (id) DO NOTHING;