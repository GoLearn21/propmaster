# 🔌 Supabase Setup Guide for Phase 2

## Quick Setup Instructions

Follow these steps to activate Phase 2 automation in your Supabase database.

---

## Step 1: Access Supabase SQL Editor

1. Log into your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `rautdxfkuemmlhcrujxq`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query** to create a new SQL query

---

## Step 2: Execute Phase 1 Database Schema

**File**: `/database/phase1-missing-tables.sql`

1. Open the file in your code editor
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** button (or press Cmd/Ctrl + Enter)

**Expected Result**:
```
✅ Phase 1 database tables created successfully!
✅ Created tables: bank_accounts, property_ownership, work_orders, payment_templates, audit_logs, lease_amendments, payment_history, expenses, recurring_charges, comments
```

**Tables Created** (10 total):
- bank_accounts
- property_ownership
- work_orders
- payment_templates
- payment_history
- expenses
- audit_logs
- lease_amendments
- recurring_charges
- comments

---

## Step 3: Execute Phase 2 Database Schema

**File**: `/database/phase2-automation-tables.sql`

1. Open the file in your code editor
2. Copy the entire contents
3. Paste into Supabase SQL Editor (new query or clear previous)
4. Click **Run** button (or press Cmd/Ctrl + Enter)

**Expected Result**:
```
✅ Phase 2 automation tables created successfully!
✅ Created tables: lease_renewal_offers, maintenance_schedules, approval_requests, approval_thresholds, notifications, automated_jobs_log, vendor_performance_metrics
✅ Total new tables: 7
```

**Tables Created** (7 total):
- lease_renewal_offers
- maintenance_schedules
- approval_requests
- approval_thresholds
- notifications
- automated_jobs_log
- vendor_performance_metrics

---

## Step 4: Verify Tables Exist

Run this query in Supabase SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  -- Phase 1 tables
  'bank_accounts', 'property_ownership', 'work_orders',
  'payment_templates', 'payment_history', 'expenses',
  'audit_logs', 'lease_amendments', 'recurring_charges', 'comments',
  -- Phase 2 tables
  'lease_renewal_offers', 'maintenance_schedules', 'approval_requests',
  'approval_thresholds', 'notifications', 'automated_jobs_log',
  'vendor_performance_metrics'
)
ORDER BY table_name;
```

**Expected Output**: 17 rows showing all Phase 1 and Phase 2 tables

---

## Step 5: Initialize Approval Thresholds (Optional)

The Phase 2 schema automatically inserts default approval thresholds. Verify they exist:

```sql
SELECT category, threshold_amount, auto_approve_below
FROM approval_thresholds
WHERE property_id IS NULL
ORDER BY category;
```

**Expected Output**:
| category | threshold_amount | auto_approve_below |
|----------|-----------------|-------------------|
| capital_improvement | 2000 | 0 |
| emergency | 5000 | 500 |
| maintenance | 500 | 200 |
| repairs | 1000 | 300 |

---

## Step 6: Test Automation Services (Optional)

You can test the automation services work correctly by running them manually:

### Test Autopay Processing
```typescript
import { processAutopayPayments } from './src/services/autopayService';

const results = await processAutopayPayments();
console.log('Autopay results:', results);
```

### Test Lease Renewals
```typescript
import { processLeaseRenewals } from './src/services/leaseRenewalService';

const results = await processLeaseRenewals();
console.log('Renewal results:', results);
```

### Test Work Order Routing
```typescript
import { processUnassignedWorkOrders } from './src/services/workOrderRoutingService';

const results = await processUnassignedWorkOrders();
console.log('Routing results:', results);
```

---

## Troubleshooting

### Issue: "relation already exists"
**Cause**: Tables were already created in a previous run
**Solution**: Skip to next step or drop tables first:

```sql
DROP TABLE IF EXISTS lease_renewal_offers CASCADE;
DROP TABLE IF EXISTS maintenance_schedules CASCADE;
DROP TABLE IF EXISTS approval_requests CASCADE;
DROP TABLE IF EXISTS approval_thresholds CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS automated_jobs_log CASCADE;
DROP TABLE IF EXISTS vendor_performance_metrics CASCADE;
```

### Issue: "permission denied"
**Cause**: Insufficient database permissions
**Solution**: Make sure you're using the service_role key or have admin access

### Issue: "column does not exist"
**Cause**: Referenced tables from Phase 1 don't exist yet
**Solution**: Run Phase 1 schema first (step 2) before Phase 2 schema

---

## Next: Setup Cron Jobs

After database setup is complete, you'll need to configure 7 daily cron jobs for automation.

### Option 1: Supabase Edge Functions + pg_cron

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule autopay processing (daily at midnight UTC)
SELECT cron.schedule(
  'autopay-processing',
  '0 0 * * *',
  $$SELECT net.http_post(
    url:='https://your-app.com/api/cron/autopay',
    headers:='{"Content-Type": "application/json"}'::jsonb
  ) AS request_id;$$
);
```

### Option 2: External Cron Service (Recommended)

Use services like:
- **Vercel Cron Jobs** (if deployed on Vercel)
- **AWS EventBridge** (if using AWS)
- **Google Cloud Scheduler** (if using GCP)
- **Cron-job.org** (free online cron service)

**Endpoints to call daily**:
1. `/api/cron/autopay` - Process autopay payments
2. `/api/cron/payment-reminders` - Send payment reminders
3. `/api/cron/lease-renewals` - Generate renewal offers
4. `/api/cron/expired-offers` - Process expired offers
5. `/api/cron/maintenance` - Create maintenance work orders
6. `/api/cron/work-order-routing` - Auto-assign vendors
7. `/api/cron/expired-approvals` - Auto-reject expired approvals

---

## Database Schema Summary

### Total Tables: 17
**Phase 1**: 10 tables
**Phase 2**: 7 tables

### Total Indexes: 70+
All tables have comprehensive indexing for optimal performance.

### Key Features:
- ✅ Referential integrity (CASCADE/SET NULL)
- ✅ Check constraints for data validation
- ✅ JSONB fields for flexible data
- ✅ Timestamp tracking (created_at, updated_at)
- ✅ Unique constraints
- ✅ Foreign key relationships

---

## Documentation References

- **Phase 1 Details**: `/PHASE1_IMPLEMENTATION.md`
- **Phase 2 Details**: `/PHASE2_IMPLEMENTATION.md`
- **Test Results**: `/PHASE2_TEST_RESULTS.md`
- **Database Schema Files**:
  - `/database/phase1-missing-tables.sql`
  - `/database/phase2-automation-tables.sql`

---

## Support

If you encounter issues:
1. Check the Supabase logs for errors
2. Verify your database has sufficient storage
3. Ensure you're using PostgreSQL 14+
4. Review the SQL files for any syntax errors

---

*Setup guide last updated: 2025-11-08*
*Supabase Project: rautdxfkuemmlhcrujxq*
