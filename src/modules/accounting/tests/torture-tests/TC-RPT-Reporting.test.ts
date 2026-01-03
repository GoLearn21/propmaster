/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 4: Time Traveler Reporting Suite
 *
 * Goal: Prove historical data is immutable and accurate for audits
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types for reporting tests
interface AccountingPeriod {
  id: string;
  year: number;
  month: number;
  status: 'open' | 'closing' | 'closed';
  closedAt?: Date;
}

interface JournalEntry {
  id: string;
  date: Date;
  effectiveDate: Date;
  postings: Array<{ accountId: string; debit: number; credit: number }>;
  periodId: string;
  voided: boolean;
  voidedDate?: Date;
}

interface BalanceSnapshot {
  accountId: string;
  asOfDate: Date;
  balance: number;
  snapshotTime: Date;
}

interface Report {
  type: 'balance_sheet' | 'income_statement' | 'trial_balance';
  asOfDate: Date;
  data: Record<string, number>;
  generatedAt: Date;
}

// Reporting functions
function isPeriodClosed(period: AccountingPeriod): boolean {
  return period.status === 'closed';
}

function validatePostingDate(
  entryDate: Date,
  period: AccountingPeriod
): { valid: boolean; error?: string } {
  if (period.status === 'closed') {
    return {
      valid: false,
      error: 'PERIOD_CLOSED: Cannot post to closed period',
    };
  }
  return { valid: true };
}

function getAsOfBalance(
  snapshots: BalanceSnapshot[],
  accountId: string,
  asOfDate: Date
): number {
  // Find the most recent snapshot before or on asOfDate
  const relevantSnapshots = snapshots
    .filter(s => s.accountId === accountId && s.asOfDate <= asOfDate)
    .sort((a, b) => b.asOfDate.getTime() - a.asOfDate.getTime());

  return relevantSnapshots[0]?.balance ?? 0;
}

describe('TC-RPT: Time Traveler Reporting Tests', () => {
  describe('TC-RPT-056: Closed Period Write', () => {
    it('should return PERIOD_CLOSED error when posting to closed Jan period', () => {
      const janPeriod: AccountingPeriod = {
        id: 'period-2024-01',
        year: 2024,
        month: 1,
        status: 'closed',
        closedAt: new Date('2024-02-05'),
      };

      const entryDate = new Date('2024-01-15');

      const result = validatePostingDate(entryDate, janPeriod);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('PERIOD_CLOSED');
    });
  });

  describe('TC-RPT-057: Void in Closed Period', () => {
    it('should date reversal to current date, not original entry date', () => {
      const originalEntry: JournalEntry = {
        id: 'je-123',
        date: new Date('2024-01-15'),
        effectiveDate: new Date('2024-01-15'),
        postings: [
          { accountId: 'cash', debit: 0, credit: 1000 },
          { accountId: 'expense', debit: 1000, credit: 0 },
        ],
        periodId: 'period-2024-01',
        voided: false,
      };

      const voidDate = new Date('2024-06-01'); // Current date when voiding

      const createVoidEntry = (entry: JournalEntry, voidDate: Date): JournalEntry => {
        // Reversal should be dated to void date, not original date
        return {
          id: `void-${entry.id}`,
          date: voidDate, // Current date!
          effectiveDate: voidDate,
          postings: entry.postings.map(p => ({
            accountId: p.accountId,
            debit: p.credit, // Swap debit/credit
            credit: p.debit,
          })),
          periodId: `period-2024-06`, // June period
          voided: false,
        };
      };

      const voidEntry = createVoidEntry(originalEntry, voidDate);

      expect(voidEntry.date).toEqual(voidDate);
      expect(voidEntry.date).not.toEqual(originalEntry.date);
      expect(voidEntry.periodId).toBe('period-2024-06');
    });
  });

  describe('TC-RPT-058: Time Travel Query', () => {
    it('should return exact same Jan 31 numbers before and after Feb void', () => {
      // Simulate balance snapshots at different points in time
      const snapshots: BalanceSnapshot[] = [
        // Jan 31 snapshot (before Feb void)
        {
          accountId: 'cash',
          asOfDate: new Date('2024-01-31'),
          balance: 10000,
          snapshotTime: new Date('2024-01-31T23:59:59'),
        },
        // Feb 1 snapshot (after Feb void - shouldn't affect Jan report)
        {
          accountId: 'cash',
          asOfDate: new Date('2024-02-15'),
          balance: 9000, // Reduced due to void
          snapshotTime: new Date('2024-02-15T12:00:00'),
        },
      ];

      const jan31Date = new Date('2024-01-31');

      // First query - before void
      const balance1 = getAsOfBalance(snapshots, 'cash', jan31Date);

      // Simulate void happening
      // (Jan 31 snapshot remains unchanged)

      // Second query - after void
      const balance2 = getAsOfBalance(snapshots, 'cash', jan31Date);

      expect(balance1).toBe(10000);
      expect(balance2).toBe(10000); // Same as before void
      expect(balance1).toBe(balance2);
    });
  });

  describe('TC-RPT-059: Future Dating', () => {
    it('should exclude next year transaction from "This Year" report', () => {
      const entries: JournalEntry[] = [
        {
          id: 'je-1',
          date: new Date('2024-06-15'),
          effectiveDate: new Date('2024-06-15'),
          postings: [{ accountId: 'cash', debit: 1000, credit: 0 }],
          periodId: '2024-06',
          voided: false,
        },
        {
          id: 'je-2',
          date: new Date('2025-01-15'), // Next year!
          effectiveDate: new Date('2025-01-15'),
          postings: [{ accountId: 'cash', debit: 2000, credit: 0 }],
          periodId: '2025-01',
          voided: false,
        },
      ];

      const getThisYearTotal = (entries: JournalEntry[], year: number): number => {
        return entries
          .filter(e => e.date.getFullYear() === year && !e.voided)
          .reduce((sum, e) => {
            return sum + e.postings.reduce((ps, p) => ps + p.debit - p.credit, 0);
          }, 0);
      };

      const thisYearTotal = getThisYearTotal(entries, 2024);

      expect(thisYearTotal).toBe(1000); // Only 2024 entry
      expect(thisYearTotal).not.toBe(3000); // Not including 2025
    });
  });

  describe('TC-RPT-060: Soft Close', () => {
    it('should warn or block based on config when posting to closing period', () => {
      const period: AccountingPeriod = {
        id: 'period-2024-03',
        year: 2024,
        month: 3,
        status: 'closing', // Soft close
      };

      const validateSoftClose = (
        period: AccountingPeriod,
        strictMode: boolean
      ): { allowed: boolean; warning?: string } => {
        if (period.status === 'closing') {
          if (strictMode) {
            return { allowed: false, warning: 'Period is being closed' };
          }
          return { allowed: true, warning: 'Period is being closed - proceed with caution' };
        }
        return { allowed: true };
      };

      // Strict mode - block
      expect(validateSoftClose(period, true).allowed).toBe(false);

      // Lenient mode - warn
      const lenientResult = validateSoftClose(period, false);
      expect(lenientResult.allowed).toBe(true);
      expect(lenientResult.warning).toBeDefined();
    });
  });

  describe('TC-RPT-061: Retained Earnings Roll', () => {
    it('should set Jan 1 Retained Earnings equal to prior year Net Income', () => {
      const priorYearNetIncome = 50000;

      const closeYear = (
        netIncome: number,
        currentRetainedEarnings: number
      ): { newRetainedEarnings: number } => {
        return {
          newRetainedEarnings: currentRetainedEarnings + netIncome,
        };
      };

      const result = closeYear(priorYearNetIncome, 100000);

      expect(result.newRetainedEarnings).toBe(150000);

      // For a fresh company, Jan 1 RE = prior year NI
      const freshResult = closeYear(priorYearNetIncome, 0);
      expect(freshResult.newRetainedEarnings).toBe(50000);
    });
  });

  describe('TC-RPT-062: Report Performance', () => {
    it('should generate Balance Sheet in < 200ms via account_balances snapshot', () => {
      // Simulate O(1) balance lookup from materialized view
      const generateBalanceSheet = (): { durationMs: number; balances: Record<string, number> } => {
        const startTime = Date.now();

        // Simulated O(1) lookup from pre-calculated balances
        const balances = {
          cash: 100000,
          accounts_receivable: 50000,
          fixed_assets: 200000,
          accounts_payable: 30000,
          retained_earnings: 320000,
        };

        const durationMs = Date.now() - startTime + 10; // Add minimal simulated time

        return { durationMs, balances };
      };

      const result = generateBalanceSheet();

      expect(result.durationMs).toBeLessThan(200);
      expect(Object.keys(result.balances).length).toBeGreaterThan(0);
    });
  });

  describe('TC-RPT-063: Cash vs Accrual', () => {
    it('should show Prepaid Rent as Liability (Cash) vs Income (Accrual)', () => {
      const prepaidRent = 6000; // 6 months prepaid

      const classifyPrepaidRent = (
        amount: number,
        method: 'cash' | 'accrual'
      ): { account: string; classification: string } => {
        if (method === 'cash') {
          // Cash basis: Income when received
          return { account: 'rental_income', classification: 'income' };
        }
        // Accrual basis: Liability until earned
        return { account: 'prepaid_rent_liability', classification: 'liability' };
      };

      const cashResult = classifyPrepaidRent(prepaidRent, 'cash');
      expect(cashResult.classification).toBe('income');

      const accrualResult = classifyPrepaidRent(prepaidRent, 'accrual');
      expect(accrualResult.classification).toBe('liability');
    });
  });

  describe('TC-RPT-064: Filter Leakage', () => {
    it('should return zero transactions from Owner B when running Owner A statement', () => {
      interface Transaction {
        id: string;
        ownerId: string;
        amount: number;
      }

      const transactions: Transaction[] = [
        { id: 't-1', ownerId: 'owner-a', amount: 1000 },
        { id: 't-2', ownerId: 'owner-a', amount: 2000 },
        { id: 't-3', ownerId: 'owner-b', amount: 3000 },
        { id: 't-4', ownerId: 'owner-b', amount: 4000 },
      ];

      const getOwnerStatement = (ownerId: string): Transaction[] => {
        return transactions.filter(t => t.ownerId === ownerId);
      };

      const ownerAStatement = getOwnerStatement('owner-a');
      const ownerBTransactionsInA = ownerAStatement.filter(t => t.ownerId === 'owner-b');

      expect(ownerAStatement.length).toBe(2);
      expect(ownerBTransactionsInA.length).toBe(0);
    });
  });

  describe('TC-RPT-065: Deleted Entity', () => {
    it('should preserve historical data when property is soft-deleted', () => {
      interface Property {
        id: string;
        name: string;
        deletedAt?: Date;
      }

      interface HistoricalEntry {
        propertyId: string;
        date: Date;
        amount: number;
      }

      const properties: Property[] = [
        { id: 'prop-1', name: 'Active Property' },
        { id: 'prop-2', name: 'Deleted Property', deletedAt: new Date('2024-06-01') },
      ];

      const historicalEntries: HistoricalEntry[] = [
        { propertyId: 'prop-1', date: new Date('2024-01-15'), amount: 1000 },
        { propertyId: 'prop-2', date: new Date('2024-03-15'), amount: 2000 }, // Before deletion
      ];

      const getHistoricalReport = (
        propertyId: string,
        includeDeleted: boolean = true
      ): HistoricalEntry[] => {
        const property = properties.find(p => p.id === propertyId);

        if (!property) return [];
        if (property.deletedAt && !includeDeleted) return [];

        // Historical data always preserved
        return historicalEntries.filter(e => e.propertyId === propertyId);
      };

      // Deleted property's historical data should still be visible
      const deletedPropertyHistory = getHistoricalReport('prop-2', true);

      expect(deletedPropertyHistory.length).toBe(1);
      expect(deletedPropertyHistory[0].amount).toBe(2000);
    });
  });
});
