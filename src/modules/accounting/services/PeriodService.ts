/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * PeriodService - Accounting Period Management
 *
 * TITANIUM RULES:
 * - Entries can only be posted to OPEN periods
 * - Once closed, periods are IMMUTABLE
 * - Closing a period triggers the Month-End Close saga
 */

import { supabase } from '@/lib/supabase';
import type { AccountingPeriod, ISODate, UUID } from '../types';

export class PeriodService {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * Ensure the period for a given date is open
   * MUST be called before creating any journal entry
   */
  async ensureOpen(entryDate: ISODate): Promise<AccountingPeriod> {
    const period = await this.getPeriodForDate(entryDate);

    if (!period) {
      throw new PeriodError(
        `No accounting period found for date ${entryDate}`,
        'PERIOD_NOT_FOUND',
        { entryDate }
      );
    }

    if (period.isClosed) {
      throw new PeriodError(
        `Accounting period ${period.periodName} is closed. Cannot post entries.`,
        'PERIOD_CLOSED',
        { periodId: period.id, periodName: period.periodName, closedAt: period.closedAt }
      );
    }

    return period;
  }

  /**
   * Get the accounting period that contains a given date
   */
  async getPeriodForDate(date: ISODate): Promise<AccountingPeriod | null> {
    const { data, error } = await supabase
      .from('accounting_periods')
      .select('*')
      .eq('organization_id', this.organizationId)
      .lte('start_date', date)
      .gte('end_date', date)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDbToPeriod(data);
  }

  /**
   * Get period by ID
   */
  async getPeriod(periodId: UUID): Promise<AccountingPeriod> {
    const { data, error } = await supabase
      .from('accounting_periods')
      .select('*')
      .eq('id', periodId)
      .eq('organization_id', this.organizationId)
      .single();

    if (error || !data) {
      throw new PeriodError(
        'Accounting period not found',
        'PERIOD_NOT_FOUND',
        { periodId }
      );
    }

    return this.mapDbToPeriod(data);
  }

  /**
   * Get all periods for the organization
   */
  async getAllPeriods(): Promise<AccountingPeriod[]> {
    const { data, error } = await supabase
      .from('accounting_periods')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('start_date', { ascending: false });

    if (error) {
      throw new PeriodError(
        'Failed to fetch accounting periods',
        'FETCH_FAILED',
        { error: error.message }
      );
    }

    return (data || []).map(this.mapDbToPeriod);
  }

  /**
   * Get the current open period
   */
  async getCurrentOpenPeriod(): Promise<AccountingPeriod | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.getPeriodForDate(today);
  }

  /**
   * Create a new accounting period
   */
  async createPeriod(input: CreatePeriodInput): Promise<AccountingPeriod> {
    // Check for overlapping periods
    const { data: overlapping } = await supabase
      .from('accounting_periods')
      .select('id')
      .eq('organization_id', this.organizationId)
      .or(`and(start_date.lte.${input.endDate},end_date.gte.${input.startDate})`)
      .limit(1);

    if (overlapping && overlapping.length > 0) {
      throw new PeriodError(
        'Period dates overlap with existing period',
        'PERIOD_OVERLAP',
        { startDate: input.startDate, endDate: input.endDate }
      );
    }

    const { data, error } = await supabase
      .from('accounting_periods')
      .insert({
        organization_id: this.organizationId,
        period_name: input.periodName,
        start_date: input.startDate,
        end_date: input.endDate,
        is_closed: false,
      })
      .select()
      .single();

    if (error) {
      throw new PeriodError(
        'Failed to create accounting period',
        'CREATE_FAILED',
        { error: error.message }
      );
    }

    return this.mapDbToPeriod(data);
  }

  /**
   * Lock (close) an accounting period
   * This is typically called by the PeriodCloseSaga after validation
   */
  async closePeriod(periodId: UUID, closedBy?: UUID): Promise<AccountingPeriod> {
    const period = await this.getPeriod(periodId);

    if (period.isClosed) {
      throw new PeriodError(
        'Period is already closed',
        'ALREADY_CLOSED',
        { periodId }
      );
    }

    const { data, error } = await supabase
      .from('accounting_periods')
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_by: closedBy,
      })
      .eq('id', periodId)
      .eq('organization_id', this.organizationId)
      .select()
      .single();

    if (error) {
      throw new PeriodError(
        'Failed to close accounting period',
        'CLOSE_FAILED',
        { error: error.message }
      );
    }

    return this.mapDbToPeriod(data);
  }

  /**
   * Reopen a closed period (admin only, requires audit trail)
   * This is a rare operation that should be logged and require approval
   */
  async reopenPeriod(periodId: UUID, reason: string, reopenedBy: UUID): Promise<AccountingPeriod> {
    const period = await this.getPeriod(periodId);

    if (!period.isClosed) {
      throw new PeriodError(
        'Period is not closed',
        'NOT_CLOSED',
        { periodId }
      );
    }

    // Log the reopen action for audit
    console.warn(`[AUDIT] Period ${periodId} reopened by ${reopenedBy}. Reason: ${reason}`);

    const { data, error } = await supabase
      .from('accounting_periods')
      .update({
        is_closed: false,
        closed_at: null,
        closed_by: null,
      })
      .eq('id', periodId)
      .eq('organization_id', this.organizationId)
      .select()
      .single();

    if (error) {
      throw new PeriodError(
        'Failed to reopen accounting period',
        'REOPEN_FAILED',
        { error: error.message }
      );
    }

    return this.mapDbToPeriod(data);
  }

  /**
   * Check if a date falls within a closed period
   */
  async isDateInClosedPeriod(date: ISODate): Promise<boolean> {
    const period = await this.getPeriodForDate(date);
    return period ? period.isClosed : false;
  }

  /**
   * Get the reversal date based on period status
   * If original period is closed, use today's date
   * If original period is open, use the original entry date
   */
  async getReversalDate(originalEntryDate: ISODate): Promise<ISODate> {
    const isClosed = await this.isDateInClosedPeriod(originalEntryDate);

    if (isClosed) {
      // Period is closed - reversal must be dated today
      return new Date().toISOString().split('T')[0];
    }

    // Period is open - reversal can use original date
    return originalEntryDate;
  }

  /**
   * Generate default period name
   */
  static generatePeriodName(startDate: ISODate): string {
    const date = new Date(startDate);
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    return `${month} ${year}`;
  }

  /**
   * Auto-generate monthly periods for a year
   */
  async generateYearlyPeriods(year: number): Promise<AccountingPeriod[]> {
    const periods: AccountingPeriod[] = [];

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Last day of month

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      try {
        const period = await this.createPeriod({
          periodName: PeriodService.generatePeriodName(startStr),
          startDate: startStr,
          endDate: endStr,
        });
        periods.push(period);
      } catch (error) {
        // Skip if period already exists
        if ((error as PeriodError).code !== 'PERIOD_OVERLAP') {
          throw error;
        }
      }
    }

    return periods;
  }

  private mapDbToPeriod(row: Record<string, unknown>): AccountingPeriod {
    return {
      id: row.id as string,
      organizationId: row.organization_id as string,
      periodName: row.period_name as string,
      startDate: row.start_date as string,
      endDate: row.end_date as string,
      isClosed: row.is_closed as boolean,
      closedAt: row.closed_at as string | undefined,
      closedBy: row.closed_by as string | undefined,
    };
  }
}

export interface CreatePeriodInput {
  periodName: string;
  startDate: ISODate;
  endDate: ISODate;
}

export class PeriodError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'PeriodError';
    this.code = code;
    this.details = details;
  }
}

export function createPeriodService(organizationId: string): PeriodService {
  return new PeriodService(organizationId);
}
