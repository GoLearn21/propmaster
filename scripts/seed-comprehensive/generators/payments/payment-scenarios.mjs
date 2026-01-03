/**
 * Payment Scenarios Generator
 * Generates edge case payment scenarios for comprehensive testing
 */

import { paymentId, idempotencyKey, traceId } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import { isoTimestamp, daysAgo, monthsAgo } from '../../utils/date-utils.mjs';
import { randomAmount, decimalAdd, decimalMultiply } from '../../utils/decimal-utils.mjs';

/**
 * Payment scenario types
 */
export const PAYMENT_SCENARIOS = {
  PARTIAL_PAYMENT: 'PARTIAL_PAYMENT',
  OVERPAYMENT: 'OVERPAYMENT',
  NSF_BOUNCE: 'NSF_BOUNCE',
  NSF_WITH_REVERSAL: 'NSF_WITH_REVERSAL',
  DUPLICATE_ATTEMPT: 'DUPLICATE_ATTEMPT',
  CREDIT_BALANCE: 'CREDIT_BALANCE',
  SPLIT_PAYMENT: 'SPLIT_PAYMENT',
  PREPAYMENT: 'PREPAYMENT',
  LATE_WITH_FEE: 'LATE_WITH_FEE',
  REFUND: 'REFUND',
  CHARGEBACK: 'CHARGEBACK',
  AUTOPAY_FAILURE: 'AUTOPAY_FAILURE',
  ACH_RETURN: 'ACH_RETURN',
  SECURITY_DEPOSIT: 'SECURITY_DEPOSIT',
  PRORATED: 'PRORATED',
};

/**
 * Generate partial payment scenario
 * @param {object} tenant - Tenant record
 * @param {object} lease - Lease record
 * @returns {object[]} Payment records
 */
function generatePartialPaymentScenario(tenant, lease) {
  const dueDate = daysAgo(15);
  const fullAmount = lease.monthly_rent;
  const partialAmount = decimalMultiply(fullAmount, '0.50');
  const remainingAmount = decimalMultiply(fullAmount, '0.50');

  return [
    {
      id: paymentId('partial1'),
      idempotency_key: idempotencyKey('partial', lease.id, dueDate),
      tenant_id: tenant.id,
      lease_id: lease.id,
      property_id: tenant.property_id,
      amount: partialAmount,
      payment_date: daysAgo(14),
      due_date: dueDate,
      payment_method: 'ach',
      status: 'completed',
      is_partial: true,
      is_late: false,
      is_late_fee: false,
      is_nsf: false,
      notes: 'Partial payment - 50% of rent',
      trace_id: traceId(),
      created_at: daysAgo(14),
      updated_at: isoTimestamp(),
      metadata: seedMetadata('SCENARIO-PARTIAL', {
        scenario: PAYMENT_SCENARIOS.PARTIAL_PAYMENT,
        payment_number: 1,
        total_due: fullAmount,
      }),
    },
    {
      id: paymentId('partial2'),
      idempotency_key: idempotencyKey('partial2', lease.id, dueDate),
      tenant_id: tenant.id,
      lease_id: lease.id,
      property_id: tenant.property_id,
      amount: remainingAmount,
      payment_date: daysAgo(7),
      due_date: dueDate,
      payment_method: 'ach',
      status: 'completed',
      is_partial: true,
      is_late: true,
      is_late_fee: false,
      is_nsf: false,
      notes: 'Partial payment - remaining 50%',
      trace_id: traceId(),
      created_at: daysAgo(7),
      updated_at: isoTimestamp(),
      metadata: seedMetadata('SCENARIO-PARTIAL', {
        scenario: PAYMENT_SCENARIOS.PARTIAL_PAYMENT,
        payment_number: 2,
        total_due: fullAmount,
      }),
    },
  ];
}

/**
 * Generate NSF with reversal scenario
 * @param {object} tenant - Tenant record
 * @param {object} lease - Lease record
 * @returns {object[]} Payment records
 */
function generateNSFWithReversalScenario(tenant, lease) {
  const originalPaymentId = paymentId('nsf');
  const dueDate = monthsAgo(1);
  const nsfFeeAmount = '35.00';

  return [
    // Original payment (bounced)
    {
      id: originalPaymentId,
      idempotency_key: idempotencyKey('nsf-orig', lease.id, dueDate),
      tenant_id: tenant.id,
      lease_id: lease.id,
      property_id: tenant.property_id,
      amount: lease.monthly_rent,
      payment_date: daysAgo(25),
      due_date: dueDate,
      payment_method: 'check',
      status: 'nsf',
      is_partial: false,
      is_late: false,
      is_late_fee: false,
      is_nsf: true,
      nsf_date: daysAgo(22),
      notes: 'Check returned - insufficient funds',
      trace_id: traceId(),
      created_at: daysAgo(25),
      updated_at: daysAgo(22),
      metadata: seedMetadata('SCENARIO-NSF', {
        scenario: PAYMENT_SCENARIOS.NSF_WITH_REVERSAL,
        check_number: '1234',
      }),
    },
    // NSF reversal
    {
      id: paymentId('nsf-rev'),
      idempotency_key: idempotencyKey('nsf-rev', lease.id, dueDate),
      tenant_id: tenant.id,
      lease_id: lease.id,
      property_id: tenant.property_id,
      amount: `-${lease.monthly_rent}`,
      payment_date: daysAgo(22),
      due_date: dueDate,
      payment_method: 'internal',
      status: 'completed',
      is_partial: false,
      is_late: false,
      is_late_fee: false,
      is_nsf: false,
      is_reversal: true,
      reverses_payment_id: originalPaymentId,
      notes: 'NSF reversal',
      trace_id: traceId(),
      created_at: daysAgo(22),
      updated_at: isoTimestamp(),
      metadata: seedMetadata('SCENARIO-NSF', {
        scenario: PAYMENT_SCENARIOS.NSF_WITH_REVERSAL,
        reversal_type: 'nsf',
      }),
    },
    // NSF fee
    {
      id: paymentId('nsf-fee'),
      idempotency_key: idempotencyKey('nsf-fee', lease.id, dueDate),
      tenant_id: tenant.id,
      lease_id: lease.id,
      property_id: tenant.property_id,
      amount: nsfFeeAmount,
      payment_date: daysAgo(22),
      due_date: daysAgo(22),
      payment_method: 'internal',
      status: 'pending',
      charge_type: 'NSF_FEE',
      is_partial: false,
      is_late: false,
      is_late_fee: false,
      is_nsf: false,
      is_nsf_fee: true,
      notes: 'NSF fee charge',
      trace_id: traceId(),
      created_at: daysAgo(22),
      updated_at: isoTimestamp(),
      metadata: seedMetadata('SCENARIO-NSF', {
        scenario: PAYMENT_SCENARIOS.NSF_WITH_REVERSAL,
        fee_type: 'nsf',
      }),
    },
    // Replacement payment (good funds)
    {
      id: paymentId('nsf-replace'),
      idempotency_key: idempotencyKey('nsf-replace', lease.id, dueDate),
      tenant_id: tenant.id,
      lease_id: lease.id,
      property_id: tenant.property_id,
      amount: decimalAdd(lease.monthly_rent, nsfFeeAmount),
      payment_date: daysAgo(20),
      due_date: dueDate,
      payment_method: 'credit_card',
      status: 'completed',
      is_partial: false,
      is_late: true,
      is_late_fee: false,
      is_nsf: false,
      notes: 'Replacement payment with NSF fee',
      trace_id: traceId(),
      created_at: daysAgo(20),
      updated_at: isoTimestamp(),
      metadata: seedMetadata('SCENARIO-NSF', {
        scenario: PAYMENT_SCENARIOS.NSF_WITH_REVERSAL,
        includes_nsf_fee: true,
      }),
    },
  ];
}

/**
 * Generate overpayment scenario
 * @param {object} tenant - Tenant record
 * @param {object} lease - Lease record
 * @returns {object[]} Payment records
 */
function generateOverpaymentScenario(tenant, lease) {
  const dueDate = daysAgo(5);
  const rentAmount = lease.monthly_rent;
  const overpayAmount = decimalAdd(rentAmount, '100.00');

  return [
    {
      id: paymentId('overpay'),
      idempotency_key: idempotencyKey('overpay', lease.id, dueDate),
      tenant_id: tenant.id,
      lease_id: lease.id,
      property_id: tenant.property_id,
      amount: overpayAmount,
      payment_date: daysAgo(4),
      due_date: dueDate,
      payment_method: 'ach',
      status: 'completed',
      is_partial: false,
      is_late: false,
      is_late_fee: false,
      is_nsf: false,
      credit_applied: '100.00',
      notes: 'Overpayment - $100 applied as credit',
      trace_id: traceId(),
      created_at: daysAgo(4),
      updated_at: isoTimestamp(),
      metadata: seedMetadata('SCENARIO-OVERPAY', {
        scenario: PAYMENT_SCENARIOS.OVERPAYMENT,
        rent_portion: rentAmount,
        credit_portion: '100.00',
      }),
    },
  ];
}

/**
 * Generate prorated payment scenario
 * @param {object} tenant - Tenant record
 * @param {object} lease - Lease record
 * @returns {object[]} Payment records
 */
function generateProratedScenario(tenant, lease) {
  // Mid-month move-in proration
  const moveInDay = 15;
  const daysInMonth = 30;
  const proratedDays = daysInMonth - moveInDay + 1;
  const dailyRate = parseFloat(lease.monthly_rent) / daysInMonth;
  const proratedAmount = (dailyRate * proratedDays).toFixed(2);

  return [
    {
      id: paymentId('prorated'),
      idempotency_key: idempotencyKey('prorated', lease.id, lease.start_date),
      tenant_id: tenant.id,
      lease_id: lease.id,
      property_id: tenant.property_id,
      amount: proratedAmount,
      payment_date: lease.start_date,
      due_date: lease.start_date,
      payment_method: 'check',
      status: 'completed',
      is_partial: false,
      is_late: false,
      is_late_fee: false,
      is_nsf: false,
      is_prorated: true,
      notes: `Prorated rent: ${proratedDays} days at $${dailyRate.toFixed(4)}/day`,
      trace_id: traceId(),
      created_at: lease.start_date,
      updated_at: isoTimestamp(),
      metadata: seedMetadata('SCENARIO-PRORATE', {
        scenario: PAYMENT_SCENARIOS.PRORATED,
        move_in_day: moveInDay,
        prorated_days: proratedDays,
        daily_rate: dailyRate.toFixed(4),
        full_monthly_rent: lease.monthly_rent,
      }),
    },
  ];
}

/**
 * Generate chargeback scenario
 * @param {object} tenant - Tenant record
 * @param {object} lease - Lease record
 * @returns {object[]} Payment records
 */
function generateChargebackScenario(tenant, lease) {
  const originalPaymentId = paymentId('chargeback-orig');
  const dueDate = monthsAgo(2);

  return [
    // Original payment
    {
      id: originalPaymentId,
      idempotency_key: idempotencyKey('chargeback-orig', lease.id, dueDate),
      tenant_id: tenant.id,
      lease_id: lease.id,
      property_id: tenant.property_id,
      amount: lease.monthly_rent,
      payment_date: daysAgo(45),
      due_date: dueDate,
      payment_method: 'credit_card',
      status: 'chargedback',
      is_partial: false,
      is_late: false,
      is_late_fee: false,
      is_nsf: false,
      is_chargedback: true,
      chargeback_date: daysAgo(30),
      chargeback_reason: 'Unauthorized transaction',
      trace_id: traceId(),
      created_at: daysAgo(45),
      updated_at: daysAgo(30),
      metadata: seedMetadata('SCENARIO-CHARGEBACK', {
        scenario: PAYMENT_SCENARIOS.CHARGEBACK,
        card_last_four: '4242',
      }),
    },
    // Chargeback reversal
    {
      id: paymentId('chargeback-rev'),
      idempotency_key: idempotencyKey('chargeback-rev', lease.id, dueDate),
      tenant_id: tenant.id,
      lease_id: lease.id,
      property_id: tenant.property_id,
      amount: `-${lease.monthly_rent}`,
      payment_date: daysAgo(30),
      due_date: dueDate,
      payment_method: 'internal',
      status: 'completed',
      is_partial: false,
      is_late: false,
      is_late_fee: false,
      is_nsf: false,
      is_reversal: true,
      reverses_payment_id: originalPaymentId,
      notes: 'Credit card chargeback reversal',
      trace_id: traceId(),
      created_at: daysAgo(30),
      updated_at: isoTimestamp(),
      metadata: seedMetadata('SCENARIO-CHARGEBACK', {
        scenario: PAYMENT_SCENARIOS.CHARGEBACK,
        reversal_type: 'chargeback',
      }),
    },
  ];
}

/**
 * Generate all payment scenarios
 * @param {object} seedData - All seed data
 * @returns {object} Payment scenarios and summary
 */
export function generatePaymentScenarios(seedData) {
  const { tenants = [], leases = [] } = seedData;
  const allPayments = [];

  console.log('Generating payment scenarios...');

  // Create a map of tenant to lease
  const leaseMap = new Map(leases.map(l => [l.tenant_id, l]));

  // Select subset of tenants for scenarios
  const scenarioTenants = tenants.filter(t => t.status === 'active').slice(0, 20);

  scenarioTenants.forEach((tenant, index) => {
    const lease = leaseMap.get(tenant.id);
    if (!lease) return;

    // Distribute scenarios across tenants
    switch (index % 5) {
      case 0:
        allPayments.push(...generatePartialPaymentScenario(tenant, lease));
        break;
      case 1:
        allPayments.push(...generateNSFWithReversalScenario(tenant, lease));
        break;
      case 2:
        allPayments.push(...generateOverpaymentScenario(tenant, lease));
        break;
      case 3:
        allPayments.push(...generateProratedScenario(tenant, lease));
        break;
      case 4:
        allPayments.push(...generateChargebackScenario(tenant, lease));
        break;
    }
  });

  // Count by scenario type
  const byScenario = {};
  allPayments.forEach(p => {
    const scenario = p.metadata?.seed_type || 'unknown';
    byScenario[scenario] = (byScenario[scenario] || 0) + 1;
  });

  console.log(`  ✓ Generated ${allPayments.length} scenario payments`);

  return {
    payments: allPayments,
    summary: {
      total: allPayments.length,
      byScenario,
    },
  };
}

export default {
  PAYMENT_SCENARIOS,
  generatePaymentScenarios,
};
