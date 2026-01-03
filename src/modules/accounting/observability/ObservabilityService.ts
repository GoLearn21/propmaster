/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * ObservabilityService - OpenTelemetry-compatible Observability Stack
 *
 * Provides:
 * - Distributed tracing for saga workflows
 * - Metrics for performance monitoring
 * - Context propagation for cross-service correlation
 * - Integration with existing traceId system
 *
 * TITANIUM RULES:
 * - All ledger operations are traced
 * - All saga steps are individually traced
 * - O(1) read complexity is tracked
 * - Double-entry violations are counted (should always be 0)
 */

// ===========================================
// TYPES
// ===========================================

export type SpanStatusCode = 'UNSET' | 'OK' | 'ERROR';

export interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags?: number;
  traceState?: string;
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, AttributeValue>;
}

export type AttributeValue = string | number | boolean | string[] | number[] | boolean[];

export interface SpanOptions {
  parent?: Span;
  context?: SpanContext;
  attributes?: Record<string, AttributeValue>;
  startTime?: number;
}

export interface MetricLabels {
  [key: string]: string | number | boolean;
}

export interface CounterOptions {
  description?: string;
  unit?: string;
}

export interface HistogramOptions {
  description?: string;
  unit?: string;
  boundaries?: number[];
}

export interface ObservabilityOptions {
  serviceName?: string;
  serviceVersion?: string;
  enableTracing?: boolean;
  enableMetrics?: boolean;
  exporterEndpoint?: string;
}

export interface SagaStepContext {
  sagaId: string;
  sagaName: string;
  stepName: string;
  stepIndex: number;
}

export interface LedgerOperationContext {
  operation: string;
  accountId?: string;
  propertyId?: string;
  tenantId?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'disabled';
  tracingEnabled: boolean;
  metricsEnabled: boolean;
  activeSpans: number;
}

export interface AccountingMetrics {
  // Payment metrics
  paymentsProcessed: Counter;
  paymentAmount: Histogram;
  paymentLatency: Histogram;

  // Ledger metrics
  journalEntriesCreated: Counter;
  ledgerOperationDuration: Histogram;
  balanceQueries: Counter;

  // Saga metrics
  sagasStarted: Counter;
  sagasCompleted: Counter;
  sagasFailed: Counter;
  sagaStepDuration: Histogram;

  // Compliance metrics
  complianceChecks: Counter;
  complianceViolations: Counter;
}

// ===========================================
// SPAN IMPLEMENTATION
// ===========================================

export class Span {
  private spanId: string;
  private traceId: string;
  private parentSpanId?: string;
  private name: string;
  private startTime: number;
  private endTime?: number;
  private attributes: Record<string, AttributeValue> = {};
  private events: SpanEvent[] = [];
  private status: SpanStatus = { code: 'UNSET' };
  private recording: boolean = true;
  private onEnd?: (span: Span) => void;

  constructor(
    name: string,
    traceId: string,
    spanId: string,
    parentSpanId?: string,
    startTime?: number,
    onEnd?: (span: Span) => void
  ) {
    this.name = name;
    this.traceId = traceId;
    this.spanId = spanId;
    this.parentSpanId = parentSpanId;
    this.startTime = startTime || Date.now();
    this.onEnd = onEnd;
  }

  getSpanId(): string {
    return this.spanId;
  }

  getTraceId(): string {
    return this.traceId;
  }

  getParentSpanId(): string | undefined {
    return this.parentSpanId;
  }

  getName(): string {
    return this.name;
  }

  isRecording(): boolean {
    return this.recording;
  }

  setAttribute(key: string, value: AttributeValue): this {
    if (this.recording) {
      this.attributes[key] = value;
    }
    return this;
  }

  setAttributes(attributes: Record<string, AttributeValue>): this {
    if (this.recording) {
      Object.assign(this.attributes, attributes);
    }
    return this;
  }

  getAttributes(): Record<string, AttributeValue> {
    return { ...this.attributes };
  }

  addEvent(name: string, attributes?: Record<string, AttributeValue>): this {
    if (this.recording) {
      this.events.push({
        name,
        timestamp: Date.now(),
        attributes,
      });
    }
    return this;
  }

  getEvents(): SpanEvent[] {
    return [...this.events];
  }

  recordException(error: Error | string): this {
    if (this.recording) {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.addEvent('exception', {
        'exception.type': error instanceof Error ? error.constructor.name : 'Error',
        'exception.message': errorMessage,
        ...(errorStack && { 'exception.stacktrace': errorStack }),
      });

      this.setStatus({ code: 'ERROR', message: errorMessage });
    }
    return this;
  }

  setStatus(status: SpanStatus): this {
    if (this.recording) {
      this.status = status;
    }
    return this;
  }

  getStatus(): SpanStatus {
    return { ...this.status };
  }

  getContext(): SpanContext {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
    };
  }

  end(endTime?: number): void {
    if (this.recording) {
      this.endTime = endTime || Date.now();
      this.recording = false;
      if (this.onEnd) {
        this.onEnd(this);
      }
    }
  }

  getDuration(): number | undefined {
    if (this.endTime) {
      return this.endTime - this.startTime;
    }
    return undefined;
  }
}

// ===========================================
// COUNTER IMPLEMENTATION
// ===========================================

export class Counter {
  private name: string;
  private description?: string;
  private unit?: string;
  private values: Map<string, number> = new Map();
  private organizationId: string;

  constructor(name: string, organizationId: string, options?: CounterOptions) {
    this.name = name;
    this.organizationId = organizationId;
    this.description = options?.description;
    this.unit = options?.unit;
  }

  add(value: number, labels?: MetricLabels): void {
    const key = this.labelsToKey({ ...labels, organization_id: this.organizationId });
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  getValue(labels?: MetricLabels): number {
    const key = this.labelsToKey({ ...labels, organization_id: this.organizationId });
    return this.values.get(key) || 0;
  }

  private labelsToKey(labels?: MetricLabels): string {
    if (!labels) return '';
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
  }
}

// ===========================================
// HISTOGRAM IMPLEMENTATION
// ===========================================

export class Histogram {
  private name: string;
  private description?: string;
  private unit?: string;
  private boundaries: number[];
  private buckets: Map<string, number[]> = new Map();
  private sums: Map<string, number> = new Map();
  private counts: Map<string, number> = new Map();
  private organizationId: string;

  constructor(name: string, organizationId: string, options?: HistogramOptions) {
    this.name = name;
    this.organizationId = organizationId;
    this.description = options?.description;
    this.unit = options?.unit;
    this.boundaries = options?.boundaries || [5, 10, 25, 50, 75, 100, 250, 500, 1000];
  }

  record(value: number, labels?: MetricLabels): void {
    const key = this.labelsToKey({ ...labels, organization_id: this.organizationId });

    // Update sum and count
    const currentSum = this.sums.get(key) || 0;
    const currentCount = this.counts.get(key) || 0;
    this.sums.set(key, currentSum + value);
    this.counts.set(key, currentCount + 1);

    // Update bucket counts
    let buckets = this.buckets.get(key);
    if (!buckets) {
      buckets = new Array(this.boundaries.length + 1).fill(0);
      this.buckets.set(key, buckets);
    }

    for (let i = 0; i < this.boundaries.length; i++) {
      if (value <= this.boundaries[i]) {
        buckets[i]++;
        return;
      }
    }
    buckets[this.boundaries.length]++;
  }

  private labelsToKey(labels?: MetricLabels): string {
    if (!labels) return '';
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
  }
}

// ===========================================
// NO-OP IMPLEMENTATIONS
// ===========================================

class NoOpSpan extends Span {
  constructor() {
    super('noop', '00000000000000000000000000000000', '0000000000000000');
    // Override recording to false
    Object.defineProperty(this, 'recording', { value: false, writable: false });
  }

  isRecording(): boolean {
    return false;
  }

  setAttribute(): this {
    return this;
  }

  setAttributes(): this {
    return this;
  }

  addEvent(): this {
    return this;
  }

  recordException(): this {
    return this;
  }

  setStatus(): this {
    return this;
  }

  end(): void {}
}

class NoOpCounter extends Counter {
  constructor() {
    super('noop', 'noop');
  }

  add(): void {}
}

class NoOpHistogram extends Histogram {
  constructor() {
    super('noop', 'noop');
  }

  record(): void {}
}

// ===========================================
// OBSERVABILITY SERVICE
// ===========================================

export class ObservabilityService {
  private organizationId: string;
  private serviceName: string;
  private serviceVersion: string;
  private tracingEnabled: boolean;
  private metricsEnabled: boolean;
  private activeSpans: Set<Span> = new Set();
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private isShutdown: boolean = false;
  private accountingMetrics?: AccountingMetrics;

  constructor(organizationId: string, options?: ObservabilityOptions) {
    this.organizationId = organizationId;
    this.serviceName = options?.serviceName || 'titanium-accounting';
    this.serviceVersion = options?.serviceVersion || '7.2.0';
    this.tracingEnabled = options?.enableTracing !== false;
    this.metricsEnabled = options?.enableMetrics !== false;

    // Initialize pre-configured accounting metrics
    this.initializeAccountingMetrics();
  }

  private initializeAccountingMetrics(): void {
    this.accountingMetrics = {
      // Payment metrics
      paymentsProcessed: this.createCounter('payments.processed', {
        description: 'Total payments processed',
        unit: 'count',
      }),
      paymentAmount: this.createHistogram('payments.amount', {
        description: 'Payment amount distribution',
        unit: 'cents',
      }),
      paymentLatency: this.createHistogram('payments.latency', {
        description: 'Payment processing latency',
        unit: 'ms',
      }),

      // Ledger metrics
      journalEntriesCreated: this.createCounter('ledger.journal_entries.created', {
        description: 'Total journal entries created',
        unit: 'count',
      }),
      ledgerOperationDuration: this.createHistogram('ledger.operation.duration', {
        description: 'Ledger operation duration',
        unit: 'ms',
        boundaries: [1, 5, 10, 25, 50, 100, 250, 500],
      }),
      balanceQueries: this.createCounter('ledger.balance_queries', {
        description: 'Total balance queries (should be O(1))',
        unit: 'count',
      }),

      // Saga metrics
      sagasStarted: this.createCounter('sagas.started', {
        description: 'Total sagas started',
        unit: 'count',
      }),
      sagasCompleted: this.createCounter('sagas.completed', {
        description: 'Total sagas completed successfully',
        unit: 'count',
      }),
      sagasFailed: this.createCounter('sagas.failed', {
        description: 'Total sagas failed',
        unit: 'count',
      }),
      sagaStepDuration: this.createHistogram('sagas.step.duration', {
        description: 'Saga step duration',
        unit: 'ms',
        boundaries: [10, 50, 100, 250, 500, 1000, 5000],
      }),

      // Compliance metrics
      complianceChecks: this.createCounter('compliance.checks', {
        description: 'Total compliance checks performed',
        unit: 'count',
      }),
      complianceViolations: this.createCounter('compliance.violations', {
        description: 'Total compliance violations detected',
        unit: 'count',
      }),
    };
  }

  getOrganizationId(): string {
    return this.organizationId;
  }

  // ===========================================
  // TRACING
  // ===========================================

  startSpan(name: string, options?: SpanOptions): Span {
    if (this.isShutdown || !this.tracingEnabled) {
      return new NoOpSpan();
    }

    let traceId: string;
    let parentSpanId: string | undefined;

    if (options?.context) {
      traceId = options.context.traceId;
    } else if (options?.parent) {
      traceId = options.parent.getTraceId();
      parentSpanId = options.parent.getSpanId();
    } else {
      traceId = this.generateTraceId();
    }

    const spanId = this.generateSpanId();

    const span = new Span(
      name,
      traceId,
      spanId,
      parentSpanId,
      options?.startTime,
      (s) => this.onSpanEnd(s)
    );

    // Set initial attributes
    span.setAttribute('service.name', this.serviceName);
    span.setAttribute('service.version', this.serviceVersion);
    span.setAttribute('organization.id', this.organizationId);

    if (options?.attributes) {
      span.setAttributes(options.attributes);
    }

    this.activeSpans.add(span);
    return span;
  }

  startSpanWithTraceId(name: string, titaniumTraceId: string, options?: SpanOptions): Span {
    const span = this.startSpan(name, options);
    span.setAttribute('titanium.trace_id', titaniumTraceId);
    return span;
  }

  private onSpanEnd(span: Span): void {
    this.activeSpans.delete(span);
  }

  private generateTraceId(): string {
    // Generate 32-character hex string (W3C trace-id format)
    return this.generateHexString(32);
  }

  private generateSpanId(): string {
    // Generate 16-character hex string (W3C span-id format)
    return this.generateHexString(16);
  }

  private generateHexString(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
  }

  // ===========================================
  // METRICS
  // ===========================================

  createCounter(name: string, options?: CounterOptions): Counter {
    if (this.isShutdown || !this.metricsEnabled) {
      return new NoOpCounter();
    }

    const existing = this.counters.get(name);
    if (existing) return existing;

    const counter = new Counter(name, this.organizationId, options);
    this.counters.set(name, counter);
    return counter;
  }

  createHistogram(name: string, options?: HistogramOptions): Histogram {
    if (this.isShutdown || !this.metricsEnabled) {
      return new NoOpHistogram();
    }

    const existing = this.histograms.get(name);
    if (existing) return existing;

    const histogram = new Histogram(name, this.organizationId, options);
    this.histograms.set(name, histogram);
    return histogram;
  }

  getAccountingMetrics(): AccountingMetrics {
    if (!this.accountingMetrics) {
      this.initializeAccountingMetrics();
    }
    return this.accountingMetrics!;
  }

  // ===========================================
  // CONVENIENCE METHODS
  // ===========================================

  async traceOperation<T>(
    name: string,
    operation: (span: Span) => Promise<T>,
    options?: SpanOptions
  ): Promise<T> {
    const span = this.startSpan(name, options);
    const startTime = Date.now();

    try {
      const result = await operation(span);
      span.setStatus({ code: 'OK' });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      span.setAttribute('duration.ms', duration);
      span.end();
    }
  }

  async traceSagaStep<T>(
    context: SagaStepContext,
    operation: (span: Span) => Promise<T>,
    parentSpan?: Span
  ): Promise<T> {
    const span = this.startSpan(`saga.step.${context.stepName.toLowerCase()}`, {
      parent: parentSpan,
      attributes: {
        'saga.id': context.sagaId,
        'saga.name': context.sagaName,
        'saga.step.name': context.stepName,
        'saga.step.index': context.stepIndex,
      },
    });

    const startTime = Date.now();

    try {
      const result = await operation(span);
      span.setStatus({ code: 'OK' });

      // Record step duration metric
      const metrics = this.getAccountingMetrics();
      metrics.sagaStepDuration.record(Date.now() - startTime, {
        saga: context.sagaName,
        step: context.stepName,
      });

      return result;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  async traceLedgerOperation<T>(
    context: LedgerOperationContext,
    operation: (span: Span) => Promise<T>,
    parentSpan?: Span
  ): Promise<T> {
    const span = this.startSpan(`ledger.${context.operation}`, {
      parent: parentSpan,
      attributes: {
        'ledger.operation': context.operation,
        ...(context.accountId && { 'account.id': context.accountId }),
        ...(context.propertyId && { 'property.id': context.propertyId }),
        ...(context.tenantId && { 'tenant.id': context.tenantId }),
      },
    });

    const startTime = Date.now();

    try {
      const result = await operation(span);
      span.setStatus({ code: 'OK' });

      // Record operation duration metric
      const metrics = this.getAccountingMetrics();
      metrics.ledgerOperationDuration.record(Date.now() - startTime, {
        operation: context.operation,
      });

      if (context.operation === 'get_balance') {
        metrics.balanceQueries.add(1);
      }

      return result;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  // ===========================================
  // HEALTH & DIAGNOSTICS
  // ===========================================

  getHealth(): HealthStatus {
    if (this.isShutdown) {
      return {
        status: 'disabled',
        tracingEnabled: false,
        metricsEnabled: false,
        activeSpans: 0,
      };
    }

    return {
      status: 'healthy',
      tracingEnabled: this.tracingEnabled,
      metricsEnabled: this.metricsEnabled,
      activeSpans: this.activeSpans.size,
    };
  }

  getActiveSpanCount(): number {
    return this.activeSpans.size;
  }

  // ===========================================
  // LIFECYCLE
  // ===========================================

  async shutdown(): Promise<void> {
    if (this.isShutdown) return;

    // End any remaining active spans
    for (const span of this.activeSpans) {
      span.setStatus({ code: 'ERROR', message: 'Shutdown before completion' });
      span.end();
    }
    this.activeSpans.clear();

    this.isShutdown = true;
  }
}

// ===========================================
// NO-OP SERVICE
// ===========================================

class NoOpObservabilityService extends ObservabilityService {
  constructor() {
    super('noop', { enableTracing: false, enableMetrics: false });
    // Mark as shutdown immediately to return no-ops
    Object.defineProperty(this, 'isShutdown', { value: true, writable: false });
  }

  startSpan(): Span {
    return new NoOpSpan();
  }

  startSpanWithTraceId(): Span {
    return new NoOpSpan();
  }

  createCounter(): Counter {
    return new NoOpCounter();
  }

  createHistogram(): Histogram {
    return new NoOpHistogram();
  }

  getHealth(): HealthStatus {
    return {
      status: 'disabled',
      tracingEnabled: false,
      metricsEnabled: false,
      activeSpans: 0,
    };
  }

  getActiveSpanCount(): number {
    return 0;
  }

  async shutdown(): Promise<void> {}
}

// ===========================================
// FACTORY FUNCTIONS
// ===========================================

export function createObservabilityService(
  organizationId: string,
  options?: ObservabilityOptions
): ObservabilityService {
  return new ObservabilityService(organizationId, options);
}

export function createNoOpObservabilityService(): ObservabilityService {
  return new NoOpObservabilityService();
}
