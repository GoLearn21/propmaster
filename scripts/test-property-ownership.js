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

async function testPropertyOwnership() {
  console.log('\n🔍 Testing property_ownership queries...\n');

  try {
    // Test 1: Basic select
    console.log('Test 1: Basic select from property_ownership');
    const { data: test1, error: error1 } = await supabase
      .from('property_ownership')
      .select('*')
      .limit(5);

    if (error1) {
      console.log('❌ Error:', error1);
    } else {
      console.log(`✅ Success - Found ${test1?.length || 0} records`);
      if (test1 && test1.length > 0) {
        console.log('   Sample record:', test1[0]);
      }
    }

    // Test 2: With .is('end_date', null)
    console.log('\nTest 2: Select with .is("end_date", null)');
    const { data: test2, error: error2 } = await supabase
      .from('property_ownership')
      .select('property_id')
      .is('end_date', null);

    if (error2) {
      console.log('❌ Error:', error2);
    } else {
      console.log(`✅ Success - Found ${test2?.length || 0} records with null end_date`);
    }

    // Test 3: Count all records
    console.log('\nTest 3: Count all property_ownership records');
    const { count, error: error3 } = await supabase
      .from('property_ownership')
      .select('*', { count: 'exact', head: true });

    if (error3) {
      console.log('❌ Error:', error3);
    } else {
      console.log(`✅ Total records: ${count}`);
    }

    // Test 4: Check table structure
    console.log('\nTest 4: Check property_ownership table structure');
    const { data: test4, error: error4 } = await supabase
      .from('property_ownership')
      .select('*')
      .limit(1);

    if (!error4 && test4 && test4.length > 0) {
      console.log('   Columns:', Object.keys(test4[0]).join(', '));
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testPropertyOwnership();
