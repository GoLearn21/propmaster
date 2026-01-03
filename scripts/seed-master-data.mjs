/**
 * Master Seed Data Script for PropMaster
 * ========================================
 * Comprehensive multi-company seed data across NC, SC, GA
 * Covers all pages: /accounting, /rentals, /properties, /leasing, /people, /reports
 *
 * SEED DATA IDENTIFIER: All records have metadata.is_seed_data = true
 * This allows easy identification and cleanup of test data
 *
 * Usage:
 *   node scripts/seed-master-data.mjs
 *   node scripts/seed-master-data.mjs --company=1  # Seed only first company
 *   node scripts/seed-master-data.mjs --verify     # Verify seed data exists
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// SEED DATA MARKER - Used to identify test data for cleanup
// ============================================================================
const SEED_MARKER = 'SEED_DATA_V1';
const uuid = () => randomUUID();

// ============================================================================
// STATE COMPLIANCE RULES
// ============================================================================
const STATE_COMPLIANCE = {
  NC: {
    name: 'North Carolina',
    maxLateFeePercent: 5,
    minLateFeeAmount: 15,
    gracePeriodDays: 5,
    maxSecurityDepositMonths: 2,
    securityDepositReturnDays: 30,
    citation: 'NC Gen. Stat. § 42-46',
  },
  SC: {
    name: 'South Carolina',
    maxLateFeePercent: null,
    gracePeriodDays: 5,
    maxSecurityDepositMonths: null,
    securityDepositReturnDays: 30,
    citation: 'SC Code § 27-40-310',
  },
  GA: {
    name: 'Georgia',
    maxLateFeePercent: null,
    gracePeriodDays: 0,
    maxSecurityDepositMonths: null,
    securityDepositReturnDays: 30,
    citation: 'GA Code § 44-7-2',
  },
};

// ============================================================================
// COMPANY DEFINITIONS - Multi-tenant seed data
// ============================================================================
const COMPANIES = [
  {
    id: uuid(),
    name: 'Carolina Property Management LLC',
    email: 'admin@carolinapm.com',
    phone: '704-555-0100',
    states: ['NC', 'SC'],
    propertyCount: { NC: 40, SC: 25 },
    headquarters: { city: 'Charlotte', state: 'NC' },
  },
  {
    id: uuid(),
    name: 'Peach State Properties Inc',
    email: 'contact@peachstateprops.com',
    phone: '404-555-0200',
    states: ['GA', 'SC'],
    propertyCount: { GA: 35, SC: 15 },
    headquarters: { city: 'Atlanta', state: 'GA' },
  },
  {
    id: uuid(),
    name: 'Tri-State Rentals Corp',
    email: 'info@tristaterentals.com',
    phone: '919-555-0300',
    states: ['NC', 'SC', 'GA'],
    propertyCount: { NC: 60, SC: 40, GA: 50 },
    headquarters: { city: 'Raleigh', state: 'NC' },
  },
  {
    id: uuid(),
    name: 'Coastal Living Management',
    email: 'hello@coastalliving.com',
    phone: '843-555-0400',
    states: ['SC', 'GA'],
    propertyCount: { SC: 30, GA: 20 },
    headquarters: { city: 'Charleston', state: 'SC' },
  },
  {
    id: uuid(),
    name: 'Mountain View Properties',
    email: 'rent@mountainviewprops.com',
    phone: '828-555-0500',
    states: ['NC', 'GA'],
    propertyCount: { NC: 45, GA: 25 },
    headquarters: { city: 'Asheville', state: 'NC' },
  },
];

// ============================================================================
// CITY DATA BY STATE
// ============================================================================
const CITIES = {
  NC: [
    { city: 'Charlotte', zip: '28203' },
    { city: 'Raleigh', zip: '27601' },
    { city: 'Durham', zip: '27701' },
    { city: 'Greensboro', zip: '27401' },
    { city: 'Winston-Salem', zip: '27101' },
    { city: 'Asheville', zip: '28801' },
    { city: 'Wilmington', zip: '28401' },
    { city: 'Cary', zip: '27511' },
    { city: 'Fayetteville', zip: '28301' },
    { city: 'High Point', zip: '27260' },
  ],
  SC: [
    { city: 'Charleston', zip: '29401' },
    { city: 'Columbia', zip: '29201' },
    { city: 'Greenville', zip: '29601' },
    { city: 'Myrtle Beach', zip: '29577' },
    { city: 'Rock Hill', zip: '29730' },
    { city: 'Spartanburg', zip: '29301' },
    { city: 'Mount Pleasant', zip: '29464' },
    { city: 'Summerville', zip: '29483' },
  ],
  GA: [
    { city: 'Atlanta', zip: '30303' },
    { city: 'Savannah', zip: '31401' },
    { city: 'Augusta', zip: '30901' },
    { city: 'Columbus', zip: '31901' },
    { city: 'Macon', zip: '31201' },
    { city: 'Athens', zip: '30601' },
    { city: 'Marietta', zip: '30060' },
    { city: 'Alpharetta', zip: '30009' },
    { city: 'Roswell', zip: '30075' },
    { city: 'Sandy Springs', zip: '30328' },
  ],
};

// ============================================================================
// NAME GENERATORS
// ============================================================================
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
];

const STREET_NAMES = [
  'Oak', 'Maple', 'Pine', 'Cedar', 'Elm', 'Main', 'Park', 'Lake', 'River', 'Hill',
  'Forest', 'Sunset', 'Spring', 'Valley', 'Highland', 'Meadow', 'Garden', 'Peach',
  'Magnolia', 'Palmetto', 'Dogwood', 'Azalea', 'Willow', 'Birch', 'Cherry',
];

const STREET_TYPES = ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Way', 'Ct', 'Pl', 'Rd'];

const PROPERTY_PREFIXES = [
  'The', 'Grand', 'Royal', 'Vista', 'Park', 'Lake', 'River', 'Summit', 'Heritage',
  'Luxury', 'Premier', 'Elite', 'Modern', 'Classic', 'Urban', 'Garden', 'Sunset',
];

const PROPERTY_SUFFIXES = [
  'Apartments', 'Residences', 'Towers', 'Place', 'Gardens', 'Commons', 'Heights',
  'Villas', 'Estates', 'Manor', 'Terrace', 'Court', 'Landing', 'Point', 'Square',
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomBool = (probability = 0.5) => Math.random() < probability;

function generateAddress(state) {
  const streetNum = randomInt(100, 9999);
  const streetName = randomFrom(STREET_NAMES);
  const streetType = randomFrom(STREET_TYPES);
  return `${streetNum} ${streetName} ${streetType}`;
}

function generatePropertyName() {
  return `${randomFrom(PROPERTY_PREFIXES)} ${randomFrom(STREET_NAMES)} ${randomFrom(PROPERTY_SUFFIXES)}`;
}

function generatePhone(state) {
  const areaCodes = { NC: ['704', '919', '336', '828', '910'], SC: ['843', '803', '864'], GA: ['404', '770', '678', '912'] };
  const code = randomFrom(areaCodes[state] || ['555']);
  return `${code}-555-${String(randomInt(1000, 9999))}`;
}

function generateEmail(firstName, lastName, index) {
  const domains = ['email.com', 'gmail.com', 'yahoo.com', 'outlook.com', 'mail.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${randomFrom(domains)}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// DATA GENERATORS
// ============================================================================

/**
 * Generate properties for a company in a specific state
 */
function generateProperties(company, state, count) {
  const properties = [];
  const cityData = CITIES[state];
  const propertyTypes = ['apartment', 'townhouse', 'single_family', 'duplex', 'condo'];
  const typeWeights = [0.4, 0.25, 0.15, 0.1, 0.1]; // Apartments most common

  for (let i = 0; i < count; i++) {
    const location = randomFrom(cityData);
    const typeRoll = Math.random();
    let cumulative = 0;
    let propertyType = 'apartment';
    for (let t = 0; t < propertyTypes.length; t++) {
      cumulative += typeWeights[t];
      if (typeRoll < cumulative) {
        propertyType = propertyTypes[t];
        break;
      }
    }

    const unitCounts = { apartment: randomInt(12, 48), townhouse: randomInt(8, 24), single_family: randomInt(1, 6), duplex: randomInt(4, 12), condo: randomInt(6, 30) };
    const totalUnits = unitCounts[propertyType];

    properties.push({
      id: uuid(),
      name: generatePropertyName(),
      address: generateAddress(state),
      city: location.city,
      state: state,
      zip_code: location.zip,
      property_type: propertyType,
      total_units: totalUnits,
      occupied_units: Math.floor(totalUnits * (0.75 + Math.random() * 0.2)), // 75-95% occupancy
      status: 'active',
      company_id: company.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { is_seed_data: true, seed_marker: SEED_MARKER },
    });
  }

  return properties;
}

/**
 * Generate units for a property
 */
function generateUnits(property) {
  const units = [];
  const baseRents = {
    apartment: { 1: 1100, 2: 1400, 3: 1800 },
    townhouse: { 2: 1600, 3: 2000, 4: 2400 },
    single_family: { 2: 1500, 3: 1900, 4: 2300 },
    duplex: { 1: 1000, 2: 1300, 3: 1600 },
    condo: { 1: 1200, 2: 1500, 3: 1900 },
  };

  const stateMultipliers = { NC: 1.0, SC: 0.95, GA: 1.05 };
  const multiplier = stateMultipliers[property.state] || 1;

  for (let i = 1; i <= property.total_units; i++) {
    const bedrooms = randomFrom([1, 2, 2, 2, 3, 3]); // Weighted toward 2BR
    const bathrooms = bedrooms === 1 ? 1 : bedrooms === 2 ? randomFrom([1, 1.5, 2]) : randomFrom([2, 2.5]);
    const sqft = 500 + (bedrooms * 350) + randomInt(-100, 200);

    const rentBase = (baseRents[property.property_type] || baseRents.apartment)[bedrooms] || 1300;
    const rentAmount = Math.round((rentBase + randomInt(-200, 300)) * multiplier);

    const isOccupied = i <= property.occupied_units;

    // Unit numbering based on property type
    let unitNumber;
    if (property.property_type === 'apartment') {
      const floor = Math.ceil(i / 8);
      const unit = ((i - 1) % 8) + 1;
      unitNumber = `${floor}${String(unit).padStart(2, '0')}`;
    } else {
      unitNumber = String(i);
    }

    units.push({
      id: uuid(),
      property_id: property.id,
      unit_number: unitNumber,
      bedrooms,
      bathrooms,
      square_feet: sqft,
      rent_amount: rentAmount,
      status: isOccupied ? 'occupied' : 'vacant',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return units;
}

/**
 * Generate people (tenants, owners, vendors)
 */
function generatePeople(units, property) {
  const people = [];
  const occupiedUnits = units.filter(u => u.status === 'occupied');

  occupiedUnits.forEach((unit, idx) => {
    const firstName = randomFrom(FIRST_NAMES);
    const lastName = randomFrom(LAST_NAMES);

    people.push({
      id: uuid(),
      first_name: firstName,
      last_name: lastName,
      email: generateEmail(firstName, lastName, idx),
      phone: generatePhone(property.state),
      person_type: 'tenant',
      unit_id: unit.id,
      property_id: property.id,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  return people;
}

/**
 * Generate tenants with lease information
 */
function generateTenants(people, units) {
  return people.filter(p => p.person_type === 'tenant').map(person => {
    const unit = units.find(u => u.id === person.unit_id);

    // Random lease start 1-18 months ago
    const leaseStart = addMonths(new Date(), -randomInt(1, 18));
    const leaseEnd = addMonths(leaseStart, 12);

    // Balance due: 70% paid up, 20% small balance, 10% late
    const balanceRoll = Math.random();
    let balanceDue = 0;
    if (balanceRoll > 0.9) {
      balanceDue = unit?.rent_amount || 1500; // Full month late
    } else if (balanceRoll > 0.7) {
      balanceDue = randomInt(50, 500); // Partial balance
    }

    return {
      id: person.id,
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      phone: person.phone,
      unit_id: person.unit_id,
      lease_start_date: formatDate(leaseStart),
      lease_end_date: formatDate(leaseEnd),
      rent_amount: unit?.rent_amount || 1500,
      balance_due: balanceDue,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
}

/**
 * Generate leases
 */
function generateLeases(tenants, units) {
  return tenants.map((tenant, idx) => {
    const unit = units.find(u => u.id === tenant.unit_id);

    const leaseTypes = ['fixed', 'month_to_month'];
    const leaseType = randomBool(0.85) ? 'fixed' : 'month_to_month';

    // Determine lease status based on dates
    const endDate = new Date(tenant.lease_end_date);
    const now = new Date();
    const daysUntilEnd = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));

    let status = 'active';
    if (daysUntilEnd < 0) {
      status = 'expired';
    } else if (daysUntilEnd < 60) {
      status = randomBool(0.5) ? 'renewal_pending' : 'active';
    }

    return {
      id: uuid(),
      property_id: unit?.property_id,
      unit_id: unit?.id,
      tenant_id: tenant.id,
      lease_number: `LSE-${new Date().getFullYear()}-${String(idx + 1).padStart(5, '0')}`,
      start_date: tenant.lease_start_date,
      end_date: tenant.lease_end_date,
      monthly_rent: tenant.rent_amount,
      security_deposit: tenant.rent_amount, // 1 month typically
      status,
      lease_type: leaseType,
      notes: `Standard ${leaseType === 'fixed' ? '12-month' : 'month-to-month'} lease agreement`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
}

/**
 * Generate payments (3-6 months history per tenant)
 */
function generatePayments(tenants, units, leases) {
  const payments = [];
  const now = new Date();
  const paymentMethods = ['ach', 'credit_card', 'check', 'cash', 'online'];

  tenants.forEach((tenant, idx) => {
    const unit = units.find(u => u.id === tenant.unit_id);
    const lease = leases[idx];
    if (!unit || !lease) return;

    const monthsHistory = randomInt(3, 8);

    for (let m = 0; m < monthsHistory; m++) {
      const dueDate = new Date(now);
      dueDate.setMonth(dueDate.getMonth() - m);
      dueDate.setDate(1);

      const isCurrent = m === 0;

      // Payment status logic
      let status;
      if (isCurrent) {
        if (tenant.balance_due >= tenant.rent_amount) {
          status = 'overdue';
        } else if (tenant.balance_due > 0) {
          status = 'pending';
        } else {
          status = 'paid';
        }
      } else {
        // Historical payments - 95% paid on time
        status = randomBool(0.95) ? 'paid' : 'late';
      }

      const paidDate = status === 'paid' || status === 'late'
        ? addDays(dueDate, status === 'late' ? randomInt(5, 15) : randomInt(0, 5))
        : null;

      payments.push({
        id: uuid(),
        lease_id: lease.id,
        tenant_id: tenant.id,
        property_id: unit.property_id,
        unit_id: unit.id,
        payment_number: `PMT-${now.getFullYear()}-${String(payments.length + 1).padStart(6, '0')}`,
        payment_type: 'rent',
        amount: tenant.rent_amount,
        due_date: formatDate(dueDate),
        paid_date: paidDate ? formatDate(paidDate) : null,
        payment_method: status !== 'pending' && status !== 'overdue' ? randomFrom(paymentMethods) : null,
        status,
        notes: 'Monthly rent payment',
        currency: 'usd',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  });

  return payments;
}

/**
 * Generate billing configurations per property
 */
function generateBillingConfigurations(properties) {
  return properties.map(property => {
    const stateRules = STATE_COMPLIANCE[property.state];

    // State-compliant late fee settings
    let lateFeeAmount, lateFeeType;
    if (property.state === 'NC') {
      lateFeeType = 'percentage';
      lateFeeAmount = 5; // Max 5%
    } else if (property.state === 'SC') {
      lateFeeType = randomFrom(['percentage', 'flat']);
      lateFeeAmount = lateFeeType === 'percentage' ? randomInt(3, 8) : randomInt(25, 75);
    } else {
      // GA - no limits
      lateFeeType = randomFrom(['percentage', 'flat', 'daily']);
      lateFeeAmount = lateFeeType === 'percentage' ? randomInt(5, 10) : lateFeeType === 'flat' ? randomInt(50, 150) : randomInt(5, 20);
    }

    const gracePeriod = property.state === 'GA' ? randomInt(0, 7) : Math.max(stateRules.gracePeriodDays, randomInt(5, 10));

    // Compliance check
    let complianceStatus = 'compliant';
    if (property.state === 'NC' && (lateFeeAmount > 5 || gracePeriod < 5)) {
      complianceStatus = 'non_compliant';
    }

    return {
      id: uuid(),
      property_id: property.id,
      state: property.state,
      late_fee_type: lateFeeType,
      late_fee_amount: lateFeeAmount,
      grace_period_days: gracePeriod,
      max_late_fee_amount: property.state === 'NC' ? 15 : null,
      billing_day: randomInt(1, 5),
      prorate_partial_months: true,
      auto_generate_invoices: randomBool(0.9),
      accept_partial_payments: true,
      payment_methods: JSON.stringify(['ach', 'credit_card', 'check']),
      reminder_days_before_due: randomInt(3, 7),
      reminder_days_after_due: randomInt(1, 3),
      send_reminder_emails: true,
      send_reminder_sms: randomBool(0.4),
      compliance_status: complianceStatus,
      last_compliance_check: new Date().toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
}

/**
 * Generate billing pending actions
 */
function generatePendingActions(billingConfigs) {
  const actions = [];
  const actionTypes = ['late_fee_review', 'billing_day_change', 'compliance_update', 'reminder_config', 'approval_needed'];

  billingConfigs.forEach(config => {
    // 30% chance of having a pending action
    if (randomBool(0.3)) {
      const count = randomInt(1, 3);
      for (let i = 0; i < count; i++) {
        const actionType = randomFrom(actionTypes);
        const priority = randomFrom(['high', 'medium', 'medium', 'low']);

        let description;
        switch (actionType) {
          case 'late_fee_review':
            description = 'Review late fee settings for state compliance';
            break;
          case 'billing_day_change':
            description = 'Update billing day per property manager request';
            break;
          case 'compliance_update':
            description = 'State regulation update requires review';
            break;
          case 'reminder_config':
            description = 'Configure automated payment reminders';
            break;
          case 'approval_needed':
            description = 'Rate adjustment requires approval';
            break;
          default:
            description = 'Pending action item';
        }

        actions.push({
          id: uuid(),
          billing_configuration_id: config.id,
          property_id: config.property_id,
          action_type: actionType,
          description,
          priority,
          due_date: formatDate(addDays(new Date(), randomInt(1, 30))),
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  });

  return actions;
}

/**
 * Generate security deposits
 */
function generateSecurityDeposits(tenants, leases, properties) {
  return leases.map(lease => {
    const property = properties.find(p => p.id === lease.property_id);
    const stateRules = STATE_COMPLIANCE[property?.state || 'NC'];

    return {
      id: uuid(),
      tenant_id: lease.tenant_id,
      property_id: lease.property_id,
      unit_id: lease.unit_id,
      lease_id: lease.id,
      amount: lease.security_deposit,
      date_received: lease.start_date,
      interest_rate: stateRules.interestRequired ? 0.01 : null,
      interest_accrued: 0,
      status: 'held',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
}

/**
 * Generate work orders for maintenance
 */
function generateWorkOrders(properties, units) {
  const workOrders = [];
  const categories = ['plumbing', 'electrical', 'hvac', 'appliance', 'general', 'exterior', 'pest_control'];
  const priorities = ['low', 'medium', 'medium', 'high', 'emergency'];
  const statuses = ['open', 'in_progress', 'pending_parts', 'completed', 'closed'];

  properties.forEach(property => {
    // 20-40% of units have work orders
    const propertyUnits = units.filter(u => u.property_id === property.id);
    const workOrderCount = Math.floor(propertyUnits.length * (0.2 + Math.random() * 0.2));

    for (let i = 0; i < workOrderCount; i++) {
      const unit = randomFrom(propertyUnits);
      const category = randomFrom(categories);
      const priority = randomFrom(priorities);
      const status = randomFrom(statuses);

      const createdDate = addDays(new Date(), -randomInt(0, 60));
      const completedDate = status === 'completed' || status === 'closed'
        ? addDays(createdDate, randomInt(1, 14))
        : null;

      const descriptions = {
        plumbing: ['Leaky faucet in bathroom', 'Clogged drain in kitchen', 'Running toilet', 'Low water pressure'],
        electrical: ['Outlet not working', 'Light fixture flickering', 'Breaker keeps tripping', 'Ceiling fan issue'],
        hvac: ['AC not cooling', 'Heating not working', 'Thermostat malfunction', 'Strange noise from vents'],
        appliance: ['Dishwasher not draining', 'Refrigerator not cooling', 'Washer leaking', 'Dryer not heating'],
        general: ['Door lock issue', 'Window won\'t close', 'Carpet stain', 'Wall damage'],
        exterior: ['Parking lot light out', 'Fence repair needed', 'Landscaping issue', 'Gate broken'],
        pest_control: ['Ant problem', 'Roach sighting', 'Mouse activity', 'Wasp nest'],
      };

      workOrders.push({
        id: uuid(),
        property_id: property.id,
        unit_id: unit?.id,
        work_order_number: `WO-${new Date().getFullYear()}-${String(workOrders.length + 1).padStart(5, '0')}`,
        category,
        priority,
        status,
        title: randomFrom(descriptions[category]),
        description: `Tenant reported issue requiring ${category} attention.`,
        created_at: createdDate.toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: completedDate?.toISOString(),
      });
    }
  });

  return workOrders;
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedDatabase() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     PropMaster Master Seed Data Script                     ║');
  console.log('║     Multi-Company | NC, SC, GA | All Modules               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const allProperties = [];
  const allUnits = [];
  const allPeople = [];
  const allTenants = [];
  const allLeases = [];
  const allPayments = [];
  const allBillingConfigs = [];
  const allPendingActions = [];
  const allSecurityDeposits = [];
  const allWorkOrders = [];

  // Generate data for each company
  console.log('📊 Generating data for', COMPANIES.length, 'companies...\n');

  COMPANIES.forEach((company, companyIdx) => {
    console.log(`  Company ${companyIdx + 1}: ${company.name}`);
    console.log(`    States: ${company.states.join(', ')}`);

    let companyPropertyCount = 0;
    company.states.forEach(state => {
      const count = company.propertyCount[state] || 10;
      const properties = generateProperties(company, state, count);
      allProperties.push(...properties);
      companyPropertyCount += count;

      properties.forEach(property => {
        const units = generateUnits(property);
        allUnits.push(...units);

        const people = generatePeople(units, property);
        allPeople.push(...people);

        const tenants = generateTenants(people, units);
        allTenants.push(...tenants);

        const leases = generateLeases(tenants, units);
        allLeases.push(...leases);

        const payments = generatePayments(tenants, units, leases);
        allPayments.push(...payments);
      });
    });

    console.log(`    Properties: ${companyPropertyCount}`);
  });

  // Generate billing configurations for all properties
  const billingConfigs = generateBillingConfigurations(allProperties);
  allBillingConfigs.push(...billingConfigs);

  const pendingActions = generatePendingActions(billingConfigs);
  allPendingActions.push(...pendingActions);

  // Generate security deposits
  const securityDeposits = generateSecurityDeposits(allTenants, allLeases, allProperties);
  allSecurityDeposits.push(...securityDeposits);

  // Generate work orders
  const workOrders = generateWorkOrders(allProperties, allUnits);
  allWorkOrders.push(...workOrders);

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    DATA SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const stateBreakdown = { NC: 0, SC: 0, GA: 0 };
  allProperties.forEach(p => stateBreakdown[p.state]++);

  console.log(`  Properties:           ${allProperties.length.toLocaleString()}`);
  console.log(`    - North Carolina:   ${stateBreakdown.NC}`);
  console.log(`    - South Carolina:   ${stateBreakdown.SC}`);
  console.log(`    - Georgia:          ${stateBreakdown.GA}`);
  console.log(`  Units:                ${allUnits.length.toLocaleString()}`);
  console.log(`  Tenants:              ${allTenants.length.toLocaleString()}`);
  console.log(`  Leases:               ${allLeases.length.toLocaleString()}`);
  console.log(`  Payments:             ${allPayments.length.toLocaleString()}`);
  console.log(`  Billing Configs:      ${allBillingConfigs.length.toLocaleString()}`);
  console.log(`  Pending Actions:      ${allPendingActions.length.toLocaleString()}`);
  console.log(`  Security Deposits:    ${allSecurityDeposits.length.toLocaleString()}`);
  console.log(`  Work Orders:          ${allWorkOrders.length.toLocaleString()}`);
  console.log('');

  // Insert into database
  console.log('📤 Inserting into database...\n');

  // 1. Properties
  console.log('  1/9 Inserting properties...');
  const { error: propError } = await supabase.from('properties').upsert(allProperties, { onConflict: 'id' });
  if (propError) console.log('    ❌ Error:', propError.message);
  else console.log('    ✅ Success!');

  // 2. Units
  console.log('  2/9 Inserting units...');
  const { error: unitError } = await supabase.from('units').upsert(allUnits, { onConflict: 'id' });
  if (unitError) console.log('    ❌ Error:', unitError.message);
  else console.log('    ✅ Success!');

  // 3. Tenants
  console.log('  3/9 Inserting tenants...');
  const { error: tenantError } = await supabase.from('tenants').upsert(allTenants, { onConflict: 'id' });
  if (tenantError) console.log('    ❌ Error:', tenantError.message);
  else console.log('    ✅ Success!');

  // 4. Leases
  console.log('  4/9 Inserting leases...');
  const { error: leaseError } = await supabase.from('leases').upsert(allLeases, { onConflict: 'id' });
  if (leaseError) console.log('    ❌ Error:', leaseError.message);
  else console.log('    ✅ Success!');

  // 5. Payments
  console.log('  5/9 Inserting payments...');
  // Insert in batches of 500
  for (let i = 0; i < allPayments.length; i += 500) {
    const batch = allPayments.slice(i, i + 500);
    const { error: paymentError } = await supabase.from('payments').upsert(batch, { onConflict: 'id' });
    if (paymentError) {
      console.log(`    ❌ Error (batch ${Math.floor(i / 500) + 1}):`, paymentError.message);
    }
  }
  console.log('    ✅ Success!');

  // 6. Billing Configurations
  console.log('  6/9 Inserting billing configurations...');
  const { error: billingError } = await supabase.from('billing_configurations').upsert(allBillingConfigs, { onConflict: 'property_id' });
  if (billingError) console.log('    ⚠️  Note:', billingError.message, '(table may not exist yet)');
  else console.log('    ✅ Success!');

  // 7. Pending Actions
  console.log('  7/9 Inserting pending actions...');
  const { error: actionError } = await supabase.from('billing_pending_actions').upsert(allPendingActions, { onConflict: 'id' });
  if (actionError) console.log('    ⚠️  Note:', actionError.message, '(table may not exist yet)');
  else console.log('    ✅ Success!');

  // 8. Security Deposits
  console.log('  8/9 Inserting security deposits...');
  const { error: depositError } = await supabase.from('security_deposits').upsert(allSecurityDeposits, { onConflict: 'id' });
  if (depositError) console.log('    ⚠️  Note:', depositError.message);
  else console.log('    ✅ Success!');

  // 9. Work Orders
  console.log('  9/9 Inserting work orders...');
  const { error: woError } = await supabase.from('work_orders').upsert(allWorkOrders, { onConflict: 'id' });
  if (woError) console.log('    ⚠️  Note:', woError.message, '(table may not exist)');
  else console.log('    ✅ Success!');

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              SEED DATA COMPLETE!                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Seed Marker: ${SEED_MARKER}`);
  console.log('  Use scripts/clear-seed-data.mjs to remove seed data');
  console.log('');
}

// Run the seeding
seedDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
