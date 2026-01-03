-- ============================================
-- CREATE TEST ACCOUNTS FOR VENDOR & OWNER PORTALS
-- ============================================
--
-- IMPORTANT: Execute this in Supabase SQL Editor
--
-- This script assumes you've already created auth users:
--   1. vendor@test.com (password: TestVendor123!)
--   2. owner@test.com (password: TestOwner123!)
--
-- If you haven't created auth users yet:
--   1. Go to Authentication > Users in Supabase Dashboard
--   2. Click "Add User" > "Create new user"
--   3. Enter email, password, and check "Auto Confirm User"
-- ============================================

BEGIN;

-- ============================================
-- 1. INSERT VENDOR PROFILE
-- ============================================

INSERT INTO vendors (
  email,
  first_name,
  last_name,
  company_name,
  specialty,
  hourly_rate,
  rating,
  status,
  portal_access,
  phone_number,
  business_license,
  insurance_policy_number,
  insurance_expiry_date,
  user_id,
  completed_jobs_count,
  active_jobs_count
) VALUES (
  'vendor@test.com',
  'John',
  'Smith',
  'Smith Plumbing & Repairs',
  'plumbing',
  85.00,
  4.75,
  'active',
  true,
  '+1-555-0123',
  'PL-2024-12345',
  'INS-2024-67890',
  '2025-12-31',
  (SELECT id FROM auth.users WHERE email = 'vendor@test.com'),
  15,
  3
) ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  company_name = EXCLUDED.company_name,
  specialty = EXCLUDED.specialty,
  hourly_rate = EXCLUDED.hourly_rate,
  rating = EXCLUDED.rating,
  status = EXCLUDED.status,
  portal_access = EXCLUDED.portal_access,
  phone_number = EXCLUDED.phone_number,
  business_license = EXCLUDED.business_license,
  insurance_policy_number = EXCLUDED.insurance_policy_number,
  insurance_expiry_date = EXCLUDED.insurance_expiry_date,
  user_id = EXCLUDED.user_id,
  completed_jobs_count = EXCLUDED.completed_jobs_count,
  active_jobs_count = EXCLUDED.active_jobs_count,
  updated_at = NOW();

-- ============================================
-- 2. INSERT OWNER PROFILE
-- ============================================

INSERT INTO owners (
  email,
  first_name,
  last_name,
  total_units,
  portfolio_value,
  status,
  portal_access,
  preferred_contact_method,
  financial_reporting_preference,
  phone_number,
  user_id
) VALUES (
  'owner@test.com',
  'Jane',
  'Doe',
  12,
  2500000.00,
  'active',
  true,
  'email',
  'monthly',
  '+1-555-0456',
  (SELECT id FROM auth.users WHERE email = 'owner@test.com')
) ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  total_units = EXCLUDED.total_units,
  portfolio_value = EXCLUDED.portfolio_value,
  status = EXCLUDED.status,
  portal_access = EXCLUDED.portal_access,
  preferred_contact_method = EXCLUDED.preferred_contact_method,
  financial_reporting_preference = EXCLUDED.financial_reporting_preference,
  phone_number = EXCLUDED.phone_number,
  user_id = EXCLUDED.user_id,
  updated_at = NOW();

COMMIT;

-- ============================================
-- 3. VERIFICATION QUERIES
-- ============================================

-- Check vendor profile
SELECT
  v.id,
  v.email,
  v.first_name,
  v.last_name,
  v.company_name,
  v.specialty,
  v.status,
  v.portal_access,
  v.user_id,
  CASE
    WHEN v.user_id IS NOT NULL THEN '✅ Linked to auth user'
    ELSE '❌ NOT linked to auth user'
  END as auth_status
FROM vendors v
WHERE v.email = 'vendor@test.com';

-- Check owner profile
SELECT
  o.id,
  o.email,
  o.first_name,
  o.last_name,
  o.total_units,
  o.portfolio_value,
  o.status,
  o.portal_access,
  o.user_id,
  CASE
    WHEN o.user_id IS NOT NULL THEN '✅ Linked to auth user'
    ELSE '❌ NOT linked to auth user'
  END as auth_status
FROM owners o
WHERE o.email = 'owner@test.com';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Test accounts created successfully!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Vendor Portal:';
  RAISE NOTICE '  URL: http://localhost:5175/vendor/login';
  RAISE NOTICE '  Email: vendor@test.com';
  RAISE NOTICE '  Password: TestVendor123!';
  RAISE NOTICE '';
  RAISE NOTICE 'Owner Portal:';
  RAISE NOTICE '  URL: http://localhost:5175/owner/login';
  RAISE NOTICE '  Email: owner@test.com';
  RAISE NOTICE '  Password: TestOwner123!';
  RAISE NOTICE '============================================';
END $$;
