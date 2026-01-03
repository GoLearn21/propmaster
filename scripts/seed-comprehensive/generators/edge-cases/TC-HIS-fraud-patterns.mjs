/**
 * TC-HIS Historical Fraud Patterns Edge Cases
 * Generates data to test fraud detection based on historical cases
 *
 * Tests cover:
 * - TC-HIS-001: Enron-style hidden entities
 * - TC-HIS-002: WorldCom expense capitalization
 * - TC-HIS-003: Salami slicing (penny theft)
 * - TC-HIS-004: Premature revenue recognition
 * - TC-HIS-005: Fictitious vendor fraud
 * - TC-HIS-006: Round-trip transactions
 * - TC-HIS-007: Cookie jar reserves
 * - TC-HIS-008: Channel stuffing
 * - TC-HIS-009: Bill and hold schemes
 * - TC-HIS-010: Related party transactions
 */

import { uuid, vendorId, propertyId, journalEntryId, tenantId } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import {
  isoTimestamp,
  daysAgo,
  daysFromNow,
  monthsFromNow,
} from '../../utils/date-utils.mjs';
import {
  decimalAdd,
  decimalSubtract,
  randomAmount,
} from '../../utils/decimal-utils.mjs';

/**
 * TC-HIS-001: Enron-style hidden entities (SPEs)
 * Off-balance-sheet entities that hide debt/losses
 */
export function generateTC_HIS_001() {
  const scenarios = [];

  const hiddenEntityTests = [
    {
      entityType: 'consolidated',
      onBalanceSheet: true,
      ownershipPercent: 100,
      isSuspicious: false,
      description: 'Fully consolidated subsidiary - transparent'
    },
    {
      entityType: 'spe',
      onBalanceSheet: false,
      ownershipPercent: 49,
      isSuspicious: true,
      description: 'SPE at 49% - OFF BALANCE SHEET - ENRON PATTERN'
    },
    {
      entityType: 'spe',
      onBalanceSheet: false,
      ownershipPercent: 3,
      guaranteeExists: true,
      isSuspicious: true,
      description: 'SPE with guarantee - HIDDEN LIABILITY'
    },
    {
      entityType: 'related',
      onBalanceSheet: true,
      ownershipPercent: 0,
      relatedParty: true,
      isSuspicious: true,
      description: 'Related party not disclosed - VIOLATION'
    },
  ];

  hiddenEntityTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-HIS-001-${String(index + 1).padStart(3, '0')}`,
      entity_id: uuid(),
      entity_type: tc.entityType,
      on_balance_sheet: tc.onBalanceSheet,
      ownership_percent: tc.ownershipPercent,
      has_guarantee: tc.guaranteeExists || false,
      is_related_party: tc.relatedParty || false,
      is_suspicious: tc.isSuspicious,
      fraud_pattern: tc.isSuspicious ? 'ENRON_SPE' : null,
      description: tc.description,
      metadata: seedMetadata('TC-HIS-001', {
        seed_type: 'hidden_entity',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-HIS-001',
    description: 'Detect off-balance-sheet entities hiding debt (Enron pattern)',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      clean: scenarios.filter(s => !s.is_suspicious).length,
      suspicious: scenarios.filter(s => s.is_suspicious).length,
    },
  };
}

/**
 * TC-HIS-002: WorldCom expense capitalization
 * Improperly capitalizing operating expenses as assets
 */
export function generateTC_HIS_002() {
  const scenarios = [];

  const capitalizationTests = [
    {
      expenseType: 'repairs',
      amount: '500.00',
      capitalized: false,
      properlyExpensed: true,
      isFraud: false,
      description: 'Repair properly expensed'
    },
    {
      expenseType: 'repairs',
      amount: '500.00',
      capitalized: true,
      properlyExpensed: false,
      isFraud: true,
      description: 'Repair IMPROPERLY CAPITALIZED - WORLDCOM PATTERN'
    },
    {
      expenseType: 'improvement',
      amount: '10000.00',
      capitalized: true,
      properlyExpensed: false,
      isFraud: false,
      description: 'Capital improvement properly capitalized'
    },
    {
      expenseType: 'line_cost',
      amount: '50000.00',
      capitalized: true,
      properlyExpensed: false,
      isFraud: true,
      description: 'Operating cost capitalized - FRAUD'
    },
  ];

  capitalizationTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-HIS-002-${String(index + 1).padStart(3, '0')}`,
      entry_id: journalEntryId(),
      expense_type: tc.expenseType,
      amount: tc.amount,
      was_capitalized: tc.capitalized,
      properly_expensed: tc.properlyExpensed,
      is_fraud: tc.isFraud,
      fraud_pattern: tc.isFraud ? 'WORLDCOM_CAPITALIZATION' : null,
      earnings_impact: tc.isFraud ? tc.amount : '0.00',
      description: tc.description,
      metadata: seedMetadata('TC-HIS-002', {
        seed_type: 'capitalization_fraud',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-HIS-002',
    description: 'Detect improper expense capitalization (WorldCom pattern)',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      proper: scenarios.filter(s => !s.is_fraud).length,
      fraudulent: scenarios.filter(s => s.is_fraud).length,
    },
  };
}

/**
 * TC-HIS-003: Salami slicing (penny accumulation)
 * Skimming small amounts that go unnoticed
 */
export function generateTC_HIS_003() {
  const scenarios = [];

  // Accumulation scenarios
  const salamiTests = [
    {
      transactionCount: 10000,
      amountPerTx: '0.01',
      totalSkimmed: '100.00',
      detectable: true,
      description: '10,000 penny skims = $100'
    },
    {
      transactionCount: 100000,
      amountPerTx: '0.01',
      totalSkimmed: '1000.00',
      detectable: true,
      description: '100,000 penny skims = $1,000'
    },
    {
      transactionCount: 1000,
      amountPerTx: '0.005',
      totalSkimmed: '5.00',
      detectable: false,
      roundingDifference: true,
      description: 'Half-penny rounding to hidden account'
    },
  ];

  salamiTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-HIS-003-${String(index + 1).padStart(3, '0')}`,
      transaction_count: tc.transactionCount,
      amount_per_transaction: tc.amountPerTx,
      total_skimmed: tc.totalSkimmed,
      is_detectable: tc.detectable,
      is_rounding_fraud: tc.roundingDifference || false,
      fraud_pattern: 'SALAMI_SLICING',
      detection_method: tc.detectable ? 'sum_verification' : 'rounding_analysis',
      description: tc.description,
      metadata: seedMetadata('TC-HIS-003', {
        seed_type: 'salami_slicing',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-HIS-003',
    description: 'Detect small-amount theft accumulating to significant sums',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      detectable: scenarios.filter(s => s.is_detectable).length,
      roundingFraud: scenarios.filter(s => s.is_rounding_fraud).length,
    },
  };
}

/**
 * TC-HIS-004: Premature revenue recognition
 * Recording future revenue in current period
 */
export function generateTC_HIS_004() {
  const scenarios = [];

  const revenueTests = [
    {
      leaseStart: daysAgo(30),
      rentRecognized: daysAgo(30),
      isPremature: false,
      description: 'Rent recognized when earned - proper'
    },
    {
      leaseStart: daysFromNow(30),
      rentRecognized: daysAgo(0),
      isPremature: true,
      description: 'Rent recognized BEFORE lease start - FRAUD'
    },
    {
      leaseStart: daysAgo(0),
      rentRecognized: daysAgo(30),
      isPremature: true,
      description: 'Rent recognized 30 days before occupancy - FRAUD'
    },
    {
      leaseStart: daysAgo(30),
      rentRecognized: daysAgo(30),
      includesFutureMonths: true,
      isPremature: true,
      description: 'Multiple months recognized at once - FRONT-LOADING'
    },
  ];

  revenueTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-HIS-004-${String(index + 1).padStart(3, '0')}`,
      lease_id: uuid(),
      lease_start_date: tc.leaseStart,
      revenue_recognition_date: tc.rentRecognized,
      includes_future_months: tc.includesFutureMonths || false,
      is_premature: tc.isPremature,
      fraud_pattern: tc.isPremature ? 'PREMATURE_REVENUE' : null,
      gaap_violation: tc.isPremature,
      description: tc.description,
      metadata: seedMetadata('TC-HIS-004', {
        seed_type: 'revenue_recognition',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-HIS-004',
    description: 'Detect revenue recognized before being earned',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      proper: scenarios.filter(s => !s.is_premature).length,
      premature: scenarios.filter(s => s.is_premature).length,
    },
  };
}

/**
 * TC-HIS-005: Fictitious vendor fraud
 * Fake vendors receiving payments
 */
export function generateTC_HIS_005() {
  const scenarios = [];

  const fictVendorTests = [
    {
      hasAddress: true,
      hasPhone: true,
      hasTIN: true,
      hasInvoice: true,
      daysSinceCreated: 365,
      isFictitious: false,
      description: 'Established vendor with full documentation'
    },
    {
      hasAddress: false,
      hasPhone: false,
      hasTIN: false,
      hasInvoice: true,
      daysSinceCreated: 1,
      isFictitious: true,
      description: 'New vendor, no info, immediate invoice - FICTITIOUS'
    },
    {
      hasAddress: true,
      hasPhone: true,
      hasTIN: true,
      hasInvoice: true,
      daysSinceCreated: 0,
      sameDayPayment: true,
      isFictitious: true,
      description: 'Same-day vendor creation and payment - RED FLAG'
    },
    {
      hasAddress: true,
      hasPhone: true,
      hasTIN: true,
      hasInvoice: false,
      paymentWithoutInvoice: true,
      isFictitious: true,
      description: 'Payment without invoice - FRAUD RISK'
    },
  ];

  fictVendorTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-HIS-005-${String(index + 1).padStart(3, '0')}`,
      vendor_id: vendorId(),
      has_physical_address: tc.hasAddress,
      has_phone: tc.hasPhone,
      has_tin: tc.hasTIN,
      has_invoice: tc.hasInvoice,
      days_since_creation: tc.daysSinceCreated,
      same_day_payment: tc.sameDayPayment || false,
      payment_without_invoice: tc.paymentWithoutInvoice || false,
      is_fictitious: tc.isFictitious,
      fraud_pattern: tc.isFictitious ? 'FICTITIOUS_VENDOR' : null,
      description: tc.description,
      metadata: seedMetadata('TC-HIS-005', {
        seed_type: 'fictitious_vendor',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-HIS-005',
    description: 'Detect fictitious vendor creation for embezzlement',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      legitimate: scenarios.filter(s => !s.is_fictitious).length,
      fictitious: scenarios.filter(s => s.is_fictitious).length,
    },
  };
}

/**
 * TC-HIS-006: Round-trip transactions
 * Money flowing out and back on same day
 */
export function generateTC_HIS_006() {
  const scenarios = [];

  const roundTripTests = [
    {
      outAmount: '50000.00',
      inAmount: '50000.00',
      sameDayReturn: true,
      sameParty: true,
      isRoundTrip: true,
      description: 'Same amount in/out same day same party - ROUND TRIP'
    },
    {
      outAmount: '50000.00',
      inAmount: '50000.00',
      sameDayReturn: false,
      daysBetween: 30,
      sameParty: true,
      isRoundTrip: false,
      description: 'Month gap - legitimate transaction'
    },
    {
      outAmount: '100000.00',
      inAmount: '100000.00',
      sameDayReturn: true,
      sameParty: false,
      relatedParties: true,
      isRoundTrip: true,
      description: 'Different but related parties - HIDDEN ROUND TRIP'
    },
  ];

  roundTripTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-HIS-006-${String(index + 1).padStart(3, '0')}`,
      outgoing_amount: tc.outAmount,
      incoming_amount: tc.inAmount,
      same_day_return: tc.sameDayReturn,
      days_between: tc.daysBetween || 0,
      same_party: tc.sameParty,
      related_parties: tc.relatedParties || false,
      is_round_trip: tc.isRoundTrip,
      fraud_pattern: tc.isRoundTrip ? 'ROUND_TRIP' : null,
      description: tc.description,
      metadata: seedMetadata('TC-HIS-006', {
        seed_type: 'round_trip',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-HIS-006',
    description: 'Detect round-trip transactions used to inflate revenue',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      legitimate: scenarios.filter(s => !s.is_round_trip).length,
      roundTrips: scenarios.filter(s => s.is_round_trip).length,
    },
  };
}

/**
 * TC-HIS-007: Cookie jar reserves
 * Manipulating reserves to smooth earnings
 */
export function generateTC_HIS_007() {
  const scenarios = [];

  const reserveTests = [
    {
      reserveAction: 'increase',
      amount: '10000.00',
      inGoodQuarter: true,
      justification: 'Updated bad debt estimate',
      isCookieJar: false,
      description: 'Reserve increase in good quarter with justification'
    },
    {
      reserveAction: 'decrease',
      amount: '10000.00',
      inBadQuarter: true,
      justification: null,
      isCookieJar: true,
      description: 'Reserve decrease in bad quarter, no justification - COOKIE JAR'
    },
    {
      reserveAction: 'increase',
      amount: '50000.00',
      inGoodQuarter: true,
      justification: null,
      disproportionate: true,
      isCookieJar: true,
      description: 'Large reserve increase without basis - SMOOTHING'
    },
  ];

  reserveTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-HIS-007-${String(index + 1).padStart(3, '0')}`,
      reserve_action: tc.reserveAction,
      amount: tc.amount,
      in_good_quarter: tc.inGoodQuarter || false,
      in_bad_quarter: tc.inBadQuarter || false,
      has_justification: !!tc.justification,
      justification: tc.justification,
      is_disproportionate: tc.disproportionate || false,
      is_cookie_jar: tc.isCookieJar,
      fraud_pattern: tc.isCookieJar ? 'COOKIE_JAR_RESERVES' : null,
      description: tc.description,
      metadata: seedMetadata('TC-HIS-007', {
        seed_type: 'cookie_jar',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-HIS-007',
    description: 'Detect reserve manipulation to smooth earnings',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      legitimate: scenarios.filter(s => !s.is_cookie_jar).length,
      cookieJar: scenarios.filter(s => s.is_cookie_jar).length,
    },
  };
}

/**
 * TC-HIS-008: Channel stuffing (future-dated AR)
 * Booking receivables before service delivery
 */
export function generateTC_HIS_008() {
  const scenarios = [];

  const stuffingTests = [
    {
      invoiceDate: daysAgo(30),
      serviceDate: daysAgo(30),
      isStuffing: false,
      description: 'Invoice matches service date - proper'
    },
    {
      invoiceDate: daysAgo(0),
      serviceDate: daysFromNow(30),
      isStuffing: true,
      description: 'Invoice dated before service - CHANNEL STUFFING'
    },
    {
      invoiceDate: daysAgo(60),
      serviceDate: daysAgo(30),
      isStuffing: true,
      description: 'Invoice 30 days before service - PREMATURE AR'
    },
  ];

  stuffingTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-HIS-008-${String(index + 1).padStart(3, '0')}`,
      invoice_id: uuid(),
      invoice_date: tc.invoiceDate,
      service_date: tc.serviceDate,
      is_channel_stuffing: tc.isStuffing,
      fraud_pattern: tc.isStuffing ? 'CHANNEL_STUFFING' : null,
      description: tc.description,
      metadata: seedMetadata('TC-HIS-008', {
        seed_type: 'channel_stuffing',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-HIS-008',
    description: 'Detect channel stuffing (pre-service invoicing)',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      proper: scenarios.filter(s => !s.is_channel_stuffing).length,
      stuffing: scenarios.filter(s => s.is_channel_stuffing).length,
    },
  };
}

/**
 * TC-HIS-009: Bill and hold schemes
 * Collecting rent without occupancy
 */
export function generateTC_HIS_009() {
  const scenarios = [];

  const billHoldTests = [
    {
      unitOccupied: true,
      rentCollected: true,
      isBillHold: false,
      description: 'Occupied unit, rent collected - proper'
    },
    {
      unitOccupied: false,
      rentCollected: true,
      tenantActive: true,
      isBillHold: true,
      description: 'Vacant unit, rent collected, "active" tenant - BILL AND HOLD'
    },
    {
      unitOccupied: false,
      rentCollected: true,
      tenantActive: false,
      isBillHold: true,
      description: 'Vacant, no tenant, rent recorded - PHANTOM REVENUE'
    },
  ];

  billHoldTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-HIS-009-${String(index + 1).padStart(3, '0')}`,
      unit_id: uuid(),
      unit_occupied: tc.unitOccupied,
      rent_collected: tc.rentCollected,
      tenant_active: tc.tenantActive,
      is_bill_hold: tc.isBillHold,
      fraud_pattern: tc.isBillHold ? 'BILL_AND_HOLD' : null,
      description: tc.description,
      metadata: seedMetadata('TC-HIS-009', {
        seed_type: 'bill_and_hold',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-HIS-009',
    description: 'Detect rent collection without occupancy',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      proper: scenarios.filter(s => !s.is_bill_hold).length,
      billHold: scenarios.filter(s => s.is_bill_hold).length,
    },
  };
}

/**
 * TC-HIS-010: Related party transactions
 * Undisclosed transactions with related entities
 */
export function generateTC_HIS_010() {
  const scenarios = [];

  const relatedPartyTests = [
    {
      isRelated: true,
      disclosed: true,
      atArmslength: true,
      isViolation: false,
      description: 'Related party, disclosed, arm\'s length - proper'
    },
    {
      isRelated: true,
      disclosed: false,
      atArmslength: true,
      isViolation: true,
      description: 'Related party NOT disclosed - VIOLATION'
    },
    {
      isRelated: true,
      disclosed: true,
      atArmslength: false,
      favorableTerms: true,
      isViolation: true,
      description: 'Related party with favorable terms - SELF-DEALING'
    },
    {
      isRelated: true,
      disclosed: false,
      atArmslength: false,
      ownerVendor: true,
      isViolation: true,
      description: 'Owner is also vendor - CONFLICT OF INTEREST'
    },
  ];

  relatedPartyTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-HIS-010-${String(index + 1).padStart(3, '0')}`,
      vendor_id: vendorId(),
      is_related_party: tc.isRelated,
      is_disclosed: tc.disclosed,
      at_arms_length: tc.atArmslength,
      has_favorable_terms: tc.favorableTerms || false,
      owner_is_vendor: tc.ownerVendor || false,
      is_violation: tc.isViolation,
      fraud_pattern: tc.isViolation ? 'RELATED_PARTY' : null,
      description: tc.description,
      metadata: seedMetadata('TC-HIS-010', {
        seed_type: 'related_party',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-HIS-010',
    description: 'Detect undisclosed related party transactions',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      proper: scenarios.filter(s => !s.is_violation).length,
      violations: scenarios.filter(s => s.is_violation).length,
    },
  };
}

/**
 * Generate all TC-HIS test data
 */
export function generateAllTC_HIS_Data() {
  return {
    'TC-HIS-001': generateTC_HIS_001(),
    'TC-HIS-002': generateTC_HIS_002(),
    'TC-HIS-003': generateTC_HIS_003(),
    'TC-HIS-004': generateTC_HIS_004(),
    'TC-HIS-005': generateTC_HIS_005(),
    'TC-HIS-006': generateTC_HIS_006(),
    'TC-HIS-007': generateTC_HIS_007(),
    'TC-HIS-008': generateTC_HIS_008(),
    'TC-HIS-009': generateTC_HIS_009(),
    'TC-HIS-010': generateTC_HIS_010(),
  };
}

/**
 * Get TC-HIS summary
 */
export function getTC_HIS_Summary(testData) {
  const summary = {
    totalTestCases: Object.keys(testData).length,
    passed: 0,
    failed: 0,
    fraudPatterns: {},
    details: {},
  };

  Object.entries(testData).forEach(([testId, data]) => {
    const v = data.verification;
    const fraudCount = v.suspicious || v.fraudulent || v.fictitious || v.roundTrips ||
                       v.cookieJar || v.stuffing || v.billHold || v.violations || v.premature || 0;
    const passed = fraudCount === 0;

    if (passed) summary.passed++;
    else summary.failed++;

    summary.details[testId] = {
      description: data.description,
      passed,
      verification: v,
    };

    // Count fraud patterns
    data.scenarios?.forEach(s => {
      if (s.fraud_pattern) {
        summary.fraudPatterns[s.fraud_pattern] = (summary.fraudPatterns[s.fraud_pattern] || 0) + 1;
      }
    });
  });

  return summary;
}

export default {
  generateTC_HIS_001,
  generateTC_HIS_002,
  generateTC_HIS_003,
  generateTC_HIS_004,
  generateTC_HIS_005,
  generateTC_HIS_006,
  generateTC_HIS_007,
  generateTC_HIS_008,
  generateTC_HIS_009,
  generateTC_HIS_010,
  generateAllTC_HIS_Data,
  getTC_HIS_Summary,
};
