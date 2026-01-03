/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 14: Collections & Bad Debt
 *
 * Goal: Proper bad debt write-off, collection agency handoff, judgment tracking
 * Critical for: Accurate financials, legal compliance, recovery tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Aging bucket definitions
type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+' | 'written_off';

interface ARAgingEntry {
  tenantId: string;
  chargeId: string;
  originalAmount: number;
  balance: number;
  dueDate: Date;
  bucket: AgingBucket;
}

interface CollectionAction {
  tenantId: string;
  actionType: 'reminder' | 'demand_letter' | 'final_notice' | 'collection_agency' | 'legal_action';
  date: Date;
  notes: string;
  cost?: number;
}

interface BadDebtWriteOff {
  tenantId: string;
  amount: number;
  writeOffDate: Date;
  reason: 'uncollectible' | 'bankruptcy' | 'statute_expired' | 'settled';
  approvedBy: string;
  recoverable: boolean;
}

interface JudgmentRecord {
  caseNumber: string;
  tenantId: string;
  principalAmount: number;
  interestAmount: number;
  courtCosts: number;
  attorneyFees: number;
  judgmentDate: Date;
  expirationDate: Date;
  renewalRequired: boolean;
  paymentsReceived: number;
}

// AR Aging Engine
class ARAgingEngine {
  calculateAging(entries: ARAgingEntry[], asOfDate: Date): {
    buckets: Record<AgingBucket, number>;
    totalAR: number;
    avgDaysOutstanding: number;
  } {
    const buckets: Record<AgingBucket, number> = {
      'current': 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
      'written_off': 0,
    };

    let totalDays = 0;
    let activeEntries = 0;

    for (const entry of entries) {
      if (entry.bucket === 'written_off') {
        buckets['written_off'] += entry.balance;
        continue;
      }

      const daysPastDue = Math.floor(
        (asOfDate.getTime() - entry.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      let bucket: AgingBucket;
      if (daysPastDue <= 0) {
        bucket = 'current';
      } else if (daysPastDue <= 30) {
        bucket = '1-30';
      } else if (daysPastDue <= 60) {
        bucket = '31-60';
      } else if (daysPastDue <= 90) {
        bucket = '61-90';
      } else {
        bucket = '90+';
      }

      buckets[bucket] += entry.balance;
      totalDays += Math.max(0, daysPastDue);
      activeEntries++;
    }

    const totalAR = Object.entries(buckets)
      .filter(([key]) => key !== 'written_off')
      .reduce((sum, [_, value]) => sum + value, 0);

    return {
      buckets,
      totalAR,
      avgDaysOutstanding: activeEntries > 0 ? Math.round(totalDays / activeEntries) : 0,
    };
  }
}

// Bad Debt Manager
class BadDebtManager {
  processWriteOff(writeOff: BadDebtWriteOff): {
    journalEntries: Array<{ account: string; debit: number; credit: number }>;
    taxDeductible: boolean;
  } {
    const entries = [
      { account: 'bad_debt_expense', debit: writeOff.amount, credit: 0 },
      { account: 'accounts_receivable', debit: 0, credit: writeOff.amount },
    ];

    // If using allowance method, adjust allowance instead
    const allowanceEntries = [
      { account: 'allowance_doubtful_accounts', debit: writeOff.amount, credit: 0 },
      { account: 'accounts_receivable', debit: 0, credit: writeOff.amount },
    ];

    // Determine tax deductibility
    const taxDeductible = writeOff.reason !== 'settled' &&
      writeOff.reason !== 'statute_expired';

    return {
      journalEntries: entries,
      taxDeductible,
    };
  }

  processRecovery(
    originalWriteOff: BadDebtWriteOff,
    recoveryAmount: number
  ): {
    journalEntries: Array<{ account: string; debit: number; credit: number }>;
    netWriteOff: number;
  } {
    const entries = [
      { account: 'cash', debit: recoveryAmount, credit: 0 },
      { account: 'bad_debt_recovery', debit: 0, credit: recoveryAmount },
    ];

    return {
      journalEntries: entries,
      netWriteOff: originalWriteOff.amount - recoveryAmount,
    };
  }
}

// Collection Agency Handler
class CollectionAgencyHandler {
  calculateAgencyFee(
    amount: number,
    feeStructure: 'contingency' | 'flat' | 'tiered',
    contingencyRate: number = 25
  ): { grossRecovery: number; agencyFee: number; netRecovery: number } {
    let agencyFee: number;

    switch (feeStructure) {
      case 'contingency':
        agencyFee = amount * (contingencyRate / 100);
        break;
      case 'flat':
        agencyFee = 50; // Flat $50 fee
        break;
      case 'tiered':
        // Lower percentage for higher amounts
        if (amount < 500) {
          agencyFee = amount * 0.40;
        } else if (amount < 2000) {
          agencyFee = amount * 0.30;
        } else {
          agencyFee = amount * 0.25;
        }
        break;
      default:
        agencyFee = 0;
    }

    return {
      grossRecovery: amount,
      agencyFee: Math.round(agencyFee * 100) / 100,
      netRecovery: Math.round((amount - agencyFee) * 100) / 100,
    };
  }

  trackRemittance(
    agencyId: string,
    expectedAmount: number,
    receivedAmount: number,
    feeDeducted: number
  ): { variance: number; status: 'matched' | 'discrepancy' | 'pending' } {
    const expectedNet = expectedAmount - feeDeducted;
    const variance = receivedAmount - expectedNet;

    return {
      variance,
      status: Math.abs(variance) < 0.01 ? 'matched' : 'discrepancy',
    };
  }
}

// Judgment Tracker
class JudgmentTracker {
  calculateJudgmentBalance(judgment: JudgmentRecord): {
    totalJudgment: number;
    balance: number;
    monthsToExpiration: number;
    accruing: boolean;
  } {
    const totalJudgment = judgment.principalAmount +
      judgment.interestAmount +
      judgment.courtCosts +
      judgment.attorneyFees;

    const balance = totalJudgment - judgment.paymentsReceived;

    const today = new Date();
    const monthsToExpiration = Math.floor(
      (judgment.expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    return {
      totalJudgment,
      balance,
      monthsToExpiration,
      accruing: balance > 0 && monthsToExpiration > 0,
    };
  }

  calculatePostJudgmentInterest(
    principalBalance: number,
    dailyRate: number,
    daysSinceJudgment: number
  ): number {
    return Math.round(principalBalance * dailyRate * daysSinceJudgment * 100) / 100;
  }
}

// Statute of Limitations Tracker
class StatuteOfLimitationsTracker {
  private stateLimits: Record<string, { written: number; oral: number }> = {
    'CA': { written: 4, oral: 2 },
    'NY': { written: 6, oral: 6 },
    'TX': { written: 4, oral: 4 },
    'FL': { written: 5, oral: 4 },
    'IL': { written: 10, oral: 5 },
  };

  checkStatute(
    state: string,
    contractType: 'written' | 'oral',
    lastActivity: Date
  ): { expired: boolean; expirationDate: Date; daysRemaining: number } {
    const limits = this.stateLimits[state] || { written: 6, oral: 4 };
    const years = contractType === 'written' ? limits.written : limits.oral;

    const expirationDate = new Date(lastActivity);
    expirationDate.setFullYear(expirationDate.getFullYear() + years);

    const today = new Date();
    const daysRemaining = Math.floor(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      expired: daysRemaining <= 0,
      expirationDate,
      daysRemaining: Math.max(0, daysRemaining),
    };
  }
}

describe('TC-COL: Collections & Bad Debt Tests', () => {
  describe('TC-COL-185: AR Aging Bucket Classification', () => {
    it('should correctly classify receivables into aging buckets', () => {
      const engine = new ARAgingEngine();
      const today = new Date('2024-06-15');

      const entries: ARAgingEntry[] = [
        { tenantId: 't-1', chargeId: 'c-1', originalAmount: 1000, balance: 1000, dueDate: new Date('2024-06-20'), bucket: 'current' },
        { tenantId: 't-2', chargeId: 'c-2', originalAmount: 1000, balance: 800, dueDate: new Date('2024-06-01'), bucket: '1-30' },
        { tenantId: 't-3', chargeId: 'c-3', originalAmount: 1000, balance: 500, dueDate: new Date('2024-05-01'), bucket: '31-60' },
        { tenantId: 't-4', chargeId: 'c-4', originalAmount: 1000, balance: 1200, dueDate: new Date('2024-03-01'), bucket: '90+' },
      ];

      const result = engine.calculateAging(entries, today);

      expect(result.buckets['current']).toBe(1000);
      expect(result.buckets['1-30']).toBe(800);
      expect(result.buckets['31-60']).toBe(500);
      expect(result.buckets['90+']).toBe(1200);
      expect(result.totalAR).toBe(3500);
    });
  });

  describe('TC-COL-186: Average Days Outstanding', () => {
    it('should calculate correct average days outstanding', () => {
      const engine = new ARAgingEngine();
      const today = new Date('2024-06-15');

      const entries: ARAgingEntry[] = [
        { tenantId: 't-1', chargeId: 'c-1', originalAmount: 1000, balance: 1000, dueDate: new Date('2024-06-01'), bucket: '1-30' }, // 14 days
        { tenantId: 't-2', chargeId: 'c-2', originalAmount: 1000, balance: 1000, dueDate: new Date('2024-05-16'), bucket: '1-30' }, // 30 days
      ];

      const result = engine.calculateAging(entries, today);

      expect(result.avgDaysOutstanding).toBe(22); // (14 + 30) / 2
    });
  });

  describe('TC-COL-187: Bad Debt Write-Off Journal Entry', () => {
    it('should create correct GL entries for write-off', () => {
      const manager = new BadDebtManager();

      const writeOff: BadDebtWriteOff = {
        tenantId: 'tenant-1',
        amount: 2500,
        writeOffDate: new Date(),
        reason: 'uncollectible',
        approvedBy: 'manager-1',
        recoverable: false,
      };

      const result = manager.processWriteOff(writeOff);

      expect(result.journalEntries[0].account).toBe('bad_debt_expense');
      expect(result.journalEntries[0].debit).toBe(2500);
      expect(result.journalEntries[1].account).toBe('accounts_receivable');
      expect(result.journalEntries[1].credit).toBe(2500);
      expect(result.taxDeductible).toBe(true);
    });
  });

  describe('TC-COL-188: Bad Debt Recovery', () => {
    it('should record recovery of previously written-off debt', () => {
      const manager = new BadDebtManager();

      const originalWriteOff: BadDebtWriteOff = {
        tenantId: 'tenant-1',
        amount: 2500,
        writeOffDate: new Date('2023-01-15'),
        reason: 'uncollectible',
        approvedBy: 'manager-1',
        recoverable: true,
      };

      const result = manager.processRecovery(originalWriteOff, 1000);

      expect(result.journalEntries[0].account).toBe('cash');
      expect(result.journalEntries[0].debit).toBe(1000);
      expect(result.journalEntries[1].account).toBe('bad_debt_recovery');
      expect(result.netWriteOff).toBe(1500);
    });
  });

  describe('TC-COL-189: Collection Agency Fee - Contingency', () => {
    it('should calculate 25% contingency fee', () => {
      const handler = new CollectionAgencyHandler();

      const result = handler.calculateAgencyFee(1000, 'contingency', 25);

      expect(result.agencyFee).toBe(250);
      expect(result.netRecovery).toBe(750);
    });
  });

  describe('TC-COL-190: Collection Agency Fee - Tiered', () => {
    it('should apply lower rate for higher amounts', () => {
      const handler = new CollectionAgencyHandler();

      const smallAmount = handler.calculateAgencyFee(400, 'tiered');
      const largeAmount = handler.calculateAgencyFee(3000, 'tiered');

      expect(smallAmount.agencyFee).toBe(160); // 40%
      expect(largeAmount.agencyFee).toBe(750); // 25%
    });
  });

  describe('TC-COL-191: Agency Remittance Reconciliation', () => {
    it('should detect variance in agency payment', () => {
      const handler = new CollectionAgencyHandler();

      const result = handler.trackRemittance(
        'agency-1',
        1000,  // Expected gross
        720,   // Received
        250    // Fee deducted (should be 250, net should be 750)
      );

      expect(result.variance).toBe(-30); // Received $30 less than expected
      expect(result.status).toBe('discrepancy');
    });
  });

  describe('TC-COL-192: Judgment Balance Calculation', () => {
    it('should calculate total judgment with all components', () => {
      const tracker = new JudgmentTracker();

      const judgment: JudgmentRecord = {
        caseNumber: 'CV-2024-001',
        tenantId: 'tenant-1',
        principalAmount: 5000,
        interestAmount: 500,
        courtCosts: 350,
        attorneyFees: 1500,
        judgmentDate: new Date('2024-01-15'),
        expirationDate: new Date('2034-01-15'),
        renewalRequired: true,
        paymentsReceived: 1000,
      };

      const result = tracker.calculateJudgmentBalance(judgment);

      expect(result.totalJudgment).toBe(7350);
      expect(result.balance).toBe(6350);
      expect(result.accruing).toBe(true);
    });
  });

  describe('TC-COL-193: Post-Judgment Interest', () => {
    it('should calculate accruing interest on judgment', () => {
      const tracker = new JudgmentTracker();

      // California: 10% annual = 0.0274% daily
      const dailyRate = 0.10 / 365;
      const interest = tracker.calculatePostJudgmentInterest(5000, dailyRate, 180);

      // $5000 * 0.000274 * 180 = ~$246.58
      expect(interest).toBeCloseTo(246.58, 0);
    });
  });

  describe('TC-COL-194: Statute of Limitations - California', () => {
    it('should calculate expiration for 4-year written contract', () => {
      const tracker = new StatuteOfLimitationsTracker();

      const result = tracker.checkStatute(
        'CA',
        'written',
        new Date('2020-06-15')
      );

      expect(result.expirationDate.getFullYear()).toBe(2024);
      // As of mid-2024, this would be expired or nearly expired
    });
  });

  describe('TC-COL-195: Statute of Limitations - Expired', () => {
    it('should flag debt as expired when past statute', () => {
      const tracker = new StatuteOfLimitationsTracker();

      const result = tracker.checkStatute(
        'CA',
        'oral',
        new Date('2020-01-01') // 2-year limit for oral in CA
      );

      expect(result.expired).toBe(true);
      expect(result.daysRemaining).toBe(0);
    });
  });

  describe('TC-COL-196: Collection Workflow Automation', () => {
    it('should generate appropriate collection actions based on aging', () => {
      const determineCollectionAction = (
        daysDelinquent: number,
        previousActions: CollectionAction[]
      ): CollectionAction['actionType'] | null => {
        const hasAction = (type: CollectionAction['actionType']) =>
          previousActions.some(a => a.actionType === type);

        if (daysDelinquent >= 5 && daysDelinquent < 15 && !hasAction('reminder')) {
          return 'reminder';
        }
        if (daysDelinquent >= 15 && daysDelinquent < 30 && !hasAction('demand_letter')) {
          return 'demand_letter';
        }
        if (daysDelinquent >= 30 && daysDelinquent < 45 && !hasAction('final_notice')) {
          return 'final_notice';
        }
        if (daysDelinquent >= 45 && daysDelinquent < 60 && !hasAction('collection_agency')) {
          return 'collection_agency';
        }
        if (daysDelinquent >= 60 && !hasAction('legal_action')) {
          return 'legal_action';
        }
        return null;
      };

      expect(determineCollectionAction(7, [])).toBe('reminder');
      expect(determineCollectionAction(20, [{ tenantId: 't-1', actionType: 'reminder', date: new Date(), notes: '' }])).toBe('demand_letter');
      expect(determineCollectionAction(50, [
        { tenantId: 't-1', actionType: 'reminder', date: new Date(), notes: '' },
        { tenantId: 't-1', actionType: 'demand_letter', date: new Date(), notes: '' },
        { tenantId: 't-1', actionType: 'final_notice', date: new Date(), notes: '' },
      ])).toBe('collection_agency');
    });
  });

  describe('TC-COL-197: FDCPA Compliance Timing', () => {
    it('should enforce 30-day validation period after first contact', () => {
      interface DebtValidation {
        firstContactDate: Date;
        validationRequestDate?: Date;
        validated: boolean;
      }

      const checkValidationPeriod = (validation: DebtValidation): {
        inValidationPeriod: boolean;
        collectionsAllowed: boolean;
      } => {
        const today = new Date();
        const daysSinceContact = Math.floor(
          (today.getTime() - validation.firstContactDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const inValidationPeriod = daysSinceContact <= 30;

        // If tenant requested validation, collections paused until validated
        const collectionsAllowed = !validation.validationRequestDate ||
          validation.validated;

        return { inValidationPeriod, collectionsAllowed };
      };

      const result = checkValidationPeriod({
        firstContactDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        validationRequestDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        validated: false,
      });

      expect(result.inValidationPeriod).toBe(true);
      expect(result.collectionsAllowed).toBe(false); // Must validate first
    });
  });

  describe('TC-COL-198: Allowance for Doubtful Accounts', () => {
    it('should calculate allowance based on aging percentages', () => {
      const calculateAllowance = (
        aging: Record<AgingBucket, number>,
        percentages: Record<AgingBucket, number>
      ): number => {
        let allowance = 0;

        for (const [bucket, amount] of Object.entries(aging)) {
          if (bucket !== 'written_off') {
            const percentage = percentages[bucket as AgingBucket] || 0;
            allowance += amount * (percentage / 100);
          }
        }

        return Math.round(allowance * 100) / 100;
      };

      const aging = {
        'current': 50000,
        '1-30': 10000,
        '31-60': 5000,
        '61-90': 3000,
        '90+': 2000,
        'written_off': 0,
      };

      const percentages = {
        'current': 1,     // 1% of current
        '1-30': 5,        // 5% of 1-30
        '31-60': 15,      // 15% of 31-60
        '61-90': 30,      // 30% of 61-90
        '90+': 50,        // 50% of 90+
        'written_off': 0,
      };

      const allowance = calculateAllowance(aging, percentages);

      // 500 + 500 + 750 + 900 + 1000 = 3,650
      expect(allowance).toBe(3650);
    });
  });

  describe('TC-COL-199: Payment Plan Breach', () => {
    it('should accelerate balance upon breach', () => {
      interface CollectionPaymentPlan {
        totalOwed: number;
        monthlyPayment: number;
        paymentsRemaining: number;
        missedPayments: number;
        breachThreshold: number;
      }

      const evaluatePaymentPlan = (plan: CollectionPaymentPlan): {
        status: 'active' | 'breached' | 'completed';
        acceleratedBalance?: number;
      } => {
        if (plan.paymentsRemaining === 0) {
          return { status: 'completed' };
        }

        if (plan.missedPayments >= plan.breachThreshold) {
          return {
            status: 'breached',
            acceleratedBalance: plan.monthlyPayment * plan.paymentsRemaining,
          };
        }

        return { status: 'active' };
      };

      const result = evaluatePaymentPlan({
        totalOwed: 6000,
        monthlyPayment: 500,
        paymentsRemaining: 8,
        missedPayments: 2,
        breachThreshold: 2,
      });

      expect(result.status).toBe('breached');
      expect(result.acceleratedBalance).toBe(4000);
    });
  });

  describe('TC-COL-200: Garnishment Calculation', () => {
    it('should calculate maximum garnishment amount', () => {
      const calculateGarnishment = (
        disposableIncome: number,
        state: string
      ): { maxGarnishment: number; method: string } => {
        // Federal limit: lesser of 25% of disposable or amount over 30x minimum wage
        const federalMinWage = 7.25;
        const weeklyMinimum = federalMinWage * 30;

        const percentageMethod = disposableIncome * 0.25;
        const minimumMethod = Math.max(0, disposableIncome - weeklyMinimum);

        const federalMax = Math.min(percentageMethod, minimumMethod);

        // Some states have stricter limits
        const stateLimits: Record<string, number> = {
          'TX': 0,           // No wage garnishment
          'NC': 0,           // No wage garnishment
          'PA': 0,           // No wage garnishment
          'SC': 0,           // No wage garnishment
          'CA': disposableIncome * 0.25, // 25%
        };

        const stateMax = stateLimits[state] ?? federalMax;

        return {
          maxGarnishment: Math.min(federalMax, stateMax),
          method: stateMax === 0 ? 'garnishment_prohibited' : 'federal_formula',
        };
      };

      const txResult = calculateGarnishment(800, 'TX');
      expect(txResult.maxGarnishment).toBe(0);
      expect(txResult.method).toBe('garnishment_prohibited');

      const caResult = calculateGarnishment(800, 'CA');
      expect(caResult.maxGarnishment).toBe(200); // 25%
    });
  });
});
