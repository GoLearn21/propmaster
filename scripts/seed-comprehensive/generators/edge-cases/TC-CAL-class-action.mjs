/**
 * TC-CAL Class Action Prevention Edge Cases
 * Generates data to test lawsuit prevention scenarios
 *
 * Tests cover:
 * - TC-CAL-001: NC 30-day deposit return deadline
 * - TC-CAL-002: NC late fee cap ($15 or 5%)
 * - TC-CAL-003: Late fee anti-stacking
 * - TC-CAL-004: Move-out damage documentation
 * - TC-CAL-005: Trust commingling prevention
 * - TC-CAL-006: Discriminatory fee detection
 * - TC-CAL-007: Double-billing detection
 * - TC-CAL-008: Phantom charge detection
 * - TC-CAL-009: Ghost tenant payment detection
 * - TC-CAL-010: 1099 TIN validation
 */

import { uuid, tenantId, propertyId, leaseId, paymentId, vendorId, securityDepositId } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import {
  isoTimestamp,
  daysAgo,
  daysFromNow,
  monthsAgo,
} from '../../utils/date-utils.mjs';
import {
  decimalMultiply,
  calculateLateFee,
  randomAmount,
} from '../../utils/decimal-utils.mjs';

/**
 * TC-CAL-001: NC 30-day deposit return deadline
 * Tests security deposit return timing compliance
 */
export function generateTC_CAL_001() {
  const scenarios = [];

  // Various move-out scenarios to test 30-day deadline
  const moveOutCases = [
    { daysAfterMoveout: 25, shouldPass: true, description: 'Returned 25 days after move-out (compliant)' },
    { daysAfterMoveout: 30, shouldPass: true, description: 'Returned exactly 30 days (deadline)' },
    { daysAfterMoveout: 31, shouldPass: false, description: 'Returned 31 days - 1 DAY LATE (VIOLATION)' },
    { daysAfterMoveout: 35, shouldPass: false, description: 'Returned 35 days - 5 DAYS LATE (VIOLATION)' },
    { daysAfterMoveout: 45, shouldPass: false, description: 'Returned 45 days - SEVERE VIOLATION' },
    { daysAfterMoveout: 60, shouldPass: false, description: 'Returned 60 days - CRITICAL VIOLATION' },
    { daysAfterMoveout: null, shouldPass: false, description: 'Never returned - LAWSUIT RISK' },
  ];

  moveOutCases.forEach((tc, index) => {
    const tenant = tenantId();
    const moveOutDate = daysAgo(90);
    const returnDate = tc.daysAfterMoveout
      ? daysAgo(90 - tc.daysAfterMoveout)
      : null;

    scenarios.push({
      id: uuid(),
      test_case: `TC-CAL-001-${String(index + 1).padStart(3, '0')}`,
      tenant_id: tenant,
      state: 'NC',
      deposit_amount: randomAmount(1000, 2500),
      move_out_date: moveOutDate,
      return_date: returnDate,
      days_after_moveout: tc.daysAfterMoveout,
      deadline_days: 30,
      is_compliant: tc.shouldPass,
      violation_type: tc.shouldPass ? null : 'DEPOSIT_RETURN_LATE',
      description: tc.description,
      legal_risk: tc.shouldPass ? 'low' : (tc.daysAfterMoveout > 45 ? 'critical' : 'high'),
      metadata: seedMetadata('TC-CAL-001', {
        seed_type: 'deposit_return_test',
        scenario: index + 1,
        expected_compliant: tc.shouldPass,
      }),
    });
  });

  return {
    testCaseId: 'TC-CAL-001',
    description: 'NC Security deposits must be returned within 30 days of move-out',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      violations: scenarios.filter(s => !s.is_compliant).length,
    },
  };
}

/**
 * TC-CAL-002: NC late fee cap enforcement
 * Tests 5% or $15, whichever is LESS
 */
export function generateTC_CAL_002() {
  const scenarios = [];

  const lateFeeTests = [
    { rent: '200.00', feeCharged: '10.00', maxAllowed: '10.00', compliant: true },
    { rent: '300.00', feeCharged: '15.00', maxAllowed: '15.00', compliant: true },
    { rent: '400.00', feeCharged: '15.00', maxAllowed: '15.00', compliant: true },
    { rent: '1000.00', feeCharged: '15.00', maxAllowed: '15.00', compliant: true },
    { rent: '1000.00', feeCharged: '50.00', maxAllowed: '15.00', compliant: false },
    { rent: '1500.00', feeCharged: '25.00', maxAllowed: '15.00', compliant: false },
    { rent: '2000.00', feeCharged: '100.00', maxAllowed: '15.00', compliant: false },
    { rent: '200.00', feeCharged: '15.00', maxAllowed: '10.00', compliant: false },
    { rent: '100.00', feeCharged: '10.00', maxAllowed: '5.00', compliant: false },
    { rent: '50.00', feeCharged: '5.00', maxAllowed: '2.50', compliant: false },
  ];

  lateFeeTests.forEach((tc, index) => {
    const calculatedMax = calculateLateFee(tc.rent, 5, '15.00');

    scenarios.push({
      id: uuid(),
      test_case: `TC-CAL-002-${String(index + 1).padStart(3, '0')}`,
      state: 'NC',
      monthly_rent: tc.rent,
      late_fee_charged: tc.feeCharged,
      max_allowed: calculatedMax,
      is_compliant: parseFloat(tc.feeCharged) <= parseFloat(calculatedMax),
      overcharge_amount: Math.max(0, parseFloat(tc.feeCharged) - parseFloat(calculatedMax)).toFixed(2),
      violation_type: tc.compliant ? null : 'LATE_FEE_EXCEEDS_CAP',
      legal_risk: tc.compliant ? 'low' : 'high',
      class_action_risk: !tc.compliant && parseFloat(tc.feeCharged) > 20 ? 'ELEVATED' : 'standard',
      metadata: seedMetadata('TC-CAL-002', {
        seed_type: 'late_fee_test',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-CAL-002',
    description: 'NC late fees must be 5% of rent OR $15, whichever is LESS',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      violations: scenarios.filter(s => !s.is_compliant).length,
    },
  };
}

/**
 * TC-CAL-003: Late fee anti-stacking
 * Tests that late fees cannot stack on late fees
 */
export function generateTC_CAL_003() {
  const scenarios = [];

  const stackingTests = [
    { hasExistingLateFee: false, addingLateFee: true, compliant: true, description: 'First late fee - allowed' },
    { hasExistingLateFee: true, addingLateFee: true, compliant: false, description: 'Second late fee same month - STACKING VIOLATION' },
    { hasExistingLateFee: true, existingFeeMonth: 'previous', addingLateFee: true, compliant: true, description: 'Late fee different month - allowed' },
    { hasExistingLateFee: true, existingFeeMonth: 'current', addingLateFee: true, compliant: false, description: 'Adding to current month with late fee - VIOLATION' },
  ];

  stackingTests.forEach((tc, index) => {
    const tenant = tenantId();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const previousMonth = monthsAgo(1).slice(0, 7);

    scenarios.push({
      id: uuid(),
      test_case: `TC-CAL-003-${String(index + 1).padStart(3, '0')}`,
      tenant_id: tenant,
      has_existing_late_fee: tc.hasExistingLateFee,
      existing_fee_period: tc.existingFeeMonth === 'previous' ? previousMonth : currentMonth,
      attempting_period: currentMonth,
      is_compliant: tc.compliant,
      violation_type: tc.compliant ? null : 'LATE_FEE_STACKING',
      description: tc.description,
      metadata: seedMetadata('TC-CAL-003', {
        seed_type: 'late_fee_stacking_test',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-CAL-003',
    description: 'Late fees cannot stack - only one late fee per billing period',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      violations: scenarios.filter(s => !s.is_compliant).length,
    },
  };
}

/**
 * TC-CAL-004: Move-out damage documentation
 * Tests that deductions have proper documentation
 */
export function generateTC_CAL_004() {
  const scenarios = [];

  const documentationTests = [
    { hasPhotos: true, hasItemized: true, hasReceipts: true, compliant: true, description: 'Full documentation' },
    { hasPhotos: true, hasItemized: true, hasReceipts: false, compliant: true, description: 'Photos + itemized (acceptable)' },
    { hasPhotos: true, hasItemized: false, hasReceipts: true, compliant: false, description: 'No itemized statement - VIOLATION' },
    { hasPhotos: false, hasItemized: true, hasReceipts: true, compliant: false, description: 'No photos - DOCUMENTATION RISK' },
    { hasPhotos: false, hasItemized: false, hasReceipts: false, compliant: false, description: 'No documentation - SEVERE VIOLATION' },
    { hasPhotos: true, hasItemized: true, hasReceipts: true, deductionAmount: '0.00', compliant: true, description: 'No deductions - no docs needed' },
  ];

  documentationTests.forEach((tc, index) => {
    const deposit = securityDepositId();
    const deductionAmount = tc.deductionAmount || randomAmount(100, 500);

    scenarios.push({
      id: uuid(),
      test_case: `TC-CAL-004-${String(index + 1).padStart(3, '0')}`,
      security_deposit_id: deposit,
      deduction_amount: deductionAmount,
      has_move_in_photos: true,
      has_move_out_photos: tc.hasPhotos,
      has_itemized_statement: tc.hasItemized,
      has_receipts: tc.hasReceipts,
      itemized_within_deadline: tc.hasItemized,
      is_compliant: tc.compliant,
      violation_type: tc.compliant ? null : 'INSUFFICIENT_DOCUMENTATION',
      legal_risk: tc.compliant ? 'low' : 'high',
      description: tc.description,
      metadata: seedMetadata('TC-CAL-004', {
        seed_type: 'documentation_test',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-CAL-004',
    description: 'Security deposit deductions require itemized statement and photo documentation',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      violations: scenarios.filter(s => !s.is_compliant).length,
    },
  };
}

/**
 * TC-CAL-005: Trust commingling prevention
 * Tests that deposits from different properties are not mixed
 */
export function generateTC_CAL_005() {
  const scenarios = [];

  // Create test properties
  const property1 = propertyId();
  const property2 = propertyId();
  const property3 = propertyId();

  const comminglingTests = [
    {
      trustAccount: 'trust_001',
      properties: [property1],
      deposits: [{ prop: property1, amount: '1500.00' }],
      compliant: true,
      description: 'Single property per trust account - compliant'
    },
    {
      trustAccount: 'trust_002',
      properties: [property1, property2],
      deposits: [
        { prop: property1, amount: '1500.00' },
        { prop: property2, amount: '2000.00' }
      ],
      compliant: false,
      description: 'TWO properties in ONE trust account - COMMINGLING'
    },
    {
      trustAccount: 'trust_003',
      properties: [property1, property2, property3],
      deposits: [
        { prop: property1, amount: '1500.00' },
        { prop: property2, amount: '2000.00' },
        { prop: property3, amount: '1800.00' }
      ],
      compliant: false,
      description: 'THREE properties commingled - SEVERE VIOLATION'
    },
  ];

  comminglingTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-CAL-005-${String(index + 1).padStart(3, '0')}`,
      trust_account_id: tc.trustAccount,
      property_ids: tc.properties,
      property_count: tc.properties.length,
      deposits: tc.deposits,
      total_amount: tc.deposits.reduce((sum, d) => sum + parseFloat(d.amount), 0).toFixed(2),
      is_compliant: tc.compliant,
      violation_type: tc.compliant ? null : 'TRUST_COMMINGLING',
      legal_risk: tc.compliant ? 'low' : 'critical',
      description: tc.description,
      metadata: seedMetadata('TC-CAL-005', {
        seed_type: 'commingling_test',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-CAL-005',
    description: 'Security deposits must be held in separate trust accounts per property',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      violations: scenarios.filter(s => !s.is_compliant).length,
    },
  };
}

/**
 * TC-CAL-006: Discriminatory fee detection
 * Tests that similar units have similar fees
 */
export function generateTC_CAL_006() {
  const scenarios = [];
  const property = propertyId();

  const discriminationTests = [
    {
      units: [
        { unitNum: '101', bedrooms: 2, lateFee: '15.00', tenant: 'Smith' },
        { unitNum: '102', bedrooms: 2, lateFee: '15.00', tenant: 'Jones' }
      ],
      compliant: true,
      description: 'Same fees for same unit type - compliant'
    },
    {
      units: [
        { unitNum: '201', bedrooms: 2, lateFee: '15.00', tenant: 'Smith' },
        { unitNum: '202', bedrooms: 2, lateFee: '50.00', tenant: 'Garcia' }
      ],
      compliant: false,
      description: 'DIFFERENT fees for SAME unit type - DISCRIMINATION RISK'
    },
    {
      units: [
        { unitNum: '301', bedrooms: 1, applicationFee: '50.00', tenant: 'White' },
        { unitNum: '302', bedrooms: 1, applicationFee: '100.00', tenant: 'Black' }
      ],
      compliant: false,
      description: 'Different application fees same unit type - DISCRIMINATION'
    },
  ];

  discriminationTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-CAL-006-${String(index + 1).padStart(3, '0')}`,
      property_id: property,
      units: tc.units,
      is_compliant: tc.compliant,
      violation_type: tc.compliant ? null : 'POTENTIAL_DISCRIMINATION',
      legal_risk: tc.compliant ? 'low' : 'critical',
      description: tc.description,
      metadata: seedMetadata('TC-CAL-006', {
        seed_type: 'discrimination_test',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-CAL-006',
    description: 'Similar units must have similar fee structures to avoid discrimination claims',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      violations: scenarios.filter(s => !s.is_compliant).length,
    },
  };
}

/**
 * TC-CAL-007: Double-billing detection
 * Tests that charges are not duplicated
 */
export function generateTC_CAL_007() {
  const scenarios = [];
  const tenant = tenantId();

  const doubleBillingTests = [
    {
      charges: [
        { date: '2024-01-01', type: 'rent', amount: '1500.00' }
      ],
      compliant: true,
      description: 'Single rent charge - compliant'
    },
    {
      charges: [
        { date: '2024-01-01', type: 'rent', amount: '1500.00' },
        { date: '2024-01-01', type: 'rent', amount: '1500.00' }
      ],
      compliant: false,
      description: 'DUPLICATE rent charge same day - DOUBLE BILLING'
    },
    {
      charges: [
        { date: '2024-01-01', type: 'late_fee', amount: '15.00' },
        { date: '2024-01-02', type: 'late_fee', amount: '15.00' }
      ],
      compliant: false,
      description: 'Two late fees in same month - POTENTIAL DOUBLE BILLING'
    },
  ];

  doubleBillingTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-CAL-007-${String(index + 1).padStart(3, '0')}`,
      tenant_id: tenant,
      charges: tc.charges,
      is_compliant: tc.compliant,
      violation_type: tc.compliant ? null : 'DOUBLE_BILLING',
      refund_required: !tc.compliant,
      description: tc.description,
      metadata: seedMetadata('TC-CAL-007', {
        seed_type: 'double_billing_test',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-CAL-007',
    description: 'System must detect and prevent duplicate charges',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      violations: scenarios.filter(s => !s.is_compliant).length,
    },
  };
}

/**
 * TC-CAL-008: Phantom charge detection
 * Tests that charges have valid tenant associations
 */
export function generateTC_CAL_008() {
  const scenarios = [];

  const phantomTests = [
    { hasTenant: true, tenantActive: true, compliant: true, description: 'Charge to active tenant - valid' },
    { hasTenant: true, tenantActive: false, compliant: false, description: 'Charge to INACTIVE tenant - PHANTOM' },
    { hasTenant: false, compliant: false, description: 'Charge with NO tenant - PHANTOM CHARGE' },
  ];

  phantomTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-CAL-008-${String(index + 1).padStart(3, '0')}`,
      charge_id: uuid(),
      has_tenant: tc.hasTenant,
      tenant_active: tc.tenantActive,
      is_compliant: tc.compliant,
      violation_type: tc.compliant ? null : 'PHANTOM_CHARGE',
      description: tc.description,
      metadata: seedMetadata('TC-CAL-008', {
        seed_type: 'phantom_charge_test',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-CAL-008',
    description: 'Charges must be associated with active tenants',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      violations: scenarios.filter(s => !s.is_compliant).length,
    },
  };
}

/**
 * TC-CAL-009: Ghost tenant payment detection
 * Tests that payments are only applied to valid tenants
 */
export function generateTC_CAL_009() {
  const scenarios = [];

  const ghostTests = [
    { tenantExists: true, tenantActive: true, hasLease: true, compliant: true, description: 'Payment to valid active tenant' },
    { tenantExists: true, tenantActive: false, hasLease: false, compliant: false, description: 'Payment to INACTIVE tenant - GHOST PAYMENT' },
    { tenantExists: false, compliant: false, description: 'Payment to NON-EXISTENT tenant - CRITICAL' },
    { tenantExists: true, tenantActive: true, hasLease: false, compliant: false, description: 'Payment to tenant WITHOUT lease - SUSPICIOUS' },
  ];

  ghostTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-CAL-009-${String(index + 1).padStart(3, '0')}`,
      payment_id: paymentId('test'),
      tenant_exists: tc.tenantExists,
      tenant_active: tc.tenantActive,
      has_active_lease: tc.hasLease,
      is_compliant: tc.compliant,
      violation_type: tc.compliant ? null : 'GHOST_TENANT_PAYMENT',
      fraud_risk: tc.compliant ? 'low' : 'high',
      description: tc.description,
      metadata: seedMetadata('TC-CAL-009', {
        seed_type: 'ghost_payment_test',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-CAL-009',
    description: 'Payments must only be applied to active tenants with valid leases',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      violations: scenarios.filter(s => !s.is_compliant).length,
    },
  };
}

/**
 * TC-CAL-010: 1099 TIN validation
 * Tests vendor payments over $600 have valid TIN
 */
export function generateTC_CAL_010() {
  const scenarios = [];

  const tinTests = [
    { totalPaid: '599.99', hasTIN: false, compliant: true, description: 'Under $600 - no TIN required' },
    { totalPaid: '600.00', hasTIN: true, compliant: true, description: 'At threshold with TIN - compliant' },
    { totalPaid: '600.00', hasTIN: false, compliant: false, description: 'At threshold NO TIN - VIOLATION' },
    { totalPaid: '5000.00', hasTIN: true, compliant: true, description: 'Large payment with TIN - compliant' },
    { totalPaid: '5000.00', hasTIN: false, compliant: false, description: 'Large payment NO TIN - IRS VIOLATION' },
    { totalPaid: '50000.00', hasTIN: false, compliant: false, description: '$50K without TIN - CRITICAL IRS VIOLATION' },
  ];

  tinTests.forEach((tc, index) => {
    const vendor = vendorId();

    scenarios.push({
      id: uuid(),
      test_case: `TC-CAL-010-${String(index + 1).padStart(3, '0')}`,
      vendor_id: vendor,
      total_paid_ytd: tc.totalPaid,
      has_tin: tc.hasTIN,
      threshold: '600.00',
      is_compliant: tc.compliant,
      violation_type: tc.compliant ? null : 'MISSING_1099_TIN',
      irs_risk: tc.compliant ? 'none' : (parseFloat(tc.totalPaid) > 5000 ? 'critical' : 'high'),
      description: tc.description,
      metadata: seedMetadata('TC-CAL-010', {
        seed_type: '1099_tin_test',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-CAL-010',
    description: 'Vendors paid >= $600/year must have valid TIN for 1099 reporting',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      violations: scenarios.filter(s => !s.is_compliant).length,
    },
  };
}

/**
 * Generate all TC-CAL test data
 * @returns {object} All class action prevention test data
 */
export function generateAllTC_CAL_Data() {
  return {
    'TC-CAL-001': generateTC_CAL_001(),
    'TC-CAL-002': generateTC_CAL_002(),
    'TC-CAL-003': generateTC_CAL_003(),
    'TC-CAL-004': generateTC_CAL_004(),
    'TC-CAL-005': generateTC_CAL_005(),
    'TC-CAL-006': generateTC_CAL_006(),
    'TC-CAL-007': generateTC_CAL_007(),
    'TC-CAL-008': generateTC_CAL_008(),
    'TC-CAL-009': generateTC_CAL_009(),
    'TC-CAL-010': generateTC_CAL_010(),
  };
}

/**
 * Get TC-CAL summary
 * @param {object} testData - All test data
 * @returns {object} Summary
 */
export function getTC_CAL_Summary(testData) {
  const summary = {
    totalTestCases: Object.keys(testData).length,
    passed: 0,
    failed: 0,
    legalRisks: {
      low: 0,
      high: 0,
      critical: 0,
    },
    details: {},
  };

  Object.entries(testData).forEach(([testId, data]) => {
    const verification = data.verification;
    const passed = verification.violations === 0;

    if (passed) summary.passed++;
    else summary.failed++;

    summary.details[testId] = {
      description: data.description,
      passed,
      verification,
    };

    // Count risk levels from scenarios
    if (data.scenarios) {
      data.scenarios.forEach(s => {
        const risk = s.legal_risk || s.fraud_risk || s.irs_risk || 'low';
        if (risk === 'low' || risk === 'none') summary.legalRisks.low++;
        else if (risk === 'high') summary.legalRisks.high++;
        else if (risk === 'critical') summary.legalRisks.critical++;
      });
    }
  });

  return summary;
}

export default {
  generateTC_CAL_001,
  generateTC_CAL_002,
  generateTC_CAL_003,
  generateTC_CAL_004,
  generateTC_CAL_005,
  generateTC_CAL_006,
  generateTC_CAL_007,
  generateTC_CAL_008,
  generateTC_CAL_009,
  generateTC_CAL_010,
  generateAllTC_CAL_Data,
  getTC_CAL_Summary,
};
