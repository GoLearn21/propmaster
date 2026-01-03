/**
 * Accounting Validator
 * Validates double-entry bookkeeping and compliance rules
 */

import { VALIDATION_THRESHOLDS, STATE_COMPLIANCE } from '../config/seed-config.mjs';
import {
  decimalAdd,
  decimalSubtract,
  decimalSum,
  isBalanced,
} from '../utils/decimal-utils.mjs';

/**
 * Accounting Validator class
 */
export class AccountingValidator {
  constructor() {
    this.name = 'Accounting Validator';
    this.issues = [];
  }

  /**
   * Reset issues for a new validation run
   */
  reset() {
    this.issues = [];
  }

  /**
   * Add an issue to the collection
   * @param {object} issue - Issue to add
   */
  addIssue(issue) {
    this.issues.push({
      validator: this.name,
      timestamp: new Date().toISOString(),
      ...issue,
    });
  }

  /**
   * Validate double-entry balance for all journal entries
   * @param {object[]} journalEntries - Journal entry records
   * @param {object[]} journalPostings - Journal posting records
   */
  validateDoubleEntry(journalEntries, journalPostings) {
    const tolerance = VALIDATION_THRESHOLDS.doubleEntryTolerance;

    // Group postings by entry
    const postingsByEntry = {};
    journalPostings.forEach(posting => {
      if (!postingsByEntry[posting.journal_entry_id]) {
        postingsByEntry[posting.journal_entry_id] = [];
      }
      postingsByEntry[posting.journal_entry_id].push(posting);
    });

    journalEntries.forEach(entry => {
      const postings = postingsByEntry[entry.id] || [];

      // Skip draft entries
      if (entry.status === 'draft') return;

      // Must have postings
      if (postings.length === 0) {
        this.addIssue({
          severity: 'error',
          table: 'journal_entries',
          field: 'postings',
          record: entry.id,
          message: `Journal entry has no postings`,
          suggestedFix: 'Add balanced debit and credit postings',
          testCaseId: 'TC-FLT-003',
        });
        return;
      }

      // Must have at least one debit and one credit
      const hasDebit = postings.some(p => parseFloat(p.debit_amount) > 0);
      const hasCredit = postings.some(p => parseFloat(p.credit_amount) > 0);

      if (!hasDebit || !hasCredit) {
        this.addIssue({
          severity: 'critical',
          table: 'journal_entries',
          field: 'postings',
          record: entry.id,
          message: `Journal entry missing ${!hasDebit ? 'debit' : 'credit'} posting`,
          suggestedFix: 'Ensure entry has both debit and credit postings',
          doubleEntryViolation: true,
          testCaseId: 'TC-FLT-003',
        });
        return;
      }

      // Calculate totals
      let totalDebits = 0;
      let totalCredits = 0;

      postings.forEach(posting => {
        totalDebits += parseFloat(posting.debit_amount || 0);
        totalCredits += parseFloat(posting.credit_amount || 0);
      });

      const difference = Math.abs(totalDebits - totalCredits);

      // CRITICAL: Zero tolerance for imbalance
      if (difference > tolerance) {
        this.addIssue({
          severity: 'critical',
          table: 'journal_entries',
          field: 'postings',
          record: entry.id,
          message: `DOUBLE-ENTRY VIOLATION: Debits ($${totalDebits.toFixed(4)}) ≠ Credits ($${totalCredits.toFixed(4)}). Imbalance: $${difference.toFixed(4)}`,
          suggestedFix: `Adjust postings by $${difference.toFixed(4)} to balance`,
          doubleEntryViolation: true,
          testCaseId: 'TC-FLT-003',
          debitTotal: totalDebits.toFixed(4),
          creditTotal: totalCredits.toFixed(4),
          imbalance: difference.toFixed(4),
        });
      }
    });
  }

  /**
   * Validate chart of accounts structure
   * @param {object[]} accounts - Account records
   */
  validateChartOfAccounts(accounts) {
    // Check for required accounts
    const requiredAccounts = [
      '1010', // Operating Cash
      '1020', // Trust - Security Deposits
      '1110', // Tenant Receivables
      '2110', // Security Deposits Held
      '4010', // Residential Rent
      '4110', // Late Fees
    ];

    const accountCodes = new Set(accounts.map(a => a.account_code));

    requiredAccounts.forEach(code => {
      if (!accountCodes.has(code)) {
        this.addIssue({
          severity: 'error',
          table: 'accounts',
          field: 'account_code',
          record: code,
          message: `Required account ${code} is missing from chart of accounts`,
          suggestedFix: `Add standard account ${code}`,
        });
      }
    });

    // Check for duplicate account codes within same company
    const codesByCompany = {};
    accounts.forEach(account => {
      const key = `${account.company_id}:${account.account_code}`;
      if (codesByCompany[key]) {
        this.addIssue({
          severity: 'error',
          table: 'accounts',
          field: 'account_code',
          record: account.id,
          message: `Duplicate account code ${account.account_code} in company`,
          suggestedFix: 'Use unique account codes within each company',
        });
      }
      codesByCompany[key] = true;
    });

    // Validate account type consistency
    const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    accounts.forEach(account => {
      if (!validTypes.includes(account.account_type)) {
        this.addIssue({
          severity: 'error',
          table: 'accounts',
          field: 'account_type',
          record: account.id,
          message: `Invalid account type: ${account.account_type}`,
          suggestedFix: `Use one of: ${validTypes.join(', ')}`,
        });
      }
    });

    // Validate normal balance consistency
    const normalBalanceRules = {
      asset: 'debit',
      expense: 'debit',
      liability: 'credit',
      equity: 'credit',
      revenue: 'credit',
    };

    accounts.forEach(account => {
      const expectedBalance = normalBalanceRules[account.account_type];
      if (expectedBalance && account.normal_balance !== expectedBalance && !account.is_contra) {
        this.addIssue({
          severity: 'warning',
          table: 'accounts',
          field: 'normal_balance',
          record: account.id,
          message: `Account ${account.account_code} has unexpected normal balance. Expected: ${expectedBalance}, Got: ${account.normal_balance}`,
          suggestedFix: `Set normal_balance to '${expectedBalance}' or mark as contra account`,
        });
      }
    });
  }

  /**
   * Validate trust account compliance
   * @param {object[]} trustAccounts - Trust account records
   * @param {object[]} securityDeposits - Security deposit records
   * @param {object[]} properties - Property records
   */
  validateTrustCompliance(trustAccounts, securityDeposits, properties) {
    const propertyMap = new Map(properties.map(p => [p.id, p]));

    // Check for commingling (multiple properties in one trust account)
    const propertiesPerTrust = {};
    securityDeposits.forEach(deposit => {
      if (!deposit.trust_account_id) return;
      if (!propertiesPerTrust[deposit.trust_account_id]) {
        propertiesPerTrust[deposit.trust_account_id] = new Set();
      }
      propertiesPerTrust[deposit.trust_account_id].add(deposit.property_id);
    });

    Object.entries(propertiesPerTrust).forEach(([trustId, propertyIds]) => {
      if (propertyIds.size > 1) {
        this.addIssue({
          severity: 'critical',
          table: 'trust_accounts',
          field: 'id',
          record: trustId,
          message: `TRUST COMMINGLING VIOLATION: Trust account holds deposits from ${propertyIds.size} properties`,
          suggestedFix: 'Each property must have its own trust account for security deposits',
          complianceViolation: true,
          trustIntegrityViolation: true,
          testCaseId: 'TC-CAL-005',
          affectedProperties: Array.from(propertyIds),
        });
      }
    });

    // Validate trust balance matches held deposits
    trustAccounts.forEach(trust => {
      const heldDeposits = securityDeposits.filter(d =>
        d.property_id === trust.property_id && d.status === 'held'
      );

      const expectedBalance = heldDeposits.reduce((sum, d) =>
        decimalAdd(sum, d.amount), '0.0000'
      );

      const actualBalance = trust.current_balance;
      const difference = parseFloat(decimalSubtract(actualBalance, expectedBalance));

      if (Math.abs(difference) > 0.01) {
        this.addIssue({
          severity: 'critical',
          table: 'trust_accounts',
          field: 'current_balance',
          record: trust.id,
          message: `Trust balance mismatch. Expected: $${expectedBalance}, Actual: $${actualBalance}, Diff: $${difference.toFixed(2)}`,
          suggestedFix: 'Reconcile trust account with security deposits',
          trustIntegrityViolation: true,
          testCaseId: 'TC-CAL-005',
        });
      }
    });
  }

  /**
   * Validate 1099 vendor compliance
   * @param {object[]} vendors - Vendor records
   * @param {object[]} payments - Vendor payment records
   */
  validate1099Compliance(vendors, payments) {
    const vendorPayments = {};

    // Sum payments per vendor
    payments.forEach(payment => {
      if (!payment.vendor_id) return;
      if (!vendorPayments[payment.vendor_id]) {
        vendorPayments[payment.vendor_id] = 0;
      }
      vendorPayments[payment.vendor_id] += parseFloat(payment.amount) || 0;
    });

    vendors.forEach(vendor => {
      const totalPaid = vendorPayments[vendor.id] || 0;

      // 1099 threshold is $600
      if (totalPaid >= 600) {
        // Must have TIN/SSN
        if (!vendor.tax_id && !vendor.ssn) {
          this.addIssue({
            severity: 'critical',
            table: 'vendors',
            field: 'tax_id',
            record: vendor.id,
            message: `Vendor ${vendor.name} received $${totalPaid.toFixed(2)} but has no TIN/SSN for 1099 reporting`,
            suggestedFix: 'Collect W-9 and add tax_id before year-end',
            complianceViolation: true,
            testCaseId: 'TC-CAL-010',
          });
        }

        // Must be flagged for 1099
        if (!vendor.requires_1099) {
          this.addIssue({
            severity: 'warning',
            table: 'vendors',
            field: 'requires_1099',
            record: vendor.id,
            message: `Vendor ${vendor.name} received $${totalPaid.toFixed(2)} but requires_1099 is not set`,
            suggestedFix: 'Set requires_1099 = true for vendors paid >= $600',
            testCaseId: 'TC-CAL-010',
          });
        }
      }
    });
  }

  /**
   * Validate audit trail completeness
   * @param {object[]} journalEntries - Journal entry records
   */
  validateAuditTrail(journalEntries) {
    journalEntries.forEach(entry => {
      // Must have created_by
      if (!entry.created_by) {
        this.addIssue({
          severity: 'warning',
          table: 'journal_entries',
          field: 'created_by',
          record: entry.id,
          message: 'Journal entry missing created_by user attribution',
          suggestedFix: 'Ensure all entries have user attribution',
          testCaseId: 'TC-AUD-001',
        });
      }

      // Must have trace_id for distributed tracing
      if (!entry.trace_id) {
        this.addIssue({
          severity: 'info',
          table: 'journal_entries',
          field: 'trace_id',
          record: entry.id,
          message: 'Journal entry missing trace_id for distributed tracing',
          suggestedFix: 'Add trace_id for request correlation',
          testCaseId: 'TC-AUD-006',
        });
      }

      // Must have idempotency_key
      if (!entry.idempotency_key) {
        this.addIssue({
          severity: 'warning',
          table: 'journal_entries',
          field: 'idempotency_key',
          record: entry.id,
          message: 'Journal entry missing idempotency_key for duplicate prevention',
          suggestedFix: 'Add idempotency_key to prevent duplicate postings',
          testCaseId: 'TC-AUD-004',
        });
      }

      // Voided entries must have void reason and timestamp
      if (entry.is_voided) {
        if (!entry.void_reason) {
          this.addIssue({
            severity: 'warning',
            table: 'journal_entries',
            field: 'void_reason',
            record: entry.id,
            message: 'Voided entry missing void_reason',
            suggestedFix: 'Document reason for voiding entry',
            testCaseId: 'TC-AUD-005',
          });
        }
        if (!entry.voided_at) {
          this.addIssue({
            severity: 'warning',
            table: 'journal_entries',
            field: 'voided_at',
            record: entry.id,
            message: 'Voided entry missing voided_at timestamp',
            suggestedFix: 'Record timestamp when entry was voided',
            testCaseId: 'TC-AUD-005',
          });
        }
      }

      // Reversals must reference original entry
      if (entry.is_reversal && !entry.reverses_entry_id) {
        this.addIssue({
          severity: 'error',
          table: 'journal_entries',
          field: 'reverses_entry_id',
          record: entry.id,
          message: 'Reversal entry missing reference to original entry',
          suggestedFix: 'Set reverses_entry_id to original entry ID',
          testCaseId: 'TC-AUD-002',
        });
      }
    });
  }

  /**
   * Validate idempotency key uniqueness
   * @param {object[]} journalEntries - Journal entry records
   */
  validateIdempotencyKeys(journalEntries) {
    const keysSeen = {};

    journalEntries.forEach(entry => {
      if (!entry.idempotency_key) return;

      if (keysSeen[entry.idempotency_key]) {
        this.addIssue({
          severity: 'critical',
          table: 'journal_entries',
          field: 'idempotency_key',
          record: entry.id,
          message: `Duplicate idempotency_key: ${entry.idempotency_key}`,
          suggestedFix: 'Ensure idempotency keys are unique across all entries',
          duplicateOfEntry: keysSeen[entry.idempotency_key],
          testCaseId: 'TC-AUD-004',
        });
      }
      keysSeen[entry.idempotency_key] = entry.id;
    });
  }

  /**
   * Run all validations
   * @param {object} seedData - All seed data
   * @returns {object} Validation result
   */
  validate(seedData) {
    this.reset();

    const {
      accounts = [],
      journalEntries = [],
      journalPostings = [],
      trustAccounts = [],
      securityDeposits = [],
      properties = [],
      vendors = [],
      vendorPayments = [],
    } = seedData;

    // Double-entry validation
    if (journalEntries.length > 0) {
      this.validateDoubleEntry(journalEntries, journalPostings);
      this.validateAuditTrail(journalEntries);
      this.validateIdempotencyKeys(journalEntries);
    }

    // Chart of accounts validation
    if (accounts.length > 0) {
      this.validateChartOfAccounts(accounts);
    }

    // Trust compliance validation
    if (trustAccounts.length > 0) {
      this.validateTrustCompliance(trustAccounts, securityDeposits, properties);
    }

    // 1099 compliance
    if (vendors.length > 0) {
      this.validate1099Compliance(vendors, vendorPayments);
    }

    return {
      validator: this.name,
      issues: this.issues,
      summary: {
        total: this.issues.length,
        critical: this.issues.filter(i => i.severity === 'critical').length,
        errors: this.issues.filter(i => i.severity === 'error').length,
        warnings: this.issues.filter(i => i.severity === 'warning').length,
        info: this.issues.filter(i => i.severity === 'info').length,
        doubleEntryViolations: this.issues.filter(i => i.doubleEntryViolation).length,
        complianceViolations: this.issues.filter(i => i.complianceViolation).length,
        trustViolations: this.issues.filter(i => i.trustIntegrityViolation).length,
      },
    };
  }
}

export default AccountingValidator;
