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

async function listTables() {
  console.log('\n📋 Analyzing Database Tables...\n');

  try {
    // Get all tables by querying information_schema
    const { data, error } = await supabase.rpc('get_tables');

    if (error) {
      console.log('ℹ️  Using alternative method to check tables...\n');

      // Try checking specific tables
      const tablesToCheck = [
        'people',
        'property_ownership',
        'properties',
        'units',
        'tenants',
        'leases'
      ];

      for (const table of tablesToCheck) {
        try {
          const { error: checkError } = await supabase
            .from(table)
            .select('*')
            .limit(1);

          if (checkError) {
            if (checkError.code === 'PGRST204' || checkError.code === '42P01') {
              console.log(`❌ ${table} - Does NOT exist`);
            } else {
              console.log(`✅ ${table} - Exists`);
            }
          } else {
            console.log(`✅ ${table} - Exists`);
          }
        } catch (e) {
          console.log(`❌ ${table} - Error checking:`, e.message);
        }
      }
    }

    // Check people table structure
    console.log('\n📊 Checking people table structure...');
    const { data: peopleData, error: peopleError } = await supabase
      .from('people')
      .select('*')
      .limit(1);

    if (peopleError) {
      console.log('❌ Error:', peopleError.message);
    } else {
      console.log('✅ people table exists');
      if (peopleData && peopleData.length > 0) {
        console.log('   Columns:', Object.keys(peopleData[0]).join(', '));
      }
    }

    // Check for duplicate emails
    console.log('\n📧 Checking for duplicate emails in people table...');
    const { data: allPeople, error: allError } = await supabase
      .from('people')
      .select('email, first_name, last_name, type');

    if (!allError && allPeople) {
      console.log(`   Total records: ${allPeople.length}`);

      // Find duplicates
      const emailCounts = {};
      allPeople.forEach(person => {
        if (person.email) {
          emailCounts[person.email] = (emailCounts[person.email] || 0) + 1;
        }
      });

      const duplicates = Object.entries(emailCounts).filter(([_, count]) => count > 1);
      if (duplicates.length > 0) {
        console.log('   ⚠️  Duplicate emails found:');
        duplicates.forEach(([email, count]) => {
          console.log(`      - ${email} (${count} times)`);
        });
      } else {
        console.log('   ✅ No duplicate emails');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listTables();
