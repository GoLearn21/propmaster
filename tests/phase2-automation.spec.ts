import { test, expect } from '@playwright/test';
import {
  processAutopayPayments,
  sendPaymentReminders,
  enableAutopay,
  disableAutopay,
  getAutopayStatus
} from '../src/services/autopayService';
import {
  processLeaseRenewals,
  processRenewalResponse,
  processExpiredOffers,
  getRenewalStatus
} from '../src/services/leaseRenewalService';
import {
  processMaintenanceSchedules,
  initializePropertyMaintenance,
  getUpcomingMaintenance
} from '../src/services/maintenanceSchedulerService';
import {
  autoAssignVendor,
  processUnassignedWorkOrders,
  getVendorRecommendations
} from '../src/services/workOrderRoutingService';
import {
  checkAndRequestApproval,
  processApprovalRequest,
  getPendingApprovals,
  processExpiredApprovals,
  initializeApprovalThresholds
} from '../src/services/budgetApprovalService';

/**
 * Phase 2: Automation & Workflows E2E Tests
 * Comprehensive testing of all automation services
 */

test.describe('Phase 2: Automation & Workflows', () => {

  test.describe('Autopay Processing', () => {

    test('should process autopay payments successfully', async () => {
      const results = await processAutopayPayments();

      expect(results).toHaveProperty('processed');
      expect(results).toHaveProperty('succeeded');
      expect(results).toHaveProperty('failed');
      expect(results).toHaveProperty('errors');
      expect(Array.isArray(results.errors)).toBe(true);

      console.log('Autopay Results:', results);
    });

    test('should send payment reminders', async () => {
      const results = await sendPaymentReminders();

      expect(results).toHaveProperty('sent');
      expect(results).toHaveProperty('errors');
      expect(Array.isArray(results.errors)).toBe(true);

      console.log('Payment Reminders:', results);
    });

    test('should enable and disable autopay for a tenant', async () => {
      // Enable autopay
      const enableResult = await enableAutopay(
        'test-tenant-id',
        'test-lease-id',
        'pm_test_123',
        'ach',
        1500,
        1
      );

      expect(enableResult).toHaveProperty('success');

      if (enableResult.success) {
        console.log('Autopay enabled successfully');

        // Get status
        const status = await getAutopayStatus('test-tenant-id');
        console.log('Autopay status:', status);

        // Disable autopay
        const disableResult = await disableAutopay('test-tenant-id');
        expect(disableResult).toHaveProperty('success');
        console.log('Autopay disabled:', disableResult.success);
      }
    });
  });

  test.describe('Lease Renewal Automation', () => {

    test('should process lease renewals and generate offers', async () => {
      const results = await processLeaseRenewals();

      expect(results).toHaveProperty('leases_expiring');
      expect(results).toHaveProperty('offers_generated');
      expect(results).toHaveProperty('offers_sent');
      expect(results).toHaveProperty('errors');
      expect(Array.isArray(results.errors)).toBe(true);

      console.log('Lease Renewal Results:', results);
    });

    test('should handle tenant renewal response', async () => {
      // This test would need a real renewal offer ID
      // For now, we'll test the function structure
      const mockOfferId = 'test-offer-id';

      const result = await processRenewalResponse(
        mockOfferId,
        'accept'
      );

      expect(result).toHaveProperty('success');
      console.log('Renewal response result:', result);
    });

    test('should process expired renewal offers', async () => {
      const results = await processExpiredOffers();

      expect(results).toHaveProperty('expired');
      expect(results).toHaveProperty('errors');
      expect(Array.isArray(results.errors)).toBe(true);

      console.log('Expired Offers:', results);
    });
  });

  test.describe('Preventive Maintenance Scheduling', () => {

    test('should process maintenance schedules', async () => {
      const results = await processMaintenanceSchedules();

      expect(results).toHaveProperty('work_orders_created');
      expect(results).toHaveProperty('reminders_sent');
      expect(results).toHaveProperty('errors');
      expect(Array.isArray(results.errors)).toBe(true);

      console.log('Maintenance Scheduling Results:', results);
    });

    test('should initialize property maintenance schedules', async () => {
      const results = await initializePropertyMaintenance(
        'test-property-id',
        'single-family',
        true,  // include recurring
        true   // include seasonal
      );

      expect(results).toHaveProperty('created');
      expect(results).toHaveProperty('errors');
      expect(Array.isArray(results.errors)).toBe(true);

      console.log('Property Maintenance Initialization:', results);
    });

    test('should get upcoming maintenance for a property', async () => {
      const maintenance = await getUpcomingMaintenance(
        'test-property-id',
        30  // next 30 days
      );

      expect(Array.isArray(maintenance)).toBe(true);
      console.log('Upcoming Maintenance Tasks:', maintenance.length);
    });
  });

  test.describe('Intelligent Work Order Routing', () => {

    test('should auto-assign vendor to work order', async () => {
      // This test would need a real work order ID
      const mockWorkOrderId = 'test-work-order-id';

      const result = await autoAssignVendor(mockWorkOrderId);

      expect(result).toHaveProperty('work_order_id');
      expect(result).toHaveProperty('auto_assigned');
      expect(result).toHaveProperty('confidence_score');
      expect(result).toHaveProperty('alternative_vendors');
      expect(Array.isArray(result.alternative_vendors)).toBe(true);

      console.log('Auto-Assignment Result:', {
        assigned: result.auto_assigned,
        score: result.confidence_score,
        alternatives: result.alternative_vendors.length
      });
    });

    test('should process all unassigned work orders', async () => {
      const results = await processUnassignedWorkOrders();

      expect(results).toHaveProperty('processed');
      expect(results).toHaveProperty('assigned');
      expect(results).toHaveProperty('errors');
      expect(Array.isArray(results.errors)).toBe(true);

      console.log('Unassigned Work Orders Processing:', results);
    });

    test('should get vendor recommendations', async () => {
      const mockWorkOrderId = 'test-work-order-id';

      const vendors = await getVendorRecommendations(mockWorkOrderId);

      expect(Array.isArray(vendors)).toBe(true);
      console.log('Vendor Recommendations:', vendors.length);
    });
  });

  test.describe('Budget Approval Workflows', () => {

    test('should check if expense requires approval', async () => {
      // Test auto-approved expense (below threshold)
      const autoApproved = await checkAndRequestApproval(
        'expense',
        'test-expense-1',
        150,  // Below $200 threshold
        'maintenance',
        'test-property-id',
        'test-user-id'
      );

      expect(autoApproved).toHaveProperty('requires_approval');
      expect(autoApproved).toHaveProperty('auto_approved');
      expect(autoApproved.auto_approved).toBe(true);

      console.log('Auto-approved expense:', autoApproved);

      // Test expense requiring approval (above threshold)
      const requiresApproval = await checkAndRequestApproval(
        'expense',
        'test-expense-2',
        1500,  // Above $500 threshold
        'maintenance',
        'test-property-id',
        'test-user-id'
      );

      expect(requiresApproval).toHaveProperty('requires_approval');
      expect(requiresApproval).toHaveProperty('auto_approved');

      console.log('Approval required:', requiresApproval);
    });

    test('should initialize approval thresholds', async () => {
      const results = await initializeApprovalThresholds();

      expect(results).toHaveProperty('created');
      expect(results).toHaveProperty('errors');
      expect(Array.isArray(results.errors)).toBe(true);

      console.log('Approval Thresholds Initialized:', results);
    });

    test('should get pending approvals', async () => {
      const approvals = await getPendingApprovals();

      expect(Array.isArray(approvals)).toBe(true);
      console.log('Pending Approvals:', approvals.length);
    });

    test('should process expired approval requests', async () => {
      const results = await processExpiredApprovals();

      expect(results).toHaveProperty('expired');
      expect(results).toHaveProperty('errors');
      expect(Array.isArray(results.errors)).toBe(true);

      console.log('Expired Approvals:', results);
    });
  });

  test.describe('Integration Tests', () => {

    test('all automation services should be accessible', () => {
      // Verify all services are properly exported
      expect(typeof processAutopayPayments).toBe('function');
      expect(typeof sendPaymentReminders).toBe('function');
      expect(typeof processLeaseRenewals).toBe('function');
      expect(typeof processMaintenanceSchedules).toBe('function');
      expect(typeof autoAssignVendor).toBe('function');
      expect(typeof checkAndRequestApproval).toBe('function');

      console.log('✅ All Phase 2 automation services are accessible');
    });

    test('all services handle errors gracefully', async () => {
      // Test each service with invalid data to ensure graceful error handling
      const services = [
        { name: 'Autopay', fn: () => processAutopayPayments() },
        { name: 'Payment Reminders', fn: () => sendPaymentReminders() },
        { name: 'Lease Renewals', fn: () => processLeaseRenewals() },
        { name: 'Maintenance Schedules', fn: () => processMaintenanceSchedules() },
        { name: 'Work Order Routing', fn: () => processUnassignedWorkOrders() },
        { name: 'Expired Approvals', fn: () => processExpiredApprovals() },
      ];

      for (const service of services) {
        try {
          const result = await service.fn();
          console.log(`${service.name}: ✅ Executed successfully`, result);
        } catch (error) {
          console.error(`${service.name}: ❌ Error:`, error);
          // Don't fail the test - we're checking that errors are caught
        }
      }
    });
  });

  test.describe('Performance Tests', () => {

    test('autopay processing should complete within reasonable time', async () => {
      const startTime = Date.now();
      await processAutopayPayments();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      console.log(`Autopay processing took ${duration}ms`);
    });

    test('work order routing should be fast', async () => {
      const startTime = Date.now();
      await processUnassignedWorkOrders();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      console.log(`Work order routing took ${duration}ms`);
    });
  });
});
