/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * TimeTravelService - Historical Balance Engine
 *
 * TITANIUM RULE: O(1) Historical Reads
 *
 * Legacy systems run SUM() from the beginning of time. We do NOT.
 *
 * The Algorithm:
 * Balance(Historical) = Balance(Current) - SUM(Transactions from TargetDate to Now)
 *
 * 1. ANCHOR: Read account_balances (Current Balance) → O(1)
 * 2. REWIND: Query journal_postings ONLY from TargetDate to Now
 * 3. SUBTRACT: Reverse the effect of those postings
 *
 * This gives us historical balances without scanning the entire history.
 */

import { supabase } from '@/lib/supabase';
import type { AccountBalance, Decimal, ISODate, UUID } from '../types';
import { LedgerService } from './LedgerService';

export class TimeTravelService {
  private organizationId: string;
  private ledger: LedgerService;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.ledger = new LedgerService(organizationId);
  }

  /**
   * Get account balance as of a specific date
   * Uses the O(1) Time Travel algorithm
   */
  async getBalanceAsOf(accountId: UUID, asOfDate: ISODate): Promise<Decimal> {
    // Step 1: ANCHOR - Get current balance (O(1) from account_balances)
    const currentBalance = await this.ledger.getAccountBalance(accountId);
    const current = parseFloat(currentBalance.balance);

    // If requesting today or future, just return current
    const today = new Date().toISOString().split('T')[0];
    if (asOfDate >= today) {
      return currentBalance.balance;
    }

    // Step 2: REWIND - Get sum of postings from asOfDate+1 to now
    // These are the transactions we need to "undo" to get historical balance
    const delta = await this.getPostingsDelta(accountId, asOfDate, today);

    // Step 3: SUBTRACT - Remove the delta to get historical balance
    const historicalBalance = current - delta;

    return historicalBalance.toFixed(4);
  }

  /**
   * Get tenant balance as of a specific date
   */
  async getTenantBalanceAsOf(
    tenantId: UUID,
    asOfDate: ISODate,
    accountId?: UUID
  ): Promise<Decimal> {
    // Get current tenant balance
    const currentBalance = await this.ledger.getTenantBalance(tenantId, accountId);
    const current = parseFloat(currentBalance);

    const today = new Date().toISOString().split('T')[0];
    if (asOfDate >= today) {
      return currentBalance;
    }

    // Get delta for tenant postings
    const delta = await this.getDimensionalDelta(
      asOfDate,
      today,
      { tenantId, accountId }
    );

    return (current - delta).toFixed(4);
  }

  /**
   * Get property balance as of a specific date
   */
  async getPropertyBalanceAsOf(
    propertyId: UUID,
    asOfDate: ISODate,
    accountId?: UUID
  ): Promise<Decimal> {
    const currentBalance = await this.ledger.getPropertyBalance(propertyId, accountId);
    const current = parseFloat(currentBalance);

    const today = new Date().toISOString().split('T')[0];
    if (asOfDate >= today) {
      return currentBalance;
    }

    const delta = await this.getDimensionalDelta(
      asOfDate,
      today,
      { propertyId, accountId }
    );

    return (current - delta).toFixed(4);
  }

  /**
   * Get all account balances as of a specific date
   * Returns a map of accountId -> balance
   */
  async getAllBalancesAsOf(asOfDate: ISODate): Promise<Map<UUID, Decimal>> {
    const balances = new Map<UUID, Decimal>();

    // Get all current balances
    const { data: currentBalances, error } = await supabase
      .from('account_balances')
      .select('account_id, balance')
      .eq('organization_id', this.organizationId);

    if (error || !currentBalances) {
      return balances;
    }

    const today = new Date().toISOString().split('T')[0];

    // If requesting today or future, return current balances
    if (asOfDate >= today) {
      for (const row of currentBalances) {
        balances.set(row.account_id, row.balance);
      }
      return balances;
    }

    // Get all deltas since asOfDate
    const deltas = await this.getAllAccountDeltas(asOfDate, today);

    // Calculate historical balances
    for (const row of currentBalances) {
      const current = parseFloat(row.balance);
      const delta = deltas.get(row.account_id) || 0;
      balances.set(row.account_id, (current - delta).toFixed(4));
    }

    return balances;
  }

  /**
   * Get trial balance as of a specific date
   */
  async getTrialBalanceAsOf(asOfDate: ISODate): Promise<TrialBalanceEntry[]> {
    // Get all accounts with their historical balances
    const balances = await this.getAllBalancesAsOf(asOfDate);

    // Get account details
    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type, normal_balance')
      .eq('organization_id', this.organizationId)
      .order('account_code');

    if (error || !accounts) {
      return [];
    }

    const trialBalance: TrialBalanceEntry[] = [];

    for (const account of accounts) {
      const balance = parseFloat(balances.get(account.id) || '0');

      if (Math.abs(balance) >= 0.01) {
        trialBalance.push({
          accountId: account.id,
          accountCode: account.account_code,
          accountName: account.account_name,
          accountType: account.account_type,
          debit: balance > 0 ? balance.toFixed(4) : '0.0000',
          credit: balance < 0 ? Math.abs(balance).toFixed(4) : '0.0000',
        });
      }
    }

    return trialBalance;
  }

  /**
   * Compare balances between two dates
   */
  async compareBalances(
    accountId: UUID,
    startDate: ISODate,
    endDate: ISODate
  ): Promise<BalanceComparison> {
    const startBalance = await this.getBalanceAsOf(accountId, startDate);
    const endBalance = await this.getBalanceAsOf(accountId, endDate);

    const change = parseFloat(endBalance) - parseFloat(startBalance);

    return {
      accountId,
      startDate,
      endDate,
      startBalance,
      endBalance,
      change: change.toFixed(4),
      changePercent:
        parseFloat(startBalance) !== 0
          ? ((change / parseFloat(startBalance)) * 100).toFixed(2)
          : 'N/A',
    };
  }

  /**
   * Get account activity between two dates
   */
  async getAccountActivity(
    accountId: UUID,
    startDate: ISODate,
    endDate: ISODate
  ): Promise<AccountActivity> {
    const openingBalance = await this.getBalanceAsOf(accountId, startDate);

    // Get postings in date range
    const { data: postings, error } = await supabase
      .from('journal_postings')
      .select(`
        amount,
        line_description,
        journal_entries!inner(entry_date, description)
      `)
      .eq('account_id', accountId)
      .gte('journal_entries.entry_date', startDate)
      .lte('journal_entries.entry_date', endDate)
      .order('journal_entries(entry_date)', { ascending: true });

    if (error) {
      throw new TimeTravelError(
        'Failed to get account activity',
        'ACTIVITY_FETCH_FAILED',
        { accountId, error: error.message }
      );
    }

    const transactions = (postings || []).map((p) => ({
      date: (p.journal_entries as { entry_date: string }).entry_date,
      description: (p.journal_entries as { description: string }).description,
      lineDescription: p.line_description,
      amount: p.amount,
    }));

    const totalDebits = transactions
      .filter((t) => parseFloat(t.amount) > 0)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalCredits = transactions
      .filter((t) => parseFloat(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

    const closingBalance = (
      parseFloat(openingBalance) +
      totalDebits -
      totalCredits
    ).toFixed(4);

    return {
      accountId,
      startDate,
      endDate,
      openingBalance,
      closingBalance,
      totalDebits: totalDebits.toFixed(4),
      totalCredits: totalCredits.toFixed(4),
      netChange: (totalDebits - totalCredits).toFixed(4),
      transactionCount: transactions.length,
      transactions,
    };
  }

  // Private helper methods

  /**
   * Get sum of postings for an account between two dates
   */
  private async getPostingsDelta(
    accountId: UUID,
    fromDate: ISODate,
    toDate: ISODate
  ): Promise<number> {
    const { data, error } = await supabase
      .from('journal_postings')
      .select(`
        amount,
        journal_entries!inner(entry_date, organization_id)
      `)
      .eq('account_id', accountId)
      .eq('journal_entries.organization_id', this.organizationId)
      .gt('journal_entries.entry_date', fromDate)
      .lte('journal_entries.entry_date', toDate);

    if (error || !data) {
      return 0;
    }

    return data.reduce((sum, row) => sum + parseFloat(row.amount), 0);
  }

  /**
   * Get dimensional delta (for tenant/property balances)
   */
  private async getDimensionalDelta(
    fromDate: ISODate,
    toDate: ISODate,
    filters: { tenantId?: UUID; propertyId?: UUID; accountId?: UUID }
  ): Promise<number> {
    let query = supabase
      .from('journal_postings')
      .select(`
        amount,
        journal_entries!inner(entry_date, organization_id)
      `)
      .eq('journal_entries.organization_id', this.organizationId)
      .gt('journal_entries.entry_date', fromDate)
      .lte('journal_entries.entry_date', toDate);

    if (filters.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
    }
    if (filters.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }
    if (filters.accountId) {
      query = query.eq('account_id', filters.accountId);
    }

    const { data, error } = await query;

    if (error || !data) {
      return 0;
    }

    return data.reduce((sum, row) => sum + parseFloat(row.amount), 0);
  }

  /**
   * Get all account deltas in a date range
   */
  private async getAllAccountDeltas(
    fromDate: ISODate,
    toDate: ISODate
  ): Promise<Map<UUID, number>> {
    const deltas = new Map<UUID, number>();

    const { data, error } = await supabase
      .from('journal_postings')
      .select(`
        account_id,
        amount,
        journal_entries!inner(entry_date, organization_id)
      `)
      .eq('journal_entries.organization_id', this.organizationId)
      .gt('journal_entries.entry_date', fromDate)
      .lte('journal_entries.entry_date', toDate);

    if (error || !data) {
      return deltas;
    }

    for (const row of data) {
      const current = deltas.get(row.account_id) || 0;
      deltas.set(row.account_id, current + parseFloat(row.amount));
    }

    return deltas;
  }
}

// Types
export interface TrialBalanceEntry {
  accountId: UUID;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: Decimal;
  credit: Decimal;
}

export interface BalanceComparison {
  accountId: UUID;
  startDate: ISODate;
  endDate: ISODate;
  startBalance: Decimal;
  endBalance: Decimal;
  change: Decimal;
  changePercent: string;
}

export interface AccountActivity {
  accountId: UUID;
  startDate: ISODate;
  endDate: ISODate;
  openingBalance: Decimal;
  closingBalance: Decimal;
  totalDebits: Decimal;
  totalCredits: Decimal;
  netChange: Decimal;
  transactionCount: number;
  transactions: Array<{
    date: ISODate;
    description: string;
    lineDescription?: string;
    amount: Decimal;
  }>;
}

export class TimeTravelError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'TimeTravelError';
    this.code = code;
    this.details = details;
  }
}

export function createTimeTravelService(organizationId: string): TimeTravelService {
  return new TimeTravelService(organizationId);
}
