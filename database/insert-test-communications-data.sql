-- ============================================================================
-- INSERT TEST DATA FOR COMMUNICATIONS SYSTEM
-- ============================================================================
-- Run this in Supabase SQL Editor to add sample conversations and messages
-- ============================================================================

-- 1. Insert test conversation threads
INSERT INTO conversation_threads (participants, subject, last_message_at, last_message_preview, is_archived, is_muted, unread_count)
VALUES
  (
    ARRAY['test-manager-1', 'test-tenant-1']::UUID[],
    'Rent Payment Reminder',
    NOW() - INTERVAL '2 hours',
    'Just a friendly reminder that rent is due on the 1st.',
    false,
    false,
    1
  ),
  (
    ARRAY['test-manager-1', 'test-tenant-2']::UUID[],
    'Maintenance Request Update',
    NOW() - INTERVAL '1 day',
    'Your maintenance request has been completed!',
    false,
    false,
    0
  ),
  (
    ARRAY['test-manager-1', 'test-owner-1']::UUID[],
    'Monthly Property Report',
    NOW() - INTERVAL '7 days',
    'Here is your monthly report for October 2024...',
    false,
    false,
    0
  ),
  (
    ARRAY['test-manager-1', 'test-vendor-1']::UUID[],
    'Plumbing Service Quote',
    NOW() - INTERVAL '3 days',
    'Thank you for the quote. We will proceed with the work.',
    true,
    false,
    0
  );

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
  id,
  'manager',
  'test-manager-1',
  'tenant',
  ARRAY['test-tenant-1']::UUID[],
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
FROM conversation_threads
WHERE subject = 'Rent Payment Reminder'
LIMIT 1;

-- 3. Insert messages for Thread 2 (Maintenance - 4 messages conversation)
WITH thread AS (
  SELECT id FROM conversation_threads WHERE subject = 'Maintenance Request Update' LIMIT 1
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
VALUES
  (
    (SELECT id FROM thread),
    'tenant',
    'test-tenant-2',
    'manager',
    ARRAY['test-manager-1']::UUID[],
    'Maintenance Request - Leaking Faucet',
    'Hi, the kitchen faucet in my unit has been leaking for the past few days. Could someone take a look at it?',
    'portal',
    'read',
    'normal',
    NOW() - INTERVAL '48 hours',
    NOW() - INTERVAL '47 hours'
  ),
  (
    (SELECT id FROM thread),
    'manager',
    'test-manager-1',
    'tenant',
    ARRAY['test-tenant-2']::UUID[],
    'Re: Maintenance Request - Leaking Faucet',
    'Thank you for reporting this. I have scheduled our plumber to visit tomorrow between 2-4 PM. Please let me know if this time works for you.',
    'portal',
    'read',
    'normal',
    NOW() - INTERVAL '47 hours',
    NOW() - INTERVAL '46 hours'
  ),
  (
    (SELECT id FROM thread),
    'tenant',
    'test-tenant-2',
    'manager',
    ARRAY['test-manager-1']::UUID[],
    'Re: Maintenance Request - Leaking Faucet',
    'Perfect! That time works great. Thank you!',
    'portal',
    'read',
    'normal',
    NOW() - INTERVAL '46 hours',
    NOW() - INTERVAL '45 hours'
  ),
  (
    (SELECT id FROM thread),
    'manager',
    'test-manager-1',
    'tenant',
    ARRAY['test-tenant-2']::UUID[],
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
  );

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
  id,
  'manager',
  'test-manager-1',
  'owner',
  ARRAY['test-owner-1']::UUID[],
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
FROM conversation_threads
WHERE subject = 'Monthly Property Report'
LIMIT 1;

-- 5. Insert messages for Thread 4 (Vendor Quote - archived, 2 messages)
WITH thread AS (
  SELECT id FROM conversation_threads WHERE subject = 'Plumbing Service Quote' LIMIT 1
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
VALUES
  (
    (SELECT id FROM thread),
    'vendor',
    'test-vendor-1',
    'manager',
    ARRAY['test-manager-1']::UUID[],
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
  ),
  (
    (SELECT id FROM thread),
    'manager',
    'test-manager-1',
    'vendor',
    ARRAY['test-vendor-1']::UUID[],
    'Re: Plumbing Service Quote',
    'Thank you for the quote. We will proceed with the work. Please schedule it for tomorrow afternoon.',
    'email',
    'read',
    'normal',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Test Data Created Successfully!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • 4 conversation threads created';
  RAISE NOTICE '  • 8 messages created';
  RAISE NOTICE '  • 1 thread archived (vendor quote)';
  RAISE NOTICE '  • 1 unread message (rent reminder)';
  RAISE NOTICE '';
  RAISE NOTICE 'Navigate to /communications to see the data!';
  RAISE NOTICE '====================================================';
END $$;
