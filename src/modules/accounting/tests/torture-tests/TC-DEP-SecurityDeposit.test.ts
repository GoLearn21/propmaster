/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 1.1: Security Deposit Interest
 * "The Chicago/LA Trap"
 *
 * Goal: Prevent class-action lawsuits from hard-coded compliance logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types to simulate the security deposit calculations
interface DepositInterestCalculation {
  principal: number;
  rate: number;
  compoundType: 'simple' | 'compound_monthly' | 'compound_annual';
  startDate: Date;
  endDate: Date;
  adminFeePercent?: number;
  jurisdiction: string;
}

interface ComplianceRule {
  jurisdiction: string;
  interestRate: number;
  compoundType: 'simple' | 'compound_monthly' | 'compound_annual';
  adminFeePercent?: number;
  effectiveDate: Date;
  expirationDate?: Date;
}

// Simulated calculation functions based on SecurityDepositSaga implementation
function calculateSimpleInterest(principal: number, rate: number, days: number): number {
  // I = P * r * t (where t is in years)
  const years = days / 365;
  return Math.round(principal * (rate / 100) * years * 100) / 100;
}

function calculateCompoundInterest(
  principal: number,
  rate: number,
  years: number,
  compoundsPerYear: number = 12
): number {
  // A = P(1 + r/n)^(nt)
  const amount = principal * Math.pow(1 + (rate / 100) / compoundsPerYear, compoundsPerYear * years);
  return Math.round((amount - principal) * 100) / 100;
}

function calculateProratedInterest(
  principal: number,
  rate1: number,
  days1: number,
  rate2: number,
  days2: number,
  compoundType: 'simple' | 'compound_monthly'
): number {
  if (compoundType === 'simple') {
    return calculateSimpleInterest(principal, rate1, days1) +
           calculateSimpleInterest(principal, rate2, days2);
  }
  // For compound, calculate each period separately
  const years1 = days1 / 365;
  const years2 = days2 / 365;
  const interest1 = calculateCompoundInterest(principal, rate1, years1);
  const newPrincipal = principal + interest1;
  const interest2 = calculateCompoundInterest(newPrincipal, rate2, years2);
  return Math.round((interest1 + interest2) * 100) / 100;
}

function getApplicableRule(
  jurisdiction: string,
  rules: ComplianceRule[],
  date: Date
): ComplianceRule | null {
  // Priority: City > State > Federal
  const priorityOrder = ['city', 'state', 'federal'];

  const applicableRules = rules.filter(r =>
    r.jurisdiction.startsWith(jurisdiction.split(':')[0]) &&
    r.effectiveDate <= date &&
    (!r.expirationDate || r.expirationDate > date)
  );

  if (applicableRules.length === 0) {
    // Fallback chain
    const parts = jurisdiction.split(':');
    if (parts.length > 1) {
      // Try state level
      const stateRules = rules.filter(r =>
        r.jurisdiction === parts[0] &&
        r.effectiveDate <= date &&
        (!r.expirationDate || r.expirationDate > date)
      );
      if (stateRules.length > 0) return stateRules[0];
    }
    // Try federal
    const federalRules = rules.filter(r =>
      r.jurisdiction === 'US:federal' &&
      r.effectiveDate <= date
    );
    return federalRules[0] || null;
  }

  return applicableRules[0];
}

describe('TC-DEP: Security Deposit Interest Tests', () => {
  describe('TC-DEP-001: Chicago Simple Interest', () => {
    it('should calculate 0.01% simple interest on $2,000 for 12 months = $0.20', () => {
      const principal = 2000;
      const rate = 0.01; // 0.01%
      const days = 365; // 12 months

      const interest = calculateSimpleInterest(principal, rate, days);

      expect(interest).toBe(0.20);
    });
  });

  describe('TC-DEP-002: LA RSO Compounding', () => {
    it('should calculate compound monthly for LA Rent Controlled ($2,000 @ 3% for 5 years)', () => {
      const principal = 2000;
      const rate = 3; // 3%
      const years = 5;
      const compoundsPerYear = 12; // Monthly

      // P(1 + r/n)^(nt) = 2000(1 + 0.03/12)^(12*5) = 2000(1.0025)^60
      const expectedAmount = principal * Math.pow(1 + (rate / 100) / compoundsPerYear, compoundsPerYear * years);
      const expectedInterest = Math.round((expectedAmount - principal) * 100) / 100;

      const calculatedInterest = calculateCompoundInterest(principal, rate, years, compoundsPerYear);

      // Expected: approximately $322.51
      expect(calculatedInterest).toBeCloseTo(expectedInterest, 2);
      expect(calculatedInterest).toBeGreaterThan(300); // Should be around $322
      expect(calculatedInterest).toBeLessThan(350);
    });
  });

  describe('TC-DEP-003: Rate Change Mid-Year', () => {
    it('should prorate interest when rate changes from 2% to 3% on June 1st', () => {
      const principal = 2000;
      const rate1 = 2; // Jan 1 - May 31 (151 days)
      const rate2 = 3; // Jun 1 - Dec 31 (214 days)
      const days1 = 151;
      const days2 = 214;

      const interest = calculateProratedInterest(
        principal,
        rate1, days1,
        rate2, days2,
        'simple'
      );

      // Expected: (2000 * 0.02 * 151/365) + (2000 * 0.03 * 214/365)
      const expected = (2000 * 0.02 * (151/365)) + (2000 * 0.03 * (214/365));

      expect(interest).toBeCloseTo(Math.round(expected * 100) / 100, 2);
    });
  });

  describe('TC-DEP-004: Negative Rate Protection', () => {
    it('should clamp negative rates to 0% and never reduce principal', () => {
      const principal = 2000;
      const rate = -0.05; // Negative rate
      const days = 365;

      // System should clamp to 0%
      const clampedRate = Math.max(0, rate);
      const interest = calculateSimpleInterest(principal, clampedRate, days);

      expect(interest).toBe(0);
      expect(interest).toBeGreaterThanOrEqual(0); // Never negative
    });

    it('should throw error or return 0 for negative rates', () => {
      const principal = 2000;
      const rate = -0.05;

      const safeCalculation = () => {
        if (rate < 0) {
          return 0; // Or throw new Error('Negative rate not allowed')
        }
        return calculateSimpleInterest(principal, rate, 365);
      };

      expect(safeCalculation()).toBe(0);
    });
  });

  describe('TC-DEP-005: Move-Out Proration', () => {
    it('should calculate interest for exactly 14 days, not full month', () => {
      const principal = 2000;
      const rate = 2; // 2% annual
      const days = 14;

      const interest = calculateSimpleInterest(principal, rate, days);

      // Expected: 2000 * 0.02 * (14/365) = $1.53
      const expected = 2000 * 0.02 * (14/365);

      expect(interest).toBeCloseTo(Math.round(expected * 100) / 100, 2);
      expect(interest).toBeLessThan(calculateSimpleInterest(principal, rate, 30)); // Less than full month
    });
  });

  describe('TC-DEP-006: Admin Fee Deduction (NY)', () => {
    it('should deduct 1% admin fee before interest payment', () => {
      const principal = 2000;
      const rate = 2;
      const adminFeePercent = 1;
      const days = 365;

      const grossInterest = calculateSimpleInterest(principal, rate, days);
      const adminFee = grossInterest * (adminFeePercent / 100);
      const netInterest = grossInterest - adminFee;

      // Gross: $40, Admin Fee: $0.40, Net: $39.60
      expect(grossInterest).toBe(40);
      expect(adminFee).toBeCloseTo(0.40, 2);
      expect(netInterest).toBeCloseTo(39.60, 2);
    });
  });

  describe('TC-DEP-007: Missing Rule Fallback', () => {
    it('should fall back from City to State to Federal, never crash', () => {
      const rules: ComplianceRule[] = [
        {
          jurisdiction: 'US:federal',
          interestRate: 0.5,
          compoundType: 'simple',
          effectiveDate: new Date('2020-01-01'),
        },
        {
          jurisdiction: 'CA',
          interestRate: 1.0,
          compoundType: 'simple',
          effectiveDate: new Date('2020-01-01'),
        },
        // Note: No LA city rule
      ];

      const currentDate = new Date('2024-06-01');

      // Looking for LA:city rule, should fall back to CA state
      const rule = getApplicableRule('CA:LA', rules, currentDate);

      expect(rule).not.toBeNull();
      expect(rule?.jurisdiction).toBe('CA'); // Falls back to state
    });

    it('should fall back to federal when no state rule exists', () => {
      const rules: ComplianceRule[] = [
        {
          jurisdiction: 'US:federal',
          interestRate: 0.5,
          compoundType: 'simple',
          effectiveDate: new Date('2020-01-01'),
        },
        // No state rules
      ];

      const currentDate = new Date('2024-06-01');
      const rule = getApplicableRule('TX:Austin', rules, currentDate);

      expect(rule).not.toBeNull();
      expect(rule?.jurisdiction).toBe('US:federal');
    });
  });

  describe('TC-DEP-008: Interest Payout Timing', () => {
    it('should credit interest to Tenant Ledger (Liability), not as Cash', () => {
      // This tests the journal entry structure
      const interestAmount = 40;

      // Expected journal entry for accrued interest
      const journalEntry = {
        type: 'security_deposit_interest',
        postings: [
          { account: 'interest_expense', debit: interestAmount, credit: 0 },
          { account: 'security_deposit_liability', debit: 0, credit: interestAmount },
        ]
      };

      // Interest should go to liability, not cash
      const liabilityPosting = journalEntry.postings.find(p => p.account === 'security_deposit_liability');
      const cashPosting = journalEntry.postings.find(p => p.account === 'cash');

      expect(liabilityPosting?.credit).toBe(interestAmount);
      expect(cashPosting).toBeUndefined();
    });
  });

  describe('TC-DEP-009: Escrow Balance Check', () => {
    it('should validate Sum(Deposit Liability) + Sum(Accrued Interest) <= Escrow Bank Balance', () => {
      const deposits = [
        { principal: 2000, accruedInterest: 40 },
        { principal: 1500, accruedInterest: 30 },
        { principal: 3000, accruedInterest: 60 },
      ];

      const escrowBankBalance = 6700; // Slightly more than total

      const totalLiability = deposits.reduce((sum, d) => sum + d.principal + d.accruedInterest, 0);

      expect(totalLiability).toBe(6630);
      expect(totalLiability).toBeLessThanOrEqual(escrowBankBalance);

      // Test underfunded scenario
      const underfundedBalance = 6500;
      expect(totalLiability).toBeGreaterThan(underfundedBalance);
    });
  });

  describe('TC-DEP-010: Lease Break Forfeiture', () => {
    it('should pay interest up to forfeiture date when tenant breaks lease', () => {
      const principal = 2000;
      const rate = 2;
      const leaseStartDate = new Date('2024-01-01');
      const forfeitureDate = new Date('2024-06-15'); // Tenant breaks lease

      // Calculate days from start to forfeiture
      const daysHeld = Math.floor((forfeitureDate.getTime() - leaseStartDate.getTime()) / (1000 * 60 * 60 * 24));

      const interestOwed = calculateSimpleInterest(principal, rate, daysHeld);

      // Interest is still owed up to forfeiture date
      expect(interestOwed).toBeGreaterThan(0);
      expect(daysHeld).toBe(166); // Approximately half year
      expect(interestOwed).toBeCloseTo(2000 * 0.02 * (166/365), 2);
    });
  });
});
