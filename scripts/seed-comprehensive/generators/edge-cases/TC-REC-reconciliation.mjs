/**
 * TC-REC Reconciliation Edge Cases
 * Generates data to test 3-way reconciliation scenarios
 *
 * Tests cover:
 * - TC-REC-001: Bank = Ledger = Portal matching
 * - TC-REC-002: $5k+ variance detection
 * - TC-REC-003: Outstanding checks
 * - TC-REC-004: Deposit matching
 * - TC-REC-005: ACH 3-day settlement
 * - TC-REC-006: Month-end cut-off
 * - TC-REC-007: Void check reversals
 * - TC-REC-008: Duplicate import detection
 * - TC-REC-009: NSF with reversal
 * - TC-REC-010: Trust vs Operating reconciliation
 */

import { uuid, paymentId, bankTransactionId, propertyId } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import {
  isoTimestamp,
  daysAgo,
  daysFromNow,
} from '../../utils/date-utils.mjs';
import {
  decimalAdd,
  decimalSubtract,
  randomAmount,
} from '../../utils/decimal-utils.mjs';

/**
 * TC-REC-001: 3-way match validation
 * Bank balance = Ledger balance = Portal balance
 */
export function generateTC_REC_001() {
  const scenarios = [];

  const matchTests = [
    { bank: '10000.00', ledger: '10000.00', portal: '10000.00', matches: true, description: 'All three match exactly' },
    { bank: '10000.00', ledger: '10000.00', portal: '10000.01', matches: false, description: 'Portal off by $0.01' },
    { bank: '10000.00', ledger: '9999.99', portal: '10000.00', matches: false, description: 'Ledger off by $0.01' },
    { bank: '10000.01', ledger: '10000.00', portal: '10000.00', matches: false, description: 'Bank off by $0.01' },
    { bank: '10000.00', ledger: '9000.00', portal: '10000.00', matches: false, description: 'Ledger $1000 short' },
    { bank: '0.00', ledger: '0.00', portal: '0.00', matches: true, description: 'All zero - edge case' },
  ];

  matchTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-REC-001-${String(index + 1).padStart(3, '0')}`,
      bank_balance: tc.bank,
      ledger_balance: tc.ledger,
      portal_balance: tc.portal,
      is_matched: tc.matches,
      variance_amount: decimalSubtract(tc.bank, tc.ledger),
      description: tc.description,
      metadata: seedMetadata('TC-REC-001', {
        seed_type: 'three_way_match',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-REC-001',
    description: 'Bank, ledger, and portal balances must match exactly',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      matched: scenarios.filter(s => s.is_matched).length,
      unmatched: scenarios.filter(s => !s.is_matched).length,
    },
  };
}

/**
 * TC-REC-002: Large variance detection ($5k+)
 */
export function generateTC_REC_002() {
  const scenarios = [];

  const varianceTests = [
    { variance: '4999.99', shouldAlert: false, severity: 'none', description: 'Under $5k threshold' },
    { variance: '5000.00', shouldAlert: true, severity: 'high', description: 'Exactly at $5k threshold' },
    { variance: '5000.01', shouldAlert: true, severity: 'high', description: 'Just over $5k' },
    { variance: '10000.00', shouldAlert: true, severity: 'critical', description: '$10k variance' },
    { variance: '50000.00', shouldAlert: true, severity: 'critical', description: '$50k variance - immediate review' },
    { variance: '-5000.00', shouldAlert: true, severity: 'high', description: 'Negative $5k (over-reported)' },
  ];

  varianceTests.forEach((tc, index) => {
    const baseBalance = '100000.00';
    const bankBalance = decimalAdd(baseBalance, tc.variance);

    scenarios.push({
      id: uuid(),
      test_case: `TC-REC-002-${String(index + 1).padStart(3, '0')}`,
      ledger_balance: baseBalance,
      bank_balance: bankBalance,
      variance_amount: tc.variance,
      variance_threshold: '5000.00',
      should_alert: tc.shouldAlert,
      alert_severity: tc.severity,
      description: tc.description,
      metadata: seedMetadata('TC-REC-002', {
        seed_type: 'variance_detection',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-REC-002',
    description: 'Variances of $5,000+ must trigger alerts',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      alertsRequired: scenarios.filter(s => s.should_alert).length,
      noAlertRequired: scenarios.filter(s => !s.should_alert).length,
    },
  };
}

/**
 * TC-REC-003: Outstanding checks tracking
 */
export function generateTC_REC_003() {
  const scenarios = [];

  const checkTests = [
    { issued: daysAgo(5), cleared: daysAgo(2), isOutstanding: false, description: 'Cleared within 5 days' },
    { issued: daysAgo(10), cleared: null, isOutstanding: true, description: 'Outstanding 10 days' },
    { issued: daysAgo(30), cleared: null, isOutstanding: true, stale: true, description: 'Outstanding 30 days - STALE' },
    { issued: daysAgo(90), cleared: null, isOutstanding: true, stale: true, void: true, description: 'Outstanding 90 days - SHOULD VOID' },
    { issued: daysAgo(180), cleared: null, isOutstanding: true, stale: true, void: true, escheatable: true, description: 'Outstanding 180 days - ESCHEATMENT RISK' },
  ];

  checkTests.forEach((tc, index) => {
    const checkAmount = randomAmount(100, 5000);

    scenarios.push({
      id: uuid(),
      test_case: `TC-REC-003-${String(index + 1).padStart(3, '0')}`,
      check_number: `CHK-${10000 + index}`,
      check_amount: checkAmount,
      issue_date: tc.issued,
      clear_date: tc.cleared,
      is_outstanding: tc.isOutstanding,
      is_stale: tc.stale || false,
      should_void: tc.void || false,
      escheatment_risk: tc.escheatable || false,
      days_outstanding: tc.cleared ? 0 : Math.floor((Date.now() - new Date(tc.issued).getTime()) / (1000 * 60 * 60 * 24)),
      description: tc.description,
      metadata: seedMetadata('TC-REC-003', {
        seed_type: 'outstanding_check',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-REC-003',
    description: 'Outstanding checks must be tracked and aged',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      outstanding: scenarios.filter(s => s.is_outstanding).length,
      stale: scenarios.filter(s => s.is_stale).length,
      shouldVoid: scenarios.filter(s => s.should_void).length,
    },
  };
}

/**
 * TC-REC-004: Deposit matching
 */
export function generateTC_REC_004() {
  const scenarios = [];

  const depositTests = [
    { ledgerAmount: '5000.00', bankAmount: '5000.00', bankDate: daysAgo(1), matches: true, description: 'Exact match' },
    { ledgerAmount: '5000.00', bankAmount: '5000.01', bankDate: daysAgo(1), matches: false, description: 'Off by $0.01' },
    { ledgerAmount: '5000.00', bankAmount: '5000.00', bankDate: daysAgo(5), matches: true, dateGap: true, description: 'Date gap but amount matches' },
    { ledgerAmount: '5000.00', bankAmount: null, bankDate: null, matches: false, missing: true, description: 'Missing from bank' },
    { ledgerAmount: null, bankAmount: '5000.00', bankDate: daysAgo(1), matches: false, unrecorded: true, description: 'Unrecorded in ledger' },
  ];

  depositTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-REC-004-${String(index + 1).padStart(3, '0')}`,
      deposit_id: uuid(),
      ledger_amount: tc.ledgerAmount,
      bank_amount: tc.bankAmount,
      ledger_date: daysAgo(2),
      bank_date: tc.bankDate,
      is_matched: tc.matches,
      has_date_gap: tc.dateGap || false,
      is_missing_from_bank: tc.missing || false,
      is_unrecorded_in_ledger: tc.unrecorded || false,
      description: tc.description,
      metadata: seedMetadata('TC-REC-004', {
        seed_type: 'deposit_matching',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-REC-004',
    description: 'Deposits must match between ledger and bank',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      matched: scenarios.filter(s => s.is_matched).length,
      unmatched: scenarios.filter(s => !s.is_matched).length,
    },
  };
}

/**
 * TC-REC-005: ACH settlement timing
 */
export function generateTC_REC_005() {
  const scenarios = [];

  const achTests = [
    { initiated: daysAgo(1), settled: null, expectedSettleDay: 2, description: 'Day 1 - pending' },
    { initiated: daysAgo(2), settled: null, expectedSettleDay: 1, description: 'Day 2 - should settle today' },
    { initiated: daysAgo(3), settled: daysAgo(0), expectedSettleDay: 0, description: 'Day 3 - settled' },
    { initiated: daysAgo(5), settled: null, expectedSettleDay: -2, description: 'Day 5 - OVERDUE for settlement' },
    { initiated: daysAgo(7), settled: null, expectedSettleDay: -4, description: 'Day 7 - FAILED SETTLEMENT?' },
  ];

  achTests.forEach((tc, index) => {
    const amount = randomAmount(500, 3000);

    scenarios.push({
      id: uuid(),
      test_case: `TC-REC-005-${String(index + 1).padStart(3, '0')}`,
      ach_id: `ACH-${uuid().slice(0, 8).toUpperCase()}`,
      amount,
      initiated_date: tc.initiated,
      expected_settle_date: daysFromNow(tc.expectedSettleDay),
      actual_settle_date: tc.settled,
      is_settled: tc.settled !== null,
      is_overdue: tc.expectedSettleDay < 0 && !tc.settled,
      days_pending: tc.settled ? 0 : Math.floor((Date.now() - new Date(tc.initiated).getTime()) / (1000 * 60 * 60 * 24)),
      description: tc.description,
      metadata: seedMetadata('TC-REC-005', {
        seed_type: 'ach_settlement',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-REC-005',
    description: 'ACH transactions must settle within 3 business days',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      settled: scenarios.filter(s => s.is_settled).length,
      pending: scenarios.filter(s => !s.is_settled && !s.is_overdue).length,
      overdue: scenarios.filter(s => s.is_overdue).length,
    },
  };
}

/**
 * TC-REC-006: Month-end cut-off handling
 */
export function generateTC_REC_006() {
  const scenarios = [];

  // Transactions near month boundary
  const cutoffTests = [
    { date: '2024-12-31', postDate: '2024-12-31', period: '2024-12', correct: true, description: 'Dec 31 posted to Dec' },
    { date: '2024-12-31', postDate: '2025-01-01', period: '2024-12', correct: false, description: 'Dec 31 TX, posted to Jan - CUTOFF ERROR' },
    { date: '2025-01-01', postDate: '2024-12-31', period: '2025-01', correct: false, description: 'Jan 1 TX, posted to Dec - CUTOFF ERROR' },
    { date: '2024-12-31', postDate: '2024-12-31', bankDate: '2025-01-02', period: '2024-12', correct: true, description: 'Bank cleared Jan, ledger Dec - timing difference OK' },
  ];

  cutoffTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-REC-006-${String(index + 1).padStart(3, '0')}`,
      transaction_date: tc.date,
      posted_date: tc.postDate,
      bank_clear_date: tc.bankDate || tc.postDate,
      accounting_period: tc.period,
      is_correct_period: tc.correct,
      cutoff_violation: !tc.correct,
      description: tc.description,
      metadata: seedMetadata('TC-REC-006', {
        seed_type: 'month_end_cutoff',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-REC-006',
    description: 'Transactions must be posted to correct accounting period',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      correct: scenarios.filter(s => s.is_correct_period).length,
      cutoffViolations: scenarios.filter(s => s.cutoff_violation).length,
    },
  };
}

/**
 * TC-REC-007: Void check handling
 */
export function generateTC_REC_007() {
  const scenarios = [];

  const voidTests = [
    { voided: true, reversed: true, balanceRestored: true, correct: true, description: 'Voided and properly reversed' },
    { voided: true, reversed: false, balanceRestored: false, correct: false, description: 'Voided but NOT reversed - ACCOUNTING ERROR' },
    { voided: true, reversed: true, balanceRestored: false, correct: false, description: 'Reversed but balance wrong' },
    { voided: false, reversed: false, balanceRestored: true, correct: true, description: 'Not voided - normal check' },
  ];

  voidTests.forEach((tc, index) => {
    const amount = randomAmount(200, 2000);

    scenarios.push({
      id: uuid(),
      test_case: `TC-REC-007-${String(index + 1).padStart(3, '0')}`,
      check_number: `CHK-${20000 + index}`,
      check_amount: amount,
      is_voided: tc.voided,
      reversal_entry_created: tc.reversed,
      balance_restored: tc.balanceRestored,
      is_correct: tc.correct,
      description: tc.description,
      metadata: seedMetadata('TC-REC-007', {
        seed_type: 'void_check',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-REC-007',
    description: 'Voided checks must have reversing entries',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      correct: scenarios.filter(s => s.is_correct).length,
      errors: scenarios.filter(s => !s.is_correct).length,
    },
  };
}

/**
 * TC-REC-008: Duplicate import detection
 */
export function generateTC_REC_008() {
  const scenarios = [];
  const originalTxId = bankTransactionId();

  const duplicateTests = [
    { isOriginal: true, isDuplicate: false, description: 'Original transaction' },
    { isOriginal: false, isDuplicate: true, sameAmount: true, sameDate: true, sameRef: true, description: 'Exact duplicate - MUST REJECT' },
    { isOriginal: false, isDuplicate: true, sameAmount: true, sameDate: true, sameRef: false, description: 'Same amount/date, diff ref - POSSIBLE duplicate' },
    { isOriginal: false, isDuplicate: false, sameAmount: true, sameDate: false, sameRef: false, description: 'Same amount only - NOT duplicate' },
  ];

  duplicateTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-REC-008-${String(index + 1).padStart(3, '0')}`,
      transaction_id: tc.isOriginal ? originalTxId : bankTransactionId(),
      original_transaction_id: tc.isDuplicate ? originalTxId : null,
      amount: '1500.00',
      transaction_date: tc.sameDate ? daysAgo(3) : daysAgo(5),
      reference_number: tc.sameRef ? 'REF-12345' : `REF-${index}`,
      is_duplicate: tc.isDuplicate,
      should_reject: tc.isDuplicate && tc.sameRef,
      description: tc.description,
      metadata: seedMetadata('TC-REC-008', {
        seed_type: 'duplicate_detection',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-REC-008',
    description: 'Duplicate bank imports must be detected and rejected',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      duplicates: scenarios.filter(s => s.is_duplicate).length,
      shouldReject: scenarios.filter(s => s.should_reject).length,
    },
  };
}

/**
 * TC-REC-009: NSF handling with reversal
 */
export function generateTC_REC_009() {
  const scenarios = [];

  const nsfTests = [
    { nsfDetected: true, reversed: true, feeCharged: true, balanceCorrect: true, correct: true, description: 'NSF properly handled' },
    { nsfDetected: true, reversed: false, feeCharged: true, balanceCorrect: false, correct: false, description: 'NSF NOT reversed - BALANCE ERROR' },
    { nsfDetected: true, reversed: true, feeCharged: false, balanceCorrect: true, correct: false, description: 'NSF reversed but no fee charged' },
    { nsfDetected: false, reversed: false, feeCharged: false, balanceCorrect: false, correct: false, description: 'NSF not detected - CRITICAL' },
  ];

  nsfTests.forEach((tc, index) => {
    const paymentAmount = randomAmount(800, 1800);

    scenarios.push({
      id: uuid(),
      test_case: `TC-REC-009-${String(index + 1).padStart(3, '0')}`,
      original_payment_id: paymentId('nsf'),
      payment_amount: paymentAmount,
      nsf_detected: tc.nsfDetected,
      reversal_created: tc.reversed,
      nsf_fee_charged: tc.feeCharged,
      nsf_fee_amount: tc.feeCharged ? '35.00' : '0.00',
      balance_correct: tc.balanceCorrect,
      is_correctly_handled: tc.correct,
      description: tc.description,
      metadata: seedMetadata('TC-REC-009', {
        seed_type: 'nsf_handling',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-REC-009',
    description: 'NSF checks must be reversed with fee assessment',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      correct: scenarios.filter(s => s.is_correctly_handled).length,
      errors: scenarios.filter(s => !s.is_correctly_handled).length,
    },
  };
}

/**
 * TC-REC-010: Trust vs Operating account separation
 */
export function generateTC_REC_010() {
  const scenarios = [];
  const property = propertyId();

  const separationTests = [
    { accountType: 'operating', hasDeposits: false, hasTrust: false, correct: true, description: 'Operating account - no deposits' },
    { accountType: 'trust', hasDeposits: true, hasTrust: true, correct: true, description: 'Trust account - has deposits' },
    { accountType: 'operating', hasDeposits: true, hasTrust: false, correct: false, description: 'Operating with deposits - COMMINGLING' },
    { accountType: 'trust', hasDeposits: true, hasTrust: false, correct: false, description: 'Trust but not flagged - VIOLATION' },
  ];

  separationTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-REC-010-${String(index + 1).padStart(3, '0')}`,
      property_id: property,
      account_type: tc.accountType,
      account_id: uuid(),
      contains_security_deposits: tc.hasDeposits,
      is_trust_flagged: tc.hasTrust,
      is_properly_separated: tc.correct,
      commingling_violation: !tc.correct && tc.hasDeposits && tc.accountType === 'operating',
      description: tc.description,
      metadata: seedMetadata('TC-REC-010', {
        seed_type: 'account_separation',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-REC-010',
    description: 'Trust and operating accounts must be properly separated',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      correct: scenarios.filter(s => s.is_properly_separated).length,
      violations: scenarios.filter(s => !s.is_properly_separated).length,
    },
  };
}

/**
 * Generate all TC-REC test data
 */
export function generateAllTC_REC_Data() {
  return {
    'TC-REC-001': generateTC_REC_001(),
    'TC-REC-002': generateTC_REC_002(),
    'TC-REC-003': generateTC_REC_003(),
    'TC-REC-004': generateTC_REC_004(),
    'TC-REC-005': generateTC_REC_005(),
    'TC-REC-006': generateTC_REC_006(),
    'TC-REC-007': generateTC_REC_007(),
    'TC-REC-008': generateTC_REC_008(),
    'TC-REC-009': generateTC_REC_009(),
    'TC-REC-010': generateTC_REC_010(),
  };
}

/**
 * Get TC-REC summary
 */
export function getTC_REC_Summary(testData) {
  const summary = {
    totalTestCases: Object.keys(testData).length,
    passed: 0,
    failed: 0,
    details: {},
  };

  Object.entries(testData).forEach(([testId, data]) => {
    const v = data.verification;
    const passed = (v.errors || v.unmatched || v.violations || v.overdue || v.cutoffViolations || 0) === 0;

    if (passed) summary.passed++;
    else summary.failed++;

    summary.details[testId] = {
      description: data.description,
      passed,
      verification: v,
    };
  });

  return summary;
}

export default {
  generateTC_REC_001,
  generateTC_REC_002,
  generateTC_REC_003,
  generateTC_REC_004,
  generateTC_REC_005,
  generateTC_REC_006,
  generateTC_REC_007,
  generateTC_REC_008,
  generateTC_REC_009,
  generateTC_REC_010,
  generateAllTC_REC_Data,
  getTC_REC_Summary,
};
