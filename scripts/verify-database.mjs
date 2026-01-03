/**
 * Database Schema Verification Script (Node.js)
 * Checks which tables exist in Supabase and which schemas need to be executed
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected tables by phase
const PHASE1_TABLES = [
  'bank_accounts',
  'property_ownership',
  'work_orders',
  'payment_templates',
  'payment_history',
  'expenses',
  'audit_logs',
  'lease_amendments',
  'recurring_charges',
  'comments'
];

const PHASE2_TABLES = [
  'lease_renewal_offers',
  'maintenance_schedules',
  'approval_requests',
  'approval_thresholds',
  'notifications',
  'automated_jobs_log',
  'vendor_performance_metrics'
];

const PHASE3_TABLES = [
  'tenant_portal_sessions',
  'tenant_emergency_contacts',
  'tenant_vehicles'
];

async function verifyTables() {
  console.log('🔍 Verifying database schema...\n');
  console.log(`📍 Connected to: ${supabaseUrl}\n`);

  const allTables = [...PHASE1_TABLES, ...PHASE2_TABLES, ...PHASE3_TABLES];
  const existingTables = [];

  // Test each table individually
  for (const table of allTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (!error || error.code === 'PGRST116') {
        // Table exists (PGRST116 = no rows, but table is there)
        existingTables.push(table);
      }
    } catch (err) {
      // Table doesn't exist
    }
  }

  // Check Phase 1
  console.log('📊 PHASE 1 TABLES (10 expected):');
  const phase1Missing = checkPhase(PHASE1_TABLES, existingTables);

  // Check Phase 2
  console.log('\n📊 PHASE 2 TABLES (7 expected):');
  const phase2Missing = checkPhase(PHASE2_TABLES, existingTables);

  // Check Phase 3
  console.log('\n📊 PHASE 3 TABLES (3 expected):');
  const phase3Missing = checkPhase(PHASE3_TABLES, existingTables);

  // Check tenants table for Phase 3 columns
  console.log('\n📊 PHASE 3 TENANT TABLE ENHANCEMENTS:');
  await checkTenantEnhancements();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY:');
  console.log('='.repeat(60));
  console.log(`Phase 1: ${PHASE1_TABLES.length - phase1Missing.length}/${PHASE1_TABLES.length} tables exist`);
  console.log(`Phase 2: ${PHASE2_TABLES.length - phase2Missing.length}/${PHASE2_TABLES.length} tables exist`);
  console.log(`Phase 3: ${PHASE3_TABLES.length - phase3Missing.length}/${PHASE3_TABLES.length} tables exist`);

  const totalExpected = PHASE1_TABLES.length + PHASE2_TABLES.length + PHASE3_TABLES.length;
  const totalMissing = phase1Missing.length + phase2Missing.length + phase3Missing.length;
  const totalExisting = totalExpected - totalMissing;

  console.log(`\nTotal: ${totalExisting}/${totalExpected} tables exist`);

  if (totalMissing > 0) {
    console.log('\n⚠️  SCHEMAS TO EXECUTE:');
    if (phase1Missing.length > 0) {
      console.log('   → database/phase1-missing-tables.sql');
    }
    if (phase2Missing.length > 0) {
      console.log('   → database/phase2-automation-tables.sql');
    }
    if (phase3Missing.length > 0) {
      console.log('   → database/phase3-tenant-portal.sql');
    }
    console.log('\n⚠️  IMPORTANT: Execute schemas in Supabase SQL Editor before continuing!');
    process.exit(1);
  } else {
    console.log('\n✅ All schemas are executed! Database is ready.');
    process.exit(0);
  }
}

function checkPhase(expectedTables, existingTables) {
  const missing = [];

  for (const table of expectedTables) {
    const exists = existingTables.includes(table);
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${table}`);
    if (!exists) {
      missing.push(table);
    }
  }

  return missing;
}

async function checkTenantEnhancements() {
  const requiredColumns = [
    'user_id',
    'portal_access',
    'portal_last_login',
    'portal_onboarding_completed',
    'communication_preferences',
    'profile_photo_url'
  ];

  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      console.log('  ⚠️  Cannot verify tenant enhancements (table might not exist)');
      return;
    }

    // Check if we got data or at least table structure
    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

    if (columns.length === 0) {
      console.log('  ⚠️  No data in tenants table yet (cannot verify columns)');
      return;
    }

    for (const col of requiredColumns) {
      const exists = columns.includes(col);
      const status = exists ? '✅' : '❌';
      console.log(`  ${status} ${col}`);
    }
  } catch (err) {
    console.log('  ⚠️  Cannot verify tenant enhancements:', err.message);
  }
}

// Run verification
verifyTables().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
