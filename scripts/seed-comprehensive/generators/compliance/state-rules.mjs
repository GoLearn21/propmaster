/**
 * State Rules Generator
 * Generates state-specific compliance rules and test scenarios
 */

import { uuid } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import { isoTimestamp, daysAgo, daysFromNow } from '../../utils/date-utils.mjs';
import { decimalMultiply, calculateLateFee } from '../../utils/decimal-utils.mjs';
import { STATE_COMPLIANCE } from '../../config/seed-config.mjs';

/**
 * Detailed state rules for property management
 */
export const DETAILED_STATE_RULES = {
  NC: {
    name: 'North Carolina',
    securityDeposit: {
      maxMonthsRent: 2, // Can't exceed 2 months rent
      returnDeadlineDays: 30, // Must return within 30 days of lease end
      interestRequired: false,
      escrowRequired: false,
      allowedDeductions: ['unpaid_rent', 'damages', 'cleaning', 'lease_violations'],
      itemizedStatementRequired: true,
      itemizedStatementDeadline: 30,
    },
    lateFee: {
      type: 'lesser_of',
      maxPercentage: 5,
      maxFlatAmount: 15,
      gracePeriodDays: 5,
      stackingAllowed: false, // Can't add late fee on late fee
    },
    notices: {
      rentIncreaseNotice: 30, // 30 days for month-to-month
      terminationNotice: 7, // 7 days for non-payment
      evictionNotice: 10, // 10 days to vacate after judgment
    },
    disclosures: {
      leadPaint: true, // Required for pre-1978
      mold: true,
      flood: true,
      sexOffender: false,
    },
  },
  SC: {
    name: 'South Carolina',
    securityDeposit: {
      maxMonthsRent: null, // No statutory limit
      returnDeadlineDays: 30,
      interestRequired: false,
      escrowRequired: false,
      allowedDeductions: ['unpaid_rent', 'damages', 'cleaning'],
      itemizedStatementRequired: true,
      itemizedStatementDeadline: 30,
    },
    lateFee: {
      type: 'reasonable', // Must be "reasonable"
      maxPercentage: null,
      maxFlatAmount: null,
      gracePeriodDays: null, // No statutory grace period
      stackingAllowed: true,
    },
    notices: {
      rentIncreaseNotice: 30,
      terminationNotice: 5,
      evictionNotice: 5,
    },
    disclosures: {
      leadPaint: true,
      mold: false,
      flood: false,
      sexOffender: false,
    },
  },
  GA: {
    name: 'Georgia',
    securityDeposit: {
      maxMonthsRent: null, // No statutory limit
      returnDeadlineDays: 30, // 30 days after termination
      interestRequired: false,
      escrowRequired: true, // If 10+ units
      escrowRequiredMinUnits: 10,
      allowedDeductions: ['unpaid_rent', 'damages', 'cleaning'],
      itemizedStatementRequired: true,
      itemizedStatementDeadline: 3, // 3 business days with check
    },
    lateFee: {
      type: 'reasonable',
      maxPercentage: null,
      maxFlatAmount: null,
      gracePeriodDays: null,
      stackingAllowed: true,
    },
    notices: {
      rentIncreaseNotice: 60, // 60 days recommended
      terminationNotice: 60,
      evictionNotice: 7,
    },
    disclosures: {
      leadPaint: true,
      mold: false,
      flood: true,
      sexOffender: false,
    },
  },
};

/**
 * Generate state compliance configuration for a property
 * @param {string} state - State code
 * @returns {object} Compliance configuration
 */
export function generateStateCompliance(state) {
  const rules = DETAILED_STATE_RULES[state] || DETAILED_STATE_RULES.NC;

  return {
    state,
    state_name: rules.name,
    security_deposit: rules.securityDeposit,
    late_fee: rules.lateFee,
    notices: rules.notices,
    disclosures: rules.disclosures,
    effective_date: '2024-01-01',
    last_updated: isoTimestamp(),
    metadata: seedMetadata(null, {
      seed_type: 'state_compliance',
      state,
    }),
  };
}

/**
 * Generate late fee compliance test scenarios
 * @param {string} state - State code
 * @returns {object[]} Late fee test scenarios
 */
export function generateLateFeeScenarios(state) {
  const rules = DETAILED_STATE_RULES[state] || DETAILED_STATE_RULES.NC;
  const scenarios = [];

  // NC-specific scenarios (5% or $15, whichever is less)
  if (state === 'NC') {
    const testCases = [
      { rent: '200.00', expected: '10.00', description: '5% of $200 = $10 (less than $15)' },
      { rent: '300.00', expected: '15.00', description: '5% of $300 = $15 (equals $15)' },
      { rent: '500.00', expected: '15.00', description: '5% of $500 = $25, capped at $15' },
      { rent: '1000.00', expected: '15.00', description: '5% of $1000 = $50, capped at $15' },
      { rent: '1500.00', expected: '15.00', description: '5% of $1500 = $75, capped at $15' },
      { rent: '100.00', expected: '5.00', description: '5% of $100 = $5 (less than $15)' },
      { rent: '50.00', expected: '2.50', description: '5% of $50 = $2.50 (less than $15)' },
    ];

    testCases.forEach((tc, index) => {
      const calculatedFee = calculateLateFee(tc.rent, rules.lateFee.maxPercentage, rules.lateFee.maxFlatAmount.toString());

      scenarios.push({
        id: uuid(),
        state,
        test_case: `NC-LF-${String(index + 1).padStart(3, '0')}`,
        monthly_rent: tc.rent,
        expected_late_fee: tc.expected,
        calculated_late_fee: calculatedFee,
        description: tc.description,
        is_compliant: calculatedFee === tc.expected,
        metadata: seedMetadata('TC-CAL-002', {
          seed_type: 'late_fee_scenario',
          state,
          test_number: index + 1,
        }),
      });
    });
  }

  // SC/GA - "reasonable" late fees
  if (state === 'SC' || state === 'GA') {
    const testCases = [
      { rent: '1000.00', fee: '50.00', reasonable: true, description: '5% late fee is reasonable' },
      { rent: '1000.00', fee: '100.00', reasonable: true, description: '10% late fee is reasonable' },
      { rent: '1000.00', fee: '200.00', reasonable: false, description: '20% late fee is excessive' },
      { rent: '500.00', fee: '150.00', reasonable: false, description: '30% late fee is excessive' },
    ];

    testCases.forEach((tc, index) => {
      scenarios.push({
        id: uuid(),
        state,
        test_case: `${state}-LF-${String(index + 1).padStart(3, '0')}`,
        monthly_rent: tc.rent,
        late_fee: tc.fee,
        is_reasonable: tc.reasonable,
        description: tc.description,
        metadata: seedMetadata('TC-CAL-002', {
          seed_type: 'late_fee_scenario',
          state,
          test_number: index + 1,
        }),
      });
    });
  }

  return scenarios;
}

/**
 * Generate security deposit compliance test scenarios
 * @param {string} state - State code
 * @returns {object[]} Security deposit test scenarios
 */
export function generateSecurityDepositScenarios(state) {
  const rules = DETAILED_STATE_RULES[state] || DETAILED_STATE_RULES.NC;
  const scenarios = [];

  // NC: Maximum 2 months rent
  if (state === 'NC') {
    const testCases = [
      { rent: '1000.00', deposit: '2000.00', compliant: true, description: 'Exactly 2 months' },
      { rent: '1000.00', deposit: '1500.00', compliant: true, description: '1.5 months' },
      { rent: '1000.00', deposit: '1000.00', compliant: true, description: '1 month' },
      { rent: '1000.00', deposit: '2001.00', compliant: false, description: 'Exceeds 2 months by $1' },
      { rent: '1000.00', deposit: '3000.00', compliant: false, description: '3 months - violation' },
      { rent: '1500.00', deposit: '3000.00', compliant: true, description: 'Exactly 2 months at $1500' },
      { rent: '1500.00', deposit: '3001.00', compliant: false, description: 'Exceeds 2 months at $1500' },
    ];

    testCases.forEach((tc, index) => {
      const maxDeposit = decimalMultiply(tc.rent, '2', 2);

      scenarios.push({
        id: uuid(),
        state,
        test_case: `NC-SD-${String(index + 1).padStart(3, '0')}`,
        monthly_rent: tc.rent,
        security_deposit: tc.deposit,
        max_allowed: maxDeposit,
        is_compliant: tc.compliant,
        description: tc.description,
        metadata: seedMetadata('TC-CAL-001', {
          seed_type: 'security_deposit_scenario',
          state,
          test_number: index + 1,
        }),
      });
    });
  }

  // Return deadline scenarios
  const returnScenarios = [
    { days_after_moveout: 25, compliant: true, description: 'Returned within 30 days' },
    { days_after_moveout: 30, compliant: true, description: 'Returned exactly at 30 days' },
    { days_after_moveout: 31, compliant: false, description: 'Returned 1 day late' },
    { days_after_moveout: 45, compliant: false, description: 'Returned 15 days late' },
  ];

  returnScenarios.forEach((rs, index) => {
    scenarios.push({
      id: uuid(),
      state,
      test_case: `${state}-SDR-${String(index + 1).padStart(3, '0')}`,
      days_after_moveout: rs.days_after_moveout,
      deadline_days: rules.securityDeposit.returnDeadlineDays,
      is_compliant: rs.compliant,
      description: rs.description,
      metadata: seedMetadata('TC-CAL-001', {
        seed_type: 'deposit_return_scenario',
        state,
        test_number: index + 1,
      }),
    });
  });

  return scenarios;
}

/**
 * Generate notice period compliance scenarios
 * @param {string} state - State code
 * @returns {object[]} Notice period scenarios
 */
export function generateNoticeScenarios(state) {
  const rules = DETAILED_STATE_RULES[state] || DETAILED_STATE_RULES.NC;
  const scenarios = [];

  // Rent increase notices
  const requiredDays = rules.notices.rentIncreaseNotice;

  const noticeCases = [
    { days_given: requiredDays + 15, compliant: true, description: `${requiredDays + 15} days notice - compliant` },
    { days_given: requiredDays, compliant: true, description: `Exactly ${requiredDays} days - minimum compliant` },
    { days_given: requiredDays - 1, compliant: false, description: `${requiredDays - 1} days - insufficient` },
    { days_given: requiredDays - 10, compliant: false, description: `${requiredDays - 10} days - insufficient` },
  ];

  noticeCases.forEach((nc, index) => {
    scenarios.push({
      id: uuid(),
      state,
      notice_type: 'rent_increase',
      test_case: `${state}-NRI-${String(index + 1).padStart(3, '0')}`,
      days_given: nc.days_given,
      required_days: requiredDays,
      is_compliant: nc.compliant,
      description: nc.description,
      metadata: seedMetadata(null, {
        seed_type: 'notice_scenario',
        state,
        notice_type: 'rent_increase',
      }),
    });
  });

  return scenarios;
}

/**
 * Generate GA escrow requirement scenarios
 * @returns {object[]} Escrow scenarios
 */
export function generateGAEscrowScenarios() {
  const scenarios = [];

  const escrowCases = [
    { units: 5, escrow_required: false, description: 'Under 10 units - no escrow required' },
    { units: 9, escrow_required: false, description: '9 units - no escrow required' },
    { units: 10, escrow_required: true, description: 'Exactly 10 units - escrow required' },
    { units: 15, escrow_required: true, description: '15 units - escrow required' },
    { units: 100, escrow_required: true, description: '100 units - escrow required' },
  ];

  escrowCases.forEach((ec, index) => {
    scenarios.push({
      id: uuid(),
      state: 'GA',
      test_case: `GA-ESC-${String(index + 1).padStart(3, '0')}`,
      total_units: ec.units,
      escrow_required: ec.escrow_required,
      threshold: 10,
      description: ec.description,
      metadata: seedMetadata(null, {
        seed_type: 'escrow_scenario',
        state: 'GA',
      }),
    });
  });

  return scenarios;
}

/**
 * Generate all state compliance data
 * @returns {object} All compliance data
 */
export function generateAllStateCompliance() {
  const states = ['NC', 'SC', 'GA'];
  const allData = {
    stateConfigs: [],
    lateFeeScenarios: [],
    securityDepositScenarios: [],
    noticeScenarios: [],
    escrowScenarios: [],
  };

  states.forEach(state => {
    allData.stateConfigs.push(generateStateCompliance(state));
    allData.lateFeeScenarios.push(...generateLateFeeScenarios(state));
    allData.securityDepositScenarios.push(...generateSecurityDepositScenarios(state));
    allData.noticeScenarios.push(...generateNoticeScenarios(state));
  });

  // GA-specific escrow
  allData.escrowScenarios = generateGAEscrowScenarios();

  return allData;
}

/**
 * Get compliance summary
 * @param {object} complianceData - All compliance data
 * @returns {object} Summary
 */
export function getComplianceSummary(complianceData) {
  return {
    statesConfigured: complianceData.stateConfigs.length,
    lateFeeScenarios: complianceData.lateFeeScenarios.length,
    lateFeeCompliant: complianceData.lateFeeScenarios.filter(s => s.is_compliant || s.is_reasonable).length,
    securityDepositScenarios: complianceData.securityDepositScenarios.length,
    securityDepositCompliant: complianceData.securityDepositScenarios.filter(s => s.is_compliant).length,
    noticeScenarios: complianceData.noticeScenarios.length,
    escrowScenarios: complianceData.escrowScenarios.length,
  };
}

/**
 * Generate comprehensive compliance test data
 * @param {object} seedData - All seed data
 * @returns {object} Compliance test data
 */
export function generateComplianceTestData(seedData) {
  const { properties = [], leases = [], tenants = [] } = seedData;

  // Get states from properties
  const states = [...new Set(properties.map(p => p.state))].filter(Boolean);

  // Generate late fee scenarios for each state
  const lateFeeScenarios = [];
  states.forEach(state => {
    lateFeeScenarios.push(...generateLateFeeScenarios(state));
  });

  // Generate deposit scenarios for each state
  const depositScenarios = [];
  states.forEach(state => {
    depositScenarios.push(...generateSecurityDepositScenarios(state));
  });

  // Generate GA escrow scenarios if GA properties exist
  const gaEscrowScenarios = states.includes('GA')
    ? generateGAEscrowScenarios()
    : [];

  return {
    lateFeeScenarios,
    depositScenarios,
    gaEscrowScenarios,
    stateRules: states.reduce((acc, state) => {
      acc[state] = DETAILED_STATE_RULES[state];
      return acc;
    }, {}),
    summary: {
      statesCovered: states,
      lateFeeScenarioCount: lateFeeScenarios.length,
      depositScenarioCount: depositScenarios.length,
    },
  };
}

export default {
  generateStateCompliance,
  generateLateFeeScenarios,
  generateSecurityDepositScenarios,
  generateNoticeScenarios,
  generateGAEscrowScenarios,
  generateAllStateCompliance,
  generateComplianceTestData,
  getComplianceSummary,
  DETAILED_STATE_RULES,
};
