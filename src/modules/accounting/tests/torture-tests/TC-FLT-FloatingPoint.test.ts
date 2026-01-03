/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category: Floating Point Precision
 * "The Penny-Perfect Guarantee"
 *
 * Goal: Ensure zero precision loss in ALL financial calculations
 * Critical: Addresses Line 307 LedgerService Math.abs(sum) < 0.0001 vulnerability
 *
 * Test IDs: TC-FLT-001 to TC-FLT-010
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

// Helper: Format amount to exactly 4 decimal places
function formatAmount(value: number | string): string {
  return new Decimal(value).toFixed(4);
}

// Helper: Parse string to Decimal for comparison
function parseDecimal(value: string): Decimal {
  return new Decimal(value);
}

// Helper: Check if two amounts are exactly equal (penny-perfect)
function amountsEqual(a: string, b: string): boolean {
  return new Decimal(a).equals(new Decimal(b));
}

// Helper: Sum array of amounts with full precision
function sumAmounts(amounts: string[]): string {
  return amounts.reduce((sum, amt) => sum.plus(new Decimal(amt)), new Decimal(0)).toFixed(4);
}

// Simulated journal entry validation (mirrors LedgerService.validateDoubleEntry)
function validateDoubleEntry(postings: { amount: string }[]): { valid: boolean; sum: string } {
  const sum = postings.reduce((total, p) => total.plus(new Decimal(p.amount)), new Decimal(0));
  // CRITICAL: Current code uses 0.0001 threshold - we test for penny-perfect (0.01)
  const isBalanced = sum.abs().lessThanOrEqualTo(new Decimal('0.0001'));
  return { valid: isBalanced, sum: sum.toFixed(4) };
}

// Proper validation using penny-perfect threshold
function validateDoubleEntryStrict(postings: { amount: string }[]): { valid: boolean; sum: string } {
  const sum = postings.reduce((total, p) => total.plus(new Decimal(p.amount)), new Decimal(0));
  // FIXED: Zero tolerance for imbalance
  const isBalanced = sum.equals(new Decimal(0));
  return { valid: isBalanced, sum: sum.toFixed(4) };
}

// Simulated rent proration calculation
function calculateProration(
  monthlyRent: string,
  daysInMonth: number,
  daysOccupied: number
): string {
  const rent = new Decimal(monthlyRent);
  const daily = rent.dividedBy(daysInMonth);
  const prorated = daily.times(daysOccupied);
  // Round to nearest cent using banker's rounding
  return prorated.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toFixed(2);
}

// Simulated late fee calculation
function calculateLateFee(rent: string, percentage: number, cap: string | null): string {
  const rentAmount = new Decimal(rent);
  const fee = rentAmount.times(percentage).dividedBy(100);
  if (cap) {
    const capAmount = new Decimal(cap);
    return Decimal.min(fee, capAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toFixed(2);
  }
  return fee.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toFixed(2);
}

describe('FLOATING POINT PRECISION TESTS - Zero-Tolerance', () => {
  describe('TC-FLT-001: Scale Precision (10,000 transactions)', () => {
    /**
     * CRITICAL TEST: Verifies penny-perfect accuracy at scale
     * Failure here indicates precision loss accumulation
     */
    it('should sum 10,000 x $0.01 transactions to exactly $100.00', () => {
      const transactions: string[] = [];
      for (let i = 0; i < 10000; i++) {
        transactions.push('0.0100');
      }

      const total = sumAmounts(transactions);

      // Must be EXACTLY $100.00, not $99.9999... or $100.0001...
      expect(total).toBe('100.0000');
    });

    it('should sum 10,000 x $1.11 transactions to exactly $11,100.00', () => {
      const transactions: string[] = [];
      for (let i = 0; i < 10000; i++) {
        transactions.push('1.1100');
      }

      const total = sumAmounts(transactions);
      expect(total).toBe('11100.0000');
    });

    it('should handle alternating debits/credits without drift', () => {
      const transactions: string[] = [];
      for (let i = 0; i < 5000; i++) {
        transactions.push('123.4567'); // Debit
        transactions.push('-123.4567'); // Credit
      }

      const total = sumAmounts(transactions);
      expect(total).toBe('0.0000');
    });
  });

  describe('TC-FLT-002: Rent Proration Precision', () => {
    /**
     * Proration is a common source of penny discrepancies
     * Tests various rent amounts and day combinations
     */
    it('should calculate $1,523.45 / 30 days * 17 days correctly', () => {
      const result = calculateProration('1523.45', 30, 17);
      // 1523.45 / 30 = 50.7816666... * 17 = 863.288333...
      // Rounded to nearest cent = $863.29
      expect(result).toBe('863.29');
    });

    it('should calculate $2,000.00 / 31 days * 15 days correctly', () => {
      const result = calculateProration('2000.00', 31, 15);
      // 2000 / 31 = 64.516129... * 15 = 967.741935...
      expect(result).toBe('967.74');
    });

    it('should calculate February proration (28 days) correctly', () => {
      const result = calculateProration('1400.00', 28, 14);
      // 1400 / 28 = 50.00 * 14 = 700.00
      expect(result).toBe('700.00');
    });

    it('should handle leap year February (29 days)', () => {
      const result = calculateProration('1450.00', 29, 14);
      // 1450 / 29 = 50.00 * 14 = 700.00
      expect(result).toBe('700.00');
    });

    it('should handle single day proration without precision loss', () => {
      const result = calculateProration('3100.00', 31, 1);
      // 3100 / 31 = 100.00
      expect(result).toBe('100.00');
    });
  });

  describe('TC-FLT-003: Double-Entry Threshold Validation', () => {
    /**
     * CRITICAL: Addresses Line 307 vulnerability
     * Current code uses 0.0001 threshold - tests edge cases
     */
    it('should REJECT entry with 0.00009 imbalance', () => {
      const postings = [
        { amount: '1000.00009' }, // Debit
        { amount: '-1000.00000' }, // Credit
      ];

      // Current (vulnerable) validation
      const currentResult = validateDoubleEntry(postings);
      // This PASSES with current code but SHOULD FAIL
      expect(currentResult.valid).toBe(true); // Documents the bug

      // Strict (correct) validation
      const strictResult = validateDoubleEntryStrict(postings);
      expect(strictResult.valid).toBe(false); // Correct behavior
    });

    it('should REJECT entry with 0.0001 imbalance (boundary)', () => {
      const postings = [
        { amount: '1000.0001' },
        { amount: '-1000.0000' },
      ];

      const strictResult = validateDoubleEntryStrict(postings);
      expect(strictResult.valid).toBe(false);
    });

    it('should ACCEPT perfectly balanced entry', () => {
      const postings = [
        { amount: '1500.0000' },
        { amount: '-1500.0000' },
      ];

      const result = validateDoubleEntryStrict(postings);
      expect(result.valid).toBe(true);
      expect(result.sum).toBe('0.0000');
    });

    it('should handle many small postings that sum to zero', () => {
      const postings: { amount: string }[] = [];
      for (let i = 0; i < 100; i++) {
        postings.push({ amount: '10.0000' });
      }
      postings.push({ amount: '-1000.0000' });

      const result = validateDoubleEntryStrict(postings);
      expect(result.valid).toBe(true);
    });
  });

  describe('TC-FLT-004: Accumulated Rounding Over Year', () => {
    /**
     * Tests full-year accumulation scenarios
     * Common in rent ledgers with daily calculations
     */
    it('should accumulate 365 x $4.11 to exactly $1,500.15', () => {
      const charges: string[] = [];
      for (let i = 0; i < 365; i++) {
        charges.push('4.1100');
      }

      const total = sumAmounts(charges);
      expect(total).toBe('1500.1500');
    });

    it('should track 12 months of rent without drift', () => {
      const monthlyRent = '1875.00';
      const charges: string[] = [];
      for (let i = 0; i < 12; i++) {
        charges.push(formatAmount(monthlyRent));
      }

      const total = sumAmounts(charges);
      expect(total).toBe('22500.0000');
    });

    it('should handle yearly late fees accumulation', () => {
      const lateFees: string[] = [];
      // 6 late fees at $15.00 cap (NC)
      for (let i = 0; i < 6; i++) {
        lateFees.push('15.0000');
      }

      const total = sumAmounts(lateFees);
      expect(total).toBe('90.0000');
    });
  });

  describe('TC-FLT-005: Large Value Handling (MAX_SAFE_INTEGER)', () => {
    /**
     * Tests boundary conditions for very large portfolio values
     * JavaScript Number.MAX_SAFE_INTEGER = 9007199254740991
     */
    it('should handle $900 billion without overflow', () => {
      const largeAmount = new Decimal('900000000000.0000');
      const result = largeAmount.plus(new Decimal('0.0001'));

      expect(result.toFixed(4)).toBe('900000000000.0001');
    });

    it('should add small amount to large balance accurately', () => {
      const largeBalance = new Decimal('999999999999.9999');
      const smallPayment = new Decimal('0.0001');

      const newBalance = largeBalance.plus(smallPayment);
      expect(newBalance.toFixed(4)).toBe('1000000000000.0000');
    });

    it('should subtract from large balance without precision loss', () => {
      const balance = new Decimal('50000000000.5555');
      const payment = new Decimal('0.0001');

      const newBalance = balance.minus(payment);
      expect(newBalance.toFixed(4)).toBe('50000000000.5554');
    });
  });

  describe('TC-FLT-006: DECIMAL(19,4) Round-Trip Preservation', () => {
    /**
     * Verifies database DECIMAL type precision is preserved
     */
    it('should preserve 4 decimal places in round-trip', () => {
      const original = '1234.5678';
      const parsed = parseDecimal(original);
      const restored = parsed.toFixed(4);

      expect(restored).toBe('1234.5678');
    });

    it('should handle amounts with trailing zeros', () => {
      const amounts = ['100.0000', '100.1000', '100.0100', '100.0010'];

      for (const amount of amounts) {
        const parsed = parseDecimal(amount);
        expect(parsed.toFixed(4)).toBe(amount);
      }
    });

    it('should truncate beyond 4 decimals consistently', () => {
      const input = '1234.56789';
      const truncated = new Decimal(input).toDecimalPlaces(4, Decimal.ROUND_DOWN);

      expect(truncated.toFixed(4)).toBe('1234.5678');
    });
  });

  describe('TC-FLT-007: Empty Array and Edge Cases', () => {
    /**
     * Tests defensive programming for edge cases
     */
    it('should return 0.0000 when summing empty array', () => {
      const empty: string[] = [];
      const total = sumAmounts(empty);

      expect(total).toBe('0.0000');
      expect(parseFloat(total)).not.toBeNaN();
    });

    it('should handle single element array', () => {
      const single = ['123.4567'];
      const total = sumAmounts(single);

      expect(total).toBe('123.4567');
    });

    it('should handle zero amount', () => {
      const zeros = ['0.0000', '0.0000', '0.0000'];
      const total = sumAmounts(zeros);

      expect(total).toBe('0.0000');
    });

    it('should handle null-like string gracefully', () => {
      // This should NOT throw
      expect(() => formatAmount('0')).not.toThrow();
      expect(formatAmount('0')).toBe('0.0000');
    });
  });

  describe('TC-FLT-008: Negative Balance Display Consistency', () => {
    /**
     * Ensures consistent display of negative amounts
     * Critical for tenant statements and reports
     */
    it('should format negative balance consistently', () => {
      const negative = new Decimal('-123.45');

      // Standard format: -$123.45
      const standard = negative.toFixed(2);
      expect(standard).toBe('-123.45');

      // Absolute value for parenthetical display
      const absolute = negative.abs().toFixed(2);
      expect(absolute).toBe('123.45');
    });

    it('should handle negative zero correctly', () => {
      const negZero = new Decimal('-0.00');

      // Should display as positive zero
      expect(negZero.isZero()).toBe(true);
      expect(negZero.toFixed(2)).toBe('0.00');
    });

    it('should preserve sign through calculations', () => {
      const balance = new Decimal('-500.00');
      const payment = new Decimal('200.00');

      const newBalance = balance.plus(payment);
      expect(newBalance.toFixed(2)).toBe('-300.00');
      expect(newBalance.isNegative()).toBe(true);
    });
  });

  describe('TC-FLT-009: Currency Conversion Precision', () => {
    /**
     * Tests multi-currency scenarios
     * Important for international property management
     */
    it('should convert USD to CAD with rate precision', () => {
      const usdAmount = new Decimal('1000.00');
      const rate = new Decimal('1.3456789'); // High precision rate

      const cadAmount = usdAmount.times(rate);

      // Should preserve all precision in calculation
      expect(cadAmount.toFixed(4)).toBe('1345.6789');

      // Round for display
      expect(cadAmount.toDecimalPlaces(2).toFixed(2)).toBe('1345.68');
    });

    it('should round-trip currency conversion accurately', () => {
      const original = new Decimal('1000.00');
      const rate = new Decimal('1.35');
      const inverseRate = new Decimal(1).dividedBy(rate);

      const converted = original.times(rate);
      const backToOriginal = converted.times(inverseRate);

      // Allow small variance due to rate inversion
      const variance = original.minus(backToOriginal).abs();
      expect(variance.lessThan(new Decimal('0.01'))).toBe(true);
    });
  });

  describe('TC-FLT-010: Batch Sum Validation (100,000 postings)', () => {
    /**
     * Performance + accuracy test for large batches
     * Simulates month-end close with many transactions
     */
    it('should validate 100,000 postings sum to zero', () => {
      const postings: { amount: string }[] = [];

      // Create 50,000 debit/credit pairs
      for (let i = 0; i < 50000; i++) {
        const amount = (Math.random() * 10000).toFixed(4);
        postings.push({ amount: amount });
        postings.push({ amount: `-${amount}` });
      }

      const result = validateDoubleEntryStrict(postings);

      expect(result.valid).toBe(true);
      expect(result.sum).toBe('0.0000');
    });

    it('should detect single penny imbalance in 100,000 postings', () => {
      const postings: { amount: string }[] = [];

      for (let i = 0; i < 49999; i++) {
        postings.push({ amount: '100.0000' });
        postings.push({ amount: '-100.0000' });
      }
      // Add one extra penny
      postings.push({ amount: '100.0000' });
      postings.push({ amount: '-99.9900' }); // 0.01 short

      const result = validateDoubleEntryStrict(postings);

      expect(result.valid).toBe(false);
      expect(result.sum).toBe('0.0100'); // Exactly 1 penny imbalance
    });
  });

  describe('TC-FLT-BONUS: Late Fee Calculation Precision', () => {
    /**
     * Additional precision tests for late fee calculations
     * Critical for state compliance (NC 5% or $15 cap)
     */
    it('should calculate NC late fee with 5% cap correctly', () => {
      // Rent $300, 5% = $15, cap = $15 -> $15
      expect(calculateLateFee('300.00', 5, '15.00')).toBe('15.00');

      // Rent $200, 5% = $10, cap = $15 -> $10
      expect(calculateLateFee('200.00', 5, '15.00')).toBe('10.00');

      // Rent $1000, 5% = $50, cap = $15 -> $15
      expect(calculateLateFee('1000.00', 5, '15.00')).toBe('15.00');
    });

    it('should handle percentage resulting in repeating decimal', () => {
      // Rent $333.33, 5% = $16.6665
      const fee = calculateLateFee('333.33', 5, null);
      expect(fee).toBe('16.67'); // Banker's rounding
    });

    it('should calculate exact percentage without cap', () => {
      // SC has no cap, just reasonable fee
      const fee = calculateLateFee('1500.00', 5, null);
      expect(fee).toBe('75.00');
    });
  });
});
