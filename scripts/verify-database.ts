/**
 * Database Schema Verification Script
 * Checks which tables exist in Supabase and which schemas need to be executed
 */

import { supabase } from '../src/lib/supabase';

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

  try {
    // Query information_schema to get all public tables
    const { data, error } = await supabase.rpc('get_public_tables', {});

    if (error) {
      // Fallback: try to query each table individually
      console.log('ℹ️  Using fallback verification method...\n');
      return await verifyTablesFallback();
    }

    const existingTables = data.map((row: any) => row.table_name);

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
    } else {
      console.log('\n✅ All schemas are executed! Database is ready.');
    }

  } catch (err) {
    console.error('❌ Error verifying database:', err);
    process.exit(1);
  }
}

function checkPhase(expectedTables: string[], existingTables: string[]): string[] {
  const missing: string[] = [];

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

    for (const col of requiredColumns) {
      const exists = columns.includes(col);
      const status = exists ? '✅' : '❌';
      console.log(`  ${status} ${col}`);
    }
  } catch (err) {
    console.log('  ⚠️  Cannot verify tenant enhancements:', err);
  }
}

async function verifyTablesFallback(): Promise<void> {
  console.log('Testing each table individually...\n');

  const allTables = [...PHASE1_TABLES, ...PHASE2_TABLES, ...PHASE3_TABLES];
  const existingTables: string[] = [];

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

  // Now check each phase
  console.log('📊 PHASE 1 TABLES (10 expected):');
  const phase1Missing = checkPhase(PHASE1_TABLES, existingTables);

  console.log('\n📊 PHASE 2 TABLES (7 expected):');
  const phase2Missing = checkPhase(PHASE2_TABLES, existingTables);

  console.log('\n📊 PHASE 3 TABLES (3 expected):');
  const phase3Missing = checkPhase(PHASE3_TABLES, existingTables);

  console.log('\n📊 PHASE 3 TENANT TABLE ENHANCEMENTS:');
  await checkTenantEnhancements();

  // Summary
  const totalExpected = allTables.length;
  const totalMissing = phase1Missing.length + phase2Missing.length + phase3Missing.length;
  const totalExisting = totalExpected - totalMissing;

  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY:');
  console.log('='.repeat(60));
  console.log(`Total: ${totalExisting}/${totalExpected} tables exist`);

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
  } else {
    console.log('\n✅ All schemas are executed! Database is ready.');
  }
}

// Run verification
verifyTables();
