-- ============================================
-- CREATE TEST ACCOUNTS - FINAL VERSION
-- ============================================
-- Run this AFTER executing reset-and-setup-rbac.sql
-- This uses the correct schema with first_name, last_name, etc.
-- ============================================

BEGIN;

-- Clean up any existing test accounts
DELETE FROM vendors WHERE email = 'vendor@test.com';
DELETE FROM owners WHERE email = 'owner@test.com';

-- ============================================
-- INSERT VENDOR PROFILE
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
);

-- ============================================
-- INSERT OWNER PROFILE
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
);

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check vendor profile
SELECT
  '🔧 VENDOR PROFILE' as info,
  v.id,
  v.email,
  v.first_name,
  v.last_name,
  v.company_name,
  v.specialty,
  v.status,
  v.portal_access,
  v.rating,
  v.completed_jobs_count,
  v.active_jobs_count,
  v.user_id,
  CASE
    WHEN v.user_id IS NOT NULL THEN '✅ Linked to auth user'
    ELSE '❌ NOT linked to auth user'
  END as auth_status
FROM vendors v
WHERE v.email = 'vendor@test.com';

-- Check owner profile
SELECT
  '🏢 OWNER PROFILE' as info,
  o.id,
  o.email,
  o.first_name,
  o.last_name,
  o.total_units,
  o.portfolio_value,
  o.status,
  o.portal_access,
  o.financial_reporting_preference,
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
  RAISE NOTICE '';
  RAISE NOTICE '🔧 VENDOR PORTAL';
  RAISE NOTICE '   URL: http://localhost:5175/vendor/login';
  RAISE NOTICE '   Email: vendor@test.com';
  RAISE NOTICE '   Password: TestVendor123!';
  RAISE NOTICE '';
  RAISE NOTICE '🏢 OWNER PORTAL';
  RAISE NOTICE '   URL: http://localhost:5175/owner/login';
  RAISE NOTICE '   Email: owner@test.com';
  RAISE NOTICE '   Password: TestOwner123!';
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Next: Test the portals in your browser!';
  RAISE NOTICE '============================================';
END $$;
