/**
 * Payment History Generator
 * Generates payment records with various scenarios
 */

import { paymentId, idempotencyKey, uuid } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import {
  isoTimestamp,
  daysAgo,
  monthsAgo,
  getMonthlyDueDates,
  randomDateInRange,
} from '../../utils/date-utils.mjs';
import {
  randomAmount,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  calculateLateFee,
} from '../../utils/decimal-utils.mjs';
import { PAYMENT_SCENARIOS, PAYMENT_METHODS, STATE_COMPLIANCE } from '../../config/seed-config.mjs';

/**
 * Determine payment behavior based on tenant
 * @param {object} tenant - Tenant record
 * @returns {object} Payment behavior configuration
 */
function getPaymentBehavior(tenant) {
  const behavior = tenant.payment_behavior || 'PERFECT_PAYER';
  return PAYMENT_SCENARIOS[behavior] || PAYMENT_SCENARIOS.PERFECT_PAYER;
}

/**
 * Generate payment date based on behavior
 * @param {string} dueDate - Due date
 * @param {string} behavior - Payment behavior type
 * @returns {string} Payment date
 */
function generatePaymentDate(dueDate, behavior) {
  const due = new Date(dueDate);
  const config = PAYMENT_SCENARIOS[behavior];

  switch (behavior) {
    case 'PERFECT_PAYER':
      // Pay on or before due date
      return dueDate;

    case 'EARLY_PAYER':
      // Pay 3-7 days early
      const earlyDays = 3 + Math.floor(Math.random() * 5);
      due.setDate(due.getDate() - earlyDays);
      return due.toISOString().split('T')[0];

    case 'GRACE_PERIOD':
      // Pay 1-5 days after due (within grace)
      const graceDays = 1 + Math.floor(Math.random() * 5);
      due.setDate(due.getDate() + graceDays);
      return due.toISOString().split('T')[0];

    case 'LATE_PAYER':
      // Pay 6-15 days after due
      const lateDays = 6 + Math.floor(Math.random() * 10);
      due.setDate(due.getDate() + lateDays);
      return due.toISOString().split('T')[0];

    case 'PARTIAL_PAYER':
      // Pay on due date but partial amount
      return dueDate;

    case 'DELINQUENT':
      // May not pay at all, or pay very late
      if (Math.random() > 0.5) {
        const veryLateDays = 30 + Math.floor(Math.random() * 30);
        due.setDate(due.getDate() + veryLateDays);
        return due.toISOString().split('T')[0];
      }
      return null; // No payment

    case 'NSF':
      // Initial payment that will bounce
      return dueDate;

    default:
      return dueDate;
  }
}

/**
 * Generate payment amount based on behavior
 * @param {string} rentAmount - Full rent amount
 * @param {string} behavior - Payment behavior type
 * @returns {string} Payment amount
 */
function generatePaymentAmount(rentAmount, behavior) {
  const rent = parseFloat(rentAmount);

  switch (behavior) {
    case 'PARTIAL_PAYER':
      // Pay 50-90% of rent
      const partialPercent = 0.5 + Math.random() * 0.4;
      return (rent * partialPercent).toFixed(2);

    default:
      return rentAmount;
  }
}

/**
 * Generate a single payment
 * @param {object} options - Generation options
 * @returns {object} Payment record
 */
export function generatePayment(options = {}) {
  const {
    tenant,
    lease,
    property,
    dueDate,
    paymentDate = null,
    amount = null,
    status = 'completed',
    method = null,
    testCaseId = null,
    isNSF = false,
    isLateFee = false,
  } = options;

  const id = paymentId(isLateFee ? 'fee' : 'rent');
  const behavior = tenant?.payment_behavior || 'PERFECT_PAYER';

  // Calculate payment date if not provided
  const actualPaymentDate = paymentDate || generatePaymentDate(dueDate, behavior);
  if (!actualPaymentDate) return null; // Delinquent - no payment

  // Calculate amount if not provided
  const actualAmount = amount || generatePaymentAmount(
    lease?.monthly_rent || tenant?.rent_amount || '1500.00',
    behavior
  );

  // Select payment method
  const paymentMethod = method || PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];

  // Determine if late
  const due = new Date(dueDate);
  const paid = new Date(actualPaymentDate);
  const gracePeriod = property?.state_compliance?.lateFee?.gracePeriodDays || 5;
  const daysLate = Math.floor((paid - due) / (1000 * 60 * 60 * 24));
  const isLate = daysLate > gracePeriod;

  return {
    id,
    idempotency_key: idempotencyKey('payment', lease?.id || 'unknown', dueDate),

    // Relationships
    tenant_id: tenant?.id || null,
    lease_id: lease?.id || null,
    property_id: property?.id || lease?.property_id || null,

    // Payment details
    amount: actualAmount,
    payment_date: actualPaymentDate,
    due_date: dueDate,
    payment_method: paymentMethod,

    // Status
    status: isNSF ? 'failed' : status,
    is_late: isLate,
    days_late: isLate ? daysLate : 0,

    // Processing
    processing_fee: paymentMethod === 'credit_card' ? (parseFloat(actualAmount) * 0.029).toFixed(2) : '0.00',

    // Stripe integration (mock)
    stripe_payment_intent_id: status === 'completed' ? `pi_${uuid().slice(0, 24)}` : null,
    stripe_charge_id: status === 'completed' ? `ch_${uuid().slice(0, 24)}` : null,

    // Receipt
    receipt_url: status === 'completed'
      ? `https://receipts.propmaster.local/${id}.pdf`
      : null,

    // NSF handling
    is_nsf: isNSF,
    nsf_date: isNSF ? actualPaymentDate : null,
    nsf_fee_amount: isNSF ? '35.00' : null,

    // Late fee tracking
    is_late_fee: isLateFee,
    late_fee_amount: isLate && !isLateFee ? calculateLateFee(actualAmount, 5, '15.00') : '0.00',

    // Refund
    refund_amount: null,
    refund_reason: null,
    refund_date: null,

    // Timestamps
    created_at: actualPaymentDate,
    updated_at: isoTimestamp(),

    // Seed metadata
    metadata: seedMetadata(testCaseId, {
      seed_type: 'payment',
      behavior,
      is_late: isLate,
      is_nsf: isNSF,
      is_late_fee: isLateFee,
    }),
  };
}

/**
 * Generate NSF reversal payment
 * @param {object} originalPayment - Original payment that bounced
 * @returns {object} Reversal payment record
 */
export function generateNSFReversal(originalPayment) {
  return generatePayment({
    tenant: { id: originalPayment.tenant_id },
    lease: { id: originalPayment.lease_id },
    property: { id: originalPayment.property_id },
    dueDate: originalPayment.due_date,
    paymentDate: originalPayment.payment_date,
    amount: `-${originalPayment.amount}`, // Negative for reversal
    status: 'completed',
    method: originalPayment.payment_method,
    testCaseId: 'TC-REC-009', // NSF reversal test case
  });
}

/**
 * Generate payment history for a lease
 * @param {object} lease - Lease record
 * @param {object} tenant - Tenant record
 * @param {object} property - Property record
 * @param {number} months - Months of history to generate
 * @returns {object[]} Array of payment records
 */
export function generatePaymentHistoryForLease(lease, tenant, property, months = 6) {
  const payments = [];
  const behavior = tenant?.payment_behavior || 'PERFECT_PAYER';

  // Get monthly due dates
  const startDate = lease.start_date || monthsAgo(months);
  const dueDates = getMonthlyDueDates(startDate, months, 1);

  dueDates.forEach((dueDate, index) => {
    // Skip future dates
    if (new Date(dueDate) > new Date()) return;

    // Generate rent payment
    const payment = generatePayment({
      tenant,
      lease,
      property,
      dueDate,
      isNSF: behavior === 'NSF' && Math.random() < 0.5,
    });

    if (payment) {
      payments.push(payment);

      // Generate NSF reversal and retry if applicable
      if (payment.is_nsf) {
        // Reversal
        payments.push({
          ...generateNSFReversal(payment),
          id: paymentId('rev'),
        });

        // NSF fee
        payments.push(generatePayment({
          tenant,
          lease,
          property,
          dueDate,
          amount: '35.00',
          isLateFee: true,
        }));

        // Retry payment (usually successful)
        const retryDate = new Date(payment.payment_date);
        retryDate.setDate(retryDate.getDate() + 3);

        payments.push(generatePayment({
          tenant,
          lease,
          property,
          dueDate,
          paymentDate: retryDate.toISOString().split('T')[0],
          status: 'completed',
        }));
      }

      // Generate late fee if applicable
      if (payment.is_late && payment.status === 'completed') {
        payments.push(generatePayment({
          tenant,
          lease,
          property,
          dueDate,
          paymentDate: payment.payment_date,
          amount: payment.late_fee_amount,
          isLateFee: true,
        }));
      }
    }
  });

  return payments;
}

/**
 * Generate all payment history for tenants
 * @param {object[]} tenants - Tenant records
 * @param {object[]} leases - Lease records
 * @param {object[]} properties - Property records
 * @param {number} months - Months of history
 * @returns {object[]} Array of all payment records
 */
export function generateAllPaymentHistory(tenants, leases, properties, months = 6) {
  const allPayments = [];
  const leaseMap = new Map(leases.map(l => [l.tenant_id, l]));
  const propertyMap = new Map(properties.map(p => [p.id, p]));

  tenants.forEach(tenant => {
    const lease = leaseMap.get(tenant.id);
    if (!lease) return;

    const property = propertyMap.get(lease.property_id);
    const payments = generatePaymentHistoryForLease(lease, tenant, property, months);
    allPayments.push(...payments);
  });

  return allPayments;
}

/**
 * Get payment distribution by status
 * @param {object[]} payments - Payment records
 * @returns {object} Distribution statistics
 */
export function getPaymentDistribution(payments) {
  const distribution = {
    completed: 0,
    pending: 0,
    failed: 0,
    refunded: 0,
    late: 0,
    nsf: 0,
    lateFees: 0,
    total: 0,
    totalAmount: 0,
  };

  payments.forEach(payment => {
    distribution[payment.status] = (distribution[payment.status] || 0) + 1;
    if (payment.is_late) distribution.late++;
    if (payment.is_nsf) distribution.nsf++;
    if (payment.is_late_fee) distribution.lateFees++;
    distribution.total++;
    distribution.totalAmount += parseFloat(payment.amount) || 0;
  });

  distribution.totalAmount = distribution.totalAmount.toFixed(2);

  return distribution;
}

export default {
  generatePayment,
  generateNSFReversal,
  generatePaymentHistoryForLease,
  generateAllPaymentHistory,
  getPaymentDistribution,
};
