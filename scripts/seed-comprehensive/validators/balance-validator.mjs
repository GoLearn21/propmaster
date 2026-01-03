/**
 * Balance Validator
 * Validates tenant, trust, and account balance consistency
 */

import { VALIDATION_THRESHOLDS, STATE_COMPLIANCE } from '../config/seed-config.mjs';

/**
 * Balance Validator class
 */
export class BalanceValidator {
  constructor() {
    this.name = 'Balance Validator';
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
   * Validate tenant balance matches payment history
   * @param {object[]} tenants - Tenant records
   * @param {object[]} payments - Payment records
   * @param {object[]} leases - Lease records
   */
  validateTenantBalances(tenants, payments, leases) {
    const tolerance = VALIDATION_THRESHOLDS.balanceTolerance;

    // Group payments by tenant
    const paymentsByTenant = {};
    payments.forEach(payment => {
      if (!payment.tenant_id) return;
      if (!paymentsByTenant[payment.tenant_id]) {
        paymentsByTenant[payment.tenant_id] = [];
      }
      paymentsByTenant[payment.tenant_id].push(payment);
    });

    // Group leases by tenant
    const leasesByTenant = {};
    leases.forEach(lease => {
      if (!lease.tenant_id) return;
      if (!leasesByTenant[lease.tenant_id]) {
        leasesByTenant[lease.tenant_id] = [];
      }
      leasesByTenant[lease.tenant_id].push(lease);
    });

    tenants.forEach(tenant => {
      const tenantPayments = paymentsByTenant[tenant.id] || [];
      const tenantLeases = leasesByTenant[tenant.id] || [];

      // Calculate expected balance
      // This is a simplified calculation - real logic would be more complex
      let totalCharges = 0;
      let totalPayments = 0;

      // Add up lease charges (simplified - assume monthly rent for active months)
      tenantLeases.forEach(lease => {
        if (lease.status === 'active') {
          const monthsActive = this.calculateMonthsActive(lease);
          totalCharges += parseFloat(lease.monthly_rent) * monthsActive;
        }
      });

      // Add up payments
      tenantPayments.forEach(payment => {
        if (payment.status === 'completed') {
          const amount = parseFloat(payment.amount);
          if (!payment.is_late_fee && amount > 0) {
            totalPayments += amount;
          }
        }
      });

      const calculatedBalance = totalCharges - totalPayments;
      const recordedBalance = parseFloat(tenant.balance_due || 0);

      // For seed data, we're more lenient - just check if balance direction is correct
      if (recordedBalance > 0 && calculatedBalance < -tolerance) {
        this.addIssue({
          severity: 'warning',
          table: 'tenants',
          field: 'balance_due',
          record: tenant.id,
          message: `Tenant has positive balance ($${recordedBalance.toFixed(2)}) but calculations suggest credit ($${calculatedBalance.toFixed(2)})`,
          suggestedFix: 'Review payment history and charge records',
        });
      }

      if (recordedBalance < 0 && calculatedBalance > tolerance) {
        this.addIssue({
          severity: 'warning',
          table: 'tenants',
          field: 'balance_due',
          record: tenant.id,
          message: `Tenant has credit balance ($${recordedBalance.toFixed(2)}) but calculations suggest balance due ($${calculatedBalance.toFixed(2)})`,
          suggestedFix: 'Review payment history and charge records',
        });
      }
    });
  }

  /**
   * Calculate months active for a lease
   * @param {object} lease - Lease record
   * @returns {number} Months active
   */
  calculateMonthsActive(lease) {
    const start = new Date(lease.start_date);
    const end = lease.end_date ? new Date(lease.end_date) : new Date();
    const now = new Date();
    const actualEnd = end < now ? end : now;

    const months = (actualEnd.getFullYear() - start.getFullYear()) * 12 +
                   (actualEnd.getMonth() - start.getMonth());
    return Math.max(0, months);
  }

  /**
   * Validate trust account balances match security deposits
   * @param {object[]} trustAccounts - Trust account records
   * @param {object[]} securityDeposits - Security deposit records
   * @param {object[]} properties - Property records
   */
  validateTrustAccountBalances(trustAccounts, securityDeposits, properties) {
    const tolerance = VALIDATION_THRESHOLDS.balanceTolerance;

    // Group deposits by property
    const depositsByProperty = {};
    securityDeposits.forEach(deposit => {
      if (!deposit.property_id) return;
      if (deposit.status !== 'held') return; // Only count held deposits

      if (!depositsByProperty[deposit.property_id]) {
        depositsByProperty[deposit.property_id] = [];
      }
      depositsByProperty[deposit.property_id].push(deposit);
    });

    // Group trust accounts by property
    const trustByProperty = {};
    trustAccounts.forEach(trust => {
      if (!trust.property_id) return;
      if (!trustByProperty[trust.property_id]) {
        trustByProperty[trust.property_id] = [];
      }
      trustByProperty[trust.property_id].push(trust);
    });

    properties.forEach(property => {
      const propertyDeposits = depositsByProperty[property.id] || [];
      const propertyTrusts = trustByProperty[property.id] || [];

      // Sum held deposits
      const totalDeposits = propertyDeposits.reduce((sum, d) => {
        return sum + parseFloat(d.amount || 0);
      }, 0);

      // Sum trust account balances
      const totalTrust = propertyTrusts.reduce((sum, t) => {
        return sum + parseFloat(t.current_balance || 0);
      }, 0);

      const difference = Math.abs(totalDeposits - totalTrust);

      if (difference > tolerance && totalDeposits > 0) {
        this.addIssue({
          severity: 'critical',
          table: 'trust_accounts',
          field: 'current_balance',
          record: property.id,
          message: `Trust account balance mismatch for ${property.name}. Deposits held: $${totalDeposits.toFixed(2)}, Trust balance: $${totalTrust.toFixed(2)}, Difference: $${difference.toFixed(2)}`,
          suggestedFix: 'Reconcile trust account with security deposits',
          trustIntegrityViolation: true,
        });
      }
    });
  }

  /**
   * Validate state compliance for security deposits
   * @param {object[]} securityDeposits - Security deposit records
   * @param {object[]} leases - Lease records
   * @param {object[]} properties - Property records
   */
  validateSecurityDepositCompliance(securityDeposits, leases, properties) {
    const leaseMap = new Map(leases.map(l => [l.id, l]));
    const propertyMap = new Map(properties.map(p => [p.id, p]));

    securityDeposits.forEach(deposit => {
      const lease = leaseMap.get(deposit.lease_id);
      const property = propertyMap.get(deposit.property_id);

      if (!lease || !property) return;

      const state = property.state;
      const rules = STATE_COMPLIANCE[state];

      if (!rules?.securityDeposit) return;

      const maxMonths = rules.securityDeposit.maxMonthsRent;
      if (maxMonths) {
        const maxDeposit = parseFloat(lease.monthly_rent) * maxMonths;
        const actualDeposit = parseFloat(deposit.amount);

        if (actualDeposit > maxDeposit + 0.01) {
          this.addIssue({
            severity: 'critical',
            table: 'security_deposits',
            field: 'amount',
            record: deposit.id,
            message: `Security deposit $${actualDeposit.toFixed(2)} exceeds ${state} maximum of ${maxMonths} months rent ($${maxDeposit.toFixed(2)})`,
            suggestedFix: `Reduce deposit to ${maxMonths} months rent or less`,
            complianceViolation: true,
            state,
          });
        }
      }

      // Check return deadline for returned deposits
      if (deposit.status === 'refunded' || deposit.status === 'applied_to_damages') {
        const returnDeadline = rules.securityDeposit.returnDeadlineDays;
        if (returnDeadline && deposit.date_returned) {
          // This would need move-out date to validate properly
          // For now, just note that deadline enforcement exists
        }
      }
    });
  }

  /**
   * Validate late fee compliance with state rules
   * @param {object[]} payments - Payment records (late fee payments)
   * @param {object[]} leases - Lease records
   * @param {object[]} properties - Property records
   */
  validateLateFeeCompliance(payments, leases, properties) {
    const leaseMap = new Map(leases.map(l => [l.id, l]));
    const propertyMap = new Map(properties.map(p => [p.id, p]));

    // Filter to late fee payments
    const lateFees = payments.filter(p => p.is_late_fee);

    lateFees.forEach(payment => {
      const lease = leaseMap.get(payment.lease_id);
      const property = propertyMap.get(payment.property_id);

      if (!lease || !property) return;

      const state = property.state;
      const rules = STATE_COMPLIANCE[state];

      if (!rules?.lateFee) return;

      const rent = parseFloat(lease.monthly_rent);
      const fee = parseFloat(payment.amount);

      // NC specific: 5% or $15 whichever less
      if (state === 'NC') {
        const maxPercent = rent * 0.05;
        const maxFlat = 15;
        const maxFee = Math.min(maxPercent, maxFlat);

        if (fee > maxFee + 0.01) {
          this.addIssue({
            severity: 'critical',
            table: 'payments',
            field: 'amount',
            record: payment.id,
            message: `Late fee $${fee.toFixed(2)} exceeds NC maximum of $${maxFee.toFixed(2)} (5% or $15, whichever less)`,
            suggestedFix: `Reduce late fee to $${maxFee.toFixed(2)}`,
            complianceViolation: true,
            state: 'NC',
            testCaseId: 'TC-CAL-002',
          });
        }
      }
    });
  }

  /**
   * Validate journal entry double-entry balance
   * @param {object[]} journalEntries - Journal entry records
   * @param {object[]} journalPostings - Journal posting records
   */
  validateJournalEntryBalance(journalEntries, journalPostings) {
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

      if (postings.length === 0 && entry.status !== 'draft') {
        this.addIssue({
          severity: 'warning',
          table: 'journal_entries',
          field: 'postings',
          record: entry.id,
          message: 'Journal entry has no postings',
          suggestedFix: 'Add debit and credit postings to balance the entry',
        });
        return;
      }

      let totalDebits = 0;
      let totalCredits = 0;

      postings.forEach(posting => {
        totalDebits += parseFloat(posting.debit_amount || 0);
        totalCredits += parseFloat(posting.credit_amount || 0);
      });

      const difference = Math.abs(totalDebits - totalCredits);

      if (difference > tolerance) {
        this.addIssue({
          severity: 'critical',
          table: 'journal_entries',
          field: 'postings',
          record: entry.id,
          message: `DOUBLE-ENTRY VIOLATION: Debits ($${totalDebits.toFixed(4)}) ≠ Credits ($${totalCredits.toFixed(4)}). Difference: $${difference.toFixed(4)}`,
          suggestedFix: 'Ensure sum of debits equals sum of credits',
          doubleEntryViolation: true,
          testCaseId: 'TC-FLT-003',
        });
      }
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
      tenants = [],
      payments = [],
      leases = [],
      properties = [],
      securityDeposits = [],
      trustAccounts = [],
      journalEntries = [],
      journalPostings = [],
    } = seedData;

    // Tenant balance validation
    if (tenants.length > 0 && payments.length > 0) {
      this.validateTenantBalances(tenants, payments, leases);
    }

    // Trust account validation
    if (trustAccounts.length > 0 && securityDeposits.length > 0) {
      this.validateTrustAccountBalances(trustAccounts, securityDeposits, properties);
    }

    // Compliance validations
    if (securityDeposits.length > 0) {
      this.validateSecurityDepositCompliance(securityDeposits, leases, properties);
    }

    if (payments.length > 0) {
      this.validateLateFeeCompliance(payments, leases, properties);
    }

    // Journal entry balance validation
    if (journalEntries.length > 0) {
      this.validateJournalEntryBalance(journalEntries, journalPostings);
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
      },
    };
  }
}

export default BalanceValidator;
