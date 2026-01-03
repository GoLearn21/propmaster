/**
 * Owner Distributions Generator
 * Generates monthly owner distribution records
 */

import { distributionId, distributionBatchId, uuid } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import {
  isoTimestamp,
  monthsAgo,
  daysAgo,
  getMonthEnd,
} from '../../utils/date-utils.mjs';
import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalSum,
  randomAmount,
} from '../../utils/decimal-utils.mjs';

/**
 * Distribution methods
 */
const DISTRIBUTION_METHODS = {
  ACH: 'ach',
  CHECK: 'check',
  WIRE: 'wire',
  HOLD: 'hold',
};

/**
 * Distribution statuses
 */
const DISTRIBUTION_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/**
 * Generate a single owner distribution
 * @param {object} options - Distribution options
 * @returns {object} Distribution record
 */
export function generateDistribution(options = {}) {
  const {
    owner,
    property,
    period, // { month, year }
    grossRent,
    expenses,
    managementFeeRate = 0.10,
    method = DISTRIBUTION_METHODS.ACH,
    status = DISTRIBUTION_STATUSES.COMPLETED,
    testCaseId = null,
  } = options;

  const id = distributionId();

  // Calculate amounts
  const grossRentAmount = parseFloat(grossRent) || 0;
  const expenseAmount = parseFloat(expenses) || 0;
  const managementFee = decimalMultiply(grossRent, managementFeeRate.toString(), 2);
  const netDistribution = decimalSubtract(
    decimalSubtract(grossRent, managementFee),
    expenses
  );

  // Determine dates
  const periodEnd = getMonthEnd(period.year, period.month);
  const distributionDate = daysAgo(Math.floor(Math.random() * 5)); // Usually within 5 days of month end

  return {
    id,
    owner_id: owner?.id || null,
    property_id: property?.id || null,

    // Period
    period_month: period.month,
    period_year: period.year,
    period_start: `${period.year}-${String(period.month).padStart(2, '0')}-01`,
    period_end: periodEnd,

    // Amounts
    gross_rent: grossRent,
    total_expenses: expenses,
    management_fee: managementFee,
    management_fee_rate: (managementFeeRate * 100).toFixed(2),
    net_distribution: netDistribution,

    // Holdback (if any)
    reserve_amount: '0.00',
    reserve_reason: null,

    // Distribution method
    method,
    bank_account_id: owner?.bank_account_id || null,
    check_number: method === DISTRIBUTION_METHODS.CHECK
      ? `CHK-${Math.floor(Math.random() * 90000) + 10000}`
      : null,
    wire_reference: method === DISTRIBUTION_METHODS.WIRE
      ? `WIRE-${uuid().slice(0, 8).toUpperCase()}`
      : null,

    // Status tracking
    status,
    approved_at: status !== DISTRIBUTION_STATUSES.PENDING ? daysAgo(3) : null,
    approved_by: status !== DISTRIBUTION_STATUSES.PENDING ? 'system' : null,
    processed_at: status === DISTRIBUTION_STATUSES.COMPLETED ? distributionDate : null,
    completed_at: status === DISTRIBUTION_STATUSES.COMPLETED ? distributionDate : null,

    // ACH details (if applicable)
    ach_batch_id: method === DISTRIBUTION_METHODS.ACH && status === DISTRIBUTION_STATUSES.COMPLETED
      ? `ACH-${uuid().slice(0, 8).toUpperCase()}`
      : null,
    ach_trace_number: method === DISTRIBUTION_METHODS.ACH && status === DISTRIBUTION_STATUSES.COMPLETED
      ? `${Math.floor(Math.random() * 9000000000) + 1000000000}`
      : null,

    // Statement
    statement_url: status === DISTRIBUTION_STATUSES.COMPLETED
      ? `https://statements.propmaster.local/distributions/${id}.pdf`
      : null,

    // Timestamps
    created_at: periodEnd,
    updated_at: isoTimestamp(),

    // Seed metadata
    metadata: seedMetadata(testCaseId, {
      seed_type: 'distribution',
      method,
      status,
      period: `${period.year}-${period.month}`,
    }),
  };
}

/**
 * Generate distribution line items (breakdown)
 * @param {object} distribution - Distribution record
 * @param {object[]} payments - Payments for the period
 * @param {object[]} expenses - Expenses for the period
 * @returns {object[]} Line items
 */
export function generateDistributionLineItems(distribution, payments, expenses) {
  const lineItems = [];
  let lineNumber = 1;

  // Income line items
  payments.forEach(payment => {
    if (payment.status === 'completed' && !payment.is_late_fee) {
      lineItems.push({
        id: uuid(),
        distribution_id: distribution.id,
        line_number: lineNumber++,
        category: 'income',
        type: 'rent',
        description: `Rent payment - ${payment.payment_date}`,
        amount: payment.amount,
        tenant_id: payment.tenant_id,
        unit_id: null,
      });
    }

    if (payment.is_late_fee && payment.status === 'completed') {
      lineItems.push({
        id: uuid(),
        distribution_id: distribution.id,
        line_number: lineNumber++,
        category: 'income',
        type: 'late_fee',
        description: `Late fee - ${payment.payment_date}`,
        amount: payment.amount,
        tenant_id: payment.tenant_id,
        unit_id: null,
      });
    }
  });

  // Expense line items
  expenses.forEach(expense => {
    lineItems.push({
      id: uuid(),
      distribution_id: distribution.id,
      line_number: lineNumber++,
      category: 'expense',
      type: expense.category || 'maintenance',
      description: expense.description || 'Property expense',
      amount: `-${expense.amount}`,
      vendor_id: expense.vendor_id || null,
      unit_id: expense.unit_id || null,
    });
  });

  // Management fee line item
  lineItems.push({
    id: uuid(),
    distribution_id: distribution.id,
    line_number: lineNumber++,
    category: 'fee',
    type: 'management_fee',
    description: `Management fee (${distribution.management_fee_rate}%)`,
    amount: `-${distribution.management_fee}`,
    vendor_id: null,
    unit_id: null,
  });

  return lineItems;
}

/**
 * Generate monthly distributions for an owner
 * @param {object} owner - Owner record
 * @param {object[]} properties - Owner's properties
 * @param {number} months - Months of history
 * @returns {object[]} Distribution records
 */
export function generateDistributionsForOwner(owner, properties, months = 6) {
  const distributions = [];
  const now = new Date();

  for (let i = 1; i <= months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    };

    properties.forEach(property => {
      // Generate realistic amounts
      const monthlyRent = parseFloat(property.total_monthly_rent || '5000');
      const occupancyRate = (property.occupied_units || 0) / (property.total_units || 1);
      const grossRent = (monthlyRent * occupancyRate).toFixed(2);
      const expenses = randomAmount(monthlyRent * 0.1, monthlyRent * 0.3);

      distributions.push(generateDistribution({
        owner,
        property,
        period,
        grossRent,
        expenses,
        managementFeeRate: parseFloat(owner.management_fee_rate || '0.10'),
        method: owner.distribution_method || DISTRIBUTION_METHODS.ACH,
        status: DISTRIBUTION_STATUSES.COMPLETED,
      }));
    });
  }

  return distributions;
}

/**
 * Generate all owner distributions
 * @param {object[]} owners - Owner records
 * @param {object[]} properties - Property records
 * @param {number} months - Months of history
 * @returns {object[]} All distribution records
 */
export function generateAllDistributions(owners, properties, months = 6) {
  const allDistributions = [];

  // Group properties by owner
  const propertiesByOwner = {};
  properties.forEach(property => {
    if (!property.owner_id) return;
    if (!propertiesByOwner[property.owner_id]) {
      propertiesByOwner[property.owner_id] = [];
    }
    propertiesByOwner[property.owner_id].push(property);
  });

  owners.forEach(owner => {
    const ownerProperties = propertiesByOwner[owner.id] || [];
    if (ownerProperties.length === 0) return;

    const distributions = generateDistributionsForOwner(owner, ownerProperties, months);
    allDistributions.push(...distributions);
  });

  return allDistributions;
}

/**
 * Generate pending distribution for testing
 * @param {object} owner - Owner
 * @param {object} property - Property
 * @returns {object} Pending distribution
 */
export function generatePendingDistribution(owner, property) {
  const now = new Date();
  const period = {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };

  return generateDistribution({
    owner,
    property,
    period,
    grossRent: randomAmount(3000, 8000),
    expenses: randomAmount(300, 1000),
    method: owner.distribution_method || DISTRIBUTION_METHODS.ACH,
    status: DISTRIBUTION_STATUSES.PENDING,
  });
}

/**
 * Generate distribution batch
 * @param {object[]} distributions - Distributions to batch
 * @returns {object} Batch record
 */
export function generateDistributionBatch(distributions) {
  const totalAmount = decimalSum(distributions.map(d => d.net_distribution));

  return {
    id: distributionBatchId(),
    distribution_ids: distributions.map(d => d.id),
    total_amount: totalAmount,
    distribution_count: distributions.length,
    status: 'completed',
    method: distributions[0]?.method || DISTRIBUTION_METHODS.ACH,
    processed_at: isoTimestamp(),
    ach_file_id: `NACHA-${uuid().slice(0, 8).toUpperCase()}`,
    created_at: isoTimestamp(),
    updated_at: isoTimestamp(),
  };
}

/**
 * Get distribution summary
 * @param {object[]} distributions - Distribution records
 * @returns {object} Summary statistics
 */
export function getDistributionSummary(distributions) {
  const summary = {
    total: distributions.length,
    byStatus: {},
    byMethod: {},
    totalGrossRent: '0.0000',
    totalExpenses: '0.0000',
    totalManagementFees: '0.0000',
    totalNetDistributed: '0.0000',
  };

  distributions.forEach(dist => {
    summary.byStatus[dist.status] = (summary.byStatus[dist.status] || 0) + 1;
    summary.byMethod[dist.method] = (summary.byMethod[dist.method] || 0) + 1;
    summary.totalGrossRent = decimalAdd(summary.totalGrossRent, dist.gross_rent);
    summary.totalExpenses = decimalAdd(summary.totalExpenses, dist.total_expenses);
    summary.totalManagementFees = decimalAdd(summary.totalManagementFees, dist.management_fee);
    summary.totalNetDistributed = decimalAdd(summary.totalNetDistributed, dist.net_distribution);
  });

  return summary;
}

export default {
  generateDistribution,
  generateDistributionLineItems,
  generateDistributionsForOwner,
  generateAllDistributions,
  generatePendingDistribution,
  generateDistributionBatch,
  getDistributionSummary,
  DISTRIBUTION_METHODS,
  DISTRIBUTION_STATUSES,
};
