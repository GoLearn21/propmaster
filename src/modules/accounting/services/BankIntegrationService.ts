/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * BankIntegrationService - Bank Feed & Reconciliation
 *
 * TITANIUM RULES ENFORCED:
 * 1. Immutable Ledger - All reconciled transactions create journal entries
 * 2. Double-Entry Only - Bank entries always balanced
 * 3. Law as Data - Bank rules from database
 * 4. O(1) Reads - Balance verification from account_balances
 *
 * FEATURES:
 * - Plaid Integration for bank feeds
 * - Rules Engine for automatic categorization
 * - Fuzzy matching for statement reconciliation
 * - Outstanding check tracking
 * - Duplicate detection
 * - Multi-bank support (Trust & Operating)
 */

import { supabase } from '@/lib/supabase';
import type { Decimal, ISODate, UUID, JournalPostingInput } from '../types';
import { LedgerService, createLedgerService } from '../services/LedgerService';
import { EventService, createEventService } from '../events/EventService';

export class BankIntegrationService {
  private organizationId: string;
  private ledger: LedgerService;
  private events: EventService;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.ledger = createLedgerService(organizationId);
    this.events = createEventService(organizationId);
  }

  // ============================================================
  // PLAID INTEGRATION
  // ============================================================

  /**
   * Initialize Plaid link for a new bank account
   */
  async initializePlaidLink(accountType: 'trust' | 'operating'): Promise<{
    linkToken: string;
    expiration: string;
  }> {
    // In production, this would call Plaid API
    // For now, emit event for external handling
    await this.events.emit({
      eventType: 'plaid.link.init',
      payload: {
        organizationId: this.organizationId,
        accountType,
      },
    });

    // Return placeholder - actual implementation would call Plaid
    return {
      linkToken: `link-sandbox-${Date.now()}`,
      expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Exchange Plaid public token for access token
   */
  async exchangePlaidToken(
    publicToken: string,
    accountType: 'trust' | 'operating'
  ): Promise<{ success: boolean; accountId?: UUID }> {
    try {
      // In production, call Plaid to exchange token
      // Store access token securely
      const bankAccountId = crypto.randomUUID() as UUID;

      await supabase.from('organization_bank_accounts').insert({
        id: bankAccountId,
        organization_id: this.organizationId,
        account_type: accountType,
        plaid_access_token: `access-sandbox-${publicToken}`, // Encrypted in production
        plaid_item_id: `item-${Date.now()}`,
        status: 'active',
        last_sync: new Date().toISOString(),
      });

      await this.events.emit({
        eventType: 'bank.connected',
        payload: {
          organizationId: this.organizationId,
          accountType,
          bankAccountId,
        },
      });

      return { success: true, accountId: bankAccountId };
    } catch (error) {
      console.error('[BankIntegration] Failed to exchange Plaid token:', error);
      return { success: false };
    }
  }

  /**
   * Sync transactions from Plaid
   */
  async syncBankTransactions(bankAccountId: UUID): Promise<{
    newTransactions: number;
    matchedTransactions: number;
    pendingReview: number;
  }> {
    console.log(`[BankIntegration] Syncing transactions for account: ${bankAccountId}`);

    // Get bank account details
    const { data: bankAccount } = await supabase
      .from('organization_bank_accounts')
      .select('*')
      .eq('id', bankAccountId)
      .single();

    if (!bankAccount) {
      throw new BankIntegrationError('Bank account not found', 'ACCOUNT_NOT_FOUND');
    }

    // In production, call Plaid to get new transactions
    // For now, simulate with placeholder data
    const plaidTransactions = await this.fetchPlaidTransactions(bankAccount);

    let newTransactions = 0;
    let matchedTransactions = 0;
    let pendingReview = 0;

    for (const transaction of plaidTransactions) {
      // Check for duplicate
      const isDuplicate = await this.checkDuplicate(transaction);
      if (isDuplicate) {
        continue;
      }

      // Store raw transaction
      const { data: rawTxn } = await supabase
        .from('bank_transactions')
        .insert({
          id: crypto.randomUUID(),
          organization_id: this.organizationId,
          bank_account_id: bankAccountId,
          plaid_transaction_id: transaction.plaidId,
          transaction_date: transaction.date,
          amount: transaction.amount,
          description: transaction.description,
          merchant_name: transaction.merchantName,
          category: transaction.category,
          pending: transaction.pending,
          raw_data: transaction,
          status: 'unmatched',
        })
        .select()
        .single();

      newTransactions++;

      // Try to match using rules engine
      const matchResult = await this.matchTransaction(rawTxn);

      if (matchResult.matched) {
        matchedTransactions++;

        // Auto-create journal entry if confidence is high
        if (matchResult.confidence >= 0.95 && matchResult.journalEntryData) {
          await this.createMatchedEntry(rawTxn, matchResult);
        }
      } else {
        pendingReview++;
      }
    }

    // Update last sync time
    await supabase
      .from('organization_bank_accounts')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', bankAccountId);

    return { newTransactions, matchedTransactions, pendingReview };
  }

  // ============================================================
  // RULES ENGINE
  // ============================================================

  /**
   * Create a new matching rule
   */
  async createMatchingRule(rule: MatchingRuleInput): Promise<UUID> {
    const ruleId = crypto.randomUUID() as UUID;

    await supabase.from('bank_matching_rules').insert({
      id: ruleId,
      organization_id: this.organizationId,
      name: rule.name,
      description: rule.description,
      priority: rule.priority || 100,
      conditions: rule.conditions,
      actions: rule.actions,
      account_id: rule.accountId,
      property_id: rule.propertyId,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    console.log(`[BankIntegration] Created matching rule: ${rule.name}`);
    return ruleId;
  }

  /**
   * Get all active matching rules
   */
  async getMatchingRules(): Promise<MatchingRule[]> {
    const { data: rules } = await supabase
      .from('bank_matching_rules')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    return (rules || []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      priority: r.priority,
      conditions: r.conditions,
      actions: r.actions,
      accountId: r.account_id,
      propertyId: r.property_id,
      matchCount: r.match_count || 0,
      lastMatchedAt: r.last_matched_at,
    }));
  }

  /**
   * Match a transaction against all rules
   */
  async matchTransaction(transaction: BankTransaction): Promise<MatchResult> {
    const rules = await this.getMatchingRules();

    for (const rule of rules) {
      const matches = this.evaluateRule(transaction, rule);

      if (matches) {
        // Calculate confidence based on rule specificity
        const confidence = this.calculateConfidence(transaction, rule);

        // Update rule usage stats
        await supabase
          .from('bank_matching_rules')
          .update({
            match_count: (rule.matchCount || 0) + 1,
            last_matched_at: new Date().toISOString(),
          })
          .eq('id', rule.id);

        return {
          matched: true,
          ruleId: rule.id,
          ruleName: rule.name,
          confidence,
          journalEntryData: this.buildJournalEntryData(transaction, rule),
        };
      }
    }

    // No rule matched - try fuzzy matching against existing entries
    const fuzzyMatch = await this.fuzzyMatchExisting(transaction);
    if (fuzzyMatch) {
      return fuzzyMatch;
    }

    return { matched: false, confidence: 0 };
  }

  /**
   * Evaluate if a transaction matches a rule
   */
  private evaluateRule(transaction: BankTransaction, rule: MatchingRule): boolean {
    const conditions = rule.conditions as RuleCondition[];

    for (const condition of conditions) {
      const value = this.getTransactionField(transaction, condition.field);

      switch (condition.operator) {
        case 'equals':
          if (value !== condition.value) return false;
          break;
        case 'contains':
          if (!String(value).toLowerCase().includes(String(condition.value).toLowerCase())) {
            return false;
          }
          break;
        case 'starts_with':
          if (!String(value).toLowerCase().startsWith(String(condition.value).toLowerCase())) {
            return false;
          }
          break;
        case 'regex':
          try {
            const regex = new RegExp(condition.value as string, 'i');
            if (!regex.test(String(value))) return false;
          } catch {
            return false;
          }
          break;
        case 'greater_than':
          if (parseFloat(String(value)) <= parseFloat(String(condition.value))) return false;
          break;
        case 'less_than':
          if (parseFloat(String(value)) >= parseFloat(String(condition.value))) return false;
          break;
        case 'between':
          const [min, max] = condition.value as [number, number];
          const num = parseFloat(String(value));
          if (num < min || num > max) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Get field value from transaction
   */
  private getTransactionField(
    transaction: BankTransaction,
    field: string
  ): string | number | null {
    switch (field) {
      case 'description':
        return transaction.description;
      case 'merchant_name':
        return transaction.merchantName;
      case 'amount':
        return parseFloat(transaction.amount);
      case 'category':
        return transaction.category;
      case 'date':
        return transaction.date;
      default:
        return null;
    }
  }

  /**
   * Calculate match confidence
   */
  private calculateConfidence(
    transaction: BankTransaction,
    rule: MatchingRule
  ): number {
    let confidence = 0.7; // Base confidence for rule match

    // Increase confidence for more specific rules
    const conditions = rule.conditions as RuleCondition[];
    confidence += conditions.length * 0.05;

    // Increase confidence for exact matches
    for (const condition of conditions) {
      if (condition.operator === 'equals') {
        confidence += 0.1;
      }
    }

    // Increase confidence based on rule's track record
    if (rule.matchCount && rule.matchCount > 10) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Build journal entry data from rule actions
   */
  private buildJournalEntryData(
    transaction: BankTransaction,
    rule: MatchingRule
  ): JournalEntryMatchData | null {
    const actions = rule.actions as RuleAction[];

    const debitAction = actions.find((a) => a.type === 'debit');
    const creditAction = actions.find((a) => a.type === 'credit');

    if (!debitAction || !creditAction) {
      return null;
    }

    const amount = parseFloat(transaction.amount);
    const isDebit = amount > 0;

    return {
      entryDate: transaction.date,
      entryType: 'bank_transaction',
      description: transaction.description,
      postings: [
        {
          accountId: isDebit ? debitAction.accountId : creditAction.accountId,
          amount: Math.abs(amount).toFixed(4) as Decimal,
          propertyId: rule.propertyId,
          description: transaction.description,
        },
        {
          accountId: isDebit ? creditAction.accountId : debitAction.accountId,
          amount: (-Math.abs(amount)).toFixed(4) as Decimal,
          propertyId: rule.propertyId,
          description: transaction.description,
        },
      ],
    };
  }

  /**
   * Try fuzzy matching against existing entries
   */
  private async fuzzyMatchExisting(
    transaction: BankTransaction
  ): Promise<MatchResult | null> {
    const amount = parseFloat(transaction.amount);
    const date = new Date(transaction.date);

    // Look for entries within 5 days and same amount
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 5);

    const { data: entries } = await supabase
      .from('journal_entries')
      .select(`
        id,
        entry_date,
        description,
        journal_postings(amount, account_id)
      `)
      .eq('organization_id', this.organizationId)
      .gte('entry_date', startDate.toISOString().split('T')[0])
      .lte('entry_date', endDate.toISOString().split('T')[0]);

    for (const entry of entries || []) {
      // Check if any posting matches the amount
      const matchingPosting = entry.journal_postings?.find(
        (p: { amount: string }) => Math.abs(Math.abs(parseFloat(p.amount)) - Math.abs(amount)) < 0.01
      );

      if (matchingPosting) {
        // Calculate similarity score
        const descSimilarity = this.calculateStringSimilarity(
          transaction.description.toLowerCase(),
          entry.description.toLowerCase()
        );

        if (descSimilarity > 0.6) {
          return {
            matched: true,
            confidence: descSimilarity * 0.8, // Max 80% for fuzzy match
            existingEntryId: entry.id,
          };
        }
      }
    }

    return null;
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const matrix: number[][] = [];

    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLen = Math.max(str1.length, str2.length);
    return 1 - matrix[str1.length][str2.length] / maxLen;
  }

  /**
   * Create journal entry for matched transaction
   */
  private async createMatchedEntry(
    transaction: BankTransaction,
    matchResult: MatchResult
  ): Promise<void> {
    if (!matchResult.journalEntryData) return;

    const entry = await this.ledger.createJournalEntry({
      entryDate: matchResult.journalEntryData.entryDate,
      entryType: matchResult.journalEntryData.entryType,
      description: matchResult.journalEntryData.description,
      postings: matchResult.journalEntryData.postings,
      metadata: {
        bankTransactionId: transaction.id,
        matchedByRule: matchResult.ruleId,
        confidence: matchResult.confidence,
        autoMatched: true,
      },
    });

    // Update bank transaction status
    await supabase
      .from('bank_transactions')
      .update({
        status: 'matched',
        journal_entry_id: entry.id,
        matched_at: new Date().toISOString(),
        match_rule_id: matchResult.ruleId,
        match_confidence: matchResult.confidence,
      })
      .eq('id', transaction.id);
  }

  // ============================================================
  // RECONCILIATION
  // ============================================================

  /**
   * Start bank reconciliation
   */
  async startReconciliation(
    bankAccountId: UUID,
    statementDate: ISODate,
    statementBalance: Decimal
  ): Promise<ReconciliationSession> {
    const sessionId = crypto.randomUUID() as UUID;

    // Get unreconciled transactions
    const { data: unreconciled } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', bankAccountId)
      .in('status', ['unmatched', 'matched'])
      .lte('transaction_date', statementDate);

    // Get outstanding checks
    const { data: outstandingChecks } = await supabase
      .from('vendor_checks')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('status', 'printed')
      .lte('check_date', statementDate);

    // Calculate book balance
    const { data: bookBalance } = await supabase
      .from('account_balances')
      .select('balance')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', bankAccountId.includes('trust') ? 'trust_bank' : 'operating_bank')
      .single();

    const session: ReconciliationSession = {
      id: sessionId,
      bankAccountId,
      statementDate,
      statementBalance,
      bookBalance: bookBalance?.balance || '0.00',
      unreconciledTransactions: unreconciled || [],
      outstandingChecks: outstandingChecks || [],
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    };

    // Save session
    await supabase.from('reconciliation_sessions').insert({
      id: sessionId,
      organization_id: this.organizationId,
      bank_account_id: bankAccountId,
      statement_date: statementDate,
      statement_balance: statementBalance,
      book_balance: session.bookBalance,
      status: 'in_progress',
      started_at: session.startedAt,
    });

    return session;
  }

  /**
   * Complete bank reconciliation
   */
  async completeReconciliation(
    sessionId: UUID,
    adjustments: ReconciliationAdjustment[]
  ): Promise<{ success: boolean; variance: Decimal }> {
    // Get session
    const { data: session } = await supabase
      .from('reconciliation_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      throw new BankIntegrationError('Reconciliation session not found', 'SESSION_NOT_FOUND');
    }

    // Process adjustments
    for (const adjustment of adjustments) {
      if (adjustment.type === 'bank_fee' || adjustment.type === 'interest') {
        // Create journal entry for bank fee/interest
        await this.createBankAdjustmentEntry(session, adjustment);
      }

      if (adjustment.transactionId) {
        // Mark transaction as reconciled
        await supabase
          .from('bank_transactions')
          .update({
            status: 'reconciled',
            reconciled_at: new Date().toISOString(),
            reconciliation_session_id: sessionId,
          })
          .eq('id', adjustment.transactionId);
      }
    }

    // Calculate final variance
    const statementBal = parseFloat(session.statement_balance);
    const bookBal = parseFloat(session.book_balance);
    const adjustmentTotal = adjustments.reduce(
      (sum, a) => sum + parseFloat(a.amount || '0'),
      0
    );
    const variance = Math.abs(statementBal - (bookBal + adjustmentTotal));

    // Update session
    await supabase
      .from('reconciliation_sessions')
      .update({
        status: variance < 0.01 ? 'completed' : 'variance',
        completed_at: new Date().toISOString(),
        variance: variance.toFixed(2),
      })
      .eq('id', sessionId);

    if (variance < 0.01) {
      await this.events.emit({
        eventType: 'reconciliation.completed',
        payload: {
          sessionId,
          bankAccountId: session.bank_account_id,
          statementDate: session.statement_date,
        },
      });
    }

    return {
      success: variance < 0.01,
      variance: variance.toFixed(2) as Decimal,
    };
  }

  /**
   * Create adjustment entry for bank fees/interest
   */
  private async createBankAdjustmentEntry(
    session: { bank_account_id: UUID; statement_date: ISODate },
    adjustment: ReconciliationAdjustment
  ): Promise<void> {
    // Get accounts
    const { data: bankAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'trust_bank')
      .single();

    let expenseAccountSubtype = 'bank_fees';
    if (adjustment.type === 'interest') {
      expenseAccountSubtype = 'interest_income';
    }

    const { data: expenseAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', expenseAccountSubtype)
      .single();

    if (!bankAccount || !expenseAccount) return;

    const amount = parseFloat(adjustment.amount || '0');
    const isExpense = adjustment.type === 'bank_fee';

    const postings: JournalPostingInput[] = [
      {
        accountId: isExpense ? expenseAccount.id : bankAccount.id,
        amount: Math.abs(amount).toFixed(4) as Decimal,
        description: adjustment.description || `Bank ${adjustment.type}`,
      },
      {
        accountId: isExpense ? bankAccount.id : expenseAccount.id,
        amount: (-Math.abs(amount)).toFixed(4) as Decimal,
        description: adjustment.description || `Bank ${adjustment.type}`,
      },
    ];

    await this.ledger.createJournalEntry({
      entryDate: session.statement_date,
      entryType: 'bank_adjustment',
      description: adjustment.description || `Bank ${adjustment.type}`,
      postings,
      metadata: {
        adjustmentType: adjustment.type,
        reconciliationSession: session.bank_account_id,
      },
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Fetch transactions from Plaid (placeholder)
   */
  private async fetchPlaidTransactions(
    bankAccount: { plaid_access_token: string; last_sync: string }
  ): Promise<PlaidTransaction[]> {
    // In production, call Plaid API
    // This is a placeholder that returns empty array
    console.log('[BankIntegration] Fetching Plaid transactions...');
    return [];
  }

  /**
   * Check for duplicate transaction
   */
  private async checkDuplicate(transaction: PlaidTransaction): Promise<boolean> {
    const { data: existing } = await supabase
      .from('bank_transactions')
      .select('id')
      .eq('plaid_transaction_id', transaction.plaidId)
      .single();

    return !!existing;
  }
}

// ============================================================
// TYPES
// ============================================================

export interface BankTransaction {
  id: UUID;
  bankAccountId: UUID;
  plaidTransactionId?: string;
  date: ISODate;
  amount: Decimal;
  description: string;
  merchantName?: string;
  category?: string;
  pending: boolean;
  status: 'unmatched' | 'matched' | 'reconciled';
}

export interface PlaidTransaction {
  plaidId: string;
  date: ISODate;
  amount: string;
  description: string;
  merchantName?: string;
  category?: string;
  pending: boolean;
}

export interface MatchingRule {
  id: UUID;
  name: string;
  description?: string;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  accountId?: UUID;
  propertyId?: UUID;
  matchCount?: number;
  lastMatchedAt?: string;
}

export interface MatchingRuleInput {
  name: string;
  description?: string;
  priority?: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  accountId?: UUID;
  propertyId?: UUID;
}

export interface RuleCondition {
  field: 'description' | 'merchant_name' | 'amount' | 'category' | 'date';
  operator: 'equals' | 'contains' | 'starts_with' | 'regex' | 'greater_than' | 'less_than' | 'between';
  value: string | number | [number, number];
}

export interface RuleAction {
  type: 'debit' | 'credit';
  accountId: UUID;
}

export interface MatchResult {
  matched: boolean;
  confidence: number;
  ruleId?: UUID;
  ruleName?: string;
  existingEntryId?: UUID;
  journalEntryData?: JournalEntryMatchData;
}

export interface JournalEntryMatchData {
  entryDate: ISODate;
  entryType: string;
  description: string;
  postings: JournalPostingInput[];
}

export interface ReconciliationSession {
  id: UUID;
  bankAccountId: UUID;
  statementDate: ISODate;
  statementBalance: Decimal;
  bookBalance: Decimal;
  unreconciledTransactions: BankTransaction[];
  outstandingChecks: Array<{ check_number: string; amount: Decimal; check_date: ISODate }>;
  status: 'in_progress' | 'completed' | 'variance';
  startedAt: string;
  completedAt?: string;
}

export interface ReconciliationAdjustment {
  type: 'bank_fee' | 'interest' | 'check_cleared' | 'deposit_cleared' | 'other';
  transactionId?: UUID;
  amount?: Decimal;
  description?: string;
}

export class BankIntegrationError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'BankIntegrationError';
    this.code = code;
  }
}

export function createBankIntegrationService(
  organizationId: string
): BankIntegrationService {
  return new BankIntegrationService(organizationId);
}
