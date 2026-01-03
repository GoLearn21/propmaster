/**
 * Production-Quality Seed Data Script
 * Matches actual Supabase schema exactly.
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const uuid = () => randomUUID();

// ========== PROPERTY DATA ==========
// Schema: id, name, address, city, state, zip_code, property_type

const PROPERTIES = [
  {
    id: uuid(),
    name: 'Magnolia Gardens Apartments',
    address: '1250 Magnolia Ave',
    city: 'Charlotte',
    state: 'NC',
    zip_code: '28203',
    property_type: 'apartment'
  },
  {
    id: uuid(),
    name: 'Palmetto Creek Townhomes',
    address: '450 Palmetto Blvd',
    city: 'Charleston',
    state: 'SC',
    zip_code: '29401',
    property_type: 'townhouse'
  },
  {
    id: uuid(),
    name: 'Peachtree Residences',
    address: '2100 Peachtree St NE',
    city: 'Atlanta',
    state: 'GA',
    zip_code: '30309',
    property_type: 'apartment'
  },
  {
    id: uuid(),
    name: 'Oak Haven Duplexes',
    address: '780 Oak Haven Rd',
    city: 'Raleigh',
    state: 'NC',
    zip_code: '27601',
    property_type: 'duplex'
  },
  {
    id: uuid(),
    name: 'Savannah Oaks Estate',
    address: '320 Savannah Oaks Dr',
    city: 'Savannah',
    state: 'GA',
    zip_code: '31401',
    property_type: 'single_family'
  }
];

// ========== UNIT DATA ==========
// Schema: id, property_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status

function generateUnits(properties) {
  const units = [];
  const unitCounts = { apartment: 24, townhouse: 16, duplex: 8, single_family: 6 };

  properties.forEach(property => {
    const count = unitCounts[property.property_type] || 10;
    const baseRent = property.property_type === 'apartment' ? 1200 : property.property_type === 'townhouse' ? 1650 : 1450;

    for (let i = 1; i <= count; i++) {
      const floorNum = Math.ceil(i / 8);
      const unitNum = property.property_type === 'apartment'
        ? `${floorNum}${String(((i - 1) % 8) + 1).padStart(2, '0')}`
        : String(i);

      const bedrooms = [1, 2, 2, 3][Math.floor(Math.random() * 4)];
      const bathrooms = bedrooms === 1 ? 1 : bedrooms === 2 ? 1.5 : 2;
      const sqft = 600 + (bedrooms * 300) + Math.floor(Math.random() * 200);
      const rentAmount = baseRent + (bedrooms * 200) + Math.floor(Math.random() * 300);

      units.push({
        id: uuid(),
        property_id: property.id,
        unit_number: unitNum,
        bedrooms,
        bathrooms,
        square_feet: sqft,
        rent_amount: rentAmount,
        status: Math.random() > 0.15 ? 'occupied' : 'vacant'
      });
    }
  });

  return units;
}

// ========== TENANT DATA ==========
// Schema: id, first_name, last_name, email, phone, unit_id, lease_start_date, lease_end_date, rent_amount, balance_due

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

function generateTenants(units) {
  const tenants = [];
  const occupiedUnits = units.filter(u => u.status === 'occupied');

  occupiedUnits.forEach((unit, idx) => {
    const firstName = FIRST_NAMES[idx % FIRST_NAMES.length];
    const lastName = LAST_NAMES[idx % LAST_NAMES.length];

    const leaseStart = new Date();
    leaseStart.setMonth(leaseStart.getMonth() - Math.floor(Math.random() * 18));
    const leaseEnd = new Date(leaseStart);
    leaseEnd.setFullYear(leaseEnd.getFullYear() + 1);

    // 30% have some balance due
    let balanceDue = 0;
    const rnd = Math.random();
    if (rnd > 0.7) {
      balanceDue = rnd > 0.9 ? unit.rent_amount * 2 : rnd > 0.8 ? unit.rent_amount : Math.floor(Math.random() * 300);
    }

    tenants.push({
      id: uuid(),
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idx}@email.com`,
      phone: `${['704', '919', '843', '404', '912'][Math.floor(Math.random() * 5)]}-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      unit_id: unit.id,
      lease_start_date: leaseStart.toISOString().split('T')[0],
      lease_end_date: leaseEnd.toISOString().split('T')[0],
      rent_amount: unit.rent_amount,
      balance_due: balanceDue
    });
  });

  return tenants;
}

// ========== LEASE DATA ==========
// Schema: id, property_id, unit_id, tenant_id, lease_number, start_date, end_date, monthly_rent, security_deposit, status, lease_type, notes

function generateLeases(tenants, units) {
  const leases = [];

  tenants.forEach((tenant, idx) => {
    const unit = units.find(u => u.id === tenant.unit_id);
    if (!unit) return;

    leases.push({
      id: uuid(),
      property_id: unit.property_id,
      unit_id: unit.id,
      tenant_id: tenant.id,
      lease_number: `LSE-${Date.now()}-${String(idx + 1).padStart(4, '0')}`,
      start_date: tenant.lease_start_date,
      end_date: tenant.lease_end_date,
      monthly_rent: unit.rent_amount,
      security_deposit: unit.rent_amount,
      status: 'active',
      lease_type: 'fixed',
      notes: 'Standard 12-month lease agreement'
    });
  });

  return leases;
}

// ========== PAYMENT DATA ==========
// Schema: id, lease_id, tenant_id, payment_number, payment_type, amount, due_date, paid_date, payment_method, status, notes, currency, property_id, unit_id

function generatePayments(tenants, units, leases) {
  const payments = [];
  const now = new Date();
  // Valid payment methods based on check constraint
  const paymentMethods = ['ach', 'credit_card', 'check', 'cash', 'online'];

  tenants.forEach((tenant, idx) => {
    const unit = units.find(u => u.id === tenant.unit_id);
    if (!unit) return;
    const lease = leases[idx];

    // Generate 3-6 months of payment history
    const monthsHistory = 3 + Math.floor(Math.random() * 4);

    for (let m = 0; m < monthsHistory; m++) {
      const dueDate = new Date(now);
      dueDate.setMonth(dueDate.getMonth() - m);
      dueDate.setDate(1);

      const isCurrent = m === 0;
      const paymentStatus = isCurrent
        ? (tenant.balance_due > unit.rent_amount ? 'overdue' : tenant.balance_due > 0 ? 'pending' : 'paid')
        : 'paid';

      const paidDate = paymentStatus === 'paid'
        ? new Date(dueDate.getFullYear(), dueDate.getMonth(), Math.floor(Math.random() * 5) + 1)
        : null;

      payments.push({
        id: uuid(),
        lease_id: lease?.id || null,
        tenant_id: tenant.id,
        property_id: unit.property_id,
        unit_id: unit.id,
        payment_number: `PMT-${Date.now()}-${String(payments.length + 1).padStart(5, '0')}`,
        payment_type: 'rent',
        amount: unit.rent_amount,
        due_date: dueDate.toISOString().split('T')[0],
        paid_date: paidDate?.toISOString() || null,
        payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status: paymentStatus,
        notes: 'Monthly rent payment',
        currency: 'usd'
      });
    }
  });

  return payments;
}

// ========== MAIN SEEDING FUNCTION ==========

async function seedDatabase() {
  console.log('Starting production data seeding...\n');

  // Generate data in order of dependencies
  const units = generateUnits(PROPERTIES);
  const tenants = generateTenants(units);
  const leases = generateLeases(tenants, units);
  const payments = generatePayments(tenants, units, leases);

  const occupiedUnits = units.filter(u => u.status === 'occupied').length;
  const totalRent = tenants.reduce((sum, t) => sum + t.rent_amount, 0);
  const totalBalance = tenants.reduce((sum, t) => sum + t.balance_due, 0);

  console.log('Generated:');
  console.log(`  - ${PROPERTIES.length} properties (NC: 2, SC: 1, GA: 2)`);
  console.log(`  - ${units.length} units (${occupiedUnits} occupied)`);
  console.log(`  - ${tenants.length} tenants`);
  console.log(`  - ${leases.length} leases`);
  console.log(`  - ${payments.length} payments`);
  console.log(`  - Monthly rent roll: $${totalRent.toLocaleString()}`);
  console.log(`  - Outstanding balance: $${totalBalance.toLocaleString()}`);
  console.log('');

  // Insert in order of FK dependencies
  console.log('1. Inserting properties...');
  const { error: propError } = await supabase.from('properties').upsert(PROPERTIES, { onConflict: 'id' });
  if (propError) console.log('   Error:', propError.message);
  else console.log('   Success!');

  console.log('2. Inserting units...');
  const { error: unitError } = await supabase.from('units').upsert(units, { onConflict: 'id' });
  if (unitError) console.log('   Error:', unitError.message);
  else console.log('   Success!');

  console.log('3. Inserting tenants...');
  const { error: tenantError } = await supabase.from('tenants').upsert(tenants, { onConflict: 'id' });
  if (tenantError) console.log('   Error:', tenantError.message);
  else console.log('   Success!');

  console.log('4. Inserting leases...');
  const { error: leaseError } = await supabase.from('leases').upsert(leases, { onConflict: 'id' });
  if (leaseError) console.log('   Error:', leaseError.message);
  else console.log('   Success!');

  console.log('5. Inserting payments...');
  const { error: paymentError } = await supabase.from('payments').upsert(payments, { onConflict: 'id' });
  if (paymentError) console.log('   Error:', paymentError.message);
  else console.log('   Success!');

  console.log('\n=== Seeding complete! ===');
}

seedDatabase().catch(console.error);
