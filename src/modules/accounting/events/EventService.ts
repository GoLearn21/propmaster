/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * EventService - Transactional Outbox Implementation
 *
 * TITANIUM RULE: No "Dual Writes"
 * Business data and events are written in the SAME database transaction.
 * This guarantees at-least-once delivery.
 *
 * Pattern: Write → Outbox Table → Worker Poll → Process → Mark Complete
 */

import { supabase } from '@/lib/supabase';
import type {
  CreateEventInput,
  EventType,
  IEventService,
  OutboxEvent,
  UUID,
} from '../types';

export class EventService implements IEventService {
  private organizationId: string;
  private workerId: string;

  constructor(organizationId: string, workerId?: string) {
    this.organizationId = organizationId;
    this.workerId = workerId || `worker-${process.pid}-${Date.now()}`;
  }

  /**
   * Emit an event to the outbox
   * This should be called within the same transaction as business data writes
   */
  async emit<T>(event: CreateEventInput<T>): Promise<UUID> {
    const { data, error } = await supabase
      .from('event_outbox')
      .insert({
        organization_id: this.organizationId,
        event_type: event.eventType,
        aggregate_type: event.aggregateType,
        aggregate_id: event.aggregateId,
        payload: event.payload,
        trace_id: event.traceId,
        saga_id: event.sagaId,
        correlation_id: event.correlationId,
        causation_id: event.causationId,
        scheduled_for: event.scheduledFor || new Date().toISOString(),
        status: 'pending',
        attempts: 0,
        max_attempts: 5,
      })
      .select('id')
      .single();

    if (error) {
      throw new EventError(
        'Failed to emit event to outbox',
        'EMIT_FAILED',
        { event, error: error.message }
      );
    }

    return data.id;
  }

  /**
   * Prepare an event for transactional insert
   * Returns the insert object for use with Supabase batch operations
   * Use this when you need to insert business data AND event in same transaction
   */
  emitInTransaction<T>(event: CreateEventInput<T>): CreateEventInput<T> & { organization_id: UUID } {
    return {
      ...event,
      organization_id: this.organizationId,
    };
  }

  /**
   * Claim pending events for processing
   * Uses pessimistic locking to prevent duplicate processing
   */
  async claimEvents(batchSize: number = 10, lockDurationMinutes: number = 5): Promise<OutboxEvent[]> {
    const { data, error } = await supabase.rpc('claim_pending_events', {
      p_worker_id: this.workerId,
      p_batch_size: batchSize,
      p_lock_duration: `${lockDurationMinutes} minutes`,
    });

    if (error) {
      throw new EventError(
        'Failed to claim events',
        'CLAIM_FAILED',
        { error: error.message }
      );
    }

    return (data || []).map(this.mapDbToOutboxEvent);
  }

  /**
   * Mark an event as successfully processed
   */
  async markProcessed(eventId: UUID): Promise<void> {
    const { error } = await supabase.rpc('mark_event_processed', {
      p_event_id: eventId,
    });

    if (error) {
      throw new EventError(
        'Failed to mark event as processed',
        'MARK_PROCESSED_FAILED',
        { eventId, error: error.message }
      );
    }
  }

  /**
   * Mark an event as failed
   * Will either retry or move to dead letter queue
   */
  async markFailed(eventId: UUID, errorMessage: string): Promise<void> {
    const { error } = await supabase.rpc('mark_event_failed', {
      p_event_id: eventId,
      p_error: errorMessage,
    });

    if (error) {
      throw new EventError(
        'Failed to mark event as failed',
        'MARK_FAILED_FAILED',
        { eventId, error: error.message }
      );
    }
  }

  /**
   * Get dead letter queue events for manual inspection
   */
  async getDeadLetterEvents(limit: number = 50): Promise<OutboxEvent[]> {
    const { data, error } = await supabase
      .from('event_dead_letter')
      .select('*')
      .eq('organization_id', this.organizationId)
      .is('reprocessed_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new EventError(
        'Failed to fetch dead letter events',
        'DLQ_FETCH_FAILED',
        { error: error.message }
      );
    }

    return data || [];
  }

  /**
   * Retry a dead letter event
   * Creates a new pending event from the dead letter
   */
  async retryDeadLetter(deadLetterId: UUID): Promise<UUID> {
    // Fetch the dead letter event
    const { data: dlEvent, error: fetchError } = await supabase
      .from('event_dead_letter')
      .select('*')
      .eq('id', deadLetterId)
      .eq('organization_id', this.organizationId)
      .single();

    if (fetchError || !dlEvent) {
      throw new EventError(
        'Dead letter event not found',
        'DLQ_NOT_FOUND',
        { deadLetterId }
      );
    }

    // Create new pending event
    const newEventId = await this.emit({
      eventType: dlEvent.event_type as EventType,
      aggregateType: dlEvent.aggregate_type,
      aggregateId: dlEvent.aggregate_id,
      payload: dlEvent.payload,
      traceId: dlEvent.trace_id,
      sagaId: dlEvent.saga_id,
    });

    // Mark dead letter as reprocessed
    await supabase
      .from('event_dead_letter')
      .update({
        reprocessed_at: new Date().toISOString(),
        reprocessed_as: newEventId,
      })
      .eq('id', deadLetterId);

    return newEventId;
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: UUID): Promise<OutboxEvent | null> {
    const { data, error } = await supabase
      .from('event_outbox')
      .select('*')
      .eq('id', eventId)
      .eq('organization_id', this.organizationId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDbToOutboxEvent(data);
  }

  /**
   * Get events by saga ID
   */
  async getEventsBySaga(sagaId: UUID): Promise<OutboxEvent[]> {
    const { data, error } = await supabase
      .from('event_outbox')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('saga_id', sagaId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new EventError(
        'Failed to fetch saga events',
        'SAGA_EVENTS_FAILED',
        { sagaId, error: error.message }
      );
    }

    return (data || []).map(this.mapDbToOutboxEvent);
  }

  /**
   * Schedule a delayed event
   */
  async scheduleEvent<T>(
    event: CreateEventInput<T>,
    delaySeconds: number
  ): Promise<UUID> {
    const scheduledFor = new Date(Date.now() + delaySeconds * 1000).toISOString();

    return this.emit({
      ...event,
      scheduledFor,
    });
  }

  private mapDbToOutboxEvent(row: Record<string, unknown>): OutboxEvent {
    return {
      id: row.id as string,
      organizationId: row.organization_id as string,
      eventType: row.event_type as EventType,
      aggregateType: row.aggregate_type as string,
      aggregateId: row.aggregate_id as string,
      payload: row.payload,
      status: row.status as OutboxEvent['status'],
      attempts: row.attempts as number,
      maxAttempts: row.max_attempts as number,
      lastError: row.last_error as string | undefined,
      traceId: row.trace_id as string,
      sagaId: row.saga_id as string | undefined,
      correlationId: row.correlation_id as string | undefined,
      causationId: row.causation_id as string | undefined,
      createdAt: row.created_at as string,
      scheduledFor: row.scheduled_for as string,
      processedAt: row.processed_at as string | undefined,
      lockedUntil: row.locked_until as string | undefined,
      lockedBy: row.locked_by as string | undefined,
    };
  }
}

/**
 * Custom error class for event-related errors
 */
export class EventError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'EventError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Factory function for creating EventService
 */
export function createEventService(organizationId: string, workerId?: string): IEventService {
  return new EventService(organizationId, workerId);
}
