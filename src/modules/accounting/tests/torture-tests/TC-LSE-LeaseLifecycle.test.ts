/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 16: Lease Lifecycle Events
 *
 * Goal: Handle renewals, terminations, SCRA compliance, subleases, conversions
 * Critical for: Revenue accuracy, legal compliance, tenant relations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Lease status types
type LeaseStatus =
  | 'pending'
  | 'active'
  | 'month_to_month'
  | 'renewal_pending'
  | 'terminating'
  | 'terminated'
  | 'eviction'
  | 'sublease';

interface Lease {
  id: string;
  tenantId: string;
  unitId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  status: LeaseStatus;
  renewalOffered?: boolean;
  terminationDate?: Date;
  terminationReason?: string;
}

interface LeaseRenewal {
  originalLeaseId: string;
  newRent: number;
  rentIncrease: number;
  increasePercent: number;
  newEndDate: Date;
  renewalType: 'fixed_term' | 'month_to_month';
  depositAdjustment: number;
}

interface SCRATermination {
  tenantId: string;
  leaseId: string;
  ordersDate: Date;
  noticeDate: Date;
  terminationDate: Date;
  lastRentDue: Date;
  depositReturnDue: Date;
  validSCRA: boolean;
}

interface Sublease {
  originalLeaseId: string;
  subtenantId: string;
  startDate: Date;
  endDate: Date;
  subletRent: number;
  landlordApproved: boolean;
  profitAllowed: boolean;
}

// Lease Renewal Calculator
class LeaseRenewalCalculator {
  calculateRenewal(
    currentLease: Lease,
    newRent: number,
    renewalType: 'fixed_term' | 'month_to_month',
    newTermMonths: number = 12
  ): LeaseRenewal {
    const rentIncrease = newRent - currentLease.monthlyRent;
    const increasePercent = Math.round((rentIncrease / currentLease.monthlyRent) * 10000) / 100;

    const newEndDate = new Date(currentLease.endDate);
    if (renewalType === 'fixed_term') {
      newEndDate.setMonth(newEndDate.getMonth() + newTermMonths);
    }

    // Some states cap deposit at new rent level
    const maxDeposit = newRent * 2;
    const depositAdjustment = Math.max(0, maxDeposit - currentLease.securityDeposit);

    return {
      originalLeaseId: currentLease.id,
      newRent,
      rentIncrease,
      increasePercent,
      newEndDate,
      renewalType,
      depositAdjustment,
    };
  }

  validateRentIncrease(
    increasePercent: number,
    jurisdiction: string,
    rentControlled: boolean
  ): { valid: boolean; maxAllowed: number; issue?: string } {
    const rentControlLimits: Record<string, number> = {
      'SF': 5.5,        // San Francisco
      'LA': 4,          // Los Angeles
      'NYC': 3.25,      // New York City
      'Oakland': 10,    // Oakland
      'Portland': 10,   // Portland
    };

    if (!rentControlled) {
      return { valid: true, maxAllowed: Infinity };
    }

    const maxAllowed = rentControlLimits[jurisdiction] || 5;

    if (increasePercent > maxAllowed) {
      return {
        valid: false,
        maxAllowed,
        issue: `Rent control limits increase to ${maxAllowed}% in ${jurisdiction}`,
      };
    }

    return { valid: true, maxAllowed };
  }
}

// SCRA (Servicemembers Civil Relief Act) Handler
class SCRAHandler {
  validateSCRATermination(
    ordersDate: Date,
    noticeDate: Date,
    requestedTerminationDate: Date
  ): SCRATermination {
    // SCRA requires written notice + 30 days
    const minimumTerminationDate = new Date(noticeDate);
    minimumTerminationDate.setDate(minimumTerminationDate.getDate() + 30);

    // Termination effective on next rent payment date after 30 days
    const nextRentDate = new Date(minimumTerminationDate);
    nextRentDate.setDate(1);
    if (minimumTerminationDate.getDate() > 1) {
      nextRentDate.setMonth(nextRentDate.getMonth() + 1);
    }

    const actualTerminationDate = requestedTerminationDate >= minimumTerminationDate
      ? requestedTerminationDate
      : minimumTerminationDate;

    // Last rent due for month of termination (prorated)
    const lastRentDue = new Date(actualTerminationDate);
    lastRentDue.setDate(1);

    // Deposit must be returned within 30 days
    const depositReturnDue = new Date(actualTerminationDate);
    depositReturnDue.setDate(depositReturnDue.getDate() + 30);

    return {
      tenantId: 'tenant-1',
      leaseId: 'lease-1',
      ordersDate,
      noticeDate,
      terminationDate: actualTerminationDate,
      lastRentDue,
      depositReturnDue,
      validSCRA: ordersDate >= new Date(noticeDate.getTime() - 90 * 24 * 60 * 60 * 1000),
    };
  }

  calculateFinalRent(
    monthlyRent: number,
    terminationDate: Date
  ): { proratedRent: number; daysCharged: number } {
    const daysInMonth = new Date(
      terminationDate.getFullYear(),
      terminationDate.getMonth() + 1,
      0
    ).getDate();
    const daysCharged = terminationDate.getDate();

    return {
      proratedRent: Math.round((monthlyRent / daysInMonth) * daysCharged * 100) / 100,
      daysCharged,
    };
  }
}

// Early Termination Calculator
class EarlyTerminationCalculator {
  calculateTerminationFee(
    lease: Lease,
    terminationDate: Date,
    feeStructure: 'months' | 'percentage' | 'sliding_scale' | 'buyout',
    feeValue: number
  ): {
    fee: number;
    remainingObligation: number;
    mitigationCredit: number;
    netDue: number;
  } {
    const remainingMonths = Math.ceil(
      (lease.endDate.getTime() - terminationDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const remainingObligation = lease.monthlyRent * remainingMonths;

    let fee: number;

    switch (feeStructure) {
      case 'months':
        fee = lease.monthlyRent * feeValue;
        break;
      case 'percentage':
        fee = remainingObligation * (feeValue / 100);
        break;
      case 'sliding_scale':
        // Fee decreases as lease progresses
        const leaseMonths = Math.ceil(
          (lease.endDate.getTime() - lease.startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        const completedMonths = leaseMonths - remainingMonths;
        const scaleMultiplier = Math.max(0, 1 - (completedMonths / leaseMonths));
        fee = lease.monthlyRent * feeValue * scaleMultiplier;
        break;
      case 'buyout':
        fee = feeValue; // Flat buyout amount
        break;
      default:
        fee = lease.monthlyRent * 2;
    }

    // Landlord has duty to mitigate
    const estimatedRerentTime = 30; // days
    const mitigationCredit = Math.max(0, remainingObligation - (lease.monthlyRent * (estimatedRerentTime / 30)));

    return {
      fee: Math.round(fee * 100) / 100,
      remainingObligation: Math.round(remainingObligation * 100) / 100,
      mitigationCredit: Math.round(mitigationCredit * 100) / 100,
      netDue: Math.round(Math.min(fee, remainingObligation) * 100) / 100,
    };
  }
}

// Sublease Handler
class SubleaseHandler {
  validateSublease(
    originalLease: Lease,
    sublease: Sublease,
    currentDate?: Date
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const today = currentDate || new Date();

    if (!sublease.landlordApproved) {
      issues.push('Landlord approval required for sublease');
    }

    if (sublease.endDate > originalLease.endDate) {
      issues.push('Sublease cannot extend beyond original lease term');
    }

    if (sublease.startDate < today) {
      issues.push('Sublease start date cannot be in the past');
    }

    if (!sublease.profitAllowed && sublease.subletRent > originalLease.monthlyRent) {
      issues.push('Sublease rent cannot exceed original lease rent');
    }

    return { valid: issues.length === 0, issues };
  }

  calculateSubleaseAccounting(
    originalRent: number,
    subletRent: number,
    landlordApproved: boolean
  ): {
    tenantReceives: number;
    landlordReceives: number;
    profitSplit: number;
  } {
    if (!landlordApproved) {
      return { tenantReceives: 0, landlordReceives: originalRent, profitSplit: 0 };
    }

    const profit = Math.max(0, subletRent - originalRent);

    // Many leases require profit split with landlord
    const profitSplit = profit * 0.5; // 50/50 split

    return {
      tenantReceives: originalRent + (profit - profitSplit),
      landlordReceives: originalRent + profitSplit,
      profitSplit,
    };
  }
}

// Month-to-Month Conversion Handler
class MonthToMonthHandler {
  processConversion(
    lease: Lease,
    conversionDate: Date,
    rentAdjustment: number = 0,
    mtmPremium: number = 0
  ): {
    newRent: number;
    effectiveDate: Date;
    terminationNotice: number;
    autoRenewal: boolean;
  } {
    const newRent = lease.monthlyRent + rentAdjustment + mtmPremium;

    return {
      newRent,
      effectiveDate: conversionDate,
      terminationNotice: 30, // Standard 30-day notice
      autoRenewal: true,
    };
  }

  calculateMTMTermination(
    noticeDate: Date,
    requiredNoticeDays: number,
    rentDueDay: number = 1
  ): {
    terminationDate: Date;
    lastRentDue: Date;
    proratedFinalMonth: boolean;
  } {
    const minimumDate = new Date(noticeDate);
    minimumDate.setDate(minimumDate.getDate() + requiredNoticeDays);

    // Many jurisdictions require termination on rent due date
    const terminationDate = new Date(minimumDate);
    if (terminationDate.getDate() !== rentDueDay) {
      terminationDate.setMonth(terminationDate.getMonth() + 1);
      terminationDate.setDate(rentDueDay);
    }

    const lastRentDue = new Date(terminationDate);
    lastRentDue.setMonth(lastRentDue.getMonth() - 1);

    return {
      terminationDate,
      lastRentDue,
      proratedFinalMonth: terminationDate.getDate() !== rentDueDay,
    };
  }
}

describe('TC-LSE: Lease Lifecycle Events Tests', () => {
  describe('TC-LSE-217: Lease Renewal Calculation', () => {
    it('should calculate rent increase percentage correctly', () => {
      const calculator = new LeaseRenewalCalculator();

      const lease: Lease = {
        id: 'lease-1',
        tenantId: 'tenant-1',
        unitId: 'unit-1',
        startDate: new Date('2023-07-01'),
        endDate: new Date('2024-06-30'),
        monthlyRent: 1500,
        securityDeposit: 1500,
        status: 'active',
      };

      const renewal = calculator.calculateRenewal(lease, 1575, 'fixed_term', 12);

      expect(renewal.rentIncrease).toBe(75);
      expect(renewal.increasePercent).toBe(5);
    });
  });

  describe('TC-LSE-218: Rent Control Validation - Over Limit', () => {
    it('should reject rent increase exceeding rent control limit', () => {
      const calculator = new LeaseRenewalCalculator();

      const result = calculator.validateRentIncrease(8, 'LA', true);

      expect(result.valid).toBe(false);
      expect(result.maxAllowed).toBe(4);
      expect(result.issue).toContain('Rent control');
    });
  });

  describe('TC-LSE-219: Rent Control Validation - Within Limit', () => {
    it('should approve rent increase within limit', () => {
      const calculator = new LeaseRenewalCalculator();

      const result = calculator.validateRentIncrease(3, 'NYC', true);

      expect(result.valid).toBe(true);
    });
  });

  describe('TC-LSE-220: SCRA Termination - Valid', () => {
    it('should calculate correct SCRA termination timeline', () => {
      const handler = new SCRAHandler();

      const ordersDate = new Date('2024-06-01');
      const noticeDate = new Date('2024-06-15');
      const requestedTermination = new Date('2024-07-31');

      const result = handler.validateSCRATermination(ordersDate, noticeDate, requestedTermination);

      expect(result.validSCRA).toBe(true);
      // Termination should be at least 30 days from notice
      expect(result.terminationDate >= new Date('2024-07-15')).toBe(true);
    });
  });

  describe('TC-LSE-221: SCRA Final Rent Proration', () => {
    it('should prorate final month rent for SCRA termination', () => {
      const handler = new SCRAHandler();

      // Use explicit local date to avoid timezone issues
      const terminationDate = new Date(2024, 6, 15); // July 15, 2024 (month is 0-indexed)
      const result = handler.calculateFinalRent(1500, terminationDate);

      // 15 days out of 31 in July
      expect(result.daysCharged).toBe(15);
      expect(result.proratedRent).toBeCloseTo(725.81, 0);
    });
  });

  describe('TC-LSE-222: Early Termination Fee - Months Based', () => {
    it('should calculate 2-month termination fee', () => {
      const calculator = new EarlyTerminationCalculator();

      const lease: Lease = {
        id: 'lease-1',
        tenantId: 'tenant-1',
        unitId: 'unit-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        monthlyRent: 1500,
        securityDeposit: 1500,
        status: 'active',
      };

      const result = calculator.calculateTerminationFee(
        lease,
        new Date('2024-06-30'),
        'months',
        2
      );

      expect(result.fee).toBe(3000); // 2 months × $1500
    });
  });

  describe('TC-LSE-223: Early Termination Fee - Sliding Scale', () => {
    it('should reduce fee as lease nears completion', () => {
      const calculator = new EarlyTerminationCalculator();

      const lease: Lease = {
        id: 'lease-1',
        tenantId: 'tenant-1',
        unitId: 'unit-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        monthlyRent: 1500,
        securityDeposit: 1500,
        status: 'active',
      };

      // Terminate at month 9 of 12
      const result = calculator.calculateTerminationFee(
        lease,
        new Date('2024-09-30'),
        'sliding_scale',
        2
      );

      // 3 months remaining of 12 = 25% of full fee
      expect(result.fee).toBeLessThan(3000);
    });
  });

  describe('TC-LSE-224: Sublease Validation - Approved', () => {
    it('should approve valid sublease within lease term', () => {
      const handler = new SubleaseHandler();

      const lease: Lease = {
        id: 'lease-1',
        tenantId: 'tenant-1',
        unitId: 'unit-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        monthlyRent: 1500,
        securityDeposit: 1500,
        status: 'active',
      };

      const sublease: Sublease = {
        originalLeaseId: 'lease-1',
        subtenantId: 'subtenant-1',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-11-30'),
        subletRent: 1500,
        landlordApproved: true,
        profitAllowed: false,
      };

      // Pass currentDate before sublease start to validate properly
      const result = handler.validateSublease(lease, sublease, new Date('2024-05-01'));

      expect(result.valid).toBe(true);
    });
  });

  describe('TC-LSE-225: Sublease Validation - Extends Beyond Term', () => {
    it('should reject sublease extending beyond original term', () => {
      const handler = new SubleaseHandler();

      const lease: Lease = {
        id: 'lease-1',
        tenantId: 'tenant-1',
        unitId: 'unit-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        monthlyRent: 1500,
        securityDeposit: 1500,
        status: 'active',
      };

      const sublease: Sublease = {
        originalLeaseId: 'lease-1',
        subtenantId: 'subtenant-1',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2025-02-28'), // Beyond original lease
        subletRent: 1500,
        landlordApproved: true,
        profitAllowed: false,
      };

      const result = handler.validateSublease(lease, sublease);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('beyond'))).toBe(true);
    });
  });

  describe('TC-LSE-226: Sublease Profit Split', () => {
    it('should split sublease profit 50/50 with landlord', () => {
      const handler = new SubleaseHandler();

      const result = handler.calculateSubleaseAccounting(1500, 2000, true);

      // $500 profit, split 50/50
      expect(result.profitSplit).toBe(250);
      expect(result.landlordReceives).toBe(1750); // 1500 + 250
      expect(result.tenantReceives).toBe(1750); // 1500 + 250
    });
  });

  describe('TC-LSE-227: Month-to-Month Conversion', () => {
    it('should apply MTM premium on conversion', () => {
      const handler = new MonthToMonthHandler();

      const lease: Lease = {
        id: 'lease-1',
        tenantId: 'tenant-1',
        unitId: 'unit-1',
        startDate: new Date('2023-07-01'),
        endDate: new Date('2024-06-30'),
        monthlyRent: 1500,
        securityDeposit: 1500,
        status: 'active',
      };

      const result = handler.processConversion(lease, new Date('2024-07-01'), 0, 150);

      expect(result.newRent).toBe(1650); // $1500 + $150 MTM premium
      expect(result.terminationNotice).toBe(30);
    });
  });

  describe('TC-LSE-228: MTM Termination Date Calculation', () => {
    it('should align termination with rent due date', () => {
      const handler = new MonthToMonthHandler();

      // Notice given on June 10, 30-day notice, rent due 1st
      const result = handler.calculateMTMTermination(
        new Date('2024-06-10'),
        30,
        1
      );

      // 30 days from June 10 = July 10
      // But termination aligns to rent due date = August 1
      expect(result.terminationDate.getDate()).toBe(1);
      expect(result.terminationDate.getMonth()).toBe(7); // August
    });
  });

  describe('TC-LSE-229: Lease Expiration Notice Tracking', () => {
    it('should track required notice periods before expiration', () => {
      interface ExpirationNotice {
        leaseId: string;
        expirationDate: Date;
        renewalNoticeRequired: number;
        nonRenewalNoticeRequired: number;
        noticeSentDate?: Date;
        noticeType?: 'renewal' | 'non_renewal';
      }

      const checkNoticeCompliance = (notice: ExpirationNotice, today: Date): {
        renewalNoticeDeadline: Date;
        nonRenewalNoticeDeadline: Date;
        daysTillExpiration: number;
        compliant: boolean;
        urgentAction?: string;
      } => {
        const daysToExpiration = Math.floor(
          (notice.expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const renewalDeadline = new Date(notice.expirationDate);
        renewalDeadline.setDate(renewalDeadline.getDate() - notice.renewalNoticeRequired);

        const nonRenewalDeadline = new Date(notice.expirationDate);
        nonRenewalDeadline.setDate(nonRenewalDeadline.getDate() - notice.nonRenewalNoticeRequired);

        const compliant = notice.noticeSentDate !== undefined &&
          notice.noticeSentDate <= (notice.noticeType === 'renewal' ? renewalDeadline : nonRenewalDeadline);

        let urgentAction: string | undefined;
        if (!notice.noticeSentDate) {
          if (today > nonRenewalDeadline) {
            urgentAction = 'OVERDUE: Non-renewal notice deadline passed';
          } else if (today > renewalDeadline) {
            urgentAction = 'Send renewal offer immediately';
          }
        }

        return {
          renewalNoticeDeadline: renewalDeadline,
          nonRenewalNoticeDeadline: nonRenewalDeadline,
          daysTillExpiration: daysToExpiration,
          compliant,
          urgentAction,
        };
      };

      const notice: ExpirationNotice = {
        leaseId: 'lease-1',
        expirationDate: new Date('2024-08-31'),
        renewalNoticeRequired: 60,
        nonRenewalNoticeRequired: 30,
      };

      const result = checkNoticeCompliance(notice, new Date('2024-07-15'));

      expect(result.daysTillExpiration).toBe(47);
      expect(result.urgentAction).toContain('renewal');
    });
  });

  describe('TC-LSE-230: Holdover Tenant Handling', () => {
    it('should calculate holdover rent and status', () => {
      interface HoldoverTenant {
        leaseId: string;
        originalEndDate: Date;
        originalRent: number;
        holdoverStartDate: Date;
        holdoverMultiplier: number;
        landlordConsent: 'none' | 'implied' | 'explicit';
      }

      const calculateHoldover = (holdover: HoldoverTenant, currentDate: Date): {
        holdoverDays: number;
        holdoverRent: number;
        status: 'tenant_at_sufferance' | 'tenant_at_will' | 'month_to_month';
        legalAction: string;
      } => {
        const holdoverDays = Math.floor(
          (currentDate.getTime() - holdover.holdoverStartDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const dailyRate = holdover.originalRent / 30;
        const holdoverRent = dailyRate * holdover.holdoverMultiplier * holdoverDays;

        let status: 'tenant_at_sufferance' | 'tenant_at_will' | 'month_to_month';
        let legalAction: string;

        if (holdover.landlordConsent === 'explicit') {
          status = 'month_to_month';
          legalAction = 'None required - valid month-to-month';
        } else if (holdover.landlordConsent === 'implied') {
          status = 'tenant_at_will';
          legalAction = 'Send notice to establish MTM or terminate';
        } else {
          status = 'tenant_at_sufferance';
          legalAction = 'May proceed with eviction immediately';
        }

        return {
          holdoverDays,
          holdoverRent: Math.round(holdoverRent * 100) / 100,
          status,
          legalAction,
        };
      };

      const holdover: HoldoverTenant = {
        leaseId: 'lease-1',
        originalEndDate: new Date('2024-06-30'),
        originalRent: 1500,
        holdoverStartDate: new Date('2024-07-01'),
        holdoverMultiplier: 1.5, // 150% holdover rent
        landlordConsent: 'none',
      };

      const result = calculateHoldover(holdover, new Date('2024-07-15'));

      expect(result.holdoverDays).toBe(14);
      expect(result.holdoverRent).toBeGreaterThan(1000); // 14 days at 1.5x
      expect(result.status).toBe('tenant_at_sufferance');
    });
  });

  describe('TC-LSE-231: Lease Option Exercise', () => {
    it('should process lease option to purchase correctly', () => {
      interface LeaseOption {
        leaseId: string;
        optionType: 'purchase' | 'extend' | 'expand';
        exerciseDeadline: Date;
        optionPrice?: number;
        creditedRent: number;
      }

      const exerciseOption = (option: LeaseOption, exerciseDate: Date): {
        valid: boolean;
        netPrice?: number;
        issue?: string;
      } => {
        if (exerciseDate > option.exerciseDeadline) {
          return { valid: false, issue: 'Option exercise deadline has passed' };
        }

        if (option.optionType === 'purchase' && option.optionPrice) {
          return {
            valid: true,
            netPrice: option.optionPrice - option.creditedRent,
          };
        }

        return { valid: true };
      };

      const option: LeaseOption = {
        leaseId: 'lease-1',
        optionType: 'purchase',
        exerciseDeadline: new Date('2024-12-31'),
        optionPrice: 350000,
        creditedRent: 15000, // 10 months at $1500 credited
      };

      const result = exerciseOption(option, new Date('2024-06-15'));

      expect(result.valid).toBe(true);
      expect(result.netPrice).toBe(335000);
    });
  });

  describe('TC-LSE-232: Rent Increase Notice Requirements', () => {
    it('should enforce state-specific notice periods for rent increases', () => {
      const stateNoticeRequirements: Record<string, number> = {
        'CA': 30, // 30 days for < 10%, 90 for >= 10%
        'NY': 30,
        'TX': 0,  // No requirement
        'FL': 15,
        'OR': 90,
      };

      const validateRentIncreaseNotice = (
        state: string,
        increasePercent: number,
        noticeGivenDays: number
      ): { valid: boolean; requiredDays: number } => {
        let requiredDays = stateNoticeRequirements[state] || 30;

        // California special rule
        if (state === 'CA' && increasePercent >= 10) {
          requiredDays = 90;
        }

        return {
          valid: noticeGivenDays >= requiredDays,
          requiredDays,
        };
      };

      // CA with 15% increase requires 90 days
      const result = validateRentIncreaseNotice('CA', 15, 60);

      expect(result.valid).toBe(false);
      expect(result.requiredDays).toBe(90);
    });
  });
});
