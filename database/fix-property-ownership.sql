-- ============================================================================
-- FIX: Add missing property_ownership table
-- ============================================================================
-- This table is needed for owner-property relationships
-- Execute this in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Create property_ownership table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_ownership_property_id ON property_ownership(property_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_owner_id ON property_ownership(owner_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_dates ON property_ownership(start_date, end_date);

-- Enable Row Level Security
ALTER TABLE property_ownership ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all property ownerships
DROP POLICY IF EXISTS property_ownership_select_policy ON property_ownership;
CREATE POLICY property_ownership_select_policy ON property_ownership
  FOR SELECT USING (true);

-- RLS Policy: Authenticated users can insert ownership records
DROP POLICY IF EXISTS property_ownership_insert_policy ON property_ownership;
CREATE POLICY property_ownership_insert_policy ON property_ownership
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policy: Authenticated users can update ownership records
DROP POLICY IF EXISTS property_ownership_update_policy ON property_ownership;
CREATE POLICY property_ownership_update_policy ON property_ownership
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policy: Authenticated users can delete ownership records
DROP POLICY IF EXISTS property_ownership_delete_policy ON property_ownership;
CREATE POLICY property_ownership_delete_policy ON property_ownership
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Success message
DO $$ BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'property_ownership table created successfully!';
  RAISE NOTICE '====================================================';
END $$;

COMMIT;
