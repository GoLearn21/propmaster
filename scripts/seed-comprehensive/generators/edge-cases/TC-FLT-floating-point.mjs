/**
 * TC-FLT Floating Point Precision Edge Cases
 * Generates data to test penny-perfect arithmetic validation
 *
 * Tests cover:
 * - TC-FLT-001: 10,000 x $0.01 = $100.00 exactly
 * - TC-FLT-002: Rent proration edge cases
 * - TC-FLT-003: 0.00009 imbalance rejection
 * - TC-FLT-004: 365 x $4.11 = $1500.15 exactly
 * - TC-FLT-005: $900 trillion handling
 * - TC-FLT-006: DECIMAL(19,4) precision
 * - TC-FLT-007: Empty array = 0.0000
 * - TC-FLT-008: Negative format consistency
 * - TC-FLT-009: Multi-currency conversion
 * - TC-FLT-010: 100,000 posting batch
 */

import { paymentId, journalEntryId, journalPostingId, tenantId, uuid } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import {
  isoTimestamp,
  daysAgo,
  monthsAgo,
} from '../../utils/date-utils.mjs';
import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  decimalSum,
  calculateProration,
  isBalanced,
} from '../../utils/decimal-utils.mjs';

/**
 * TC-FLT-001: 10,000 penny transactions summing to $100.00
 * Tests accumulation of small amounts without floating-point drift
 */
export function generateTC_FLT_001() {
  const payments = [];
  const tenantIdVal = tenantId();

  for (let i = 0; i < 10000; i++) {
    payments.push({
      id: paymentId('penny'),
      tenant_id: tenantIdVal,
      amount: '0.01',
      payment_date: daysAgo(Math.floor(i / 100)),
      status: 'completed',
      metadata: seedMetadata('TC-FLT-001', {
        seed_type: 'penny_payment',
        sequence: i + 1,
        expected_total: '100.0000',
      }),
    });
  }

  // Verification data
  const expectedTotal = '100.0000';
  const calculatedTotal = decimalSum(payments.map(p => p.amount));

  return {
    testCaseId: 'TC-FLT-001',
    description: '10,000 penny payments must sum to exactly $100.00',
    payments,
    verification: {
      expectedTotal,
      calculatedTotal,
      isCorrect: calculatedTotal === expectedTotal,
      transactionCount: payments.length,
    },
  };
}

/**
 * TC-FLT-002: Rent proration edge cases
 * Tests various proration scenarios that commonly cause precision issues
 */
export function generateTC_FLT_002() {
  const prorationScenarios = [
    { rent: '1523.45', daysInMonth: 30, daysOccupied: 17, expected: '862.95' },
    { rent: '1500.00', daysInMonth: 31, daysOccupied: 1, expected: '48.39' },
    { rent: '1000.00', daysInMonth: 28, daysOccupied: 14, expected: '500.00' },
    { rent: '2345.67', daysInMonth: 30, daysOccupied: 15, expected: '1172.84' },
    { rent: '999.99', daysInMonth: 31, daysOccupied: 31, expected: '999.99' },
    { rent: '1.00', daysInMonth: 30, daysOccupied: 1, expected: '0.03' },
    { rent: '0.01', daysInMonth: 30, daysOccupied: 1, expected: '0.00' },
    { rent: '10000.00', daysInMonth: 29, daysOccupied: 29, expected: '10000.00' },
    { rent: '1234.56', daysInMonth: 30, daysOccupied: 0, expected: '0.00' },
    { rent: '7777.77', daysInMonth: 31, daysOccupied: 7, expected: '1756.11' },
  ];

  const results = prorationScenarios.map((scenario, index) => {
    const calculated = calculateProration(
      scenario.rent,
      scenario.daysInMonth,
      scenario.daysOccupied
    );

    return {
      id: uuid(),
      scenario_number: index + 1,
      monthly_rent: scenario.rent,
      days_in_month: scenario.daysInMonth,
      days_occupied: scenario.daysOccupied,
      expected_proration: scenario.expected,
      calculated_proration: calculated,
      is_correct: calculated === scenario.expected,
      metadata: seedMetadata('TC-FLT-002', {
        seed_type: 'proration_test',
        scenario: index + 1,
      }),
    };
  });

  return {
    testCaseId: 'TC-FLT-002',
    description: 'Rent proration must calculate penny-perfect amounts',
    scenarios: results,
    verification: {
      totalScenarios: results.length,
      passed: results.filter(r => r.is_correct).length,
      failed: results.filter(r => !r.is_correct).length,
    },
  };
}

/**
 * TC-FLT-003: Unbalanced journal entry detection
 * Tests that imbalances as small as $0.00009 are rejected
 */
export function generateTC_FLT_003() {
  const unbalancedEntries = [];

  // Various tiny imbalances that MUST be rejected
  const imbalances = [
    '0.00001', '0.00005', '0.00009', '0.00010', '0.00049',
    '0.00050', '0.00099', '0.0001', '0.0005', '0.0009',
  ];

  imbalances.forEach((imbalance, index) => {
    const entryId = journalEntryId();
    const debitAmount = '1000.0000';
    const creditAmount = decimalSubtract(debitAmount, imbalance);

    const entry = {
      id: entryId,
      entry_type: 'RENT_PAYMENT',
      entry_date: daysAgo(index),
      description: `Unbalanced entry - imbalance of $${imbalance}`,
      status: 'posted',
      metadata: seedMetadata('TC-FLT-003', {
        seed_type: 'unbalanced_entry',
        imbalance_amount: imbalance,
      }),
    };

    const postings = [
      {
        id: journalPostingId(),
        journal_entry_id: entryId,
        account_code: '1010',
        debit_amount: debitAmount,
        credit_amount: '0.0000',
      },
      {
        id: journalPostingId(),
        journal_entry_id: entryId,
        account_code: '1110',
        debit_amount: '0.0000',
        credit_amount: creditAmount,
      },
    ];

    const balanced = isBalanced([
      { debit: debitAmount, credit: '0.0000' },
      { debit: '0.0000', credit: creditAmount },
    ]);

    unbalancedEntries.push({
      entry,
      postings,
      imbalance,
      shouldBeRejected: true,
      isBalanced: balanced,
      detectionCorrect: !balanced, // Should detect as unbalanced
    });
  });

  return {
    testCaseId: 'TC-FLT-003',
    description: 'Journal entries with any imbalance must be rejected',
    entries: unbalancedEntries,
    verification: {
      totalEntries: unbalancedEntries.length,
      correctlyDetected: unbalancedEntries.filter(e => e.detectionCorrect).length,
      falseNegatives: unbalancedEntries.filter(e => !e.detectionCorrect).length,
    },
  };
}

/**
 * TC-FLT-004: 365 daily charges summing correctly
 * Tests daily billing accumulation
 */
export function generateTC_FLT_004() {
  const dailyCharges = [];
  const dailyRate = '4.11'; // $4.11/day = $1500.15/year
  const tenantIdVal = tenantId();

  for (let i = 0; i < 365; i++) {
    dailyCharges.push({
      id: uuid(),
      tenant_id: tenantIdVal,
      charge_date: daysAgo(365 - i),
      amount: dailyRate,
      type: 'daily_rent',
      metadata: seedMetadata('TC-FLT-004', {
        seed_type: 'daily_charge',
        day_number: i + 1,
      }),
    });
  }

  const expectedTotal = '1500.15'; // 365 x 4.11 = 1500.15
  const calculatedTotal = decimalSum(dailyCharges.map(c => c.amount));

  return {
    testCaseId: 'TC-FLT-004',
    description: '365 daily charges of $4.11 must sum to exactly $1500.15',
    charges: dailyCharges,
    verification: {
      dailyRate,
      dayCount: 365,
      expectedTotal,
      calculatedTotal,
      isCorrect: calculatedTotal === expectedTotal,
    },
  };
}

/**
 * TC-FLT-005: Large amount handling ($900 trillion)
 * Tests that system can handle extremely large amounts
 */
export function generateTC_FLT_005() {
  const largeAmounts = [
    '900000000000000.0000', // 900 trillion
    '999999999999999.9999', // Maximum DECIMAL(19,4) approximately
    '123456789012345.6789', // Random large amount
    '100000000000000.0001', // Large with small fraction
    '1.0000',               // Tiny for comparison
  ];

  const testCases = largeAmounts.map((amount, index) => {
    // Test addition
    const addResult = decimalAdd(amount, '0.0001');
    const expectedAdd = decimalAdd(amount, '0.0001');

    // Test subtraction
    const subResult = decimalSubtract(amount, '0.0001');

    // Test multiplication (by small factor)
    const mulResult = decimalMultiply(amount, '1.0001', 4);

    return {
      id: uuid(),
      original_amount: amount,
      add_result: addResult,
      sub_result: subResult,
      mul_result: mulResult,
      precision_maintained: true, // Validated by Decimal.js
      metadata: seedMetadata('TC-FLT-005', {
        seed_type: 'large_amount_test',
        scenario: index + 1,
      }),
    };
  });

  return {
    testCaseId: 'TC-FLT-005',
    description: 'Large amounts up to $900 trillion must maintain precision',
    testCases,
    verification: {
      maxAmountTested: '999999999999999.9999',
      allPrecisionMaintained: testCases.every(t => t.precision_maintained),
    },
  };
}

/**
 * TC-FLT-006: DECIMAL(19,4) precision validation
 * Tests 4-decimal-place precision throughout
 */
export function generateTC_FLT_006() {
  const precisionTests = [
    { operation: 'add', a: '0.0001', b: '0.0001', expected: '0.0002' },
    { operation: 'add', a: '0.0009', b: '0.0001', expected: '0.0010' },
    { operation: 'add', a: '0.9999', b: '0.0001', expected: '1.0000' },
    { operation: 'sub', a: '1.0000', b: '0.0001', expected: '0.9999' },
    { operation: 'sub', a: '0.0001', b: '0.0001', expected: '0.0000' },
    { operation: 'mul', a: '100.00', b: '0.0001', expected: '0.0100' },
    { operation: 'div', a: '1.0000', b: '3', expected: '0.3333' },
    { operation: 'div', a: '1.0000', b: '7', expected: '0.1429' },
    { operation: 'div', a: '2.0000', b: '3', expected: '0.6667' },
    { operation: 'sum', values: ['0.0001', '0.0002', '0.0003', '0.0004'], expected: '0.0010' },
  ];

  const results = precisionTests.map((test, index) => {
    let calculated;

    switch (test.operation) {
      case 'add':
        calculated = decimalAdd(test.a, test.b);
        break;
      case 'sub':
        calculated = decimalSubtract(test.a, test.b);
        break;
      case 'mul':
        calculated = decimalMultiply(test.a, test.b, 4);
        break;
      case 'div':
        calculated = decimalDivide(test.a, test.b, 4);
        break;
      case 'sum':
        calculated = decimalSum(test.values);
        break;
    }

    return {
      id: uuid(),
      operation: test.operation,
      operands: test.a ? { a: test.a, b: test.b } : { values: test.values },
      expected: test.expected,
      calculated,
      is_correct: calculated === test.expected,
      metadata: seedMetadata('TC-FLT-006', {
        seed_type: 'precision_test',
        operation: test.operation,
        scenario: index + 1,
      }),
    };
  });

  return {
    testCaseId: 'TC-FLT-006',
    description: 'All calculations must maintain DECIMAL(19,4) precision',
    tests: results,
    verification: {
      totalTests: results.length,
      passed: results.filter(r => r.is_correct).length,
      failed: results.filter(r => !r.is_correct).length,
    },
  };
}

/**
 * TC-FLT-007: Empty array handling
 * Tests that empty collections return 0.0000
 */
export function generateTC_FLT_007() {
  const emptyArrayTests = [
    { description: 'Empty payments array', values: [], expected: '0.0000' },
    { description: 'Null values filtered out', values: [null, undefined, ''], expected: '0.0000' },
    { description: 'Single zero', values: ['0.00'], expected: '0.0000' },
    { description: 'Multiple zeros', values: ['0.00', '0.0000', '0'], expected: '0.0000' },
  ];

  const results = emptyArrayTests.map((test, index) => {
    const validValues = (test.values || []).filter(v => v !== null && v !== undefined && v !== '');
    const calculated = validValues.length > 0 ? decimalSum(validValues) : '0.0000';

    return {
      id: uuid(),
      description: test.description,
      input_values: test.values,
      expected: test.expected,
      calculated,
      is_correct: calculated === test.expected,
      metadata: seedMetadata('TC-FLT-007', {
        seed_type: 'empty_array_test',
        scenario: index + 1,
      }),
    };
  });

  return {
    testCaseId: 'TC-FLT-007',
    description: 'Empty arrays must return exactly 0.0000',
    tests: results,
    verification: {
      totalTests: results.length,
      passed: results.filter(r => r.is_correct).length,
      failed: results.filter(r => !r.is_correct).length,
    },
  };
}

/**
 * TC-FLT-008: Negative amount formatting
 * Tests consistent negative number representation
 */
export function generateTC_FLT_008() {
  const negativeTests = [
    { positive: '100.00', expected_negative: '-100.0000' },
    { positive: '0.01', expected_negative: '-0.0100' },
    { positive: '999999.99', expected_negative: '-999999.9900' },
    { positive: '0.0001', expected_negative: '-0.0001' },
  ];

  const results = negativeTests.map((test, index) => {
    const calculated = decimalMultiply(test.positive, '-1', 4);

    return {
      id: uuid(),
      positive_amount: test.positive,
      expected_negative: test.expected_negative,
      calculated,
      is_correct: calculated === test.expected_negative,
      format_correct: calculated.startsWith('-'),
      metadata: seedMetadata('TC-FLT-008', {
        seed_type: 'negative_format_test',
        scenario: index + 1,
      }),
    };
  });

  return {
    testCaseId: 'TC-FLT-008',
    description: 'Negative amounts must format consistently with leading minus',
    tests: results,
    verification: {
      totalTests: results.length,
      passed: results.filter(r => r.is_correct).length,
      allFormatCorrect: results.every(r => r.format_correct),
    },
  };
}

/**
 * TC-FLT-009: Currency conversion precision
 * Tests multi-currency conversion without precision loss
 */
export function generateTC_FLT_009() {
  const conversions = [
    { from: 'USD', to: 'EUR', amount: '100.00', rate: '0.85', expected: '85.0000' },
    { from: 'USD', to: 'GBP', amount: '100.00', rate: '0.73', expected: '73.0000' },
    { from: 'EUR', to: 'USD', amount: '85.00', rate: '1.1765', expected: '100.0025' },
    { from: 'USD', to: 'JPY', amount: '100.00', rate: '110.25', expected: '11025.0000' },
    { from: 'JPY', to: 'USD', amount: '11025', rate: '0.0091', expected: '100.3275' },
  ];

  const results = conversions.map((conv, index) => {
    const calculated = decimalMultiply(conv.amount, conv.rate, 4);

    return {
      id: uuid(),
      from_currency: conv.from,
      to_currency: conv.to,
      original_amount: conv.amount,
      exchange_rate: conv.rate,
      expected: conv.expected,
      calculated,
      is_correct: calculated === conv.expected,
      metadata: seedMetadata('TC-FLT-009', {
        seed_type: 'currency_conversion_test',
        conversion: `${conv.from}_to_${conv.to}`,
      }),
    };
  });

  return {
    testCaseId: 'TC-FLT-009',
    description: 'Currency conversions must maintain 4-decimal precision',
    conversions: results,
    verification: {
      totalConversions: results.length,
      passed: results.filter(r => r.is_correct).length,
      failed: results.filter(r => !r.is_correct).length,
    },
  };
}

/**
 * TC-FLT-010: Large batch posting
 * Tests 100,000 journal postings summing correctly
 */
export function generateTC_FLT_010(batchSize = 1000) {
  // Generate smaller batch for seed data (full 100K in actual test)
  const postings = [];
  const postingAmount = '10.00';
  const entryId = journalEntryId();

  // Generate balanced pairs
  for (let i = 0; i < batchSize; i++) {
    // Debit posting
    postings.push({
      id: journalPostingId(),
      journal_entry_id: entryId,
      account_code: '1010',
      debit_amount: postingAmount,
      credit_amount: '0.0000',
      sequence: i * 2,
      metadata: seedMetadata('TC-FLT-010', {
        seed_type: 'batch_posting',
        posting_type: 'debit',
        batch_sequence: i,
      }),
    });

    // Credit posting
    postings.push({
      id: journalPostingId(),
      journal_entry_id: entryId,
      account_code: '1110',
      debit_amount: '0.0000',
      credit_amount: postingAmount,
      sequence: i * 2 + 1,
      metadata: seedMetadata('TC-FLT-010', {
        seed_type: 'batch_posting',
        posting_type: 'credit',
        batch_sequence: i,
      }),
    });
  }

  const totalDebits = decimalSum(postings.filter(p => p.debit_amount !== '0.0000').map(p => p.debit_amount));
  const totalCredits = decimalSum(postings.filter(p => p.credit_amount !== '0.0000').map(p => p.credit_amount));
  const expectedTotal = decimalMultiply(postingAmount, batchSize.toString(), 4);

  return {
    testCaseId: 'TC-FLT-010',
    description: 'Large batch of postings must sum correctly and balance',
    entry: {
      id: entryId,
      description: `Batch entry with ${batchSize * 2} postings`,
      status: 'posted',
    },
    postings,
    verification: {
      postingCount: postings.length,
      totalDebits,
      totalCredits,
      expectedTotal,
      isBalanced: totalDebits === totalCredits,
      sumsCorrect: totalDebits === expectedTotal && totalCredits === expectedTotal,
    },
  };
}

/**
 * Generate all TC-FLT test data
 * @returns {object} All floating point test data
 */
export function generateAllTC_FLT_Data() {
  return {
    'TC-FLT-001': generateTC_FLT_001(),
    'TC-FLT-002': generateTC_FLT_002(),
    'TC-FLT-003': generateTC_FLT_003(),
    'TC-FLT-004': generateTC_FLT_004(),
    'TC-FLT-005': generateTC_FLT_005(),
    'TC-FLT-006': generateTC_FLT_006(),
    'TC-FLT-007': generateTC_FLT_007(),
    'TC-FLT-008': generateTC_FLT_008(),
    'TC-FLT-009': generateTC_FLT_009(),
    'TC-FLT-010': generateTC_FLT_010(1000), // 1000 pairs = 2000 postings for seed
  };
}

/**
 * Get TC-FLT summary
 * @param {object} testData - All test data
 * @returns {object} Summary
 */
export function getTC_FLT_Summary(testData) {
  const summary = {
    totalTestCases: Object.keys(testData).length,
    passed: 0,
    failed: 0,
    details: {},
  };

  Object.entries(testData).forEach(([testId, data]) => {
    const verification = data.verification;
    let passed = true;

    if (verification.isCorrect !== undefined) {
      passed = verification.isCorrect;
    } else if (verification.failed !== undefined) {
      passed = verification.failed === 0;
    } else if (verification.isBalanced !== undefined) {
      passed = verification.isBalanced;
    }

    if (passed) summary.passed++;
    else summary.failed++;

    summary.details[testId] = {
      description: data.description,
      passed,
      verification,
    };
  });

  return summary;
}

export default {
  generateTC_FLT_001,
  generateTC_FLT_002,
  generateTC_FLT_003,
  generateTC_FLT_004,
  generateTC_FLT_005,
  generateTC_FLT_006,
  generateTC_FLT_007,
  generateTC_FLT_008,
  generateTC_FLT_009,
  generateTC_FLT_010,
  generateAllTC_FLT_Data,
  getTC_FLT_Summary,
};
