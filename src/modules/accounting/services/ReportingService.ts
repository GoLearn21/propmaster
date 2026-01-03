/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * ReportingService - Financial Reports Engine
 *
 * TITANIUM RULE: O(1) Reporting
 * All reports read from pre-calculated balances, never SUM() on postings.
 *
 * Reports:
 * - Balance Sheet (Assets = Liabilities + Equity)
 * - Income Statement (Revenue - Expenses = Net Income)
 * - Trial Balance (Debits = Credits)
 * - Cash Flow Statement
 * - Owner Statements
 * - Property P&L
 */

import { supabase } from '@/lib/supabase';
import type { AccountType, Decimal, ISODate, UUID } from '../types';
import { TimeTravelService, TrialBalanceEntry } from './TimeTravelService';
import { DiagnosticsService } from './DiagnosticsService';

export class ReportingService {
  private organizationId: string;
  private timeTravel: TimeTravelService;
  private diagnostics: DiagnosticsService;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.timeTravel = new TimeTravelService(organizationId);
    this.diagnostics = new DiagnosticsService(organizationId);
  }

  /**
   * Generate Balance Sheet as of a specific date
   * Assets = Liabilities + Equity
   */
  async generateBalanceSheet(asOfDate: ISODate): Promise<BalanceSheet> {
    // Run diagnostics first (The Canary)
    const diagnosticsResult = await this.diagnostics.runTrustIntegrityCheck();
    if (!diagnosticsResult.passed) {
      throw new ReportingError(
        'Trust integrity check failed. Cannot generate Balance Sheet.',
        'DIAGNOSTICS_FAILED',
        diagnosticsResult
      );
    }

    // Get trial balance
    const trialBalance = await this.timeTravel.getTrialBalanceAsOf(asOfDate);

    // Get account details grouped by type
    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type, account_subtype')
      .eq('organization_id', this.organizationId)
      .in('account_type', ['asset', 'liability', 'equity'])
      .order('account_code');

    if (error) {
      throw new ReportingError(
        'Failed to fetch accounts',
        'FETCH_FAILED',
        { error: error.message }
      );
    }

    // Build balance map from trial balance
    const balanceMap = new Map<UUID, Decimal>();
    for (const entry of trialBalance) {
      const balance =
        parseFloat(entry.debit) > 0
          ? entry.debit
          : (-parseFloat(entry.credit)).toFixed(4);
      balanceMap.set(entry.accountId, balance);
    }

    // Categorize accounts
    const assets: BalanceSheetLine[] = [];
    const liabilities: BalanceSheetLine[] = [];
    const equity: BalanceSheetLine[] = [];

    for (const account of accounts || []) {
      const balance = balanceMap.get(account.id) || '0.0000';
      const line: BalanceSheetLine = {
        accountId: account.id,
        accountCode: account.account_code,
        accountName: account.account_name,
        accountSubtype: account.account_subtype,
        balance,
      };

      switch (account.account_type) {
        case 'asset':
          assets.push(line);
          break;
        case 'liability':
          liabilities.push(line);
          break;
        case 'equity':
          equity.push(line);
          break;
      }
    }

    // Calculate totals
    const totalAssets = assets.reduce(
      (sum, a) => sum + parseFloat(a.balance),
      0
    );
    const totalLiabilities = liabilities.reduce(
      (sum, l) => sum + Math.abs(parseFloat(l.balance)),
      0
    );
    const totalEquity = equity.reduce(
      (sum, e) => sum + Math.abs(parseFloat(e.balance)),
      0
    );

    // Verify accounting equation
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    return {
      asOfDate,
      generatedAt: new Date().toISOString(),
      organizationId: this.organizationId,
      assets,
      liabilities,
      equity,
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      totalEquity: totalEquity.toFixed(2),
      isBalanced,
      diagnosticsPassed: diagnosticsResult.passed,
    };
  }

  /**
   * Generate Income Statement for a date range
   * Revenue - Expenses = Net Income
   */
  async generateIncomeStatement(
    startDate: ISODate,
    endDate: ISODate
  ): Promise<IncomeStatement> {
    // Get account activity for income/expense accounts
    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type, account_subtype')
      .eq('organization_id', this.organizationId)
      .in('account_type', ['revenue', 'expense'])
      .order('account_code');

    if (error) {
      throw new ReportingError(
        'Failed to fetch accounts',
        'FETCH_FAILED',
        { error: error.message }
      );
    }

    const revenue: IncomeStatementLine[] = [];
    const expenses: IncomeStatementLine[] = [];

    for (const account of accounts || []) {
      const activity = await this.timeTravel.getAccountActivity(
        account.id,
        startDate,
        endDate
      );

      const line: IncomeStatementLine = {
        accountId: account.id,
        accountCode: account.account_code,
        accountName: account.account_name,
        accountSubtype: account.account_subtype,
        amount: activity.netChange,
      };

      if (account.account_type === 'revenue') {
        revenue.push(line);
      } else {
        expenses.push(line);
      }
    }

    // Calculate totals (revenue is credit/negative, expenses are debit/positive)
    const totalRevenue = revenue.reduce(
      (sum, r) => sum + Math.abs(parseFloat(r.amount)),
      0
    );
    const totalExpenses = expenses.reduce(
      (sum, e) => sum + parseFloat(e.amount),
      0
    );
    const netIncome = totalRevenue - totalExpenses;

    return {
      startDate,
      endDate,
      generatedAt: new Date().toISOString(),
      organizationId: this.organizationId,
      revenue,
      expenses,
      totalRevenue: totalRevenue.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netIncome: netIncome.toFixed(2),
      profitMargin:
        totalRevenue > 0
          ? ((netIncome / totalRevenue) * 100).toFixed(2)
          : '0.00',
    };
  }

  /**
   * Generate Trial Balance
   */
  async generateTrialBalance(asOfDate: ISODate): Promise<TrialBalanceReport> {
    const entries = await this.timeTravel.getTrialBalanceAsOf(asOfDate);

    const totalDebits = entries.reduce(
      (sum, e) => sum + parseFloat(e.debit),
      0
    );
    const totalCredits = entries.reduce(
      (sum, e) => sum + parseFloat(e.credit),
      0
    );

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    return {
      asOfDate,
      generatedAt: new Date().toISOString(),
      organizationId: this.organizationId,
      entries,
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      isBalanced,
      variance: Math.abs(totalDebits - totalCredits).toFixed(2),
    };
  }

  /**
   * Generate Property P&L Report
   */
  async generatePropertyPnL(
    propertyId: UUID,
    startDate: ISODate,
    endDate: ISODate
  ): Promise<PropertyPnL> {
    // Get income for property
    const { data: incomePostings, error: incomeError } = await supabase
      .from('journal_postings')
      .select(`
        amount,
        account:chart_of_accounts!inner(account_name, account_type),
        journal_entries!inner(entry_date)
      `)
      .eq('property_id', propertyId)
      .eq('chart_of_accounts.account_type', 'revenue')
      .gte('journal_entries.entry_date', startDate)
      .lte('journal_entries.entry_date', endDate);

    // Get expenses for property
    const { data: expensePostings, error: expenseError } = await supabase
      .from('journal_postings')
      .select(`
        amount,
        account:chart_of_accounts!inner(account_name, account_type),
        journal_entries!inner(entry_date)
      `)
      .eq('property_id', propertyId)
      .eq('chart_of_accounts.account_type', 'expense')
      .gte('journal_entries.entry_date', startDate)
      .lte('journal_entries.entry_date', endDate);

    if (incomeError || expenseError) {
      throw new ReportingError(
        'Failed to fetch property transactions',
        'FETCH_FAILED',
        { incomeError, expenseError }
      );
    }

    // Aggregate by account
    const incomeByAccount = this.aggregateByAccount(incomePostings || []);
    const expensesByAccount = this.aggregateByAccount(expensePostings || []);

    const totalIncome = Object.values(incomeByAccount).reduce(
      (sum, amt) => sum + Math.abs(amt),
      0
    );
    const totalExpenses = Object.values(expensesByAccount).reduce(
      (sum, amt) => sum + amt,
      0
    );
    const netOperatingIncome = totalIncome - totalExpenses;

    return {
      propertyId,
      startDate,
      endDate,
      generatedAt: new Date().toISOString(),
      income: Object.entries(incomeByAccount).map(([name, amount]) => ({
        accountName: name,
        amount: Math.abs(amount).toFixed(2),
      })),
      expenses: Object.entries(expensesByAccount).map(([name, amount]) => ({
        accountName: name,
        amount: amount.toFixed(2),
      })),
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netOperatingIncome: netOperatingIncome.toFixed(2),
    };
  }

  /**
   * Generate Owner Statement
   */
  async generateOwnerStatement(
    ownerId: UUID,
    startDate: ISODate,
    endDate: ISODate
  ): Promise<OwnerStatement> {
    // Get owner's properties
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('owner_id', ownerId);

    if (propError) {
      throw new ReportingError(
        'Failed to fetch owner properties',
        'FETCH_FAILED',
        { error: propError.message }
      );
    }

    const propertyStatements: PropertyPnL[] = [];
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const property of properties || []) {
      const pnl = await this.generatePropertyPnL(
        property.id,
        startDate,
        endDate
      );
      propertyStatements.push(pnl);
      totalIncome += parseFloat(pnl.totalIncome);
      totalExpenses += parseFloat(pnl.totalExpenses);
    }

    const netIncome = totalIncome - totalExpenses;

    // Get owner distributions in period
    const { data: distributions } = await supabase
      .from('journal_postings')
      .select(`
        amount,
        journal_entries!inner(entry_date, description)
      `)
      .eq('owner_id', ownerId)
      .gte('journal_entries.entry_date', startDate)
      .lte('journal_entries.entry_date', endDate);

    const totalDistributions = (distributions || []).reduce(
      (sum, d) => sum + Math.abs(parseFloat(d.amount)),
      0
    );

    return {
      ownerId,
      startDate,
      endDate,
      generatedAt: new Date().toISOString(),
      propertyCount: properties?.length || 0,
      properties: propertyStatements,
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netIncome: netIncome.toFixed(2),
      distributions: totalDistributions.toFixed(2),
      endingBalance: (netIncome - totalDistributions).toFixed(2),
    };
  }

  private aggregateByAccount(
    postings: Array<{ amount: string; account: { account_name: string } }>
  ): Record<string, number> {
    const result: Record<string, number> = {};

    for (const posting of postings) {
      const name = posting.account.account_name;
      result[name] = (result[name] || 0) + parseFloat(posting.amount);
    }

    return result;
  }
}

// Report Types
export interface BalanceSheetLine {
  accountId: UUID;
  accountCode: string;
  accountName: string;
  accountSubtype?: string;
  balance: Decimal;
}

export interface BalanceSheet {
  asOfDate: ISODate;
  generatedAt: string;
  organizationId: UUID;
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  totalAssets: Decimal;
  totalLiabilities: Decimal;
  totalEquity: Decimal;
  isBalanced: boolean;
  diagnosticsPassed: boolean;
}

export interface IncomeStatementLine {
  accountId: UUID;
  accountCode: string;
  accountName: string;
  accountSubtype?: string;
  amount: Decimal;
}

export interface IncomeStatement {
  startDate: ISODate;
  endDate: ISODate;
  generatedAt: string;
  organizationId: UUID;
  revenue: IncomeStatementLine[];
  expenses: IncomeStatementLine[];
  totalRevenue: Decimal;
  totalExpenses: Decimal;
  netIncome: Decimal;
  profitMargin: string;
}

export interface TrialBalanceReport {
  asOfDate: ISODate;
  generatedAt: string;
  organizationId: UUID;
  entries: TrialBalanceEntry[];
  totalDebits: Decimal;
  totalCredits: Decimal;
  isBalanced: boolean;
  variance: Decimal;
}

export interface PropertyPnL {
  propertyId: UUID;
  startDate: ISODate;
  endDate: ISODate;
  generatedAt: string;
  income: Array<{ accountName: string; amount: Decimal }>;
  expenses: Array<{ accountName: string; amount: Decimal }>;
  totalIncome: Decimal;
  totalExpenses: Decimal;
  netOperatingIncome: Decimal;
}

export interface OwnerStatement {
  ownerId: UUID;
  startDate: ISODate;
  endDate: ISODate;
  generatedAt: string;
  propertyCount: number;
  properties: PropertyPnL[];
  totalIncome: Decimal;
  totalExpenses: Decimal;
  netIncome: Decimal;
  distributions: Decimal;
  endingBalance: Decimal;
}

export class ReportingError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ReportingError';
    this.code = code;
    this.details = details;
  }
}

export function createReportingService(organizationId: string): ReportingService {
  return new ReportingService(organizationId);
}
