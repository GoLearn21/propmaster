/**
 * Regional Test Suite: North Carolina, South Carolina, Georgia (Atlanta)
 *
 * Comprehensive test coverage for:
 * - Accounting accuracy (zero error tolerance)
 * - Legal compliance (class action lawsuit prevention)
 * - Edge cases and boundary conditions
 * - Happy path scenarios
 * - Negative test cases
 *
 * @author PropMaster Test Suite
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  STATES,
  STATE_REGULATIONS,
  TEST_PROPERTIES,
  TEST_UNITS,
  TEST_TENANTS,
  TEST_LEASES,
  TEST_PAYMENTS,
  EDGE_CASE_SCENARIOS,
  CLASS_ACTION_PREVENTION_SCENARIOS,
  getAllSeedData,
  StateCode,
} from './seed-data';

import {
  Money,
  calculateLateFee,
  validateSecurityDeposit,
  getSecurityDepositReturnDeadline,
  validateEscrowRequirement,
  calculateProratedRent,
  calculateBalance,
  allocatePayment,
  isWithinGracePeriod,
  AccountingAssertions,
  LegalComplianceChecker,
} from './test-utils';

// ============================================================================
// SECTION 1: SEED DATA VALIDATION TESTS
// ============================================================================

describe('Seed Data Validation', () => {
  describe('Data Integrity', () => {
    it('should have properties for all states', () => {
      expect(TEST_PROPERTIES.NC.length).toBeGreaterThan(0);
      expect(TEST_PROPERTIES.SC.length).toBeGreaterThan(0);
      expect(TEST_PROPERTIES.GA.length).toBeGreaterThan(0);
    });

    it('should have units for all properties', () => {
      const allProperties = getAllSeedData().properties;
      const allUnits = getAllSeedData().units;

      // Verify each property has at least one unit
      for (const property of allProperties) {
        const propertyUnits = allUnits.filter(u => u.property_id === property.id);
        expect(propertyUnits.length).toBeGreaterThan(0);
      }
    });

    it('should have valid tenant data', () => {
      const allTenants = getAllSeedData().tenants;

      for (const tenant of allTenants) {
        expect(tenant.id).toBeTruthy();
        expect(tenant.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        expect(tenant.first_name).toBeTruthy();
        expect(tenant.last_name).toBeTruthy();
      }
    });

    it('should have valid lease data', () => {
      const allLeases = getAllSeedData().leases;

      for (const lease of allLeases) {
        expect(new Date(lease.start_date)).toBeInstanceOf(Date);
        expect(new Date(lease.end_date)).toBeInstanceOf(Date);
        expect(lease.monthly_rent).toBeGreaterThan(0);
        expect(lease.security_deposit).toBeGreaterThanOrEqual(0);
      }
    });

    it('should have valid payment data', () => {
      const allPayments = getAllSeedData().payments;

      for (const payment of allPayments) {
        expect(payment.amount).toBeGreaterThan(0);
        expect(['paid', 'pending', 'failed', 'overdue']).toContain(payment.status);
      }
    });
  });

  describe('State Regulation Data', () => {
    it('should have regulations for all target states', () => {
      expect(STATE_REGULATIONS.NC).toBeDefined();
      expect(STATE_REGULATIONS.SC).toBeDefined();
      expect(STATE_REGULATIONS.GA).toBeDefined();
    });

    it('should have required late fee rules', () => {
      for (const state of [STATES.NC, STATES.SC, STATES.GA]) {
        expect(STATE_REGULATIONS[state].lateFeeRules).toBeDefined();
      }
    });

    it('should have security deposit return days', () => {
      for (const state of [STATES.NC, STATES.SC, STATES.GA]) {
        expect(STATE_REGULATIONS[state].securityDepositReturnDays).toBe(30);
      }
    });
  });
});

// ============================================================================
// SECTION 2: ACCOUNTING ACCURACY TESTS (ZERO TOLERANCE)
// ============================================================================

describe('Accounting Accuracy - Zero Tolerance', () => {
  describe('Money Class Precision', () => {
    it('should handle floating-point addition correctly', () => {
      const a = new Money(0.1);
      const b = new Money(0.2);
      const result = a.add(b);

      // JavaScript: 0.1 + 0.2 = 0.30000000000000004
      // Money class should give exactly 0.30
      expect(result.toNumber()).toBe(0.30);
    });

    it('should handle floating-point subtraction correctly', () => {
      const a = new Money(1.00);
      const b = new Money(0.90);
      const result = a.subtract(b);

      expect(result.toNumber()).toBe(0.10);
    });

    it('should handle percentage calculations correctly', () => {
      const rent = new Money(1333.33);
      const fivePercent = rent.percentage(5);

      expect(fivePercent.toNumber()).toBe(66.67);
    });

    it('should handle division correctly', () => {
      const rent = new Money(1000.00);
      const dailyRate = rent.divide(30);

      expect(dailyRate.toNumber()).toBe(33.33);
    });

    it('should handle multiplication correctly', () => {
      const dailyRate = new Money(33.33);
      const prorated = dailyRate.multiply(15);

      expect(prorated.toNumber()).toBe(499.95);
    });

    it('should round correctly using banker\'s rounding', () => {
      const scenarios = [
        { input: 1.235, expected: 1.24 },
        { input: 1.234, expected: 1.23 },
        { input: 1.225, expected: 1.23 }, // Banker's rounding
        { input: 1.2349, expected: 1.23 },
        { input: 1.2350, expected: 1.24 },
      ];

      for (const { input, expected } of scenarios) {
        const money = new Money(input).round();
        expect(money.toNumber()).toBe(expected);
      }
    });
  });

  describe('Balance Calculations', () => {
    it('should calculate balance correctly with multiple charges and payments', () => {
      const charges = [1200.00, 1200.00, 1200.00, 75.00]; // 3 months rent + late fee = 3675
      const payments = [1200.00, 1200.00, 500.00]; // Total = 2900

      const balance = calculateBalance(charges, payments);
      // 3675 - 2900 = 775
      expect(balance).toBe(775.00);
    });

    it('should handle zero balance correctly', () => {
      const charges = [1500.00, 1500.00];
      const payments = [1500.00, 1500.00];

      const balance = calculateBalance(charges, payments);
      expect(balance).toBe(0.00);
    });

    it('should handle credit balance correctly', () => {
      const charges = [1200.00];
      const payments = [1500.00];

      const balance = calculateBalance(charges, payments);
      expect(balance).toBe(-300.00);
    });

    it('should handle fractional amounts without precision loss', () => {
      const charges = [1333.33, 1333.33, 1333.34]; // $4000 split
      const payments = [1333.33, 1333.33, 1333.34];

      const balance = calculateBalance(charges, payments);
      expect(balance).toBe(0.00);
    });

    it('should handle edge case: single penny difference', () => {
      const charges = [1000.00];
      const payments = [999.99];

      const balance = calculateBalance(charges, payments);
      expect(balance).toBe(0.01);
    });
  });

  describe('Prorated Rent Calculations', () => {
    it('should calculate prorated rent for partial month (NC)', () => {
      const monthlyRent = 1200.00;
      const daysInMonth = 30;
      const daysOccupied = 15;

      const prorated = calculateProratedRent(monthlyRent, daysInMonth, daysOccupied);
      expect(prorated).toBe(600.00);
    });

    it('should calculate prorated rent for February leap year', () => {
      const monthlyRent = 1450.00;
      const daysInMonth = 29; // February 2024
      const daysOccupied = 14;

      const prorated = calculateProratedRent(monthlyRent, daysInMonth, daysOccupied);
      expect(prorated).toBe(700.00);
    });

    it('should calculate prorated rent for February non-leap year', () => {
      const monthlyRent = 1450.00;
      const daysInMonth = 28;
      const daysOccupied = 14;

      const prorated = calculateProratedRent(monthlyRent, daysInMonth, daysOccupied);
      expect(prorated).toBe(725.00);
    });

    it('should handle 31-day month correctly', () => {
      const monthlyRent = 1550.00;
      const daysInMonth = 31;
      const daysOccupied = 10;

      const prorated = calculateProratedRent(monthlyRent, daysInMonth, daysOccupied);
      expect(prorated).toBe(500.00);
    });

    it('should handle single day occupancy', () => {
      const monthlyRent = 3000.00;
      const daysInMonth = 30;
      const daysOccupied = 1;

      const prorated = calculateProratedRent(monthlyRent, daysInMonth, daysOccupied);
      expect(prorated).toBe(100.00);
    });
  });

  describe('Payment Allocation (FIFO)', () => {
    it('should allocate payment to oldest charge first', () => {
      const charges = [
        { id: 'charge-1', amount: 1000.00, date: new Date('2024-01-01'), type: 'rent' },
        { id: 'charge-2', amount: 1000.00, date: new Date('2024-02-01'), type: 'rent' },
        { id: 'charge-3', amount: 1000.00, date: new Date('2024-03-01'), type: 'rent' },
      ];

      const allocations = allocatePayment(1500.00, charges);

      expect(allocations[0].chargeId).toBe('charge-1');
      expect(allocations[0].allocatedAmount).toBe(1000.00);
      expect(allocations[0].remainingCharge).toBe(0.00);

      expect(allocations[1].chargeId).toBe('charge-2');
      expect(allocations[1].allocatedAmount).toBe(500.00);
      expect(allocations[1].remainingCharge).toBe(500.00);
    });

    it('should fully allocate payment when sufficient', () => {
      const charges = [
        { id: 'charge-1', amount: 1000.00, date: new Date('2024-01-01'), type: 'rent' },
      ];

      const allocations = allocatePayment(1000.00, charges);

      expect(allocations[0].allocatedAmount).toBe(1000.00);
      expect(allocations[0].remainingCharge).toBe(0.00);

      AccountingAssertions.assertPaymentFullyAllocated(1000.00, allocations);
    });

    it('should handle overpayment correctly', () => {
      const charges = [
        { id: 'charge-1', amount: 500.00, date: new Date('2024-01-01'), type: 'rent' },
      ];

      const allocations = allocatePayment(1000.00, charges);

      expect(allocations[0].allocatedAmount).toBe(500.00);
      expect(allocations[0].remainingCharge).toBe(0.00);
    });
  });

  describe('Edge Case: Floating Point Scenarios', () => {
    it.each(EDGE_CASE_SCENARIOS.floatingPointPayments)(
      'should handle $%s payment correctly',
      ({ amount, expected }) => {
        const money = new Money(amount);
        expect(money.toNumber()).toBe(expected);
      }
    );

    it.each(EDGE_CASE_SCENARIOS.roundingScenarios)(
      'should round $%s correctly - %s',
      ({ input, expected }) => {
        const money = new Money(input).round();
        expect(money.toNumber()).toBe(expected);
      }
    );
  });

  describe('Tenant Balance Verification', () => {
    it('should verify NC tenant balances match payment history', () => {
      for (const tenant of TEST_TENANTS.NC) {
        const tenantPayments = TEST_PAYMENTS.NC.filter(p => p.tenant_id === tenant.id);
        const paidAmount = tenantPayments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount + (p.late_fee || 0), 0);
        const pendingAmount = tenantPayments
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + p.amount, 0);

        // Balance due should equal pending payments
        expect(tenant.balance_due).toBe(pendingAmount);
      }
    });

    it('should verify SC tenant balances match payment history', () => {
      for (const tenant of TEST_TENANTS.SC) {
        const tenantPayments = TEST_PAYMENTS.SC.filter(p => p.tenant_id === tenant.id);
        const pendingAmount = tenantPayments
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + p.amount, 0);

        expect(tenant.balance_due).toBe(pendingAmount);
      }
    });

    it('should verify GA tenant balances match payment history', () => {
      for (const tenant of TEST_TENANTS.GA) {
        const tenantPayments = TEST_PAYMENTS.GA.filter(p => p.tenant_id === tenant.id);
        const lease = TEST_LEASES.GA.find(l => l.tenant_id === tenant.id);

        if (tenant.id === 'tenant-ga-004') {
          // Partial payment scenario
          const totalRent = lease!.monthly_rent * 2; // 2 months
          const paidAmount = tenantPayments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + p.amount, 0);

          expect(tenant.balance_due).toBe(totalRent - paidAmount);
        }
      }
    });
  });
});

// ============================================================================
// SECTION 3: LEGAL COMPLIANCE TESTS (CLASS ACTION PREVENTION)
// ============================================================================

describe('Legal Compliance - Class Action Prevention', () => {
  describe('North Carolina Compliance', () => {
    const state = STATES.NC;

    describe('Late Fee Compliance', () => {
      it('should enforce 5-day grace period', () => {
        const dueDate = new Date('2024-01-01');
        const day5 = new Date('2024-01-06'); // 5 days after - still within grace
        const day6 = new Date('2024-01-07'); // 6 days after - LATE

        // NC law: no late fee for first 5 days after due date
        // Jan 1 (due) -> Jan 6 (day 5) is still within grace
        // Jan 7 (day 6) is first day late fee can apply
        expect(isWithinGracePeriod(state, dueDate, day5)).toBe(true);
        expect(isWithinGracePeriod(state, dueDate, day6)).toBe(false);
      });

      it('should calculate late fee as 5% or $15 minimum', () => {
        // Test with low rent where $15 is minimum
        const lowRent = 200.00;
        const lowResult = calculateLateFee(state, lowRent, 10);
        expect(lowResult.fee).toBe(15.00); // $15 minimum applies

        // Test with high rent where 5% applies
        const highRent = 1500.00;
        const highResult = calculateLateFee(state, highRent, 10);
        expect(highResult.fee).toBe(75.00); // 5% of $1500
      });

      it('should not charge late fee within grace period', () => {
        const result = calculateLateFee(state, 1500.00, 3);
        expect(result.fee).toBe(0);
        expect(result.isCompliant).toBe(true);
      });

      it('should flag excessive late fees', () => {
        const result = calculateLateFee(state, 1000.00, 10, 100.00);
        expect(result.isCompliant).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
      });
    });

    describe('Security Deposit Compliance', () => {
      it('should limit security deposit to 2 months rent for fixed term', () => {
        const rent = 1500.00;
        const maxDeposit = 3000.00;

        const compliant = validateSecurityDeposit(state, rent, maxDeposit, 'fixed_term');
        expect(compliant.isCompliant).toBe(true);
        expect(compliant.maxAllowed).toBe(3000.00);

        const excessive = validateSecurityDeposit(state, rent, 3500.00, 'fixed_term');
        expect(excessive.isCompliant).toBe(false);
      });

      it('should limit security deposit to 1.5 months for month-to-month', () => {
        const rent = 1000.00;
        const result = validateSecurityDeposit(state, rent, 1500.00, 'month_to_month');

        expect(result.isCompliant).toBe(true);
        expect(result.maxAllowed).toBe(1500.00);
      });

      it('should return deposit within 30 days', () => {
        const moveOut = new Date('2024-06-30');
        const { deadline, daysAllowed } = getSecurityDepositReturnDeadline(state, moveOut);

        expect(daysAllowed).toBe(30);
        expect(deadline.toISOString().split('T')[0]).toBe('2024-07-30');
      });
    });

    describe('Trust Account Requirement', () => {
      it('should require trust account for security deposits', () => {
        const result = validateEscrowRequirement(state, 1, false);
        expect(result.isRequired).toBe(true);
        expect(result.isCompliant).toBe(false);
      });
    });

    describe('All NC Leases Compliance', () => {
      it.each(TEST_LEASES.NC)('should validate lease %s compliance', (lease) => {
        const result = LegalComplianceChecker.runFullComplianceCheck(state, {
          monthlyRent: lease.monthly_rent,
          securityDeposit: lease.security_deposit,
          lateFee: lease.late_fee_amount,
          gracePeriodDays: lease.grace_period_days,
          leaseType: 'fixed_term',
          totalUnits: 24,
          hasEscrowAccount: true,
        });

        expect(result.isCompliant).toBe(true);
        expect(result.violations).toHaveLength(0);
      });
    });

    describe('Class Action Scenarios', () => {
      it.each(CLASS_ACTION_PREVENTION_SCENARIOS.NC)(
        'should detect violation: %s',
        (scenario) => {
          if (scenario.scenario.includes('Late fee')) {
            const violation = calculateLateFee(
              state,
              scenario.violation.rent!,
              10,
              scenario.violation.lateFee
            );
            expect(violation.isCompliant).toBe(false);

            const compliant = calculateLateFee(
              state,
              scenario.compliant.rent!,
              10,
              scenario.compliant.lateFee
            );
            expect(compliant.isCompliant).toBe(true);
          }

          if (scenario.scenario.includes('Security deposit exceeds')) {
            const violation = validateSecurityDeposit(
              state,
              scenario.violation.rent!,
              scenario.violation.deposit!,
              'fixed_term'
            );
            expect(violation.isCompliant).toBe(false);

            const compliant = validateSecurityDeposit(
              state,
              scenario.compliant.rent!,
              scenario.compliant.deposit!,
              'fixed_term'
            );
            expect(compliant.isCompliant).toBe(true);
          }
        }
      );
    });
  });

  describe('South Carolina Compliance', () => {
    const state = STATES.SC;

    describe('Late Fee Compliance', () => {
      it('should allow reasonable late fees (up to 10%)', () => {
        const rent = 1000.00;

        const reasonable = calculateLateFee(state, rent, 10, 50.00);
        expect(reasonable.isCompliant).toBe(true);

        const unreasonable = calculateLateFee(state, rent, 10, 500.00);
        expect(unreasonable.isCompliant).toBe(false);
      });

      it('should default to 5% if no lease fee specified', () => {
        const result = calculateLateFee(state, 2000.00, 10);
        expect(result.fee).toBe(100.00);
      });
    });

    describe('Security Deposit Compliance', () => {
      it('should have no statutory limit on security deposit', () => {
        const rent = 1000.00;
        const result = validateSecurityDeposit(state, rent, 5000.00, 'fixed_term');

        expect(result.isCompliant).toBe(true);
        expect(result.maxAllowed).toBeNull();
      });

      it('should return deposit within 30 days', () => {
        const moveOut = new Date('2024-06-30');
        const { deadline, daysAllowed } = getSecurityDepositReturnDeadline(state, moveOut);

        expect(daysAllowed).toBe(30);
      });
    });

    describe('All SC Leases Compliance', () => {
      it.each(TEST_LEASES.SC)('should validate lease %s compliance', (lease) => {
        const result = LegalComplianceChecker.runFullComplianceCheck(state, {
          monthlyRent: lease.monthly_rent,
          securityDeposit: lease.security_deposit,
          lateFee: lease.late_fee_amount,
          gracePeriodDays: lease.grace_period_days,
          leaseType: 'fixed_term',
          totalUnits: 36,
          hasEscrowAccount: false,
        });

        expect(result.isCompliant).toBe(true);
      });
    });
  });

  describe('Georgia (Atlanta) Compliance', () => {
    const state = STATES.GA;

    describe('Late Fee Compliance', () => {
      it('should require late fee to be specified in lease', () => {
        const result = calculateLateFee(state, 2000.00, 10, undefined);
        expect(result.isCompliant).toBe(false);
        expect(result.violations).toContain('GA requires late fee to be specified in lease');
      });

      it('should accept late fee when specified in lease', () => {
        const result = calculateLateFee(state, 2000.00, 10, 100.00);
        expect(result.isCompliant).toBe(true);
        expect(result.fee).toBe(100.00);
      });
    });

    describe('Escrow Account Requirement', () => {
      it('should require escrow for 10+ units', () => {
        const requiresEscrow = validateEscrowRequirement(state, 15, false);
        expect(requiresEscrow.isRequired).toBe(true);
        expect(requiresEscrow.isCompliant).toBe(false);

        const hasEscrow = validateEscrowRequirement(state, 15, true);
        expect(hasEscrow.isCompliant).toBe(true);
      });

      it('should not require escrow for fewer than 10 units', () => {
        const result = validateEscrowRequirement(state, 5, false);
        expect(result.isRequired).toBe(false);
        expect(result.isCompliant).toBe(true);
      });
    });

    describe('Security Deposit Compliance', () => {
      it('should have no statutory limit on security deposit', () => {
        const result = validateSecurityDeposit(state, 5000.00, 15000.00, 'fixed_term');
        expect(result.isCompliant).toBe(true);
        expect(result.maxAllowed).toBeNull();
      });

      it('should return deposit within 30 days', () => {
        const moveOut = new Date('2024-06-30');
        const { daysAllowed } = getSecurityDepositReturnDeadline(state, moveOut);
        expect(daysAllowed).toBe(30);
      });
    });

    describe('All GA Leases Compliance', () => {
      it.each(TEST_LEASES.GA)('should validate lease %s compliance', (lease) => {
        const property = TEST_PROPERTIES.GA.find(p => p.id === lease.property_id);

        const result = LegalComplianceChecker.runFullComplianceCheck(state, {
          monthlyRent: lease.monthly_rent,
          securityDeposit: lease.security_deposit,
          lateFee: lease.late_fee_amount,
          gracePeriodDays: lease.grace_period_days,
          leaseType: 'fixed_term',
          totalUnits: property?.units_count || 0,
          hasEscrowAccount: true,
        });

        expect(result.isCompliant).toBe(true);
      });
    });

    describe('Class Action Scenarios', () => {
      it('should detect missing escrow account for large property', () => {
        const result = validateEscrowRequirement(state, 120, false);
        expect(result.isCompliant).toBe(false);
        expect(result.violations[0]).toContain('escrow account');
      });

      it('should detect late fee not specified in lease', () => {
        const result = calculateLateFee(state, 2500.00, 10);
        expect(result.isCompliant).toBe(false);
      });
    });
  });
});

// ============================================================================
// SECTION 4: HAPPY PATH TESTS
// ============================================================================

describe('Happy Path Scenarios', () => {
  describe('New Tenant Onboarding', () => {
    it('should calculate correct move-in costs for NC property', () => {
      const lease = TEST_LEASES.NC[0];
      const firstMonthRent = new Money(lease.monthly_rent);
      const deposit = new Money(lease.security_deposit);
      const prorated = new Money(calculateProratedRent(lease.monthly_rent, 31, 15));

      const totalMoveIn = firstMonthRent.add(deposit).add(prorated);

      expect(totalMoveIn.toNumber()).toBeGreaterThan(0);
      expect(firstMonthRent.toNumber()).toBe(1200.00);
      expect(deposit.toNumber()).toBe(2400.00);
    });

    it('should calculate correct move-in costs for GA luxury property', () => {
      const lease = TEST_LEASES.GA[1]; // Buckhead luxury
      const firstMonthRent = new Money(lease.monthly_rent);
      const deposit = new Money(lease.security_deposit);

      const totalMoveIn = firstMonthRent.add(deposit);

      expect(totalMoveIn.toNumber()).toBe(16500.00); // $5500 + $11000
    });
  });

  describe('On-Time Payment Processing', () => {
    it('should process on-time payment without late fees', () => {
      const payment = TEST_PAYMENTS.NC[0];
      expect(payment.late_fee).toBe(0);
      expect(payment.status).toBe('paid');
    });

    it('should maintain zero balance for current tenants', () => {
      const currentTenants = TEST_TENANTS.NC.filter(t => t.balance_due === 0);
      expect(currentTenants.length).toBeGreaterThan(0);
    });
  });

  describe('Lease Renewal', () => {
    it('should validate lease dates are consecutive', () => {
      const lease = TEST_LEASES.NC[0];
      const startDate = new Date(lease.start_date);
      const endDate = new Date(lease.end_date);

      expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    });

    it('should verify security deposit compliance on renewal', () => {
      for (const lease of TEST_LEASES.NC) {
        const result = validateSecurityDeposit(
          STATES.NC,
          lease.monthly_rent,
          lease.security_deposit,
          'fixed_term'
        );
        expect(result.isCompliant).toBe(true);
      }
    });
  });

  describe('Move-Out Process', () => {
    it('should calculate security deposit return deadline correctly', () => {
      const moveOutDate = new Date('2024-12-31');
      const { deadline, daysAllowed } = getSecurityDepositReturnDeadline(STATES.NC, moveOutDate);

      expect(daysAllowed).toBe(30);
      expect(deadline.toISOString().split('T')[0]).toBe('2025-01-30');
    });

    it('should handle leap year move-out correctly', () => {
      // Note: new Date('2024-02-29') may parse differently across environments
      // Using explicit date construction for reliability
      const moveOutDate = new Date(2024, 1, 29); // Feb 29, 2024 (month is 0-indexed)
      const { deadline } = getSecurityDepositReturnDeadline(STATES.GA, moveOutDate);

      // Feb 29 + 30 days = March 30
      expect(deadline.getMonth()).toBe(2); // March
      expect(deadline.getDate()).toBe(30);
    });
  });
});

// ============================================================================
// SECTION 5: NEGATIVE TESTS
// ============================================================================

describe('Negative Test Scenarios', () => {
  describe('Invalid Data Handling', () => {
    it('should handle negative rent amount', () => {
      expect(() => {
        const money = new Money(-1000);
        expect(money.isNegative()).toBe(true);
      }).not.toThrow();
    });

    it('should handle zero rent for late fee calculation', () => {
      const result = calculateLateFee(STATES.NC, 0, 10);
      expect(result.fee).toBe(15); // NC minimum $15
    });

    it('should handle very large amounts', () => {
      const large = new Money(EDGE_CASE_SCENARIOS.boundaryValues.maxRent);
      expect(large.toNumber()).toBe(99999999.99);
    });

    it('should handle minimum amount', () => {
      const tiny = new Money(EDGE_CASE_SCENARIOS.boundaryValues.minRent);
      expect(tiny.toNumber()).toBe(0.01);
    });
  });

  describe('Compliance Violations', () => {
    it('should reject NC late fee exceeding legal maximum', () => {
      const result = calculateLateFee(STATES.NC, 1000.00, 10, 150.00);
      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should reject NC security deposit exceeding 2 months', () => {
      const result = validateSecurityDeposit(STATES.NC, 1000.00, 3000.00, 'fixed_term');
      expect(result.isCompliant).toBe(false);
    });

    it('should reject GA property without escrow when required', () => {
      const result = validateEscrowRequirement(STATES.GA, 50, false);
      expect(result.isCompliant).toBe(false);
    });

    it('should reject NC grace period less than 5 days', () => {
      const result = LegalComplianceChecker.runFullComplianceCheck(STATES.NC, {
        monthlyRent: 1500.00,
        securityDeposit: 3000.00,
        lateFee: 75.00,
        gracePeriodDays: 3, // Violation!
        leaseType: 'fixed_term',
        totalUnits: 10,
        hasEscrowAccount: true,
      });

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.includes('grace period'))).toBe(true);
    });
  });

  describe('Payment Failures', () => {
    it('should handle partial payment allocation', () => {
      const charges = [
        { id: 'c1', amount: 1000.00, date: new Date('2024-01-01'), type: 'rent' },
        { id: 'c2', amount: 1000.00, date: new Date('2024-02-01'), type: 'rent' },
      ];

      const allocations = allocatePayment(500.00, charges);

      expect(allocations.length).toBe(1);
      expect(allocations[0].allocatedAmount).toBe(500.00);
      expect(allocations[0].remainingCharge).toBe(500.00);
    });

    it('should handle zero payment amount', () => {
      const charges = [
        { id: 'c1', amount: 1000.00, date: new Date('2024-01-01'), type: 'rent' },
      ];

      const allocations = allocatePayment(0, charges);
      expect(allocations.length).toBe(0);
    });
  });

  describe('Date Edge Cases', () => {
    it('should handle end of month dates correctly', () => {
      // January 31 + 30 days = March 1 (or March 2 depending on leap year)
      const jan31 = new Date(2024, 0, 31); // Jan 31, 2024
      const { deadline } = getSecurityDepositReturnDeadline(STATES.NC, jan31);

      // Jan 31 + 30 days in 2024 (leap year) = March 1
      expect(deadline.getMonth()).toBe(2); // March (0-indexed)
      expect(deadline.getDate()).toBe(1);
    });

    it('should handle leap year February correctly', () => {
      // Use explicit date construction for leap year reliability
      const feb29 = new Date(2024, 1, 29); // Feb 29, 2024
      expect(feb29.getMonth()).toBe(1); // February
      expect(feb29.getDate()).toBe(29);
    });
  });
});

// ============================================================================
// SECTION 6: EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  describe('Boundary Value Testing', () => {
    it('should handle maximum rent amount', () => {
      const maxRent = EDGE_CASE_SCENARIOS.boundaryValues.maxRent;
      const result = calculateLateFee(STATES.GA, maxRent, 10, 4999999.99);

      expect(result.fee).toBeGreaterThan(0);
    });

    it('should handle minimum rent amount', () => {
      const minRent = EDGE_CASE_SCENARIOS.boundaryValues.minRent;
      const result = calculateLateFee(STATES.NC, minRent, 10);

      expect(result.fee).toBe(15); // NC minimum applies
    });

    it('should handle exactly-at-limit security deposit (NC)', () => {
      const rent = 1500.00;
      const exactMax = 3000.00; // Exactly 2 months

      const result = validateSecurityDeposit(STATES.NC, rent, exactMax, 'fixed_term');
      expect(result.isCompliant).toBe(true);
    });

    it('should handle one penny over limit security deposit (NC)', () => {
      const rent = 1500.00;
      const overMax = 3000.01; // One penny over

      const result = validateSecurityDeposit(STATES.NC, rent, overMax, 'fixed_term');
      expect(result.isCompliant).toBe(false);
    });
  });

  describe('Grace Period Boundary', () => {
    it('should be within grace on day 5 (NC) - last day of grace', () => {
      const dueDate = new Date(2024, 0, 1); // Jan 1
      const day5 = new Date(2024, 0, 6); // Jan 6 (5 days after)

      // NC: 5-day grace means days 1-5 after due are still within grace
      expect(isWithinGracePeriod(STATES.NC, dueDate, day5)).toBe(true);
    });

    it('should be late on day 6 (NC) - first day after grace', () => {
      const dueDate = new Date(2024, 0, 1); // Jan 1
      const day6 = new Date(2024, 0, 7); // Jan 7 (6 days after)

      expect(isWithinGracePeriod(STATES.NC, dueDate, day6)).toBe(false);
    });

    it('should be compliant on day 4 (NC)', () => {
      const dueDate = new Date(2024, 0, 1); // Jan 1
      const day4 = new Date(2024, 0, 5); // Jan 5 (4 days after)

      expect(isWithinGracePeriod(STATES.NC, dueDate, day4)).toBe(true);
    });
  });

  describe('Multi-State Property Management', () => {
    it('should apply correct regulations per state', () => {
      const states: StateCode[] = [STATES.NC, STATES.SC, STATES.GA];
      const rent = 1500.00;

      for (const state of states) {
        const lateFee = calculateLateFee(state, rent, 10, 75.00);
        const deposit = validateSecurityDeposit(state, rent, 3000.00, 'fixed_term');

        // All should have a result
        expect(lateFee.fee).toBeGreaterThanOrEqual(0);

        // NC should flag excessive deposit
        if (state === STATES.NC) {
          expect(deposit.isCompliant).toBe(true); // 2 months exactly
        }
      }
    });
  });

  describe('Timezone Considerations', () => {
    it('should handle date-only comparisons without time issues', () => {
      // Payment made at 11:59 PM should still count as that day
      const dueDate = new Date('2024-01-01T00:00:00');
      const paymentDate = new Date('2024-01-05T23:59:59');

      expect(isWithinGracePeriod(STATES.NC, dueDate, paymentDate)).toBe(true);
    });
  });

  describe('Decimal Precision Stress Test', () => {
    it('should maintain precision through 100 calculations', () => {
      let balance = new Money(0);
      const monthlyRent = 1333.33;

      // Add 100 months of rent
      for (let i = 0; i < 100; i++) {
        balance = balance.add(monthlyRent);
      }

      expect(balance.toNumber()).toBe(133333.00);

      // Subtract 100 payments
      for (let i = 0; i < 100; i++) {
        balance = balance.subtract(monthlyRent);
      }

      expect(balance.toNumber()).toBe(0.00);
    });

    it('should handle complex allocation scenario', () => {
      const charges = Array.from({ length: 12 }, (_, i) => ({
        id: `charge-${i}`,
        amount: 1333.33,
        date: new Date(2024, i, 1),
        type: 'rent',
      }));

      // Pay exactly the total
      const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);
      const allocations = allocatePayment(totalCharges, charges);

      const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
      expect(new Money(totalAllocated).toNumber()).toBe(15999.96);
    });
  });
});

// ============================================================================
// SECTION 7: INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  describe('Full Lease Lifecycle', () => {
    it('should process complete NC lease lifecycle', () => {
      const lease = TEST_LEASES.NC[0];
      const tenant = TEST_TENANTS.NC[0];

      // 1. Validate move-in compliance
      const depositCheck = validateSecurityDeposit(
        STATES.NC,
        lease.monthly_rent,
        lease.security_deposit,
        'fixed_term'
      );
      expect(depositCheck.isCompliant).toBe(true);

      // 2. Process monthly payments
      const payments = TEST_PAYMENTS.NC.filter(p => p.tenant_id === tenant.id);
      const totalPaid = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      expect(totalPaid).toBe(3600.00); // 3 months

      // 3. Verify no violations
      const fullCheck = LegalComplianceChecker.runFullComplianceCheck(STATES.NC, {
        monthlyRent: lease.monthly_rent,
        securityDeposit: lease.security_deposit,
        lateFee: lease.late_fee_amount,
        gracePeriodDays: lease.grace_period_days,
        leaseType: 'fixed_term',
        totalUnits: 24,
        hasEscrowAccount: true,
      });

      expect(fullCheck.isCompliant).toBe(true);
    });

    it('should handle late payment scenario in SC', () => {
      const lease = TEST_LEASES.SC[1];
      const tenant = TEST_TENANTS.SC[1]; // Has late payments

      // Verify late fee was charged
      const payments = TEST_PAYMENTS.SC.filter(p => p.tenant_id === tenant.id);
      const latePayments = payments.filter(p => p.late_fee && p.late_fee > 0);

      expect(latePayments.length).toBeGreaterThan(0);

      // Verify late fee is reasonable
      for (const payment of latePayments) {
        const lateFeeCheck = calculateLateFee(STATES.SC, lease.monthly_rent, 10, payment.late_fee);
        expect(lateFeeCheck.isCompliant).toBe(true);
      }
    });

    it('should handle high-value GA lease correctly', () => {
      const lease = TEST_LEASES.GA[1]; // Buckhead luxury $5500/month
      const tenant = TEST_TENANTS.GA[1];

      // Verify accounting
      expect(lease.monthly_rent).toBe(5500.00);
      expect(lease.security_deposit).toBe(11000.00);

      // Check escrow requirement
      const property = TEST_PROPERTIES.GA.find(p => p.id === lease.property_id);
      const escrowCheck = validateEscrowRequirement(STATES.GA, property!.units_count, true);

      expect(escrowCheck.isRequired).toBe(true);
      expect(escrowCheck.isCompliant).toBe(true);
    });
  });

  describe('Cross-State Compliance Matrix', () => {
    const testCases = [
      { state: STATES.NC, rent: 1500, deposit: 3000, lateFee: 75, grace: 5 },
      { state: STATES.SC, rent: 2000, deposit: 2000, lateFee: 100, grace: 3 },
      { state: STATES.GA, rent: 2500, deposit: 5000, lateFee: 125, grace: 5 },
    ];

    it.each(testCases)(
      'should validate $state properties correctly',
      ({ state, rent, deposit, lateFee, grace }) => {
        const depositCheck = validateSecurityDeposit(state, rent, deposit, 'fixed_term');
        const lateFeeCheck = calculateLateFee(state, rent, 10, lateFee);

        // All test cases should be compliant
        if (state === STATES.NC) {
          expect(depositCheck.isCompliant).toBe(true);
        }

        if (state !== STATES.GA) {
          expect(lateFeeCheck.isCompliant).toBe(true);
        }
      }
    );
  });
});

// ============================================================================
// SECTION 8: REGRESSION TESTS
// ============================================================================

describe('Regression Tests', () => {
  describe('Previously Fixed Issues', () => {
    it('should not have floating-point errors in balance calculation', () => {
      // This was a common issue before Money class
      const charges = [19.99, 29.99, 39.99];
      const payments = [89.97];

      const balance = calculateBalance(charges, payments);
      expect(balance).toBe(0.00);
    });

    it('should correctly handle NC 5%/$15 late fee edge case', () => {
      // Edge case: $300 rent, 5% = $15, should use $15
      const result = calculateLateFee(STATES.NC, 300.00, 10);
      expect(result.fee).toBe(15.00);

      // Edge case: $299 rent, 5% = $14.95, should use $15
      const result2 = calculateLateFee(STATES.NC, 299.00, 10);
      expect(result2.fee).toBe(15.00);

      // Edge case: $301 rent, 5% = $15.05, should use $15.05
      const result3 = calculateLateFee(STATES.NC, 301.00, 10);
      expect(result3.fee).toBe(15.05);
    });

    it('should handle month-end proration correctly', () => {
      // Issue: Proration on last day of month
      const prorated = calculateProratedRent(3100.00, 31, 31);
      expect(prorated).toBe(3100.00);
    });
  });

  describe('Known Edge Cases', () => {
    it('should handle payment on due date (not late)', () => {
      const dueDate = new Date('2024-01-01');
      const paymentDate = new Date('2024-01-01');

      expect(isWithinGracePeriod(STATES.NC, dueDate, paymentDate)).toBe(true);
    });

    it('should handle year-end/year-start transition', () => {
      const dueDate = new Date('2023-12-31');
      const paymentDate = new Date('2024-01-05');

      expect(isWithinGracePeriod(STATES.NC, dueDate, paymentDate)).toBe(true);
    });
  });
});

// ============================================================================
// SECTION 9: PERFORMANCE TESTS
// ============================================================================

describe('Performance Tests', () => {
  it('should calculate 1000 balances in under 100ms', () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      calculateBalance(
        [1200, 1200, 1200, 50, 75],
        [1200, 1200, 600]
      );
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should process 1000 late fee calculations in under 100ms', () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      calculateLateFee(STATES.NC, 1500.00, 10, 75.00);
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it('should validate 1000 security deposits in under 100ms', () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      validateSecurityDeposit(STATES.NC, 1500.00, 3000.00, 'fixed_term');
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
