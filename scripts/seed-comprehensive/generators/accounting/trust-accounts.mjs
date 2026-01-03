/**
 * Trust Accounts Generator
 * Generates trust account data with commingling prevention
 */

import { trustAccountId, trustTransactionId, uuid } from '../../utils/id-generators.mjs';
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
  decimalSum,
  randomAmount,
} from '../../utils/decimal-utils.mjs';
import { STATE_COMPLIANCE } from '../../config/seed-config.mjs';

/**
 * Trust account types
 */
const TRUST_ACCOUNT_TYPES = {
  SECURITY_DEPOSIT: 'security_deposit',
  PREPAID_RENT: 'prepaid_rent',
  OWNER_FUNDS: 'owner_funds',
  RESERVE: 'reserve',
};

/**
 * Transaction types for trust accounts
 */
const TRANSACTION_TYPES = {
  DEPOSIT_IN: { type: 'deposit_in', direction: 'credit' },
  DEPOSIT_OUT: { type: 'deposit_out', direction: 'debit' },
  INTEREST_CREDIT: { type: 'interest_credit', direction: 'credit' },
  TRANSFER_IN: { type: 'transfer_in', direction: 'credit' },
  TRANSFER_OUT: { type: 'transfer_out', direction: 'debit' },
  ADJUSTMENT: { type: 'adjustment', direction: 'both' },
};

/**
 * Generate a trust account
 * @param {object} options - Generation options
 * @returns {object} Trust account record
 */
export function generateTrustAccount(options = {}) {
  const {
    company,
    property,
    accountType = TRUST_ACCOUNT_TYPES.SECURITY_DEPOSIT,
    bankAccount = null,
    testCaseId = null,
  } = options;

  const id = trustAccountId();
  const state = property?.state || 'NC';
  const rules = STATE_COMPLIANCE[state];

  return {
    id,
    company_id: company?.id || null,
    property_id: property?.id || null,

    // Account details
    account_type: accountType,
    account_name: `${property?.name || 'Property'} - ${accountType.replace('_', ' ').toUpperCase()}`,

    // Bank linkage
    bank_account_id: bankAccount?.id || null,
    bank_account_number: bankAccount?.account_number_last4 ? `****${bankAccount.account_number_last4}` : null,
    bank_routing_number: bankAccount?.routing_number || null,

    // Balances
    current_balance: '0.0000',
    available_balance: '0.0000',
    pending_balance: '0.0000',
    minimum_balance: rules?.trustAccount?.minimumBalance || '0.00',

    // Interest (if state requires)
    interest_rate: rules?.securityDeposit?.interestRequired ? '0.0100' : '0.0000',
    interest_accrued: '0.0000',
    last_interest_calculation: null,

    // Compliance
    state,
    is_compliant: true,
    last_audit_date: monthsAgo(Math.floor(Math.random() * 3) + 1),
    audit_notes: null,

    // Status
    status: 'active',
    is_reconciled: true,
    last_reconciliation_date: daysAgo(Math.floor(Math.random() * 7)),

    // Timestamps
    created_at: monthsAgo(12),
    updated_at: isoTimestamp(),

    // Seed metadata
    metadata: seedMetadata(testCaseId, {
      seed_type: 'trust_account',
      account_type: accountType,
      state,
    }),
  };
}

/**
 * Generate trust account transaction
 * @param {object} options - Transaction options
 * @returns {object} Transaction record
 */
export function generateTrustTransaction(options = {}) {
  const {
    trustAccount,
    transactionType,
    amount,
    relatedDeposit = null,
    tenant = null,
    description = null,
    date = isoTimestamp(),
    testCaseId = null,
  } = options;

  const id = trustTransactionId();
  const txType = TRANSACTION_TYPES[transactionType] || TRANSACTION_TYPES.DEPOSIT_IN;

  return {
    id,
    trust_account_id: trustAccount?.id || null,

    // Transaction details
    transaction_type: txType.type,
    transaction_date: date,
    amount,
    direction: txType.direction,

    // Balance tracking
    balance_before: trustAccount?.current_balance || '0.0000',
    balance_after: txType.direction === 'credit'
      ? decimalAdd(trustAccount?.current_balance || '0.0000', amount)
      : decimalSubtract(trustAccount?.current_balance || '0.0000', amount),

    // Related records
    security_deposit_id: relatedDeposit?.id || null,
    tenant_id: tenant?.id || null,
    lease_id: relatedDeposit?.lease_id || null,

    // Description
    description: description || `${txType.type.replace('_', ' ')} - $${amount}`,

    // Audit
    reference_number: `TXN-${uuid().slice(0, 8).toUpperCase()}`,
    created_by: 'system',

    // Status
    status: 'completed',
    is_reconciled: true,
    reconciled_date: date,

    // Timestamps
    created_at: date,
    updated_at: isoTimestamp(),

    // Seed metadata
    metadata: seedMetadata(testCaseId, {
      seed_type: 'trust_transaction',
      transaction_type: txType.type,
    }),
  };
}

/**
 * Generate trust accounts for a property with security deposits
 * @param {object} property - Property record
 * @param {object} company - Company record
 * @param {object[]} securityDeposits - Security deposits for property
 * @returns {object} Trust account with transactions
 */
export function generateTrustAccountWithDeposits(property, company, securityDeposits) {
  // Create trust account
  const trustAccount = generateTrustAccount({
    company,
    property,
    accountType: TRUST_ACCOUNT_TYPES.SECURITY_DEPOSIT,
  });

  const transactions = [];

  // Filter held deposits for this property
  const heldDeposits = securityDeposits.filter(d =>
    d.property_id === property.id && d.status === 'held'
  );

  // Generate deposit-in transactions
  heldDeposits.forEach(deposit => {
    transactions.push(generateTrustTransaction({
      trustAccount,
      transactionType: 'DEPOSIT_IN',
      amount: deposit.amount,
      relatedDeposit: deposit,
      tenant: { id: deposit.tenant_id },
      description: 'Security deposit received',
      date: deposit.date_received,
    }));
  });

  // Calculate balance
  const totalBalance = decimalSum(heldDeposits.map(d => d.amount));
  trustAccount.current_balance = totalBalance;
  trustAccount.available_balance = totalBalance;

  // Handle refunded deposits (generate outgoing transactions)
  const refundedDeposits = securityDeposits.filter(d =>
    d.property_id === property.id &&
    (d.status === 'refunded' || d.status === 'applied_to_damages')
  );

  refundedDeposits.forEach(deposit => {
    // First the deposit was received
    transactions.push(generateTrustTransaction({
      trustAccount,
      transactionType: 'DEPOSIT_IN',
      amount: deposit.amount,
      relatedDeposit: deposit,
      tenant: { id: deposit.tenant_id },
      description: 'Security deposit received',
      date: deposit.date_received,
    }));

    // Then refunded/applied
    if (deposit.refund_amount && parseFloat(deposit.refund_amount) > 0) {
      transactions.push(generateTrustTransaction({
        trustAccount,
        transactionType: 'DEPOSIT_OUT',
        amount: deposit.refund_amount,
        relatedDeposit: deposit,
        tenant: { id: deposit.tenant_id },
        description: deposit.status === 'refunded' ? 'Security deposit refund' : 'Applied to damages - partial refund',
        date: deposit.refund_date || daysAgo(1),
        testCaseId: 'TC-CAL-001',
      }));
    }
  });

  return {
    trustAccount,
    transactions,
  };
}

/**
 * Generate all trust accounts and transactions
 * @param {object[]} companies - Company records
 * @param {object[]} properties - Property records
 * @param {object[]} securityDeposits - Security deposit records
 * @returns {object} All trust accounts and transactions
 */
export function generateAllTrustAccounts(companies, properties, securityDeposits) {
  const allTrustAccounts = [];
  const allTransactions = [];

  const companyMap = new Map(companies.map(c => [c.id, c]));

  properties.forEach(property => {
    const company = companyMap.get(property.company_id);
    const propertyDeposits = securityDeposits.filter(d => d.property_id === property.id);

    if (propertyDeposits.length > 0) {
      const { trustAccount, transactions } = generateTrustAccountWithDeposits(
        property,
        company,
        propertyDeposits
      );

      allTrustAccounts.push(trustAccount);
      allTransactions.push(...transactions);
    }
  });

  return {
    trustAccounts: allTrustAccounts,
    transactions: allTransactions,
  };
}

/**
 * Generate commingled trust account for TC-CAL-005 testing
 * This should be DETECTED as a violation
 * @param {object} company - Company
 * @param {object[]} properties - Multiple properties
 * @returns {object} Commingled trust account (VIOLATION)
 */
export function generateCommingledTrustAccount(company, properties) {
  const trustAccount = generateTrustAccount({
    company,
    property: null, // NO PROPERTY - COMMINGLED!
    accountType: TRUST_ACCOUNT_TYPES.SECURITY_DEPOSIT,
    testCaseId: 'TC-CAL-005',
  });

  trustAccount.account_name = 'Commingled Security Deposit Account (VIOLATION)';
  trustAccount.is_compliant = false;

  const transactions = [];
  let runningBalance = '0.0000';

  // Deposits from MULTIPLE properties in SAME account
  properties.slice(0, 3).forEach((property, index) => {
    const amount = randomAmount(1000, 3000);
    runningBalance = decimalAdd(runningBalance, amount);

    transactions.push(generateTrustTransaction({
      trustAccount,
      transactionType: 'DEPOSIT_IN',
      amount,
      description: `Deposit from ${property.name} - COMMINGLED`,
      date: daysAgo(30 - index * 5),
      testCaseId: 'TC-CAL-005',
    }));
  });

  trustAccount.current_balance = runningBalance;

  return {
    trustAccount,
    transactions,
    violation: {
      type: 'TRUST_COMMINGLING',
      severity: 'critical',
      message: 'Security deposits from multiple properties held in single account',
      properties: properties.slice(0, 3).map(p => p.id),
      testCaseId: 'TC-CAL-005',
    },
  };
}

/**
 * Validate trust account balance matches deposits
 * @param {object} trustAccount - Trust account
 * @param {object[]} securityDeposits - Related deposits
 * @returns {object} Validation result
 */
export function validateTrustBalance(trustAccount, securityDeposits) {
  const heldDeposits = securityDeposits.filter(d =>
    d.property_id === trustAccount.property_id && d.status === 'held'
  );

  const expectedBalance = decimalSum(heldDeposits.map(d => d.amount));
  const actualBalance = trustAccount.current_balance;

  const difference = decimalSubtract(actualBalance, expectedBalance);
  const isBalanced = parseFloat(difference) === 0;

  return {
    trustAccountId: trustAccount.id,
    propertyId: trustAccount.property_id,
    expectedBalance,
    actualBalance,
    difference,
    isBalanced,
    depositCount: heldDeposits.length,
    violation: !isBalanced ? {
      type: 'TRUST_BALANCE_MISMATCH',
      severity: 'critical',
      message: `Trust account balance $${actualBalance} does not match sum of held deposits $${expectedBalance}`,
      testCaseId: 'TC-CAL-005',
    } : null,
  };
}

/**
 * Get trust account summary
 * @param {object[]} trustAccounts - Trust account records
 * @returns {object} Summary statistics
 */
export function getTrustAccountSummary(trustAccounts) {
  const summary = {
    total: trustAccounts.length,
    byType: {},
    byState: {},
    totalBalance: '0.0000',
    compliant: 0,
    nonCompliant: 0,
    reconciled: 0,
    unreconciled: 0,
  };

  trustAccounts.forEach(account => {
    summary.byType[account.account_type] = (summary.byType[account.account_type] || 0) + 1;
    summary.byState[account.state] = (summary.byState[account.state] || 0) + 1;
    summary.totalBalance = decimalAdd(summary.totalBalance, account.current_balance);

    if (account.is_compliant) summary.compliant++;
    else summary.nonCompliant++;

    if (account.is_reconciled) summary.reconciled++;
    else summary.unreconciled++;
  });

  return summary;
}

export default {
  generateTrustAccount,
  generateTrustTransaction,
  generateTrustAccountWithDeposits,
  generateAllTrustAccounts,
  generateCommingledTrustAccount,
  validateTrustBalance,
  getTrustAccountSummary,
  TRUST_ACCOUNT_TYPES,
  TRANSACTION_TYPES,
};
