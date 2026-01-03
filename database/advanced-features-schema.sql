-- Advanced Features Database Schema
-- Creates tables for: Leads, Background Checks, Document Signing, Market Intelligence, Predictive Maintenance

-- =====================================================
-- 1. LEADS CRM & SALES PIPELINE
-- =====================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  source VARCHAR(50) NOT NULL CHECK (source IN ('website', 'referral', 'zillow', 'apartments.com', 'walk-in', 'social')),
  status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'touring', 'application', 'converted', 'lost')),
  score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  property_interest UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_interest UUID REFERENCES units(id) ON DELETE SET NULL,
  budget DECIMAL(10,2),
  move_in_date DATE,
  last_contact_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leads_organization ON leads(organization_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(score);

-- =====================================================
-- 2. BACKGROUND CHECKS & TENANT SCREENING
-- =====================================================

CREATE TABLE IF NOT EXISTS background_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  applicant_name VARCHAR(255) NOT NULL,
  applicant_email VARCHAR(255) NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'flagged')),
  credit_score INTEGER CHECK (credit_score >= 300 AND credit_score <= 850),
  criminal_record VARCHAR(50) CHECK (criminal_record IN ('clear', 'minor', 'major', 'pending')),
  eviction_history VARCHAR(50) CHECK (eviction_history IN ('none', 'resolved', 'active', 'pending')),
  employment_verified BOOLEAN,
  income_verified BOOLEAN,
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_date DATE,
  cost DECIMAL(10,2) DEFAULT 45.00,
  recommendation VARCHAR(50) CHECK (recommendation IN ('approve', 'approve-conditional', 'deny', 'pending')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_background_checks_organization ON background_checks(organization_id);
CREATE INDEX idx_background_checks_status ON background_checks(status);
CREATE INDEX idx_background_checks_property ON background_checks(property_id);

-- =====================================================
-- 3. DOCUMENT SIGNING (E-SIGNATURES)
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('lease', 'addendum', 'notice', 'agreement', 'disclosure')),
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partially-signed', 'completed', 'expired')),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_date DATE,
  completed_date DATE,
  expiry_date DATE,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('tenant', 'landlord', 'guarantor')),
  signed BOOLEAN DEFAULT FALSE,
  signed_date DATE,
  signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_organization ON documents(organization_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_document_recipients_document ON document_recipients(document_id);

-- =====================================================
-- 4. MARKET INTELLIGENCE & ANALYTICS
-- =====================================================

CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  area VARCHAR(255) NOT NULL,
  property_type VARCHAR(100),
  avg_rent DECIMAL(10,2) NOT NULL,
  rent_change_percentage DECIMAL(5,2),
  occupancy_rate DECIMAL(5,2),
  days_on_market INTEGER,
  avg_property_value DECIMAL(12,2),
  value_change_percentage DECIMAL(5,2),
  data_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comparable_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  distance VARCHAR(50),
  avg_rent DECIMAL(10,2),
  occupancy_rate DECIMAL(5,2),
  total_units INTEGER,
  amenities TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_market_data_organization ON market_data(organization_id);
CREATE INDEX idx_market_data_area ON market_data(area);
CREATE INDEX idx_comparable_properties_organization ON comparable_properties(organization_id);

-- =====================================================
-- 5. PREDICTIVE MAINTENANCE AI
-- =====================================================

CREATE TABLE IF NOT EXISTS maintenance_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('hvac', 'plumbing', 'electrical', 'appliance', 'structural')),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  location VARCHAR(255),
  install_date DATE,
  last_service_date DATE,
  next_service_date DATE,
  failure_probability INTEGER CHECK (failure_probability >= 0 AND failure_probability <= 100),
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  estimated_cost DECIMAL(10,2),
  priority VARCHAR(50) CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES maintenance_assets(id) ON DELETE CASCADE,
  prediction_date DATE NOT NULL,
  predicted_failures INTEGER,
  actual_failures INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_maintenance_assets_organization ON maintenance_assets(organization_id);
CREATE INDEX idx_maintenance_assets_priority ON maintenance_assets(priority);
CREATE INDEX idx_maintenance_predictions_asset ON maintenance_predictions(asset_id);

-- =====================================================
-- SEED DATA FOR TESTING
-- =====================================================

-- Insert sample leads (using first organization)
INSERT INTO leads (organization_id, name, email, phone, source, status, score, budget, move_in_date, last_contact_date, notes)
SELECT 
  id, 
  'Sarah Johnson', 
  'sarah.j@email.com', 
  '(555) 123-4567', 
  'zillow', 
  'qualified', 
  85, 
  2500, 
  '2025-12-01', 
  '2025-11-04', 
  'Interested in 2BR, prefers high floor'
FROM organizations LIMIT 1;

INSERT INTO leads (organization_id, name, email, phone, source, status, score, budget, move_in_date, last_contact_date, notes)
SELECT 
  id, 
  'Michael Chen', 
  'mchen@email.com', 
  '(555) 234-5678', 
  'website', 
  'touring', 
  92, 
  3000, 
  '2025-11-15', 
  '2025-11-05', 
  'Scheduled tour for tomorrow'
FROM organizations LIMIT 1;

-- Insert sample background checks
INSERT INTO background_checks (organization_id, applicant_name, applicant_email, status, credit_score, criminal_record, eviction_history, employment_verified, income_verified, requested_date, completed_date, recommendation)
SELECT 
  o.id,
  'Emily Rodriguez',
  'emily.r@email.com',
  'completed',
  740,
  'clear',
  'none',
  TRUE,
  TRUE,
  '2025-11-01',
  '2025-11-03',
  'approve'
FROM organizations o
LIMIT 1;

-- Insert sample market data
INSERT INTO market_data (organization_id, area, property_type, avg_rent, rent_change_percentage, occupancy_rate, days_on_market, avg_property_value, value_change_percentage)
SELECT 
  id,
  'Downtown',
  'Urban Apartments',
  2850,
  5.2,
  94,
  12,
  425000,
  3.8
FROM organizations LIMIT 1;

-- Insert sample maintenance assets
INSERT INTO maintenance_assets (organization_id, name, type, location, install_date, last_service_date, next_service_date, failure_probability, health_score, estimated_cost, priority)
SELECT 
  o.id,
  'HVAC Unit #1',
  'hvac',
  'Rooftop - East Wing',
  '2018-03-15',
  '2025-09-10',
  '2025-12-10',
  72,
  65,
  850,
  'high'
FROM organizations o
LIMIT 1;
