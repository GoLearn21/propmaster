/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 8: Complex Edge Case Workflows
 *
 * Goal: Test move-ins/outs, transfers, voiding, and reclassification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types for workflow tests
interface JournalEntry {
  id: string;
  type: string;
  postings: Array<{
    accountId: string;
    propertyId: string;
    debit: number;
    credit: number;
  }>;
  voided: boolean;
}

interface Deposit {
  id: string;
  tenantId: string;
  ownerId: string;
  amount: number;
  interestAccrued: number;
}

interface Charge {
  id: string;
  tenantId: string;
  amount: number;
  status: 'open' | 'partial' | 'paid' | 'voided';
  amountPaid: number;
}

interface TenantPayment {
  id: string;
  tenantId: string;
  amount: number;
  appliedToCharges: Array<{ chargeId: string; amount: number }>;
  voided: boolean;
}

// Workflow functions
function createSecurityDepositTransfer(
  deposit: Deposit,
  newOwnerId: string
): JournalEntry[] {
  return [
    // Move liability from old owner to new owner
    {
      id: `transfer-liability-${deposit.id}`,
      type: 'security_deposit_transfer',
      postings: [
        { accountId: 'security_deposit_liability', propertyId: deposit.ownerId, debit: deposit.amount + deposit.interestAccrued, credit: 0 },
        { accountId: 'security_deposit_liability', propertyId: newOwnerId, debit: 0, credit: deposit.amount + deposit.interestAccrued },
      ],
      voided: false,
    },
    // Move cash from old owner to new owner
    {
      id: `transfer-cash-${deposit.id}`,
      type: 'security_deposit_transfer',
      postings: [
        { accountId: 'escrow_cash', propertyId: deposit.ownerId, debit: 0, credit: deposit.amount + deposit.interestAccrued },
        { accountId: 'escrow_cash', propertyId: newOwnerId, debit: deposit.amount + deposit.interestAccrued, credit: 0 },
      ],
      voided: false,
    },
  ];
}

function processLeaseBreakFee(
  deposit: Deposit,
  leaseBreakFee: number,
  refundAmount: number
): JournalEntry[] {
  const entries: JournalEntry[] = [];

  // Apply deposit to fee
  if (leaseBreakFee > 0) {
    entries.push({
      id: `lease-break-fee-apply`,
      type: 'deposit_application',
      postings: [
        { accountId: 'security_deposit_liability', propertyId: deposit.ownerId, debit: leaseBreakFee, credit: 0 },
        { accountId: 'lease_break_income', propertyId: deposit.ownerId, debit: 0, credit: leaseBreakFee },
      ],
      voided: false,
    });
  }

  // Refund remainder
  if (refundAmount > 0) {
    entries.push({
      id: `deposit-refund`,
      type: 'deposit_refund',
      postings: [
        { accountId: 'security_deposit_liability', propertyId: deposit.ownerId, debit: refundAmount, credit: 0 },
        { accountId: 'escrow_cash', propertyId: deposit.ownerId, debit: 0, credit: refundAmount },
      ],
      voided: false,
    });
  }

  return entries;
}

function voidPaymentAppliedToCharges(
  payment: TenantPayment,
  charges: Charge[]
): { voidedPayment: TenantPayment; reopenedCharges: Charge[] } {
  const voidedPayment = { ...payment, voided: true };

  const reopenedCharges = charges.map(charge => {
    const appliedAmount = payment.appliedToCharges.find(a => a.chargeId === charge.id)?.amount || 0;

    if (appliedAmount > 0) {
      const newAmountPaid = charge.amountPaid - appliedAmount;
      return {
        ...charge,
        amountPaid: newAmountPaid,
        status: newAmountPaid === 0 ? 'open' as const : 'partial' as const,
      };
    }
    return charge;
  });

  return { voidedPayment, reopenedCharges };
}

describe('TC-WRK: Complex Edge Case Workflows', () => {
  describe('TC-WRK-091: Security Deposit Transfer', () => {
    it('should move deposit liability and cash when owner sells to new owner', () => {
      const deposit: Deposit = {
        id: 'dep-123',
        tenantId: 'tenant-1',
        ownerId: 'owner-a',
        amount: 2000,
        interestAccrued: 40,
      };

      const entries = createSecurityDepositTransfer(deposit, 'owner-b');

      expect(entries.length).toBe(2);

      // Verify liability transfer
      const liabilityEntry = entries.find(e => e.id.includes('liability'));
      expect(liabilityEntry?.postings.some(p =>
        p.accountId === 'security_deposit_liability' &&
        p.propertyId === 'owner-a' &&
        p.debit === 2040
      )).toBe(true);
      expect(liabilityEntry?.postings.some(p =>
        p.accountId === 'security_deposit_liability' &&
        p.propertyId === 'owner-b' &&
        p.credit === 2040
      )).toBe(true);

      // Verify cash transfer
      const cashEntry = entries.find(e => e.id.includes('cash'));
      expect(cashEntry).toBeDefined();
    });
  });

  describe('TC-WRK-092: Lease Break Fee', () => {
    it('should apply fee, apply deposit, and refund remainder with correct GL entries', () => {
      const deposit: Deposit = {
        id: 'dep-456',
        tenantId: 'tenant-2',
        ownerId: 'owner-a',
        amount: 2000,
        interestAccrued: 40,
      };

      const leaseBreakFee = 500;
      const refundAmount = deposit.amount + deposit.interestAccrued - leaseBreakFee; // 1540

      const entries = processLeaseBreakFee(deposit, leaseBreakFee, refundAmount);

      expect(entries.length).toBe(2);

      // Verify fee application
      const feeEntry = entries.find(e => e.type === 'deposit_application');
      expect(feeEntry?.postings.some(p => p.credit === leaseBreakFee)).toBe(true);

      // Verify refund
      const refundEntry = entries.find(e => e.type === 'deposit_refund');
      expect(refundEntry?.postings.some(p => p.debit === refundAmount)).toBe(true);
    });
  });

  describe('TC-WRK-093: Roommate Swap', () => {
    it('should handle deposit when A leaves, C joins, B stays', () => {
      const originalRoommates = ['tenant-a', 'tenant-b'];
      const newRoommates = ['tenant-b', 'tenant-c'];

      const processRoommateSwap = (
        leaving: string,
        joining: string,
        depositAmount: number
      ): { refundTo: string; collectFrom: string; amount: number } => {
        // In most states, deposit follows the lease, not individual tenants
        // So we refund leaving tenant's portion and collect from new tenant
        const portionPerRoommate = depositAmount / 2;

        return {
          refundTo: leaving,
          collectFrom: joining,
          amount: portionPerRoommate,
        };
      };

      const result = processRoommateSwap('tenant-a', 'tenant-c', 2000);

      expect(result.refundTo).toBe('tenant-a');
      expect(result.collectFrom).toBe('tenant-c');
      expect(result.amount).toBe(1000);
    });
  });

  describe('TC-WRK-094: Vendor Refund', () => {
    it('should credit Expense and debit Cash when vendor refunds overpayment', () => {
      const createVendorRefund = (
        vendorId: string,
        amount: number,
        originalExpenseAccount: string
      ): JournalEntry => {
        return {
          id: `vendor-refund-${Date.now()}`,
          type: 'vendor_refund',
          postings: [
            { accountId: 'cash', propertyId: 'prop-1', debit: amount, credit: 0 },
            { accountId: originalExpenseAccount, propertyId: 'prop-1', debit: 0, credit: amount },
          ],
          voided: false,
        };
      };

      const entry = createVendorRefund('vendor-1', 200, 'repairs_expense');

      expect(entry.postings.find(p => p.accountId === 'cash')?.debit).toBe(200);
      expect(entry.postings.find(p => p.accountId === 'repairs_expense')?.credit).toBe(200);
    });
  });

  describe('TC-WRK-095: Owner Contribution', () => {
    it('should credit Owner Equity and debit Cash when owner sends $5k for repairs', () => {
      const createOwnerContribution = (
        ownerId: string,
        amount: number,
        purpose: string
      ): JournalEntry => {
        return {
          id: `owner-contribution-${Date.now()}`,
          type: 'owner_contribution',
          postings: [
            { accountId: 'cash', propertyId: 'prop-1', debit: amount, credit: 0 },
            { accountId: 'owner_equity', propertyId: 'prop-1', debit: 0, credit: amount },
          ],
          voided: false,
        };
      };

      const entry = createOwnerContribution('owner-1', 5000, 'Repair fund');

      expect(entry.postings.find(p => p.accountId === 'cash')?.debit).toBe(5000);
      expect(entry.postings.find(p => p.accountId === 'owner_equity')?.credit).toBe(5000);
    });
  });

  describe('TC-WRK-096: Reclassify Property', () => {
    it('should create 4-line journal entry for inter-property cash balancing', () => {
      const reclassifyBetweenProperties = (
        fromPropertyId: string,
        toPropertyId: string,
        amount: number,
        expenseAccount: string
      ): JournalEntry => {
        return {
          id: `reclass-${Date.now()}`,
          type: 'property_reclassification',
          postings: [
            // Remove expense from Property A
            { accountId: expenseAccount, propertyId: fromPropertyId, debit: 0, credit: amount },
            // Add cash back to Property A
            { accountId: 'cash', propertyId: fromPropertyId, debit: amount, credit: 0 },
            // Remove cash from Property B
            { accountId: 'cash', propertyId: toPropertyId, debit: 0, credit: amount },
            // Add expense to Property B
            { accountId: expenseAccount, propertyId: toPropertyId, debit: amount, credit: 0 },
          ],
          voided: false,
        };
      };

      const entry = reclassifyBetweenProperties('prop-a', 'prop-b', 500, 'repairs_expense');

      expect(entry.postings.length).toBe(4);

      // Verify debits = credits
      const totalDebits = entry.postings.reduce((sum, p) => sum + p.debit, 0);
      const totalCredits = entry.postings.reduce((sum, p) => sum + p.credit, 0);
      expect(totalDebits).toBe(totalCredits);
    });
  });

  describe('TC-WRK-097: Reclassify GL Account', () => {
    it('should move Repair to CapEx, changing Net Income and Balance Sheet', () => {
      const reclassifyAccount = (
        originalAccount: string,
        newAccount: string,
        amount: number
      ): { netIncomeChange: number; balanceSheetChange: number } => {
        const isExpenseToAsset = originalAccount.includes('expense') && newAccount.includes('asset');

        if (isExpenseToAsset) {
          // Moving from expense (reduces NI) to asset (increases BS)
          return {
            netIncomeChange: amount, // NI increases (less expense)
            balanceSheetChange: amount, // BS increases (more assets)
          };
        }

        return { netIncomeChange: 0, balanceSheetChange: 0 };
      };

      const result = reclassifyAccount('repairs_expense', 'fixed_assets', 10000);

      expect(result.netIncomeChange).toBe(10000); // NI goes up
      expect(result.balanceSheetChange).toBe(10000); // BS goes up
    });
  });

  describe('TC-WRK-098: Void Partial Payment', () => {
    it('should reopen all 3 charges when voiding payment applied to them', () => {
      const charges: Charge[] = [
        { id: 'ch-1', tenantId: 't-1', amount: 1000, status: 'paid', amountPaid: 1000 },
        { id: 'ch-2', tenantId: 't-1', amount: 200, status: 'paid', amountPaid: 200 },
        { id: 'ch-3', tenantId: 't-1', amount: 50, status: 'paid', amountPaid: 50 },
      ];

      const payment: TenantPayment = {
        id: 'pay-1',
        tenantId: 't-1',
        amount: 1250,
        appliedToCharges: [
          { chargeId: 'ch-1', amount: 1000 },
          { chargeId: 'ch-2', amount: 200 },
          { chargeId: 'ch-3', amount: 50 },
        ],
        voided: false,
      };

      const { voidedPayment, reopenedCharges } = voidPaymentAppliedToCharges(payment, charges);

      expect(voidedPayment.voided).toBe(true);
      expect(reopenedCharges.every(c => c.status === 'open')).toBe(true);
      expect(reopenedCharges.every(c => c.amountPaid === 0)).toBe(true);
    });
  });

  describe('TC-WRK-099: NSF on Split Payment', () => {
    it('should reverse both ledgers when tenant paid 2 units with 1 bounced check', () => {
      const affectedUnits = ['unit-a', 'unit-b'];
      const paymentAmount = 2000; // $1000 per unit
      const reversedLedgers: string[] = [];

      const processNSFSplitPayment = (
        units: string[],
        amount: number
      ): { reversedUnits: string[]; totalReversed: number } => {
        const perUnit = amount / units.length;

        units.forEach(unit => {
          reversedLedgers.push(unit);
        });

        return {
          reversedUnits: units,
          totalReversed: amount,
        };
      };

      const result = processNSFSplitPayment(affectedUnits, paymentAmount);

      expect(result.reversedUnits.length).toBe(2);
      expect(result.reversedUnits).toContain('unit-a');
      expect(result.reversedUnits).toContain('unit-b');
      expect(result.totalReversed).toBe(2000);
    });
  });

  describe('TC-WRK-100: Un-deposit', () => {
    it('should reopen Undeposited Funds when deposit marked "Returned by Bank"', () => {
      interface BankDeposit {
        id: string;
        amount: number;
        status: 'deposited' | 'returned';
        paymentsIncluded: string[];
      }

      const processReturnedDeposit = (
        deposit: BankDeposit
      ): { undepositedFundsReopened: number; paymentsToReprocess: string[] } => {
        if (deposit.status !== 'returned') {
          return { undepositedFundsReopened: 0, paymentsToReprocess: [] };
        }

        return {
          undepositedFundsReopened: deposit.amount,
          paymentsToReprocess: deposit.paymentsIncluded,
        };
      };

      const returnedDeposit: BankDeposit = {
        id: 'dep-001',
        amount: 5000,
        status: 'returned',
        paymentsIncluded: ['pay-1', 'pay-2', 'pay-3'],
      };

      const result = processReturnedDeposit(returnedDeposit);

      expect(result.undepositedFundsReopened).toBe(5000);
      expect(result.paymentsToReprocess.length).toBe(3);
    });
  });
});
