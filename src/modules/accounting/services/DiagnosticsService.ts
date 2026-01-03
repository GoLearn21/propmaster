/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * DiagnosticsService - "The Canary"
 *
 * TITANIUM RULE: Before generating ANY report, run the Trust Integrity Check.
 *
 * The Trust Integrity Equation:
 * TrustBankBalance = OwnerBalances + TenantDeposits + OutstandingChecks
 *
 * If this equation fails, the system BLOCKS report generation and alerts Admin.
 *
 * Additional Diagnostics:
 * - Trial Balance Check (Debits = Credits)
 * - Account Balance Reconciliation
 * - Orphaned Transactions Detection
 * - Period Integrity Checks
 */

import { supabase } from '@/lib/supabase';
import type { Decimal, ISODate, UUID } from '../types';

export class DiagnosticsService {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * THE CANARY: Trust Integrity Check
   * Must pass before any report can be generated
   *
   * Trust Bank Balance = Owner Balances + Tenant Deposits + Outstanding Checks
   */
  async runTrustIntegrityCheck(): Promise<TrustIntegrityResult> {
    try {
      // Get Trust Bank Balance (from trust bank accounts)
      const trustBankBalance = await this.getTrustBankBalance();

      // Get sum of all owner balances
      const ownerBalances = await this.getOwnerBalances();

      // Get sum of all tenant security deposits
      const tenantDeposits = await this.getTenantDeposits();

      // Get outstanding checks (not yet cleared)
      const outstandingChecks = await this.getOutstandingChecks();

      // The Equation
      const expectedBalance =
        parseFloat(ownerBalances) +
        parseFloat(tenantDeposits) +
        parseFloat(outstandingChecks);

      const actualBalance = parseFloat(trustBankBalance);
      const variance = Math.abs(actualBalance - expectedBalance);

      // Allow for minor rounding (less than $0.01)
      const passed = variance < 0.01;

      const result: TrustIntegrityResult = {
        passed,
        timestamp: new Date().toISOString(),
        trustBankBalance,
        ownerBalances,
        tenantDeposits,
        outstandingChecks,
        expectedBalance: expectedBalance.toFixed(2),
        variance: variance.toFixed(2),
      };

      if (!passed) {
        console.error('[CANARY ALERT] Trust integrity check FAILED!', result);
        await this.logDiagnosticFailure('TRUST_INTEGRITY', result);
      }

      return result;
    } catch (error) {
      const result: TrustIntegrityResult = {
        passed: false,
        timestamp: new Date().toISOString(),
        trustBankBalance: '0.00',
        ownerBalances: '0.00',
        tenantDeposits: '0.00',
        outstandingChecks: '0.00',
        expectedBalance: '0.00',
        variance: '0.00',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      console.error('[CANARY ALERT] Trust integrity check ERROR!', result);
      return result;
    }
  }

  /**
   * Check Trial Balance (Debits = Credits)
   */
  async runTrialBalanceCheck(): Promise<TrialBalanceCheckResult> {
    const { data, error } = await supabase
      .from('account_balances')
      .select('balance')
      .eq('organization_id', this.organizationId);

    if (error) {
      return {
        passed: false,
        timestamp: new Date().toISOString(),
        totalDebits: '0.00',
        totalCredits: '0.00',
        variance: '0.00',
        error: error.message,
      };
    }

    let totalDebits = 0;
    let totalCredits = 0;

    for (const row of data || []) {
      const balance = parseFloat(row.balance);
      if (balance > 0) {
        totalDebits += balance;
      } else {
        totalCredits += Math.abs(balance);
      }
    }

    const variance = Math.abs(totalDebits - totalCredits);
    const passed = variance < 0.01;

    const result: TrialBalanceCheckResult = {
      passed,
      timestamp: new Date().toISOString(),
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      variance: variance.toFixed(2),
    };

    if (!passed) {
      console.error('[CANARY ALERT] Trial balance check FAILED!', result);
      await this.logDiagnosticFailure('TRIAL_BALANCE', result);
    }

    return result;
  }

  /**
   * Check for orphaned transactions (postings without valid entries)
   */
  async runOrphanedTransactionsCheck(): Promise<OrphanCheckResult> {
    // Check for postings without journal entries
    const { data: orphanedPostings, error } = await supabase
      .from('journal_postings')
      .select('id, journal_entry_id')
      .is('journal_entry_id', null);

    // Check for entries without postings (shouldn't exist)
    const { data: emptyEntries } = await supabase.rpc(
      'find_entries_without_postings',
      { p_org_id: this.organizationId }
    );

    const orphanedPostingCount = orphanedPostings?.length || 0;
    const emptyEntryCount = emptyEntries?.length || 0;
    const passed = orphanedPostingCount === 0 && emptyEntryCount === 0;

    const result: OrphanCheckResult = {
      passed,
      timestamp: new Date().toISOString(),
      orphanedPostingCount,
      emptyEntryCount,
      orphanedPostingIds: (orphanedPostings || []).map((p) => p.id),
      emptyEntryIds: (emptyEntries || []).map((e: { id: string }) => e.id),
    };

    if (!passed) {
      console.error('[CANARY ALERT] Orphaned transactions found!', result);
      await this.logDiagnosticFailure('ORPHANED_TRANSACTIONS', result);
    }

    return result;
  }

  /**
   * Verify account balance consistency
   * Compares account_balances with actual SUM of postings
   */
  async runBalanceConsistencyCheck(): Promise<BalanceConsistencyResult> {
    const inconsistentAccounts: Array<{
      accountId: UUID;
      recordedBalance: Decimal;
      calculatedBalance: Decimal;
      variance: Decimal;
    }> = [];

    // Get all recorded balances
    const { data: balances, error: balError } = await supabase
      .from('account_balances')
      .select('account_id, balance')
      .eq('organization_id', this.organizationId);

    if (balError) {
      return {
        passed: false,
        timestamp: new Date().toISOString(),
        accountsChecked: 0,
        inconsistentCount: 0,
        inconsistentAccounts: [],
        error: balError.message,
      };
    }

    // For each account, verify against actual postings
    for (const balance of balances || []) {
      const { data: sumData } = await supabase
        .from('journal_postings')
        .select('amount')
        .eq('account_id', balance.account_id);

      const calculatedBalance = (sumData || []).reduce(
        (sum, p) => sum + parseFloat(p.amount),
        0
      );

      const recordedBalance = parseFloat(balance.balance);
      const variance = Math.abs(recordedBalance - calculatedBalance);

      if (variance >= 0.01) {
        inconsistentAccounts.push({
          accountId: balance.account_id,
          recordedBalance: recordedBalance.toFixed(4),
          calculatedBalance: calculatedBalance.toFixed(4),
          variance: variance.toFixed(4),
        });
      }
    }

    const passed = inconsistentAccounts.length === 0;

    const result: BalanceConsistencyResult = {
      passed,
      timestamp: new Date().toISOString(),
      accountsChecked: balances?.length || 0,
      inconsistentCount: inconsistentAccounts.length,
      inconsistentAccounts,
    };

    if (!passed) {
      console.error('[CANARY ALERT] Balance inconsistency detected!', result);
      await this.logDiagnosticFailure('BALANCE_CONSISTENCY', result);
    }

    return result;
  }

  /**
   * Run all diagnostic checks
   */
  async runFullDiagnostics(): Promise<FullDiagnosticsResult> {
    const [trustIntegrity, trialBalance, orphanCheck, balanceConsistency] =
      await Promise.all([
        this.runTrustIntegrityCheck(),
        this.runTrialBalanceCheck(),
        this.runOrphanedTransactionsCheck(),
        this.runBalanceConsistencyCheck(),
      ]);

    const allPassed =
      trustIntegrity.passed &&
      trialBalance.passed &&
      orphanCheck.passed &&
      balanceConsistency.passed;

    return {
      passed: allPassed,
      timestamp: new Date().toISOString(),
      organizationId: this.organizationId,
      results: {
        trustIntegrity,
        trialBalance,
        orphanCheck,
        balanceConsistency,
      },
      summary: {
        totalChecks: 4,
        passedChecks: [
          trustIntegrity.passed,
          trialBalance.passed,
          orphanCheck.passed,
          balanceConsistency.passed,
        ].filter(Boolean).length,
        failedChecks: [
          !trustIntegrity.passed,
          !trialBalance.passed,
          !orphanCheck.passed,
          !balanceConsistency.passed,
        ].filter(Boolean).length,
      },
    };
  }

  // Private helper methods

  private async getTrustBankBalance(): Promise<Decimal> {
    // Get balance from trust bank accounts (subtype = 'trust_bank')
    const { data, error } = await supabase
      .from('account_balances')
      .select(`
        balance,
        chart_of_accounts!inner(account_subtype)
      `)
      .eq('organization_id', this.organizationId)
      .eq('chart_of_accounts.account_subtype', 'trust_bank');

    if (error || !data) {
      return '0.00';
    }

    const total = data.reduce((sum, row) => sum + parseFloat(row.balance), 0);
    return total.toFixed(2);
  }

  private async getOwnerBalances(): Promise<Decimal> {
    // Get sum of owner liability accounts
    const { data, error } = await supabase
      .from('dimensional_balances')
      .select('balance')
      .eq('organization_id', this.organizationId)
      .not('owner_id', 'is', null);

    if (error || !data) {
      return '0.00';
    }

    const total = data.reduce(
      (sum, row) => sum + Math.abs(parseFloat(row.balance)),
      0
    );
    return total.toFixed(2);
  }

  private async getTenantDeposits(): Promise<Decimal> {
    // Get sum of tenant security deposit accounts
    const { data, error } = await supabase
      .from('account_balances')
      .select(`
        balance,
        chart_of_accounts!inner(account_subtype)
      `)
      .eq('organization_id', this.organizationId)
      .eq('chart_of_accounts.account_subtype', 'security_deposit');

    if (error || !data) {
      return '0.00';
    }

    const total = data.reduce(
      (sum, row) => sum + Math.abs(parseFloat(row.balance)),
      0
    );
    return total.toFixed(2);
  }

  private async getOutstandingChecks(): Promise<Decimal> {
    // Get outstanding checks (not yet cleared)
    const { data, error } = await supabase
      .from('account_balances')
      .select(`
        balance,
        chart_of_accounts!inner(account_subtype)
      `)
      .eq('organization_id', this.organizationId)
      .eq('chart_of_accounts.account_subtype', 'outstanding_checks');

    if (error || !data) {
      return '0.00';
    }

    const total = data.reduce(
      (sum, row) => sum + Math.abs(parseFloat(row.balance)),
      0
    );
    return total.toFixed(2);
  }

  private async logDiagnosticFailure(
    checkType: string,
    result: unknown
  ): Promise<void> {
    // In production, this would:
    // 1. Insert into diagnostic_logs table
    // 2. Send alert to administrators
    // 3. Potentially trigger incident response
    console.error(`[DIAGNOSTIC FAILURE] ${checkType}`, {
      organizationId: this.organizationId,
      timestamp: new Date().toISOString(),
      result,
    });
  }
}

// Result Types
export interface TrustIntegrityResult {
  passed: boolean;
  timestamp: string;
  trustBankBalance: Decimal;
  ownerBalances: Decimal;
  tenantDeposits: Decimal;
  outstandingChecks: Decimal;
  expectedBalance: Decimal;
  variance: Decimal;
  error?: string;
}

export interface TrialBalanceCheckResult {
  passed: boolean;
  timestamp: string;
  totalDebits: Decimal;
  totalCredits: Decimal;
  variance: Decimal;
  error?: string;
}

export interface OrphanCheckResult {
  passed: boolean;
  timestamp: string;
  orphanedPostingCount: number;
  emptyEntryCount: number;
  orphanedPostingIds: number[];
  emptyEntryIds: UUID[];
}

export interface BalanceConsistencyResult {
  passed: boolean;
  timestamp: string;
  accountsChecked: number;
  inconsistentCount: number;
  inconsistentAccounts: Array<{
    accountId: UUID;
    recordedBalance: Decimal;
    calculatedBalance: Decimal;
    variance: Decimal;
  }>;
  error?: string;
}

export interface FullDiagnosticsResult {
  passed: boolean;
  timestamp: string;
  organizationId: UUID;
  results: {
    trustIntegrity: TrustIntegrityResult;
    trialBalance: TrialBalanceCheckResult;
    orphanCheck: OrphanCheckResult;
    balanceConsistency: BalanceConsistencyResult;
  };
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
  };
}

export function createDiagnosticsService(organizationId: string): DiagnosticsService {
  return new DiagnosticsService(organizationId);
}
