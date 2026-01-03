import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('\n📋 Checking All People-Related Tables...\n');

  const tablesToCheck = [
    'people',
    'people_owners',
    'people_vendors',
    'people_prospects',
    'tenants',
    'property_ownership'
  ];

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
          console.log(`❌ ${table} - Does NOT exist`);
          if (error.hint) {
            console.log(`   Hint: ${error.hint}`);
          }
        } else {
          console.log(`⚠️  ${table} - Error: ${error.message}`);
        }
      } else {
        console.log(`✅ ${table} - Exists (${count || 0} records)`);
        if (data && data.length > 0) {
          console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (e) {
      console.log(`❌ ${table} - Exception: ${e.message}`);
    }
  }

  console.log('\n📊 Summary:');
  console.log('The peopleService.ts is trying to query property_ownership table');
  console.log('but this table does not exist in the database schema.');
  console.log('\nPossible solutions:');
  console.log('1. Create the property_ownership table');
  console.log('2. Remove/comment out the property_ownership queries');
  console.log('3. Use a different table structure for owner properties');
}

checkTables();
