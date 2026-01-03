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

async function checkTables() {
  console.log('Checking what communications-related tables exist...\n');

  // Try the old communications table
  const { data: oldComm, error: oldErr } = await supabase
    .from('communications')
    .select('id')
    .limit(1);

  if (!oldErr || oldErr.code === 'PGRST116') {
    console.log('✅ Old "communications" table exists');
    const { count } = await supabase
      .from('communications')
      .select('*', { count: 'exact', head: true });
    console.log(`   Records: ${count || 0}`);
  } else {
    console.log('❌ Old "communications" table:', oldErr.message);
  }

  console.log('\nChecking new tables:');
  const newTables = ['conversation_threads', 'message_templates', 'communication_workflows'];

  for (const table of newTables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (!error || error.code === 'PGRST116') {
      console.log(`✅ ${table} exists`);
    } else {
      console.log(`❌ ${table} NOT FOUND`);
    }
  }
}

checkTables();
