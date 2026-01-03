import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCalendarEvents() {
  console.log('\n📅 Checking Calendar Events...\n');

  try {
    // Get all events
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start_time');

    if (error) {
      console.error('❌ Error fetching events:', error.message);
      return;
    }

    if (!events || events.length === 0) {
      console.log('⚠️  No events found in database');
      return;
    }

    console.log(`✅ Found ${events.length} events:\n`);

    events.forEach((event, index) => {
      const startDate = new Date(event.start_time);
      const endDate = new Date(event.end_time);
      const now = new Date();

      console.log(`${index + 1}. ${event.title}`);
      console.log(`   Type: ${event.event_type}`);
      console.log(`   Status: ${event.status}`);
      console.log(`   Start: ${startDate.toLocaleString()}`);
      console.log(`   End: ${endDate.toLocaleString()}`);
      console.log(`   Is Future: ${startDate > now ? 'Yes' : 'No'}`);
      console.log(`   Created By: ${event.created_by}`);
      console.log('');
    });

    // Get current month info
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    console.log(`\n📆 Current Date: ${now.toLocaleDateString()}`);
    console.log(`   Current Month: ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n`);

    // Check events in current month
    const currentMonthEvents = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    });

    console.log(`📊 Events in current month: ${currentMonthEvents.length}`);
    if (currentMonthEvents.length > 0) {
      console.log('   Events:');
      currentMonthEvents.forEach(event => {
        console.log(`   - ${event.title} (${new Date(event.start_time).toLocaleDateString()})`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkCalendarEvents();
