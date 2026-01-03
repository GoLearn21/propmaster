/**
 * Seed Data Markers
 * Provides consistent markers for identifying and managing seed data
 */

// Seed data version - increment when schema changes
export const SEED_VERSION = 'SEED_COMPREHENSIVE_V1';

// Seed data identifier for cleanup
export const SEED_IDENTIFIER = 'COMPREHENSIVE_SEED_DATA';

// Seed marker prefix for identifying seed data
export const SEED_MARKER_PREFIX = 'SEED_';

// Test case prefixes for edge case data
export const TEST_CASE_PREFIXES = {
  FLOATING_POINT: 'TC-FLT',
  CLASS_ACTION: 'TC-CAL',
  RECONCILIATION: 'TC-REC',
  AUDIT_TRAIL: 'TC-AUD',
  FRAUD_PREVENTION: 'TC-HIS',
  E2E_BALANCE: 'E2E-BAL',
  E2E_PRECISION: 'E2E-PRE',
  STRESS: 'STRESS',
};

/**
 * Generate seed metadata for a record
 * @param {string} testCaseId - Optional test case ID
 * @param {object} extra - Additional metadata
 * @returns {object} Metadata object
 */
export function seedMetadata(testCaseId = null, extra = {}) {
  return {
    is_seed_data: true,
    seed_version: SEED_VERSION,
    seed_identifier: SEED_IDENTIFIER,
    seeded_at: new Date().toISOString(),
    test_case_id: testCaseId,
    ...extra,
  };
}

/**
 * Generate metadata JSON string for DB storage
 * @param {string} testCaseId - Optional test case ID
 * @param {object} extra - Additional metadata
 * @returns {string} JSON string
 */
export function seedMetadataJson(testCaseId = null, extra = {}) {
  return JSON.stringify(seedMetadata(testCaseId, extra));
}

/**
 * Check if a record is seed data
 * @param {object} record - Record with metadata field
 * @returns {boolean} True if seed data
 */
export function isSeedData(record) {
  if (!record || !record.metadata) return false;

  const metadata = typeof record.metadata === 'string'
    ? JSON.parse(record.metadata)
    : record.metadata;

  return metadata.is_seed_data === true &&
         metadata.seed_identifier === SEED_IDENTIFIER;
}

/**
 * Get seed patterns for company names (for cleanup)
 * @returns {string[]} Array of company name patterns
 */
export function getSeedCompanyPatterns() {
  return [
    'Seed Test Company',
    'TC-FLT Test',
    'TC-CAL Test',
    'TC-REC Test',
    'TC-AUD Test',
    'TC-HIS Test',
    'Comprehensive Seed',
    'Edge Case Test',
    'Stress Test Corp',
  ];
}

/**
 * Get seed email domain
 * @returns {string} Seed email domain
 */
export function getSeedEmailDomain() {
  return 'seed-test.propmaster.local';
}

/**
 * Generate seed email
 * @param {string} prefix - Email prefix
 * @returns {string} Seed email
 */
export function seedEmail(prefix) {
  return `${prefix}@${getSeedEmailDomain()}`;
}

/**
 * Generate seed phone number (555 prefix for test data)
 * @param {number} sequence - Sequence number
 * @returns {string} Seed phone number
 */
export function seedPhone(sequence) {
  const suffix = String(sequence).padStart(4, '0');
  return `555-000-${suffix}`;
}

/**
 * Seed data markers for specific entities
 */
export const ENTITY_MARKERS = {
  COMPANY: {
    prefix: 'SEED_COMP_',
    pattern: /^SEED_COMP_/,
  },
  PROPERTY: {
    prefix: 'SEED_PROP_',
    pattern: /^SEED_PROP_|^prop_nc_|^prop_sc_|^prop_ga_/,
  },
  TENANT: {
    prefix: 'SEED_TNT_',
    pattern: /^SEED_TNT_|^tenant_\d+_/,
  },
  LEASE: {
    prefix: 'SEED_LEASE_',
    pattern: /^SEED_LEASE_|^lease_\d{4}_/,
  },
  PAYMENT: {
    prefix: 'SEED_PMT_',
    pattern: /^SEED_PMT_|^pmt_\w+_/,
  },
  JOURNAL: {
    prefix: 'SEED_JE_',
    pattern: /^SEED_JE_|^je_\d{4}_/,
  },
};

/**
 * Generate cleanup query for seed data
 * @param {string} tableName - Table name
 * @returns {string} SQL DELETE query
 */
export function getCleanupQuery(tableName) {
  return `
    DELETE FROM ${tableName}
    WHERE metadata->>'seed_identifier' = '${SEED_IDENTIFIER}'
    OR metadata->>'is_seed_data' = 'true'
  `;
}

/**
 * Tables in deletion order (respects FK constraints)
 */
export const DELETION_ORDER = [
  // Child tables first
  'journal_entry_lines',
  'journal_entries',
  'payment_history',
  'payment_templates',
  'recurring_charges',
  'payment_receipts',
  'security_deposits',
  'owner_distributions',
  'bank_transactions',
  'work_orders',
  'maintenance_schedules',
  'lease_amendments',
  'lease_renewal_offers',
  'billing_pending_actions',
  'billing_configurations',
  'budget_line_items',
  'budgets',
  'expenses',
  'tenant_notifications',
  'tenant_documents',
  'tenant_payment_methods',
  'tenant_vehicles',
  'tenant_emergency_contacts',
  'leases',
  'tenants',
  'units',
  'bank_accounts',
  'trust_accounts',
  'people_vendors',
  'people_owners',
  'people_prospects',
  'people',
  'property_ownership',
  'properties',
  // Parent tables last
];

/**
 * Data category markers for progress tracking
 */
export const DATA_CATEGORIES = {
  CORE: 'core_data',
  LEASING: 'leasing_data',
  PAYMENTS: 'payment_data',
  ACCOUNTING: 'accounting_data',
  COMPLIANCE: 'compliance_data',
  EDGE_CASES: 'edge_case_data',
  STRESS: 'stress_test_data',
};

export default {
  SEED_VERSION,
  SEED_IDENTIFIER,
  SEED_MARKER_PREFIX,
  TEST_CASE_PREFIXES,
  seedMetadata,
  seedMetadataJson,
  isSeedData,
  getSeedCompanyPatterns,
  getSeedEmailDomain,
  seedEmail,
  seedPhone,
  ENTITY_MARKERS,
  getCleanupQuery,
  DELETION_ORDER,
  DATA_CATEGORIES,
};
