/**
 * ID Generators for Seed Data
 * Generates consistent, traceable IDs for all entities
 */

import { randomUUID } from 'crypto';

// Counters for sequential IDs
const counters = {
  company: 0,
  property: 0,
  unit: 0,
  person: 0,
  tenant: 0,
  owner: 0,
  vendor: 0,
  lease: 0,
  payment: 0,
  journalEntry: 0,
  journalPosting: 0,
  trustAccount: 0,
  trustTransaction: 0,
  securityDeposit: 0,
  lateFee: 0,
  distribution: 0,
  distributionBatch: 0,
  workOrder: 0,
  bankAccount: 0,
  bankTransaction: 0,
  billingConfig: 0,
  account: 0,
  user: 0,
};

/**
 * Reset all counters (for fresh seed runs)
 */
export function resetCounters() {
  Object.keys(counters).forEach(key => {
    counters[key] = 0;
  });
}

/**
 * Generate UUID
 * @returns {string} UUID v4
 */
export function uuid() {
  return randomUUID();
}

/**
 * Generate company ID
 * @param {string} prefix - Optional prefix
 * @returns {string} Company ID
 */
export function companyId(prefix = 'comp') {
  counters.company++;
  return `${prefix}_${String(counters.company).padStart(3, '0')}_${uuid().slice(0, 8)}`;
}

/**
 * Generate property ID
 * @param {string} state - State code (NC, SC, GA)
 * @returns {string} Property ID
 */
export function propertyId(state = 'NC') {
  counters.property++;
  return `prop_${state.toLowerCase()}_${String(counters.property).padStart(4, '0')}`;
}

/**
 * Generate unit ID
 * @param {string} propertyId - Parent property ID
 * @param {string|number} unitNumber - Unit number
 * @returns {string} Unit ID
 */
export function unitId(propertyId, unitNumber) {
  counters.unit++;
  const propShort = propertyId.replace('prop_', '').slice(0, 8);
  return `unit_${propShort}_${unitNumber}_${String(counters.unit).padStart(5, '0')}`;
}

/**
 * Generate person ID
 * @param {string} type - Person type (tenant, owner, vendor)
 * @returns {string} Person ID
 */
export function personId(type = 'tenant') {
  counters.person++;
  return `person_${type.slice(0, 3)}_${String(counters.person).padStart(5, '0')}`;
}

/**
 * Generate tenant ID
 * @returns {string} Tenant ID
 */
export function tenantId() {
  counters.tenant++;
  return `tenant_${String(counters.tenant).padStart(5, '0')}_${uuid().slice(0, 8)}`;
}

/**
 * Generate owner ID
 * @returns {string} Owner ID
 */
export function ownerId() {
  counters.owner++;
  return `owner_${String(counters.owner).padStart(4, '0')}_${uuid().slice(0, 8)}`;
}

/**
 * Generate vendor ID
 * @returns {string} Vendor ID
 */
export function vendorId() {
  counters.vendor++;
  return `vendor_${String(counters.vendor).padStart(4, '0')}_${uuid().slice(0, 8)}`;
}

/**
 * Generate lease ID
 * @param {number} year - Year
 * @returns {string} Lease ID
 */
export function leaseId(year = new Date().getFullYear()) {
  counters.lease++;
  return `lease_${year}_${String(counters.lease).padStart(5, '0')}`;
}

/**
 * Generate lease number (human-readable)
 * @param {string} propertyCode - Property code
 * @param {number} sequence - Sequence number
 * @returns {string} Lease number
 */
export function leaseNumber(propertyCode, sequence) {
  const year = new Date().getFullYear();
  return `L-${propertyCode.toUpperCase()}-${year}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Generate payment ID
 * @param {string} type - Payment type (rent, fee, deposit, etc.)
 * @returns {string} Payment ID
 */
export function paymentId(type = 'rent') {
  counters.payment++;
  const typeCode = type.slice(0, 3).toUpperCase();
  return `pmt_${typeCode}_${String(counters.payment).padStart(6, '0')}`;
}

/**
 * Generate journal entry ID
 * @param {number} year - Year
 * @returns {string} Journal entry ID
 */
export function journalEntryId(year = new Date().getFullYear()) {
  counters.journalEntry++;
  return `je_${year}_${String(counters.journalEntry).padStart(6, '0')}`;
}

/**
 * Generate journal entry number (human-readable)
 * @param {number} year - Year
 * @param {number} sequence - Sequence number
 * @returns {string} Entry number
 */
export function journalEntryNumber(year = new Date().getFullYear(), sequence) {
  return `JE-${year}-${String(sequence || counters.journalEntry).padStart(6, '0')}`;
}

/**
 * Generate journal posting ID
 * @param {string} entryId - Parent journal entry ID
 * @param {number} lineNumber - Line number
 * @returns {string} Posting ID
 */
export function journalPostingId(entryId, lineNumber) {
  counters.journalPosting++;
  return `${entryId}_line_${String(lineNumber).padStart(3, '0')}`;
}

/**
 * Generate trust account ID
 * @param {string} state - State code
 * @returns {string} Trust account ID
 */
export function trustAccountId(state = 'NC') {
  counters.trustAccount++;
  return `trust_${state.toLowerCase()}_${String(counters.trustAccount).padStart(3, '0')}`;
}

/**
 * Generate trust transaction ID
 * @param {string} type - Transaction type (deposit, withdrawal, transfer)
 * @returns {string} Trust transaction ID
 */
export function trustTransactionId(type = 'txn') {
  counters.trustTransaction++;
  const typeCode = type.slice(0, 3).toUpperCase();
  return `trust_txn_${typeCode}_${String(counters.trustTransaction).padStart(6, '0')}`;
}

/**
 * Generate security deposit ID
 * @returns {string} Security deposit ID
 */
export function securityDepositId() {
  counters.securityDeposit++;
  return `sd_${String(counters.securityDeposit).padStart(5, '0')}_${uuid().slice(0, 8)}`;
}

/**
 * Generate late fee ID
 * @returns {string} Late fee ID
 */
export function lateFeeId() {
  counters.lateFee++;
  return `lf_${String(counters.lateFee).padStart(5, '0')}`;
}

/**
 * Generate distribution ID
 * @param {string} period - Period (YYYY-MM)
 * @returns {string} Distribution ID
 */
export function distributionId(period) {
  counters.distribution++;
  return `dist_${period.replace('-', '')}_${String(counters.distribution).padStart(4, '0')}`;
}

/**
 * Generate distribution batch ID
 * @param {string} period - Period (YYYY-MM)
 * @returns {string} Distribution batch ID
 */
export function distributionBatchId(period) {
  counters.distributionBatch++;
  return `dist_batch_${period.replace('-', '')}_${String(counters.distributionBatch).padStart(3, '0')}`;
}

/**
 * Generate work order ID
 * @returns {string} Work order ID
 */
export function workOrderId() {
  counters.workOrder++;
  return `wo_${String(counters.workOrder).padStart(5, '0')}_${uuid().slice(0, 8)}`;
}

/**
 * Generate bank account ID
 * @param {string} type - Account type (checking, savings, trust)
 * @returns {string} Bank account ID
 */
export function bankAccountId(type = 'checking') {
  counters.bankAccount++;
  return `bank_${type.slice(0, 3)}_${String(counters.bankAccount).padStart(4, '0')}`;
}

/**
 * Generate bank transaction ID
 * @param {string} type - Transaction type (deposit, withdrawal, transfer)
 * @returns {string} Bank transaction ID
 */
export function bankTransactionId(type = 'txn') {
  counters.bankTransaction++;
  const typeCode = type.slice(0, 3).toUpperCase();
  return `bank_txn_${typeCode}_${String(counters.bankTransaction).padStart(6, '0')}`;
}

/**
 * Generate user ID
 * @param {string} role - User role (admin, manager, staff)
 * @returns {string} User ID
 */
export function userId(role = 'user') {
  counters.user++;
  return `user_${role.slice(0, 3)}_${String(counters.user).padStart(4, '0')}_${uuid().slice(0, 8)}`;
}

/**
 * Generate billing configuration ID
 * @param {string} propertyId - Property ID
 * @returns {string} Billing config ID
 */
export function billingConfigId(propertyId) {
  counters.billingConfig++;
  const propShort = propertyId.replace('prop_', '').slice(0, 8);
  return `billcfg_${propShort}_${String(counters.billingConfig).padStart(4, '0')}`;
}

/**
 * Generate idempotency key for transactions
 * @param {string} type - Transaction type
 * @param {string} entityId - Entity ID
 * @param {string} date - Date
 * @returns {string} Idempotency key
 */
export function idempotencyKey(type, entityId, date) {
  return `idem_${type}_${entityId}_${date}_${uuid().slice(0, 8)}`;
}

/**
 * Generate trace ID for saga tracking
 * @returns {string} Trace ID
 */
export function traceId() {
  return `trace_${Date.now()}_${uuid().slice(0, 12)}`;
}

/**
 * Generate saga ID
 * @param {string} sagaType - Type of saga
 * @returns {string} Saga ID
 */
export function sagaId(sagaType) {
  return `saga_${sagaType}_${Date.now()}_${uuid().slice(0, 8)}`;
}

/**
 * Generate account code for chart of accounts
 * @param {string} type - Account type (asset, liability, equity, revenue, expense)
 * @param {number} subCode - Sub-code
 * @returns {string} Account code
 */
export function accountCode(type, subCode) {
  const prefixes = {
    asset: '1',
    liability: '2',
    equity: '3',
    revenue: '4',
    expense: '5',
  };
  const prefix = prefixes[type] || '9';
  return `${prefix}${String(subCode).padStart(3, '0')}`;
}

/**
 * Generate account ID for chart of accounts
 * @param {string} companyId - Company ID
 * @param {string} code - Account code
 * @returns {string} Account ID
 */
export function accountId(companyId, code) {
  counters.account++;
  const compShort = companyId?.replace('comp_', '').slice(0, 8) || 'default';
  return `acct_${compShort}_${code}_${String(counters.account).padStart(4, '0')}`;
}

/**
 * Get current counter values (for debugging)
 * @returns {object} Counter values
 */
export function getCounters() {
  return { ...counters };
}

export default {
  resetCounters,
  uuid,
  companyId,
  propertyId,
  unitId,
  personId,
  tenantId,
  ownerId,
  vendorId,
  leaseId,
  leaseNumber,
  paymentId,
  journalEntryId,
  journalEntryNumber,
  journalPostingId,
  trustAccountId,
  trustTransactionId,
  securityDepositId,
  lateFeeId,
  distributionId,
  distributionBatchId,
  workOrderId,
  bankAccountId,
  bankTransactionId,
  userId,
  billingConfigId,
  idempotencyKey,
  traceId,
  sagaId,
  accountCode,
  accountId,
  getCounters,
};
