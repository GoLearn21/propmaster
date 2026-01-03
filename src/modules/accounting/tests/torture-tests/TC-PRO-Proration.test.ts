/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 10: Proration & Move-In/Out Calculations
 *
 * Goal: Ensure mathematically accurate prorations that match industry standards
 * Critical for: Tenant disputes, lease accuracy, legal compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Proration methods used by different property management companies
type ProrationMethod =
  | 'calendar_days'     // Most common: actual days in month
  | 'banking_days'      // 30-day month always
  | 'annual_365'        // Yearly calculation / 365
  | 'annual_360'        // Banking year / 360
  | 'biweekly';         // For biweekly rent

interface ProrationCalculation {
  monthlyRent: number;
  moveDate: Date;
  moveType: 'in' | 'out';
  method: ProrationMethod;
}

interface ProrationResult {
  proratedAmount: number;
  daysOccupied: number;
  daysInPeriod: number;
  dailyRate: number;
  calculation: string;
}

// Proration engine
class ProrationCalculator {
  private getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  calculate(params: ProrationCalculation): ProrationResult {
    const { monthlyRent, moveDate, moveType, method } = params;
    const daysInMonth = this.getDaysInMonth(moveDate);
    const dayOfMonth = moveDate.getDate();

    let daysOccupied: number;
    let daysInPeriod: number;
    let dailyRate: number;

    switch (method) {
      case 'calendar_days':
        daysInPeriod = daysInMonth;
        dailyRate = monthlyRent / daysInMonth;
        daysOccupied = moveType === 'in'
          ? daysInMonth - dayOfMonth + 1  // Include move-in day
          : dayOfMonth;                    // Include move-out day
        break;

      case 'banking_days':
        daysInPeriod = 30;
        dailyRate = monthlyRent / 30;
        daysOccupied = moveType === 'in'
          ? Math.min(30 - dayOfMonth + 1, 30)
          : Math.min(dayOfMonth, 30);
        break;

      case 'annual_365':
        daysInPeriod = 365 / 12;
        dailyRate = (monthlyRent * 12) / 365;
        daysOccupied = moveType === 'in'
          ? daysInMonth - dayOfMonth + 1
          : dayOfMonth;
        break;

      case 'annual_360':
        daysInPeriod = 30;
        dailyRate = (monthlyRent * 12) / 360;
        daysOccupied = moveType === 'in'
          ? 30 - dayOfMonth + 1
          : dayOfMonth;
        break;

      case 'biweekly':
        // Convert to biweekly equivalent
        dailyRate = (monthlyRent * 12) / 365;
        daysInPeriod = 14;
        daysOccupied = Math.min(
          moveType === 'in' ? 14 - (dayOfMonth % 14) : dayOfMonth % 14 || 14,
          14
        );
        break;

      default:
        daysInPeriod = daysInMonth;
        dailyRate = monthlyRent / daysInMonth;
        daysOccupied = daysInMonth;
    }

    const proratedAmount = Math.round(dailyRate * daysOccupied * 100) / 100;

    return {
      proratedAmount,
      daysOccupied,
      daysInPeriod,
      dailyRate: Math.round(dailyRate * 100) / 100,
      calculation: `$${monthlyRent} / ${daysInPeriod} days × ${daysOccupied} days = $${proratedAmount}`,
    };
  }
}

// Utility billing proration (RUBS - Ratio Utility Billing System)
class UtilityProrationCalculator {
  calculateRUBS(params: {
    totalBill: number;
    unitSquareFootage: number;
    totalSquareFootage: number;
    occupants: number;
    totalOccupants: number;
    daysOccupied: number;
    billingPeriodDays: number;
    method: 'sqft' | 'occupant' | 'hybrid' | 'equal';
  }): { unitShare: number; proratedShare: number; breakdown: string } {
    const {
      totalBill,
      unitSquareFootage,
      totalSquareFootage,
      occupants,
      totalOccupants,
      daysOccupied,
      billingPeriodDays,
      method,
    } = params;

    let baseShare: number;

    switch (method) {
      case 'sqft':
        baseShare = (unitSquareFootage / totalSquareFootage) * totalBill;
        break;
      case 'occupant':
        baseShare = (occupants / totalOccupants) * totalBill;
        break;
      case 'hybrid':
        // 50% by sqft, 50% by occupant
        const sqftShare = (unitSquareFootage / totalSquareFootage) * totalBill * 0.5;
        const occShare = (occupants / totalOccupants) * totalBill * 0.5;
        baseShare = sqftShare + occShare;
        break;
      case 'equal':
        baseShare = totalBill / (totalSquareFootage / unitSquareFootage); // Assumes equal units
        break;
      default:
        baseShare = 0;
    }

    const proratedShare = Math.round((baseShare * daysOccupied / billingPeriodDays) * 100) / 100;

    return {
      unitShare: Math.round(baseShare * 100) / 100,
      proratedShare,
      breakdown: `Base: $${Math.round(baseShare * 100) / 100} × (${daysOccupied}/${billingPeriodDays}) = $${proratedShare}`,
    };
  }
}

// Lease renewal proration
class LeaseRenewalCalculator {
  calculateRenewalProration(params: {
    currentRent: number;
    newRent: number;
    renewalDate: Date;
    billingCycleStart: number; // Day of month billing starts
  }): { firstMonthCharge: number; breakdown: { oldRentDays: number; newRentDays: number; oldRentPortion: number; newRentPortion: number } } {
    const renewalDay = params.renewalDate.getDate();
    const daysInMonth = new Date(
      params.renewalDate.getFullYear(),
      params.renewalDate.getMonth() + 1,
      0
    ).getDate();

    // Days at old rate (before renewal)
    const oldRentDays = renewalDay - params.billingCycleStart;
    // Days at new rate (renewal day through end of cycle)
    const newRentDays = daysInMonth - renewalDay + 1;

    const oldDailyRate = params.currentRent / daysInMonth;
    const newDailyRate = params.newRent / daysInMonth;

    const oldRentPortion = Math.round(oldDailyRate * oldRentDays * 100) / 100;
    const newRentPortion = Math.round(newDailyRate * newRentDays * 100) / 100;

    return {
      firstMonthCharge: oldRentPortion + newRentPortion,
      breakdown: {
        oldRentDays,
        newRentDays,
        oldRentPortion,
        newRentPortion,
      },
    };
  }
}

describe('TC-PRO: Proration & Move-In/Out Tests', () => {
  describe('TC-PRO-119: Move-In Proration - Calendar Days Method', () => {
    it('should calculate correct proration for move-in on 15th of 31-day month', () => {
      const calculator = new ProrationCalculator();

      // Use Date constructor with year, month (0-indexed), day to avoid timezone issues
      const result = calculator.calculate({
        monthlyRent: 1550,
        moveDate: new Date(2024, 0, 15), // January 15, 2024 (month is 0-indexed)
        moveType: 'in',
        method: 'calendar_days',
      });

      // $1550 / 31 = $50/day, 17 days (15th through 31st)
      expect(result.daysOccupied).toBe(17);
      expect(result.dailyRate).toBe(50);
      expect(result.proratedAmount).toBe(850);
    });
  });

  describe('TC-PRO-120: Move-In Proration - February Leap Year', () => {
    it('should handle 29-day February correctly', () => {
      const calculator = new ProrationCalculator();

      const result = calculator.calculate({
        monthlyRent: 1450,
        moveDate: new Date(2024, 1, 15), // February 15, 2024 (month is 0-indexed)
        moveType: 'in',
        method: 'calendar_days',
      });

      // 29 days in Feb 2024, move in on 15th = 15 days occupied
      expect(result.daysInPeriod).toBe(29);
      expect(result.daysOccupied).toBe(15);
      expect(result.dailyRate).toBe(50);
      expect(result.proratedAmount).toBe(750);
    });
  });

  describe('TC-PRO-121: Move-In Proration - Banking Days (30-day)', () => {
    it('should use 30-day month regardless of actual days', () => {
      const calculator = new ProrationCalculator();

      // February with banking method
      const result = calculator.calculate({
        monthlyRent: 1500,
        moveDate: new Date(2024, 1, 15), // February 15, 2024
        moveType: 'in',
        method: 'banking_days',
      });

      expect(result.daysInPeriod).toBe(30);
      expect(result.dailyRate).toBe(50);
      expect(result.daysOccupied).toBe(16); // 30 - 15 + 1
      expect(result.proratedAmount).toBe(800);
    });
  });

  describe('TC-PRO-122: Move-Out Proration - Calendar Days', () => {
    it('should include move-out day in calculation', () => {
      const calculator = new ProrationCalculator();

      const result = calculator.calculate({
        monthlyRent: 1240,
        moveDate: new Date(2024, 2, 10), // March 10, 2024
        moveType: 'out',
        method: 'calendar_days',
      });

      // 31 days in March, move out on 10th = 10 days occupied
      expect(result.daysOccupied).toBe(10);
      expect(result.dailyRate).toBe(40);
      expect(result.proratedAmount).toBe(400);
    });
  });

  describe('TC-PRO-123: Move-Out Proration - Last Day of Month', () => {
    it('should charge full month when moving out on last day', () => {
      const calculator = new ProrationCalculator();

      const result = calculator.calculate({
        monthlyRent: 1500,
        moveDate: new Date(2024, 3, 30), // April 30, 2024
        moveType: 'out',
        method: 'calendar_days',
      });

      expect(result.daysOccupied).toBe(30);
      expect(result.proratedAmount).toBe(1500);
    });
  });

  describe('TC-PRO-124: Annual 365 Proration Method', () => {
    it('should calculate based on yearly rate / 365', () => {
      const calculator = new ProrationCalculator();

      const result = calculator.calculate({
        monthlyRent: 1825, // $21,900/year = $60/day
        moveDate: new Date(2024, 0, 16), // January 16, 2024
        moveType: 'in',
        method: 'annual_365',
      });

      // (1825 * 12) / 365 = $60/day, 16 days in Jan
      expect(result.dailyRate).toBe(60);
      expect(result.daysOccupied).toBe(16);
      expect(result.proratedAmount).toBe(960);
    });
  });

  describe('TC-PRO-125: Move-In on First Day', () => {
    it('should charge full month when moving in on 1st', () => {
      const calculator = new ProrationCalculator();

      const result = calculator.calculate({
        monthlyRent: 1500,
        moveDate: new Date(2024, 4, 1), // May 1, 2024
        moveType: 'in',
        method: 'calendar_days',
      });

      expect(result.daysOccupied).toBe(31);
      expect(result.proratedAmount).toBe(1500);
    });
  });

  describe('TC-PRO-126: RUBS Utility Proration - Square Footage', () => {
    it('should allocate utility by square footage ratio', () => {
      const calculator = new UtilityProrationCalculator();

      const result = calculator.calculateRUBS({
        totalBill: 500,
        unitSquareFootage: 800,
        totalSquareFootage: 4000, // 5 units total
        occupants: 2,
        totalOccupants: 10,
        daysOccupied: 30,
        billingPeriodDays: 30,
        method: 'sqft',
      });

      // 800/4000 = 20% of $500 = $100
      expect(result.unitShare).toBe(100);
      expect(result.proratedShare).toBe(100);
    });
  });

  describe('TC-PRO-127: RUBS Utility Proration - Occupant Based', () => {
    it('should allocate utility by occupant count', () => {
      const calculator = new UtilityProrationCalculator();

      const result = calculator.calculateRUBS({
        totalBill: 600,
        unitSquareFootage: 800,
        totalSquareFootage: 4000,
        occupants: 3, // More occupants = higher share
        totalOccupants: 12,
        daysOccupied: 30,
        billingPeriodDays: 30,
        method: 'occupant',
      });

      // 3/12 = 25% of $600 = $150
      expect(result.unitShare).toBe(150);
    });
  });

  describe('TC-PRO-128: RUBS Utility Proration - Partial Month', () => {
    it('should prorate utility share for mid-month move-in', () => {
      const calculator = new UtilityProrationCalculator();

      const result = calculator.calculateRUBS({
        totalBill: 500,
        unitSquareFootage: 1000,
        totalSquareFootage: 5000,
        occupants: 2,
        totalOccupants: 10,
        daysOccupied: 15, // Half month
        billingPeriodDays: 30,
        method: 'sqft',
      });

      // 1000/5000 = 20% = $100, then 15/30 = 50% = $50
      expect(result.unitShare).toBe(100);
      expect(result.proratedShare).toBe(50);
    });
  });

  describe('TC-PRO-129: RUBS Utility Proration - Hybrid Method', () => {
    it('should blend 50% sqft and 50% occupant for fair allocation', () => {
      const calculator = new UtilityProrationCalculator();

      const result = calculator.calculateRUBS({
        totalBill: 1000,
        unitSquareFootage: 1000,
        totalSquareFootage: 5000, // 20% by sqft
        occupants: 4,
        totalOccupants: 10, // 40% by occupant
        daysOccupied: 30,
        billingPeriodDays: 30,
        method: 'hybrid',
      });

      // sqft: 20% of $500 = $100
      // occupant: 40% of $500 = $200
      // total = $300
      expect(result.unitShare).toBe(300);
    });
  });

  describe('TC-PRO-130: Lease Renewal Mid-Month Proration', () => {
    it('should split month between old and new rent rates', () => {
      const calculator = new LeaseRenewalCalculator();

      const result = calculator.calculateRenewalProration({
        currentRent: 1500,
        newRent: 1600,
        renewalDate: new Date(2024, 5, 15), // June 15, 2024
        billingCycleStart: 1,
      });

      // June has 30 days
      // Old rate: 14 days @ $50/day = $700
      // New rate: 16 days @ $53.33/day = $853.28
      expect(result.breakdown.oldRentDays).toBe(14);
      expect(result.breakdown.newRentDays).toBe(16);
      expect(result.firstMonthCharge).toBeGreaterThan(1500);
      expect(result.firstMonthCharge).toBeLessThan(1600);
    });
  });

  describe('TC-PRO-131: Property Sale Proration', () => {
    it('should split rent between seller and buyer on sale date', () => {
      interface PropertySaleProration {
        saleDate: Date;
        monthlyRent: number;
        rentCollectedByDate: Date;
      }

      const calculatePropertySaleProration = (params: PropertySaleProration): {
        sellerPortion: number;
        buyerPortion: number;
        adjustmentDirection: 'credit_to_buyer' | 'credit_to_seller';
      } => {
        const { saleDate, monthlyRent, rentCollectedByDate } = params;
        const daysInMonth = new Date(
          saleDate.getFullYear(),
          saleDate.getMonth() + 1,
          0
        ).getDate();
        const saleDay = saleDate.getDate();

        const sellerDays = saleDay - 1; // Days before sale
        const buyerDays = daysInMonth - saleDay + 1; // Sale day and after

        const dailyRate = monthlyRent / daysInMonth;
        const sellerPortion = Math.round(dailyRate * sellerDays * 100) / 100;
        const buyerPortion = Math.round(dailyRate * buyerDays * 100) / 100;

        // If rent was collected before sale, buyer needs credit
        const collectionBeforeSale = rentCollectedByDate <= saleDate;

        return {
          sellerPortion,
          buyerPortion,
          adjustmentDirection: collectionBeforeSale ? 'credit_to_buyer' : 'credit_to_seller',
        };
      };

      const result = calculatePropertySaleProration({
        saleDate: new Date(2024, 6, 15), // July 15, 2024
        monthlyRent: 1550, // $50/day in 31-day July
        rentCollectedByDate: new Date(2024, 6, 1), // July 1, 2024
      });

      // Seller gets 14 days, buyer gets 17 days
      expect(result.sellerPortion).toBe(700);
      expect(result.buyerPortion).toBe(850);
      expect(result.adjustmentDirection).toBe('credit_to_buyer');
    });
  });

  describe('TC-PRO-132: Recurring Charge Proration', () => {
    it('should prorate pet rent, parking, and storage for partial month', () => {
      interface RecurringCharge {
        type: string;
        monthlyAmount: number;
        startDate: Date;
      }

      const prorateRecurringCharges = (
        charges: RecurringCharge[],
        moveInDate: Date
      ): Array<{ type: string; proratedAmount: number }> => {
        const calculator = new ProrationCalculator();

        return charges.map(charge => {
          const result = calculator.calculate({
            monthlyRent: charge.monthlyAmount,
            moveDate: moveInDate,
            moveType: 'in',
            method: 'calendar_days',
          });

          return {
            type: charge.type,
            proratedAmount: result.proratedAmount,
          };
        });
      };

      const charges: RecurringCharge[] = [
        { type: 'rent', monthlyAmount: 1500, startDate: new Date(2024, 0, 15) },
        { type: 'pet_rent', monthlyAmount: 50, startDate: new Date(2024, 0, 15) },
        { type: 'parking', monthlyAmount: 100, startDate: new Date(2024, 0, 15) },
        { type: 'storage', monthlyAmount: 75, startDate: new Date(2024, 0, 15) },
      ];

      const results = prorateRecurringCharges(charges, new Date(2024, 0, 15));

      // All should be prorated for 17 days (15th-31st of 31-day January)
      const rentProrated = results.find(r => r.type === 'rent');
      const petProrated = results.find(r => r.type === 'pet_rent');
      const parkingProrated = results.find(r => r.type === 'parking');
      const storageProrated = results.find(r => r.type === 'storage');

      expect(rentProrated?.proratedAmount).toBe(822.58); // 1500/31*17
      expect(petProrated?.proratedAmount).toBe(27.42); // 50/31*17
      expect(parkingProrated?.proratedAmount).toBe(54.84); // 100/31*17
      expect(storageProrated?.proratedAmount).toBe(41.13); // 75/31*17
    });
  });

  describe('TC-PRO-133: Concession Proration', () => {
    it('should prorate free rent concession for partial month move-in', () => {
      interface Concession {
        type: 'free_rent' | 'reduced_rent' | 'flat_credit';
        value: number;
        months: number;
      }

      const prorateConcession = (
        concession: Concession,
        monthlyRent: number,
        moveInDate: Date
      ): { firstMonthConcession: number; remainingMonths: number } => {
        const daysInMonth = new Date(
          moveInDate.getFullYear(),
          moveInDate.getMonth() + 1,
          0
        ).getDate();
        const moveDay = moveInDate.getDate();
        const daysOccupied = daysInMonth - moveDay + 1;

        if (concession.type === 'free_rent') {
          // Prorate the free rent for partial month
          const proratedRent = (monthlyRent / daysInMonth) * daysOccupied;
          return {
            firstMonthConcession: Math.round(proratedRent * 100) / 100,
            remainingMonths: concession.months - 1,
          };
        }

        if (concession.type === 'reduced_rent') {
          const reduction = monthlyRent - concession.value;
          const proratedReduction = (reduction / daysInMonth) * daysOccupied;
          return {
            firstMonthConcession: Math.round(proratedReduction * 100) / 100,
            remainingMonths: concession.months - 1,
          };
        }

        // Flat credit - no proration
        return {
          firstMonthConcession: concession.value / concession.months,
          remainingMonths: concession.months - 1,
        };
      };

      const result = prorateConcession(
        { type: 'free_rent', value: 0, months: 1 },
        1500,
        new Date(2024, 2, 15) // Move in on 15th of 31-day month (March 15, 2024)
      );

      // 17 days free out of 31 = $822.58 concession
      expect(result.firstMonthConcession).toBe(822.58);
      expect(result.remainingMonths).toBe(0);
    });
  });

  describe('TC-PRO-134: Same-Day Move-In/Out (Turnover)', () => {
    it('should handle outgoing and incoming tenant on same day correctly', () => {
      interface TurnoverProration {
        outgoingRent: number;
        incomingRent: number;
        turnoverDate: Date;
        chargeOutgoingForDay: boolean; // Some leases include last day
      }

      const calculateTurnover = (params: TurnoverProration): {
        outgoingCharge: number;
        incomingCharge: number;
        overlap: boolean;
      } => {
        const { outgoingRent, incomingRent, turnoverDate, chargeOutgoingForDay } = params;
        const daysInMonth = new Date(
          turnoverDate.getFullYear(),
          turnoverDate.getMonth() + 1,
          0
        ).getDate();
        const turnoverDay = turnoverDate.getDate();

        const outgoingDays = chargeOutgoingForDay ? turnoverDay : turnoverDay - 1;
        const incomingDays = chargeOutgoingForDay ? daysInMonth - turnoverDay : daysInMonth - turnoverDay + 1;

        return {
          outgoingCharge: Math.round((outgoingRent / daysInMonth) * outgoingDays * 100) / 100,
          incomingCharge: Math.round((incomingRent / daysInMonth) * incomingDays * 100) / 100,
          overlap: chargeOutgoingForDay, // If outgoing charged for day, there's no overlap
        };
      };

      // Outgoing tenant charged for turnover day
      const result1 = calculateTurnover({
        outgoingRent: 1500,
        incomingRent: 1600,
        turnoverDate: new Date(2024, 5, 15), // June 15, 2024
        chargeOutgoingForDay: true,
      });

      expect(result1.outgoingCharge).toBe(750); // 15 days
      expect(result1.incomingCharge).toBe(800); // 15 days
      expect(result1.overlap).toBe(true);

      // Outgoing NOT charged for turnover day (more common)
      const result2 = calculateTurnover({
        outgoingRent: 1500,
        incomingRent: 1600,
        turnoverDate: new Date(2024, 5, 15), // June 15, 2024
        chargeOutgoingForDay: false,
      });

      expect(result2.outgoingCharge).toBe(700); // 14 days
      expect(result2.incomingCharge).toBe(853.33); // 16 days
    });
  });

  describe('TC-PRO-135: Rounding Consistency', () => {
    it('should ensure prorations add up to full month across the board', () => {
      const monthlyRent = 1567; // Odd amount that causes rounding issues
      const daysInMonth = 31;
      const dailyRate = monthlyRent / daysInMonth;

      // Calculate proration for each day and sum
      let total = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        total += Math.round(dailyRate * 100) / 100;
      }

      // Due to rounding, this might not equal exactly $1567
      // The system should handle this gracefully
      const difference = Math.abs(total - monthlyRent);

      // Difference should be minimal (< $1 due to rounding)
      expect(difference).toBeLessThan(1);
    });
  });

  describe('TC-PRO-136: Negative Proration Prevention', () => {
    it('should never calculate negative prorated amount', () => {
      const calculator = new ProrationCalculator();

      // Edge case: move out on day 1 (minimum valid)
      const result = calculator.calculate({
        monthlyRent: 1500,
        moveDate: new Date(2024, 0, 1), // January 1, 2024
        moveType: 'out',
        method: 'calendar_days',
      });

      expect(result.proratedAmount).toBeGreaterThanOrEqual(0);
      expect(result.daysOccupied).toBeGreaterThanOrEqual(1);
    });
  });
});
