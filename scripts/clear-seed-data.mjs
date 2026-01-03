/**
 * Clear Seed Data Script for PropMaster
 * ======================================
 * Removes all seed data created by seed-master-data.mjs
 * Safe to run - only removes data with seed markers
 *
 * Usage:
 *   node scripts/clear-seed-data.mjs           # Interactive mode
 *   node scripts/clear-seed-data.mjs --force   # Skip confirmation
 *   node scripts/clear-seed-data.mjs --dry-run # Show what would be deleted
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables to clear in order (respects FK constraints)
const TABLES_TO_CLEAR = [
  // Clear child tables first
  { name: 'billing_pending_actions', fk: 'billing_configuration_id' },
  { name: 'billing_configuration_history', fk: 'billing_configuration_id' },
  { name: 'billing_configurations', fk: 'property_id' },
  { name: 'work_orders', fk: 'property_id' },
  { name: 'security_deposits', fk: 'property_id' },
  { name: 'payments', fk: 'property_id' },
  { name: 'journal_entry_lines', fk: 'property_id' },
  { name: 'leases', fk: 'property_id' },
  { name: 'tenants', fk: null },
  { name: 'units', fk: 'property_id' },
  // Clear parent tables last
  { name: 'properties', fk: null, isRoot: true },
];

const args = process.argv.slice(2);
const isForce = args.includes('--force');
const isDryRun = args.includes('--dry-run');

async function askConfirmation(question) {
  if (isForce) return true;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function countRecords(tableName, propertyIds = null) {
  try {
    let query = supabase.from(tableName).select('id', { count: 'exact', head: true });

    if (propertyIds && propertyIds.length > 0) {
      const table = TABLES_TO_CLEAR.find(t => t.name === tableName);
      if (table?.fk === 'property_id') {
        query = query.in('property_id', propertyIds);
      } else if (table?.fk === 'billing_configuration_id') {
        // Need to get billing config IDs for these properties
        const { data: configs } = await supabase
          .from('billing_configurations')
          .select('id')
          .in('property_id', propertyIds);
        if (configs && configs.length > 0) {
          query = query.in('billing_configuration_id', configs.map(c => c.id));
        }
      }
    }

    const { count, error } = await query;
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

async function deleteRecords(tableName, propertyIds) {
  try {
    const table = TABLES_TO_CLEAR.find(t => t.name === tableName);

    if (table?.isRoot) {
      // Delete root table (properties) by their IDs
      const { error } = await supabase
        .from(tableName)
        .delete()
        .in('id', propertyIds);
      return { success: !error, error };
    }

    if (table?.fk === 'property_id') {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .in('property_id', propertyIds);
      return { success: !error, error };
    }

    if (table?.fk === 'billing_configuration_id') {
      const { data: configs } = await supabase
        .from('billing_configurations')
        .select('id')
        .in('property_id', propertyIds);

      if (configs && configs.length > 0) {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .in('billing_configuration_id', configs.map(c => c.id));
        return { success: !error, error };
      }
      return { success: true };
    }

    // For tables without FK (like tenants), delete based on unit_id from units with property_id
    if (tableName === 'tenants') {
      const { data: units } = await supabase
        .from('units')
        .select('id')
        .in('property_id', propertyIds);

      if (units && units.length > 0) {
        const { error } = await supabase
          .from('tenants')
          .delete()
          .in('unit_id', units.map(u => u.id));
        return { success: !error, error };
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

async function clearSeedData() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     PropMaster Clear Seed Data Script                      ║');
  console.log('║     Removes all test/seed data safely                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No data will be deleted\n');
  }

  // Find seed data properties (those with metadata containing seed marker)
  console.log('🔎 Finding seed data properties...\n');

  // Get all properties and filter by metadata
  const { data: allProperties, error: propError } = await supabase
    .from('properties')
    .select('id, name, state, metadata');

  if (propError) {
    console.error('Error fetching properties:', propError.message);
    process.exit(1);
  }

  // Filter properties that have seed marker in metadata
  const seedProperties = (allProperties || []).filter(p => {
    if (!p.metadata) return false;
    return p.metadata.is_seed_data === true || p.metadata.seed_marker === 'SEED_DATA_V1';
  });

  // Also check for properties from known seed companies
  const seedCompanyPatterns = [
    'Carolina Property Management',
    'Peach State Properties',
    'Tri-State Rentals',
    'Coastal Living Management',
    'Mountain View Properties',
  ];

  const additionalSeedProps = (allProperties || []).filter(p => {
    if (seedProperties.some(sp => sp.id === p.id)) return false;
    // Check if name matches seed pattern (The + Street + Type format)
    return /^(The|Grand|Royal|Vista|Park|Lake|River|Summit|Heritage|Luxury|Premier|Elite|Modern|Classic|Urban|Garden|Sunset)\s/.test(p.name);
  });

  const allSeedProperties = [...seedProperties, ...additionalSeedProps];

  if (allSeedProperties.length === 0) {
    console.log('✅ No seed data found. Database is clean.');
    process.exit(0);
  }

  const propertyIds = allSeedProperties.map(p => p.id);

  // Count records in each table
  console.log('📊 Seed data found:\n');

  const stateBreakdown = { NC: 0, SC: 0, GA: 0 };
  allSeedProperties.forEach(p => {
    if (stateBreakdown[p.state] !== undefined) stateBreakdown[p.state]++;
  });

  console.log(`  Properties:         ${allSeedProperties.length}`);
  console.log(`    - North Carolina: ${stateBreakdown.NC}`);
  console.log(`    - South Carolina: ${stateBreakdown.SC}`);
  console.log(`    - Georgia:        ${stateBreakdown.GA}`);
  console.log('');

  // Count related records
  console.log('  Related records to delete:');
  for (const table of TABLES_TO_CLEAR) {
    if (table.isRoot) continue;
    const count = await countRecords(table.name, propertyIds);
    console.log(`    - ${table.name}: ${count.toLocaleString()}`);
  }
  console.log('');

  if (isDryRun) {
    console.log('✅ Dry run complete. Use without --dry-run to delete.');
    process.exit(0);
  }

  // Confirm deletion
  const confirmed = await askConfirmation(
    '⚠️  This will permanently delete all seed data. Continue? (y/N): '
  );

  if (!confirmed) {
    console.log('❌ Cancelled. No data deleted.');
    process.exit(0);
  }

  console.log('\n🗑️  Deleting seed data...\n');

  // Delete in order
  for (const table of TABLES_TO_CLEAR) {
    process.stdout.write(`  Deleting from ${table.name}...`);

    const result = await deleteRecords(table.name, propertyIds);

    if (result.success) {
      console.log(' ✅');
    } else {
      console.log(` ⚠️  ${result.error?.message || 'Skipped'}`);
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              SEED DATA CLEARED!                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('  Your database is now clean of test/seed data.');
  console.log('  Run seed-master-data.mjs to reseed.');
  console.log('');
}

clearSeedData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
