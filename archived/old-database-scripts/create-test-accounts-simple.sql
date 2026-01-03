-- ============================================
-- CREATE TEST ACCOUNTS - SIMPLE VERSION
-- ============================================
-- This version checks what columns exist and adapts

BEGIN;

-- First, let's check if records already exist and delete them
DELETE FROM vendors WHERE email = 'vendor@test.com';
DELETE FROM owners WHERE email = 'owner@test.com';

-- Get the user IDs for our test accounts
DO $$
DECLARE
  vendor_user_id UUID;
  owner_user_id UUID;
BEGIN
  -- Get vendor user ID
  SELECT id INTO vendor_user_id
  FROM auth.users
  WHERE email = 'vendor@test.com';

  -- Get owner user ID
  SELECT id INTO owner_user_id
  FROM auth.users
  WHERE email = 'owner@test.com';

  -- Check if we found the users
  IF vendor_user_id IS NULL THEN
    RAISE EXCEPTION 'Vendor user not found in auth.users. Please create vendor@test.com in Authentication > Users first.';
  END IF;

  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Owner user not found in auth.users. Please create owner@test.com in Authentication > Users first.';
  END IF;

  RAISE NOTICE 'Found vendor user ID: %', vendor_user_id;
  RAISE NOTICE 'Found owner user ID: %', owner_user_id;
END $$;

COMMIT;

-- ============================================
-- Now run this SQL in a SEPARATE query:
-- ============================================

-- INSERT VENDOR PROFILE (minimal required fields)
INSERT INTO vendors (
  email,
  user_id,
  company_name,
  specialty
) VALUES (
  'vendor@test.com',
  (SELECT id FROM auth.users WHERE email = 'vendor@test.com'),
  'Smith Plumbing & Repairs',
  'plumbing'
);

-- INSERT OWNER PROFILE (minimal required fields)
INSERT INTO owners (
  email,
  user_id
) VALUES (
  'owner@test.com',
  (SELECT id FROM auth.users WHERE email = 'owner@test.com')
);

-- Verify the records were created
SELECT
  'VENDOR' as type,
  id,
  email,
  user_id,
  CASE
    WHEN user_id IS NOT NULL THEN '✅ Linked'
    ELSE '❌ Not linked'
  END as status
FROM vendors
WHERE email = 'vendor@test.com'

UNION ALL

SELECT
  'OWNER' as type,
  id,
  email,
  user_id,
  CASE
    WHEN user_id IS NOT NULL THEN '✅ Linked'
    ELSE '❌ Not linked'
  END as status
FROM owners
WHERE email = 'owner@test.com';
