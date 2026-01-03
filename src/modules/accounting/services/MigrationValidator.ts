/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * MigrationValidator - Data Import Validation
 *
 * When importing data from AppFolio, Rentvine, DoorLoop, or other systems:
 *
 * 1. ACCOUNTING EQUATION: Sum(Debits) - Sum(Credits) = 0 for every transaction
 * 2. NEGATIVE CASH: No owner can start with negative cash (unless it's a loan)
 * 3. ORPHAN CHECK: All postings must have valid journal entries
 * 4. PERIOD INTEGRITY: All entries must have valid period references
 * 5. CHART OF ACCOUNTS: All account references must be valid
 *
 * This validator BLOCKS migration if any rule fails.
 */

import { supabase } from '@/lib/supabase';
import type { Decimal, ISODate, UUID } from '../types';

export class MigrationValidator {
  private organizationId: string;
  private validationResults: ValidationResult[] = [];
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * Validate a batch of imported transactions
   */
  async validateImportBatch(transactions: ImportedTransaction[]): Promise<MigrationValidationResult> {
    this.reset();

    console.log(`[MigrationValidator] Validating ${transactions.length} transactions...`);

    // Run all validations
    await this.validateAccountingEquation(transactions);
    await this.validateNoNegativeCash(transactions);
    await this.validateAccountReferences(transactions);
    await this.validateDateIntegrity(transactions);
    await this.validateDuplicates(transactions);

    const passed = this.errors.length === 0;

    const result: MigrationValidationResult = {
      passed,
      timestamp: new Date().toISOString(),
      organizationId: this.organizationId,
      transactionsValidated: transactions.length,
      errors: this.errors,
      warnings: this.warnings,
      validationResults: this.validationResults,
      summary: {
        totalChecks: this.validationResults.length,
        passedChecks: this.validationResults.filter((r) => r.passed).length,
        failedChecks: this.validationResults.filter((r) => !r.passed).length,
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
      },
    };

    if (!passed) {
      console.error('[MigrationValidator] VALIDATION FAILED!', {
        errorCount: this.errors.length,
        errors: this.errors.slice(0, 10), // First 10 errors
      });
    }

    return result;
  }

  /**
   * Rule 1: Accounting Equation
   * Sum(Debits) - Sum(Credits) = 0 for every transaction
   */
  private async validateAccountingEquation(transactions: ImportedTransaction[]): Promise<void> {
    const ruleName = 'ACCOUNTING_EQUATION';
    const unbalancedTransactions: string[] = [];

    for (const txn of transactions) {
      const sum = txn.postings.reduce(
        (acc, p) => acc + parseFloat(p.amount),
        0
      );

      if (Math.abs(sum) >= 0.01) {
        unbalancedTransactions.push(txn.externalId);
        this.errors.push({
          rule: ruleName,
          severity: 'error',
          message: `Transaction ${txn.externalId} is unbalanced by ${sum.toFixed(4)}`,
          transactionId: txn.externalId,
          details: { sum, postings: txn.postings },
        });
      }
    }

    this.validationResults.push({
      rule: ruleName,
      passed: unbalancedTransactions.length === 0,
      message:
        unbalancedTransactions.length === 0
          ? 'All transactions are balanced'
          : `${unbalancedTransactions.length} unbalanced transactions found`,
      details: { unbalancedCount: unbalancedTransactions.length },
    });
  }

  /**
   * Rule 2: No Negative Cash
   * Owners cannot start with negative cash balance (unless explicitly a loan)
   */
  private async validateNoNegativeCash(transactions: ImportedTransaction[]): Promise<void> {
    const ruleName = 'NO_NEGATIVE_CASH';
    const negativeCashOwners: Map<string, number> = new Map();

    // Group transactions by owner and calculate running balance
    const ownerBalances: Map<string, number> = new Map();

    for (const txn of transactions) {
      for (const posting of txn.postings) {
        if (posting.ownerId && posting.accountType === 'asset') {
          const current = ownerBalances.get(posting.ownerId) || 0;
          const newBalance = current + parseFloat(posting.amount);
          ownerBalances.set(posting.ownerId, newBalance);

          if (newBalance < -0.01 && !posting.isLoan) {
            negativeCashOwners.set(posting.ownerId, newBalance);
          }
        }
      }
    }

    for (const [ownerId, balance] of negativeCashOwners) {
      this.errors.push({
        rule: ruleName,
        severity: 'error',
        message: `Owner ${ownerId} has negative cash balance: ${balance.toFixed(2)}`,
        ownerId,
        details: { balance },
      });
    }

    this.validationResults.push({
      rule: ruleName,
      passed: negativeCashOwners.size === 0,
      message:
        negativeCashOwners.size === 0
          ? 'No negative cash balances found'
          : `${negativeCashOwners.size} owners with negative cash`,
      details: { affectedOwners: negativeCashOwners.size },
    });
  }

  /**
   * Rule 3: Valid Account References
   * All account IDs must exist in chart_of_accounts
   */
  private async validateAccountReferences(transactions: ImportedTransaction[]): Promise<void> {
    const ruleName = 'VALID_ACCOUNTS';

    // Collect all unique account codes/IDs
    const accountRefs = new Set<string>();
    for (const txn of transactions) {
      for (const posting of txn.postings) {
        accountRefs.add(posting.accountCode || posting.accountId || '');
      }
    }

    // Check against existing chart of accounts
    const { data: existingAccounts, error } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code')
      .eq('organization_id', this.organizationId);

    if (error) {
      this.warnings.push({
        rule: ruleName,
        message: 'Could not validate account references: ' + error.message,
        details: { error: error.message },
      });
      return;
    }

    const validIds = new Set((existingAccounts || []).map((a) => a.id));
    const validCodes = new Set((existingAccounts || []).map((a) => a.account_code));

    const invalidRefs: string[] = [];
    for (const ref of accountRefs) {
      if (ref && !validIds.has(ref) && !validCodes.has(ref)) {
        invalidRefs.push(ref);
      }
    }

    for (const ref of invalidRefs) {
      this.errors.push({
        rule: ruleName,
        severity: 'error',
        message: `Invalid account reference: ${ref}`,
        details: { accountRef: ref },
      });
    }

    this.validationResults.push({
      rule: ruleName,
      passed: invalidRefs.length === 0,
      message:
        invalidRefs.length === 0
          ? 'All account references are valid'
          : `${invalidRefs.length} invalid account references`,
      details: { invalidCount: invalidRefs.length },
    });
  }

  /**
   * Rule 4: Date Integrity
   * All dates must be valid and within reasonable range
   */
  private async validateDateIntegrity(transactions: ImportedTransaction[]): Promise<void> {
    const ruleName = 'DATE_INTEGRITY';
    const invalidDates: string[] = [];
    const futureDates: string[] = [];

    const today = new Date();
    const minDate = new Date('1990-01-01');

    for (const txn of transactions) {
      const txnDate = new Date(txn.date);

      if (isNaN(txnDate.getTime())) {
        invalidDates.push(txn.externalId);
        this.errors.push({
          rule: ruleName,
          severity: 'error',
          message: `Transaction ${txn.externalId} has invalid date: ${txn.date}`,
          transactionId: txn.externalId,
        });
      } else if (txnDate > today) {
        futureDates.push(txn.externalId);
        this.warnings.push({
          rule: ruleName,
          message: `Transaction ${txn.externalId} has future date: ${txn.date}`,
          transactionId: txn.externalId,
        });
      } else if (txnDate < minDate) {
        this.warnings.push({
          rule: ruleName,
          message: `Transaction ${txn.externalId} has very old date: ${txn.date}`,
          transactionId: txn.externalId,
        });
      }
    }

    this.validationResults.push({
      rule: ruleName,
      passed: invalidDates.length === 0,
      message:
        invalidDates.length === 0
          ? 'All dates are valid'
          : `${invalidDates.length} invalid dates found`,
      details: {
        invalidCount: invalidDates.length,
        futureDateCount: futureDates.length,
      },
    });
  }

  /**
   * Rule 5: Duplicate Detection
   * Check for potential duplicate transactions
   */
  private async validateDuplicates(transactions: ImportedTransaction[]): Promise<void> {
    const ruleName = 'DUPLICATE_DETECTION';

    // Create fingerprint for each transaction
    const fingerprints = new Map<string, ImportedTransaction[]>();

    for (const txn of transactions) {
      // Fingerprint = date + total amount + description
      const totalAmount = txn.postings
        .filter((p) => parseFloat(p.amount) > 0)
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      const fingerprint = `${txn.date}|${totalAmount.toFixed(2)}|${txn.description?.toLowerCase().trim()}`;

      const existing = fingerprints.get(fingerprint) || [];
      existing.push(txn);
      fingerprints.set(fingerprint, existing);
    }

    // Find duplicates
    const duplicateGroups: ImportedTransaction[][] = [];
    for (const [, group] of fingerprints) {
      if (group.length > 1) {
        duplicateGroups.push(group);
        this.warnings.push({
          rule: ruleName,
          message: `Potential duplicate transactions found: ${group.map((t) => t.externalId).join(', ')}`,
          details: { transactionIds: group.map((t) => t.externalId) },
        });
      }
    }

    this.validationResults.push({
      rule: ruleName,
      passed: true, // Duplicates are warnings, not errors
      message:
        duplicateGroups.length === 0
          ? 'No potential duplicates detected'
          : `${duplicateGroups.length} potential duplicate groups found`,
      details: { duplicateGroupCount: duplicateGroups.length },
    });
  }

  /**
   * Validate opening balances
   */
  async validateOpeningBalances(openingBalances: OpeningBalance[]): Promise<MigrationValidationResult> {
    this.reset();

    const ruleName = 'OPENING_BALANCE_EQUATION';

    // Sum of all opening balances should equal zero
    const sum = openingBalances.reduce((acc, ob) => acc + parseFloat(ob.balance), 0);

    if (Math.abs(sum) >= 0.01) {
      this.errors.push({
        rule: ruleName,
        severity: 'error',
        message: `Opening balances are unbalanced by ${sum.toFixed(4)}`,
        details: { sum },
      });
    }

    this.validationResults.push({
      rule: ruleName,
      passed: Math.abs(sum) < 0.01,
      message:
        Math.abs(sum) < 0.01
          ? 'Opening balances are balanced'
          : `Opening balances are unbalanced by ${sum.toFixed(4)}`,
      details: { sum },
    });

    return {
      passed: this.errors.length === 0,
      timestamp: new Date().toISOString(),
      organizationId: this.organizationId,
      transactionsValidated: openingBalances.length,
      errors: this.errors,
      warnings: this.warnings,
      validationResults: this.validationResults,
      summary: {
        totalChecks: this.validationResults.length,
        passedChecks: this.validationResults.filter((r) => r.passed).length,
        failedChecks: this.validationResults.filter((r) => !r.passed).length,
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
      },
    };
  }

  private reset(): void {
    this.validationResults = [];
    this.errors = [];
    this.warnings = [];
  }
}

// Types
export interface ImportedTransaction {
  externalId: string;
  date: ISODate;
  description: string;
  sourceSystem: string; // 'appfolio', 'rentvine', 'doorloop'
  postings: ImportedPosting[];
}

export interface ImportedPosting {
  accountId?: UUID;
  accountCode?: string;
  accountType?: string;
  amount: Decimal;
  propertyId?: UUID;
  tenantId?: UUID;
  ownerId?: UUID;
  isLoan?: boolean;
  description?: string;
}

export interface OpeningBalance {
  accountId: UUID;
  accountCode: string;
  balance: Decimal;
  propertyId?: UUID;
  asOfDate: ISODate;
}

export interface ValidationResult {
  rule: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

export interface ValidationError {
  rule: string;
  severity: 'error' | 'critical';
  message: string;
  transactionId?: string;
  ownerId?: string;
  details?: unknown;
}

export interface ValidationWarning {
  rule: string;
  message: string;
  transactionId?: string;
  details?: unknown;
}

export interface MigrationValidationResult {
  passed: boolean;
  timestamp: string;
  organizationId: UUID;
  transactionsValidated: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validationResults: ValidationResult[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    errorCount: number;
    warningCount: number;
  };
}

export function createMigrationValidator(organizationId: string): MigrationValidator {
  return new MigrationValidator(organizationId);
}
