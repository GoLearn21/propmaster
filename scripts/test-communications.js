import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCommunications() {
  console.log('🔍 Testing Communications System...\n');

  try {
    // 1. Check if communications tables exist
    console.log('1️⃣ Checking database tables...');

    const tables = [
      'conversation_threads',
      'communications',
      'message_templates',
      'communication_workflows',
      'communication_preferences',
      'delivery_tracking',
      'quick_replies',
    ];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        // PGRST116 = empty result, which is fine
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: exists`);
      }
    }

    // 2. Check message templates
    console.log('\n2️⃣ Checking message templates...');
    const { data: templates, error: templatesError } = await supabase
      .from('message_templates')
      .select('*');

    if (templatesError) {
      console.log(`   ❌ Error: ${templatesError.message}`);
    } else {
      console.log(`   ✅ Found ${templates.length} templates:`);
      templates.forEach(t => {
        console.log(`      - ${t.name} (${t.category})`);
      });
    }

    // 3. Check conversation threads
    console.log('\n3️⃣ Checking conversation threads...');
    const { data: threads, error: threadsError } = await supabase
      .from('conversation_threads')
      .select('*');

    if (threadsError) {
      console.log(`   ❌ Error: ${threadsError.message}`);
    } else {
      console.log(`   ✅ Found ${threads.length} conversation threads`);
      if (threads.length > 0) {
        threads.forEach(t => {
          console.log(`      - ${t.subject || 'No subject'} (${t.participants.length} participants)`);
        });
      } else {
        console.log('      ℹ️  No threads yet - create some via the UI');
      }
    }

    // 4. Check communications/messages
    console.log('\n4️⃣ Checking communications...');
    const { data: comms, error: commsError } = await supabase
      .from('communications')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(5);

    if (commsError) {
      console.log(`   ❌ Error: ${commsError.message}`);
    } else {
      console.log(`   ✅ Found ${comms.length} recent messages`);
      if (comms.length > 0) {
        comms.forEach(c => {
          console.log(`      - ${c.subject || 'No subject'} (${c.channel}, ${c.status})`);
        });
      } else {
        console.log('      ℹ️  No messages yet - send some via the UI');
      }
    }

    // 5. Create a test conversation thread if none exist
    if (threads.length === 0) {
      console.log('\n5️⃣ Creating test conversation thread...');

      const testThreadData = {
        participants: ['test-user-1', 'test-user-2'],
        subject: 'Test Conversation',
        last_message_at: new Date().toISOString(),
        last_message_preview: 'This is a test message to verify the communications system works',
        is_archived: false,
        is_muted: false,
        unread_count: 1,
      };

      const { data: newThread, error: createThreadError } = await supabase
        .from('conversation_threads')
        .insert([testThreadData])
        .select()
        .single();

      if (createThreadError) {
        console.log(`   ❌ Error creating test thread: ${createThreadError.message}`);
      } else {
        console.log(`   ✅ Test thread created: ${newThread.id}`);

        // Create a test message in the thread
        console.log('\n6️⃣ Creating test message...');

        const testMessageData = {
          thread_id: newThread.id,
          sender_type: 'manager',
          sender_id: 'test-user-1',
          recipient_type: 'tenant',
          recipient_ids: ['test-user-2'],
          subject: 'Welcome!',
          body: 'This is a test message to verify the communications system is working correctly. You can now send and receive messages!',
          channel: 'portal',
          status: 'sent',
          sent_at: new Date().toISOString(),
        };

        const { data: newMessage, error: createMessageError } = await supabase
          .from('communications')
          .insert([testMessageData])
          .select()
          .single();

        if (createMessageError) {
          console.log(`   ❌ Error creating test message: ${createMessageError.message}`);
        } else {
          console.log(`   ✅ Test message created: ${newMessage.id}`);
        }
      }
    }

    console.log('\n✅ Communications system test completed!\n');
    console.log('📝 Next steps:');
    console.log('   1. Navigate to /communications in your browser');
    console.log('   2. You should see the test conversation if created');
    console.log('   3. Click "New Message" to compose a message');
    console.log('   4. Select a template to see pre-filled content');
    console.log('   5. Try archiving/restoring conversations\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

testCommunications();
