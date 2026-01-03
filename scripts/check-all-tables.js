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
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTables() {
  console.log('Checking all tables in public schema...\n');

  try {
    // Query information_schema to get all tables
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
      });

    if (error) {
      console.log('Direct query not available. Trying alternative method...\n');

      // Try checking specific tables individually
      const tablesToCheck = [
        'conversation_threads',
        'communications',
        'message_templates',
        'communication_workflows',
        'communication_preferences',
        'delivery_tracking',
        'quick_replies',
        'properties',
        'units',
        'people'
      ];

      console.log('Checking individual tables:\n');
      for (const table of tablesToCheck) {
        const { error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(0);

        if (!tableError) {
          console.log(`✅ ${table}`);
        } else if (tableError.code === 'PGRST204') {
          console.log(`✅ ${table} (empty)`);
        } else {
          console.log(`❌ ${table}: ${tableError.message}`);
        }
      }
    } else {
      console.log('Tables found:', data);
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

checkAllTables();
