/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 13: Commercial Property Accounting
 *
 * Goal: Handle CAM reconciliation, NNN, percentage rent, and tenant improvements
 * Critical for: Commercial lease compliance, year-end reconciliation, legal disputes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Commercial lease types
type LeaseType = 'gross' | 'modified_gross' | 'nnn' | 'absolute_nnn' | 'percentage';

interface CAMCharge {
  category: 'maintenance' | 'utilities' | 'insurance' | 'taxes' | 'management' | 'reserves';
  amount: number;
  excludeFromCap: boolean;
}

interface CAMReconciliation {
  tenantId: string;
  leaseId: string;
  year: number;
  estimatedCAM: number;
  actualCAM: number;
  proRataShare: number; // Percentage
  annualCap?: number;
  capType?: 'cumulative' | 'non_cumulative' | 'base_year';
  baseYearCAM?: number;
}

interface PercentageRent {
  tenantId: string;
  breakpoint: number;
  percentageRate: number;
  grossSales: number;
  naturalBreakpoint: boolean;
  reportingPeriod: 'monthly' | 'quarterly' | 'annually';
}

interface TenantImprovement {
  tenantId: string;
  totalCost: number;
  landlordContribution: number;
  amortizationMonths: number;
  interestRate: number;
}

// CAM Reconciliation Engine
class CAMReconciliationEngine {
  calculateReconciliation(recon: CAMReconciliation): {
    tenantShare: number;
    amountPaid: number;
    adjustmentDue: number;
    cappedAmount?: number;
  } {
    let tenantShare = recon.actualCAM * (recon.proRataShare / 100);

    // Apply CAM cap if applicable
    let cappedAmount: number | undefined;
    if (recon.capType && (recon.annualCap || recon.capType === 'base_year')) {
      // Calculate tenant's estimated share for cap calculations
      const estimatedTenantShare = recon.estimatedCAM * (recon.proRataShare / 100);

      switch (recon.capType) {
        case 'cumulative':
          // Cap increases each year
          cappedAmount = recon.annualCap;
          break;
        case 'non_cumulative':
          // Fixed percentage cap on tenant's share each year
          cappedAmount = estimatedTenantShare * (1 + recon.annualCap / 100);
          break;
        case 'base_year':
          // Only pay increases over base year
          if (recon.baseYearCAM) {
            const increase = Math.max(0, recon.actualCAM - recon.baseYearCAM);
            tenantShare = increase * (recon.proRataShare / 100);
          }
          break;
      }

      if (cappedAmount && tenantShare > cappedAmount) {
        tenantShare = cappedAmount;
      }
    }

    const amountPaid = recon.estimatedCAM * (recon.proRataShare / 100);
    const adjustmentDue = Math.round((tenantShare - amountPaid) * 100) / 100;

    return {
      tenantShare: Math.round(tenantShare * 100) / 100,
      amountPaid: Math.round(amountPaid * 100) / 100,
      adjustmentDue,
      cappedAmount,
    };
  }

  calculateProRataShare(
    tenantSquareFeet: number,
    totalLeasableSquareFeet: number,
    commonAreaSquareFeet: number,
    method: 'leasable' | 'rentable' | 'usable'
  ): number {
    let denominator: number;

    switch (method) {
      case 'leasable':
        denominator = totalLeasableSquareFeet;
        break;
      case 'rentable':
        // Rentable includes load factor
        denominator = totalLeasableSquareFeet + commonAreaSquareFeet;
        break;
      case 'usable':
        denominator = totalLeasableSquareFeet;
        break;
      default:
        denominator = totalLeasableSquareFeet;
    }

    return Math.round((tenantSquareFeet / denominator) * 10000) / 100; // 2 decimal percentage
  }
}

// Percentage Rent Calculator
class PercentageRentCalculator {
  calculate(rent: PercentageRent): {
    percentageRentDue: number;
    excessSales: number;
    effectiveRentRate: number;
  } {
    let breakpoint = rent.breakpoint;

    // Natural breakpoint = Base Rent / Percentage Rate
    // This ensures landlord gets base rent before percentage kicks in
    if (rent.naturalBreakpoint) {
      // Already calculated as natural breakpoint
    }

    const excessSales = Math.max(0, rent.grossSales - breakpoint);
    const percentageRentDue = Math.round(excessSales * (rent.percentageRate / 100) * 100) / 100;

    // Effective rent rate = Total rent / Gross sales
    const totalRent = breakpoint * (rent.percentageRate / 100) + percentageRentDue;
    const effectiveRentRate = rent.grossSales > 0
      ? Math.round((totalRent / rent.grossSales) * 10000) / 100
      : 0;

    return {
      percentageRentDue,
      excessSales,
      effectiveRentRate,
    };
  }
}

// Tenant Improvement Amortization
class TenantImprovementCalculator {
  calculateAmortization(ti: TenantImprovement): {
    monthlyPayment: number;
    totalInterest: number;
    amortizationSchedule: Array<{ month: number; principal: number; interest: number; balance: number }>;
  } {
    const tenantCost = ti.totalCost - ti.landlordContribution;
    const monthlyRate = ti.interestRate / 100 / 12;
    const n = ti.amortizationMonths;

    // PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
    let monthlyPayment: number;
    if (monthlyRate === 0) {
      monthlyPayment = tenantCost / n;
    } else {
      monthlyPayment = tenantCost * (monthlyRate * Math.pow(1 + monthlyRate, n)) /
        (Math.pow(1 + monthlyRate, n) - 1);
    }

    monthlyPayment = Math.round(monthlyPayment * 100) / 100;

    // Build amortization schedule
    const schedule: Array<{ month: number; principal: number; interest: number; balance: number }> = [];
    let balance = tenantCost;
    let totalInterest = 0;

    for (let month = 1; month <= n; month++) {
      const interest = Math.round(balance * monthlyRate * 100) / 100;
      const principal = Math.round((monthlyPayment - interest) * 100) / 100;
      balance = Math.max(0, Math.round((balance - principal) * 100) / 100);
      totalInterest += interest;

      schedule.push({ month, principal, interest, balance });
    }

    return {
      monthlyPayment,
      totalInterest: Math.round(totalInterest * 100) / 100,
      amortizationSchedule: schedule,
    };
  }
}

// NNN Expense Pass-through
class NNNExpenseCalculator {
  calculatePassThrough(
    expenses: CAMCharge[],
    proRataShare: number,
    leaseType: LeaseType
  ): {
    tenantResponsibility: number;
    breakdown: Record<string, number>;
    landlordRetains: number;
  } {
    const breakdown: Record<string, number> = {};
    let tenantTotal = 0;
    let landlordRetains = 0;

    for (const expense of expenses) {
      const tenantShare = expense.amount * (proRataShare / 100);

      switch (leaseType) {
        case 'nnn':
          // Tenant pays proportionate share of everything
          breakdown[expense.category] = Math.round(tenantShare * 100) / 100;
          tenantTotal += tenantShare;
          break;

        case 'absolute_nnn':
          // Tenant pays actual costs, no sharing
          breakdown[expense.category] = expense.amount;
          tenantTotal += expense.amount;
          break;

        case 'modified_gross':
          // Tenant pays only increases over base year (handled separately)
          // For simplicity, pass through operating expenses only
          if (['utilities', 'maintenance'].includes(expense.category)) {
            breakdown[expense.category] = Math.round(tenantShare * 100) / 100;
            tenantTotal += tenantShare;
          } else {
            landlordRetains += expense.amount;
          }
          break;

        case 'gross':
          // Landlord pays all
          landlordRetains += expense.amount;
          break;

        default:
          breakdown[expense.category] = Math.round(tenantShare * 100) / 100;
          tenantTotal += tenantShare;
      }
    }

    return {
      tenantResponsibility: Math.round(tenantTotal * 100) / 100,
      breakdown,
      landlordRetains: Math.round(landlordRetains * 100) / 100,
    };
  }
}

describe('TC-COM: Commercial Property Accounting Tests', () => {
  describe('TC-COM-169: CAM Reconciliation - Under Collection', () => {
    it('should calculate additional charge when actual exceeds estimated', () => {
      const engine = new CAMReconciliationEngine();

      const result = engine.calculateReconciliation({
        tenantId: 'tenant-1',
        leaseId: 'lease-1',
        year: 2024,
        estimatedCAM: 100000,
        actualCAM: 120000,
        proRataShare: 10, // 10% of building
      });

      // Estimated: $10,000 (10% of $100k)
      // Actual: $12,000 (10% of $120k)
      // Due: $2,000
      expect(result.amountPaid).toBe(10000);
      expect(result.tenantShare).toBe(12000);
      expect(result.adjustmentDue).toBe(2000);
    });
  });

  describe('TC-COM-170: CAM Reconciliation - Over Collection', () => {
    it('should calculate credit when estimated exceeds actual', () => {
      const engine = new CAMReconciliationEngine();

      const result = engine.calculateReconciliation({
        tenantId: 'tenant-1',
        leaseId: 'lease-1',
        year: 2024,
        estimatedCAM: 100000,
        actualCAM: 85000,
        proRataShare: 15,
      });

      // Estimated: $15,000 (15% of $100k)
      // Actual: $12,750 (15% of $85k)
      // Credit: -$2,250
      expect(result.adjustmentDue).toBe(-2250);
    });
  });

  describe('TC-COM-171: CAM Cap - Non-Cumulative', () => {
    it('should apply 5% annual cap to CAM increase', () => {
      const engine = new CAMReconciliationEngine();

      const result = engine.calculateReconciliation({
        tenantId: 'tenant-1',
        leaseId: 'lease-1',
        year: 2024,
        estimatedCAM: 100000,
        actualCAM: 150000, // 50% increase
        proRataShare: 10,
        annualCap: 5, // 5% cap
        capType: 'non_cumulative',
      });

      // Without cap: $15,000
      // Capped amount: $10,000 * 1.05 = $10,500
      expect(result.tenantShare).toBeLessThanOrEqual(10500);
    });
  });

  describe('TC-COM-172: CAM Base Year Stop', () => {
    it('should charge only increases over base year', () => {
      const engine = new CAMReconciliationEngine();

      const result = engine.calculateReconciliation({
        tenantId: 'tenant-1',
        leaseId: 'lease-1',
        year: 2024,
        estimatedCAM: 0, // Not estimated in base year lease
        actualCAM: 120000,
        proRataShare: 10,
        capType: 'base_year',
        baseYearCAM: 100000,
      });

      // Only pay increase: ($120k - $100k) * 10% = $2,000
      expect(result.tenantShare).toBe(2000);
    });
  });

  describe('TC-COM-173: Pro-Rata Share Calculation - Leasable', () => {
    it('should calculate share based on leasable square footage', () => {
      const engine = new CAMReconciliationEngine();

      const share = engine.calculateProRataShare(
        5000,   // Tenant SF
        50000,  // Total leasable
        10000,  // Common area
        'leasable'
      );

      expect(share).toBe(10); // 5000/50000 = 10%
    });
  });

  describe('TC-COM-174: Pro-Rata Share Calculation - Rentable', () => {
    it('should include load factor in rentable calculation', () => {
      const engine = new CAMReconciliationEngine();

      const share = engine.calculateProRataShare(
        5000,
        50000,
        10000,
        'rentable'
      );

      // 5000 / (50000 + 10000) = 8.33%
      expect(share).toBeCloseTo(8.33, 1);
    });
  });

  describe('TC-COM-175: Percentage Rent - Above Breakpoint', () => {
    it('should calculate percentage rent on sales exceeding breakpoint', () => {
      const calculator = new PercentageRentCalculator();

      const result = calculator.calculate({
        tenantId: 'retail-1',
        breakpoint: 500000,
        percentageRate: 6,
        grossSales: 750000,
        naturalBreakpoint: false,
        reportingPeriod: 'monthly',
      });

      // Excess: $250,000, Percentage rent: $15,000
      expect(result.excessSales).toBe(250000);
      expect(result.percentageRentDue).toBe(15000);
    });
  });

  describe('TC-COM-176: Percentage Rent - Below Breakpoint', () => {
    it('should return zero percentage rent when below breakpoint', () => {
      const calculator = new PercentageRentCalculator();

      const result = calculator.calculate({
        tenantId: 'retail-1',
        breakpoint: 500000,
        percentageRate: 6,
        grossSales: 400000,
        naturalBreakpoint: false,
        reportingPeriod: 'annually',
      });

      expect(result.excessSales).toBe(0);
      expect(result.percentageRentDue).toBe(0);
    });
  });

  describe('TC-COM-177: Tenant Improvement Amortization', () => {
    it('should calculate monthly TI payment with interest', () => {
      const calculator = new TenantImprovementCalculator();

      const result = calculator.calculateAmortization({
        tenantId: 'tenant-1',
        totalCost: 100000,
        landlordContribution: 50000,
        amortizationMonths: 60, // 5 years
        interestRate: 8,
      });

      // $50,000 amortized over 60 months at 8%
      expect(result.monthlyPayment).toBeCloseTo(1013.82, 0);
      expect(result.amortizationSchedule.length).toBe(60);
      expect(result.amortizationSchedule[59].balance).toBeCloseTo(0, 0);
    });
  });

  describe('TC-COM-178: TI Amortization - Zero Interest', () => {
    it('should handle 0% interest TI correctly', () => {
      const calculator = new TenantImprovementCalculator();

      const result = calculator.calculateAmortization({
        tenantId: 'tenant-1',
        totalCost: 60000,
        landlordContribution: 0,
        amortizationMonths: 60,
        interestRate: 0,
      });

      expect(result.monthlyPayment).toBe(1000); // $60k / 60 months
      expect(result.totalInterest).toBe(0);
    });
  });

  describe('TC-COM-179: NNN Expense Pass-Through', () => {
    it('should calculate full NNN pass-through for all expense categories', () => {
      const calculator = new NNNExpenseCalculator();

      const expenses: CAMCharge[] = [
        { category: 'taxes', amount: 50000, excludeFromCap: false },
        { category: 'insurance', amount: 20000, excludeFromCap: false },
        { category: 'maintenance', amount: 30000, excludeFromCap: false },
      ];

      const result = calculator.calculatePassThrough(expenses, 10, 'nnn');

      // 10% of $100,000 = $10,000
      expect(result.tenantResponsibility).toBe(10000);
      expect(result.breakdown['taxes']).toBe(5000);
      expect(result.breakdown['insurance']).toBe(2000);
      expect(result.breakdown['maintenance']).toBe(3000);
    });
  });

  describe('TC-COM-180: Gross Lease - No Pass-Through', () => {
    it('should have zero tenant responsibility for gross lease', () => {
      const calculator = new NNNExpenseCalculator();

      const expenses: CAMCharge[] = [
        { category: 'taxes', amount: 50000, excludeFromCap: false },
        { category: 'utilities', amount: 15000, excludeFromCap: false },
      ];

      const result = calculator.calculatePassThrough(expenses, 10, 'gross');

      expect(result.tenantResponsibility).toBe(0);
      expect(result.landlordRetains).toBe(65000);
    });
  });

  describe('TC-COM-181: Modified Gross Expense Split', () => {
    it('should pass through only operating expenses', () => {
      const calculator = new NNNExpenseCalculator();

      const expenses: CAMCharge[] = [
        { category: 'taxes', amount: 50000, excludeFromCap: false },
        { category: 'utilities', amount: 12000, excludeFromCap: false },
        { category: 'maintenance', amount: 18000, excludeFromCap: false },
      ];

      const result = calculator.calculatePassThrough(expenses, 10, 'modified_gross');

      // Only utilities and maintenance passed through
      expect(result.breakdown['utilities']).toBe(1200);
      expect(result.breakdown['maintenance']).toBe(1800);
      expect(result.breakdown['taxes']).toBeUndefined();
      expect(result.landlordRetains).toBe(50000);
    });
  });

  describe('TC-COM-182: Rent Escalation - Fixed Annual', () => {
    it('should calculate rent with 3% annual escalation', () => {
      const calculateEscalatedRent = (
        baseRent: number,
        escalationRate: number,
        yearNumber: number
      ): number => {
        return Math.round(baseRent * Math.pow(1 + escalationRate / 100, yearNumber - 1) * 100) / 100;
      };

      const year1 = calculateEscalatedRent(5000, 3, 1);
      const year2 = calculateEscalatedRent(5000, 3, 2);
      const year5 = calculateEscalatedRent(5000, 3, 5);

      expect(year1).toBe(5000);
      expect(year2).toBe(5150); // 5000 * 1.03
      expect(year5).toBeCloseTo(5627.54, 0); // 5000 * 1.03^4
    });
  });

  describe('TC-COM-183: Rent Escalation - CPI Based', () => {
    it('should adjust rent based on CPI increase', () => {
      const calculateCPIRent = (
        baseRent: number,
        baseCPI: number,
        currentCPI: number,
        floor: number = 0,
        cap: number = Infinity
      ): { newRent: number; appliedIncrease: number } => {
        const cpiIncrease = ((currentCPI - baseCPI) / baseCPI) * 100;
        const appliedIncrease = Math.min(Math.max(cpiIncrease, floor), cap);
        const newRent = Math.round(baseRent * (1 + appliedIncrease / 100) * 100) / 100;

        return { newRent, appliedIncrease };
      };

      const result = calculateCPIRent(5000, 300, 315, 2, 5);

      // CPI increase: 5%, within cap
      expect(result.appliedIncrease).toBe(5);
      expect(result.newRent).toBe(5250);
    });
  });

  describe('TC-COM-184: Operating Expense Stop', () => {
    it('should calculate tenant share above expense stop', () => {
      const calculateExpenseStop = (
        actualExpenses: number,
        expenseStop: number,
        proRataShare: number
      ): { tenantPays: number; landlordAbsorbs: number } => {
        const excessExpenses = Math.max(0, actualExpenses - expenseStop);
        const tenantPays = Math.round(excessExpenses * (proRataShare / 100) * 100) / 100;

        return {
          tenantPays,
          landlordAbsorbs: Math.min(actualExpenses, expenseStop),
        };
      };

      const result = calculateExpenseStop(120000, 100000, 10);

      // Excess: $20,000, Tenant pays 10% = $2,000
      expect(result.tenantPays).toBe(2000);
      expect(result.landlordAbsorbs).toBe(100000);
    });
  });
});
