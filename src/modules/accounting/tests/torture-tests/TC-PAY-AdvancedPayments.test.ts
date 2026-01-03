/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 9: Advanced Payment Scenarios
 *
 * Goal: Handle complex payment allocations that rival AppFolio/Buildium
 * Critical for: Zero-error ledger accuracy, tenant disputes, legal compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types for advanced payment scenarios
interface Charge {
  id: string;
  type: 'rent' | 'late_fee' | 'utility' | 'pet_fee' | 'damage' | 'legal' | 'nsf_fee';
  amount: number;
  dueDate: Date;
  priority: number; // Lower = higher priority
  balance: number;
}

interface PaymentAllocation {
  chargeId: string;
  amount: number;
}

interface PaymentPlan {
  id: string;
  tenantId: string;
  totalOwed: number;
  installments: Array<{
    dueDate: Date;
    amount: number;
    status: 'pending' | 'paid' | 'missed';
  }>;
  status: 'active' | 'completed' | 'defaulted';
  missedPaymentThreshold: number;
}

interface ConvenienceFee {
  paymentMethod: 'ach' | 'credit_card' | 'debit_card' | 'cash' | 'check';
  feeType: 'flat' | 'percentage';
  feeAmount: number;
  maxFee?: number;
  passToTenant: boolean;
}

type AllocationStrategy =
  | 'oldest_first'
  | 'newest_first'
  | 'rent_first'
  | 'fees_first'
  | 'proportional'
  | 'legal_priority'; // Required by some states

// Payment allocation engine
class PaymentAllocator {
  allocate(
    payment: number,
    charges: Charge[],
    strategy: AllocationStrategy
  ): PaymentAllocation[] {
    const allocations: PaymentAllocation[] = [];
    let remaining = payment;

    let sortedCharges: Charge[];

    switch (strategy) {
      case 'oldest_first':
        sortedCharges = [...charges].sort((a, b) =>
          a.dueDate.getTime() - b.dueDate.getTime()
        );
        break;
      case 'newest_first':
        sortedCharges = [...charges].sort((a, b) =>
          b.dueDate.getTime() - a.dueDate.getTime()
        );
        break;
      case 'rent_first':
        sortedCharges = [...charges].sort((a, b) => {
          if (a.type === 'rent' && b.type !== 'rent') return -1;
          if (a.type !== 'rent' && b.type === 'rent') return 1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        });
        break;
      case 'fees_first':
        sortedCharges = [...charges].sort((a, b) => {
          const feeTypes = ['late_fee', 'nsf_fee', 'legal'];
          const aIsFee = feeTypes.includes(a.type);
          const bIsFee = feeTypes.includes(b.type);
          if (aIsFee && !bIsFee) return -1;
          if (!aIsFee && bIsFee) return 1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        });
        break;
      case 'legal_priority':
        // Some states require: rent → utilities → other → fees
        sortedCharges = [...charges].sort((a, b) => a.priority - b.priority);
        break;
      case 'proportional':
        // Allocate proportionally across all charges
        const totalOwed = charges.reduce((sum, c) => sum + c.balance, 0);
        return charges.map(charge => ({
          chargeId: charge.id,
          amount: Math.round((charge.balance / totalOwed) * payment * 100) / 100,
        }));
      default:
        sortedCharges = charges;
    }

    for (const charge of sortedCharges) {
      if (remaining <= 0) break;

      const allocationAmount = Math.min(remaining, charge.balance);
      if (allocationAmount > 0) {
        allocations.push({
          chargeId: charge.id,
          amount: allocationAmount,
        });
        remaining -= allocationAmount;
      }
    }

    return allocations;
  }
}

// ACH reject code handler
class ACHRejectHandler {
  private readonly rejectCodes: Record<string, {
    description: string;
    retryable: boolean;
    action: string;
    feeApplicable: boolean;
  }> = {
    'R01': { description: 'Insufficient Funds', retryable: true, action: 'retry_in_3_days', feeApplicable: true },
    'R02': { description: 'Account Closed', retryable: false, action: 'require_new_account', feeApplicable: true },
    'R03': { description: 'No Account/Unable to Locate', retryable: false, action: 'require_new_account', feeApplicable: true },
    'R04': { description: 'Invalid Account Number', retryable: false, action: 'require_correction', feeApplicable: false },
    'R05': { description: 'Unauthorized Debit', retryable: false, action: 'dispute_review', feeApplicable: false },
    'R07': { description: 'Authorization Revoked', retryable: false, action: 'require_new_auth', feeApplicable: false },
    'R08': { description: 'Payment Stopped', retryable: false, action: 'contact_tenant', feeApplicable: true },
    'R09': { description: 'Uncollected Funds', retryable: true, action: 'retry_in_5_days', feeApplicable: true },
    'R10': { description: 'Customer Advises Not Authorized', retryable: false, action: 'dispute_review', feeApplicable: false },
    'R16': { description: 'Account Frozen', retryable: false, action: 'contact_tenant', feeApplicable: false },
    'R20': { description: 'Non-Transaction Account', retryable: false, action: 'require_new_account', feeApplicable: false },
    'R29': { description: 'Corporate Customer Advises Not Authorized', retryable: false, action: 'dispute_review', feeApplicable: false },
  };

  handleReject(code: string): {
    description: string;
    retryable: boolean;
    action: string;
    feeApplicable: boolean;
  } {
    return this.rejectCodes[code] || {
      description: 'Unknown Reject Code',
      retryable: false,
      action: 'manual_review',
      feeApplicable: false,
    };
  }
}

// Convenience fee calculator
class ConvenienceFeeCalculator {
  calculate(
    paymentAmount: number,
    config: ConvenienceFee
  ): { fee: number; totalCharge: number; breakdown: string } {
    let fee: number;

    if (config.feeType === 'flat') {
      fee = config.feeAmount;
    } else {
      fee = paymentAmount * (config.feeAmount / 100);
      if (config.maxFee && fee > config.maxFee) {
        fee = config.maxFee;
      }
    }

    fee = Math.round(fee * 100) / 100;

    return {
      fee,
      totalCharge: paymentAmount + (config.passToTenant ? fee : 0),
      breakdown: config.passToTenant
        ? `Payment: $${paymentAmount}, Fee: $${fee}, Total: $${paymentAmount + fee}`
        : `Payment: $${paymentAmount}, Fee absorbed by property`,
    };
  }
}

describe('TC-PAY: Advanced Payment Scenarios', () => {
  describe('TC-PAY-101: Partial Payment Allocation - Oldest First', () => {
    it('should allocate $500 to oldest charges first when owing $1500', () => {
      const allocator = new PaymentAllocator();
      const charges: Charge[] = [
        { id: 'ch-1', type: 'rent', amount: 1000, dueDate: new Date('2024-01-01'), priority: 1, balance: 500 },
        { id: 'ch-2', type: 'rent', amount: 1000, dueDate: new Date('2024-02-01'), priority: 1, balance: 500 },
        { id: 'ch-3', type: 'rent', amount: 1000, dueDate: new Date('2024-03-01'), priority: 1, balance: 500 },
      ];

      const allocations = allocator.allocate(500, charges, 'oldest_first');

      expect(allocations[0].chargeId).toBe('ch-1');
      expect(allocations[0].amount).toBe(500);
      expect(allocations.length).toBe(1); // Only oldest fully paid
    });
  });

  describe('TC-PAY-102: Partial Payment Allocation - Rent First', () => {
    it('should pay rent before late fees even if late fee is older', () => {
      const allocator = new PaymentAllocator();
      const charges: Charge[] = [
        { id: 'late-1', type: 'late_fee', amount: 50, dueDate: new Date('2024-01-05'), priority: 3, balance: 50 },
        { id: 'rent-1', type: 'rent', amount: 1000, dueDate: new Date('2024-02-01'), priority: 1, balance: 1000 },
      ];

      const allocations = allocator.allocate(800, charges, 'rent_first');

      expect(allocations[0].chargeId).toBe('rent-1');
      expect(allocations[0].amount).toBe(800);
    });
  });

  describe('TC-PAY-103: Partial Payment Allocation - Legal Priority (State Required)', () => {
    it('should follow state-mandated priority: rent → utilities → other → fees', () => {
      const allocator = new PaymentAllocator();
      const charges: Charge[] = [
        { id: 'late-1', type: 'late_fee', amount: 50, dueDate: new Date('2024-01-05'), priority: 4, balance: 50 },
        { id: 'util-1', type: 'utility', amount: 100, dueDate: new Date('2024-01-01'), priority: 2, balance: 100 },
        { id: 'rent-1', type: 'rent', amount: 1000, dueDate: new Date('2024-01-01'), priority: 1, balance: 1000 },
        { id: 'pet-1', type: 'pet_fee', amount: 25, dueDate: new Date('2024-01-01'), priority: 3, balance: 25 },
      ];

      const allocations = allocator.allocate(1100, charges, 'legal_priority');

      // Should allocate: rent (1000) → utility (100) = 1100
      expect(allocations[0].chargeId).toBe('rent-1');
      expect(allocations[1].chargeId).toBe('util-1');
      expect(allocations.length).toBe(2);
    });
  });

  describe('TC-PAY-104: Partial Payment Allocation - Proportional', () => {
    it('should split $500 proportionally across $1000 in charges', () => {
      const allocator = new PaymentAllocator();
      const charges: Charge[] = [
        { id: 'ch-1', type: 'rent', amount: 800, dueDate: new Date('2024-01-01'), priority: 1, balance: 800 },
        { id: 'ch-2', type: 'utility', amount: 200, dueDate: new Date('2024-01-01'), priority: 2, balance: 200 },
      ];

      const allocations = allocator.allocate(500, charges, 'proportional');

      // 800/1000 * 500 = 400, 200/1000 * 500 = 100
      expect(allocations.find(a => a.chargeId === 'ch-1')?.amount).toBe(400);
      expect(allocations.find(a => a.chargeId === 'ch-2')?.amount).toBe(100);
    });
  });

  describe('TC-PAY-105: Payment Plan Tracking', () => {
    it('should mark plan as defaulted after 2 missed payments', () => {
      const evaluatePaymentPlan = (plan: PaymentPlan): PaymentPlan => {
        const missedCount = plan.installments.filter(i => i.status === 'missed').length;

        if (missedCount >= plan.missedPaymentThreshold) {
          return { ...plan, status: 'defaulted' };
        }

        const allPaid = plan.installments.every(i => i.status === 'paid');
        if (allPaid) {
          return { ...plan, status: 'completed' };
        }

        return plan;
      };

      const plan: PaymentPlan = {
        id: 'plan-1',
        tenantId: 'tenant-1',
        totalOwed: 3000,
        installments: [
          { dueDate: new Date('2024-01-15'), amount: 1000, status: 'paid' },
          { dueDate: new Date('2024-02-15'), amount: 1000, status: 'missed' },
          { dueDate: new Date('2024-03-15'), amount: 1000, status: 'missed' },
        ],
        status: 'active',
        missedPaymentThreshold: 2,
      };

      const result = evaluatePaymentPlan(plan);

      expect(result.status).toBe('defaulted');
    });
  });

  describe('TC-PAY-106: Payment Plan Acceleration', () => {
    it('should make full balance due immediately upon default', () => {
      const acceleratePaymentPlan = (plan: PaymentPlan): {
        acceleratedAmount: number;
        dueDate: Date;
      } => {
        if (plan.status !== 'defaulted') {
          return { acceleratedAmount: 0, dueDate: new Date() };
        }

        const remainingAmount = plan.installments
          .filter(i => i.status !== 'paid')
          .reduce((sum, i) => sum + i.amount, 0);

        return {
          acceleratedAmount: remainingAmount,
          dueDate: new Date(), // Due immediately
        };
      };

      const defaultedPlan: PaymentPlan = {
        id: 'plan-1',
        tenantId: 'tenant-1',
        totalOwed: 3000,
        installments: [
          { dueDate: new Date('2024-01-15'), amount: 1000, status: 'paid' },
          { dueDate: new Date('2024-02-15'), amount: 1000, status: 'missed' },
          { dueDate: new Date('2024-03-15'), amount: 1000, status: 'pending' },
        ],
        status: 'defaulted',
        missedPaymentThreshold: 1,
      };

      const result = acceleratePaymentPlan(defaultedPlan);

      expect(result.acceleratedAmount).toBe(2000); // 2 unpaid installments
    });
  });

  describe('TC-PAY-107: ACH Reject Code R01 - Insufficient Funds', () => {
    it('should schedule retry in 3 days and apply NSF fee', () => {
      const handler = new ACHRejectHandler();
      const result = handler.handleReject('R01');

      expect(result.description).toBe('Insufficient Funds');
      expect(result.retryable).toBe(true);
      expect(result.action).toBe('retry_in_3_days');
      expect(result.feeApplicable).toBe(true);
    });
  });

  describe('TC-PAY-108: ACH Reject Code R02 - Account Closed', () => {
    it('should require new account and not retry', () => {
      const handler = new ACHRejectHandler();
      const result = handler.handleReject('R02');

      expect(result.retryable).toBe(false);
      expect(result.action).toBe('require_new_account');
      expect(result.feeApplicable).toBe(true);
    });
  });

  describe('TC-PAY-109: ACH Reject Code R10 - Unauthorized', () => {
    it('should trigger dispute review and NOT apply fee', () => {
      const handler = new ACHRejectHandler();
      const result = handler.handleReject('R10');

      expect(result.description).toContain('Not Authorized');
      expect(result.action).toBe('dispute_review');
      expect(result.feeApplicable).toBe(false); // Critical - no fee on disputes
    });
  });

  describe('TC-PAY-110: Convenience Fee - Credit Card Percentage', () => {
    it('should calculate 2.9% fee on $1000 payment passed to tenant', () => {
      const calculator = new ConvenienceFeeCalculator();
      const config: ConvenienceFee = {
        paymentMethod: 'credit_card',
        feeType: 'percentage',
        feeAmount: 2.9,
        passToTenant: true,
      };

      const result = calculator.calculate(1000, config);

      expect(result.fee).toBe(29);
      expect(result.totalCharge).toBe(1029);
    });
  });

  describe('TC-PAY-111: Convenience Fee - Capped Percentage', () => {
    it('should cap fee at $50 even if percentage exceeds', () => {
      const calculator = new ConvenienceFeeCalculator();
      const config: ConvenienceFee = {
        paymentMethod: 'credit_card',
        feeType: 'percentage',
        feeAmount: 3.0,
        maxFee: 50,
        passToTenant: true,
      };

      const result = calculator.calculate(5000, config); // 3% = $150, capped at $50

      expect(result.fee).toBe(50);
      expect(result.totalCharge).toBe(5050);
    });
  });

  describe('TC-PAY-112: Convenience Fee - ACH Flat Fee', () => {
    it('should apply flat $3 ACH fee', () => {
      const calculator = new ConvenienceFeeCalculator();
      const config: ConvenienceFee = {
        paymentMethod: 'ach',
        feeType: 'flat',
        feeAmount: 3,
        passToTenant: true,
      };

      const result = calculator.calculate(1500, config);

      expect(result.fee).toBe(3);
      expect(result.totalCharge).toBe(1503);
    });
  });

  describe('TC-PAY-113: Convenience Fee - Property Absorbed', () => {
    it('should not add fee to tenant charge when absorbed by property', () => {
      const calculator = new ConvenienceFeeCalculator();
      const config: ConvenienceFee = {
        paymentMethod: 'credit_card',
        feeType: 'percentage',
        feeAmount: 2.9,
        passToTenant: false, // Property absorbs
      };

      const result = calculator.calculate(1000, config);

      expect(result.fee).toBe(29);
      expect(result.totalCharge).toBe(1000); // Tenant only pays rent
    });
  });

  describe('TC-PAY-114: Guarantor Payment Application', () => {
    it('should apply guarantor payment to tenant ledger with proper audit trail', () => {
      interface GuarantorPayment {
        guarantorId: string;
        tenantId: string;
        amount: number;
        appliedToCharges: PaymentAllocation[];
      }

      const applyGuarantorPayment = (
        guarantorId: string,
        tenantId: string,
        amount: number,
        tenantCharges: Charge[]
      ): GuarantorPayment => {
        const allocator = new PaymentAllocator();
        const allocations = allocator.allocate(amount, tenantCharges, 'oldest_first');

        return {
          guarantorId,
          tenantId,
          amount,
          appliedToCharges: allocations,
        };
      };

      const tenantCharges: Charge[] = [
        { id: 'rent-1', type: 'rent', amount: 1000, dueDate: new Date('2024-01-01'), priority: 1, balance: 1000 },
        { id: 'rent-2', type: 'rent', amount: 1000, dueDate: new Date('2024-02-01'), priority: 1, balance: 1000 },
      ];

      const result = applyGuarantorPayment('guarantor-1', 'tenant-1', 1500, tenantCharges);

      expect(result.guarantorId).toBe('guarantor-1');
      expect(result.tenantId).toBe('tenant-1');
      expect(result.appliedToCharges.length).toBe(2);
      expect(result.appliedToCharges[0].amount).toBe(1000);
      expect(result.appliedToCharges[1].amount).toBe(500);
    });
  });

  describe('TC-PAY-115: Multi-Unit Tenant Payment Split', () => {
    it('should split single payment across 2 units rented by same tenant', () => {
      interface UnitLedger {
        unitId: string;
        tenantId: string;
        balance: number;
      }

      const splitPaymentAcrossUnits = (
        payment: number,
        units: UnitLedger[],
        strategy: 'equal' | 'proportional' | 'by_balance'
      ): Array<{ unitId: string; allocation: number }> => {
        const totalBalance = units.reduce((sum, u) => sum + u.balance, 0);

        if (strategy === 'equal') {
          const perUnit = payment / units.length;
          return units.map(u => ({ unitId: u.unitId, allocation: perUnit }));
        }

        if (strategy === 'proportional' || strategy === 'by_balance') {
          return units.map(u => ({
            unitId: u.unitId,
            allocation: Math.round((u.balance / totalBalance) * payment * 100) / 100,
          }));
        }

        return [];
      };

      const units: UnitLedger[] = [
        { unitId: 'unit-a', tenantId: 'tenant-1', balance: 1000 },
        { unitId: 'unit-b', tenantId: 'tenant-1', balance: 500 },
      ];

      const result = splitPaymentAcrossUnits(750, units, 'proportional');

      // 1000/1500 * 750 = 500, 500/1500 * 750 = 250
      expect(result.find(r => r.unitId === 'unit-a')?.allocation).toBe(500);
      expect(result.find(r => r.unitId === 'unit-b')?.allocation).toBe(250);
    });
  });

  describe('TC-PAY-116: Overpayment Handling', () => {
    it('should create credit balance when payment exceeds charges', () => {
      const processOverpayment = (
        payment: number,
        totalCharges: number
      ): { applied: number; credit: number; action: string } => {
        if (payment <= totalCharges) {
          return { applied: payment, credit: 0, action: 'fully_applied' };
        }

        return {
          applied: totalCharges,
          credit: payment - totalCharges,
          action: 'credit_created',
        };
      };

      const result = processOverpayment(1200, 1000);

      expect(result.applied).toBe(1000);
      expect(result.credit).toBe(200);
      expect(result.action).toBe('credit_created');
    });
  });

  describe('TC-PAY-117: Credit Application to Future Charges', () => {
    it('should auto-apply existing credit to new charge', () => {
      interface TenantAccount {
        tenantId: string;
        creditBalance: number;
      }

      const applyCredit = (
        account: TenantAccount,
        newCharge: number
      ): { creditUsed: number; remainingCharge: number; remainingCredit: number } => {
        const creditUsed = Math.min(account.creditBalance, newCharge);

        return {
          creditUsed,
          remainingCharge: newCharge - creditUsed,
          remainingCredit: account.creditBalance - creditUsed,
        };
      };

      const account: TenantAccount = {
        tenantId: 'tenant-1',
        creditBalance: 200,
      };

      const result = applyCredit(account, 1000);

      expect(result.creditUsed).toBe(200);
      expect(result.remainingCharge).toBe(800);
      expect(result.remainingCredit).toBe(0);
    });
  });

  describe('TC-PAY-118: Returned Check vs ACH NSF Distinction', () => {
    it('should handle check vs ACH NSF with different fees and processes', () => {
      interface NSFEvent {
        type: 'check' | 'ach';
        originalAmount: number;
        rejectCode?: string;
      }

      const processNSF = (event: NSFEvent, feeConfig: {
        checkNSFFee: number;
        achNSFFee: number;
        representmentAllowed: boolean;
      }): {
        fee: number;
        canRepresent: boolean;
        representmentDelay: number;
      } => {
        if (event.type === 'check') {
          return {
            fee: feeConfig.checkNSFFee,
            canRepresent: feeConfig.representmentAllowed,
            representmentDelay: 10, // 10 days for checks
          };
        }

        // ACH
        const handler = new ACHRejectHandler();
        const rejectInfo = handler.handleReject(event.rejectCode || 'R01');

        return {
          fee: rejectInfo.feeApplicable ? feeConfig.achNSFFee : 0,
          canRepresent: rejectInfo.retryable,
          representmentDelay: rejectInfo.retryable ? 3 : 0,
        };
      };

      const checkResult = processNSF(
        { type: 'check', originalAmount: 1000 },
        { checkNSFFee: 35, achNSFFee: 25, representmentAllowed: true }
      );

      const achResult = processNSF(
        { type: 'ach', originalAmount: 1000, rejectCode: 'R01' },
        { checkNSFFee: 35, achNSFFee: 25, representmentAllowed: true }
      );

      expect(checkResult.fee).toBe(35);
      expect(checkResult.representmentDelay).toBe(10);

      expect(achResult.fee).toBe(25);
      expect(achResult.representmentDelay).toBe(3);
    });
  });
});
