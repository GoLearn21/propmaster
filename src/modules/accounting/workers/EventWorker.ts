/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * EventWorker - Outbox Event Processor
 *
 * This worker polls the event_outbox table and processes pending events.
 * It uses pessimistic locking to ensure at-least-once delivery.
 *
 * Architecture:
 *   Poll → Claim Events → Process → Mark Complete/Failed → Repeat
 */

import { supabase } from '@/lib/supabase';
import type { EventType, OutboxEvent, UUID } from '../types';
import { EventService } from '../events/EventService';

// Event handler type
type EventHandler<T = unknown> = (event: OutboxEvent<T>) => Promise<void>;

// Event handler registry
type EventHandlerRegistry = Partial<Record<EventType, EventHandler>>;

export class EventWorker {
  private workerId: string;
  private handlers: EventHandlerRegistry = {};
  private isRunning: boolean = false;
  private pollIntervalMs: number;
  private batchSize: number;
  private lockDurationMinutes: number;

  constructor(options: EventWorkerOptions = {}) {
    this.workerId = options.workerId || `worker-${process.pid}-${Date.now()}`;
    this.pollIntervalMs = options.pollIntervalMs || 1000;
    this.batchSize = options.batchSize || 10;
    this.lockDurationMinutes = options.lockDurationMinutes || 5;
  }

  /**
   * Register an event handler
   */
  on<T = unknown>(eventType: EventType, handler: EventHandler<T>): this {
    this.handlers[eventType] = handler as EventHandler;
    return this;
  }

  /**
   * Start the worker polling loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn(`[${this.workerId}] Worker already running`);
      return;
    }

    this.isRunning = true;
    console.log(`[${this.workerId}] Event worker started`);

    while (this.isRunning) {
      try {
        await this.processBatch();
      } catch (error) {
        console.error(`[${this.workerId}] Batch processing error:`, error);
      }

      // Wait before next poll
      await this.sleep(this.pollIntervalMs);
    }

    console.log(`[${this.workerId}] Event worker stopped`);
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    console.log(`[${this.workerId}] Stopping event worker...`);
    this.isRunning = false;
  }

  /**
   * Process a batch of events
   */
  private async processBatch(): Promise<void> {
    // Claim events from outbox
    const { data: events, error } = await supabase.rpc('claim_pending_events', {
      p_worker_id: this.workerId,
      p_batch_size: this.batchSize,
      p_lock_duration: `${this.lockDurationMinutes} minutes`,
    });

    if (error) {
      throw new Error(`Failed to claim events: ${error.message}`);
    }

    if (!events || events.length === 0) {
      return; // No events to process
    }

    console.log(`[${this.workerId}] Processing ${events.length} events`);

    // Process each event
    for (const event of events) {
      await this.processEvent(event);
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: OutboxEvent): Promise<void> {
    const handler = this.handlers[event.eventType];

    if (!handler) {
      console.warn(`[${this.workerId}] No handler for event type: ${event.eventType}`);
      await this.markEventFailed(event.id, `No handler registered for event type: ${event.eventType}`);
      return;
    }

    try {
      console.log(`[${this.workerId}] Processing event ${event.id} (${event.eventType})`);

      // Execute the handler
      await handler(event);

      // Mark as processed
      await this.markEventProcessed(event.id);

      console.log(`[${this.workerId}] Event ${event.id} processed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${this.workerId}] Event ${event.id} failed:`, errorMessage);

      await this.markEventFailed(event.id, errorMessage);
    }
  }

  /**
   * Mark event as processed
   */
  private async markEventProcessed(eventId: UUID): Promise<void> {
    const { error } = await supabase.rpc('mark_event_processed', {
      p_event_id: eventId,
    });

    if (error) {
      throw new Error(`Failed to mark event as processed: ${error.message}`);
    }
  }

  /**
   * Mark event as failed (will retry or dead letter)
   */
  private async markEventFailed(eventId: UUID, errorMessage: string): Promise<void> {
    const { error } = await supabase.rpc('mark_event_failed', {
      p_event_id: eventId,
      p_error: errorMessage,
    });

    if (error) {
      console.error(`Failed to mark event as failed: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Worker configuration options
 */
export interface EventWorkerOptions {
  workerId?: string;
  pollIntervalMs?: number;
  batchSize?: number;
  lockDurationMinutes?: number;
}

/**
 * Create and configure an event worker with standard handlers
 */
export function createEventWorker(options: EventWorkerOptions = {}): EventWorker {
  const worker = new EventWorker(options);

  // Register standard accounting event handlers
  worker
    .on('payment.received', async (event) => {
      console.log('Processing payment received:', event.payload);
      // Implementation will be added in Phase 3
    })
    .on('payment.failed', async (event) => {
      console.log('Processing payment failed:', event.payload);
    })
    .on('payment.nsf', async (event) => {
      console.log('Processing NSF payment:', event.payload);
      // This will trigger the NSF saga
    })
    .on('invoice.created', async (event) => {
      console.log('Processing invoice created:', event.payload);
    })
    .on('invoice.paid', async (event) => {
      console.log('Processing invoice paid:', event.payload);
    })
    .on('late_fee.assessed', async (event) => {
      console.log('Processing late fee:', event.payload);
    })
    .on('journal.posted', async (event) => {
      console.log('Processing journal posted:', event.payload);
    })
    .on('distribution.scheduled', async (event) => {
      console.log('Processing distribution scheduled:', event.payload);
    })
    .on('distribution.completed', async (event) => {
      console.log('Processing distribution completed:', event.payload);
    })
    .on('period.closed', async (event) => {
      console.log('Processing period closed:', event.payload);
    });

  return worker;
}
