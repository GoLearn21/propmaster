/**
 * Lease Generator
 * Generates lease records with all states and types
 */

import { leaseId, leaseNumber, securityDepositId, uuid } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import {
  isoTimestamp,
  monthsAgo,
  monthsFromNow,
  daysAgo,
  daysFromNow,
  getLeaseTerm,
  randomDateInRange,
} from '../../utils/date-utils.mjs';
import { randomAmount, decimalMultiply } from '../../utils/decimal-utils.mjs';
import { STATE_COMPLIANCE } from '../../config/seed-config.mjs';

// Lease term options
const LEASE_TERMS = [
  { months: 6, weight: 0.1 },
  { months: 12, weight: 0.7 },
  { months: 18, weight: 0.1 },
  { months: 24, weight: 0.1 },
];

// Lease status options
const LEASE_STATUSES = [
  { status: 'active', weight: 0.8 },
  { status: 'expired', weight: 0.1 },
  { status: 'terminated', weight: 0.05 },
  { status: 'draft', weight: 0.05 },
];

/**
 * Select weighted random item
 * @param {object[]} items - Items with weight property
 * @returns {object} Selected item
 */
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }

  return items[0];
}

/**
 * Calculate security deposit based on state rules
 * @param {number} monthlyRent - Monthly rent amount
 * @param {string} state - State code
 * @returns {string} Security deposit amount
 */
function calculateSecurityDeposit(monthlyRent, state) {
  const rules = STATE_COMPLIANCE[state];
  const maxMonths = rules?.securityDeposit?.maxMonthsRent || 2;

  // Random between 1 and max months
  const months = 1 + Math.random() * (maxMonths - 1);
  return decimalMultiply(monthlyRent.toString(), months, 2);
}

/**
 * Generate a single lease
 * @param {object} options - Generation options
 * @returns {object} Lease record
 */
export function generateLease(options = {}) {
  const {
    tenant,
    unit,
    property,
    status = null,
    termMonths = null,
    testCaseId = null,
    index = 0,
  } = options;

  const id = leaseId();
  const propCode = property?.name?.slice(0, 3).toUpperCase() || 'XXX';

  // Determine lease term
  const term = termMonths || weightedRandom(LEASE_TERMS).months;

  // Determine lease status
  const leaseStatus = status || weightedRandom(LEASE_STATUSES).status;

  // Calculate dates based on status
  let startDate, endDate;

  switch (leaseStatus) {
    case 'active':
      // Started 1-11 months ago
      const monthsActive = Math.floor(Math.random() * 11) + 1;
      startDate = monthsAgo(monthsActive);
      endDate = monthsFromNow(term - monthsActive);
      break;
    case 'expired':
      // Ended 1-6 months ago
      const monthsExpired = Math.floor(Math.random() * 6) + 1;
      endDate = monthsAgo(monthsExpired);
      startDate = monthsAgo(monthsExpired + term);
      break;
    case 'terminated':
      // Terminated early
      startDate = monthsAgo(Math.floor(Math.random() * 6) + 3);
      endDate = daysAgo(Math.floor(Math.random() * 60) + 1);
      break;
    case 'draft':
      // Future lease
      startDate = daysFromNow(Math.floor(Math.random() * 30) + 1);
      endDate = monthsFromNow(term + 1);
      break;
    default:
      startDate = monthsAgo(6);
      endDate = monthsFromNow(6);
  }

  // Rent amount (from unit or generate)
  const monthlyRent = unit?.rent_amount || randomAmount(1000, 3000);

  // Security deposit (state-compliant)
  const securityDeposit = calculateSecurityDeposit(
    parseFloat(monthlyRent),
    property?.state || 'NC'
  );

  // Lease type
  const leaseType = term <= 1 ? 'month_to_month' : 'fixed_term';

  return {
    id,
    lease_number: leaseNumber(propCode, index + 1),

    // Relationships
    property_id: property?.id || null,
    unit_id: unit?.id || null,
    tenant_id: tenant?.id || null,

    // Dates
    start_date: startDate,
    end_date: endDate,

    // Financial
    monthly_rent: monthlyRent,
    security_deposit: securityDeposit,
    pet_deposit: Math.random() > 0.7 ? randomAmount(200, 500) : '0.00',
    application_fee: Math.random() > 0.5 ? randomAmount(25, 75) : '0.00',

    // Terms
    lease_type: leaseType,
    term_months: term,

    // Status
    status: leaseStatus,
    is_active: leaseStatus === 'active',

    // Late fee configuration
    late_fee_type: 'percentage_or_flat',
    late_fee_percentage: 5,
    late_fee_flat: 15,
    grace_period_days: 5,

    // Document tracking
    signed_date: leaseStatus !== 'draft' ? randomDateInRange(monthsAgo(12), daysAgo(1)) : null,
    document_url: leaseStatus !== 'draft' ? `https://docs.propmaster.local/leases/${id}.pdf` : null,

    // Renewal
    renewal_offered: leaseStatus === 'active' && Math.random() > 0.7,
    renewal_status: null,

    // Notes
    notes: null,

    // Timestamps
    created_at: randomDateInRange(monthsAgo(18), monthsAgo(1)),
    updated_at: isoTimestamp(),

    // Seed metadata
    metadata: seedMetadata(testCaseId, {
      seed_type: 'lease',
      lease_status: leaseStatus,
      term_months: term,
      state: property?.state,
    }),
  };
}

/**
 * Generate leases for all occupied units
 * @param {object[]} tenants - Tenant records
 * @param {object[]} units - Unit records
 * @param {object[]} properties - Property records
 * @returns {object[]} Array of lease records
 */
export function generateLeasesForTenants(tenants, units, properties) {
  const leases = [];
  const propertyMap = new Map(properties.map(p => [p.id, p]));
  const unitMap = new Map(units.map(u => [u.id, u]));

  tenants.forEach((tenant, index) => {
    if (!tenant.unit_id) return;

    const unit = unitMap.get(tenant.unit_id);
    const property = propertyMap.get(tenant.property_id);

    if (!unit || !property) return;

    leases.push(generateLease({
      tenant,
      unit,
      property,
      status: 'active', // Tenants have active leases
      index,
    }));
  });

  return leases;
}

/**
 * Generate security deposit records for leases
 * @param {object[]} leases - Lease records
 * @param {object[]} properties - Property records
 * @returns {object[]} Array of security deposit records
 */
export function generateSecurityDeposits(leases, properties) {
  const deposits = [];
  const propertyMap = new Map(properties.map(p => [p.id, p]));

  leases.forEach(lease => {
    if (parseFloat(lease.security_deposit) <= 0) return;
    if (lease.status === 'draft') return;

    const property = propertyMap.get(lease.property_id);
    const state = property?.state || 'NC';
    const rules = STATE_COMPLIANCE[state];

    // Determine deposit status based on lease status
    let depositStatus = 'held';
    let refundAmount = null;
    let refundDate = null;
    let deductionsAmount = null;

    if (lease.status === 'expired' || lease.status === 'terminated') {
      // 70% refunded, 20% partial deduction, 10% forfeited
      const random = Math.random();
      if (random < 0.7) {
        depositStatus = 'refunded';
        refundAmount = lease.security_deposit;
        refundDate = daysAgo(Math.floor(Math.random() * 30) + 1);
      } else if (random < 0.9) {
        depositStatus = 'applied_to_damages';
        deductionsAmount = randomAmount(100, parseFloat(lease.security_deposit));
        refundAmount = (parseFloat(lease.security_deposit) - parseFloat(deductionsAmount)).toFixed(2);
        refundDate = daysAgo(Math.floor(Math.random() * 30) + 1);
      } else {
        depositStatus = 'forfeited';
        deductionsAmount = lease.security_deposit;
      }
    }

    deposits.push({
      id: securityDepositId(),
      lease_id: lease.id,
      tenant_id: lease.tenant_id,
      property_id: lease.property_id,
      unit_id: lease.unit_id,

      // Amount
      amount: lease.security_deposit,

      // Dates
      date_received: lease.signed_date || lease.start_date,
      date_returned: refundDate,

      // Interest (if required by state)
      interest_rate: rules?.securityDeposit?.interestRequired ? '0.0100' : null,
      interest_accrued: rules?.securityDeposit?.interestRequired
        ? randomAmount(0, 10)
        : '0.00',

      // Status
      status: depositStatus,

      // Refund/deductions
      refund_amount: refundAmount,
      refund_date: refundDate,
      refund_check_number: refundDate ? `CHK-${Math.floor(Math.random() * 90000) + 10000}` : null,
      deductions_amount: deductionsAmount,
      deductions_description: deductionsAmount ? 'Cleaning and damage repair' : null,

      // Timestamps
      created_at: lease.signed_date || lease.start_date,
      updated_at: isoTimestamp(),

      // Seed metadata
      metadata: seedMetadata(null, {
        seed_type: 'security_deposit',
        state,
        deposit_status: depositStatus,
      }),
    });
  });

  return deposits;
}

/**
 * Generate expiring leases for renewal testing
 * @param {number} count - Number of expiring leases
 * @param {object[]} properties - Properties to use
 * @param {number[]} daysToExpire - Days until expiration
 * @returns {object[]} Array of expiring lease scenarios
 */
export function generateExpiringLeases(count, properties, daysToExpire = [30, 60, 90]) {
  const expiringLeases = [];

  for (let i = 0; i < count; i++) {
    const property = properties[i % properties.length];
    const days = daysToExpire[i % daysToExpire.length];

    expiringLeases.push({
      property,
      daysUntilExpiration: days,
      lease: generateLease({
        property,
        status: 'active',
        index: 1000 + i,
      }),
    });

    // Override end date to be expiring soon
    expiringLeases[expiringLeases.length - 1].lease.end_date = daysFromNow(days);
  }

  return expiringLeases;
}

/**
 * Get lease distribution by status
 * @param {object[]} leases - Lease records
 * @returns {object} Distribution by status
 */
export function getLeaseDistribution(leases) {
  const distribution = {
    active: 0,
    expired: 0,
    terminated: 0,
    draft: 0,
    total: 0,
  };

  leases.forEach(lease => {
    if (distribution[lease.status] !== undefined) {
      distribution[lease.status]++;
    }
    distribution.total++;
  });

  return distribution;
}

export default {
  generateLease,
  generateLeasesForTenants,
  generateSecurityDeposits,
  generateExpiringLeases,
  getLeaseDistribution,
};
