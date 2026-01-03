# 🔌 Execute Database Schema - Step by Step Guide

## Ready to Activate Phase 2 Automation!

Follow these steps carefully to set up your database for automation.

---

## ✅ Pre-Flight Checklist

Before you begin, make sure you have:
- [ ] Supabase account access
- [ ] Project: `rautdxfkuemmlhcrujxq`
- [ ] Admin/Owner permissions
- [ ] Files ready: `phase1-missing-tables.sql` and `phase2-automation-tables.sql`

---

## Step 1: Access Supabase Dashboard

1. Open your browser
2. Go to: https://supabase.com/dashboard
3. Log in with your credentials
4. You should see your project: **rautdxfkuemmlhcrujxq**

**Screenshot checkpoint**: You should see the Supabase dashboard with your project.

---

## Step 2: Open SQL Editor

1. In the left sidebar, click **"SQL Editor"**
2. Click the **"New Query"** button (top right)
3. You should see an empty SQL editor

**Screenshot checkpoint**: Empty SQL editor with "Run" button visible.

---

## Step 3: Execute Phase 1 Schema (10 Tables)

### 3a. Copy Phase 1 SQL

1. Open the file: `/database/phase1-missing-tables.sql`
2. Select ALL content (Cmd+A / Ctrl+A)
3. Copy to clipboard (Cmd+C / Ctrl+C)

**File location**:
```
/Users/balachander/Desktop/Minimax_ai/WorkinCopy/propmaster-rebuild/database/phase1-missing-tables.sql
```

### 3b. Paste and Run

1. Paste into Supabase SQL Editor (Cmd+V / Ctrl+V)
2. Click the green **"Run"** button (or press Cmd+Enter / Ctrl+Enter)
3. Wait for execution (should take 5-10 seconds)

### 3c. Verify Success

You should see output like this:
```
✅ Success: No rows returned

NOTICE:  Phase 1 database tables created successfully!
NOTICE:  Created tables: bank_accounts, property_ownership, work_orders, payment_templates, audit_logs, lease_amendments, payment_history, expenses, recurring_charges, comments
```

**If you see an error**:
- Check if tables already exist (error: "relation already exists")
- If so, that's OK - tables are already created
- Proceed to next step

### 3d. Verify Tables Created

Run this verification query in a NEW query:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'bank_accounts', 'property_ownership', 'work_orders',
  'payment_templates', 'payment_history', 'expenses',
  'audit_logs', 'lease_amendments', 'recurring_charges', 'comments'
)
ORDER BY table_name;
```

**Expected output**: 10 rows showing all Phase 1 tables

✅ **Checkpoint**: Phase 1 complete (10 tables)

---

## Step 4: Execute Phase 2 Schema (7 Tables)

### 4a. Clear Editor and Copy Phase 2 SQL

1. Clear the SQL editor (select all and delete, or click "New Query")
2. Open the file: `/database/phase2-automation-tables.sql`
3. Select ALL content (Cmd+A / Ctrl+A)
4. Copy to clipboard (Cmd+C / Ctrl+C)

**File location**:
```
/Users/balachander/Desktop/Minimax_ai/WorkinCopy/propmaster-rebuild/database/phase2-automation-tables.sql
```

### 4b. Paste and Run

1. Paste into Supabase SQL Editor (Cmd+V / Ctrl+V)
2. Click the green **"Run"** button (or press Cmd+Enter / Ctrl+Enter)
3. Wait for execution (should take 5-10 seconds)

### 4c. Verify Success

You should see output like this:
```
✅ Success: 4 rows returned (approval thresholds)

NOTICE:  Phase 2 automation tables created successfully!
NOTICE:  Created tables: lease_renewal_offers, maintenance_schedules, approval_requests, approval_thresholds, notifications, automated_jobs_log, vendor_performance_metrics
NOTICE:  Total new tables: 7
```

### 4d. Verify Tables Created

Run this verification query in a NEW query:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'lease_renewal_offers', 'maintenance_schedules', 'approval_requests',
  'approval_thresholds', 'notifications', 'automated_jobs_log',
  'vendor_performance_metrics'
)
ORDER BY table_name;
```

**Expected output**: 7 rows showing all Phase 2 tables

✅ **Checkpoint**: Phase 2 complete (7 tables)

---

## Step 5: Final Verification (All 17 Tables)

Run this comprehensive verification query:

```sql
SELECT
  table_name,
  CASE
    WHEN table_name IN ('bank_accounts', 'property_ownership', 'work_orders',
                        'payment_templates', 'payment_history', 'expenses',
                        'audit_logs', 'lease_amendments', 'recurring_charges', 'comments')
    THEN 'Phase 1'
    ELSE 'Phase 2'
  END as phase
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  -- Phase 1 (10 tables)
  'bank_accounts', 'property_ownership', 'work_orders',
  'payment_templates', 'payment_history', 'expenses',
  'audit_logs', 'lease_amendments', 'recurring_charges', 'comments',
  -- Phase 2 (7 tables)
  'lease_renewal_offers', 'maintenance_schedules', 'approval_requests',
  'approval_thresholds', 'notifications', 'automated_jobs_log',
  'vendor_performance_metrics'
)
ORDER BY phase, table_name;
```

**Expected output**: 17 rows total
- 10 rows labeled "Phase 1"
- 7 rows labeled "Phase 2"

---

## Step 6: Verify Approval Thresholds

Check that default approval thresholds were inserted:

```sql
SELECT
  category,
  threshold_amount,
  auto_approve_below,
  requires_multiple_approvers,
  approver_count
FROM approval_thresholds
WHERE property_id IS NULL
ORDER BY category;
```

**Expected output**: 4 rows showing:
| category | threshold_amount | auto_approve_below | requires_multiple_approvers | approver_count |
|----------|-----------------|-------------------|----------------------------|---------------|
| capital_improvement | 2000 | 0 | true | 2 |
| emergency | 5000 | 500 | false | 1 |
| maintenance | 500 | 200 | false | 1 |
| repairs | 1000 | 300 | false | 1 |

---

## Step 7: Verify Indexes Created

Check that all indexes were created:

```sql
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'bank_accounts', 'property_ownership', 'work_orders',
  'payment_templates', 'payment_history', 'expenses',
  'audit_logs', 'lease_amendments', 'recurring_charges', 'comments',
  'lease_renewal_offers', 'maintenance_schedules', 'approval_requests',
  'approval_thresholds', 'notifications', 'automated_jobs_log',
  'vendor_performance_metrics'
)
ORDER BY tablename, indexname;
```

**Expected output**: 70+ rows showing indexes for all tables

---

## Step 8: Test Data Access

Let's make sure the app can access the tables:

```sql
-- Test 1: Check payment_templates structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payment_templates'
ORDER BY ordinal_position;

-- Test 2: Check bank_accounts structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bank_accounts'
ORDER BY ordinal_position;

-- Test 3: Check maintenance_schedules structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'maintenance_schedules'
ORDER BY ordinal_position;
```

All queries should return column definitions.

---

## ✅ Success Checklist

Mark these off as you complete each step:

- [ ] Logged into Supabase dashboard
- [ ] Opened SQL Editor
- [ ] Executed Phase 1 schema (10 tables)
- [ ] Verified Phase 1 tables exist
- [ ] Executed Phase 2 schema (7 tables)
- [ ] Verified Phase 2 tables exist
- [ ] Verified all 17 tables exist
- [ ] Verified approval thresholds inserted
- [ ] Verified indexes created
- [ ] Tested data access

---

## 🎉 You're Done!

**Congratulations!** Your database is now set up with:

✅ **17 new tables** (10 Phase 1 + 7 Phase 2)
✅ **70+ indexes** for optimal performance
✅ **4 default approval thresholds**
✅ **Complete referential integrity**
✅ **Ready for automation**

---

## 🚀 What Happens Next?

Your PropMaster application can now:

1. **Process autopay payments** automatically
2. **Generate lease renewal offers** 60 days before expiration
3. **Create maintenance work orders** on schedule
4. **Auto-assign vendors** to work orders
5. **Route expenses** for approval based on thresholds

**All automation features are now LIVE!** 🎊

---

## 🔄 Next: Set Up Cron Jobs (Optional)

To fully automate, you'll need to set up 7 daily cron jobs:

1. Autopay processing (00:00 UTC)
2. Payment reminders (09:00 local)
3. Lease renewal offers (10:00 local)
4. Renewal offer expiration (00:00 UTC)
5. Maintenance scheduling (06:00 local)
6. Work order auto-assignment (08:00 local)
7. Approval expiration (00:00 UTC)

**For now, you can manually trigger these functions from the application or via API calls.**

---

## 💡 Troubleshooting

### Problem: "relation already exists"
**Solution**: Tables are already created. Skip to verification step.

### Problem: "permission denied"
**Solution**: Make sure you're logged in as project owner/admin.

### Problem: "column does not exist"
**Solution**: Run Phase 1 schema before Phase 2 schema.

### Problem: "syntax error"
**Solution**: Make sure you copied the ENTIRE SQL file including all semicolons.

---

## 📞 Need Help?

If you encounter any issues:
1. Check the error message in Supabase
2. Review the SQL file for completeness
3. Verify you have proper permissions
4. Try running queries one table at a time

---

*Setup guide created: 2025-11-08*
*Estimated completion time: 10 minutes*
