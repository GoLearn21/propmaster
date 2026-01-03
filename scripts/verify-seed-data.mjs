/**
 * Verify Seed Data Script for PropMaster
 * =======================================
 * Validates that seed data is properly inserted and meets requirements
 *
 * Usage:
 *   node scripts/verify-seed-data.mjs
 *   node scripts/verify-seed-data.mjs --detailed   # Show detailed breakdown
 *   node scripts/verify-seed-data.mjs --json       # Output as JSON
 */

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

const args = process.argv.slice(2);
const isDetailed = args.includes('--detailed');
const isJson = args.includes('--json');

// Verification requirements
const REQUIREMENTS = {
  properties: { min: 100, description: 'Properties across NC, SC, GA' },
  units: { min: 500, description: 'Units across all properties' },
  tenants: { min: 400, description: 'Active tenants' },
  leases: { min: 400, description: 'Lease agreements' },
  payments: { min: 1000, description: 'Payment records' },
  billing_configurations: { min: 100, description: 'Billing configurations' },
  security_deposits: { min: 300, description: 'Security deposits' },
  work_orders: { min: 100, description: 'Work orders' },
};

const STATE_REQUIREMENTS = {
  NC: { properties: 50, description: 'North Carolina properties' },
  SC: { properties: 40, description: 'South Carolina properties' },
  GA: { properties: 40, description: 'Georgia properties' },
};

async function getCount(table, filter = null) {
  try {
    let query = supabase.from(table).select('id', { count: 'exact', head: true });
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    const { count, error } = await query;
    if (error) return { count: 0, error: error.message };
    return { count: count || 0, error: null };
  } catch (err) {
    return { count: 0, error: err.message };
  }
}

async function getStateBreakdown() {
  const { data, error } = await supabase
    .from('properties')
    .select('state');

  if (error) return { NC: 0, SC: 0, GA: 0 };

  const breakdown = { NC: 0, SC: 0, GA: 0 };
  (data || []).forEach(p => {
    if (breakdown[p.state] !== undefined) breakdown[p.state]++;
  });
  return breakdown;
}

async function getOccupancyStats() {
  const { data, error } = await supabase
    .from('units')
    .select('status');

  if (error) return { occupied: 0, vacant: 0, total: 0, rate: 0 };

  const occupied = (data || []).filter(u => u.status === 'occupied').length;
  const total = data?.length || 0;

  return {
    occupied,
    vacant: total - occupied,
    total,
    rate: total > 0 ? ((occupied / total) * 100).toFixed(1) : 0,
  };
}

async function getPaymentStats() {
  const { data, error } = await supabase
    .from('payments')
    .select('status, amount');

  if (error) return { paid: 0, pending: 0, overdue: 0, total: 0 };

  const stats = {
    paid: 0,
    pending: 0,
    overdue: 0,
    late: 0,
    total: data?.length || 0,
    totalAmount: 0,
  };

  (data || []).forEach(p => {
    if (stats[p.status] !== undefined) stats[p.status]++;
    stats.totalAmount += parseFloat(p.amount) || 0;
  });

  return stats;
}

async function getComplianceStats() {
  const { data, error } = await supabase
    .from('billing_configurations')
    .select('compliance_status, state');

  if (error) return { compliant: 0, warning: 0, non_compliant: 0 };

  const stats = { compliant: 0, warning: 0, non_compliant: 0, byState: {} };

  (data || []).forEach(c => {
    if (stats[c.compliance_status] !== undefined) stats[c.compliance_status]++;
    if (!stats.byState[c.state]) stats.byState[c.state] = { total: 0, compliant: 0 };
    stats.byState[c.state].total++;
    if (c.compliance_status === 'compliant') stats.byState[c.state].compliant++;
  });

  return stats;
}

async function verifySeedData() {
  const results = {
    timestamp: new Date().toISOString(),
    passed: true,
    tables: {},
    states: {},
    stats: {},
    errors: [],
  };

  if (!isJson) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     PropMaster Seed Data Verification                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
  }

  // Check table counts
  if (!isJson) console.log('📊 Table Counts:\n');

  for (const [table, req] of Object.entries(REQUIREMENTS)) {
    const { count, error } = await getCount(table);
    const passed = count >= req.min;

    results.tables[table] = {
      count,
      required: req.min,
      passed,
      error,
    };

    if (!passed) results.passed = false;
    if (error) results.errors.push({ table, error });

    if (!isJson) {
      const icon = error ? '⚠️ ' : passed ? '✅' : '❌';
      console.log(`  ${icon} ${table}: ${count.toLocaleString()} / ${req.min} min`);
      if (error) console.log(`      Error: ${error}`);
    }
  }

  // Check state breakdown
  if (!isJson) console.log('\n📍 State Distribution:\n');

  const stateBreakdown = await getStateBreakdown();
  for (const [state, req] of Object.entries(STATE_REQUIREMENTS)) {
    const count = stateBreakdown[state] || 0;
    const passed = count >= req.properties;

    results.states[state] = {
      count,
      required: req.properties,
      passed,
    };

    if (!passed) results.passed = false;

    if (!isJson) {
      const icon = passed ? '✅' : '❌';
      console.log(`  ${icon} ${state}: ${count} / ${req.properties} min`);
    }
  }

  // Additional stats
  const occupancy = await getOccupancyStats();
  const payments = await getPaymentStats();
  const compliance = await getComplianceStats();

  results.stats = { occupancy, payments, compliance };

  if (!isJson && isDetailed) {
    console.log('\n📈 Detailed Statistics:\n');

    console.log('  Occupancy:');
    console.log(`    - Occupied units: ${occupancy.occupied.toLocaleString()}`);
    console.log(`    - Vacant units: ${occupancy.vacant.toLocaleString()}`);
    console.log(`    - Occupancy rate: ${occupancy.rate}%`);

    console.log('\n  Payments:');
    console.log(`    - Total payments: ${payments.total.toLocaleString()}`);
    console.log(`    - Paid: ${payments.paid.toLocaleString()}`);
    console.log(`    - Pending: ${payments.pending.toLocaleString()}`);
    console.log(`    - Overdue: ${payments.overdue.toLocaleString()}`);
    console.log(`    - Late: ${payments.late.toLocaleString()}`);
    console.log(`    - Total amount: $${payments.totalAmount.toLocaleString()}`);

    console.log('\n  Compliance:');
    console.log(`    - Compliant: ${compliance.compliant}`);
    console.log(`    - Warning: ${compliance.warning}`);
    console.log(`    - Non-compliant: ${compliance.non_compliant}`);

    if (Object.keys(compliance.byState).length > 0) {
      console.log('    By State:');
      for (const [state, stats] of Object.entries(compliance.byState)) {
        const rate = stats.total > 0 ? ((stats.compliant / stats.total) * 100).toFixed(1) : 0;
        console.log(`      - ${state}: ${stats.compliant}/${stats.total} (${rate}% compliant)`);
      }
    }
  }

  if (!isJson) {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    if (results.passed) {
      console.log('║              ✅ VERIFICATION PASSED                        ║');
    } else {
      console.log('║              ❌ VERIFICATION FAILED                        ║');
    }
    console.log('╚════════════════════════════════════════════════════════════╝');

    if (!results.passed) {
      console.log('\n⚠️  Some requirements not met. Run seed-master-data.mjs to seed.');
    }
    console.log('');
  }

  if (isJson) {
    console.log(JSON.stringify(results, null, 2));
  }

  process.exit(results.passed ? 0 : 1);
}

verifySeedData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
