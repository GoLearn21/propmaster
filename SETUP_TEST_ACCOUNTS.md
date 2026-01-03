# 🚀 Setup Test Accounts - Quick Start Guide

**Status**: ✅ Database tables exist | ⏳ Test accounts needed

---

## Current Situation

Your verification script shows:
- ✅ **Supabase connection**: Working
- ✅ **vendors table**: EXISTS
- ✅ **owners table**: EXISTS
- ❌ **Test accounts**: NOT FOUND

**You're 2 steps away from testing the portals!**

---

## Step 1: Create Auth Users in Supabase (3 minutes)

### 1.1 Open Supabase Dashboard
Go to: https://supabase.com/dashboard

### 1.2 Navigate to Authentication
- Click on your project: `rautdxfkuemmlhcrujxq`
- Click **Authentication** in left sidebar
- Click **Users** tab

### 1.3 Create Vendor User
1. Click **"Add User"** button (top right)
2. Select **"Create new user"**
3. Fill in:
   ```
   Email: vendor@test.com
   Password: TestVendor123!
   Auto Confirm User: ✅ CHECK THIS BOX
   ```
4. Click **"Create User"**

### 1.4 Create Owner User
1. Click **"Add User"** again
2. Select **"Create new user"**
3. Fill in:
   ```
   Email: owner@test.com
   Password: TestOwner123!
   Auto Confirm User: ✅ CHECK THIS BOX
   ```
4. Click **"Create User"**

**✅ Checkpoint**: You should now see 2 new users in the Authentication > Users list

---

## Step 2: Create Profile Records (2 minutes)

### 2.1 Open SQL Editor
- In Supabase Dashboard, click **SQL Editor** in left sidebar
- Click **"New query"** button

### 2.2 Execute Profile Creation SQL

**Copy the ENTIRE contents** of this file:
```
database/create-test-accounts.sql
```

**Or copy this SQL directly:**

```sql
-- ============================================
-- CREATE TEST ACCOUNTS FOR VENDOR & OWNER PORTALS
-- ============================================

BEGIN;

-- INSERT VENDOR PROFILE
INSERT INTO vendors (
  email, first_name, last_name, company_name, specialty,
  hourly_rate, rating, status, portal_access, phone_number,
  business_license, insurance_policy_number, insurance_expiry_date,
  user_id, completed_jobs_count, active_jobs_count
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
  user_id = EXCLUDED.user_id,
  updated_at = NOW();

-- INSERT OWNER PROFILE
INSERT INTO owners (
  email, first_name, last_name, total_units, portfolio_value,
  status, portal_access, preferred_contact_method,
  financial_reporting_preference, phone_number, user_id
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
  user_id = EXCLUDED.user_id,
  updated_at = NOW();

COMMIT;
```

### 2.3 Run the Query
- Click **"Run"** button (or press **Ctrl+Enter** / **Cmd+Enter**)
- You should see: **"Success. No rows returned"**

**✅ Checkpoint**: The query executed without errors

---

## Step 3: Verify Setup (1 minute)

### 3.1 Run Verification Script
In your terminal, run:
```bash
node scripts/setup-vendor-owner-portals.mjs
```

**Expected output:**
```
✅ Connected to Supabase successfully
✅ vendors table: EXISTS
✅ owners table: EXISTS
✅ vendor@test.com: EXISTS
✅ owner@test.com: EXISTS
✅ Vendor login successful
✅ Vendor profile found
✅ Owner login successful
✅ Owner profile found
```

---

## Step 4: Test the Portals! 🎉

### Test Vendor Portal

1. **Open browser**: http://localhost:5175/vendor/login

2. **Login with**:
   ```
   Email: vendor@test.com
   Password: TestVendor123!
   ```

3. **Expected result**:
   - ✅ Blue-themed vendor portal
   - ✅ "PropMaster Vendor Portal" header with wrench icon
   - ✅ Dashboard showing vendor statistics
   - ✅ Job listings (will be empty initially)
   - ✅ **NO property manager features visible**

### Test Owner Portal

1. **Open browser**: http://localhost:5175/owner/login

2. **Login with**:
   ```
   Email: owner@test.com
   Password: TestOwner123!
   ```

3. **Expected result**:
   - ✅ Emerald-themed owner portal
   - ✅ "PropMaster Owner Portal" header
   - ✅ Dashboard showing portfolio overview
   - ✅ Financial metrics cards
   - ✅ **NO property manager features visible**

---

## Troubleshooting

### "Invalid login credentials" error

**Cause**: Auth user doesn't exist OR profile not linked

**Fix**:
1. Verify user exists in Authentication > Users
2. Re-run the profile creation SQL
3. Check the `user_id` field is populated:
   ```sql
   SELECT email, user_id FROM vendors WHERE email = 'vendor@test.com';
   SELECT email, user_id FROM owners WHERE email = 'owner@test.com';
   ```

### "No vendor/owner profile found"

**Cause**: Profile record doesn't exist in database

**Fix**:
1. Re-run the profile creation SQL from Step 2
2. Verify with:
   ```sql
   SELECT * FROM vendors WHERE email = 'vendor@test.com';
   SELECT * FROM owners WHERE email = 'owner@test.com';
   ```

### Still showing Property Manager portal

**Cause**: Caching issue or wrong URL

**Fix**:
1. Hard refresh browser: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
2. Verify you're using the correct URL:
   - Vendor: `/vendor/login` (not just `/login`)
   - Owner: `/owner/login` (not just `/login`)
3. Clear browser cache and cookies

---

## Quick Reference

| Portal | URL | Email | Password |
|--------|-----|-------|----------|
| **Vendor** | http://localhost:5175/vendor/login | vendor@test.com | TestVendor123! |
| **Owner** | http://localhost:5175/owner/login | owner@test.com | TestOwner123! |
| **Property Manager** | http://localhost:5175/ | (existing credentials) | (existing credentials) |

---

## What's Next?

Once the test accounts are working, we can:

1. **Create sample work orders** for the vendor to see
2. **Build vendor job detail page** with photo upload
3. **Build vendor payment history page**
4. **Build owner financial reports** with PDF export
5. **Build owner property detail pages**

---

**Need Help?**
- Run the verification script: `node scripts/setup-vendor-owner-portals.mjs`
- Check Supabase logs: Dashboard > Logs > Auth
- Review RLS policies: Dashboard > Table Editor > vendors/owners > Policies
