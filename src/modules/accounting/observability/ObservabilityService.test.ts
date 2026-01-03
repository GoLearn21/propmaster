/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * ObservabilityService Tests
 *
 * TDD: RED Phase - Write failing tests first
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ObservabilityService,
  createObservabilityService,
  createNoOpObservabilityService,
  Span,
  SpanContext,
  Counter,
  Histogram,
  type ObservabilityOptions,
  type SpanOptions,
  type MetricLabels,
} from './ObservabilityService';

describe('ObservabilityService', () => {
  let service: ObservabilityService;
  const organizationId = 'org-test-123';

  beforeEach(() => {
    service = new ObservabilityService(organizationId);
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('Factory Functions', () => {
    it('should create service with default options', () => {
      const svc = createObservabilityService(organizationId);
      expect(svc).toBeInstanceOf(ObservabilityService);
      svc.shutdown();
    });

    it('should create service with custom options', () => {
      const options: ObservabilityOptions = {
        serviceName: 'test-accounting',
        serviceVersion: '1.0.0',
        enableTracing: true,
        enableMetrics: true,
      };
      const svc = createObservabilityService(organizationId, options);
      expect(svc).toBeInstanceOf(ObservabilityService);
      svc.shutdown();
    });

    it('should create no-op service for testing/disabled environments', () => {
      const svc = createNoOpObservabilityService();
      // Should not throw when calling methods
      const span = svc.startSpan('test');
      expect(span).toBeDefined();
      span.end();
    });
  });

  describe('Tracing - Span Lifecycle', () => {
    it('should start a root span', () => {
      const span = service.startSpan('test.operation');
      expect(span).toBeInstanceOf(Span);
      expect(span.isRecording()).toBe(true);
      span.end();
    });

    it('should start a child span', () => {
      const parentSpan = service.startSpan('parent.operation');
      const childSpan = service.startSpan('child.operation', { parent: parentSpan });

      expect(childSpan).toBeInstanceOf(Span);
      expect(childSpan.getParentSpanId()).toBe(parentSpan.getSpanId());

      childSpan.end();
      parentSpan.end();
    });

    it('should end span with custom end time', () => {
      const span = service.startSpan('test');
      const endTime = Date.now();
      span.end(endTime);
      expect(span.isRecording()).toBe(false);
    });

    it('should support span attributes', () => {
      const span = service.startSpan('test.operation');
      span.setAttribute('tenant.id', 'tenant-123');
      span.setAttribute('amount.cents', 5000);
      span.setAttribute('is.recurring', true);

      const attributes = span.getAttributes();
      expect(attributes['tenant.id']).toBe('tenant-123');
      expect(attributes['amount.cents']).toBe(5000);
      expect(attributes['is.recurring']).toBe(true);

      span.end();
    });

    it('should support setting multiple attributes at once', () => {
      const span = service.startSpan('test');
      span.setAttributes({
        'property.id': 'prop-123',
        'unit.id': 'unit-456',
        'lease.id': 'lease-789',
      });

      const attrs = span.getAttributes();
      expect(attrs['property.id']).toBe('prop-123');
      expect(attrs['unit.id']).toBe('unit-456');
      expect(attrs['lease.id']).toBe('lease-789');

      span.end();
    });
  });

  describe('Tracing - Span Events', () => {
    it('should record events on span', () => {
      const span = service.startSpan('saga.step');
      span.addEvent('step.started', { step_name: 'CALCULATE_FEES' });
      span.addEvent('step.completed', { duration_ms: 150 });

      const events = span.getEvents();
      expect(events.length).toBe(2);
      expect(events[0].name).toBe('step.started');
      expect(events[1].name).toBe('step.completed');

      span.end();
    });

    it('should record exceptions on span', () => {
      const span = service.startSpan('payment.process');
      const error = new Error('Insufficient funds');
      span.recordException(error);

      expect(span.getStatus().code).toBe('ERROR');
      span.end();
    });
  });

  describe('Tracing - Span Status', () => {
    it('should set status to OK on success', () => {
      const span = service.startSpan('ledger.post');
      span.setStatus({ code: 'OK' });

      expect(span.getStatus().code).toBe('OK');
      span.end();
    });

    it('should set status to ERROR with message', () => {
      const span = service.startSpan('ledger.post');
      span.setStatus({ code: 'ERROR', message: 'Balance mismatch' });

      const status = span.getStatus();
      expect(status.code).toBe('ERROR');
      expect(status.message).toBe('Balance mismatch');
      span.end();
    });
  });

  describe('Tracing - Context Propagation', () => {
    it('should get span context for propagation', () => {
      const span = service.startSpan('api.request');
      const context = span.getContext();

      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBeDefined();
      expect(context.traceId.length).toBe(32); // W3C trace-id format
      expect(context.spanId.length).toBe(16); // W3C span-id format

      span.end();
    });

    it('should create span from external context', () => {
      const externalContext: SpanContext = {
        traceId: '0af7651916cd43dd8448eb211c80319c',
        spanId: 'b7ad6b7169203331',
      };

      const span = service.startSpan('continue.trace', { context: externalContext });
      expect(span.getContext().traceId).toBe(externalContext.traceId);

      span.end();
    });

    it('should integrate with existing traceId system', () => {
      const traceId = 'existing-trace-id-from-saga';
      const span = service.startSpanWithTraceId('saga.execute', traceId);

      // The internal trace ID should be derived from or linked to the external ID
      const attrs = span.getAttributes();
      expect(attrs['titanium.trace_id']).toBe(traceId);

      span.end();
    });
  });

  describe('Tracing - Saga Workflows', () => {
    it('should trace entire saga lifecycle', async () => {
      const sagaSpan = service.startSpan('saga.payment_processing', {
        attributes: {
          'saga.name': 'payment_processing',
          'saga.id': 'saga-123',
        },
      });

      // Step 1
      const step1Span = service.startSpan('saga.step.record_payment', { parent: sagaSpan });
      step1Span.setAttribute('step.index', 1);
      step1Span.end();

      // Step 2
      const step2Span = service.startSpan('saga.step.apply_charges', { parent: sagaSpan });
      step2Span.setAttribute('step.index', 2);
      step2Span.end();

      sagaSpan.setStatus({ code: 'OK' });
      sagaSpan.end();

      // Verify saga span captured all child relationships
      expect(step1Span.getParentSpanId()).toBe(sagaSpan.getSpanId());
      expect(step2Span.getParentSpanId()).toBe(sagaSpan.getSpanId());
    });

    it('should trace saga compensation', () => {
      const sagaSpan = service.startSpan('saga.nsf_handling');

      sagaSpan.addEvent('saga.compensation.started', {
        failed_step: 'APPLY_CHARGES',
        reason: 'NSF detected',
      });

      const compensationSpan = service.startSpan('saga.compensation.reverse_payment', { parent: sagaSpan });
      compensationSpan.setAttribute('compensation.step', 'REVERSE_PAYMENT');
      compensationSpan.end();

      sagaSpan.setStatus({ code: 'OK', message: 'Compensated successfully' });
      sagaSpan.end();

      expect(compensationSpan.getParentSpanId()).toBe(sagaSpan.getSpanId());
    });
  });

  describe('Tracing - Ledger Operations', () => {
    it('should trace journal entry creation', () => {
      const span = service.startSpan('ledger.create_journal_entry', {
        attributes: {
          'journal.type': 'rent_payment',
          'postings.count': 4,
          'total.cents': 150000,
        },
      });

      span.addEvent('postings.validated');
      span.addEvent('balance.updated');
      span.setStatus({ code: 'OK' });
      span.end();

      expect(span.getEvents().length).toBe(2);
    });

    it('should trace balance queries with O(1) marker', () => {
      const span = service.startSpan('ledger.get_balance', {
        attributes: {
          'query.type': 'materialized_view',
          'complexity': 'O(1)',
          'account.id': 'acc-123',
        },
      });

      span.end();
      expect(span.getAttributes()['complexity']).toBe('O(1)');
    });
  });

  describe('Metrics - Counters', () => {
    it('should create and increment counter', () => {
      const counter = service.createCounter('payments.processed', {
        description: 'Total payments processed',
        unit: 'count',
      });

      counter.add(1, { payment_type: 'rent' });
      counter.add(5, { payment_type: 'fee' });

      expect(counter).toBeInstanceOf(Counter);
    });

    it('should record saga completions', () => {
      const sagaCounter = service.createCounter('sagas.completed', {
        description: 'Completed sagas by type and status',
      });

      sagaCounter.add(1, { saga_type: 'payment_processing', status: 'completed' });
      sagaCounter.add(1, { saga_type: 'nsf_handling', status: 'compensated' });

      expect(sagaCounter).toBeDefined();
    });

    it('should track double-entry violations (should always be 0)', () => {
      const violationCounter = service.createCounter('ledger.double_entry_violations', {
        description: 'Double-entry balance violations - should always be 0',
      });

      // In a properly functioning system, this should never be incremented
      expect(violationCounter).toBeDefined();
    });
  });

  describe('Metrics - Histograms', () => {
    it('should create histogram for latencies', () => {
      const histogram = service.createHistogram('ledger.operation.duration', {
        description: 'Ledger operation duration in milliseconds',
        unit: 'ms',
        boundaries: [5, 10, 25, 50, 100, 250, 500, 1000],
      });

      histogram.record(15, { operation: 'create_entry' });
      histogram.record(3, { operation: 'get_balance' });

      expect(histogram).toBeInstanceOf(Histogram);
    });

    it('should track payment amounts', () => {
      const amountHistogram = service.createHistogram('payments.amount', {
        description: 'Payment amount distribution in cents',
        unit: 'cents',
      });

      amountHistogram.record(100000, { type: 'rent' });
      amountHistogram.record(5000, { type: 'late_fee' });

      expect(amountHistogram).toBeDefined();
    });

    it('should track saga step durations', () => {
      const stepDuration = service.createHistogram('saga.step.duration', {
        description: 'Duration of individual saga steps',
        unit: 'ms',
      });

      stepDuration.record(50, { saga: 'payment_processing', step: 'RECORD_PAYMENT' });
      stepDuration.record(120, { saga: 'payment_processing', step: 'APPLY_CHARGES' });

      expect(stepDuration).toBeDefined();
    });
  });

  describe('Metrics - Organization Scoping', () => {
    it('should include organization_id in all metrics', () => {
      const counter = service.createCounter('test.counter');

      // The service should automatically add organization_id to all metrics
      const labels: MetricLabels = { custom: 'value' };
      counter.add(1, labels);

      // Verify through service configuration
      expect(service.getOrganizationId()).toBe(organizationId);
    });
  });

  describe('Pre-configured Accounting Metrics', () => {
    it('should have pre-configured payment metrics', () => {
      const metrics = service.getAccountingMetrics();

      expect(metrics.paymentsProcessed).toBeDefined();
      expect(metrics.paymentAmount).toBeDefined();
      expect(metrics.paymentLatency).toBeDefined();
    });

    it('should have pre-configured ledger metrics', () => {
      const metrics = service.getAccountingMetrics();

      expect(metrics.journalEntriesCreated).toBeDefined();
      expect(metrics.ledgerOperationDuration).toBeDefined();
      expect(metrics.balanceQueries).toBeDefined();
    });

    it('should have pre-configured saga metrics', () => {
      const metrics = service.getAccountingMetrics();

      expect(metrics.sagasStarted).toBeDefined();
      expect(metrics.sagasCompleted).toBeDefined();
      expect(metrics.sagasFailed).toBeDefined();
      expect(metrics.sagaStepDuration).toBeDefined();
    });

    it('should have pre-configured compliance metrics', () => {
      const metrics = service.getAccountingMetrics();

      expect(metrics.complianceChecks).toBeDefined();
      expect(metrics.complianceViolations).toBeDefined();
    });
  });

  describe('High-Level Convenience Methods', () => {
    it('should trace operation with automatic timing', async () => {
      const result = await service.traceOperation('test.operation', async (span) => {
        span.setAttribute('custom', 'value');
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should handle errors in traced operations', async () => {
      await expect(
        service.traceOperation('test.failing', async () => {
          throw new Error('Test failure');
        })
      ).rejects.toThrow('Test failure');
    });

    it('should trace saga step execution', async () => {
      const stepResult = await service.traceSagaStep({
        sagaId: 'saga-123',
        sagaName: 'payment_processing',
        stepName: 'RECORD_PAYMENT',
        stepIndex: 1,
      }, async (span) => {
        span.addEvent('payment.recorded');
        return { paymentId: 'pay-456' };
      });

      expect(stepResult).toEqual({ paymentId: 'pay-456' });
    });

    it('should trace ledger operation with account context', async () => {
      const balance = await service.traceLedgerOperation({
        operation: 'get_balance',
        accountId: 'acc-123',
        propertyId: 'prop-456',
      }, async () => {
        return { balance: 150000 };
      });

      expect(balance).toEqual({ balance: 150000 });
    });
  });

  describe('Diagnostic & Health', () => {
    it('should expose health status', () => {
      const health = service.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.tracingEnabled).toBe(true);
      expect(health.metricsEnabled).toBe(true);
    });

    it('should track active spans', () => {
      const span1 = service.startSpan('test1');
      const span2 = service.startSpan('test2');

      expect(service.getActiveSpanCount()).toBe(2);

      span1.end();
      expect(service.getActiveSpanCount()).toBe(1);

      span2.end();
      expect(service.getActiveSpanCount()).toBe(0);
    });
  });

  describe('Shutdown', () => {
    it('should gracefully shutdown and flush pending data', async () => {
      const span = service.startSpan('test');
      span.end();

      await service.shutdown();

      // After shutdown, new spans should be no-ops
      const postShutdownSpan = service.startSpan('post-shutdown');
      expect(postShutdownSpan.isRecording()).toBe(false);
    });
  });

  describe('Semantic Conventions', () => {
    it('should use standard attribute names', () => {
      const span = service.startSpan('db.query', {
        attributes: {
          'db.system': 'postgresql',
          'db.name': 'propmaster',
          'db.statement': 'SELECT * FROM ledger_balance',
        },
      });

      const attrs = span.getAttributes();
      expect(attrs['db.system']).toBe('postgresql');
      span.end();
    });

    it('should use accounting-specific conventions', () => {
      const span = service.startSpan('accounting.journal_entry', {
        attributes: {
          'accounting.journal.type': 'rent_payment',
          'accounting.journal.postings': 4,
          'accounting.journal.total_cents': 150000,
          'accounting.property.id': 'prop-123',
          'accounting.tenant.id': 'tenant-456',
        },
      });

      span.end();
      const attrs = span.getAttributes();
      expect(attrs['accounting.journal.type']).toBe('rent_payment');
    });
  });
});

describe('NoOp ObservabilityService', () => {
  it('should provide no-op implementations that never throw', () => {
    const service = createNoOpObservabilityService();

    // All operations should work without errors
    const span = service.startSpan('test');
    span.setAttribute('key', 'value');
    span.setAttributes({ a: 1, b: 2 });
    span.addEvent('event');
    span.recordException(new Error('test'));
    span.setStatus({ code: 'OK' });
    span.end();

    const counter = service.createCounter('test');
    counter.add(1);

    const histogram = service.createHistogram('test');
    histogram.record(100);

    expect(service.getHealth().status).toBe('disabled');
  });
});
