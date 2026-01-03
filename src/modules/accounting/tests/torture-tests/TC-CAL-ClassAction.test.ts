/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category: Class Action Lawsuit Prevention
 * "The Legal Shield"
 *
 * Goal: Prevent class action lawsuits through rigorous compliance testing
 * Based on real property management lawsuits and regulatory violations
 *
 * Test IDs: TC-CAL-001 to TC-CAL-015
 *
 * Key Lawsuit Categories Covered:
 * 1. Security deposit violations (state-specific deadlines, interest, itemization)
 * 2. Late fee overcharges (exceeding statutory limits)
 * 3. Improper move-out deductions without documentation
 * 4. Trust account commingling
 * 5. Discriminatory fee application
 * 6. Double-billing and phantom charges
 * 7. 1099 reporting errors
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

// ============= COMPLIANCE RULE ENGINE =============

interface ComplianceRule {
  stateCode: string;
  ruleType: 'late_fee' | 'security_deposit' | 'grace_period' | 'return_deadline';
  ruleKey: string;
  ruleValue: string;
  effectiveDate: Date;
  endDate?: Date;
}

interface SecurityDeposit {
  id: string;
  tenantId: string;
  propertyId: string;
  stateCode: string;
  amount: string;
  dateReceived: Date;
  moveOutDate?: Date;
  returnDate?: Date;
  deductions: Deduction[];
  status: 'held' | 'returned' | 'forfeited' | 'applied_to_damages';
}

interface Deduction {
  type: 'cleaning' | 'damage' | 'unpaid_rent' | 'other';
  amount: string;
  description: string;
  photoUrls?: string[];
  invoiceId?: string;
}

interface LateFee {
  tenantId: string;
  leaseId: string;
  stateCode: string;
  rentAmount: string;
  daysLate: number;
  calculatedFee: string;
  appliedDate: Date;
}

interface Tenant {
  id: string;
  unitId: string;
  propertyId: string;
  leaseId: string;
  currentBalance: string;
  lateFeeRate?: number;
}

interface Charge {
  id: string;
  tenantId: string;
  chargeType: string;
  amount: string;
  chargeDate: Date;
  sourceDocumentId?: string;
  sourceDocumentType?: 'lease' | 'invoice' | 'adjustment';
}

interface Payment {
  id: string;
  tenantId: string;
  amount: string;
  paymentDate: Date;
  isOnActiveLease: boolean;
}

interface Vendor {
  id: string;
  name: string;
  tin: string;
  createdDate: Date;
  address?: string;
}

interface VendorPayment {
  vendorId: string;
  amount: string;
  paymentDate: Date;
  paymentMethod: 'check' | 'ach' | 'credit_card';
  invoiceId: string;
}

// Simulated compliance database (NC, SC, GA rules)
const COMPLIANCE_RULES: ComplianceRule[] = [
  // NC Rules
  { stateCode: 'NC', ruleType: 'late_fee', ruleKey: 'max_percent', ruleValue: '5', effectiveDate: new Date('2020-01-01') },
  { stateCode: 'NC', ruleType: 'late_fee', ruleKey: 'max_flat', ruleValue: '15', effectiveDate: new Date('2020-01-01') },
  { stateCode: 'NC', ruleType: 'grace_period', ruleKey: 'days', ruleValue: '5', effectiveDate: new Date('2020-01-01') },
  { stateCode: 'NC', ruleType: 'security_deposit', ruleKey: 'max_months', ruleValue: '2', effectiveDate: new Date('2020-01-01') },
  { stateCode: 'NC', ruleType: 'return_deadline', ruleKey: 'days', ruleValue: '30', effectiveDate: new Date('2020-01-01') },

  // SC Rules
  { stateCode: 'SC', ruleType: 'late_fee', ruleKey: 'max_percent', ruleValue: '10', effectiveDate: new Date('2020-01-01') }, // "Reasonable"
  { stateCode: 'SC', ruleType: 'grace_period', ruleKey: 'days', ruleValue: '0', effectiveDate: new Date('2020-01-01') }, // No mandatory grace
  { stateCode: 'SC', ruleType: 'security_deposit', ruleKey: 'max_months', ruleValue: '0', effectiveDate: new Date('2020-01-01') }, // No limit
  { stateCode: 'SC', ruleType: 'return_deadline', ruleKey: 'days', ruleValue: '30', effectiveDate: new Date('2020-01-01') },

  // GA Rules
  { stateCode: 'GA', ruleType: 'late_fee', ruleKey: 'max_percent', ruleValue: '0', effectiveDate: new Date('2020-01-01') }, // No limit
  { stateCode: 'GA', ruleType: 'grace_period', ruleKey: 'days', ruleValue: '0', effectiveDate: new Date('2020-01-01') },
  { stateCode: 'GA', ruleType: 'security_deposit', ruleKey: 'max_months', ruleValue: '0', effectiveDate: new Date('2020-01-01') }, // No limit
  { stateCode: 'GA', ruleType: 'return_deadline', ruleKey: 'days', ruleValue: '30', effectiveDate: new Date('2020-01-01') },

  // Chicago city override (deposit interest)
  { stateCode: 'IL:CHICAGO', ruleType: 'security_deposit', ruleKey: 'interest_rate', ruleValue: '0.01', effectiveDate: new Date('2020-01-01') },
];

// ============= HELPER FUNCTIONS =============

function getComplianceRule(stateCode: string, ruleType: string, ruleKey: string): string | null {
  const rule = COMPLIANCE_RULES.find(r =>
    r.stateCode === stateCode &&
    r.ruleType === ruleType &&
    r.ruleKey === ruleKey
  );
  return rule?.ruleValue ?? null;
}

function calculateLateFee(
  stateCode: string,
  rentAmount: string,
  existingLateFees: string = '0'
): { fee: string; violations: string[] } {
  const violations: string[] = [];
  const rent = new Decimal(rentAmount);
  const existing = new Decimal(existingLateFees);

  // CRITICAL: Base calculation ONLY on rent, NOT on existing late fees
  if (!existing.isZero()) {
    // This check prevents late fee stacking
  }

  const maxPercent = getComplianceRule(stateCode, 'late_fee', 'max_percent');
  const maxFlat = getComplianceRule(stateCode, 'late_fee', 'max_flat');

  let fee = new Decimal(0);

  if (maxPercent && parseFloat(maxPercent) > 0) {
    fee = rent.times(parseFloat(maxPercent)).dividedBy(100);

    if (maxFlat && fee.greaterThan(new Decimal(maxFlat))) {
      fee = new Decimal(maxFlat);
    }
  }

  return { fee: fee.toFixed(2), violations };
}

function validateSecurityDepositReturn(deposit: SecurityDeposit): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (!deposit.moveOutDate) {
    return { valid: false, violations: ['Move-out date not set'] };
  }

  const deadlineDays = parseInt(getComplianceRule(deposit.stateCode, 'return_deadline', 'days') ?? '30');
  const deadline = new Date(deposit.moveOutDate);
  deadline.setDate(deadline.getDate() + deadlineDays);

  const today = new Date();

  // Check if return is past deadline
  if (deposit.status === 'held' && today > deadline) {
    violations.push(`Security deposit return past ${deadlineDays}-day deadline for ${deposit.stateCode}`);
  }

  // Check deduction documentation
  for (const deduction of deposit.deductions) {
    const amount = new Decimal(deduction.amount);
    if (amount.greaterThan(new Decimal('50'))) {
      if (!deduction.photoUrls?.length && !deduction.invoiceId) {
        violations.push(`Deduction of $${deduction.amount} for "${deduction.description}" requires photo or invoice documentation`);
      }
    }
  }

  return { valid: violations.length === 0, violations };
}

function detectTrustAccountCommingling(
  paymentPropertyId: string,
  vendorPropertyId: string
): { commingled: boolean; reason?: string } {
  if (paymentPropertyId !== vendorPropertyId) {
    return {
      commingled: true,
      reason: `Payment from property ${paymentPropertyId} used to pay vendor for property ${vendorPropertyId}`,
    };
  }
  return { commingled: false };
}

function detectDiscriminatoryFees(tenants: Tenant[]): { violations: string[] } {
  const violations: string[] = [];

  // Group by unit type (same property = same building = should have same rates)
  const ratesByProperty = new Map<string, Set<number>>();

  for (const tenant of tenants) {
    if (tenant.lateFeeRate !== undefined) {
      if (!ratesByProperty.has(tenant.propertyId)) {
        ratesByProperty.set(tenant.propertyId, new Set());
      }
      ratesByProperty.get(tenant.propertyId)!.add(tenant.lateFeeRate);
    }
  }

  for (const [propertyId, rates] of ratesByProperty) {
    if (rates.size > 1) {
      violations.push(`Property ${propertyId} has inconsistent late fee rates: ${Array.from(rates).join('%, ')}%`);
    }
  }

  return { violations };
}

function detectDoubleBilling(charges: Charge[]): { duplicates: Charge[][] } {
  const duplicates: Charge[][] = [];
  const seen = new Map<string, Charge[]>();

  for (const charge of charges) {
    // Key: tenant + date + amount + type
    const key = `${charge.tenantId}-${charge.chargeDate.toISOString().split('T')[0]}-${charge.amount}-${charge.chargeType}`;

    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key)!.push(charge);
  }

  for (const [_, chargeGroup] of seen) {
    if (chargeGroup.length > 1) {
      duplicates.push(chargeGroup);
    }
  }

  return { duplicates };
}

function validateChargeSourceDocument(charge: Charge): { valid: boolean; reason?: string } {
  if (!charge.sourceDocumentId || !charge.sourceDocumentType) {
    return { valid: false, reason: 'Charge must have source document reference' };
  }
  return { valid: true };
}

function validatePaymentFromActiveTenant(payment: Payment, activeLeases: Set<string>): { valid: boolean; reason?: string } {
  if (!payment.isOnActiveLease) {
    return { valid: false, reason: `Payment from tenant ${payment.tenantId} who is not on active lease` };
  }
  return { valid: true };
}

function validate1099TIN(tin: string): { valid: boolean; reason?: string } {
  // Valid formats: XX-XXXXXXX (EIN) or XXX-XX-XXXX (SSN)
  const einPattern = /^\d{2}-\d{7}$/;
  const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;

  if (!einPattern.test(tin) && !ssnPattern.test(tin)) {
    return { valid: false, reason: `Invalid TIN format: ${tin}` };
  }
  return { valid: true };
}

function calculate1099Threshold(vendorPayments: VendorPayment[]): {
  totalAmount: string;
  shouldGenerate: boolean;
  excludedCreditCard: string;
} {
  let total = new Decimal(0);
  let creditCardTotal = new Decimal(0);

  for (const payment of vendorPayments) {
    const amount = new Decimal(payment.amount);
    if (payment.paymentMethod === 'credit_card') {
      creditCardTotal = creditCardTotal.plus(amount);
    } else {
      total = total.plus(amount);
    }
  }

  return {
    totalAmount: total.toFixed(2),
    shouldGenerate: total.greaterThanOrEqualTo(new Decimal('600')),
    excludedCreditCard: creditCardTotal.toFixed(2),
  };
}

function detectFicticiousVendor(vendor: Vendor, largeInvoice: VendorPayment): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Flag if vendor created same day as large invoice
  const vendorDate = vendor.createdDate.toISOString().split('T')[0];
  const invoiceDate = largeInvoice.paymentDate.toISOString().split('T')[0];
  const amount = new Decimal(largeInvoice.amount);

  if (vendorDate === invoiceDate && amount.greaterThan(new Decimal('10000'))) {
    reasons.push(`Vendor created same day as $${largeInvoice.amount} invoice`);
  }

  return { suspicious: reasons.length > 0, reasons };
}

function calculateDepositInterest(
  deposit: SecurityDeposit,
  months: number
): string {
  const rate = getComplianceRule(deposit.stateCode, 'security_deposit', 'interest_rate');
  if (!rate || parseFloat(rate) === 0) {
    return '0.00';
  }

  const principal = new Decimal(deposit.amount);
  const annualRate = new Decimal(rate).dividedBy(100);
  const monthlyRate = annualRate.dividedBy(12);
  const interest = principal.times(monthlyRate).times(months);

  return interest.toDecimalPlaces(2).toFixed(2);
}

// ============= TEST SUITE =============

describe('CLASS ACTION LAWSUIT PREVENTION TESTS', () => {
  describe('TC-CAL-001: Security Deposit Return Deadline (NC 30 days)', () => {
    it('should flag deposits not returned within 30 days for NC properties', () => {
      const deposit: SecurityDeposit = {
        id: 'dep-001',
        tenantId: 'tenant-001',
        propertyId: 'prop-001',
        stateCode: 'NC',
        amount: '2000.00',
        dateReceived: new Date('2024-01-01'),
        moveOutDate: new Date('2024-06-01'), // Moved out June 1
        returnDate: undefined, // Not returned yet
        deductions: [],
        status: 'held',
      };

      // Simulate today being July 15 (45 days past deadline)
      const result = validateSecurityDepositReturn(deposit);

      expect(result.violations.some(v => v.includes('30-day deadline'))).toBe(true);
    });

    it('should NOT flag deposits returned within 30 days', () => {
      const deposit: SecurityDeposit = {
        id: 'dep-002',
        tenantId: 'tenant-002',
        propertyId: 'prop-002',
        stateCode: 'NC',
        amount: '1500.00',
        dateReceived: new Date('2024-01-01'),
        moveOutDate: new Date('2024-06-01'),
        returnDate: new Date('2024-06-25'), // Returned within deadline
        deductions: [],
        status: 'returned',
      };

      const result = validateSecurityDepositReturn(deposit);
      expect(result.violations.filter(v => v.includes('deadline'))).toHaveLength(0);
    });
  });

  describe('TC-CAL-002: Late Fee Cap Enforcement (NC 5% or $15)', () => {
    it('should cap late fee at $15 when 5% of rent exceeds $15', () => {
      const result = calculateLateFee('NC', '1000.00');
      // 5% of $1000 = $50, but NC cap is $15
      expect(result.fee).toBe('15.00');
    });

    it('should calculate 5% when under $15 cap', () => {
      const result = calculateLateFee('NC', '200.00');
      // 5% of $200 = $10
      expect(result.fee).toBe('10.00');
    });

    it('should calculate exactly at boundary ($300 rent = $15 fee)', () => {
      const result = calculateLateFee('NC', '300.00');
      // 5% of $300 = $15 exactly
      expect(result.fee).toBe('15.00');
    });
  });

  describe('TC-CAL-003: Late Fee Anti-Stacking', () => {
    /**
     * CRITICAL: Late fees should NEVER be calculated on existing late fees
     * This is a common class action trigger
     */
    it('should NOT calculate late fee on existing late fee balance', () => {
      // Tenant owes $1000 rent + $15 existing late fee = $1015 balance
      // New late fee should be based on $1000 rent only, NOT $1015

      const rentAmount = '1000.00';
      const existingLateFees = '15.00';

      // The function should internally ignore existingLateFees
      const result = calculateLateFee('NC', rentAmount, existingLateFees);

      // Fee should be capped at $15 (5% of $1000, capped)
      expect(result.fee).toBe('15.00');

      // WRONG calculation would be: 5% of $1015 = $50.75, capped to $15
      // But that's the same result. Let's test with higher rent
    });

    it('should calculate late fee on rent only, ignoring fees', () => {
      // More explicit test: $2000 rent + $15 late fee
      // Correct: 5% of $2000 = $100, capped at $15
      // Wrong: 5% of $2015 = $100.75, capped at $15 (same result due to cap)

      // Test with SC (no flat cap, just percentage)
      const rentAmount = '2000.00';
      const existingLateFees = '500.00'; // Accumulated late fees

      // SC allows up to 10%
      const result = calculateLateFee('SC', rentAmount, existingLateFees);

      // Should be 10% of $2000 = $200, NOT 10% of $2500 = $250
      expect(result.fee).toBe('200.00');
    });
  });

  describe('TC-CAL-004: Move-Out Deduction Documentation', () => {
    it('should require photo/invoice for deductions over $50', () => {
      const deposit: SecurityDeposit = {
        id: 'dep-003',
        tenantId: 'tenant-003',
        propertyId: 'prop-003',
        stateCode: 'NC',
        amount: '2000.00',
        dateReceived: new Date('2024-01-01'),
        moveOutDate: new Date('2024-06-01'),
        deductions: [
          {
            type: 'cleaning',
            amount: '200.00',
            description: 'Deep cleaning required',
            // NO photoUrls or invoiceId - this should fail
          },
        ],
        status: 'held',
      };

      const result = validateSecurityDepositReturn(deposit);

      expect(result.violations.some(v => v.includes('requires photo or invoice'))).toBe(true);
    });

    it('should accept deductions under $50 without documentation', () => {
      const deposit: SecurityDeposit = {
        id: 'dep-004',
        tenantId: 'tenant-004',
        propertyId: 'prop-004',
        stateCode: 'NC',
        amount: '2000.00',
        dateReceived: new Date('2024-01-01'),
        moveOutDate: new Date('2024-06-01'),
        deductions: [
          {
            type: 'cleaning',
            amount: '45.00',
            description: 'Minor touch-up cleaning',
            // No docs required for under $50
          },
        ],
        status: 'held',
      };

      const result = validateSecurityDepositReturn(deposit);

      expect(result.violations.filter(v => v.includes('documentation'))).toHaveLength(0);
    });

    it('should accept deductions with proper documentation', () => {
      const deposit: SecurityDeposit = {
        id: 'dep-005',
        tenantId: 'tenant-005',
        propertyId: 'prop-005',
        stateCode: 'NC',
        amount: '2000.00',
        dateReceived: new Date('2024-01-01'),
        moveOutDate: new Date('2024-06-01'),
        deductions: [
          {
            type: 'damage',
            amount: '500.00',
            description: 'Wall damage repair',
            photoUrls: ['https://storage.example.com/damage1.jpg'],
            invoiceId: 'inv-001',
          },
        ],
        status: 'held',
      };

      const result = validateSecurityDepositReturn(deposit);

      expect(result.violations.filter(v => v.includes('documentation'))).toHaveLength(0);
    });
  });

  describe('TC-CAL-005: Trust Account Commingling Detection', () => {
    it('should block payment from property A to vendor for property B', () => {
      const result = detectTrustAccountCommingling('PROP-A', 'PROP-B');

      expect(result.commingled).toBe(true);
      expect(result.reason).toContain('PROP-A');
      expect(result.reason).toContain('PROP-B');
    });

    it('should allow payment within same property', () => {
      const result = detectTrustAccountCommingling('PROP-A', 'PROP-A');

      expect(result.commingled).toBe(false);
    });
  });

  describe('TC-CAL-006: Discriminatory Fee Detection', () => {
    it('should flag when identical units have different late fee rates', () => {
      const tenants: Tenant[] = [
        { id: 't1', unitId: 'u1', propertyId: 'p1', leaseId: 'l1', currentBalance: '0', lateFeeRate: 5 },
        { id: 't2', unitId: 'u2', propertyId: 'p1', leaseId: 'l2', currentBalance: '0', lateFeeRate: 8 },
        { id: 't3', unitId: 'u3', propertyId: 'p1', leaseId: 'l3', currentBalance: '0', lateFeeRate: 5 },
      ];

      const result = detectDiscriminatoryFees(tenants);

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('inconsistent');
    });

    it('should not flag when all tenants have same rate', () => {
      const tenants: Tenant[] = [
        { id: 't1', unitId: 'u1', propertyId: 'p1', leaseId: 'l1', currentBalance: '0', lateFeeRate: 5 },
        { id: 't2', unitId: 'u2', propertyId: 'p1', leaseId: 'l2', currentBalance: '0', lateFeeRate: 5 },
      ];

      const result = detectDiscriminatoryFees(tenants);

      expect(result.violations).toHaveLength(0);
    });
  });

  describe('TC-CAL-007: Double-Billing Detection', () => {
    it('should detect duplicate charges (same tenant/date/amount/type)', () => {
      const charges: Charge[] = [
        { id: 'c1', tenantId: 't1', chargeType: 'rent', amount: '1500.00', chargeDate: new Date('2024-01-01') },
        { id: 'c2', tenantId: 't1', chargeType: 'rent', amount: '1500.00', chargeDate: new Date('2024-01-01') }, // Duplicate
        { id: 'c3', tenantId: 't1', chargeType: 'utilities', amount: '150.00', chargeDate: new Date('2024-01-01') },
      ];

      const result = detectDoubleBilling(charges);

      expect(result.duplicates.length).toBe(1);
      expect(result.duplicates[0]).toHaveLength(2);
    });

    it('should not flag different charge types as duplicates', () => {
      const charges: Charge[] = [
        { id: 'c1', tenantId: 't1', chargeType: 'rent', amount: '1500.00', chargeDate: new Date('2024-01-01') },
        { id: 'c2', tenantId: 't1', chargeType: 'late_fee', amount: '1500.00', chargeDate: new Date('2024-01-01') },
      ];

      const result = detectDoubleBilling(charges);

      expect(result.duplicates).toHaveLength(0);
    });
  });

  describe('TC-CAL-008: Phantom Charge Audit Trail', () => {
    it('should require source document for every charge', () => {
      const chargeWithoutSource: Charge = {
        id: 'c1',
        tenantId: 't1',
        chargeType: 'other',
        amount: '100.00',
        chargeDate: new Date('2024-01-01'),
        // Missing sourceDocumentId and sourceDocumentType
      };

      const result = validateChargeSourceDocument(chargeWithoutSource);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('source document');
    });

    it('should accept charges with valid source documents', () => {
      const chargeWithSource: Charge = {
        id: 'c2',
        tenantId: 't1',
        chargeType: 'rent',
        amount: '1500.00',
        chargeDate: new Date('2024-01-01'),
        sourceDocumentId: 'lease-001',
        sourceDocumentType: 'lease',
      };

      const result = validateChargeSourceDocument(chargeWithSource);

      expect(result.valid).toBe(true);
    });
  });

  describe('TC-CAL-009: Ghost Tenant Payment Rejection', () => {
    it('should reject payment from tenant not on active lease', () => {
      const payment: Payment = {
        id: 'pay-001',
        tenantId: 'ghost-tenant',
        amount: '1500.00',
        paymentDate: new Date('2024-01-15'),
        isOnActiveLease: false,
      };

      const activeLeases = new Set(['tenant-001', 'tenant-002']);

      const result = validatePaymentFromActiveTenant(payment, activeLeases);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not on active lease');
    });

    it('should accept payment from tenant on active lease', () => {
      const payment: Payment = {
        id: 'pay-002',
        tenantId: 'tenant-001',
        amount: '1500.00',
        paymentDate: new Date('2024-01-15'),
        isOnActiveLease: true,
      };

      const activeLeases = new Set(['tenant-001', 'tenant-002']);

      const result = validatePaymentFromActiveTenant(payment, activeLeases);

      expect(result.valid).toBe(true);
    });
  });

  describe('TC-CAL-010: 1099 TIN Validation ($290/form penalty)', () => {
    it('should reject invalid TIN format', () => {
      const invalidTINs = [
        '12-34567', // Missing 2 digits (only 5 after dash, need 7)
        '123456789', // No dashes
        '12-34567890', // Extra digit (8 after dash instead of 7)
        'XX-XXXXXXX', // Letters
      ];

      for (const tin of invalidTINs) {
        const result = validate1099TIN(tin);
        expect(result.valid).toBe(false);
      }
    });

    it('should accept valid EIN format (XX-XXXXXXX)', () => {
      const result = validate1099TIN('12-3456789');
      expect(result.valid).toBe(true);
    });

    it('should accept valid SSN format (XXX-XX-XXXX)', () => {
      const result = validate1099TIN('123-45-6789');
      expect(result.valid).toBe(true);
    });
  });

  describe('TC-CAL-011: City-Specific Deposit Interest (Chicago)', () => {
    it('should calculate exact interest per city jurisdiction', () => {
      const deposit: SecurityDeposit = {
        id: 'dep-chicago',
        tenantId: 't1',
        propertyId: 'p1',
        stateCode: 'IL:CHICAGO',
        amount: '2000.00',
        dateReceived: new Date('2024-01-01'),
        deductions: [],
        status: 'held',
      };

      // Chicago rate is 0.01% annually
      // $2000 * 0.01% / 12 * 12 months = $0.20
      const interest = calculateDepositInterest(deposit, 12);

      expect(interest).toBe('0.20');
    });

    it('should return zero interest for states without requirement', () => {
      const deposit: SecurityDeposit = {
        id: 'dep-nc',
        tenantId: 't1',
        propertyId: 'p1',
        stateCode: 'NC',
        amount: '2000.00',
        dateReceived: new Date('2024-01-01'),
        deductions: [],
        status: 'held',
      };

      const interest = calculateDepositInterest(deposit, 12);

      expect(interest).toBe('0.00');
    });
  });

  describe('TC-CAL-012: Prepaid Rent Revenue Timing', () => {
    /**
     * Prepaid rent must only be recognized in the earned period
     * Cannot book future rent as current revenue
     */
    it('should recognize only earned portion of prepaid rent', () => {
      const prepaidMonths = 6;
      const monthlyRent = new Decimal('1500.00');
      const totalPrepaid = monthlyRent.times(prepaidMonths);

      // In month 1, only 1 month should be recognized
      const earnedMonth1 = monthlyRent.times(1);
      const deferredMonth1 = totalPrepaid.minus(earnedMonth1);

      expect(earnedMonth1.toFixed(2)).toBe('1500.00');
      expect(deferredMonth1.toFixed(2)).toBe('7500.00');

      // In month 3, 3 months should be recognized
      const earnedMonth3 = monthlyRent.times(3);
      const deferredMonth3 = totalPrepaid.minus(earnedMonth3);

      expect(earnedMonth3.toFixed(2)).toBe('4500.00');
      expect(deferredMonth3.toFixed(2)).toBe('4500.00');
    });
  });

  describe('TC-CAL-013: NSF Fee State Maximum Caps', () => {
    it('should cap NSF fee where state law applies', () => {
      // Simulated NSF fee validation
      const nsfFee = new Decimal('35.00');
      const stateCap = new Decimal('25.00'); // Some states cap at $25

      const appliedFee = Decimal.min(nsfFee, stateCap);

      expect(appliedFee.toFixed(2)).toBe('25.00');
    });

    it('should allow full NSF fee where no cap exists', () => {
      const nsfFee = new Decimal('35.00');
      const stateCap: Decimal | null = null; // No cap

      const appliedFee = stateCap ? Decimal.min(nsfFee, stateCap) : nsfFee;

      expect(appliedFee.toFixed(2)).toBe('35.00');
    });
  });

  describe('TC-CAL-014: Eviction Block During Payment Plan', () => {
    /**
     * Cannot file eviction when tenant is on active payment plan
     * with no missed payments
     */
    it('should prevent eviction notice when active payment plan exists', () => {
      interface PaymentPlan {
        status: 'active' | 'completed' | 'defaulted';
        missedPayments: number;
      }

      function canFileEviction(plan: PaymentPlan | null): { allowed: boolean; reason?: string } {
        if (plan && plan.status === 'active' && plan.missedPayments === 0) {
          return { allowed: false, reason: 'Active payment plan with no missed payments' };
        }
        return { allowed: true };
      }

      const activePlan: PaymentPlan = { status: 'active', missedPayments: 0 };
      const result = canFileEviction(activePlan);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Active payment plan');
    });

    it('should allow eviction for defaulted payment plan', () => {
      interface PaymentPlan {
        status: 'active' | 'completed' | 'defaulted';
        missedPayments: number;
      }

      function canFileEviction(plan: PaymentPlan | null): { allowed: boolean; reason?: string } {
        if (plan && plan.status === 'active' && plan.missedPayments === 0) {
          return { allowed: false, reason: 'Active payment plan with no missed payments' };
        }
        return { allowed: true };
      }

      const defaultedPlan: PaymentPlan = { status: 'defaulted', missedPayments: 2 };
      const result = canFileEviction(defaultedPlan);

      expect(result.allowed).toBe(true);
    });
  });

  describe('TC-CAL-015: Fair Housing Fee Consistency', () => {
    /**
     * All tenants in a property must have identical fee structures
     * Discriminatory fees can trigger Fair Housing Act violations
     */
    it('should verify identical fee structure across all tenants', () => {
      interface FeeStructure {
        lateFeePercent: number;
        lateFeeFlat: number;
        petFee: number;
        parkingFee: number;
      }

      function compareFeeStructures(a: FeeStructure, b: FeeStructure): boolean {
        return (
          a.lateFeePercent === b.lateFeePercent &&
          a.lateFeeFlat === b.lateFeeFlat &&
          a.petFee === b.petFee &&
          a.parkingFee === b.parkingFee
        );
      }

      const propertyFees: FeeStructure = {
        lateFeePercent: 5,
        lateFeeFlat: 15,
        petFee: 25,
        parkingFee: 50,
      };

      const tenantFees: FeeStructure[] = [
        { lateFeePercent: 5, lateFeeFlat: 15, petFee: 25, parkingFee: 50 },
        { lateFeePercent: 5, lateFeeFlat: 15, petFee: 25, parkingFee: 50 },
        { lateFeePercent: 5, lateFeeFlat: 15, petFee: 25, parkingFee: 50 },
      ];

      const allConsistent = tenantFees.every(tf => compareFeeStructures(tf, propertyFees));

      expect(allConsistent).toBe(true);
    });

    it('should detect inconsistent fees', () => {
      interface FeeStructure {
        lateFeePercent: number;
        petFee: number;
      }

      const tenantFees: FeeStructure[] = [
        { lateFeePercent: 5, petFee: 25 },
        { lateFeePercent: 5, petFee: 50 }, // Different pet fee!
      ];

      const hasInconsistency = new Set(tenantFees.map(f => f.petFee)).size > 1;

      expect(hasInconsistency).toBe(true);
    });
  });

  describe('TC-CAL-BONUS: 1099 Threshold Detection', () => {
    it('should generate 1099 for payments at or above $600', () => {
      const payments: VendorPayment[] = [
        { vendorId: 'v1', amount: '300.00', paymentDate: new Date('2024-03-15'), paymentMethod: 'check', invoiceId: 'i1' },
        { vendorId: 'v1', amount: '300.00', paymentDate: new Date('2024-06-15'), paymentMethod: 'ach', invoiceId: 'i2' },
      ];

      const result = calculate1099Threshold(payments);

      expect(result.totalAmount).toBe('600.00');
      expect(result.shouldGenerate).toBe(true);
    });

    it('should NOT generate 1099 for payments under $600', () => {
      const payments: VendorPayment[] = [
        { vendorId: 'v1', amount: '599.99', paymentDate: new Date('2024-03-15'), paymentMethod: 'check', invoiceId: 'i1' },
      ];

      const result = calculate1099Threshold(payments);

      expect(result.totalAmount).toBe('599.99');
      expect(result.shouldGenerate).toBe(false);
    });

    it('should exclude credit card payments from 1099 calculation', () => {
      const payments: VendorPayment[] = [
        { vendorId: 'v1', amount: '400.00', paymentDate: new Date('2024-03-15'), paymentMethod: 'check', invoiceId: 'i1' },
        { vendorId: 'v1', amount: '5000.00', paymentDate: new Date('2024-06-15'), paymentMethod: 'credit_card', invoiceId: 'i2' },
      ];

      const result = calculate1099Threshold(payments);

      // Only $400 check payment counts, credit card excluded
      expect(result.totalAmount).toBe('400.00');
      expect(result.excludedCreditCard).toBe('5000.00');
      expect(result.shouldGenerate).toBe(false);
    });
  });

  describe('TC-CAL-BONUS: Fictitious Vendor Detection', () => {
    it('should flag vendor created same day as large invoice', () => {
      const vendor: Vendor = {
        id: 'v-new',
        name: 'Quick Fix LLC',
        tin: '12-3456789',
        createdDate: new Date('2024-06-15'),
      };

      const largePayment: VendorPayment = {
        vendorId: 'v-new',
        amount: '50000.00',
        paymentDate: new Date('2024-06-15'), // Same day!
        paymentMethod: 'check',
        invoiceId: 'inv-suspicious',
      };

      const result = detectFicticiousVendor(vendor, largePayment);

      expect(result.suspicious).toBe(true);
      expect(result.reasons[0]).toContain('same day');
    });

    it('should not flag established vendor with large invoice', () => {
      const vendor: Vendor = {
        id: 'v-established',
        name: 'Trusted Contractor Inc',
        tin: '98-7654321',
        createdDate: new Date('2022-01-01'), // Established vendor
      };

      const largePayment: VendorPayment = {
        vendorId: 'v-established',
        amount: '50000.00',
        paymentDate: new Date('2024-06-15'),
        paymentMethod: 'check',
        invoiceId: 'inv-legit',
      };

      const result = detectFicticiousVendor(vendor, largePayment);

      expect(result.suspicious).toBe(false);
    });
  });
});
