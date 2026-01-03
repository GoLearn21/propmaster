/**
 * High Volume Payments Generator
 * Generates stress test data for high-volume payment scenarios
 */

import { paymentId, journalEntryId, journalPostingId, idempotencyKey, traceId } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import {
  isoTimestamp,
  monthsAgo,
  daysAgo,
  getMonthlyDueDates,
} from '../../utils/date-utils.mjs';
import { randomAmount, decimalAdd, decimalSum, decimalMultiply } from '../../utils/decimal-utils.mjs';

/**
 * Generate high-volume payment batch
 * @param {object[]} tenants - Tenant records
 * @param {object[]} leases - Lease records
 * @param {number} monthsOfHistory - Months of payment history
 * @returns {object[]} Payment records
 */
export function generateHighVolumePayments(tenants, leases, monthsOfHistory = 12) {
  const payments = [];
  const leaseMap = new Map(leases.map(l => [l.tenant_id, l]));

  console.log(`Generating ${monthsOfHistory} months of payments for ${tenants.length} tenants...`);

  tenants.forEach((tenant, tIndex) => {
    const lease = leaseMap.get(tenant.id);
    if (!lease) return;

    // Generate monthly due dates
    const startDate = monthsAgo(monthsOfHistory);
    const dueDates = getMonthlyDueDates(startDate, monthsOfHistory, 1);

    dueDates.forEach((dueDate, mIndex) => {
      // Skip future dates
      if (new Date(dueDate) > new Date()) return;

      // Determine payment timing based on behavior
      let paymentDate = dueDate;
      let status = 'completed';

      if (tenant.payment_behavior === 'LATE_PAYER') {
        const lateDays = 6 + Math.floor(Math.random() * 10);
        const d = new Date(dueDate);
        d.setDate(d.getDate() + lateDays);
        paymentDate = d.toISOString().split('T')[0];
      }

      payments.push({
        id: paymentId('stress'),
        idempotency_key: idempotencyKey('payment', lease.id, dueDate),
        tenant_id: tenant.id,
        lease_id: lease.id,
        property_id: tenant.property_id,
        amount: lease.monthly_rent,
        payment_date: paymentDate,
        due_date: dueDate,
        payment_method: tIndex % 3 === 0 ? 'ach' : tIndex % 3 === 1 ? 'credit_card' : 'check',
        status,
        is_late: new Date(paymentDate) > new Date(new Date(dueDate).getTime() + 5 * 24 * 60 * 60 * 1000),
        is_late_fee: false,
        is_nsf: false,
        processing_fee: '0.00',
        trace_id: traceId(),
        created_at: paymentDate,
        updated_at: isoTimestamp(),
        metadata: seedMetadata('STRESS-002', {
          seed_type: 'stress_payment',
          month_index: mIndex,
        }),
      });

      // Add late fee if applicable
      if (tenant.payment_behavior === 'LATE_PAYER' && mIndex % 2 === 0) {
        payments.push({
          id: paymentId('fee'),
          idempotency_key: idempotencyKey('latefee', lease.id, dueDate),
          tenant_id: tenant.id,
          lease_id: lease.id,
          property_id: tenant.property_id,
          amount: '15.00',
          payment_date: paymentDate,
          due_date: dueDate,
          payment_method: 'internal',
          status: 'completed',
          is_late: false,
          is_late_fee: true,
          is_nsf: false,
          processing_fee: '0.00',
          trace_id: traceId(),
          created_at: paymentDate,
          updated_at: isoTimestamp(),
          metadata: seedMetadata('STRESS-002', {
            seed_type: 'stress_late_fee',
          }),
        });
      }
    });

    // Progress indicator
    if ((tIndex + 1) % 100 === 0) {
      console.log(`  Processed ${tIndex + 1}/${tenants.length} tenants...`);
    }
  });

  console.log(`  Generated ${payments.length} payments`);
  return payments;
}

/**
 * Generate journal entries for payments
 * @param {object[]} payments - Payment records
 * @returns {object} Journal entries and postings
 */
export function generateJournalEntriesForPayments(payments) {
  const entries = [];
  const postings = [];

  console.log(`Generating journal entries for ${payments.length} payments...`);

  payments.forEach((payment, index) => {
    const entryId = journalEntryId();

    // Create journal entry
    entries.push({
      id: entryId,
      property_id: payment.property_id,
      tenant_id: payment.tenant_id,
      entry_type: payment.is_late_fee ? 'LATE_FEE_PAYMENT' : 'RENT_PAYMENT',
      entry_date: payment.payment_date,
      description: payment.is_late_fee ? 'Late fee payment' : 'Rent payment',
      trace_id: payment.trace_id,
      idempotency_key: `je_${payment.idempotency_key}`,
      created_by: 'system',
      status: 'posted',
      is_voided: false,
      created_at: payment.created_at,
      updated_at: isoTimestamp(),
      metadata: seedMetadata('STRESS-002', {
        seed_type: 'stress_journal_entry',
      }),
    });

    // Debit cash
    postings.push({
      id: journalPostingId(),
      journal_entry_id: entryId,
      account_code: '1010',
      debit_amount: payment.amount,
      credit_amount: '0.0000',
      memo: 'Cash received',
      created_at: payment.created_at,
      updated_at: isoTimestamp(),
    });

    // Credit receivable
    postings.push({
      id: journalPostingId(),
      journal_entry_id: entryId,
      account_code: payment.is_late_fee ? '1115' : '1110',
      debit_amount: '0.0000',
      credit_amount: payment.amount,
      memo: payment.is_late_fee ? 'Late fee receivable cleared' : 'Tenant receivable cleared',
      created_at: payment.created_at,
      updated_at: isoTimestamp(),
    });

    // Progress
    if ((index + 1) % 1000 === 0) {
      console.log(`  Generated entries for ${index + 1}/${payments.length} payments...`);
    }
  });

  console.log(`  Generated ${entries.length} entries with ${postings.length} postings`);

  return { entries, postings };
}

/**
 * Generate payment statistics
 * @param {object[]} payments - Payment records
 * @returns {object} Statistics
 */
export function getPaymentStatistics(payments) {
  const stats = {
    total_count: payments.length,
    total_amount: '0.0000',
    by_status: {},
    by_method: {},
    late_count: 0,
    late_fee_count: 0,
    nsf_count: 0,
    by_month: {},
  };

  payments.forEach(payment => {
    // Total
    stats.total_amount = decimalAdd(stats.total_amount, payment.amount);

    // By status
    stats.by_status[payment.status] = (stats.by_status[payment.status] || 0) + 1;

    // By method
    stats.by_method[payment.payment_method] = (stats.by_method[payment.payment_method] || 0) + 1;

    // Counts
    if (payment.is_late) stats.late_count++;
    if (payment.is_late_fee) stats.late_fee_count++;
    if (payment.is_nsf) stats.nsf_count++;

    // By month
    const month = payment.payment_date.slice(0, 7);
    if (!stats.by_month[month]) {
      stats.by_month[month] = { count: 0, amount: '0.0000' };
    }
    stats.by_month[month].count++;
    stats.by_month[month].amount = decimalAdd(stats.by_month[month].amount, payment.amount);
  });

  return stats;
}

/**
 * Generate complete high-volume dataset
 * @param {object} portfolioData - Large portfolio data
 * @param {number} monthsOfHistory - Months of history
 * @returns {object} Complete dataset
 */
export function generateHighVolumeDataset(portfolioData, monthsOfHistory = 12) {
  const { tenants, leases } = portfolioData;

  // Generate payments
  const payments = generateHighVolumePayments(tenants, leases, monthsOfHistory);

  // Generate journal entries
  const { entries, postings } = generateJournalEntriesForPayments(payments);

  // Get statistics
  const stats = getPaymentStatistics(payments);

  return {
    payments,
    journalEntries: entries,
    journalPostings: postings,
    statistics: stats,
    summary: {
      paymentCount: payments.length,
      entryCount: entries.length,
      postingCount: postings.length,
      totalAmount: stats.total_amount,
      monthsCovered: monthsOfHistory,
    },
  };
}

export default {
  generateHighVolumePayments,
  generateJournalEntriesForPayments,
  getPaymentStatistics,
  generateHighVolumeDataset,
};
