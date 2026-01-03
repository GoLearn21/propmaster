import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  console.log('🚀 Creating test data for Communications system...\n');

  try {
    // 1. Create test conversation threads
    console.log('1️⃣ Creating conversation threads...');

    const threads = [
      {
        participants: ['test-manager-1', 'test-tenant-1'],
        subject: 'Rent Payment Reminder',
        last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        last_message_preview: 'Just a friendly reminder that rent is due on the 1st.',
        is_archived: false,
        is_muted: false,
        unread_count: 1,
      },
      {
        participants: ['test-manager-1', 'test-tenant-2'],
        subject: 'Maintenance Request Update',
        last_message_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        last_message_preview: 'Your maintenance request has been completed!',
        is_archived: false,
        is_muted: false,
        unread_count: 0,
      },
      {
        participants: ['test-manager-1', 'test-owner-1'],
        subject: 'Monthly Property Report',
        last_message_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
        last_message_preview: 'Here is your monthly report for October 2024...',
        is_archived: false,
        is_muted: false,
        unread_count: 0,
      },
      {
        participants: ['test-manager-1', 'test-vendor-1'],
        subject: 'Plumbing Service Quote',
        last_message_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        last_message_preview: 'Thank you for the quote. We will proceed with the work.',
        is_archived: true,
        is_muted: false,
        unread_count: 0,
      },
    ];

    const { data: createdThreads, error: threadError } = await supabase
      .from('conversation_threads')
      .insert(threads)
      .select();

    if (threadError) {
      console.log(`   ❌ Error: ${threadError.message}`);
      return;
    }

    console.log(`   ✅ Created ${createdThreads.length} conversation threads`);

    // 2. Create messages for each thread
    console.log('\n2️⃣ Creating messages...');

    const messages = [
      // Thread 1 - Rent Payment
      {
        thread_id: createdThreads[0].id,
        sender_type: 'manager',
        sender_id: 'test-manager-1',
        recipient_type: 'tenant',
        recipient_ids: ['test-tenant-1'],
        subject: 'Rent Payment Reminder',
        body: 'Hi there! 👋\n\nJust a friendly reminder that rent for Unit 4B is due on November 1st.\n\nAmount: $1,500\n\nYou can pay online through your portal or use any of our other payment methods.\n\nLet us know if you have any questions!\n\nBest regards,\nMasterKey Property Management',
        channel: 'portal',
        status: 'sent',
        priority: 'normal',
        sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      // Thread 2 - Maintenance Request (conversation)
      {
        thread_id: createdThreads[1].id,
        sender_type: 'tenant',
        sender_id: 'test-tenant-2',
        recipient_type: 'manager',
        recipient_ids: ['test-manager-1'],
        subject: 'Maintenance Request - Leaking Faucet',
        body: 'Hi, the kitchen faucet in my unit has been leaking for the past few days. Could someone take a look at it?',
        channel: 'portal',
        status: 'read',
        priority: 'normal',
        sent_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        read_at: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
      },
      {
        thread_id: createdThreads[1].id,
        sender_type: 'manager',
        sender_id: 'test-manager-1',
        recipient_type: 'tenant',
        recipient_ids: ['test-tenant-2'],
        subject: 'Re: Maintenance Request - Leaking Faucet',
        body: 'Thank you for reporting this. I have scheduled our plumber to visit tomorrow between 2-4 PM. Please let me know if this time works for you.',
        channel: 'portal',
        status: 'read',
        priority: 'normal',
        sent_at: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
        read_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
      },
      {
        thread_id: createdThreads[1].id,
        sender_type: 'tenant',
        sender_id: 'test-tenant-2',
        recipient_type: 'manager',
        recipient_ids: ['test-manager-1'],
        subject: 'Re: Maintenance Request - Leaking Faucet',
        body: 'Perfect! That time works great. Thank you!',
        channel: 'portal',
        status: 'read',
        priority: 'normal',
        sent_at: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
        read_at: new Date(Date.now() - 45 * 60 * 60 * 1000).toISOString(),
      },
      {
        thread_id: createdThreads[1].id,
        sender_type: 'manager',
        sender_id: 'test-manager-1',
        recipient_type: 'tenant',
        recipient_ids: ['test-tenant-2'],
        subject: 'Maintenance Request Completed',
        body: 'Good news! The maintenance request for your unit has been completed.\n\nRequest: Kitchen faucet leak\nCompleted: Today\nVendor: Joe\'s Plumbing Services\n\nWe hope everything is working perfectly now. If you notice any issues or have concerns, please let us know.\n\nHow did we do? Rate our service: ⭐⭐⭐⭐⭐\n\nThanks!\nMasterKey Maintenance Team',
        channel: 'portal',
        status: 'delivered',
        priority: 'normal',
        sent_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        delivered_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      // Thread 3 - Owner Report
      {
        thread_id: createdThreads[2].id,
        sender_type: 'manager',
        sender_id: 'test-manager-1',
        recipient_type: 'owner',
        recipient_ids: ['test-owner-1'],
        subject: 'Monthly Property Report - October 2024',
        body: 'Dear Property Owner,\n\nHere is your monthly report for October 2024:\n\n📊 Financial Summary:\n• Rent Collected: $12,000\n• Expenses: $3,200\n• Net Income: $8,800\n\n🏠 Property Status:\n• Occupancy Rate: 95%\n• Maintenance Requests: 3 (all completed)\n• Inspections: 1 (passed)\n\n📈 Market Update:\n• Local rental rates increased 2.5%\n• Demand remains strong\n\nPlease let me know if you have any questions.\n\nBest regards,\nMasterKey Property Management',
        channel: 'email',
        status: 'read',
        priority: 'normal',
        sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        delivered_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        read_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
      // Thread 4 - Vendor Quote (archived)
      {
        thread_id: createdThreads[3].id,
        sender_type: 'vendor',
        sender_id: 'test-vendor-1',
        recipient_type: 'manager',
        recipient_ids: ['test-manager-1'],
        subject: 'Plumbing Service Quote',
        body: 'Hello,\n\nThank you for contacting us. Here is our quote for the plumbing services:\n\n• Replace kitchen faucet: $150\n• Labor: $100\n• Total: $250\n\nWe can complete the work within 24 hours of approval.\n\nBest regards,\nJoe\'s Plumbing Services',
        channel: 'email',
        status: 'read',
        priority: 'normal',
        sent_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        delivered_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        read_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        thread_id: createdThreads[3].id,
        sender_type: 'manager',
        sender_id: 'test-manager-1',
        recipient_type: 'vendor',
        recipient_ids: ['test-vendor-1'],
        subject: 'Re: Plumbing Service Quote',
        body: 'Thank you for the quote. We will proceed with the work. Please schedule it for tomorrow afternoon.',
        channel: 'email',
        status: 'read',
        priority: 'normal',
        sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        delivered_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        read_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const { data: createdMessages, error: messageError } = await supabase
      .from('communications_new')
      .insert(messages)
      .select();

    if (messageError) {
      console.log(`   ❌ Error: ${messageError.message}`);
      return;
    }

    console.log(`   ✅ Created ${createdMessages.length} messages`);

    // 3. Verify templates exist
    console.log('\n3️⃣ Checking message templates...');
    const { data: templates, error: templateError } = await supabase
      .from('message_templates')
      .select('id, name, category');

    if (templateError) {
      console.log(`   ❌ Error: ${templateError.message}`);
    } else {
      console.log(`   ✅ Found ${templates.length} templates:`);
      templates.forEach(t => console.log(`      - ${t.name} (${t.category})`));
    }

    console.log('\n✅ Test data created successfully!\n');
    console.log('📝 Summary:');
    console.log(`   • ${createdThreads.length} conversation threads`);
    console.log(`   • ${createdMessages.length} messages`);
    console.log(`   • ${templates?.length || 0} message templates`);
    console.log(`   • 1 archived conversation (vendor quote)\n`);
    console.log('🎉 Ready to test! Navigate to /communications in your browser.\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

createTestData();
