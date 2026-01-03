/**
 * Lease Lifecycle Generator
 * Generates lease lifecycle events and transitions for testing
 */

import { isoTimestamp, monthsAgo, daysAgo, daysFromNow } from '../../utils/date-utils.mjs';
import { seedMetadata } from '../../utils/markers.mjs';

/**
 * Lease lifecycle event types
 */
export const LIFECYCLE_EVENT_TYPES = {
  CREATED: 'CREATED',
  ACTIVATED: 'ACTIVATED',
  RENEWED: 'RENEWED',
  MONTH_TO_MONTH: 'MONTH_TO_MONTH',
  NOTICE_GIVEN: 'NOTICE_GIVEN',
  TERMINATED: 'TERMINATED',
  MOVE_OUT: 'MOVE_OUT',
  DEPOSIT_RETURNED: 'DEPOSIT_RETURNED',
  BALANCE_TRANSFER: 'BALANCE_TRANSFER',
};

/**
 * Generate a lifecycle event
 * @param {object} lease - Lease record
 * @param {string} eventType - Event type
 * @param {string} eventDate - Event date
 * @param {object} data - Additional event data
 * @returns {object} Lifecycle event
 */
function createEvent(lease, eventType, eventDate, data = {}) {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    lease_id: lease.id,
    property_id: lease.property_id,
    tenant_id: lease.tenant_id,
    event_type: eventType,
    event_date: eventDate,
    previous_status: data.previousStatus || null,
    new_status: data.newStatus || null,
    notes: data.notes || null,
    created_by: data.createdBy || 'system',
    created_at: eventDate,
    updated_at: isoTimestamp(),
    metadata: seedMetadata('LIFECYCLE', {
      event_type: eventType,
      ...data.metadata,
    }),
  };
}

/**
 * Generate lifecycle events for new leases
 * @param {object[]} leases - Active leases
 * @returns {object[]} Lifecycle events
 */
function generateNewLeaseEvents(leases) {
  const events = [];

  leases.filter(l => l.status === 'active').forEach(lease => {
    // Created event
    events.push(createEvent(lease, LIFECYCLE_EVENT_TYPES.CREATED, lease.created_at, {
      newStatus: 'pending',
      notes: 'Lease application approved',
    }));

    // Activated event
    events.push(createEvent(lease, LIFECYCLE_EVENT_TYPES.ACTIVATED, lease.start_date, {
      previousStatus: 'pending',
      newStatus: 'active',
      notes: 'Lease started, tenant moved in',
    }));
  });

  return events;
}

/**
 * Generate expiring lease scenarios
 * @param {object[]} leases - All leases
 * @returns {object[]} Lifecycle events
 */
function generateExpiringLeaseEvents(leases) {
  const events = [];

  // Leases expiring within 30 days
  const expiringSoon = leases.filter(l => {
    const endDate = new Date(l.end_date);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return endDate <= thirtyDaysFromNow && l.status === 'active';
  });

  expiringSoon.forEach(lease => {
    // Some give notice
    if (Math.random() > 0.5) {
      events.push(createEvent(lease, LIFECYCLE_EVENT_TYPES.NOTICE_GIVEN, daysAgo(15), {
        notes: 'Tenant provided 30-day notice',
        metadata: { notice_days: 30 },
      }));
    }
  });

  return events;
}

/**
 * Generate renewal events
 * @param {object[]} leases - All leases
 * @returns {object} Renewal events and new leases
 */
function generateRenewalEvents(leases) {
  const events = [];
  const renewedLeases = [];

  // Select some leases for renewal
  const renewalCandidates = leases.filter(l => l.status === 'active').slice(0, 10);

  renewalCandidates.forEach((lease, index) => {
    if (index % 3 === 0) {
      // Full renewal
      events.push(createEvent(lease, LIFECYCLE_EVENT_TYPES.RENEWED, daysAgo(30), {
        previousStatus: 'active',
        newStatus: 'renewed',
        notes: 'Lease renewed for 12 months',
        metadata: { new_term_months: 12, rent_increase: '3%' },
      }));
    } else if (index % 3 === 1) {
      // Month-to-month conversion
      events.push(createEvent(lease, LIFECYCLE_EVENT_TYPES.MONTH_TO_MONTH, daysAgo(15), {
        previousStatus: 'active',
        newStatus: 'month_to_month',
        notes: 'Converted to month-to-month tenancy',
      }));
    }
  });

  return { events, renewedLeases };
}

/**
 * Generate move-out events
 * @param {object[]} leases - Terminated leases
 * @param {object[]} deposits - Security deposits
 * @returns {object[]} Move-out lifecycle events
 */
function generateMoveOutEvents(leases, deposits = []) {
  const events = [];

  const terminatedLeases = leases.filter(l => l.status === 'terminated');

  terminatedLeases.forEach(lease => {
    // Termination event
    events.push(createEvent(lease, LIFECYCLE_EVENT_TYPES.TERMINATED, monthsAgo(1), {
      previousStatus: 'active',
      newStatus: 'terminated',
      notes: 'Lease ended per agreement',
    }));

    // Move-out event
    events.push(createEvent(lease, LIFECYCLE_EVENT_TYPES.MOVE_OUT, monthsAgo(1), {
      notes: 'Move-out inspection completed',
      metadata: { inspection_result: 'satisfactory' },
    }));

    // Deposit return event (within 30 days for NC compliance)
    const deposit = deposits.find(d => d.lease_id === lease.id);
    if (deposit) {
      events.push(createEvent(lease, LIFECYCLE_EVENT_TYPES.DEPOSIT_RETURNED, daysAgo(5), {
        notes: 'Security deposit returned',
        metadata: {
          original_amount: deposit.amount,
          deductions: '0.00',
          returned_amount: deposit.amount,
        },
      }));
    }
  });

  return events;
}

/**
 * Generate complete lifecycle scenarios
 * @param {object} seedData - All seed data
 * @returns {object} Lifecycle events and summary
 */
export function generateLeaseLifecycleScenarios(seedData) {
  const { leases = [], securityDeposits = [] } = seedData;
  const allEvents = [];

  console.log('Generating lease lifecycle events...');

  // New lease events
  const newLeaseEvents = generateNewLeaseEvents(leases);
  allEvents.push(...newLeaseEvents);
  console.log(`  ✓ New lease events: ${newLeaseEvents.length}`);

  // Expiring lease events
  const expiringEvents = generateExpiringLeaseEvents(leases);
  allEvents.push(...expiringEvents);
  console.log(`  ✓ Expiring lease events: ${expiringEvents.length}`);

  // Renewal events
  const { events: renewalEvents } = generateRenewalEvents(leases);
  allEvents.push(...renewalEvents);
  console.log(`  ✓ Renewal events: ${renewalEvents.length}`);

  // Move-out events
  const moveOutEvents = generateMoveOutEvents(leases, securityDeposits);
  allEvents.push(...moveOutEvents);
  console.log(`  ✓ Move-out events: ${moveOutEvents.length}`);

  // Summary by event type
  const byType = {};
  allEvents.forEach(e => {
    byType[e.event_type] = (byType[e.event_type] || 0) + 1;
  });

  return {
    events: allEvents,
    summary: {
      total: allEvents.length,
      byType,
    },
  };
}

export default {
  LIFECYCLE_EVENT_TYPES,
  generateLeaseLifecycleScenarios,
};
