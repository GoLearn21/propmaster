/**
 * Regional Test Seed Data
 * Realistic test data for North Carolina, South Carolina, and Georgia (Atlanta)
 *
 * This data is designed to test:
 * - State-specific legal requirements
 * - Edge cases in payment processing
 * - Accounting accuracy (zero tolerance)
 * - Class action lawsuit prevention scenarios
 */

// State codes
export const STATES = {
  NC: 'NC',
  SC: 'SC',
  GA: 'GA'
} as const;

export type StateCode = typeof STATES[keyof typeof STATES];

/**
 * State-specific legal requirements
 * Critical for avoiding class action lawsuits
 */
export const STATE_REGULATIONS = {
  NC: {
    name: 'North Carolina',
    // NC Gen. Stat. § 42-50 - Security deposit limits
    securityDepositLimit: {
      weekToWeek: 2, // 2 weeks rent
      monthToMonth: 1.5, // 1.5 months rent
      longerTerm: 2, // 2 months rent max
    },
    // NC Gen. Stat. § 42-51 - Must return within 30 days
    securityDepositReturnDays: 30,
    // NC Gen. Stat. § 42-52 - Must be held in trust account
    requiresTrustAccount: true,
    // Late fee limits - NC Gen. Stat. § 42-46
    lateFeeRules: {
      gracePeriodDays: 5, // Must allow 5 day grace period
      maxFeePercent: 0.05, // 5% of monthly rent or $15, whichever is greater
      maxFlatFee: 15,
      minFeeIfPercent: 15,
    },
    // Interest on security deposits not required
    securityDepositInterestRequired: false,
  },
  SC: {
    name: 'South Carolina',
    // SC Code § 27-40-410 - No statutory limit
    securityDepositLimit: {
      weekToWeek: null, // No limit
      monthToMonth: null,
      longerTerm: null,
    },
    // SC Code § 27-40-410 - Must return within 30 days
    securityDepositReturnDays: 30,
    requiresTrustAccount: false,
    // Late fee rules - reasonable fees allowed
    lateFeeRules: {
      gracePeriodDays: 0, // No mandatory grace period
      maxFeePercent: null, // Must be "reasonable"
      maxFlatFee: null,
      reasonableStandard: true,
    },
    securityDepositInterestRequired: false,
  },
  GA: {
    name: 'Georgia',
    // GA Code § 44-7-30 - No statutory limit
    securityDepositLimit: {
      weekToWeek: null,
      monthToMonth: null,
      longerTerm: null,
    },
    // GA Code § 44-7-34 - Must return within 30 days
    securityDepositReturnDays: 30,
    // GA Code § 44-7-31 - Escrow account required for 10+ units
    requiresTrustAccount: true, // For landlords with 10+ units
    escrowThresholdUnits: 10,
    // Late fee rules
    lateFeeRules: {
      gracePeriodDays: 0,
      maxFeePercent: null, // Must be in lease
      maxFlatFee: null,
      mustBeInLease: true,
    },
    securityDepositInterestRequired: false,
  },
};

/**
 * Test Properties - Realistic property data for each state
 */
export const TEST_PROPERTIES = {
  NC: [
    {
      id: 'prop-nc-001',
      name: 'Raleigh Oak Apartments',
      address: '1234 Hillsborough St',
      city: 'Raleigh',
      state: 'NC',
      zip: '27607',
      type: 'multi_family',
      units_count: 24,
      year_built: 2018,
    },
    {
      id: 'prop-nc-002',
      name: 'Charlotte Uptown Lofts',
      address: '500 S Tryon St',
      city: 'Charlotte',
      state: 'NC',
      zip: '28202',
      type: 'multi_family',
      units_count: 48,
      year_built: 2020,
    },
    {
      id: 'prop-nc-003',
      name: 'Durham Single Family',
      address: '789 Chapel Hill Rd',
      city: 'Durham',
      state: 'NC',
      zip: '27707',
      type: 'single_family',
      units_count: 1,
      year_built: 1995,
    },
  ],
  SC: [
    {
      id: 'prop-sc-001',
      name: 'Charleston Harbor View',
      address: '100 Meeting St',
      city: 'Charleston',
      state: 'SC',
      zip: '29401',
      type: 'multi_family',
      units_count: 36,
      year_built: 2019,
    },
    {
      id: 'prop-sc-002',
      name: 'Columbia Campus Edge',
      address: '1500 Main St',
      city: 'Columbia',
      state: 'SC',
      zip: '29201',
      type: 'multi_family',
      units_count: 60,
      year_built: 2021,
    },
  ],
  GA: [
    {
      id: 'prop-ga-001',
      name: 'Atlanta Midtown Tower',
      address: '1100 Peachtree St NE',
      city: 'Atlanta',
      state: 'GA',
      zip: '30309',
      type: 'multi_family',
      units_count: 120,
      year_built: 2022,
    },
    {
      id: 'prop-ga-002',
      name: 'Buckhead Luxury Residences',
      address: '3500 Lenox Rd NE',
      city: 'Atlanta',
      state: 'GA',
      zip: '30326',
      type: 'multi_family',
      units_count: 85,
      year_built: 2021,
    },
    {
      id: 'prop-ga-003',
      name: 'Decatur Family Homes',
      address: '200 E Ponce de Leon Ave',
      city: 'Decatur',
      state: 'GA',
      zip: '30030',
      type: 'townhouse',
      units_count: 8,
      year_built: 2017,
    },
  ],
};

/**
 * Test Units - Unit configurations for testing
 */
export const TEST_UNITS = {
  NC: [
    // Raleigh property units
    { id: 'unit-nc-001', property_id: 'prop-nc-001', unit_number: '101', bedrooms: 1, bathrooms: 1, sqft: 650, rent_amount: 1200.00, status: 'occupied' },
    { id: 'unit-nc-002', property_id: 'prop-nc-001', unit_number: '102', bedrooms: 2, bathrooms: 1, sqft: 950, rent_amount: 1500.00, status: 'occupied' },
    { id: 'unit-nc-003', property_id: 'prop-nc-001', unit_number: '201', bedrooms: 2, bathrooms: 2, sqft: 1100, rent_amount: 1750.00, status: 'occupied' },
    { id: 'unit-nc-004', property_id: 'prop-nc-001', unit_number: '202', bedrooms: 3, bathrooms: 2, sqft: 1400, rent_amount: 2200.00, status: 'vacant' },
    // Charlotte property units
    { id: 'unit-nc-005', property_id: 'prop-nc-002', unit_number: 'A1', bedrooms: 1, bathrooms: 1, sqft: 720, rent_amount: 1450.00, status: 'occupied' },
    { id: 'unit-nc-006', property_id: 'prop-nc-002', unit_number: 'A2', bedrooms: 2, bathrooms: 2, sqft: 1050, rent_amount: 1850.00, status: 'occupied' },
    // Durham single family
    { id: 'unit-nc-007', property_id: 'prop-nc-003', unit_number: 'Main', bedrooms: 3, bathrooms: 2, sqft: 1800, rent_amount: 1950.00, status: 'occupied' },
  ],
  SC: [
    // Charleston property units
    { id: 'unit-sc-001', property_id: 'prop-sc-001', unit_number: '1A', bedrooms: 1, bathrooms: 1, sqft: 680, rent_amount: 1650.00, status: 'occupied' },
    { id: 'unit-sc-002', property_id: 'prop-sc-001', unit_number: '1B', bedrooms: 2, bathrooms: 1, sqft: 920, rent_amount: 2100.00, status: 'occupied' },
    { id: 'unit-sc-003', property_id: 'prop-sc-001', unit_number: '2A', bedrooms: 2, bathrooms: 2, sqft: 1150, rent_amount: 2450.00, status: 'occupied' },
    // Columbia property units
    { id: 'unit-sc-004', property_id: 'prop-sc-002', unit_number: '101', bedrooms: 1, bathrooms: 1, sqft: 550, rent_amount: 950.00, status: 'occupied' },
    { id: 'unit-sc-005', property_id: 'prop-sc-002', unit_number: '102', bedrooms: 2, bathrooms: 1, sqft: 800, rent_amount: 1150.00, status: 'occupied' },
  ],
  GA: [
    // Atlanta Midtown units
    { id: 'unit-ga-001', property_id: 'prop-ga-001', unit_number: '1001', bedrooms: 1, bathrooms: 1, sqft: 750, rent_amount: 1800.00, status: 'occupied' },
    { id: 'unit-ga-002', property_id: 'prop-ga-001', unit_number: '1002', bedrooms: 2, bathrooms: 2, sqft: 1100, rent_amount: 2500.00, status: 'occupied' },
    { id: 'unit-ga-003', property_id: 'prop-ga-001', unit_number: '2001', bedrooms: 3, bathrooms: 2, sqft: 1450, rent_amount: 3200.00, status: 'occupied' },
    // Buckhead units
    { id: 'unit-ga-004', property_id: 'prop-ga-002', unit_number: 'PH1', bedrooms: 3, bathrooms: 3, sqft: 2200, rent_amount: 5500.00, status: 'occupied' },
    { id: 'unit-ga-005', property_id: 'prop-ga-002', unit_number: '501', bedrooms: 2, bathrooms: 2, sqft: 1300, rent_amount: 3100.00, status: 'occupied' },
    // Decatur units
    { id: 'unit-ga-006', property_id: 'prop-ga-003', unit_number: 'TH-1', bedrooms: 3, bathrooms: 2.5, sqft: 1650, rent_amount: 2400.00, status: 'occupied' },
  ],
};

/**
 * Test Tenants - Diverse tenant scenarios
 */
export const TEST_TENANTS = {
  NC: [
    {
      id: 'tenant-nc-001',
      person_id: 'person-nc-001',
      first_name: 'Michael',
      last_name: 'Johnson',
      email: 'mjohnson@example.com',
      phone: '919-555-0101',
      balance_due: 0.00,
      credit_score: 720,
    },
    {
      id: 'tenant-nc-002',
      person_id: 'person-nc-002',
      first_name: 'Sarah',
      last_name: 'Williams',
      email: 'swilliams@example.com',
      phone: '704-555-0102',
      balance_due: 1500.00, // Has outstanding balance
      credit_score: 680,
    },
    {
      id: 'tenant-nc-003',
      person_id: 'person-nc-003',
      first_name: 'David',
      last_name: 'Chen',
      email: 'dchen@example.com',
      phone: '919-555-0103',
      balance_due: 75.00, // Late fee only
      credit_score: 750,
    },
    {
      id: 'tenant-nc-004',
      person_id: 'person-nc-004',
      first_name: 'Jennifer',
      last_name: 'Martinez',
      email: 'jmartinez@example.com',
      phone: '704-555-0104',
      balance_due: 0.00,
      credit_score: 695,
    },
  ],
  SC: [
    {
      id: 'tenant-sc-001',
      person_id: 'person-sc-001',
      first_name: 'Robert',
      last_name: 'Thompson',
      email: 'rthompson@example.com',
      phone: '843-555-0201',
      balance_due: 0.00,
      credit_score: 710,
    },
    {
      id: 'tenant-sc-002',
      person_id: 'person-sc-002',
      first_name: 'Amanda',
      last_name: 'Davis',
      email: 'adavis@example.com',
      phone: '803-555-0202',
      balance_due: 2100.00, // One month behind
      credit_score: 640,
    },
    {
      id: 'tenant-sc-003',
      person_id: 'person-sc-003',
      first_name: 'James',
      last_name: 'Wilson',
      email: 'jwilson@example.com',
      phone: '843-555-0203',
      balance_due: 0.00,
      credit_score: 780,
    },
  ],
  GA: [
    {
      id: 'tenant-ga-001',
      person_id: 'person-ga-001',
      first_name: 'Christopher',
      last_name: 'Brown',
      email: 'cbrown@example.com',
      phone: '404-555-0301',
      balance_due: 0.00,
      credit_score: 735,
    },
    {
      id: 'tenant-ga-002',
      person_id: 'person-ga-002',
      first_name: 'Jessica',
      last_name: 'Taylor',
      email: 'jtaylor@example.com',
      phone: '404-555-0302',
      balance_due: 5500.00, // One month behind (high rent)
      credit_score: 700,
    },
    {
      id: 'tenant-ga-003',
      person_id: 'person-ga-003',
      first_name: 'William',
      last_name: 'Anderson',
      email: 'wanderson@example.com',
      phone: '678-555-0303',
      balance_due: 0.00,
      credit_score: 760,
    },
    {
      id: 'tenant-ga-004',
      person_id: 'person-ga-004',
      first_name: 'Emily',
      last_name: 'Thomas',
      email: 'ethomas@example.com',
      phone: '404-555-0304',
      balance_due: 320.00, // Partial payment made
      credit_score: 690,
    },
  ],
};

/**
 * Test Leases - Various lease configurations
 */
export const TEST_LEASES = {
  NC: [
    {
      id: 'lease-nc-001',
      property_id: 'prop-nc-001',
      unit_id: 'unit-nc-001',
      tenant_id: 'tenant-nc-001',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      monthly_rent: 1200.00,
      security_deposit: 2400.00, // 2 months - max allowed in NC
      status: 'active',
      lease_type: 'fixed_term',
      late_fee_amount: 60.00, // 5% of rent (NC max)
      grace_period_days: 5, // NC required
    },
    {
      id: 'lease-nc-002',
      property_id: 'prop-nc-001',
      unit_id: 'unit-nc-002',
      tenant_id: 'tenant-nc-002',
      start_date: '2024-03-01',
      end_date: '2025-02-28',
      monthly_rent: 1500.00,
      security_deposit: 3000.00,
      status: 'active',
      lease_type: 'fixed_term',
      late_fee_amount: 75.00,
      grace_period_days: 5,
    },
    {
      id: 'lease-nc-003',
      property_id: 'prop-nc-001',
      unit_id: 'unit-nc-003',
      tenant_id: 'tenant-nc-003',
      start_date: '2024-06-01',
      end_date: '2025-05-31',
      monthly_rent: 1750.00,
      security_deposit: 3500.00,
      status: 'active',
      lease_type: 'fixed_term',
      late_fee_amount: 87.50,
      grace_period_days: 5,
    },
    {
      id: 'lease-nc-004',
      property_id: 'prop-nc-002',
      unit_id: 'unit-nc-005',
      tenant_id: 'tenant-nc-004',
      start_date: '2024-02-01',
      end_date: '2025-01-31',
      monthly_rent: 1450.00,
      security_deposit: 2900.00,
      status: 'active',
      lease_type: 'fixed_term',
      late_fee_amount: 72.50,
      grace_period_days: 5,
    },
  ],
  SC: [
    {
      id: 'lease-sc-001',
      property_id: 'prop-sc-001',
      unit_id: 'unit-sc-001',
      tenant_id: 'tenant-sc-001',
      start_date: '2024-01-15',
      end_date: '2025-01-14',
      monthly_rent: 1650.00,
      security_deposit: 1650.00, // 1 month (no limit in SC)
      status: 'active',
      lease_type: 'fixed_term',
      late_fee_amount: 82.50, // 5% reasonable
      grace_period_days: 3,
    },
    {
      id: 'lease-sc-002',
      property_id: 'prop-sc-001',
      unit_id: 'unit-sc-002',
      tenant_id: 'tenant-sc-002',
      start_date: '2024-04-01',
      end_date: '2025-03-31',
      monthly_rent: 2100.00,
      security_deposit: 2100.00,
      status: 'active',
      lease_type: 'fixed_term',
      late_fee_amount: 100.00,
      grace_period_days: 5,
    },
    {
      id: 'lease-sc-003',
      property_id: 'prop-sc-002',
      unit_id: 'unit-sc-004',
      tenant_id: 'tenant-sc-003',
      start_date: '2024-08-01',
      end_date: '2025-07-31',
      monthly_rent: 950.00,
      security_deposit: 950.00,
      status: 'active',
      lease_type: 'fixed_term',
      late_fee_amount: 50.00,
      grace_period_days: 5,
    },
  ],
  GA: [
    {
      id: 'lease-ga-001',
      property_id: 'prop-ga-001',
      unit_id: 'unit-ga-001',
      tenant_id: 'tenant-ga-001',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      monthly_rent: 1800.00,
      security_deposit: 1800.00,
      status: 'active',
      lease_type: 'fixed_term',
      late_fee_amount: 90.00,
      grace_period_days: 3,
    },
    {
      id: 'lease-ga-002',
      property_id: 'prop-ga-002',
      unit_id: 'unit-ga-004',
      tenant_id: 'tenant-ga-002',
      start_date: '2024-02-01',
      end_date: '2025-01-31',
      monthly_rent: 5500.00,
      security_deposit: 11000.00, // 2 months for luxury
      status: 'active',
      lease_type: 'fixed_term',
      late_fee_amount: 275.00,
      grace_period_days: 5,
    },
    {
      id: 'lease-ga-003',
      property_id: 'prop-ga-001',
      unit_id: 'unit-ga-002',
      tenant_id: 'tenant-ga-003',
      start_date: '2024-05-01',
      end_date: '2025-04-30',
      monthly_rent: 2500.00,
      security_deposit: 2500.00,
      status: 'active',
      lease_type: 'fixed_term',
      late_fee_amount: 125.00,
      grace_period_days: 5,
    },
    {
      id: 'lease-ga-004',
      property_id: 'prop-ga-003',
      unit_id: 'unit-ga-006',
      tenant_id: 'tenant-ga-004',
      start_date: '2024-03-01',
      end_date: '2025-02-28',
      monthly_rent: 2400.00,
      security_deposit: 2400.00,
      status: 'active',
      lease_type: 'fixed_term',
      late_fee_amount: 120.00,
      grace_period_days: 5,
    },
  ],
};

/**
 * Test Payments - Payment history for testing calculations
 */
export const TEST_PAYMENTS = {
  NC: [
    // Tenant 1 - Perfect payment history
    { id: 'pay-nc-001', tenant_id: 'tenant-nc-001', lease_id: 'lease-nc-001', amount: 1200.00, payment_date: '2024-01-01', status: 'paid', late_fee: 0 },
    { id: 'pay-nc-002', tenant_id: 'tenant-nc-001', lease_id: 'lease-nc-001', amount: 1200.00, payment_date: '2024-02-01', status: 'paid', late_fee: 0 },
    { id: 'pay-nc-003', tenant_id: 'tenant-nc-001', lease_id: 'lease-nc-001', amount: 1200.00, payment_date: '2024-03-01', status: 'paid', late_fee: 0 },
    // Tenant 2 - Has late payments and outstanding balance
    { id: 'pay-nc-004', tenant_id: 'tenant-nc-002', lease_id: 'lease-nc-002', amount: 1500.00, payment_date: '2024-03-01', status: 'paid', late_fee: 0 },
    { id: 'pay-nc-005', tenant_id: 'tenant-nc-002', lease_id: 'lease-nc-002', amount: 1500.00, payment_date: '2024-04-08', status: 'paid', late_fee: 75.00 }, // Late
    { id: 'pay-nc-006', tenant_id: 'tenant-nc-002', lease_id: 'lease-nc-002', amount: 1500.00, status: 'pending', late_fee: 0 }, // Outstanding
    // Tenant 3 - Paid with late fee
    { id: 'pay-nc-007', tenant_id: 'tenant-nc-003', lease_id: 'lease-nc-003', amount: 1750.00, payment_date: '2024-06-01', status: 'paid', late_fee: 0 },
    { id: 'pay-nc-008', tenant_id: 'tenant-nc-003', lease_id: 'lease-nc-003', amount: 1750.00, payment_date: '2024-07-08', status: 'paid', late_fee: 87.50 },
    { id: 'pay-nc-009', tenant_id: 'tenant-nc-003', lease_id: 'lease-nc-003', amount: 75.00, status: 'pending', late_fee: 0 }, // Outstanding late fee
  ],
  SC: [
    // Tenant 1 - Good history
    { id: 'pay-sc-001', tenant_id: 'tenant-sc-001', lease_id: 'lease-sc-001', amount: 1650.00, payment_date: '2024-01-15', status: 'paid', late_fee: 0 },
    { id: 'pay-sc-002', tenant_id: 'tenant-sc-001', lease_id: 'lease-sc-001', amount: 1650.00, payment_date: '2024-02-15', status: 'paid', late_fee: 0 },
    // Tenant 2 - One month behind
    { id: 'pay-sc-003', tenant_id: 'tenant-sc-002', lease_id: 'lease-sc-002', amount: 2100.00, payment_date: '2024-04-01', status: 'paid', late_fee: 0 },
    { id: 'pay-sc-004', tenant_id: 'tenant-sc-002', lease_id: 'lease-sc-002', amount: 2100.00, payment_date: '2024-05-10', status: 'paid', late_fee: 100.00 },
    { id: 'pay-sc-005', tenant_id: 'tenant-sc-002', lease_id: 'lease-sc-002', amount: 2100.00, status: 'pending', late_fee: 0 },
  ],
  GA: [
    // Tenant 1 - Perfect history
    { id: 'pay-ga-001', tenant_id: 'tenant-ga-001', lease_id: 'lease-ga-001', amount: 1800.00, payment_date: '2024-01-01', status: 'paid', late_fee: 0 },
    { id: 'pay-ga-002', tenant_id: 'tenant-ga-001', lease_id: 'lease-ga-001', amount: 1800.00, payment_date: '2024-02-01', status: 'paid', late_fee: 0 },
    { id: 'pay-ga-003', tenant_id: 'tenant-ga-001', lease_id: 'lease-ga-001', amount: 1800.00, payment_date: '2024-03-01', status: 'paid', late_fee: 0 },
    // Tenant 2 - High rent, one month behind
    { id: 'pay-ga-004', tenant_id: 'tenant-ga-002', lease_id: 'lease-ga-002', amount: 5500.00, payment_date: '2024-02-01', status: 'paid', late_fee: 0 },
    { id: 'pay-ga-005', tenant_id: 'tenant-ga-002', lease_id: 'lease-ga-002', amount: 5500.00, payment_date: '2024-03-08', status: 'paid', late_fee: 275.00 },
    { id: 'pay-ga-006', tenant_id: 'tenant-ga-002', lease_id: 'lease-ga-002', amount: 5500.00, status: 'pending', late_fee: 0 },
    // Tenant 3 - Good history
    { id: 'pay-ga-007', tenant_id: 'tenant-ga-003', lease_id: 'lease-ga-003', amount: 2500.00, payment_date: '2024-05-01', status: 'paid', late_fee: 0 },
    { id: 'pay-ga-008', tenant_id: 'tenant-ga-003', lease_id: 'lease-ga-003', amount: 2500.00, payment_date: '2024-06-01', status: 'paid', late_fee: 0 },
    // Tenant 4 - Partial payment
    { id: 'pay-ga-009', tenant_id: 'tenant-ga-004', lease_id: 'lease-ga-004', amount: 2400.00, payment_date: '2024-03-01', status: 'paid', late_fee: 0 },
    { id: 'pay-ga-010', tenant_id: 'tenant-ga-004', lease_id: 'lease-ga-004', amount: 2080.00, payment_date: '2024-04-05', status: 'paid', late_fee: 0 }, // Partial
  ],
};

/**
 * Edge case scenarios for testing
 */
export const EDGE_CASE_SCENARIOS = {
  // Floating point precision issues
  floatingPointPayments: [
    { amount: 1333.33, expected: 1333.33 },
    { amount: 999.99, expected: 999.99 },
    { amount: 0.01, expected: 0.01 },
    { amount: 1666.67, expected: 1666.67 },
  ],
  // Leap year date handling
  leapYearDates: [
    { date: '2024-02-29', isValid: true },
    { date: '2023-02-29', isValid: false },
  ],
  // Timezone edge cases
  timezoneEdgeCases: [
    { utc: '2024-01-01T00:00:00Z', localExpected: '2023-12-31' }, // EST
  ],
  // Boundary values
  boundaryValues: {
    maxRent: 99999999.99,
    minRent: 0.01,
    maxLateFee: 9999.99,
    maxSecurityDeposit: 999999.99,
  },
  // Rounding scenarios
  roundingScenarios: [
    { input: 1234.567, expected: 1234.57, description: 'Round up at .5' },
    { input: 1234.564, expected: 1234.56, description: 'Round down below .5' },
    { input: 1234.565, expected: 1234.57, description: 'Bankers rounding at .5' },
  ],
};

/**
 * Class action lawsuit prevention scenarios
 */
export const CLASS_ACTION_PREVENTION_SCENARIOS = {
  NC: [
    {
      scenario: 'Late fee exceeds 5% or $15 minimum',
      violation: { rent: 200, lateFee: 20 }, // Should be max $15
      compliant: { rent: 200, lateFee: 15 },
    },
    {
      scenario: 'Security deposit exceeds 2 months',
      violation: { rent: 1000, deposit: 2500 },
      compliant: { rent: 1000, deposit: 2000 },
    },
    {
      scenario: 'Grace period less than 5 days',
      violation: { gracePeriod: 3 },
      compliant: { gracePeriod: 5 },
    },
    {
      scenario: 'Security deposit not returned within 30 days',
      violation: { returnDays: 45 },
      compliant: { returnDays: 30 },
    },
  ],
  SC: [
    {
      scenario: 'Security deposit not returned within 30 days',
      violation: { returnDays: 45 },
      compliant: { returnDays: 30 },
    },
    {
      scenario: 'Unreasonable late fee',
      violation: { rent: 1000, lateFee: 500 }, // 50% is unreasonable
      compliant: { rent: 1000, lateFee: 50 }, // 5% is reasonable
    },
  ],
  GA: [
    {
      scenario: 'No escrow account for 10+ units',
      violation: { units: 15, hasEscrow: false },
      compliant: { units: 15, hasEscrow: true },
    },
    {
      scenario: 'Late fee not specified in lease',
      violation: { lateFeeInLease: false },
      compliant: { lateFeeInLease: true },
    },
    {
      scenario: 'Security deposit not returned within 30 days',
      violation: { returnDays: 35 },
      compliant: { returnDays: 30 },
    },
  ],
};

/**
 * Get all seed data combined
 */
export function getAllSeedData() {
  return {
    properties: [
      ...TEST_PROPERTIES.NC,
      ...TEST_PROPERTIES.SC,
      ...TEST_PROPERTIES.GA,
    ],
    units: [
      ...TEST_UNITS.NC,
      ...TEST_UNITS.SC,
      ...TEST_UNITS.GA,
    ],
    tenants: [
      ...TEST_TENANTS.NC,
      ...TEST_TENANTS.SC,
      ...TEST_TENANTS.GA,
    ],
    leases: [
      ...TEST_LEASES.NC,
      ...TEST_LEASES.SC,
      ...TEST_LEASES.GA,
    ],
    payments: [
      ...TEST_PAYMENTS.NC,
      ...TEST_PAYMENTS.SC,
      ...TEST_PAYMENTS.GA,
    ],
  };
}
