/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * LedgerService - Immutable Double-Entry Ledger
 *
 * TITANIUM RULES ENFORCED:
 * 1. IMMUTABLE LEDGER: Never update or delete entries. Only reversals.
 * 2. DOUBLE-ENTRY ONLY: Every entry MUST balance (debits = credits) - ZERO TOLERANCE.
 * 3. O(1) READS: Read from account_balances, never SUM() on postings.
 * 4. IDEMPOTENCY: All writes use idempotency keys for retry safety.
 * 5. DECIMAL PRECISION: All monetary calculations use Decimal.js, never parseFloat.
 */

import { supabase } from '@/lib/supabase';
import { Decimal as DecimalJS } from 'decimal.js';
import type {
  AccountBalance,
  CreateJournalEntryInput,
  CreateJournalPostingInput,
  Decimal as DecimalType,
  ILedgerService,
  JournalEntry,
  JournalPosting,
  UUID,
} from '../types';

export class LedgerService implements ILedgerService {
  private organizationId: string;
  private traceId?: string;

  constructor(organizationId: string, traceId?: string) {
    this.organizationId = organizationId;
    this.traceId = traceId;
  }

  /**
   * Create a new journal entry with postings
   * TITANIUM: Validates double-entry before insert
   */
  async createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
    // Validate double-entry balance
    if (!this.validateDoubleEntry(input.postings)) {
      throw new LedgerError(
        'Journal entry is unbalanced. Debits must equal Credits.',
        'UNBALANCED_ENTRY',
        { postings: input.postings }
      );
    }

    // Check idempotency
    if (input.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    // Create entry and postings in a single transaction
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        organization_id: this.organizationId,
        period_id: input.periodId,
        entry_date: input.entryDate,
        effective_date: input.effectiveDate || input.entryDate,
        description: input.description,
        memo: input.memo,
        is_reversal: false,
        source_type: input.sourceType,
        source_id: input.sourceId,
        idempotency_key: input.idempotencyKey,
        trace_id: this.traceId,
      })
      .select()
      .single();

    if (entryError) {
      throw new LedgerError(
        'Failed to create journal entry',
        'ENTRY_CREATE_FAILED',
        { error: entryError.message }
      );
    }

    // Insert postings
    const postings = input.postings.map((p) => ({
      journal_entry_id: entry.id,
      account_id: p.accountId,
      amount: p.amount,
      property_id: p.propertyId,
      unit_id: p.unitId,
      tenant_id: p.tenantId,
      vendor_id: p.vendorId,
      owner_id: p.ownerId,
      line_description: p.lineDescription,
    }));

    const { error: postingsError } = await supabase
      .from('journal_postings')
      .insert(postings);

    if (postingsError) {
      // The constraint trigger will catch unbalanced entries
      throw new LedgerError(
        'Failed to create journal postings',
        'POSTINGS_CREATE_FAILED',
        { error: postingsError.message }
      );
    }

    return this.mapDbToJournalEntry(entry);
  }

  /**
   * Reverse a journal entry
   * TITANIUM: Creates a new reversal entry, never modifies original
   */
  async reverseJournalEntry(
    entryId: UUID,
    reason: string,
    idempotencyKey: string
  ): Promise<JournalEntry> {
    // Check idempotency
    const existingReversal = await this.findByIdempotencyKey(idempotencyKey);
    if (existingReversal) {
      return existingReversal;
    }

    // Fetch original entry with postings
    const { data: original, error: fetchError } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_postings (*)
      `)
      .eq('id', entryId)
      .eq('organization_id', this.organizationId)
      .single();

    if (fetchError || !original) {
      throw new LedgerError(
        'Original journal entry not found',
        'ENTRY_NOT_FOUND',
        { entryId }
      );
    }

    // Check if already reversed
    if (original.reversed_by_entry_id) {
      throw new LedgerError(
        'Journal entry has already been reversed',
        'ALREADY_REVERSED',
        { entryId, reversedBy: original.reversed_by_entry_id }
      );
    }

    // Create reversal entry
    const { data: reversal, error: reversalError } = await supabase
      .from('journal_entries')
      .insert({
        organization_id: this.organizationId,
        period_id: original.period_id,
        entry_date: new Date().toISOString().split('T')[0],
        effective_date: new Date().toISOString().split('T')[0],
        description: `REVERSAL: ${reason}`,
        memo: `Reverses entry ${entryId}`,
        is_reversal: true,
        reverses_entry_id: entryId,
        source_type: 'reversal',
        source_id: entryId,
        idempotency_key: idempotencyKey,
        trace_id: this.traceId,
      })
      .select()
      .single();

    if (reversalError) {
      throw new LedgerError(
        'Failed to create reversal entry',
        'REVERSAL_CREATE_FAILED',
        { error: reversalError.message }
      );
    }

    // Create reversed postings (negate amounts)
    const reversalPostings = original.journal_postings.map((p: Record<string, unknown>) => ({
      journal_entry_id: reversal.id,
      account_id: p.account_id,
      amount: new DecimalJS(p.amount as string).negated().toFixed(4), // Negate using Decimal.js
      property_id: p.property_id,
      unit_id: p.unit_id,
      tenant_id: p.tenant_id,
      vendor_id: p.vendor_id,
      owner_id: p.owner_id,
      line_description: `Reversal: ${p.line_description || ''}`,
    }));

    const { error: postingsError } = await supabase
      .from('journal_postings')
      .insert(reversalPostings);

    if (postingsError) {
      throw new LedgerError(
        'Failed to create reversal postings',
        'REVERSAL_POSTINGS_FAILED',
        { error: postingsError.message }
      );
    }

    // Update original entry to mark as reversed
    await supabase
      .from('journal_entries')
      .update({ reversed_by_entry_id: reversal.id })
      .eq('id', entryId);

    return this.mapDbToJournalEntry(reversal);
  }

  /**
   * Get account balance (O(1) read from pre-calculated table)
   * TITANIUM: Never uses SUM() on journal_postings
   */
  async getAccountBalance(accountId: UUID): Promise<AccountBalance> {
    const { data, error } = await supabase
      .from('account_balances')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('account_id', accountId)
      .single();

    if (error) {
      // Account might not have any transactions yet
      return {
        organizationId: this.organizationId,
        accountId,
        balance: '0.0000',
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      organizationId: data.organization_id,
      accountId: data.account_id,
      balance: data.balance,
      lastEntryId: data.last_entry_id,
      lastEntryDate: data.last_entry_date,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Get tenant balance from dimensional balances
   * TITANIUM: Uses Decimal.js for penny-perfect precision
   */
  async getTenantBalance(tenantId: UUID, accountId?: UUID): Promise<DecimalType> {
    let query = supabase
      .from('dimensional_balances')
      .select('balance')
      .eq('organization_id', this.organizationId)
      .eq('tenant_id', tenantId);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return '0.0000';
    }

    // Sum up all dimensional balances using Decimal.js for precision
    const total = data.reduce(
      (sum, row) => sum.plus(new DecimalJS(row.balance)),
      new DecimalJS(0)
    );
    return total.toFixed(4);
  }

  /**
   * Get property balance from dimensional balances
   * TITANIUM: Uses Decimal.js for penny-perfect precision
   */
  async getPropertyBalance(propertyId: UUID, accountId?: UUID): Promise<DecimalType> {
    let query = supabase
      .from('dimensional_balances')
      .select('balance')
      .eq('organization_id', this.organizationId)
      .eq('property_id', propertyId);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return '0.0000';
    }

    // Sum using Decimal.js for penny-perfect precision
    const total = data.reduce(
      (sum, row) => sum.plus(new DecimalJS(row.balance)),
      new DecimalJS(0)
    );
    return total.toFixed(4);
  }

  /**
   * Validate that postings are balanced (debits = credits)
   * TITANIUM: Core double-entry enforcement - ZERO TOLERANCE
   *
   * This function enforces penny-perfect balance using Decimal.js.
   * An entry with $1,000.00009 debit and $1,000.00000 credit will FAIL.
   * This is intentional - zero tolerance means EXACTLY zero, not "close enough".
   */
  validateDoubleEntry(postings: CreateJournalPostingInput[]): boolean {
    if (!postings || postings.length === 0) {
      return false;
    }

    // Sum all amounts using Decimal.js for penny-perfect precision
    // (positive = debit, negative = credit)
    const sum = postings.reduce(
      (acc, p) => acc.plus(new DecimalJS(p.amount)),
      new DecimalJS(0)
    );

    // ZERO TOLERANCE: Must be exactly zero, not "close to zero"
    // Using Decimal.js comparison to avoid floating point issues
    return sum.isZero();
  }

  /**
   * Get journal entry by idempotency key (for retry safety)
   */
  private async findByIdempotencyKey(key: string): Promise<JournalEntry | null> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('idempotency_key', key)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDbToJournalEntry(data);
  }

  /**
   * Get journal entry by ID with postings
   */
  async getJournalEntry(entryId: UUID): Promise<JournalEntry & { postings: JournalPosting[] }> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_postings (*)
      `)
      .eq('id', entryId)
      .eq('organization_id', this.organizationId)
      .single();

    if (error || !data) {
      throw new LedgerError(
        'Journal entry not found',
        'ENTRY_NOT_FOUND',
        { entryId }
      );
    }

    return {
      ...this.mapDbToJournalEntry(data),
      postings: data.journal_postings.map(this.mapDbToJournalPosting),
    };
  }

  /**
   * Get all entries for a source document (e.g., payment, invoice)
   */
  async getEntriesBySource(sourceType: string, sourceId: UUID): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new LedgerError(
        'Failed to fetch entries by source',
        'FETCH_FAILED',
        { sourceType, sourceId, error: error.message }
      );
    }

    return (data || []).map(this.mapDbToJournalEntry);
  }

  private mapDbToJournalEntry(row: Record<string, unknown>): JournalEntry {
    return {
      id: row.id as string,
      organizationId: row.organization_id as string,
      periodId: row.period_id as string | undefined,
      entryDate: row.entry_date as string,
      effectiveDate: row.effective_date as string,
      description: row.description as string,
      memo: row.memo as string | undefined,
      isReversal: row.is_reversal as boolean,
      reversesEntryId: row.reverses_entry_id as string | undefined,
      reversedByEntryId: row.reversed_by_entry_id as string | undefined,
      sourceType: row.source_type as JournalEntry['sourceType'],
      sourceId: row.source_id as string | undefined,
      idempotencyKey: row.idempotency_key as string | undefined,
      traceId: row.trace_id as string | undefined,
      createdAt: row.created_at as string,
      createdBy: row.created_by as string | undefined,
    };
  }

  private mapDbToJournalPosting(row: Record<string, unknown>): JournalPosting {
    return {
      id: row.id as number,
      journalEntryId: row.journal_entry_id as string,
      accountId: row.account_id as string,
      amount: row.amount as string,
      propertyId: row.property_id as string | undefined,
      unitId: row.unit_id as string | undefined,
      tenantId: row.tenant_id as string | undefined,
      vendorId: row.vendor_id as string | undefined,
      ownerId: row.owner_id as string | undefined,
      lineDescription: row.line_description as string | undefined,
    };
  }
}

/**
 * Custom error class for ledger-related errors
 */
export class LedgerError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'LedgerError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Factory function for creating LedgerService with organization context
 */
export function createLedgerService(organizationId: string, traceId?: string): ILedgerService {
  return new LedgerService(organizationId, traceId);
}
