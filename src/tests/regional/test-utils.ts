/**
 * Regional Test Utilities
 * Accounting and legal compliance calculation utilities
 *
 * Zero tolerance for accounting errors - uses precise decimal arithmetic
 */

import Decimal from 'decimal.js';
import { STATE_REGULATIONS, StateCode, STATES } from './seed-data';

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

/**
 * Money class for precise financial calculations
 * Prevents floating-point errors that could lead to class action lawsuits
 */
export class Money {
  private value: Decimal;

  constructor(amount: number | string | Decimal) {
    this.value = new Decimal(amount);
  }

  add(other: Money | number): Money {
    const otherValue = other instanceof Money ? other.value : new Decimal(other);
    return new Money(this.value.plus(otherValue));
  }

  subtract(other: Money | number): Money {
    const otherValue = other instanceof Money ? other.value : new Decimal(other);
    return new Money(this.value.minus(otherValue));
  }

  multiply(factor: number): Money {
    return new Money(this.value.times(factor));
  }

  divide(divisor: number): Money {
    return new Money(this.value.dividedBy(divisor));
  }

  percentage(percent: number): Money {
    return new Money(this.value.times(percent).dividedBy(100));
  }

  round(decimals: number = 2): Money {
    return new Money(this.value.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP));
  }

  toNumber(): number {
    return this.value.toDecimalPlaces(2).toNumber();
  }

  toString(): string {
    return this.value.toDecimalPlaces(2).toString();
  }

  equals(other: Money | number): boolean {
    const otherValue = other instanceof Money ? other.value : new Decimal(other);
    return this.value.toDecimalPlaces(2).equals(otherValue.toDecimalPlaces(2));
  }

  isGreaterThan(other: Money | number): boolean {
    const otherValue = other instanceof Money ? other.value : new Decimal(other);
    return this.value.greaterThan(otherValue);
  }

  isLessThan(other: Money | number): boolean {
    const otherValue = other instanceof Money ? other.value : new Decimal(other);
    return this.value.lessThan(otherValue);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }
}

/**
 * Calculate late fee based on state regulations
 * Critical for avoiding class action lawsuits
 */
export function calculateLateFee(
  state: StateCode,
  monthlyRent: number,
  daysLate: number,
  leaseLateFee?: number
): { fee: number; isCompliant: boolean; violations: string[] } {
  const regulations = STATE_REGULATIONS[state];
  const violations: string[] = [];
  let fee = 0;

  if (daysLate <= 0) {
    return { fee: 0, isCompliant: true, violations: [] };
  }

  const rent = new Money(monthlyRent);

  switch (state) {
    case STATES.NC: {
      // NC: Grace period of 5 days required
      const rules = regulations.lateFeeRules;
      if (daysLate <= rules.gracePeriodDays) {
        return { fee: 0, isCompliant: true, violations: [] };
      }

      // NC: 5% or $15, whichever is greater
      const percentFee = rent.percentage(rules.maxFeePercent! * 100);
      const minFee = new Money(rules.minFeeIfPercent!);

      fee = percentFee.isGreaterThan(minFee) ? percentFee.toNumber() : minFee.toNumber();

      // Check if lease late fee exceeds legal maximum
      if (leaseLateFee && leaseLateFee > fee) {
        violations.push(`Late fee $${leaseLateFee} exceeds NC maximum of $${fee.toFixed(2)}`);
      }
      break;
    }

    case STATES.SC: {
      // SC: "Reasonable" standard - typically 5-10%
      const rules = regulations.lateFeeRules;
      if (rules.gracePeriodDays && daysLate <= rules.gracePeriodDays) {
        return { fee: 0, isCompliant: true, violations: [] };
      }

      // Use lease-specified fee or default to 5%
      if (leaseLateFee) {
        fee = leaseLateFee;
        // Check reasonableness - more than 10% is typically unreasonable
        const tenPercent = rent.percentage(10).toNumber();
        if (leaseLateFee > tenPercent) {
          violations.push(`Late fee $${leaseLateFee} may exceed reasonable standard (10% = $${tenPercent.toFixed(2)})`);
        }
      } else {
        fee = rent.percentage(5).toNumber();
      }
      break;
    }

    case STATES.GA: {
      // GA: Must be specified in lease
      const rules = regulations.lateFeeRules;
      if (rules.gracePeriodDays && daysLate <= rules.gracePeriodDays) {
        return { fee: 0, isCompliant: true, violations: [] };
      }

      if (!leaseLateFee && rules.mustBeInLease) {
        violations.push('GA requires late fee to be specified in lease');
        fee = 0;
      } else {
        fee = leaseLateFee || 0;
      }
      break;
    }
  }

  return {
    fee: new Money(fee).round().toNumber(),
    isCompliant: violations.length === 0,
    violations,
  };
}

/**
 * Validate security deposit against state regulations
 */
export function validateSecurityDeposit(
  state: StateCode,
  monthlyRent: number,
  securityDeposit: number,
  leaseType: 'week_to_week' | 'month_to_month' | 'fixed_term'
): { isCompliant: boolean; maxAllowed: number | null; violations: string[] } {
  const regulations = STATE_REGULATIONS[state];
  const violations: string[] = [];
  const rent = new Money(monthlyRent);
  const deposit = new Money(securityDeposit);

  let maxAllowed: number | null = null;

  switch (state) {
    case STATES.NC: {
      const limits = regulations.securityDepositLimit;
      let multiplier: number;

      if (leaseType === 'week_to_week') {
        multiplier = limits.weekToWeek!;
        maxAllowed = rent.multiply(multiplier / 4).round().toNumber(); // Weekly rent
      } else if (leaseType === 'month_to_month') {
        multiplier = limits.monthToMonth!;
        maxAllowed = rent.multiply(multiplier).round().toNumber();
      } else {
        multiplier = limits.longerTerm!;
        maxAllowed = rent.multiply(multiplier).round().toNumber();
      }

      if (deposit.isGreaterThan(maxAllowed)) {
        violations.push(`Security deposit $${deposit.toNumber()} exceeds NC maximum of $${maxAllowed.toFixed(2)}`);
      }
      break;
    }

    case STATES.SC:
    case STATES.GA: {
      // No statutory limit
      maxAllowed = null;
      break;
    }
  }

  return {
    isCompliant: violations.length === 0,
    maxAllowed,
    violations,
  };
}

/**
 * Calculate security deposit return deadline
 */
export function getSecurityDepositReturnDeadline(
  state: StateCode,
  moveOutDate: Date
): { deadline: Date; daysAllowed: number } {
  const regulations = STATE_REGULATIONS[state];
  const daysAllowed = regulations.securityDepositReturnDays;

  const deadline = new Date(moveOutDate);
  deadline.setDate(deadline.getDate() + daysAllowed);

  return { deadline, daysAllowed };
}

/**
 * Validate escrow requirements (GA specific for 10+ units)
 */
export function validateEscrowRequirement(
  state: StateCode,
  totalUnits: number,
  hasEscrowAccount: boolean
): { isRequired: boolean; isCompliant: boolean; violations: string[] } {
  const violations: string[] = [];

  if (state === STATES.GA) {
    const threshold = STATE_REGULATIONS.GA.escrowThresholdUnits;
    const isRequired = totalUnits >= threshold!;

    if (isRequired && !hasEscrowAccount) {
      violations.push(`GA requires escrow account for landlords with ${threshold}+ units`);
    }

    return { isRequired, isCompliant: violations.length === 0, violations };
  }

  if (state === STATES.NC && STATE_REGULATIONS.NC.requiresTrustAccount) {
    if (!hasEscrowAccount) {
      violations.push('NC requires security deposits to be held in trust account');
    }
    return { isRequired: true, isCompliant: violations.length === 0, violations };
  }

  return { isRequired: false, isCompliant: true, violations: [] };
}

/**
 * Calculate prorated rent
 * Uses precise decimal arithmetic to avoid floating-point errors
 */
export function calculateProratedRent(
  monthlyRent: number,
  daysInMonth: number,
  daysOccupied: number
): number {
  const rent = new Money(monthlyRent);
  const dailyRate = rent.divide(daysInMonth);
  const prorated = dailyRate.multiply(daysOccupied);

  return prorated.round().toNumber();
}

/**
 * Calculate balance with precision
 */
export function calculateBalance(
  charges: number[],
  payments: number[]
): number {
  const totalCharges = charges.reduce(
    (sum, charge) => sum.add(charge),
    new Money(0)
  );

  const totalPayments = payments.reduce(
    (sum, payment) => sum.add(payment),
    new Money(0)
  );

  return totalCharges.subtract(totalPayments).round().toNumber();
}

/**
 * Validate payment allocation (FIFO - oldest first)
 * Critical for avoiding disputes
 */
export function allocatePayment(
  paymentAmount: number,
  outstandingCharges: Array<{ id: string; amount: number; date: Date; type: string }>
): Array<{ chargeId: string; allocatedAmount: number; remainingCharge: number }> {
  // Sort charges by date (oldest first) - FIFO
  const sortedCharges = [...outstandingCharges].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const allocations: Array<{ chargeId: string; allocatedAmount: number; remainingCharge: number }> = [];
  let remainingPayment = new Money(paymentAmount);

  for (const charge of sortedCharges) {
    if (remainingPayment.isZero()) break;

    const chargeAmount = new Money(charge.amount);
    const allocation = remainingPayment.isGreaterThan(chargeAmount)
      ? chargeAmount
      : remainingPayment;

    allocations.push({
      chargeId: charge.id,
      allocatedAmount: allocation.toNumber(),
      remainingCharge: chargeAmount.subtract(allocation).toNumber(),
    });

    remainingPayment = remainingPayment.subtract(allocation);
  }

  return allocations;
}

/**
 * Validate grace period compliance
 * NC requires 5-day grace period, meaning payment on day 5 is still within grace
 */
export function isWithinGracePeriod(
  state: StateCode,
  dueDate: Date,
  paymentDate: Date
): boolean {
  const regulations = STATE_REGULATIONS[state];
  const gracePeriodDays = regulations.lateFeeRules.gracePeriodDays;

  // Calculate days between due date and payment date
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const paymentDateOnly = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());

  const diffTime = paymentDateOnly.getTime() - dueDateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Payment is within grace if it's on or before the grace period end
  // If grace is 5 days, payments on days 0-5 (inclusive) are within grace
  return diffDays <= gracePeriodDays;
}

/**
 * Generate amortization schedule for security deposit interest (if required)
 */
export function calculateSecurityDepositInterest(
  state: StateCode,
  depositAmount: number,
  annualRate: number,
  months: number
): { totalInterest: number; isRequired: boolean } {
  const regulations = STATE_REGULATIONS[state];

  // None of our target states require interest on security deposits
  if (!regulations.securityDepositInterestRequired) {
    return { totalInterest: 0, isRequired: false };
  }

  const principal = new Money(depositAmount);
  const monthlyRate = annualRate / 12 / 100;
  const interest = principal.multiply(monthlyRate).multiply(months);

  return {
    totalInterest: interest.round().toNumber(),
    isRequired: true,
  };
}

/**
 * Assertion helpers for accounting tests
 */
export const AccountingAssertions = {
  /**
   * Assert two money values are equal with zero tolerance
   */
  assertMoneyEquals(actual: number, expected: number, message?: string): void {
    const actualMoney = new Money(actual).round();
    const expectedMoney = new Money(expected).round();

    if (!actualMoney.equals(expectedMoney)) {
      throw new Error(
        `${message || 'Money mismatch'}: Expected $${expectedMoney.toString()}, got $${actualMoney.toString()}`
      );
    }
  },

  /**
   * Assert balance is correct
   */
  assertBalanceZeroTolerance(
    charges: number[],
    payments: number[],
    expectedBalance: number
  ): void {
    const actualBalance = calculateBalance(charges, payments);
    this.assertMoneyEquals(actualBalance, expectedBalance, 'Balance calculation error');
  },

  /**
   * Assert no negative balances (overpayment handling)
   */
  assertNoIllegalNegativeBalance(balance: number, allowCredit: boolean = false): void {
    if (!allowCredit && balance < 0) {
      throw new Error(`Illegal negative balance: $${balance}. Credit not allowed.`);
    }
  },

  /**
   * Assert payment allocation is complete
   */
  assertPaymentFullyAllocated(paymentAmount: number, allocations: Array<{ allocatedAmount: number }>): void {
    const totalAllocated = allocations.reduce(
      (sum, a) => sum.add(a.allocatedAmount),
      new Money(0)
    );

    const payment = new Money(paymentAmount);
    const unallocated = payment.subtract(totalAllocated);

    if (!unallocated.isZero() && !unallocated.isNegative()) {
      throw new Error(`Payment not fully allocated. Unallocated: $${unallocated.toString()}`);
    }
  },
};

/**
 * Legal compliance checker
 */
export const LegalComplianceChecker = {
  /**
   * Run all compliance checks for a state
   */
  runFullComplianceCheck(
    state: StateCode,
    data: {
      monthlyRent: number;
      securityDeposit: number;
      lateFee: number;
      gracePeriodDays: number;
      leaseType: 'week_to_week' | 'month_to_month' | 'fixed_term';
      totalUnits: number;
      hasEscrowAccount: boolean;
    }
  ): { isCompliant: boolean; violations: string[] } {
    const allViolations: string[] = [];

    // Check security deposit
    const depositCheck = validateSecurityDeposit(
      state,
      data.monthlyRent,
      data.securityDeposit,
      data.leaseType
    );
    allViolations.push(...depositCheck.violations);

    // Check late fee
    const lateFeeCheck = calculateLateFee(state, data.monthlyRent, 10, data.lateFee);
    allViolations.push(...lateFeeCheck.violations);

    // Check escrow requirement
    const escrowCheck = validateEscrowRequirement(state, data.totalUnits, data.hasEscrowAccount);
    allViolations.push(...escrowCheck.violations);

    // Check grace period (NC specific)
    if (state === STATES.NC) {
      const requiredGrace = STATE_REGULATIONS.NC.lateFeeRules.gracePeriodDays;
      if (data.gracePeriodDays < requiredGrace) {
        allViolations.push(`NC requires ${requiredGrace} day grace period, lease has ${data.gracePeriodDays} days`);
      }
    }

    return {
      isCompliant: allViolations.length === 0,
      violations: allViolations,
    };
  },
};
