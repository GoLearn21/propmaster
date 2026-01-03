/**
 * E2E Test Seed Data Script
 * Creates 10 NEW properties + 15 EXISTING properties with full tenant/lease/payment history
 * Designed for comprehensive Playwright E2E testing
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

// ========== CONSTANTS FOR TESTING ==========

const NC_LATE_FEE_CAP = 0.05; // 5% NC law
const NC_GRACE_PERIOD = 5;
const NC_MAX_SECURITY_DEPOSIT_MONTHS = 2;
const SC_GRACE_PERIOD = 5;
const GA_GRACE_PERIOD = 0; // No mandatory grace period

// ========== 10 NEW PROPERTIES (No tenants yet) ==========

const NEW_PROPERTIES = [
  { id: uuid(), name: 'E2E-NEW: Sunrise Apartments', address: '100 Sunrise Blvd', city: 'Charlotte', state: 'NC', zip_code: '28203', property_type: 'apartment', units: 12 },
  { id: uuid(), name: 'E2E-NEW: Lakeside Condos', address: '200 Lake Shore Dr', city: 'Raleigh', state: 'NC', zip_code: '27601', property_type: 'condo', units: 8 },
  { id: uuid(), name: 'E2E-NEW: Mountain View Townhomes', address: '300 Mountain Rd', city: 'Asheville', state: 'NC', zip_code: '28801', property_type: 'townhouse', units: 6 },
  { id: uuid(), name: 'E2E-NEW: Coastal Breeze Apartments', address: '400 Ocean Blvd', city: 'Charleston', state: 'SC', zip_code: '29401', property_type: 'apartment', units: 16 },
  { id: uuid(), name: 'E2E-NEW: Palmetto Gardens', address: '500 Palmetto Way', city: 'Columbia', state: 'SC', zip_code: '29201', property_type: 'apartment', units: 10 },
  { id: uuid(), name: 'E2E-NEW: Peach State Homes', address: '600 Peachtree St', city: 'Atlanta', state: 'GA', zip_code: '30301', property_type: 'single_family', units: 4 },
  { id: uuid(), name: 'E2E-NEW: Savannah Squares', address: '700 Liberty St', city: 'Savannah', state: 'GA', zip_code: '31401', property_type: 'townhouse', units: 8 },
  { id: uuid(), name: 'E2E-NEW: Buckhead Executive', address: '800 Buckhead Ave', city: 'Atlanta', state: 'GA', zip_code: '30305', property_type: 'apartment', units: 20 },
  { id: uuid(), name: 'E2E-NEW: Carolina Pines', address: '900 Pine Forest Rd', city: 'Wilmington', state: 'NC', zip_code: '28401', property_type: 'apartment', units: 14 },
  { id: uuid(), name: 'E2E-NEW: Midtown Mixed Use', address: '1000 Midtown Pkwy', city: 'Atlanta', state: 'GA', zip_code: '30308', property_type: 'mixed_use', units: 18 },
];

// ========== 15 EXISTING PROPERTIES (With full history) ==========

const EXISTING_PROPERTIES = [
  { id: uuid(), name: 'E2E-EXIST: Magnolia Manor', address: '1100 Magnolia Ln', city: 'Charlotte', state: 'NC', zip_code: '28204', property_type: 'apartment', units: 24, occupancy: 0.92 },
  { id: uuid(), name: 'E2E-EXIST: Triangle Tech Lofts', address: '1200 Research Dr', city: 'Durham', state: 'NC', zip_code: '27701', property_type: 'apartment', units: 32, occupancy: 0.88 },
  { id: uuid(), name: 'E2E-EXIST: Greensboro Gardens', address: '1300 Garden Ave', city: 'Greensboro', state: 'NC', zip_code: '27401', property_type: 'townhouse', units: 12, occupancy: 1.0 },
  { id: uuid(), name: 'E2E-EXIST: Winston Heights', address: '1400 Winston Blvd', city: 'Winston-Salem', state: 'NC', zip_code: '27101', property_type: 'apartment', units: 18, occupancy: 0.83 },
  { id: uuid(), name: 'E2E-EXIST: Outer Banks Retreat', address: '1500 Ocean View Rd', city: 'Nags Head', state: 'NC', zip_code: '27959', property_type: 'condo', units: 10, occupancy: 0.70 },
  { id: uuid(), name: 'E2E-EXIST: Lowcountry Living', address: '1600 Marsh Rd', city: 'Charleston', state: 'SC', zip_code: '29403', property_type: 'apartment', units: 28, occupancy: 0.96 },
  { id: uuid(), name: 'E2E-EXIST: Myrtle Beach Villas', address: '1700 Beach Blvd', city: 'Myrtle Beach', state: 'SC', zip_code: '29577', property_type: 'condo', units: 20, occupancy: 0.85 },
  { id: uuid(), name: 'E2E-EXIST: Greenville Grand', address: '1800 Main St', city: 'Greenville', state: 'SC', zip_code: '29601', property_type: 'apartment', units: 36, occupancy: 0.91 },
  { id: uuid(), name: 'E2E-EXIST: Columbia Commons', address: '1900 Assembly St', city: 'Columbia', state: 'SC', zip_code: '29201', property_type: 'townhouse', units: 16, occupancy: 0.94 },
  { id: uuid(), name: 'E2E-EXIST: Spartanburg Studios', address: '2000 Pine St', city: 'Spartanburg', state: 'SC', zip_code: '29301', property_type: 'apartment', units: 24, occupancy: 0.79 },
  { id: uuid(), name: 'E2E-EXIST: Atlanta Skyline', address: '2100 Peachtree Rd', city: 'Atlanta', state: 'GA', zip_code: '30309', property_type: 'apartment', units: 48, occupancy: 0.94 },
  { id: uuid(), name: 'E2E-EXIST: Augusta Greens', address: '2200 Masters Way', city: 'Augusta', state: 'GA', zip_code: '30901', property_type: 'townhouse', units: 12, occupancy: 1.0 },
  { id: uuid(), name: 'E2E-EXIST: Macon Heritage', address: '2300 Cherry St', city: 'Macon', state: 'GA', zip_code: '31201', property_type: 'apartment', units: 16, occupancy: 0.88 },
  { id: uuid(), name: 'E2E-EXIST: Athens College Town', address: '2400 Broad St', city: 'Athens', state: 'GA', zip_code: '30601', property_type: 'apartment', units: 40, occupancy: 0.98 },
  { id: uuid(), name: 'E2E-EXIST: Marietta Square', address: '2500 Church St', city: 'Marietta', state: 'GA', zip_code: '30060', property_type: 'mixed_use', units: 22, occupancy: 0.86 },
];

// ========== TENANT/PAYMENT SCENARIO TYPES ==========

const PAYMENT_SCENARIOS = {
  PERFECT_PAYER: 'perfect',        // Always pays on time, full amount
  EARLY_PAYER: 'early',            // Pays before due date
  GRACE_PERIOD: 'grace',           // Pays within grace period
  LATE_PAYER: 'late',              // Pays late, owes late fees
  PARTIAL_PAYER: 'partial',        // Pays partial amounts
  DELINQUENT: 'delinquent',        // Multiple months behind
  SECURITY_DEPOSIT_ONLY: 'deposit_only',  // New tenant, just deposit
};

const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

// ========== DATA GENERATION FUNCTIONS ==========

function generateUnitsForProperty(property) {
  const units = [];
  const baseRents = {
    apartment: 1200,
    condo: 1400,
    townhouse: 1600,
    single_family: 1800,
    mixed_use: 1100,
  };
  const baseRent = baseRents[property.property_type] || 1300;

  for (let i = 1; i <= property.units; i++) {
    const bedrooms = [1, 2, 2, 3][Math.floor(Math.random() * 4)];
    const bathrooms = bedrooms === 1 ? 1 : bedrooms === 2 ? 1.5 : 2;
    const sqft = 600 + (bedrooms * 300) + Math.floor(Math.random() * 200);
    const rentAmount = baseRent + (bedrooms * 250) + Math.floor(Math.random() * 200);

    // For existing properties, set occupancy based on property occupancy rate
    const isOccupied = property.occupancy ? Math.random() < property.occupancy : false;

    units.push({
      id: uuid(),
      property_id: property.id,
      unit_number: property.property_type === 'apartment' ? `${Math.ceil(i / 8)}${String(((i - 1) % 8) + 1).padStart(2, '0')}` : String(i),
      bedrooms,
      bathrooms,
      square_feet: sqft,
      rent_amount: rentAmount,
      status: isOccupied ? 'occupied' : 'vacant',
    });
  }

  return units;
}

function getPaymentScenario() {
  const rand = Math.random();
  if (rand < 0.50) return PAYMENT_SCENARIOS.PERFECT_PAYER;
  if (rand < 0.65) return PAYMENT_SCENARIOS.EARLY_PAYER;
  if (rand < 0.75) return PAYMENT_SCENARIOS.GRACE_PERIOD;
  if (rand < 0.85) return PAYMENT_SCENARIOS.LATE_PAYER;
  if (rand < 0.92) return PAYMENT_SCENARIOS.PARTIAL_PAYER;
  return PAYMENT_SCENARIOS.DELINQUENT;
}

function generateTenantForUnit(unit, property, index) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[index % LAST_NAMES.length];
  const scenario = getPaymentScenario();

  // Lease started 1-18 months ago
  const leaseStart = new Date();
  leaseStart.setMonth(leaseStart.getMonth() - Math.floor(Math.random() * 18) - 1);
  const leaseEnd = new Date(leaseStart);
  leaseEnd.setFullYear(leaseEnd.getFullYear() + 1);

  // Calculate balance based on scenario
  let balanceDue = 0;
  switch (scenario) {
    case PAYMENT_SCENARIOS.LATE_PAYER:
      balanceDue = Math.round(unit.rent_amount * NC_LATE_FEE_CAP); // Just late fee
      break;
    case PAYMENT_SCENARIOS.PARTIAL_PAYER:
      balanceDue = Math.round(unit.rent_amount * 0.3); // 30% unpaid
      break;
    case PAYMENT_SCENARIOS.DELINQUENT:
      balanceDue = unit.rent_amount * 2 + Math.round(unit.rent_amount * NC_LATE_FEE_CAP * 2); // 2 months + late fees
      break;
    default:
      balanceDue = 0;
  }

  return {
    id: uuid(),
    first_name: firstName,
    last_name: lastName,
    email: `e2e.${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@testmail.com`,
    phone: `${['704', '919', '843', '404', '912'][Math.floor(Math.random() * 5)]}-555-${String(1000 + index).padStart(4, '0')}`,
    unit_id: unit.id,
    lease_start_date: leaseStart.toISOString().split('T')[0],
    lease_end_date: leaseEnd.toISOString().split('T')[0],
    rent_amount: unit.rent_amount,
    balance_due: balanceDue,
    _scenario: scenario, // Internal tracking
    _property_state: property.state, // For state compliance testing
  };
}

function generateLease(tenant, unit, property) {
  return {
    id: uuid(),
    property_id: property.id,
    unit_id: unit.id,
    tenant_id: tenant.id,
    lease_number: `E2E-LSE-${property.state}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    start_date: tenant.lease_start_date,
    end_date: tenant.lease_end_date,
    monthly_rent: unit.rent_amount,
    security_deposit: calculateSecurityDeposit(unit.rent_amount, property.state),
    status: 'active',
    lease_type: 'fixed',
    notes: `E2E Test Lease - Scenario: ${tenant._scenario}`,
  };
}

function calculateSecurityDeposit(monthlyRent, state) {
  // NC caps at 2 months, others have no cap
  if (state === 'NC') {
    return monthlyRent * NC_MAX_SECURITY_DEPOSIT_MONTHS;
  }
  // For testing, vary the deposit
  return monthlyRent * (1 + Math.floor(Math.random() * 2));
}

function calculateLateFee(rentAmount, state) {
  switch (state) {
    case 'NC':
      // NC: 5% cap or $15 minimum
      const ncFee = Math.max(15, Math.round(rentAmount * NC_LATE_FEE_CAP));
      return Math.min(ncFee, Math.round(rentAmount * NC_LATE_FEE_CAP));
    case 'SC':
      // SC: "Reasonable" - typically 5-10%
      return Math.round(rentAmount * 0.05);
    case 'GA':
      // GA: No statutory limit - typically 10%
      return Math.round(rentAmount * 0.10);
    default:
      return Math.round(rentAmount * 0.05);
  }
}

function generatePaymentHistory(tenant, unit, lease, property) {
  const payments = [];
  const now = new Date();
  const leaseStart = new Date(tenant.lease_start_date);
  // Valid payment methods per database constraint (credit_card, ach, bank_transfer, check, cash)
  const paymentMethods = ['credit_card', 'ach', 'check', 'cash'];

  // Calculate months since lease start
  const monthsSinceStart = Math.floor((now - leaseStart) / (30 * 24 * 60 * 60 * 1000));
  const monthsToGenerate = Math.min(monthsSinceStart, 12); // Max 12 months history

  for (let m = 0; m < monthsToGenerate; m++) {
    const dueDate = new Date(now);
    dueDate.setMonth(dueDate.getMonth() - m);
    dueDate.setDate(1);

    const isCurrent = m === 0;
    let paidDate = null;
    let status = 'pending';
    let amount = unit.rent_amount;
    let lateFee = 0;

    switch (tenant._scenario) {
      case PAYMENT_SCENARIOS.PERFECT_PAYER:
        paidDate = new Date(dueDate);
        paidDate.setDate(1); // Pays on the 1st
        status = 'paid';
        break;

      case PAYMENT_SCENARIOS.EARLY_PAYER:
        paidDate = new Date(dueDate);
        paidDate.setMonth(paidDate.getMonth() - 1);
        paidDate.setDate(28); // Pays early
        status = 'paid';
        break;

      case PAYMENT_SCENARIOS.GRACE_PERIOD:
        paidDate = new Date(dueDate);
        const graceDays = property.state === 'NC' ? NC_GRACE_PERIOD : (property.state === 'SC' ? SC_GRACE_PERIOD : 3);
        paidDate.setDate(paidDate.getDate() + Math.floor(Math.random() * graceDays) + 1);
        status = 'paid';
        break;

      case PAYMENT_SCENARIOS.LATE_PAYER:
        if (!isCurrent) {
          paidDate = new Date(dueDate);
          paidDate.setDate(paidDate.getDate() + 10 + Math.floor(Math.random() * 10));
          status = 'paid';
          lateFee = calculateLateFee(unit.rent_amount, property.state);
        } else {
          status = 'overdue';
          lateFee = calculateLateFee(unit.rent_amount, property.state);
        }
        break;

      case PAYMENT_SCENARIOS.PARTIAL_PAYER:
        if (!isCurrent) {
          paidDate = new Date(dueDate);
          paidDate.setDate(paidDate.getDate() + 5);
          amount = Math.round(unit.rent_amount * 0.7);
          status = 'partial';
        } else {
          status = 'pending';
          amount = Math.round(unit.rent_amount * 0.7);
        }
        break;

      case PAYMENT_SCENARIOS.DELINQUENT:
        if (m > 1) {
          paidDate = new Date(dueDate);
          paidDate.setDate(paidDate.getDate() + 20);
          status = 'paid';
          lateFee = calculateLateFee(unit.rent_amount, property.state);
        } else {
          status = 'overdue';
          lateFee = calculateLateFee(unit.rent_amount, property.state);
        }
        break;
    }

    // Main rent payment
    payments.push({
      id: uuid(),
      lease_id: lease.id,
      tenant_id: tenant.id,
      property_id: property.id,
      unit_id: unit.id,
      payment_number: `E2E-PMT-${Date.now()}-${String(payments.length + 1).padStart(5, '0')}`,
      payment_type: 'rent',
      amount: amount,
      due_date: dueDate.toISOString().split('T')[0],
      paid_date: paidDate?.toISOString().split('T')[0] || null,
      payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      status: status,
      notes: `E2E Test - ${tenant._scenario} scenario`,
      currency: 'usd',
    });

    // Add late fee if applicable
    if (lateFee > 0) {
      payments.push({
        id: uuid(),
        lease_id: lease.id,
        tenant_id: tenant.id,
        property_id: property.id,
        unit_id: unit.id,
        payment_number: `E2E-FEE-${Date.now()}-${String(payments.length + 1).padStart(5, '0')}`,
        payment_type: 'late_fee',
        amount: lateFee,
        due_date: dueDate.toISOString().split('T')[0],
        paid_date: paidDate?.toISOString().split('T')[0] || null,
        payment_method: paidDate ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)] : null,
        status: paidDate ? 'paid' : 'pending',
        notes: `Late fee - ${property.state} state rules (${property.state === 'NC' ? '5% cap' : property.state === 'SC' ? 'reasonable' : 'no limit'})`,
        currency: 'usd',
      });
    }
  }

  return payments;
}

// ========== MAIN SEEDING FUNCTION ==========

async function seedE2ETestData() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     E2E TEST DATA SEEDING - PropMaster Comprehensive       ║');
  console.log('║     10 NEW Properties + 15 EXISTING Properties             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Clear existing E2E test data
  console.log('1. Clearing existing E2E test data...');
  await supabase.from('payments').delete().like('payment_number', 'E2E-%');
  await supabase.from('leases').delete().like('lease_number', 'E2E-%');
  await supabase.from('tenants').delete().like('email', 'e2e.%');
  await supabase.from('units').delete().in('property_id', [...NEW_PROPERTIES, ...EXISTING_PROPERTIES].map(p => p.id));
  await supabase.from('properties').delete().like('name', 'E2E-%');
  console.log('   Done!\n');

  // Generate all data
  const allUnits = [];
  const allTenants = [];
  const allLeases = [];
  const allPayments = [];
  let tenantIndex = 0;

  // Process NEW properties (vacant units only)
  console.log('2. Generating NEW properties (10 properties, all vacant)...');
  for (const property of NEW_PROPERTIES) {
    const units = generateUnitsForProperty(property);
    allUnits.push(...units);
  }
  console.log(`   Generated ${NEW_PROPERTIES.length} properties with ${allUnits.length} vacant units\n`);

  // Process EXISTING properties (with tenants and history)
  console.log('3. Generating EXISTING properties with full tenant history...');
  const existingUnitsStart = allUnits.length;
  for (const property of EXISTING_PROPERTIES) {
    const units = generateUnitsForProperty(property);

    for (const unit of units) {
      allUnits.push(unit);

      if (unit.status === 'occupied') {
        const tenant = generateTenantForUnit(unit, property, tenantIndex++);
        allTenants.push(tenant);

        const lease = generateLease(tenant, unit, property);
        allLeases.push(lease);

        const payments = generatePaymentHistory(tenant, unit, lease, property);
        allPayments.push(...payments);
      }
    }
  }
  console.log(`   Generated ${EXISTING_PROPERTIES.length} properties`);
  console.log(`   Generated ${allUnits.length - existingUnitsStart} units`);
  console.log(`   Generated ${allTenants.length} tenants`);
  console.log(`   Generated ${allLeases.length} leases`);
  console.log(`   Generated ${allPayments.length} payment records\n`);

  // Calculate summary statistics
  const stats = {
    totalProperties: NEW_PROPERTIES.length + EXISTING_PROPERTIES.length,
    newProperties: NEW_PROPERTIES.length,
    existingProperties: EXISTING_PROPERTIES.length,
    totalUnits: allUnits.length,
    occupiedUnits: allUnits.filter(u => u.status === 'occupied').length,
    vacantUnits: allUnits.filter(u => u.status === 'vacant').length,
    totalTenants: allTenants.length,
    totalLeases: allLeases.length,
    totalPayments: allPayments.length,
    byState: {
      NC: { properties: 0, tenants: 0, payments: 0 },
      SC: { properties: 0, tenants: 0, payments: 0 },
      GA: { properties: 0, tenants: 0, payments: 0 },
    },
    byScenario: {},
    totalRentRoll: allTenants.reduce((sum, t) => sum + t.rent_amount, 0),
    totalBalance: allTenants.reduce((sum, t) => sum + t.balance_due, 0),
  };

  // Count by state
  [...NEW_PROPERTIES, ...EXISTING_PROPERTIES].forEach(p => {
    stats.byState[p.state].properties++;
  });
  allTenants.forEach(t => {
    stats.byState[t._property_state].tenants++;
    stats.byScenario[t._scenario] = (stats.byScenario[t._scenario] || 0) + 1;
  });
  allPayments.forEach(p => {
    const prop = [...NEW_PROPERTIES, ...EXISTING_PROPERTIES].find(pr => pr.id === p.property_id);
    if (prop) stats.byState[prop.state].payments++;
  });

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY STATISTICS                       ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Total Properties:     ${stats.totalProperties.toString().padStart(4)} (${stats.newProperties} new, ${stats.existingProperties} existing)    ║`);
  console.log(`║ Total Units:          ${stats.totalUnits.toString().padStart(4)} (${stats.occupiedUnits} occupied, ${stats.vacantUnits} vacant) ║`);
  console.log(`║ Total Tenants:        ${stats.totalTenants.toString().padStart(4)}                                  ║`);
  console.log(`║ Total Leases:         ${stats.totalLeases.toString().padStart(4)}                                  ║`);
  console.log(`║ Total Payments:       ${stats.totalPayments.toString().padStart(4)}                                  ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ BY STATE:                                                   ║');
  console.log(`║   NC: ${stats.byState.NC.properties} props, ${stats.byState.NC.tenants.toString().padStart(3)} tenants, ${stats.byState.NC.payments.toString().padStart(4)} payments        ║`);
  console.log(`║   SC: ${stats.byState.SC.properties} props, ${stats.byState.SC.tenants.toString().padStart(3)} tenants, ${stats.byState.SC.payments.toString().padStart(4)} payments        ║`);
  console.log(`║   GA: ${stats.byState.GA.properties} props, ${stats.byState.GA.tenants.toString().padStart(3)} tenants, ${stats.byState.GA.payments.toString().padStart(4)} payments        ║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ PAYMENT SCENARIOS:                                          ║');
  Object.entries(stats.byScenario).forEach(([scenario, count]) => {
    console.log(`║   ${scenario.padEnd(15)}: ${count.toString().padStart(3)} tenants                          ║`);
  });
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Monthly Rent Roll:    $${stats.totalRentRoll.toLocaleString().padStart(10)}                    ║`);
  console.log(`║ Outstanding Balance:  $${stats.totalBalance.toLocaleString().padStart(10)}                    ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Insert data in dependency order
  console.log('4. Inserting data into database...\n');

  console.log('   4.1 Inserting properties...');
  const allProperties = [...NEW_PROPERTIES, ...EXISTING_PROPERTIES];
  const { error: propError } = await supabase.from('properties').upsert(allProperties.map(p => ({
    id: p.id,
    name: p.name,
    address: p.address,
    city: p.city,
    state: p.state,
    zip_code: p.zip_code,
    property_type: p.property_type,
  })));
  if (propError) console.log('   ERROR:', propError.message);
  else console.log(`       ✓ ${allProperties.length} properties inserted`);

  console.log('   4.2 Inserting units...');
  const { error: unitError } = await supabase.from('units').upsert(allUnits);
  if (unitError) console.log('   ERROR:', unitError.message);
  else console.log(`       ✓ ${allUnits.length} units inserted`);

  console.log('   4.3 Inserting tenants...');
  const tenantsToInsert = allTenants.map(t => ({
    id: t.id,
    first_name: t.first_name,
    last_name: t.last_name,
    email: t.email,
    phone: t.phone,
    unit_id: t.unit_id,
    lease_start_date: t.lease_start_date,
    lease_end_date: t.lease_end_date,
    rent_amount: t.rent_amount,
    balance_due: t.balance_due,
  }));
  const { error: tenantError } = await supabase.from('tenants').upsert(tenantsToInsert);
  if (tenantError) console.log('   ERROR:', tenantError.message);
  else console.log(`       ✓ ${tenantsToInsert.length} tenants inserted`);

  console.log('   4.4 Inserting leases...');
  const { error: leaseError } = await supabase.from('leases').upsert(allLeases);
  if (leaseError) console.log('   ERROR:', leaseError.message);
  else console.log(`       ✓ ${allLeases.length} leases inserted`);

  console.log('   4.5 Inserting payments...');
  const { error: paymentError } = await supabase.from('payments').upsert(allPayments);
  if (paymentError) console.log('   ERROR:', paymentError.message);
  else console.log(`       ✓ ${allPayments.length} payments inserted`);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║            E2E TEST DATA SEEDING COMPLETE!                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Return stats for test validation
  return stats;
}

// Run the seeding
seedE2ETestData().catch(console.error);
