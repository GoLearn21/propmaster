/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 1.2: Late Fee Compliance
 * "The Stacking Validator"
 *
 * Goal: Prevent lawsuits from illegal late fee calculations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types for late fee calculations
interface LateFeeRule {
  jurisdiction: string;
  feeType: 'flat' | 'percentage' | 'greater_of';
  flatAmount?: number;
  percentageRate?: number;
  percentageCap?: number;
  dailyRate?: number;
  dailyCap?: number;
  gracePeriodDays: number;
  weekendExtension: boolean;
  stackingAllowed: boolean;
}

interface TenantLedgerEntry {
  type: 'rent' | 'late_fee' | 'utility' | 'other';
  amount: number;
  dueDate: Date;
  paidDate?: Date;
}

// Late fee calculation functions
function calculateLateFee(
  rentAmount: number,
  rule: LateFeeRule,
  existingLateFees: number = 0
): number {
  let fee = 0;

  switch (rule.feeType) {
    case 'flat':
      fee = rule.flatAmount || 0;
      break;
    case 'percentage':
      // Calculate on rent only if stacking not allowed
      const baseAmount = rule.stackingAllowed ? (rentAmount + existingLateFees) : rentAmount;
      fee = baseAmount * ((rule.percentageRate || 0) / 100);
      // Apply cap if exists
      if (rule.percentageCap) {
        fee = Math.min(fee, rule.percentageCap);
      }
      break;
    case 'greater_of':
      const flatFee = rule.flatAmount || 0;
      const percentFee = rentAmount * ((rule.percentageRate || 0) / 100);
      fee = Math.max(flatFee, percentFee);
      break;
  }

  return Math.round(fee * 100) / 100;
}

function isWithinGracePeriod(
  dueDate: Date,
  paymentDate: Date,
  graceDays: number,
  weekendExtension: boolean
): boolean {
  const gracePeriodEnd = new Date(dueDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + graceDays);

  // Weekend extension logic
  if (weekendExtension) {
    const dayOfWeek = gracePeriodEnd.getDay();
    if (dayOfWeek === 0) { // Sunday
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 1);
    } else if (dayOfWeek === 6) { // Saturday
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 2);
    }
  }

  // Set grace period end to end of day (11:59:59.999 PM)
  gracePeriodEnd.setHours(23, 59, 59, 999);

  return paymentDate <= gracePeriodEnd;
}

function calculateDailyFees(
  dailyRate: number,
  maxCap: number,
  daysLate: number
): number {
  const totalFee = dailyRate * daysLate;
  return Math.min(totalFee, maxCap);
}

describe('TC-FEE: Late Fee Compliance Tests', () => {
  describe('TC-FEE-011: Stacking Prevention', () => {
    it('should calculate new fee on rent only, ignoring existing $50 late fee balance', () => {
      const rentAmount = 1000;
      const existingLateFees = 50;
      const rule: LateFeeRule = {
        jurisdiction: 'CA',
        feeType: 'percentage',
        percentageRate: 5,
        gracePeriodDays: 5,
        weekendExtension: false,
        stackingAllowed: false, // Key: Stacking NOT allowed
      };

      const newFee = calculateLateFee(rentAmount, rule, existingLateFees);

      // Should be 5% of rent ($1000), NOT 5% of ($1000 + $50)
      expect(newFee).toBe(50);
      expect(newFee).not.toBe(52.50); // Would be wrong if stacking allowed
    });

    it('should NOT compound fees on fees', () => {
      const rentAmount = 1000;
      const rule: LateFeeRule = {
        jurisdiction: 'CA',
        feeType: 'percentage',
        percentageRate: 5,
        gracePeriodDays: 5,
        weekendExtension: false,
        stackingAllowed: false,
      };

      // Month 1 late
      const fee1 = calculateLateFee(rentAmount, rule, 0);
      // Month 2 late (with existing fee)
      const fee2 = calculateLateFee(rentAmount, rule, fee1);
      // Month 3 late (with accumulated fees)
      const fee3 = calculateLateFee(rentAmount, rule, fee1 + fee2);

      // All fees should be the same - calculated on rent only
      expect(fee1).toBe(50);
      expect(fee2).toBe(50);
      expect(fee3).toBe(50);
    });
  });

  describe('TC-FEE-012: Percentage Cap (CA)', () => {
    it('should cap fee at $150 for $3,000 rent with 5% cap', () => {
      const rentAmount = 3000;
      const rule: LateFeeRule = {
        jurisdiction: 'CA',
        feeType: 'percentage',
        percentageRate: 10, // Higher rate
        percentageCap: 150, // But capped at $150
        gracePeriodDays: 5,
        weekendExtension: false,
        stackingAllowed: false,
      };

      const fee = calculateLateFee(rentAmount, rule);

      // 10% of $3000 = $300, but capped at $150
      expect(fee).toBe(150);
    });

    it('should not cap when under limit', () => {
      const rentAmount = 1000;
      const rule: LateFeeRule = {
        jurisdiction: 'CA',
        feeType: 'percentage',
        percentageRate: 5,
        percentageCap: 150,
        gracePeriodDays: 5,
        weekendExtension: false,
        stackingAllowed: false,
      };

      const fee = calculateLateFee(rentAmount, rule);

      // 5% of $1000 = $50, under cap
      expect(fee).toBe(50);
    });
  });

  describe('TC-FEE-013: Flat Fee Cap (TX)', () => {
    it('should use greater of $20 or 5% for $1,000 rent', () => {
      const rentAmount = 1000;
      const rule: LateFeeRule = {
        jurisdiction: 'TX',
        feeType: 'greater_of',
        flatAmount: 20,
        percentageRate: 5,
        gracePeriodDays: 5,
        weekendExtension: false,
        stackingAllowed: false,
      };

      const fee = calculateLateFee(rentAmount, rule);

      // Greater of $20 or 5% of $1000 ($50) = $50
      expect(fee).toBe(50);
    });

    it('should use flat fee when percentage is lower', () => {
      const rentAmount = 300;
      const rule: LateFeeRule = {
        jurisdiction: 'TX',
        feeType: 'greater_of',
        flatAmount: 20,
        percentageRate: 5,
        gracePeriodDays: 5,
        weekendExtension: false,
        stackingAllowed: false,
      };

      const fee = calculateLateFee(rentAmount, rule);

      // Greater of $20 or 5% of $300 ($15) = $20
      expect(fee).toBe(20);
    });
  });

  describe('TC-FEE-014: Grace Period Boundary (No Fee)', () => {
    it('should NOT apply fee when paid on 5th @ 11:59 PM', () => {
      const dueDate = new Date('2024-01-01');
      const paymentDate = new Date('2024-01-05T23:59:00');
      const graceDays = 5;

      const isOnTime = isWithinGracePeriod(dueDate, paymentDate, graceDays, false);

      expect(isOnTime).toBe(true);
    });
  });

  describe('TC-FEE-015: Grace Period Violation (Fee Applied)', () => {
    it('should apply fee when paid on 6th @ 12:01 AM', () => {
      const dueDate = new Date('2024-01-01');
      const paymentDate = new Date('2024-01-06T00:01:00');
      const graceDays = 5;

      const isOnTime = isWithinGracePeriod(dueDate, paymentDate, graceDays, false);

      expect(isOnTime).toBe(false);
    });
  });

  describe('TC-FEE-016: Weekend Grace Logic', () => {
    it('should extend grace to Monday when it ends on Sunday', () => {
      // Jan 1, 2024 is Monday, so Jan 6 (after 5 grace days) is Saturday
      // With 4-day grace, Jan 5 is Friday, Jan 6 (5 days) is Saturday
      const dueDate = new Date('2024-01-01'); // Monday
      // 5 days later = Jan 6 (Saturday)
      // With weekend extension, should extend to Monday Jan 8
      const paymentDateSunday = new Date('2024-01-07T12:00:00'); // Sunday
      const paymentDateMonday = new Date('2024-01-08T12:00:00'); // Monday

      // Grace ends on Saturday (Jan 6), extends to Monday (Jan 8)
      const dueDate2 = new Date('2024-01-02'); // Tuesday
      // 5 days = Jan 7 (Sunday)
      const paymentOnSunday = new Date('2024-01-07T23:59:00');
      const paymentOnMonday = new Date('2024-01-08T23:59:00');

      const isOnTimeWithExtension = isWithinGracePeriod(dueDate2, paymentOnMonday, 5, true);

      expect(isOnTimeWithExtension).toBe(true);
    });

    it('should NOT extend when weekend_extension is false', () => {
      const dueDate = new Date('2024-01-02'); // Tuesday
      // 5 days = Jan 7 (Sunday)
      const paymentOnMonday = new Date('2024-01-08T12:00:00');

      const isOnTimeWithoutExtension = isWithinGracePeriod(dueDate, paymentOnMonday, 5, false);

      expect(isOnTimeWithoutExtension).toBe(false);
    });
  });

  describe('TC-FEE-017: Daily Fee Accumulation', () => {
    it('should stop accruing at $50 cap after 5 days with $10/day fee', () => {
      const dailyRate = 10;
      const maxCap = 50;

      // Day 1-5: $10, $20, $30, $40, $50
      expect(calculateDailyFees(dailyRate, maxCap, 1)).toBe(10);
      expect(calculateDailyFees(dailyRate, maxCap, 3)).toBe(30);
      expect(calculateDailyFees(dailyRate, maxCap, 5)).toBe(50);

      // Day 6-10: Still $50 (capped)
      expect(calculateDailyFees(dailyRate, maxCap, 6)).toBe(50);
      expect(calculateDailyFees(dailyRate, maxCap, 10)).toBe(50);
    });
  });

  describe('TC-FEE-018: Section 8 Partial', () => {
    it('should calculate fee only on tenant portion when state allows', () => {
      const tenantPortion = 500;
      const govPortion = 1500;
      const totalRent = tenantPortion + govPortion;

      const rule: LateFeeRule = {
        jurisdiction: 'CA',
        feeType: 'percentage',
        percentageRate: 5,
        gracePeriodDays: 5,
        weekendExtension: false,
        stackingAllowed: false,
      };

      // Fee on tenant portion only
      const feeOnTenantPortion = calculateLateFee(tenantPortion, rule);

      // Should be 5% of $500, not 5% of $2000
      expect(feeOnTenantPortion).toBe(25);
      expect(feeOnTenantPortion).not.toBe(100); // Would be wrong if on total
    });
  });

  describe('TC-FEE-019: Eviction Lock', () => {
    it('should pause or flag late fee generation for tenant in eviction status', () => {
      const tenantStatus = 'eviction';

      const shouldGenerateFee = (status: string): boolean => {
        const blockedStatuses = ['eviction', 'bankruptcy', 'legal_hold'];
        return !blockedStatuses.includes(status);
      };

      expect(shouldGenerateFee(tenantStatus)).toBe(false);
      expect(shouldGenerateFee('active')).toBe(true);
      expect(shouldGenerateFee('delinquent')).toBe(true);
    });
  });

  describe('TC-FEE-020: Fee Waiver Audit', () => {
    it('should create audit_log entry when PM manually waives fee', () => {
      interface AuditLogEntry {
        action: string;
        entity_type: string;
        entity_id: string;
        user_id: string;
        reason: string;
        timestamp: Date;
        old_value?: unknown;
        new_value?: unknown;
      }

      const auditLog: AuditLogEntry[] = [];

      const waiveFee = (
        feeId: string,
        userId: string,
        reason: string
      ): void => {
        auditLog.push({
          action: 'fee_waived',
          entity_type: 'late_fee',
          entity_id: feeId,
          user_id: userId,
          reason: reason,
          timestamp: new Date(),
          old_value: { status: 'active', amount: 50 },
          new_value: { status: 'waived', amount: 0 },
        });
      };

      waiveFee('fee-123', 'pm-456', 'Tenant payment was lost in mail');

      expect(auditLog.length).toBe(1);
      expect(auditLog[0].action).toBe('fee_waived');
      expect(auditLog[0].reason).toBe('Tenant payment was lost in mail');
      expect(auditLog[0].user_id).toBe('pm-456');
    });
  });
});
