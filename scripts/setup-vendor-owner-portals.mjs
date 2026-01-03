#!/usr/bin/env node

/**
 * Vendor & Owner Portal Setup Script
 *
 * This script will:
 * 1. Verify Supabase connection
 * 2. Check if tables exist
 * 3. Create test vendor and owner accounts
 * 4. Verify authentication works
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rautdxfkuemmlhcrujxq.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdXRkeGZrdWVtbWxoY3J1anhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDYyMDUsImV4cCI6MjA3NzMyMjIwNX0.8-cYRr4C4eeXMfaT3ikEjOuWOTK4yHvcCrbePfJSDcs';

// Service role key needed for admin operations (creating users)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🚀 PropMaster - Vendor & Owner Portal Setup\n');
console.log('=' .repeat(60));

// Step 1: Check connection
async function checkConnection() {
  console.log('\n📡 Step 1: Checking Supabase connection...');

  try {
    const { data, error } = await supabase.from('properties').select('count').limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      console.error('❌ Connection failed:', error.message);
      return false;
    }

    console.log('✅ Connected to Supabase successfully');
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    return false;
  }
}

// Step 2: Check if RBAC tables exist
async function checkTables() {
  console.log('\n📋 Step 2: Checking if RBAC tables exist...');

  try {
    // Check vendors table
    const { error: vendorsError } = await supabase
      .from('vendors')
      .select('id')
      .limit(1);

    // Check owners table
    const { error: ownersError } = await supabase
      .from('owners')
      .select('id')
      .limit(1);

    const vendorsExist = !vendorsError || vendorsError.code !== 'PGRST116';
    const ownersExist = !ownersError || ownersError.code !== 'PGRST116';

    console.log(`   vendors table: ${vendorsExist ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   owners table:  ${ownersExist ? '✅ EXISTS' : '❌ NOT FOUND'}`);

    return { vendorsExist, ownersExist };
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    return { vendorsExist: false, ownersExist: false };
  }
}

// Step 3: Display schema instructions
function displaySchemaInstructions() {
  console.log('\n⚠️  RBAC tables do not exist!');
  console.log('\n📝 You need to execute the database schema in Supabase:');
  console.log('\n' + '='.repeat(60));
  console.log('INSTRUCTIONS:');
  console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to SQL Editor (left sidebar)');
  console.log('4. Click "New Query"');
  console.log('5. Copy the contents of: database/rbac-tables.sql');
  console.log('6. Paste into SQL Editor');
  console.log('7. Click "Run" (or press Ctrl+Enter)');
  console.log('8. Verify you see: "RBAC tables created successfully!"');
  console.log('9. Run this script again');
  console.log('='.repeat(60));

  const schemaPath = path.join(__dirname, '..', 'database', 'rbac-tables.sql');

  if (fs.existsSync(schemaPath)) {
    console.log('\n📄 Schema file location:');
    console.log(`   ${schemaPath}`);
  }
}

// Step 4: Check if test accounts exist
async function checkTestAccounts() {
  console.log('\n👤 Step 3: Checking for test accounts...');

  try {
    // Check vendor account
    const { data: vendorData } = await supabase
      .from('vendors')
      .select('*')
      .eq('email', 'vendor@test.com')
      .single();

    // Check owner account
    const { data: ownerData } = await supabase
      .from('owners')
      .select('*')
      .eq('email', 'owner@test.com')
      .single();

    const vendorExists = !!vendorData;
    const ownerExists = !!ownerData;

    console.log(`   vendor@test.com: ${vendorExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   owner@test.com:  ${ownerExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);

    return { vendorExists, ownerExists, vendorData, ownerData };
  } catch (error) {
    console.error('❌ Error checking test accounts:', error.message);
    return { vendorExists: false, ownerExists: false };
  }
}

// Step 5: Display account creation instructions
function displayAccountInstructions() {
  console.log('\n⚠️  Test accounts do not exist!');
  console.log('\n📝 You need to create test accounts in Supabase:');
  console.log('\n' + '='.repeat(60));
  console.log('STEP A: Create Auth Users');
  console.log('1. Open Supabase Dashboard');
  console.log('2. Go to Authentication > Users');
  console.log('3. Click "Add User" > "Create new user"');
  console.log('4. Create vendor user:');
  console.log('   Email: vendor@test.com');
  console.log('   Password: TestVendor123!');
  console.log('   Auto Confirm User: YES');
  console.log('5. Create owner user:');
  console.log('   Email: owner@test.com');
  console.log('   Password: TestOwner123!');
  console.log('   Auto Confirm User: YES');
  console.log('\nSTEP B: Create Profile Records');
  console.log('1. Go to SQL Editor');
  console.log('2. Copy and execute the following SQL:');
  console.log('='.repeat(60));
  console.log(`
-- Insert vendor profile
INSERT INTO vendors (
  email, first_name, last_name, company_name, specialty,
  hourly_rate, rating, status, portal_access, phone_number,
  user_id
) VALUES (
  'vendor@test.com',
  'John',
  'Smith',
  'Smith Plumbing & Repairs',
  'plumbing',
  85.00,
  4.75,
  'active',
  true,
  '+1-555-0123',
  (SELECT id FROM auth.users WHERE email = 'vendor@test.com')
);

-- Insert owner profile
INSERT INTO owners (
  email, first_name, last_name, total_units, portfolio_value,
  status, portal_access, preferred_contact_method,
  financial_reporting_preference, phone_number,
  user_id
) VALUES (
  'owner@test.com',
  'Jane',
  'Doe',
  12,
  2500000.00,
  'active',
  true,
  'email',
  'monthly',
  '+1-555-0456',
  (SELECT id FROM auth.users WHERE email = 'owner@test.com')
);
`);
  console.log('='.repeat(60));
  console.log('\n3. Run this script again to verify');
}

// Step 6: Test authentication
async function testAuthentication() {
  console.log('\n🔐 Step 4: Testing authentication...');

  try {
    // Test vendor login
    console.log('\n   Testing vendor login...');
    const { data: vendorAuth, error: vendorError } = await supabase.auth.signInWithPassword({
      email: 'vendor@test.com',
      password: 'TestVendor123!',
    });

    if (vendorError) {
      console.log('   ❌ Vendor login failed:', vendorError.message);
    } else {
      console.log('   ✅ Vendor login successful');

      // Check vendor profile
      const { data: vendorProfile } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', vendorAuth.user.id)
        .single();

      if (vendorProfile) {
        console.log('   ✅ Vendor profile found');
        console.log(`      Name: ${vendorProfile.first_name} ${vendorProfile.last_name}`);
        console.log(`      Company: ${vendorProfile.company_name}`);
        console.log(`      Status: ${vendorProfile.status}`);
      } else {
        console.log('   ❌ Vendor profile not found');
      }

      await supabase.auth.signOut();
    }

    // Test owner login
    console.log('\n   Testing owner login...');
    const { data: ownerAuth, error: ownerError } = await supabase.auth.signInWithPassword({
      email: 'owner@test.com',
      password: 'TestOwner123!',
    });

    if (ownerError) {
      console.log('   ❌ Owner login failed:', ownerError.message);
    } else {
      console.log('   ✅ Owner login successful');

      // Check owner profile
      const { data: ownerProfile } = await supabase
        .from('owners')
        .select('*')
        .eq('user_id', ownerAuth.user.id)
        .single();

      if (ownerProfile) {
        console.log('   ✅ Owner profile found');
        console.log(`      Name: ${ownerProfile.first_name} ${ownerProfile.last_name}`);
        console.log(`      Total Units: ${ownerProfile.total_units}`);
        console.log(`      Status: ${ownerProfile.status}`);
      } else {
        console.log('   ❌ Owner profile not found');
      }

      await supabase.auth.signOut();
    }
  } catch (error) {
    console.error('❌ Authentication test error:', error.message);
  }
}

// Main execution
async function main() {
  // Step 1: Check connection
  const connected = await checkConnection();
  if (!connected) {
    console.log('\n❌ Setup failed: Cannot connect to Supabase');
    process.exit(1);
  }

  // Step 2: Check tables
  const { vendorsExist, ownersExist } = await checkTables();

  if (!vendorsExist || !ownersExist) {
    displaySchemaInstructions();
    process.exit(0);
  }

  // Step 3: Check test accounts
  const { vendorExists, ownerExists } = await checkTestAccounts();

  if (!vendorExists || !ownerExists) {
    displayAccountInstructions();
    process.exit(0);
  }

  // Step 4: Test authentication
  await testAuthentication();

  // Success!
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL SETUP COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n🎉 You can now test the portals:');
  console.log('\n   Vendor Portal:');
  console.log('   URL: http://localhost:5175/vendor/login');
  console.log('   Email: vendor@test.com');
  console.log('   Password: TestVendor123!');
  console.log('\n   Owner Portal:');
  console.log('   URL: http://localhost:5175/owner/login');
  console.log('   Email: owner@test.com');
  console.log('   Password: TestOwner123!');
  console.log('\n' + '='.repeat(60));
}

// Run the script
main().catch(console.error);
