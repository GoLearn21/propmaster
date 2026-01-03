-- ============================================================================
-- INSERT TEST DATA FOR COMMUNICATIONS SYSTEM (FIXED - Using proper UUIDs)
-- ============================================================================
-- Run this in Supabase SQL Editor to add sample conversations and messages
-- ============================================================================

-- Create temporary table for test user IDs (so we can reference them consistently)
CREATE TEMP TABLE test_users AS
SELECT
  gen_random_uuid() AS manager_id,
  gen_random_uuid() AS tenant1_id,
  gen_random_uuid() AS tenant2_id,
  gen_random_uuid() AS owner_id,
  gen_random_uuid() AS vendor_id;

-- 1. Insert test conversation threads
INSERT INTO conversation_threads (participants, subject, last_message_at, last_message_preview, is_archived, is_muted, unread_count)
SELECT
  ARRAY[manager_id, tenant1_id],
  'Rent Payment Reminder',
  NOW() - INTERVAL '2 hours',
  'Just a friendly reminder that rent is due on the 1st.',
  false,
  false,
  1
FROM test_users
UNION ALL
SELECT
  ARRAY[manager_id, tenant2_id],
  'Maintenance Request Update',
  NOW() - INTERVAL '1 day',
  'Your maintenance request has been completed!',
  false,
  false,
  0
FROM test_users
UNION ALL
SELECT
  ARRAY[manager_id, owner_id],
  'Monthly Property Report',
  NOW() - INTERVAL '7 days',
  'Here is your monthly report for October 2024...',
  false,
  false,
  0
FROM test_users
UNION ALL
SELECT
  ARRAY[manager_id, vendor_id],
  'Plumbing Service Quote',
  NOW() - INTERVAL '3 days',
  'Thank you for the quote. We will proceed with the work.',
  true,
  false,
  0
FROM test_users;

-- 2. Insert messages for Thread 1 (Rent Payment)
INSERT INTO communications_new (
  thread_id,
  sender_type,
  sender_id,
  recipient_type,
  recipient_ids,
  subject,
  body,
  channel,
  status,
  priority,
  sent_at
)
SELECT
  ct.id,
  'manager',
  tu.manager_id,
  'tenant',
  ARRAY[tu.tenant1_id],
  'Rent Payment Reminder',
  'Hi there! 👋

Just a friendly reminder that rent for Unit 4B is due on November 1st.

Amount: $1,500

You can pay online through your portal or use any of our other payment methods.

Let us know if you have any questions!

Best regards,
MasterKey Property Management',
  'portal',
  'sent',
  'normal',
  NOW() - INTERVAL '2 hours'
FROM conversation_threads ct
CROSS JOIN test_users tu
WHERE ct.subject = 'Rent Payment Reminder';

-- 3. Insert messages for Thread 2 (Maintenance - 4 messages conversation)
WITH thread AS (
  SELECT ct.id as thread_id, tu.manager_id, tu.tenant2_id
  FROM conversation_threads ct
  CROSS JOIN test_users tu
  WHERE ct.subject = 'Maintenance Request Update'
)
INSERT INTO communications_new (
  thread_id,
  sender_type,
  sender_id,
  recipient_type,
  recipient_ids,
  subject,
  body,
  channel,
  status,
  priority,
  sent_at,
  read_at
)
SELECT
  thread_id,
  'tenant',
  tenant2_id,
  'manager',
  ARRAY[manager_id],
  'Maintenance Request - Leaking Faucet',
  'Hi, the kitchen faucet in my unit has been leaking for the past few days. Could someone take a look at it?',
  'portal',
  'read',
  'normal',
  NOW() - INTERVAL '48 hours',
  NOW() - INTERVAL '47 hours'
FROM thread
UNION ALL
SELECT
  thread_id,
  'manager',
  manager_id,
  'tenant',
  ARRAY[tenant2_id],
  'Re: Maintenance Request - Leaking Faucet',
  'Thank you for reporting this. I have scheduled our plumber to visit tomorrow between 2-4 PM. Please let me know if this time works for you.',
  'portal',
  'read',
  'normal',
  NOW() - INTERVAL '47 hours',
  NOW() - INTERVAL '46 hours'
FROM thread
UNION ALL
SELECT
  thread_id,
  'tenant',
  tenant2_id,
  'manager',
  ARRAY[manager_id],
  'Re: Maintenance Request - Leaking Faucet',
  'Perfect! That time works great. Thank you!',
  'portal',
  'read',
  'normal',
  NOW() - INTERVAL '46 hours',
  NOW() - INTERVAL '45 hours'
FROM thread
UNION ALL
SELECT
  thread_id,
  'manager',
  manager_id,
  'tenant',
  ARRAY[tenant2_id],
  'Maintenance Request Completed',
  'Good news! The maintenance request for your unit has been completed.

Request: Kitchen faucet leak
Completed: Today
Vendor: Joe''s Plumbing Services

We hope everything is working perfectly now. If you notice any issues or have concerns, please let us know.

How did we do? Rate our service: ⭐⭐⭐⭐⭐

Thanks!
MasterKey Maintenance Team',
  'portal',
  'delivered',
  'normal',
  NOW() - INTERVAL '1 day',
  NULL
FROM thread;

-- 4. Insert message for Thread 3 (Owner Report)
INSERT INTO communications_new (
  thread_id,
  sender_type,
  sender_id,
  recipient_type,
  recipient_ids,
  subject,
  body,
  channel,
  status,
  priority,
  sent_at,
  delivered_at,
  read_at
)
SELECT
  ct.id,
  'manager',
  tu.manager_id,
  'owner',
  ARRAY[tu.owner_id],
  'Monthly Property Report - October 2024',
  'Dear Property Owner,

Here is your monthly report for October 2024:

📊 Financial Summary:
• Rent Collected: $12,000
• Expenses: $3,200
• Net Income: $8,800

🏠 Property Status:
• Occupancy Rate: 95%
• Maintenance Requests: 3 (all completed)
• Inspections: 1 (passed)

📈 Market Update:
• Local rental rates increased 2.5%
• Demand remains strong

Please let me know if you have any questions.

Best regards,
MasterKey Property Management',
  'email',
  'read',
  'normal',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '6 days'
FROM conversation_threads ct
CROSS JOIN test_users tu
WHERE ct.subject = 'Monthly Property Report';

-- 5. Insert messages for Thread 4 (Vendor Quote - archived, 2 messages)
WITH thread AS (
  SELECT ct.id as thread_id, tu.manager_id, tu.vendor_id
  FROM conversation_threads ct
  CROSS JOIN test_users tu
  WHERE ct.subject = 'Plumbing Service Quote'
)
INSERT INTO communications_new (
  thread_id,
  sender_type,
  sender_id,
  recipient_type,
  recipient_ids,
  subject,
  body,
  channel,
  status,
  priority,
  sent_at,
  delivered_at,
  read_at
)
SELECT
  thread_id,
  'vendor',
  vendor_id,
  'manager',
  ARRAY[manager_id],
  'Plumbing Service Quote',
  'Hello,

Thank you for contacting us. Here is our quote for the plumbing services:

• Replace kitchen faucet: $150
• Labor: $100
• Total: $250

We can complete the work within 24 hours of approval.

Best regards,
Joe''s Plumbing Services',
  'email',
  'read',
  'normal',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '4 days'
FROM thread
UNION ALL
SELECT
  thread_id,
  'manager',
  manager_id,
  'vendor',
  ARRAY[vendor_id],
  'Re: Plumbing Service Quote',
  'Thank you for the quote. We will proceed with the work. Please schedule it for tomorrow afternoon.',
  'email',
  'read',
  'normal',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
FROM thread;

-- Success message
DO $$
DECLARE
  thread_count INTEGER;
  message_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO thread_count FROM conversation_threads;
  SELECT COUNT(*) INTO message_count FROM communications_new;

  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Test Data Created Successfully!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • % conversation threads created', thread_count;
  RAISE NOTICE '  • % messages created', message_count;
  RAISE NOTICE '  • 1 thread archived (vendor quote)';
  RAISE NOTICE '  • 1 unread message (rent reminder)';
  RAISE NOTICE '';
  RAISE NOTICE 'Navigate to /communications to see the data!';
  RAISE NOTICE 'Note: May need to wait for API cache refresh';
  RAISE NOTICE '====================================================';
END $$;
