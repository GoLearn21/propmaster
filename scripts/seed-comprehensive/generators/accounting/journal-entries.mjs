/**
 * Journal Entries Generator
 * Generates double-entry bookkeeping journal entries
 */

import { journalEntryId, journalPostingId, traceId, sagaId, idempotencyKey, uuid } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import {
  isoTimestamp,
  monthsAgo,
  daysAgo,
  randomDateInRange,
} from '../../utils/date-utils.mjs';
import {
  decimalAdd,
  decimalSubtract,
  isBalanced,
} from '../../utils/decimal-utils.mjs';
import { ACCOUNT_CODES } from './chart-of-accounts.mjs';

/**
 * Entry types with their standard account mappings
 */
const ENTRY_TYPES = {
  RENT_CHARGE: {
    description: 'Monthly Rent Charge',
    debitAccount: ACCOUNT_CODES.TENANT_RECEIVABLES,
    creditAccount: ACCOUNT_CODES.RESIDENTIAL_RENT,
  },
  RENT_PAYMENT: {
    description: 'Rent Payment Received',
    debitAccount: ACCOUNT_CODES.OPERATING_CASH,
    creditAccount: ACCOUNT_CODES.TENANT_RECEIVABLES,
  },
  LATE_FEE_CHARGE: {
    description: 'Late Fee Charge',
    debitAccount: ACCOUNT_CODES.LATE_FEE_RECEIVABLES,
    creditAccount: ACCOUNT_CODES.LATE_FEES,
  },
  LATE_FEE_PAYMENT: {
    description: 'Late Fee Payment Received',
    debitAccount: ACCOUNT_CODES.OPERATING_CASH,
    creditAccount: ACCOUNT_CODES.LATE_FEE_RECEIVABLES,
  },
  SECURITY_DEPOSIT_RECEIVED: {
    description: 'Security Deposit Received',
    debitAccount: ACCOUNT_CODES.TRUST_SECURITY_DEPOSITS,
    creditAccount: ACCOUNT_CODES.SECURITY_DEPOSITS_HELD,
  },
  SECURITY_DEPOSIT_REFUND: {
    description: 'Security Deposit Refund',
    debitAccount: ACCOUNT_CODES.SECURITY_DEPOSITS_HELD,
    creditAccount: ACCOUNT_CODES.TRUST_SECURITY_DEPOSITS,
  },
  SECURITY_DEPOSIT_FORFEITURE: {
    description: 'Security Deposit Applied to Damages',
    debitAccount: ACCOUNT_CODES.SECURITY_DEPOSITS_HELD,
    creditAccount: ACCOUNT_CODES.DAMAGE_RECOVERIES,
  },
  NSF_CHECK: {
    description: 'NSF Check - Payment Reversal',
    debitAccount: ACCOUNT_CODES.NSF_RECEIVABLES,
    creditAccount: ACCOUNT_CODES.OPERATING_CASH,
  },
  NSF_FEE_CHARGE: {
    description: 'NSF Fee Charge',
    debitAccount: ACCOUNT_CODES.NSF_RECEIVABLES,
    creditAccount: ACCOUNT_CODES.NSF_FEES,
  },
  VENDOR_BILL: {
    description: 'Vendor Bill',
    debitAccount: ACCOUNT_CODES.REPAIRS_MAINTENANCE, // Default, can vary
    creditAccount: ACCOUNT_CODES.VENDOR_PAYABLES,
  },
  VENDOR_PAYMENT: {
    description: 'Vendor Payment',
    debitAccount: ACCOUNT_CODES.VENDOR_PAYABLES,
    creditAccount: ACCOUNT_CODES.OPERATING_CASH,
  },
  OWNER_DISTRIBUTION: {
    description: 'Owner Distribution',
    debitAccount: ACCOUNT_CODES.OWNER_FUNDS_HELD,
    creditAccount: ACCOUNT_CODES.OPERATING_CASH,
  },
  MANAGEMENT_FEE: {
    description: 'Management Fee',
    debitAccount: ACCOUNT_CODES.OWNER_FUNDS_HELD,
    creditAccount: ACCOUNT_CODES.MANAGEMENT_FEES,
  },
  CC_PROCESSING_FEE: {
    description: 'Credit Card Processing Fee',
    debitAccount: ACCOUNT_CODES.CC_PROCESSING_FEES,
    creditAccount: ACCOUNT_CODES.OPERATING_CASH,
  },
  BAD_DEBT_WRITEOFF: {
    description: 'Bad Debt Write-off',
    debitAccount: ACCOUNT_CODES.BAD_DEBT,
    creditAccount: ACCOUNT_CODES.TENANT_RECEIVABLES,
  },
};

/**
 * Generate a single journal entry with postings
 * @param {object} options - Entry options
 * @returns {object} Entry with postings
 */
export function generateJournalEntry(options = {}) {
  const {
    company,
    property,
    tenant,
    type,
    amount,
    date = isoTimestamp(),
    memo = null,
    userId = 'system',
    testCaseId = null,
    forceUnbalanced = false, // For testing TC-FLT-003
    unbalanceAmount = '0.00001',
  } = options;

  const entryId = journalEntryId();
  const entryType = ENTRY_TYPES[type] || ENTRY_TYPES.RENT_PAYMENT;

  // Generate postings
  const postings = [];

  // Debit posting
  postings.push({
    id: journalPostingId(),
    journal_entry_id: entryId,
    account_code: entryType.debitAccount,
    debit_amount: amount,
    credit_amount: '0.0000',
    memo: memo || entryType.description,
    created_at: date,
    updated_at: isoTimestamp(),
    metadata: seedMetadata(testCaseId, {
      seed_type: 'journal_posting',
      posting_type: 'debit',
    }),
  });

  // Credit posting
  let creditAmount = amount;
  if (forceUnbalanced) {
    // For testing double-entry violation detection
    creditAmount = decimalSubtract(amount, unbalanceAmount);
  }

  postings.push({
    id: journalPostingId(),
    journal_entry_id: entryId,
    account_code: entryType.creditAccount,
    debit_amount: '0.0000',
    credit_amount: creditAmount,
    memo: memo || entryType.description,
    created_at: date,
    updated_at: isoTimestamp(),
    metadata: seedMetadata(testCaseId, {
      seed_type: 'journal_posting',
      posting_type: 'credit',
      is_unbalanced: forceUnbalanced,
    }),
  });

  const entry = {
    id: entryId,
    company_id: company?.id || null,
    property_id: property?.id || null,
    tenant_id: tenant?.id || null,

    // Entry details
    entry_type: type,
    entry_date: date.split('T')[0],
    description: entryType.description,
    memo,

    // Reference tracking
    reference_type: tenant ? 'tenant' : property ? 'property' : null,
    reference_id: tenant?.id || property?.id || null,

    // Audit trail
    trace_id: traceId(),
    saga_id: sagaId(),
    idempotency_key: idempotencyKey('je', entryId, date),
    created_by: userId,
    created_at: date,

    // Status
    status: 'posted',
    is_voided: false,
    void_reason: null,
    voided_at: null,
    voided_by: null,

    // Reversal tracking
    is_reversal: false,
    reverses_entry_id: null,
    reversed_by_entry_id: null,

    // Timestamps
    updated_at: isoTimestamp(),

    // Seed metadata
    metadata: seedMetadata(testCaseId, {
      seed_type: 'journal_entry',
      entry_type: type,
      is_balanced: !forceUnbalanced,
    }),
  };

  return { entry, postings };
}

/**
 * Generate journal entry for a rent payment
 * @param {object} payment - Payment record
 * @param {object} company - Company
 * @param {object} property - Property
 * @param {object} tenant - Tenant
 * @returns {object} Entry with postings
 */
export function generateRentPaymentEntry(payment, company, property, tenant) {
  // First, there should be a charge entry
  const chargeEntry = generateJournalEntry({
    company,
    property,
    tenant,
    type: 'RENT_CHARGE',
    amount: payment.amount,
    date: payment.due_date,
    memo: `Rent charge for ${payment.due_date}`,
  });

  // Then the payment entry
  const paymentEntry = generateJournalEntry({
    company,
    property,
    tenant,
    type: 'RENT_PAYMENT',
    amount: payment.amount,
    date: payment.payment_date,
    memo: `Payment received - ${payment.payment_method}`,
  });

  return {
    chargeEntry,
    paymentEntry,
  };
}

/**
 * Generate journal entries for late fee
 * @param {object} payment - Late fee payment
 * @param {object} company - Company
 * @param {object} property - Property
 * @param {object} tenant - Tenant
 * @returns {object} Entries with postings
 */
export function generateLateFeeEntries(payment, company, property, tenant) {
  // Charge entry
  const chargeEntry = generateJournalEntry({
    company,
    property,
    tenant,
    type: 'LATE_FEE_CHARGE',
    amount: payment.amount,
    date: payment.due_date,
    memo: 'Late fee assessed',
    testCaseId: 'TC-CAL-002', // NC late fee compliance
  });

  // Payment entry
  const paymentEntry = generateJournalEntry({
    company,
    property,
    tenant,
    type: 'LATE_FEE_PAYMENT',
    amount: payment.amount,
    date: payment.payment_date,
    memo: 'Late fee payment received',
  });

  return { chargeEntry, paymentEntry };
}

/**
 * Generate journal entries for security deposit
 * @param {object} deposit - Security deposit record
 * @param {object} company - Company
 * @param {object} property - Property
 * @param {object} tenant - Tenant
 * @returns {object} Entries with postings
 */
export function generateSecurityDepositEntries(deposit, company, property, tenant) {
  const entries = [];

  // Deposit received
  entries.push(generateJournalEntry({
    company,
    property,
    tenant,
    type: 'SECURITY_DEPOSIT_RECEIVED',
    amount: deposit.amount,
    date: deposit.date_received,
    memo: 'Security deposit received',
  }));

  // If refunded or applied
  if (deposit.status === 'refunded' && deposit.refund_amount) {
    entries.push(generateJournalEntry({
      company,
      property,
      tenant,
      type: 'SECURITY_DEPOSIT_REFUND',
      amount: deposit.refund_amount,
      date: deposit.refund_date || isoTimestamp(),
      memo: 'Security deposit refunded',
      testCaseId: 'TC-CAL-001', // NC 30-day return
    }));
  }

  if (deposit.status === 'applied_to_damages' && deposit.deductions_amount) {
    entries.push(generateJournalEntry({
      company,
      property,
      tenant,
      type: 'SECURITY_DEPOSIT_FORFEITURE',
      amount: deposit.deductions_amount,
      date: deposit.refund_date || isoTimestamp(),
      memo: deposit.deductions_description || 'Applied to damages',
      testCaseId: 'TC-CAL-004', // Move-out documentation
    }));
  }

  return entries;
}

/**
 * Generate NSF journal entries
 * @param {object} originalPayment - Original bounced payment
 * @param {object} company - Company
 * @param {object} property - Property
 * @param {object} tenant - Tenant
 * @returns {object[]} NSF entries
 */
export function generateNSFEntries(originalPayment, company, property, tenant) {
  const entries = [];

  // Reversal entry
  entries.push(generateJournalEntry({
    company,
    property,
    tenant,
    type: 'NSF_CHECK',
    amount: originalPayment.amount,
    date: originalPayment.nsf_date || daysAgo(1),
    memo: 'NSF Check - Payment Reversal',
    testCaseId: 'TC-REC-009', // NSF with reversal
  }));

  // NSF fee charge
  if (originalPayment.nsf_fee_amount) {
    entries.push(generateJournalEntry({
      company,
      property,
      tenant,
      type: 'NSF_FEE_CHARGE',
      amount: originalPayment.nsf_fee_amount,
      date: originalPayment.nsf_date || daysAgo(1),
      memo: 'NSF Fee Charge',
    }));
  }

  return entries;
}

/**
 * Generate owner distribution entry
 * @param {object} options - Distribution options
 * @returns {object} Entry with postings
 */
export function generateOwnerDistributionEntry(options) {
  const {
    company,
    property,
    owner,
    amount,
    date = isoTimestamp(),
    checkNumber = null,
  } = options;

  return generateJournalEntry({
    company,
    property,
    type: 'OWNER_DISTRIBUTION',
    amount,
    date,
    memo: checkNumber ? `Distribution - Check #${checkNumber}` : 'Distribution - ACH',
    userId: 'system',
  });
}

/**
 * Generate all journal entries from payment history
 * @param {object[]} payments - Payment records
 * @param {object[]} companies - Company records
 * @param {object[]} properties - Property records
 * @param {object[]} tenants - Tenant records
 * @returns {object} All entries and postings
 */
export function generateJournalEntriesFromPayments(payments, companies, properties, tenants) {
  const allEntries = [];
  const allPostings = [];

  const companyMap = new Map(companies.map(c => [c.id, c]));
  const propertyMap = new Map(properties.map(p => [p.id, p]));
  const tenantMap = new Map(tenants.map(t => [t.id, t]));

  payments.forEach(payment => {
    const tenant = tenantMap.get(payment.tenant_id);
    const property = propertyMap.get(payment.property_id);
    const company = property ? companyMap.get(property.company_id) : null;

    if (!tenant || !property) return;

    if (payment.is_late_fee) {
      // Late fee entries
      const { chargeEntry, paymentEntry } = generateLateFeeEntries(payment, company, property, tenant);
      allEntries.push(chargeEntry.entry, paymentEntry.entry);
      allPostings.push(...chargeEntry.postings, ...paymentEntry.postings);
    } else if (payment.is_nsf) {
      // NSF entries
      const nsfEntries = generateNSFEntries(payment, company, property, tenant);
      nsfEntries.forEach(({ entry, postings }) => {
        allEntries.push(entry);
        allPostings.push(...postings);
      });
    } else if (payment.status === 'completed') {
      // Regular rent payment
      const { chargeEntry, paymentEntry } = generateRentPaymentEntry(payment, company, property, tenant);
      allEntries.push(chargeEntry.entry, paymentEntry.entry);
      allPostings.push(...chargeEntry.postings, ...paymentEntry.postings);
    }
  });

  return { entries: allEntries, postings: allPostings };
}

/**
 * Generate unbalanced entries for TC-FLT-003 testing
 * @param {object} company - Company
 * @param {number} count - Number of entries
 * @returns {object[]} Unbalanced entries
 */
export function generateUnbalancedEntriesForTesting(company, count = 5) {
  const entries = [];
  const postings = [];
  const unbalanceAmounts = ['0.00001', '0.00005', '0.00009', '0.0001', '0.00099'];

  for (let i = 0; i < count; i++) {
    const { entry, postings: entryPostings } = generateJournalEntry({
      company,
      type: 'RENT_PAYMENT',
      amount: '1000.0000',
      date: daysAgo(i + 1),
      memo: `Test unbalanced entry ${i + 1}`,
      testCaseId: 'TC-FLT-003',
      forceUnbalanced: true,
      unbalanceAmount: unbalanceAmounts[i % unbalanceAmounts.length],
    });

    entries.push(entry);
    postings.push(...entryPostings);
  }

  return { entries, postings };
}

/**
 * Get journal entry summary
 * @param {object[]} entries - Journal entries
 * @returns {object} Summary statistics
 */
export function getJournalEntrySummary(entries) {
  const summary = {
    total: entries.length,
    byType: {},
    byStatus: {},
    voided: 0,
    reversals: 0,
  };

  entries.forEach(entry => {
    summary.byType[entry.entry_type] = (summary.byType[entry.entry_type] || 0) + 1;
    summary.byStatus[entry.status] = (summary.byStatus[entry.status] || 0) + 1;
    if (entry.is_voided) summary.voided++;
    if (entry.is_reversal) summary.reversals++;
  });

  return summary;
}

export default {
  generateJournalEntry,
  generateRentPaymentEntry,
  generateLateFeeEntries,
  generateSecurityDepositEntries,
  generateNSFEntries,
  generateOwnerDistributionEntry,
  generateJournalEntriesFromPayments,
  generateUnbalancedEntriesForTesting,
  getJournalEntrySummary,
  ENTRY_TYPES,
};
