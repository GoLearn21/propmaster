/**
 * Seed Configuration
 * Centralized configuration for comprehensive seed data generation
 */

// ============================================================================
// DATA VOLUME CONFIGURATION
// ============================================================================

export const DATA_VOLUMES = {
  // Core entities
  companies: 5,
  propertiesPerCompany: 60,     // 300 total
  unitsPerProperty: 10,          // 3,000 total avg
  tenantsPerProperty: 8,         // 2,400 total avg
  ownersPerCompany: 20,          // 100 total
  vendorsPerCompany: 30,         // 150 total

  // Leasing
  activeLeasePercentage: 0.85,   // 85% occupancy
  expiringInDays: [30, 60, 90],  // Lease expiration buckets

  // Payments
  paymentHistoryMonths: 6,       // 6 months of history
  paymentsPerTenant: 6,          // Avg payments per tenant

  // Accounting
  journalEntriesPerMonth: 500,   // Per company
  distributionsPerProperty: 6,   // 6 months of distributions

  // Edge cases
  tcFltScenarios: 35,
  tcCalScenarios: 37,
  tcRecScenarios: 34,
  tcAudScenarios: 32,
  tcHisScenarios: 23,
};

// ============================================================================
// STATE COMPLIANCE RULES
// ============================================================================

export const STATE_COMPLIANCE = {
  NC: {
    name: 'North Carolina',
    securityDeposit: {
      maxMonthsRent: 2,
      returnDeadlineDays: 30,
      interestRequired: false,
    },
    lateFee: {
      type: 'percentage_or_flat',
      maxPercentage: 5,
      maxFlat: 15,
      whicheverLess: true,
      gracePeriodDays: 5,
    },
    evictionNotice: {
      nonPaymentDays: 10,
      leaseViolationDays: 10,
    },
  },
  SC: {
    name: 'South Carolina',
    securityDeposit: {
      maxMonthsRent: null, // No limit
      returnDeadlineDays: 30,
      interestRequired: false,
    },
    lateFee: {
      type: 'percentage',
      maxPercentage: null, // No statutory limit (reasonable)
      gracePeriodDays: 5,
    },
    evictionNotice: {
      nonPaymentDays: 5,
      leaseViolationDays: 14,
    },
  },
  GA: {
    name: 'Georgia',
    securityDeposit: {
      maxMonthsRent: null, // No limit
      returnDeadlineDays: 30,
      interestRequired: false,
      escrowRequiredUnits: 10, // Properties with 10+ units
    },
    lateFee: {
      type: 'percentage',
      maxPercentage: null, // No statutory limit (reasonable)
      gracePeriodDays: 0, // No required grace period
    },
    evictionNotice: {
      nonPaymentDays: 0, // Immediate
      leaseViolationDays: 0,
    },
  },
};

// ============================================================================
// PROPERTY CONFIGURATION
// ============================================================================

export const PROPERTY_TYPES = [
  { type: 'single_family', subtype: 'house', minUnits: 1, maxUnits: 1 },
  { type: 'single_family', subtype: 'townhouse', minUnits: 1, maxUnits: 1 },
  { type: 'multi_family', subtype: 'duplex', minUnits: 2, maxUnits: 2 },
  { type: 'multi_family', subtype: 'triplex', minUnits: 3, maxUnits: 3 },
  { type: 'multi_family', subtype: 'fourplex', minUnits: 4, maxUnits: 4 },
  { type: 'multi_family', subtype: 'apartment', minUnits: 5, maxUnits: 50 },
  { type: 'commercial', subtype: 'retail', minUnits: 1, maxUnits: 10 },
  { type: 'commercial', subtype: 'office', minUnits: 1, maxUnits: 20 },
];

export const PROPERTY_STATUSES = ['active', 'inactive', 'pending'];

// ============================================================================
// UNIT CONFIGURATION
// ============================================================================

export const UNIT_TYPES = [
  { bedrooms: 0, bathrooms: 1, sqftRange: [400, 600], rentRange: [800, 1200] },
  { bedrooms: 1, bathrooms: 1, sqftRange: [600, 900], rentRange: [1000, 1500] },
  { bedrooms: 2, bathrooms: 1, sqftRange: [800, 1100], rentRange: [1200, 1800] },
  { bedrooms: 2, bathrooms: 2, sqftRange: [900, 1200], rentRange: [1400, 2000] },
  { bedrooms: 3, bathrooms: 2, sqftRange: [1200, 1600], rentRange: [1800, 2500] },
  { bedrooms: 4, bathrooms: 2, sqftRange: [1500, 2200], rentRange: [2200, 3500] },
];

export const UNIT_STATUSES = ['available', 'occupied', 'maintenance', 'reserved'];

// ============================================================================
// PAYMENT CONFIGURATION
// ============================================================================

export const PAYMENT_METHODS = ['ach', 'credit_card', 'check', 'cash', 'online'];

export const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'];

export const PAYMENT_SCENARIOS = {
  PERFECT_PAYER: { percentage: 0.50, onTimeProbability: 1.0, partialProbability: 0 },
  EARLY_PAYER: { percentage: 0.15, daysEarly: 5, partialProbability: 0 },
  GRACE_PERIOD: { percentage: 0.10, daysLate: 3, partialProbability: 0 },
  LATE_PAYER: { percentage: 0.10, daysLate: 10, partialProbability: 0.1 },
  PARTIAL_PAYER: { percentage: 0.07, partialAmount: 0.75, partialProbability: 0.8 },
  DELINQUENT: { percentage: 0.05, missedMonths: 2, partialProbability: 0.5 },
  NSF: { percentage: 0.03, nsfProbability: 0.5 },
};

// ============================================================================
// ACCOUNTING CONFIGURATION
// ============================================================================

export const CHART_OF_ACCOUNTS = {
  assets: [
    { code: '1000', name: 'Operating Cash', subtype: 'current_asset' },
    { code: '1010', name: 'Trust Account Cash', subtype: 'current_asset' },
    { code: '1100', name: 'Accounts Receivable', subtype: 'current_asset' },
    { code: '1150', name: 'Prepaid Expenses', subtype: 'current_asset' },
    { code: '1500', name: 'Buildings', subtype: 'fixed_asset' },
    { code: '1510', name: 'Accumulated Depreciation', subtype: 'fixed_asset' },
  ],
  liabilities: [
    { code: '2000', name: 'Accounts Payable', subtype: 'current_liability' },
    { code: '2100', name: 'Security Deposits Held', subtype: 'current_liability' },
    { code: '2200', name: 'Prepaid Rent', subtype: 'current_liability' },
    { code: '2300', name: 'Owner Distributions Payable', subtype: 'current_liability' },
    { code: '2500', name: 'Loans Payable', subtype: 'long_term_liability' },
  ],
  equity: [
    { code: '3000', name: 'Owner Equity', subtype: 'equity' },
    { code: '3100', name: 'Retained Earnings', subtype: 'equity' },
  ],
  revenue: [
    { code: '4000', name: 'Rental Income', subtype: 'operating_revenue' },
    { code: '4100', name: 'Late Fee Income', subtype: 'operating_revenue' },
    { code: '4200', name: 'Pet Fee Income', subtype: 'operating_revenue' },
    { code: '4300', name: 'Parking Income', subtype: 'operating_revenue' },
    { code: '4400', name: 'Application Fee Income', subtype: 'operating_revenue' },
    { code: '4500', name: 'NSF Fee Income', subtype: 'operating_revenue' },
    { code: '4900', name: 'Other Income', subtype: 'operating_revenue' },
  ],
  expenses: [
    { code: '5000', name: 'Management Fees', subtype: 'operating_expense' },
    { code: '5100', name: 'Maintenance & Repairs', subtype: 'operating_expense' },
    { code: '5200', name: 'Utilities', subtype: 'operating_expense' },
    { code: '5300', name: 'Insurance', subtype: 'operating_expense' },
    { code: '5400', name: 'Property Taxes', subtype: 'operating_expense' },
    { code: '5500', name: 'Legal & Professional', subtype: 'operating_expense' },
    { code: '5600', name: 'Marketing', subtype: 'operating_expense' },
    { code: '5700', name: 'Administrative', subtype: 'operating_expense' },
    { code: '5800', name: 'Depreciation', subtype: 'operating_expense' },
    { code: '5900', name: 'Interest Expense', subtype: 'operating_expense' },
  ],
};

// ============================================================================
// JOURNAL ENTRY TYPES
// ============================================================================

export const JOURNAL_ENTRY_TYPES = {
  RENT_PAYMENT: {
    type: 'rent_payment',
    debit: '1000', // Cash
    credit: '1100', // AR
  },
  LATE_FEE: {
    type: 'late_fee',
    debit: '1100', // AR
    credit: '4100', // Late Fee Income
  },
  SECURITY_DEPOSIT_RECEIVED: {
    type: 'security_deposit_received',
    debit: '1010', // Trust Cash
    credit: '2100', // Security Deposits Held
  },
  SECURITY_DEPOSIT_REFUND: {
    type: 'security_deposit_refund',
    debit: '2100', // Security Deposits Held
    credit: '1010', // Trust Cash
  },
  OWNER_DISTRIBUTION: {
    type: 'owner_distribution',
    debit: '2300', // Distributions Payable
    credit: '1000', // Cash
  },
  EXPENSE: {
    type: 'expense',
    debit: '5100', // Expense account (varies)
    credit: '1000', // Cash
  },
  NSF_REVERSAL: {
    type: 'nsf_reversal',
    debit: '1100', // AR
    credit: '1000', // Cash
  },
  NSF_FEE: {
    type: 'nsf_fee',
    debit: '1100', // AR
    credit: '4500', // NSF Fee Income
  },
};

// ============================================================================
// WORK ORDER CONFIGURATION
// ============================================================================

export const WORK_ORDER_CATEGORIES = [
  'plumbing', 'electrical', 'hvac', 'appliances', 'carpentry',
  'painting', 'flooring', 'roofing', 'landscaping', 'cleaning', 'other',
];

export const WORK_ORDER_PRIORITIES = ['low', 'medium', 'high', 'emergency'];

export const WORK_ORDER_STATUSES = [
  'open', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold',
];

// ============================================================================
// TEST CASE CONFIGURATION
// ============================================================================

export const TEST_CASES = {
  'TC-FLT': {
    prefix: 'TC-FLT',
    name: 'Floating Point Precision',
    count: 35,
    description: 'Penny-perfect precision at scale',
  },
  'TC-CAL': {
    prefix: 'TC-CAL',
    name: 'Class Action Prevention',
    count: 37,
    description: 'Lawsuit prevention scenarios',
  },
  'TC-REC': {
    prefix: 'TC-REC',
    name: '3-Way Reconciliation',
    count: 34,
    description: 'Bank/Ledger/Portal match',
  },
  'TC-AUD': {
    prefix: 'TC-AUD',
    name: 'Audit Trail',
    count: 32,
    description: 'Complete forensic capability',
  },
  'TC-HIS': {
    prefix: 'TC-HIS',
    name: 'Fraud Prevention',
    count: 23,
    description: 'Historical disaster patterns',
  },
};

// ============================================================================
// STRESS TEST CONFIGURATION
// ============================================================================

export const STRESS_CONFIG = {
  largePortfolio: {
    properties: 1000,
    unitsPerProperty: 10,
    totalUnits: 10000,
  },
  highVolumePayments: {
    paymentsPerMonth: 20000,
    totalPayments: 100000,
  },
  journalEntries: {
    entriesPerDay: 1000,
    totalEntries: 100000,
  },
};

// ============================================================================
// VALIDATION THRESHOLDS
// ============================================================================

export const VALIDATION_THRESHOLDS = {
  balanceTolerance: 0.01,           // $0.01 tolerance for balance checks
  doubleEntryTolerance: 0.0001,     // 0.0001 for double-entry validation
  queryTimeWarning: 50,             // ms before warning
  queryTimeCritical: 200,           // ms before critical
  memoryWarningMB: 512,             // Memory usage warning
};

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

export const DB_CONFIG = {
  batchSize: 100,          // Records per batch insert
  maxRetries: 3,           // Retry count for failed inserts
  retryDelayMs: 1000,      // Delay between retries
  connectionTimeout: 30000, // Connection timeout
};

export default {
  DATA_VOLUMES,
  STATE_COMPLIANCE,
  PROPERTY_TYPES,
  PROPERTY_STATUSES,
  UNIT_TYPES,
  UNIT_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PAYMENT_SCENARIOS,
  CHART_OF_ACCOUNTS,
  JOURNAL_ENTRY_TYPES,
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  TEST_CASES,
  STRESS_CONFIG,
  VALIDATION_THRESHOLDS,
  DB_CONFIG,
};
