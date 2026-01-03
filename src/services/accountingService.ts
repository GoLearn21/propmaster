/**
 * Accounting Service - Double-Entry Bookkeeping
 * Zero-tolerance for accounting errors
 *
 * Chart of Accounts Reference:
 * - 1050: Accounts Receivable - Rent (Asset, Debit normal)
 * - 4100: Late Fees (Revenue, Credit normal)
 * - 4000: Rental Income (Revenue, Credit normal)
 */

import { supabase } from '../lib/supabase';

// Account codes from chart_of_accounts
const ACCOUNTS = {
  ACCOUNTS_RECEIVABLE: '1050',
  LATE_FEE_INCOME: '4100',
  RENTAL_INCOME: '4000',
  OTHER_INCOME: '4900',
  OPERATING_CASH: '1000',
};

interface JournalEntryInput {
  entryDate: Date;
  description: string;
  referenceType: 'late_fee' | 'rent_charge' | 'payment' | 'adjustment' | 'other';
  referenceId?: string;
  propertyId?: string;
  lines: JournalEntryLineInput[];
}

interface JournalEntryLineInput {
  accountCode: string;
  description?: string;
  debitAmount?: number;
  creditAmount?: number;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
}

interface LateFeeInput {
  tenantId: string;
  tenantName: string;
  leaseId?: string;
  propertyId?: string;
  unitId?: string;
  amount: number;
  daysLate: number;
  state: 'NC' | 'SC' | 'GA';
  feeCalculation: string;
  dueDate: string;
}

interface LateFeeResult {
  success: boolean;
  journalEntryId?: string;
  entryNumber?: string;
  error?: string;
}

export class AccountingService {
  /**
   * Get account ID from chart_of_accounts by code
   */
  static async getAccountId(accountCode: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('account_code', accountCode)
      .single();

    if (error) {
      console.error('[Accounting] Failed to get account:', accountCode, error);
      return null;
    }

    return data?.id || null;
  }

  /**
   * Generate unique entry number
   */
  static async generateEntryNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `JE-${year}-`;

    // Get the latest entry number for this year
    const { data } = await supabase
      .from('journal_entries')
      .select('entry_number')
      .like('entry_number', `${prefix}%`)
      .order('entry_number', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].entry_number.replace(prefix, ''), 10);
      return `${prefix}${String(lastNumber + 1).padStart(4, '0')}`;
    }

    return `${prefix}0001`;
  }

  /**
   * Create a journal entry with double-entry validation
   * Debits must equal Credits
   */
  static async createJournalEntry(input: JournalEntryInput): Promise<{
    success: boolean;
    journalEntryId?: string;
    entryNumber?: string;
    error?: string;
  }> {
    // Validate debits = credits
    const totalDebits = input.lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredits = input.lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      console.error('[Accounting] Debits/Credits mismatch:', { totalDebits, totalCredits });
      return {
        success: false,
        error: `Debits ($${totalDebits.toFixed(2)}) must equal Credits ($${totalCredits.toFixed(2)})`,
      };
    }

    try {
      const entryNumber = await this.generateEntryNumber();

      // Create journal entry header
      const { data: journalEntry, error: headerError } = await supabase
        .from('journal_entries')
        .insert({
          entry_number: entryNumber,
          entry_date: input.entryDate.toISOString().split('T')[0],
          description: input.description,
          reference_type: input.referenceType,
          reference_id: input.referenceId,
          property_id: input.propertyId,
          status: 'posted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (headerError) {
        console.error('[Accounting] Failed to create journal entry:', headerError);
        return { success: false, error: headerError.message };
      }

      // Create journal entry lines
      const lines = [];
      for (let i = 0; i < input.lines.length; i++) {
        const line = input.lines[i];
        const accountId = await this.getAccountId(line.accountCode);

        if (!accountId) {
          // Rollback - delete the journal entry header
          await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
          return {
            success: false,
            error: `Account not found: ${line.accountCode}`,
          };
        }

        lines.push({
          journal_entry_id: journalEntry.id,
          account_id: accountId,
          line_number: i + 1,
          description: line.description,
          debit_amount: line.debitAmount || 0,
          credit_amount: line.creditAmount || 0,
          property_id: line.propertyId,
          unit_id: line.unitId,
          tenant_id: line.tenantId,
          created_at: new Date().toISOString(),
        });
      }

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) {
        console.error('[Accounting] Failed to create journal entry lines:', linesError);
        // Rollback - delete the journal entry header
        await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
        return { success: false, error: linesError.message };
      }

      console.log('[Accounting] Journal entry created:', entryNumber, journalEntry.id);
      return {
        success: true,
        journalEntryId: journalEntry.id,
        entryNumber,
      };
    } catch (error) {
      console.error('[Accounting] Exception creating journal entry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Post a late fee with proper double-entry accounting
   * Debit: Accounts Receivable (increases what tenant owes)
   * Credit: Late Fee Income (recognizes revenue)
   */
  static async postLateFee(input: LateFeeInput): Promise<LateFeeResult> {
    console.log('[Accounting] Posting late fee:', input.tenantName, input.amount);

    const description = `Late Fee - ${input.tenantName} - ${input.daysLate} days late (${input.state} compliant: ${input.feeCalculation})`;

    const result = await this.createJournalEntry({
      entryDate: new Date(),
      description,
      referenceType: 'late_fee',
      referenceId: input.leaseId,
      propertyId: input.propertyId,
      lines: [
        {
          // Debit A/R - tenant owes more
          accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE,
          description: `Late fee charge - Due: ${input.dueDate}`,
          debitAmount: input.amount,
          propertyId: input.propertyId,
          unitId: input.unitId,
          tenantId: input.tenantId,
        },
        {
          // Credit Late Fee Income - revenue recognized
          accountCode: ACCOUNTS.LATE_FEE_INCOME,
          description: `Late fee income - ${input.state} compliant`,
          creditAmount: input.amount,
          propertyId: input.propertyId,
        },
      ],
    });

    if (result.success) {
      // Also insert into a late_fees tracking table if it exists
      try {
        await supabase.from('late_fees').insert({
          tenant_id: input.tenantId,
          lease_id: input.leaseId,
          property_id: input.propertyId,
          amount: input.amount,
          days_late: input.daysLate,
          state_compliance: input.state,
          fee_calculation: input.feeCalculation,
          due_date: input.dueDate,
          journal_entry_id: result.journalEntryId,
          status: 'posted',
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        // late_fees table might not exist, that's ok
        console.log('[Accounting] late_fees table insert skipped (may not exist)');
      }
    }

    return result;
  }

  /**
   * Get tenant's current balance from journal entry lines
   */
  static async getTenantBalance(tenantId: string): Promise<number> {
    const { data, error } = await supabase
      .from('journal_entry_lines')
      .select('debit_amount, credit_amount')
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('[Accounting] Failed to get tenant balance:', error);
      return 0;
    }

    // For A/R (asset account), debit increases balance, credit decreases
    const balance = (data || []).reduce((sum, line) => {
      return sum + (line.debit_amount || 0) - (line.credit_amount || 0);
    }, 0);

    return balance;
  }

  /**
   * Get recent journal entries for a tenant
   */
  static async getTenantLedger(tenantId: string, limit = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('journal_entry_lines')
      .select(`
        id,
        description,
        debit_amount,
        credit_amount,
        created_at,
        journal_entry:journal_entries(
          id,
          entry_number,
          entry_date,
          description,
          reference_type,
          status
        ),
        account:chart_of_accounts(
          account_code,
          account_name
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Accounting] Failed to get tenant ledger:', error);
      return [];
    }

    return data || [];
  }
}

export default AccountingService;
