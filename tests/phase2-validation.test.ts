import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Phase 2: File and Code Validation Tests
 * Runs in Node.js context to validate files exist and have correct structure
 */

test.describe('Phase 2: File Validation', () => {

  test.describe('Database Schema Files', () => {

    test('phase1 database schema should exist with all tables', () => {
      const schemaFile = path.join(process.cwd(), 'database', 'phase1-missing-tables.sql');
      expect(fs.existsSync(schemaFile)).toBe(true);

      const content = fs.readFileSync(schemaFile, 'utf-8');

      // Check for all 10 Phase 1 tables
      const tables = [
        'bank_accounts',
        'property_ownership',
        'work_orders',
        'payment_templates',
        'payment_history',
        'expenses',
        'audit_logs',
        'lease_amendments',
        'recurring_charges',
        'comments'
      ];

      tables.forEach(table => {
        expect(content).toContain(table);
      });

      console.log('✅ Phase 1 schema validated: all 10 tables present');
    });

    test('phase2 database schema should exist with all tables', () => {
      const schemaFile = path.join(process.cwd(), 'database', 'phase2-automation-tables.sql');
      expect(fs.existsSync(schemaFile)).toBe(true);

      const content = fs.readFileSync(schemaFile, 'utf-8');

      // Check for all 7 Phase 2 tables
      const tables = [
        'lease_renewal_offers',
        'maintenance_schedules',
        'approval_requests',
        'approval_thresholds',
        'notifications',
        'automated_jobs_log',
        'vendor_performance_metrics'
      ];

      tables.forEach(table => {
        expect(content).toContain(table);
      });

      console.log('✅ Phase 2 schema validated: all 7 tables present');
    });
  });

  test.describe('Service Files', () => {

    test('autopay service should exist with all functions', () => {
      const serviceFile = path.join(process.cwd(), 'src', 'services', 'autopayService.ts');
      expect(fs.existsSync(serviceFile)).toBe(true);

      const content = fs.readFileSync(serviceFile, 'utf-8');

      const functions = [
        'processAutopayPayments',
        'sendPaymentReminders',
        'enableAutopay',
        'disableAutopay',
        'getAutopayStatus'
      ];

      functions.forEach(fn => {
        expect(content).toContain(fn);
      });

      console.log('✅ Autopay service validated: all functions present');
    });

    test('lease renewal service should exist with all functions', () => {
      const serviceFile = path.join(process.cwd(), 'src', 'services', 'leaseRenewalService.ts');
      expect(fs.existsSync(serviceFile)).toBe(true);

      const content = fs.readFileSync(serviceFile, 'utf-8');

      const functions = [
        'processLeaseRenewals',
        'processRenewalResponse',
        'processExpiredOffers',
        'getRenewalStatus'
      ];

      functions.forEach(fn => {
        expect(content).toContain(fn);
      });

      console.log('✅ Lease renewal service validated: all functions present');
    });

    test('maintenance scheduler service should exist with all functions', () => {
      const serviceFile = path.join(process.cwd(), 'src', 'services', 'maintenanceSchedulerService.ts');
      expect(fs.existsSync(serviceFile)).toBe(true);

      const content = fs.readFileSync(serviceFile, 'utf-8');

      const functions = [
        'processMaintenanceSchedules',
        'initializePropertyMaintenance',
        'getUpcomingMaintenance'
      ];

      functions.forEach(fn => {
        expect(content).toContain(fn);
      });

      console.log('✅ Maintenance scheduler service validated: all functions present');
    });

    test('work order routing service should exist with all functions', () => {
      const serviceFile = path.join(process.cwd(), 'src', 'services', 'workOrderRoutingService.ts');
      expect(fs.existsSync(serviceFile)).toBe(true);

      const content = fs.readFileSync(serviceFile, 'utf-8');

      const functions = [
        'autoAssignVendor',
        'processUnassignedWorkOrders',
        'getVendorRecommendations'
      ];

      functions.forEach(fn => {
        expect(content).toContain(fn);
      });

      console.log('✅ Work order routing service validated: all functions present');
    });

    test('budget approval service should exist with all functions', () => {
      const serviceFile = path.join(process.cwd(), 'src', 'services', 'budgetApprovalService.ts');
      expect(fs.existsSync(serviceFile)).toBe(true);

      const content = fs.readFileSync(serviceFile, 'utf-8');

      const functions = [
        'checkAndRequestApproval',
        'processApprovalRequest',
        'getPendingApprovals',
        'processExpiredApprovals',
        'initializeApprovalThresholds'
      ];

      functions.forEach(fn => {
        expect(content).toContain(fn);
      });

      console.log('✅ Budget approval service validated: all functions present');
    });
  });

  test.describe('Documentation Files', () => {

    test('Phase 1 documentation should exist and be comprehensive', () => {
      const docFile = path.join(process.cwd(), 'PHASE1_IMPLEMENTATION.md');
      expect(fs.existsSync(docFile)).toBe(true);

      const content = fs.readFileSync(docFile, 'utf-8');
      expect(content.length).toBeGreaterThan(5000);

      const sections = [
        'bank_accounts',
        'property_ownership',
        'work_orders',
        'Outstanding Balance Calculation',
        'Maintenance Costs Calculation'
      ];

      sections.forEach(section => {
        expect(content).toContain(section);
      });

      console.log(`✅ Phase 1 documentation validated (${content.length} characters)`);
    });

    test('Phase 2 documentation should exist and be comprehensive', () => {
      const docFile = path.join(process.cwd(), 'PHASE2_IMPLEMENTATION.md');
      expect(fs.existsSync(docFile)).toBe(true);

      const content = fs.readFileSync(docFile, 'utf-8');
      expect(content.length).toBeGreaterThan(10000);

      const sections = [
        'Autopay Processing System',
        'Lease Renewal Automation',
        'Preventive Maintenance Scheduler',
        'Intelligent Work Order Routing',
        'Budget Approval Workflows',
        'Daily Cron Jobs'
      ];

      sections.forEach(section => {
        expect(content).toContain(section);
      });

      console.log(`✅ Phase 2 documentation validated (${content.length} characters)`);
    });
  });

  test.describe('Code Quality', () => {

    test('all services should have TypeScript interfaces', () => {
      const services = [
        'autopayService.ts',
        'leaseRenewalService.ts',
        'maintenanceSchedulerService.ts',
        'workOrderRoutingService.ts',
        'budgetApprovalService.ts'
      ];

      services.forEach(service => {
        const serviceFile = path.join(process.cwd(), 'src', 'services', service);
        const content = fs.readFileSync(serviceFile, 'utf-8');

        // Check for interfaces
        expect(content).toMatch(/interface \w+/);

        // Check for error handling
        expect(content).toContain('try');
        expect(content).toContain('catch');

        // Check for async/await
        expect(content).toContain('async');
        expect(content).toContain('await');
      });

      console.log('✅ All services have proper TypeScript types and error handling');
    });

    test('all services should have JSDoc documentation', () => {
      const services = [
        'autopayService.ts',
        'leaseRenewalService.ts',
        'maintenanceSchedulerService.ts',
        'workOrderRoutingService.ts',
        'budgetApprovalService.ts'
      ];

      services.forEach(service => {
        const serviceFile = path.join(process.cwd(), 'src', 'services', service);
        const content = fs.readFileSync(serviceFile, 'utf-8');

        // Check for JSDoc comments
        expect(content).toContain('/**');
        expect(content).toContain('*/');
        expect(content).toContain('Phase 2');
      });

      console.log('✅ All services have JSDoc documentation');
    });

    test('all services should import supabase client', () => {
      const services = [
        'autopayService.ts',
        'leaseRenewalService.ts',
        'maintenanceSchedulerService.ts',
        'workOrderRoutingService.ts',
        'budgetApprovalService.ts'
      ];

      services.forEach(service => {
        const serviceFile = path.join(process.cwd(), 'src', 'services', service);
        const content = fs.readFileSync(serviceFile, 'utf-8');

        expect(content).toContain("from '../lib/supabase'");
      });

      console.log('✅ All services import supabase client');
    });
  });

  test.describe('Line Count Metrics', () => {

    test('Phase 2 services should have substantial implementation', () => {
      const services = {
        'autopayService.ts': 400,
        'leaseRenewalService.ts': 450,
        'maintenanceSchedulerService.ts': 400,
        'workOrderRoutingService.ts': 400,
        'budgetApprovalService.ts': 400
      };

      let totalLines = 0;

      Object.entries(services).forEach(([service, minLines]) => {
        const serviceFile = path.join(process.cwd(), 'src', 'services', service);
        const content = fs.readFileSync(serviceFile, 'utf-8');
        const lineCount = content.split('\n').length;

        expect(lineCount).toBeGreaterThan(minLines);
        totalLines += lineCount;

        console.log(`  ${service}: ${lineCount} lines`);
      });

      console.log(`✅ Total Phase 2 service code: ${totalLines} lines`);
      expect(totalLines).toBeGreaterThan(1900); // Should be 1900+ lines total
    });
  });
});
