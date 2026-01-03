/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * CorrectionService - Void & Reclass Workflows
 *
 * TITANIUM RULE: We NEVER update journal_entries.
 * All corrections are done via:
 * 1. VOID: Create reversal entry (negate original postings)
 * 2. RECLASS: 4-legged entry to move amounts between properties/accounts
 *
 * Period-Aware Corrections:
 * - If period is OPEN: Reversal uses same date
 * - If period is CLOSED: Reversal uses TODAY's date
 */

import { supabase } from '@/lib/supabase';
import type {
  CreateJournalEntryInput,
  CreateJournalPostingInput,
  Decimal,
  ISODate,
  JournalEntry,
  JournalPosting,
  UUID,
} from '../types';
import { LedgerService, LedgerError } from './LedgerService';
import { PeriodService } from './PeriodService';

export class CorrectionService {
  private organizationId: string;
  private ledger: LedgerService;
  private periods: PeriodService;
  private traceId?: string;

  constructor(organizationId: string, traceId?: string) {
    this.organizationId = organizationId;
    this.ledger = new LedgerService(organizationId, traceId);
    this.periods = new PeriodService(organizationId);
    this.traceId = traceId;
  }

  /**
   * VOID an existing journal entry
   * Creates a reversal entry that negates all postings
   *
   * Period Logic:
   * - Original period OPEN: Reversal dated same as original
   * - Original period CLOSED: Reversal dated TODAY
   */
  async voidEntry(input: VoidEntryInput): Promise<JournalEntry> {
    // Fetch original entry with postings
    const original = await this.ledger.getJournalEntry(input.entryId);

    // Check if already reversed
    if (original.reversedByEntryId) {
      throw new CorrectionError(
        'Entry has already been voided',
        'ALREADY_VOIDED',
        { entryId: input.entryId, voidedBy: original.reversedByEntryId }
      );
    }

    // Determine reversal date based on period status
    const reversalDate = await this.periods.getReversalDate(original.entryDate);

    // Create reversal entry
    const reversal = await this.ledger.reverseJournalEntry(
      input.entryId,
      input.reason,
      input.idempotencyKey
    );

    return reversal;
  }

  /**
   * RECLASS: Move an expense/amount from one property to another
   *
   * This is a 4-legged entry to maintain Trust Integrity:
   * 1. CR Expense (Source Property) - Remove expense from source
   * 2. DR Trust Cash (Source Property) - Refund cash to source
   * 3. DR Expense (Target Property) - Add expense to target
   * 4. CR Trust Cash (Target Property) - Charge cash to target
   *
   * The result: Amount moves from PropertyA to PropertyB while
   * maintaining proper trust accounting.
   */
  async reclassifyExpense(input: ReclassExpenseInput): Promise<JournalEntry> {
    const amount = parseFloat(input.amount);

    // Create the 4-legged reclass entry
    const postings: CreateJournalPostingInput[] = [
      // Leg 1: Credit Expense on Source Property (remove expense)
      {
        accountId: input.expenseAccountId,
        amount: (-amount).toFixed(4), // Credit (negative)
        propertyId: input.sourcePropertyId,
        lineDescription: `Reclass OUT: ${input.description}`,
      },
      // Leg 2: Debit Trust Cash on Source Property (refund)
      {
        accountId: input.trustCashAccountId,
        amount: amount.toFixed(4), // Debit (positive)
        propertyId: input.sourcePropertyId,
        lineDescription: `Reclass refund from expense`,
      },
      // Leg 3: Debit Expense on Target Property (add expense)
      {
        accountId: input.expenseAccountId,
        amount: amount.toFixed(4), // Debit (positive)
        propertyId: input.targetPropertyId,
        lineDescription: `Reclass IN: ${input.description}`,
      },
      // Leg 4: Credit Trust Cash on Target Property (charge)
      {
        accountId: input.trustCashAccountId,
        amount: (-amount).toFixed(4), // Credit (negative)
        propertyId: input.targetPropertyId,
        lineDescription: `Reclass charge for expense`,
      },
    ];

    const entry = await this.ledger.createJournalEntry({
      entryDate: input.effectiveDate || new Date().toISOString().split('T')[0],
      description: `RECLASS: ${input.description}`,
      memo: `Reclassified from Property ${input.sourcePropertyId} to ${input.targetPropertyId}`,
      sourceType: 'adjustment',
      sourceId: input.originalEntryId,
      idempotencyKey: input.idempotencyKey,
      postings,
    });

    return entry;
  }

  /**
   * RECLASSIFY between accounts (not properties)
   * Used when an expense was coded to wrong account
   *
   * 2-legged entry:
   * 1. CR Original Account (remove from wrong account)
   * 2. DR Correct Account (add to correct account)
   */
  async reclassifyAccount(input: ReclassAccountInput): Promise<JournalEntry> {
    const amount = parseFloat(input.amount);

    const postings: CreateJournalPostingInput[] = [
      // Remove from original account
      {
        accountId: input.originalAccountId,
        amount: (-amount).toFixed(4), // Credit
        propertyId: input.propertyId,
        tenantId: input.tenantId,
        vendorId: input.vendorId,
        lineDescription: `Reclass OUT: ${input.description}`,
      },
      // Add to correct account
      {
        accountId: input.correctAccountId,
        amount: amount.toFixed(4), // Debit
        propertyId: input.propertyId,
        tenantId: input.tenantId,
        vendorId: input.vendorId,
        lineDescription: `Reclass IN: ${input.description}`,
      },
    ];

    const entry = await this.ledger.createJournalEntry({
      entryDate: input.effectiveDate || new Date().toISOString().split('T')[0],
      description: `RECLASS: ${input.description}`,
      memo: `Account reclassification from ${input.originalAccountId} to ${input.correctAccountId}`,
      sourceType: 'adjustment',
      sourceId: input.originalEntryId,
      idempotencyKey: input.idempotencyKey,
      postings,
    });

    return entry;
  }

  /**
   * WRITE OFF: Write off an uncollectible receivable
   * Moves amount from A/R to Bad Debt Expense
   */
  async writeOffReceivable(input: WriteOffInput): Promise<JournalEntry> {
    const amount = parseFloat(input.amount);

    const postings: CreateJournalPostingInput[] = [
      // Debit Bad Debt Expense
      {
        accountId: input.badDebtExpenseAccountId,
        amount: amount.toFixed(4),
        propertyId: input.propertyId,
        tenantId: input.tenantId,
        lineDescription: `Write-off: ${input.description}`,
      },
      // Credit Accounts Receivable
      {
        accountId: input.receivableAccountId,
        amount: (-amount).toFixed(4),
        propertyId: input.propertyId,
        tenantId: input.tenantId,
        lineDescription: `Write-off A/R: ${input.description}`,
      },
    ];

    const entry = await this.ledger.createJournalEntry({
      entryDate: input.effectiveDate || new Date().toISOString().split('T')[0],
      description: `WRITE-OFF: ${input.description}`,
      memo: `Uncollectible receivable write-off for tenant ${input.tenantId}`,
      sourceType: 'adjustment',
      idempotencyKey: input.idempotencyKey,
      postings,
    });

    return entry;
  }

  /**
   * ADJUST: General purpose adjustment entry
   * For manual corrections that don't fit void/reclass patterns
   */
  async createAdjustment(input: AdjustmentInput): Promise<JournalEntry> {
    // Validate balance
    const sum = input.postings.reduce(
      (acc, p) => acc + parseFloat(p.amount),
      0
    );

    if (Math.abs(sum) >= 0.0001) {
      throw new CorrectionError(
        'Adjustment entry is unbalanced',
        'UNBALANCED_ADJUSTMENT',
        { sum, postings: input.postings }
      );
    }

    const entry = await this.ledger.createJournalEntry({
      entryDate: input.effectiveDate || new Date().toISOString().split('T')[0],
      description: `ADJUSTMENT: ${input.description}`,
      memo: input.memo,
      sourceType: 'adjustment',
      idempotencyKey: input.idempotencyKey,
      postings: input.postings,
    });

    return entry;
  }

  /**
   * VOID and REPLACE: Void an entry and create a corrected version
   * Useful when the original entry had wrong amounts
   */
  async voidAndReplace(input: VoidAndReplaceInput): Promise<VoidAndReplaceResult> {
    // First void the original
    const voidEntry = await this.voidEntry({
      entryId: input.originalEntryId,
      reason: input.voidReason,
      idempotencyKey: `${input.idempotencyKey}-void`,
    });

    // Then create the corrected entry
    const correctedEntry = await this.ledger.createJournalEntry({
      ...input.correctedEntry,
      idempotencyKey: `${input.idempotencyKey}-corrected`,
      sourceType: input.correctedEntry.sourceType || 'adjustment',
    });

    return {
      voidEntry,
      correctedEntry,
    };
  }
}

// Input types
export interface VoidEntryInput {
  entryId: UUID;
  reason: string;
  idempotencyKey: string;
}

export interface ReclassExpenseInput {
  originalEntryId?: UUID;
  sourcePropertyId: UUID;
  targetPropertyId: UUID;
  expenseAccountId: UUID;
  trustCashAccountId: UUID;
  amount: Decimal;
  description: string;
  effectiveDate?: ISODate;
  idempotencyKey: string;
}

export interface ReclassAccountInput {
  originalEntryId?: UUID;
  originalAccountId: UUID;
  correctAccountId: UUID;
  propertyId?: UUID;
  tenantId?: UUID;
  vendorId?: UUID;
  amount: Decimal;
  description: string;
  effectiveDate?: ISODate;
  idempotencyKey: string;
}

export interface WriteOffInput {
  receivableAccountId: UUID;
  badDebtExpenseAccountId: UUID;
  propertyId: UUID;
  tenantId: UUID;
  amount: Decimal;
  description: string;
  effectiveDate?: ISODate;
  idempotencyKey: string;
}

export interface AdjustmentInput {
  description: string;
  memo?: string;
  effectiveDate?: ISODate;
  idempotencyKey: string;
  postings: CreateJournalPostingInput[];
}

export interface VoidAndReplaceInput {
  originalEntryId: UUID;
  voidReason: string;
  idempotencyKey: string;
  correctedEntry: Omit<CreateJournalEntryInput, 'idempotencyKey'>;
}

export interface VoidAndReplaceResult {
  voidEntry: JournalEntry;
  correctedEntry: JournalEntry;
}

export class CorrectionError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'CorrectionError';
    this.code = code;
    this.details = details;
  }
}

export function createCorrectionService(
  organizationId: string,
  traceId?: string
): CorrectionService {
  return new CorrectionService(organizationId, traceId);
}
