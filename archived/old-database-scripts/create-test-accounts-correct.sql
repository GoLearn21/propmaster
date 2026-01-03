-- ============================================
-- CREATE TEST ACCOUNTS - CORRECT VERSION
-- Based on actual Supabase table structure
-- ============================================

BEGIN;

-- ============================================
-- 1. GET REQUIRED IDs
-- ============================================

-- We need to get an organization_id first
-- Let's use the first available organization or create a test one
DO $$
DECLARE
  test_org_id UUID;
  vendor_user_id UUID;
  owner_user_id UUID;
BEGIN
  -- Get or create test organization
  SELECT id INTO test_org_id
  FROM organizations
  LIMIT 1;

  IF test_org_id IS NULL THEN
    RAISE NOTICE 'No organization found. You may need to adjust organization_id manually.';
    -- Use a placeholder UUID that will need to be updated
    test_org_id := '00000000-0000-0000-0000-000000000000';
  ELSE
    RAISE NOTICE 'Using organization ID: %', test_org_id;
  END IF;

  -- Get user IDs
  SELECT id INTO vendor_user_id FROM auth.users WHERE email = 'vendor@test.com';
  SELECT id INTO owner_user_id FROM auth.users WHERE email = 'owner@test.com';

  IF vendor_user_id IS NULL THEN
    RAISE EXCEPTION 'Vendor user not found. Create vendor@test.com in Authentication > Users first.';
  END IF;

  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Owner user not found. Create owner@test.com in Authentication > Users first.';
  END IF;

  RAISE NOTICE 'Vendor user ID: %', vendor_user_id;
  RAISE NOTICE 'Owner user ID: %', owner_user_id;
END $$;

COMMIT;

-- ============================================
-- 2. INSERT VENDOR (Run this as separate query)
-- ============================================

-- First, delete existing test vendor if any
DELETE FROM vendors WHERE email = 'vendor@test.com';

-- Insert vendor with correct column names
INSERT INTO vendors (
  organization_id,
  user_id,
  business_name,
  email,
  phone,
  services,
  service_areas,
  emergency_available,
  rating,
  rating_count,
  jobs_completed,
  status
) VALUES (
  (SELECT id FROM organizations LIMIT 1),  -- Use first org
  (SELECT id FROM auth.users WHERE email = 'vendor@test.com'),
  'Smith Plumbing & Repairs',
  'vendor@test.com',
  '+1-555-0123',
  '["plumbing", "repairs", "installations"]'::jsonb,
  '["residential", "commercial"]'::jsonb,
  true,
  4.75,
  20,
  15,
  'active'
);

-- ============================================
-- 3. CHECK OWNERS TABLE STRUCTURE
-- ============================================
-- Run this first to see owners table structure:

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'owners'
ORDER BY ordinal_position;

-- ============================================
-- 4. VERIFY VENDOR WAS CREATED
-- ============================================

SELECT
  id,
  business_name,
  email,
  phone,
  status,
  user_id,
  CASE
    WHEN user_id IS NOT NULL THEN '✅ Linked to auth user'
    ELSE '❌ NOT linked'
  END as auth_status
FROM vendors
WHERE email = 'vendor@test.com';
