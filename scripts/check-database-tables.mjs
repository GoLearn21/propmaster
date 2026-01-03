/**
 * Database verification script
 * Checks Supabase connectivity and lists available tables with row counts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rautdxfkuemmlhcrujxq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdXRkeGZrdWVtbWxoY3J1anhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDYyMDUsImV4cCI6MjA3NzMyMjIwNX0.8-cYRr4C4eeXMfaT3ikEjOuWOTK4yHvcCrbePfJSDcs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tables we expect based on the schema
const expectedTables = [
  'properties',
  'units',
  'people',
  'tenants',
  'leases',
  'payments',
  'work_orders',
  'bank_accounts',
  'billing_schedules',
  'tenant_payment_methods',
  'payment_templates',
  'late_fees',
  'calendar_events',
  'communications',
  'notes',
  'vendors',
  'owners',
  'property_ownership'
];

async function checkDatabase() {
  console.log('🔍 Checking Supabase Database Connection...\n');
  console.log(`URL: ${supabaseUrl}\n`);

  const results = [];

  for (const table of expectedTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.push({
          table,
          status: '❌ ERROR',
          count: '-',
          error: error.message
        });
      } else {
        results.push({
          table,
          status: '✅ OK',
          count: count || 0,
          error: null
        });
      }
    } catch (err) {
      results.push({
        table,
        status: '❌ EXCEPTION',
        count: '-',
        error: err.message
      });
    }
  }

  // Print results table
  console.log('📊 Database Tables Status:\n');
  console.log('┌────────────────────────────┬──────────┬─────────┐');
  console.log('│ Table                      │ Status   │ Rows    │');
  console.log('├────────────────────────────┼──────────┼─────────┤');

  for (const r of results) {
    const tablePad = r.table.padEnd(26);
    const statusPad = r.status.padEnd(8);
    const countPad = String(r.count).padStart(7);
    console.log(`│ ${tablePad} │ ${statusPad} │ ${countPad} │`);
    if (r.error) {
      console.log(`│   └─ Error: ${r.error.substring(0, 50).padEnd(50)} │`);
    }
  }

  console.log('└────────────────────────────┴──────────┴─────────┘');

  // Summary
  const okCount = results.filter(r => r.status === '✅ OK').length;
  const errorCount = results.filter(r => r.status !== '✅ OK').length;
  const totalRows = results
    .filter(r => typeof r.count === 'number')
    .reduce((sum, r) => sum + r.count, 0);

  console.log(`\n📈 Summary:`);
  console.log(`   Tables accessible: ${okCount}/${expectedTables.length}`);
  console.log(`   Tables with errors: ${errorCount}`);
  console.log(`   Total rows: ${totalRows}`);

  // Try to get sample data from key tables
  console.log('\n📋 Sample Data from Key Tables:\n');

  // Properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, address, type, total_units, status')
    .limit(5);

  if (properties && properties.length > 0) {
    console.log('Properties:');
    properties.forEach(p => console.log(`  - ${p.name} (${p.type}) - ${p.total_units} units - ${p.status}`));
  } else {
    console.log('Properties: No data found');
  }

  // Tenants - get all columns to see actual schema
  const { data: tenants, error: tenantsErr } = await supabase
    .from('tenants')
    .select('*')
    .limit(5);

  if (tenantsErr) {
    console.log('\nTenants Error:', tenantsErr.message);
  } else if (tenants && tenants.length > 0) {
    console.log('\nTenants Table Columns:', Object.keys(tenants[0]).join(', '));
    console.log('Sample Tenant:', JSON.stringify(tenants[0], null, 2));
  } else {
    console.log('\nTenants: No data found');
  }

  // Payments - get all columns to see actual schema
  const { data: payments, error: paymentsErr } = await supabase
    .from('payments')
    .select('*')
    .limit(5);

  if (paymentsErr) {
    console.log('\nPayments Error:', paymentsErr.message);
  } else if (payments && payments.length > 0) {
    console.log('\nPayments Table Columns:', Object.keys(payments[0]).join(', '));
    console.log('Sample Payment:', JSON.stringify(payments[0], null, 2));
  } else {
    console.log('\nPayments: No data found');
  }

  // Leases
  const { data: leases } = await supabase
    .from('leases')
    .select('id, lease_number, monthly_rent, status, start_date, end_date')
    .limit(5);

  if (leases && leases.length > 0) {
    console.log('\nLeases:');
    leases.forEach(l => console.log(`  - ${l.lease_number} - $${l.monthly_rent}/mo - ${l.status}`));
  } else {
    console.log('\nLeases: No data found');
  }

  return { okCount, errorCount, totalRows };
}

checkDatabase()
  .then(({ okCount, errorCount }) => {
    if (errorCount > 0) {
      console.log('\n⚠️  Some tables are not accessible. You may need to run the database migrations.');
    } else {
      console.log('\n✅ All expected tables are accessible!');
    }
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
