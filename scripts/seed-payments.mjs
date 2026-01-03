/**
 * Seed payments using existing leases and tenants from database
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPayments() {
  console.log('Seeding payments using existing data...\n');

  // Get existing leases with tenant info
  const { data: leases, error: leaseErr } = await supabase
    .from('leases')
    .select('id, tenant_id, property_id, unit_id, monthly_rent')
    .eq('status', 'active');

  if (leaseErr) {
    console.error('Error fetching leases:', leaseErr.message);
    return;
  }

  console.log(`Found ${leases.length} active leases`);

  // Get existing tenants
  const { data: tenants, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, balance_due, rent_amount');

  if (tenantErr) {
    console.error('Error fetching tenants:', tenantErr.message);
    return;
  }

  const tenantMap = new Map(tenants.map(t => [t.id, t]));
  const payments = [];
  const now = new Date();
  // Use only 'online' which exists in the database - the check constraint may be strict
  const paymentMethods = ['online'];

  leases.forEach((lease, idx) => {
    const tenant = tenantMap.get(lease.tenant_id);
    if (!tenant) return;

    // Generate 3-6 months of payment history
    const monthsHistory = 3 + Math.floor(Math.random() * 4);

    for (let m = 0; m < monthsHistory; m++) {
      const dueDate = new Date(now);
      dueDate.setMonth(dueDate.getMonth() - m);
      dueDate.setDate(1);

      const isCurrent = m === 0;
      const rentAmount = lease.monthly_rent || tenant.rent_amount || 1500;
      const paymentStatus = isCurrent
        ? (tenant.balance_due > rentAmount ? 'overdue' : tenant.balance_due > 0 ? 'pending' : 'paid')
        : 'paid';

      const paidDate = paymentStatus === 'paid'
        ? new Date(dueDate.getFullYear(), dueDate.getMonth(), Math.floor(Math.random() * 5) + 1)
        : null;

      payments.push({
        id: randomUUID(),
        lease_id: lease.id,
        tenant_id: lease.tenant_id,
        property_id: lease.property_id,
        unit_id: lease.unit_id,
        payment_number: `PMT-${Date.now()}-${String(payments.length + 1).padStart(5, '0')}`,
        payment_type: 'rent',
        amount: rentAmount,
        due_date: dueDate.toISOString().split('T')[0],
        paid_date: paidDate?.toISOString() || null,
        payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status: paymentStatus,
        notes: `Monthly rent - ${dueDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        currency: 'usd'
      });
    }
  });

  console.log(`Generated ${payments.length} payments`);

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < payments.length; i += batchSize) {
    const batch = payments.slice(i, i + batchSize);
    const { error } = await supabase.from('payments').insert(batch);

    if (error) {
      console.log(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
      errors++;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\nInserted ${inserted} payments, ${errors} batches failed`);

  // Count total payments
  const { count } = await supabase.from('payments').select('*', { count: 'exact', head: true });
  console.log(`Total payments in database: ${count}`);
}

seedPayments().catch(console.error);
