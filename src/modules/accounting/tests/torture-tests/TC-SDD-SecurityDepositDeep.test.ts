/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 11: Security Deposit Deep Dive
 *
 * Goal: State-specific deposit return deadlines, itemization, and damage claims
 * Critical for: Lawsuit prevention, compliance, tenant disputes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// State-specific deposit return rules
interface StateDepositRules {
  state: string;
  returnDeadlineDays: number;
  deadlineType: 'calendar' | 'business';
  itemizationRequired: boolean;
  itemizationFormat: 'detailed' | 'summary' | 'receipts_required';
  interestRequired: boolean;
  maxDeposit: { type: 'months_rent' | 'flat'; value: number } | null;
  petDepositAllowed: boolean;
  nonRefundableFeeAllowed: boolean;
  lastMonthRentSeparate: boolean;
  walkThroughRequired: boolean;
  penaltyForLateReturn: { type: 'multiplier' | 'flat' | 'full_refund'; value: number };
}

// Comprehensive state deposit rules database
const STATE_DEPOSIT_RULES: Record<string, StateDepositRules> = {
  'CA': {
    state: 'California',
    returnDeadlineDays: 21,
    deadlineType: 'calendar',
    itemizationRequired: true,
    itemizationFormat: 'receipts_required',
    interestRequired: false, // Only some cities
    maxDeposit: { type: 'months_rent', value: 2 }, // Unfurnished
    petDepositAllowed: false, // Pet deposit banned
    nonRefundableFeeAllowed: false,
    lastMonthRentSeparate: true,
    walkThroughRequired: true,
    penaltyForLateReturn: { type: 'multiplier', value: 2 }, // 2x deposit
  },
  'NY': {
    state: 'New York',
    returnDeadlineDays: 14,
    deadlineType: 'calendar',
    itemizationRequired: true,
    itemizationFormat: 'detailed',
    interestRequired: true,
    maxDeposit: { type: 'months_rent', value: 1 },
    petDepositAllowed: true,
    nonRefundableFeeAllowed: false,
    lastMonthRentSeparate: false,
    walkThroughRequired: false,
    penaltyForLateReturn: { type: 'multiplier', value: 2 },
  },
  'TX': {
    state: 'Texas',
    returnDeadlineDays: 30,
    deadlineType: 'calendar',
    itemizationRequired: true,
    itemizationFormat: 'detailed',
    interestRequired: false,
    maxDeposit: null, // No limit
    petDepositAllowed: true,
    nonRefundableFeeAllowed: true,
    lastMonthRentSeparate: false,
    walkThroughRequired: false,
    penaltyForLateReturn: { type: 'multiplier', value: 3 }, // 3x amount wrongfully withheld + $100
  },
  'FL': {
    state: 'Florida',
    returnDeadlineDays: 15, // If no claim, 30 if claim
    deadlineType: 'calendar',
    itemizationRequired: true,
    itemizationFormat: 'detailed',
    interestRequired: true, // 75% of interest or 5% simple
    maxDeposit: null,
    petDepositAllowed: true,
    nonRefundableFeeAllowed: true,
    lastMonthRentSeparate: true,
    walkThroughRequired: false,
    penaltyForLateReturn: { type: 'full_refund', value: 1 },
  },
  'IL': {
    state: 'Illinois',
    returnDeadlineDays: 45, // 30 in Chicago
    deadlineType: 'calendar',
    itemizationRequired: true,
    itemizationFormat: 'receipts_required',
    interestRequired: true, // Chicago only
    maxDeposit: { type: 'months_rent', value: 1.5 },
    petDepositAllowed: true,
    nonRefundableFeeAllowed: false,
    lastMonthRentSeparate: false,
    walkThroughRequired: false,
    penaltyForLateReturn: { type: 'multiplier', value: 2 },
  },
};

interface DepositDeduction {
  category: 'cleaning' | 'damage' | 'unpaid_rent' | 'unpaid_utilities' | 'lease_break' | 'other';
  description: string;
  amount: number;
  receiptAttached: boolean;
  beforeAfterPhotos: boolean;
}

interface DepositDisposition {
  tenantId: string;
  moveOutDate: Date;
  depositAmount: number;
  interestAccrued: number;
  deductions: DepositDeduction[];
  refundAmount: number;
  mailedDate?: Date;
  returnDeadline: Date;
  state: string;
  isCompliant: boolean;
  violations: string[];
}

// Deposit disposition calculator
class DepositDispositionService {
  calculateDisposition(
    depositAmount: number,
    interestAccrued: number,
    deductions: DepositDeduction[],
    state: string,
    moveOutDate: Date
  ): DepositDisposition {
    const rules = STATE_DEPOSIT_RULES[state];
    const violations: string[] = [];

    // Calculate return deadline
    const returnDeadline = new Date(moveOutDate);
    returnDeadline.setDate(returnDeadline.getDate() + (rules?.returnDeadlineDays || 30));

    // Validate deductions
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

    if (rules?.itemizationFormat === 'receipts_required') {
      const missingReceipts = deductions.filter(d => !d.receiptAttached && d.amount > 126);
      if (missingReceipts.length > 0) {
        violations.push(`Receipts required for deductions over $126 in ${state}`);
      }
    }

    // Check for excessive deductions
    if (totalDeductions > depositAmount + interestAccrued) {
      violations.push('Total deductions exceed deposit amount');
    }

    const refundAmount = Math.max(0, depositAmount + interestAccrued - totalDeductions);

    return {
      tenantId: 'tenant-1',
      moveOutDate,
      depositAmount,
      interestAccrued,
      deductions,
      refundAmount,
      returnDeadline,
      state,
      isCompliant: violations.length === 0,
      violations,
    };
  }

  isReturnOnTime(disposition: DepositDisposition, mailedDate: Date): boolean {
    return mailedDate <= disposition.returnDeadline;
  }

  calculatePenalty(
    disposition: DepositDisposition,
    mailedDate: Date
  ): { penalty: number; description: string } {
    if (this.isReturnOnTime(disposition, mailedDate)) {
      return { penalty: 0, description: 'Returned on time' };
    }

    const rules = STATE_DEPOSIT_RULES[disposition.state];
    if (!rules) {
      return { penalty: 0, description: 'Unknown state' };
    }

    switch (rules.penaltyForLateReturn.type) {
      case 'multiplier':
        return {
          penalty: disposition.depositAmount * rules.penaltyForLateReturn.value,
          description: `${rules.penaltyForLateReturn.value}x deposit penalty`,
        };
      case 'full_refund':
        return {
          penalty: disposition.depositAmount,
          description: 'Full deposit forfeiture',
        };
      case 'flat':
        return {
          penalty: rules.penaltyForLateReturn.value,
          description: `Flat penalty of $${rules.penaltyForLateReturn.value}`,
        };
      default:
        return { penalty: 0, description: 'No penalty defined' };
    }
  }
}

// Damage claim validator
class DamageClaimValidator {
  validateClaim(
    deduction: DepositDeduction,
    state: string,
    tenancyLengthMonths: number
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Normal wear and tear check
    const normalWearCategories = ['carpet_wear', 'paint_fading', 'minor_scuffs'];
    if (deduction.description.toLowerCase().includes('wear') ||
        deduction.description.toLowerCase().includes('fading')) {
      issues.push('May be considered normal wear and tear - not deductible');
    }

    // Depreciation check for long tenancies
    if (tenancyLengthMonths > 60 && deduction.category === 'cleaning') {
      // Carpet typically has 5-7 year life
      issues.push('Item may be fully depreciated after 5+ years');
    }

    // Photo documentation check
    if (!deduction.beforeAfterPhotos && deduction.amount > 200) {
      issues.push('Before/after photos recommended for deductions over $200');
    }

    // Receipt check for repairs
    if (deduction.category === 'damage' && !deduction.receiptAttached) {
      issues.push('Receipt or invoice required for damage repairs');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  calculateDepreciation(
    originalCost: number,
    itemLifeYears: number,
    ageYears: number
  ): { currentValue: number; depreciationPercent: number } {
    const depreciationPercent = Math.min(100, (ageYears / itemLifeYears) * 100);
    const currentValue = Math.max(0, originalCost * (1 - depreciationPercent / 100));

    return {
      currentValue: Math.round(currentValue * 100) / 100,
      depreciationPercent: Math.round(depreciationPercent * 100) / 100,
    };
  }
}

describe('TC-SDD: Security Deposit Deep Dive', () => {
  describe('TC-SDD-137: California 21-Day Return Deadline', () => {
    it('should calculate correct return deadline for CA', () => {
      const service = new DepositDispositionService();
      const moveOutDate = new Date('2024-03-15');

      const disposition = service.calculateDisposition(
        2000, 0, [], 'CA', moveOutDate
      );

      const expectedDeadline = new Date('2024-04-05'); // 21 days later
      expect(disposition.returnDeadline.toDateString()).toBe(expectedDeadline.toDateString());
    });
  });

  describe('TC-SDD-138: California Receipt Requirement', () => {
    it('should flag missing receipts for CA deductions over $126', () => {
      const service = new DepositDispositionService();

      const deductions: DepositDeduction[] = [
        {
          category: 'cleaning',
          description: 'Deep cleaning',
          amount: 200,
          receiptAttached: false,
          beforeAfterPhotos: true,
        },
      ];

      const disposition = service.calculateDisposition(
        2000, 0, deductions, 'CA', new Date()
      );

      expect(disposition.isCompliant).toBe(false);
      expect(disposition.violations.some(v => v.includes('Receipts required'))).toBe(true);
    });
  });

  describe('TC-SDD-139: California Late Return Penalty', () => {
    it('should calculate 2x deposit penalty for late return in CA', () => {
      const service = new DepositDispositionService();
      const moveOutDate = new Date('2024-03-01');

      const disposition = service.calculateDisposition(
        2000, 0, [], 'CA', moveOutDate
      );

      // Mail 30 days later (9 days late)
      const mailedDate = new Date('2024-03-31');
      const penalty = service.calculatePenalty(disposition, mailedDate);

      expect(penalty.penalty).toBe(4000); // 2x deposit
    });
  });

  describe('TC-SDD-140: New York 14-Day Deadline', () => {
    it('should enforce stricter 14-day deadline for NY', () => {
      const service = new DepositDispositionService();
      const moveOutDate = new Date('2024-06-15');

      const disposition = service.calculateDisposition(
        1500, 15, [], 'NY', moveOutDate // Include interest
      );

      const expectedDeadline = new Date('2024-06-29');
      expect(disposition.returnDeadline.toDateString()).toBe(expectedDeadline.toDateString());
      expect(disposition.refundAmount).toBe(1515); // Include interest
    });
  });

  describe('TC-SDD-141: Texas 3x Penalty', () => {
    it('should apply 3x wrongfully withheld amount in TX', () => {
      const service = new DepositDispositionService();
      const moveOutDate = new Date('2024-05-01');

      const disposition = service.calculateDisposition(
        3000, 0, [], 'TX', moveOutDate
      );

      // Mail 45 days later (15 days late)
      const mailedDate = new Date('2024-06-15');
      const penalty = service.calculatePenalty(disposition, mailedDate);

      expect(penalty.penalty).toBe(9000); // 3x deposit
    });
  });

  describe('TC-SDD-142: Florida Interest Requirement', () => {
    it('should validate FL interest accrual on deposits', () => {
      const calculateFloridaInterest = (
        deposit: number,
        holdingMonths: number,
        interestMethod: '75_percent' | '5_simple'
      ): number => {
        if (interestMethod === '5_simple') {
          return Math.round(deposit * 0.05 * (holdingMonths / 12) * 100) / 100;
        }

        // 75% of whatever the landlord earns
        const assumedRate = 0.04; // 4% savings rate
        const grossInterest = deposit * assumedRate * (holdingMonths / 12);
        return Math.round(grossInterest * 0.75 * 100) / 100;
      };

      const interest = calculateFloridaInterest(2000, 12, '5_simple');

      expect(interest).toBe(100); // 5% of 2000 for 1 year
    });
  });

  describe('TC-SDD-143: Normal Wear and Tear Detection', () => {
    it('should flag normal wear and tear as non-deductible', () => {
      const validator = new DamageClaimValidator();

      const deduction: DepositDeduction = {
        category: 'damage',
        description: 'Carpet wear from normal use',
        amount: 500,
        receiptAttached: true,
        beforeAfterPhotos: true,
      };

      const result = validator.validateClaim(deduction, 'CA', 36);

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('normal wear'))).toBe(true);
    });
  });

  describe('TC-SDD-144: Depreciation Calculation', () => {
    it('should calculate carpet value after 5 years of 7-year life', () => {
      const validator = new DamageClaimValidator();

      const result = validator.calculateDepreciation(
        1000, // Original carpet cost
        7,    // 7-year useful life
        5     // 5 years old
      );

      // 5/7 = 71.43% depreciated, 28.57% remaining
      expect(result.depreciationPercent).toBeCloseTo(71.43, 1);
      expect(result.currentValue).toBeCloseTo(285.71, 0);
    });
  });

  describe('TC-SDD-145: Fully Depreciated Items', () => {
    it('should return $0 value when item exceeds useful life', () => {
      const validator = new DamageClaimValidator();

      const result = validator.calculateDepreciation(
        800,  // Original cost
        5,    // 5-year life
        7     // 7 years old (exceeded)
      );

      expect(result.currentValue).toBe(0);
      expect(result.depreciationPercent).toBe(100);
    });
  });

  describe('TC-SDD-146: Pet Deposit vs Pet Fee Handling', () => {
    it('should distinguish refundable pet deposit from non-refundable pet fee', () => {
      interface PetCharge {
        type: 'deposit' | 'fee' | 'monthly_rent';
        amount: number;
        refundable: boolean;
      }

      const validatePetCharges = (
        charges: PetCharge[],
        state: string
      ): { valid: boolean; issues: string[] } => {
        const rules = STATE_DEPOSIT_RULES[state];
        const issues: string[] = [];

        if (!rules?.petDepositAllowed) {
          const hasDeposit = charges.some(c => c.type === 'deposit');
          if (hasDeposit) {
            issues.push(`Pet deposits not allowed in ${state}`);
          }
        }

        if (!rules?.nonRefundableFeeAllowed) {
          const hasNonRefundable = charges.some(c => !c.refundable && c.type === 'fee');
          if (hasNonRefundable) {
            issues.push(`Non-refundable fees not allowed in ${state}`);
          }
        }

        return { valid: issues.length === 0, issues };
      };

      // California doesn't allow pet deposits
      const caResult = validatePetCharges(
        [{ type: 'deposit', amount: 500, refundable: true }],
        'CA'
      );
      expect(caResult.valid).toBe(false);
      expect(caResult.issues[0]).toContain('not allowed');

      // Texas allows both
      const txResult = validatePetCharges(
        [
          { type: 'deposit', amount: 300, refundable: true },
          { type: 'fee', amount: 200, refundable: false },
        ],
        'TX'
      );
      expect(txResult.valid).toBe(true);
    });
  });

  describe('TC-SDD-147: Maximum Deposit Limit Enforcement', () => {
    it('should enforce CA max deposit of 2 months rent', () => {
      const validateMaxDeposit = (
        monthlyRent: number,
        depositAmount: number,
        state: string,
        isFurnished: boolean
      ): { valid: boolean; maxAllowed: number } => {
        const rules = STATE_DEPOSIT_RULES[state];

        if (!rules?.maxDeposit) {
          return { valid: true, maxAllowed: Infinity };
        }

        let maxAllowed: number;
        if (rules.maxDeposit.type === 'months_rent') {
          // CA allows 3 months for furnished
          const multiplier = state === 'CA' && isFurnished ? 3 : rules.maxDeposit.value;
          maxAllowed = monthlyRent * multiplier;
        } else {
          maxAllowed = rules.maxDeposit.value;
        }

        return {
          valid: depositAmount <= maxAllowed,
          maxAllowed,
        };
      };

      // Unfurnished unit in CA
      const result = validateMaxDeposit(1500, 4000, 'CA', false);

      expect(result.valid).toBe(false);
      expect(result.maxAllowed).toBe(3000); // 2 months
    });
  });

  describe('TC-SDD-148: Itemized Statement Generation', () => {
    it('should generate properly formatted itemization statement', () => {
      const generateItemization = (
        disposition: DepositDisposition
      ): string => {
        let statement = `SECURITY DEPOSIT DISPOSITION\n`;
        statement += `Move-Out Date: ${disposition.moveOutDate.toLocaleDateString()}\n`;
        statement += `Return Deadline: ${disposition.returnDeadline.toLocaleDateString()}\n\n`;

        statement += `Original Deposit: $${disposition.depositAmount.toFixed(2)}\n`;
        if (disposition.interestAccrued > 0) {
          statement += `Interest Accrued: $${disposition.interestAccrued.toFixed(2)}\n`;
        }
        statement += `Total: $${(disposition.depositAmount + disposition.interestAccrued).toFixed(2)}\n\n`;

        if (disposition.deductions.length > 0) {
          statement += `DEDUCTIONS:\n`;
          disposition.deductions.forEach((d, i) => {
            statement += `${i + 1}. ${d.description}: $${d.amount.toFixed(2)}\n`;
          });
          const totalDeductions = disposition.deductions.reduce((s, d) => s + d.amount, 0);
          statement += `Total Deductions: $${totalDeductions.toFixed(2)}\n\n`;
        }

        statement += `REFUND AMOUNT: $${disposition.refundAmount.toFixed(2)}`;

        return statement;
      };

      const disposition: DepositDisposition = {
        tenantId: 'tenant-1',
        moveOutDate: new Date('2024-06-30'),
        depositAmount: 2000,
        interestAccrued: 20,
        deductions: [
          { category: 'cleaning', description: 'Deep cleaning', amount: 150, receiptAttached: true, beforeAfterPhotos: false },
          { category: 'damage', description: 'Wall repair', amount: 75, receiptAttached: true, beforeAfterPhotos: true },
        ],
        refundAmount: 1795,
        returnDeadline: new Date('2024-07-21'),
        state: 'CA',
        isCompliant: true,
        violations: [],
      };

      const statement = generateItemization(disposition);

      expect(statement).toContain('SECURITY DEPOSIT DISPOSITION');
      expect(statement).toContain('$2000.00');
      expect(statement).toContain('Deep cleaning: $150.00');
      expect(statement).toContain('Wall repair: $75.00');
      expect(statement).toContain('REFUND AMOUNT: $1795.00');
    });
  });

  describe('TC-SDD-149: Walk-Through Requirement (CA)', () => {
    it('should track walk-through completion for CA compliance', () => {
      interface WalkThrough {
        scheduledDate: Date;
        completed: boolean;
        tenantPresent: boolean;
        noticeGivenDate?: Date;
        findings: string[];
      }

      const validateWalkThrough = (
        walkThrough: WalkThrough | null,
        state: string,
        moveOutDate: Date
      ): { valid: boolean; issues: string[] } => {
        const rules = STATE_DEPOSIT_RULES[state];
        const issues: string[] = [];

        if (!rules?.walkThroughRequired) {
          return { valid: true, issues: [] };
        }

        if (!walkThrough) {
          issues.push('Walk-through required but not scheduled');
          return { valid: false, issues };
        }

        if (!walkThrough.completed) {
          issues.push('Walk-through scheduled but not completed');
        }

        if (walkThrough.noticeGivenDate) {
          const daysBefore = Math.floor(
            (moveOutDate.getTime() - walkThrough.noticeGivenDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysBefore < 48 / 24) { // Must give 48 hours notice
            issues.push('Walk-through notice must be given 48 hours before move-out');
          }
        }

        return { valid: issues.length === 0, issues };
      };

      // Missing walk-through in CA
      const result = validateWalkThrough(null, 'CA', new Date('2024-07-15'));

      expect(result.valid).toBe(false);
      expect(result.issues[0]).toContain('required');
    });
  });

  describe('TC-SDD-150: Damage Beyond Deposit Balance', () => {
    it('should handle damages exceeding deposit with proper tracking', () => {
      interface DamageSettlement {
        depositApplied: number;
        balanceDueTenant: number;
        balanceDueLandlord: number;
        collectionRequired: boolean;
      }

      const calculateDamageSettlement = (
        deposit: number,
        interest: number,
        totalDamages: number
      ): DamageSettlement => {
        const totalAvailable = deposit + interest;

        if (totalDamages <= totalAvailable) {
          return {
            depositApplied: totalDamages,
            balanceDueTenant: totalAvailable - totalDamages,
            balanceDueLandlord: 0,
            collectionRequired: false,
          };
        }

        return {
          depositApplied: totalAvailable,
          balanceDueTenant: 0,
          balanceDueLandlord: totalDamages - totalAvailable,
          collectionRequired: true,
        };
      };

      const result = calculateDamageSettlement(2000, 40, 3500);

      expect(result.depositApplied).toBe(2040);
      expect(result.balanceDueTenant).toBe(0);
      expect(result.balanceDueLandlord).toBe(1460);
      expect(result.collectionRequired).toBe(true);
    });
  });

  describe('TC-SDD-151: Multiple Deposit Types Handling', () => {
    it('should track security deposit, pet deposit, and last month rent separately', () => {
      interface TenantDeposits {
        securityDeposit: number;
        petDeposit: number;
        lastMonthRent: number;
        keyDeposit: number;
      }

      const processMultipleDeposits = (
        deposits: TenantDeposits,
        deductions: { category: string; amount: number }[],
        state: string
      ): {
        refundBreakdown: TenantDeposits;
        totalRefund: number;
      } => {
        const rules = STATE_DEPOSIT_RULES[state];
        let remainingDeductions = deductions.reduce((s, d) => s + d.amount, 0);

        // Apply deductions in order: security → pet → key
        // Last month rent is not for damages (applied to rent)
        let securityRefund = deposits.securityDeposit;
        let petRefund = deposits.petDeposit;
        let keyRefund = deposits.keyDeposit;

        // Deduct from security first
        if (remainingDeductions > 0) {
          const deductFromSecurity = Math.min(remainingDeductions, securityRefund);
          securityRefund -= deductFromSecurity;
          remainingDeductions -= deductFromSecurity;
        }

        // Then from pet deposit (for pet-related damages only in some states)
        // For simplicity, we'll deduct from pet deposit too
        if (remainingDeductions > 0) {
          const deductFromPet = Math.min(remainingDeductions, petRefund);
          petRefund -= deductFromPet;
          remainingDeductions -= deductFromPet;
        }

        // Key deposit only for key replacement
        const keyDeduction = deductions.find(d => d.category === 'key_replacement');
        if (keyDeduction) {
          keyRefund -= Math.min(keyDeduction.amount, keyRefund);
        }

        return {
          refundBreakdown: {
            securityDeposit: securityRefund,
            petDeposit: petRefund,
            lastMonthRent: 0, // Applied to final month's rent
            keyDeposit: keyRefund,
          },
          totalRefund: securityRefund + petRefund + keyRefund,
        };
      };

      const result = processMultipleDeposits(
        {
          securityDeposit: 2000,
          petDeposit: 300,
          lastMonthRent: 1500,
          keyDeposit: 50,
        },
        [
          { category: 'cleaning', amount: 200 },
          { category: 'damage', amount: 500 },
        ],
        'TX'
      );

      expect(result.refundBreakdown.securityDeposit).toBe(1300); // 2000 - 700
      expect(result.refundBreakdown.petDeposit).toBe(300); // Untouched
      expect(result.refundBreakdown.keyDeposit).toBe(50); // Untouched
      expect(result.totalRefund).toBe(1650);
    });
  });

  describe('TC-SDD-152: Deposit Interest Compounding Period', () => {
    it('should calculate monthly vs annual compounding correctly', () => {
      const calculateDepositInterest = (
        principal: number,
        annualRate: number,
        months: number,
        compoundingPeriod: 'monthly' | 'annually' | 'simple'
      ): number => {
        if (compoundingPeriod === 'simple') {
          return Math.round(principal * annualRate * (months / 12) * 100) / 100;
        }

        const periodsPerYear = compoundingPeriod === 'monthly' ? 12 : 1;
        const totalPeriods = compoundingPeriod === 'monthly' ? months : Math.floor(months / 12);
        const periodRate = annualRate / periodsPerYear;

        const finalAmount = principal * Math.pow(1 + periodRate, totalPeriods);
        return Math.round((finalAmount - principal) * 100) / 100;
      };

      const simpleInterest = calculateDepositInterest(2000, 0.02, 24, 'simple');
      const monthlyCompound = calculateDepositInterest(2000, 0.02, 24, 'monthly');
      const annualCompound = calculateDepositInterest(2000, 0.02, 24, 'annually');

      // Simple: 2000 * 0.02 * 2 = $80
      expect(simpleInterest).toBe(80);

      // Monthly compound should be slightly higher
      expect(monthlyCompound).toBeGreaterThan(simpleInterest);

      // Annual compound: 2000 * (1.02)^2 - 2000 = $80.80
      expect(annualCompound).toBeCloseTo(80.80, 1);
    });
  });
});
