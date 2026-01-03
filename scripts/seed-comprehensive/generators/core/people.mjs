/**
 * People Generator
 * Generates tenants, owners, and vendors
 */

import { personId, tenantId, ownerId, vendorId, uuid } from '../../utils/id-generators.mjs';
import { seedMetadata, seedEmail, seedPhone } from '../../utils/markers.mjs';
import { isoTimestamp, daysAgo, monthsAgo, randomDateInRange } from '../../utils/date-utils.mjs';
import { randomAmount } from '../../utils/decimal-utils.mjs';
import { PAYMENT_SCENARIOS } from '../../config/seed-config.mjs';

// First names pool
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
];

// Last names pool
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
];

// Vendor company suffixes
const VENDOR_SUFFIXES = [
  'Services', 'Solutions', 'Contractors', 'Experts', 'Pros', 'Co.', 'LLC', 'Inc.',
];

// Vendor specialties
const VENDOR_SPECIALTIES = [
  { category: 'plumbing', names: ['Plumbing', 'Pipe', 'Drain', 'Water'] },
  { category: 'electrical', names: ['Electric', 'Power', 'Wiring', 'Volt'] },
  { category: 'hvac', names: ['HVAC', 'Climate', 'Heating & Cooling', 'Air'] },
  { category: 'landscaping', names: ['Landscape', 'Lawn', 'Garden', 'Green'] },
  { category: 'cleaning', names: ['Clean', 'Sparkle', 'Fresh', 'Pristine'] },
  { category: 'painting', names: ['Paint', 'Color', 'Brush', 'Coating'] },
  { category: 'roofing', names: ['Roof', 'Top', 'Shingle', 'Cover'] },
  { category: 'general', names: ['Handyman', 'Fix-It', 'Repair', 'Maintenance'] },
];

/**
 * Generate a random name
 * @returns {object} First and last name
 */
function generateName() {
  return {
    firstName: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
    lastName: LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)],
  };
}

/**
 * Generate a random date of birth (18-70 years old)
 * @returns {string} Date of birth
 */
function generateDateOfBirth() {
  const minAge = 18;
  const maxAge = 70;
  const age = minAge + Math.floor(Math.random() * (maxAge - minAge));
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  date.setMonth(Math.floor(Math.random() * 12));
  date.setDate(Math.floor(Math.random() * 28) + 1);
  return date.toISOString().split('T')[0];
}

/**
 * Determine payment behavior type based on configured percentages
 * @returns {string} Payment behavior type
 */
function determinePaymentBehavior() {
  const random = Math.random();
  let cumulative = 0;

  for (const [type, config] of Object.entries(PAYMENT_SCENARIOS)) {
    cumulative += config.percentage;
    if (random <= cumulative) {
      return type;
    }
  }

  return 'PERFECT_PAYER';
}

/**
 * Generate a person record (base)
 * @param {string} type - Person type (tenant, owner, vendor)
 * @param {number} index - Person index
 * @returns {object} Person base record
 */
function generatePersonBase(type, index) {
  const { firstName, lastName } = generateName();

  return {
    id: personId(type),
    type,
    first_name: firstName,
    last_name: lastName,
    email: seedEmail(`${firstName.toLowerCase()}.${lastName.toLowerCase()}.${index}`),
    phone: seedPhone(1000 + index),
    date_of_birth: type === 'tenant' ? generateDateOfBirth() : null,
    status: 'active',
    created_at: randomDateInRange(monthsAgo(24), monthsAgo(1)),
    updated_at: isoTimestamp(),
  };
}

/**
 * Generate a tenant record
 * @param {object} options - Generation options
 * @returns {object} Tenant record
 */
export function generateTenant(options = {}) {
  const {
    property = null,
    unit = null,
    index = 0,
    testCaseId = null,
  } = options;

  const person = generatePersonBase('tenant', index);
  const paymentBehavior = determinePaymentBehavior();
  const behaviorConfig = PAYMENT_SCENARIOS[paymentBehavior];

  // Calculate balance due based on payment behavior
  let balanceDue = '0.00';
  if (unit && paymentBehavior === 'DELINQUENT') {
    balanceDue = (parseFloat(unit.rent_amount) * 2).toFixed(2);
  } else if (unit && paymentBehavior === 'LATE_PAYER') {
    balanceDue = unit.rent_amount;
  } else if (unit && paymentBehavior === 'PARTIAL_PAYER') {
    balanceDue = (parseFloat(unit.rent_amount) * 0.25).toFixed(2);
  }

  return {
    ...person,
    id: tenantId(),
    person_id: person.id,

    // Property/Unit assignment
    property_id: property?.id || null,
    unit_id: unit?.id || null,

    // Financial
    balance_due: balanceDue,
    rent_amount: unit?.rent_amount || '0.00',

    // Payment behavior (for seed tracking)
    payment_behavior: paymentBehavior,

    // Portal access
    portal_access: Math.random() > 0.2, // 80% have portal access
    portal_last_login: Math.random() > 0.3 ? daysAgo(Math.floor(Math.random() * 30)) : null,

    // Emergency contact
    emergency_contact_name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${person.last_name}`,
    emergency_contact_phone: seedPhone(2000 + index),
    emergency_contact_relationship: ['Parent', 'Sibling', 'Spouse', 'Friend'][Math.floor(Math.random() * 4)],

    // Seed metadata
    metadata: seedMetadata(testCaseId, {
      seed_type: 'tenant',
      payment_behavior: paymentBehavior,
      has_balance: parseFloat(balanceDue) > 0,
    }),
  };
}

/**
 * Generate an owner record
 * @param {object} options - Generation options
 * @returns {object} Owner record
 */
export function generateOwner(options = {}) {
  const {
    company = null,
    index = 0,
    testCaseId = null,
  } = options;

  const person = generatePersonBase('owner', index);

  // Owner type distribution
  const ownerTypes = ['individual', 'llc', 'corporation', 'trust'];
  const ownerType = ownerTypes[Math.floor(Math.random() * ownerTypes.length)];

  // Distribution method
  const distributionMethods = ['direct_deposit', 'check', 'wire'];
  const distributionMethod = distributionMethods[Math.floor(Math.random() * distributionMethods.length)];

  return {
    ...person,
    id: ownerId(),
    person_id: person.id,
    company_id: company?.id || null,

    // Owner details
    owner_type: ownerType,
    business_name: ownerType !== 'individual'
      ? `${person.last_name} ${['Holdings', 'Properties', 'Investments', 'Realty'][Math.floor(Math.random() * 4)]} ${ownerType.toUpperCase()}`
      : null,

    // Tax info
    tax_id: `${String(Math.floor(Math.random() * 90) + 10)}-${String(Math.floor(Math.random() * 9000000) + 1000000)}`,

    // Distribution
    distribution_method: distributionMethod,
    distribution_day: Math.floor(Math.random() * 28) + 1,

    // Banking
    bank_name: 'First National Bank',
    routing_number: '053000196',
    account_number_last4: String(Math.floor(Math.random() * 9000) + 1000),

    // Seed metadata
    metadata: seedMetadata(testCaseId, {
      seed_type: 'owner',
      owner_type: ownerType,
      distribution_method: distributionMethod,
    }),
  };
}

/**
 * Generate a vendor record
 * @param {object} options - Generation options
 * @returns {object} Vendor record
 */
export function generateVendor(options = {}) {
  const {
    company = null,
    index = 0,
    specialtyCategory = null,
    testCaseId = null,
  } = options;

  const person = generatePersonBase('vendor', index);

  // Select specialty
  const specialty = specialtyCategory
    ? VENDOR_SPECIALTIES.find(s => s.category === specialtyCategory)
    : VENDOR_SPECIALTIES[Math.floor(Math.random() * VENDOR_SPECIALTIES.length)];

  // Generate business name
  const businessNamePrefix = specialty.names[Math.floor(Math.random() * specialty.names.length)];
  const businessNameSuffix = VENDOR_SUFFIXES[Math.floor(Math.random() * VENDOR_SUFFIXES.length)];
  const businessName = `${person.last_name} ${businessNamePrefix} ${businessNameSuffix}`;

  // Hourly rate based on specialty
  const rateRanges = {
    plumbing: [75, 150],
    electrical: [80, 160],
    hvac: [85, 175],
    landscaping: [40, 80],
    cleaning: [25, 50],
    painting: [35, 75],
    roofing: [60, 120],
    general: [45, 90],
  };
  const [minRate, maxRate] = rateRanges[specialty.category] || [50, 100];
  const hourlyRate = minRate + Math.random() * (maxRate - minRate);

  return {
    ...person,
    id: vendorId(),
    person_id: person.id,
    company_id: company?.id || null,

    // Business info
    business_name: businessName,
    service_categories: [specialty.category],
    specialty: specialty.category,

    // Rates
    hourly_rate: hourlyRate.toFixed(2),

    // Performance (for established vendors)
    total_jobs: Math.floor(Math.random() * 100) + 10,
    average_rating: (3.5 + Math.random() * 1.5).toFixed(1),
    on_time_percentage: (85 + Math.random() * 15).toFixed(0),

    // License
    license_number: `${specialty.category.toUpperCase().slice(0, 3)}-${String(Math.floor(Math.random() * 90000) + 10000)}`,
    license_expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

    // Insurance
    insurance_policy_number: `INS-${String(Math.floor(Math.random() * 900000) + 100000)}`,
    insurance_expiration: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

    // Tax info (for 1099)
    tax_id: `${String(Math.floor(Math.random() * 90) + 10)}-${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
    total_payments_ytd: randomAmount(0, 5000),

    // Seed metadata
    metadata: seedMetadata(testCaseId, {
      seed_type: 'vendor',
      specialty: specialty.category,
      has_tin: true,
    }),
  };
}

/**
 * Generate tenants for occupied units
 * @param {object[]} units - Array of units
 * @param {object[]} properties - Array of properties
 * @returns {object[]} Array of tenant records
 */
export function generateTenantsForUnits(units, properties) {
  const tenants = [];
  const occupiedUnits = units.filter(u => u.status === 'occupied');

  occupiedUnits.forEach((unit, index) => {
    const property = properties.find(p => p.id === unit.property_id);
    tenants.push(generateTenant({
      property,
      unit,
      index,
    }));
  });

  return tenants;
}

/**
 * Generate owners for a company
 * @param {object} company - Company record
 * @param {number} count - Number of owners
 * @returns {object[]} Array of owner records
 */
export function generateOwnersForCompany(company, count = 20) {
  const owners = [];

  for (let i = 0; i < count; i++) {
    owners.push(generateOwner({
      company,
      index: i,
    }));
  }

  return owners;
}

/**
 * Generate vendors for a company
 * @param {object} company - Company record
 * @param {number} count - Number of vendors
 * @returns {object[]} Array of vendor records
 */
export function generateVendorsForCompany(company, count = 30) {
  const vendors = [];

  // Ensure we have vendors for each specialty
  const specialties = VENDOR_SPECIALTIES.map(s => s.category);

  for (let i = 0; i < count; i++) {
    const specialty = i < specialties.length ? specialties[i] : null;
    vendors.push(generateVendor({
      company,
      index: i,
      specialtyCategory: specialty,
    }));
  }

  return vendors;
}

/**
 * Get tenant distribution by payment behavior
 * @param {object[]} tenants - Array of tenants
 * @returns {object} Distribution by behavior
 */
export function getTenantDistribution(tenants) {
  const distribution = {};

  tenants.forEach(t => {
    const behavior = t.payment_behavior || 'UNKNOWN';
    distribution[behavior] = (distribution[behavior] || 0) + 1;
  });

  distribution.total = tenants.length;
  distribution.withBalance = tenants.filter(t => parseFloat(t.balance_due) > 0).length;

  return distribution;
}

export default {
  generateTenant,
  generateOwner,
  generateVendor,
  generateTenantsForUnits,
  generateOwnersForCompany,
  generateVendorsForCompany,
  getTenantDistribution,
  FIRST_NAMES,
  LAST_NAMES,
  VENDOR_SPECIALTIES,
};
