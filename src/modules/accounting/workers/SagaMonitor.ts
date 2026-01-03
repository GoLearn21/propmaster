/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * SagaMonitor - Zombie Resurrection Service
 *
 * Problem:
 *   A worker crashes after committing the DB transaction but BEFORE
 *   emitting the next event. The saga hangs forever ("zombie saga").
 *
 * Solution:
 *   This monitor runs as a cron job and:
 *   1. Finds sagas with stale heartbeats
 *   2. Checks if the next event is missing from the outbox
 *   3. Re-emits the event to restart the worker
 *
 * This is the "Zombie Resurrection" logic from the Titanium spec.
 */

import { supabase } from '@/lib/supabase';
import type { SagaState, UUID } from '../types';
import { EventService } from '../events/EventService';
import { SagaOrchestrator } from '../sagas/SagaOrchestrator';

export class SagaMonitor {
  private staleThresholdMinutes: number;
  private monitorIntervalMs: number;
  private isRunning: boolean = false;

  constructor(options: SagaMonitorOptions = {}) {
    this.staleThresholdMinutes = options.staleThresholdMinutes || 5;
    this.monitorIntervalMs = options.monitorIntervalMs || 60000; // 1 minute
  }

  /**
   * Start the monitor loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[SagaMonitor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[SagaMonitor] Started');

    while (this.isRunning) {
      try {
        await this.resurrectZombies();
      } catch (error) {
        console.error('[SagaMonitor] Error during zombie check:', error);
      }

      await this.sleep(this.monitorIntervalMs);
    }

    console.log('[SagaMonitor] Stopped');
  }

  /**
   * Stop the monitor
   */
  stop(): void {
    console.log('[SagaMonitor] Stopping...');
    this.isRunning = false;
  }

  /**
   * Main zombie resurrection logic
   * Called periodically to find and revive stalled sagas
   */
  async resurrectZombies(): Promise<ZombieResurrectionResult> {
    const result: ZombieResurrectionResult = {
      zombiesFound: 0,
      resurrected: 0,
      failed: 0,
      timedOut: 0,
    };

    // Find all zombie sagas
    const { data: zombies, error } = await supabase.rpc('find_zombie_sagas', {
      p_stale_threshold: `${this.staleThresholdMinutes} minutes`,
    });

    if (error) {
      console.error('[SagaMonitor] Failed to find zombies:', error.message);
      return result;
    }

    if (!zombies || zombies.length === 0) {
      return result;
    }

    result.zombiesFound = zombies.length;
    console.log(`[SagaMonitor] Found ${zombies.length} zombie sagas`);

    for (const zombie of zombies) {
      try {
        // Check if saga has timed out
        if (zombie.timeout_at && new Date(zombie.timeout_at) < new Date()) {
          await this.timeoutSaga(zombie);
          result.timedOut++;
          continue;
        }

        // Check if event exists for current step
        const eventExists = await this.checkEventExists(zombie.id, zombie.current_step);

        if (!eventExists) {
          // Re-emit the event to restart processing
          await this.resurrectSaga(zombie);
          result.resurrected++;
          console.log(`[SagaMonitor] Resurrected saga ${zombie.id} at step ${zombie.current_step}`);
        } else {
          // Event exists but hasn't been processed - might be stuck in processing
          // Update heartbeat to prevent re-resurrection
          await this.updateSagaHeartbeat(zombie.id);
          console.log(`[SagaMonitor] Saga ${zombie.id} has pending event, updating heartbeat`);
        }
      } catch (error) {
        console.error(`[SagaMonitor] Failed to resurrect saga ${zombie.id}:`, error);
        result.failed++;
      }
    }

    return result;
  }

  /**
   * Check if an event exists in the outbox for this saga step
   */
  private async checkEventExists(sagaId: UUID, currentStep: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('event_outbox')
      .select('id')
      .eq('saga_id', sagaId)
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (error) {
      console.error('[SagaMonitor] Failed to check event existence:', error.message);
      return false;
    }

    return data !== null && data.length > 0;
  }

  /**
   * Re-emit event for a zombie saga
   */
  private async resurrectSaga(zombie: SagaState): Promise<void> {
    const eventService = new EventService(zombie.organizationId);

    // Determine event type based on saga name and current step
    const eventType = this.getEventTypeForStep(zombie.sagaName, zombie.currentStep);

    // Emit the event to restart processing
    await eventService.emit({
      eventType,
      aggregateType: 'saga',
      aggregateId: zombie.id,
      payload: {
        sagaId: zombie.id,
        sagaName: zombie.sagaName,
        currentStep: zombie.currentStep,
        payload: zombie.payload,
        resurrection: true,
        resurrectedAt: new Date().toISOString(),
      },
      traceId: zombie.traceId,
      sagaId: zombie.id,
    });

    // Update heartbeat so we don't immediately try again
    await this.updateSagaHeartbeat(zombie.id);
  }

  /**
   * Mark saga as timed out (failed)
   */
  private async timeoutSaga(zombie: SagaState): Promise<void> {
    const { error } = await supabase
      .from('saga_state')
      .update({
        status: 'failed',
        error_message: 'Saga timed out',
        error_step: zombie.currentStep,
        updated_at: new Date().toISOString(),
      })
      .eq('id', zombie.id);

    if (error) {
      console.error(`[SagaMonitor] Failed to timeout saga ${zombie.id}:`, error.message);
    } else {
      console.log(`[SagaMonitor] Timed out saga ${zombie.id}`);
    }
  }

  /**
   * Update saga heartbeat
   */
  private async updateSagaHeartbeat(sagaId: UUID): Promise<void> {
    await supabase.rpc('update_saga_heartbeat', {
      p_saga_id: sagaId,
    });
  }

  /**
   * Map saga step to event type
   * This should be extended based on your saga definitions
   */
  private getEventTypeForStep(
    sagaName: string,
    step: string
  ): 'payment.nsf' | 'distribution.scheduled' | 'journal.posted' | 'late_fee.assessed' {
    // Map saga steps to event types
    const stepEventMap: Record<string, Record<string, string>> = {
      nsf_handling: {
        reverse_payment: 'payment.nsf',
        assess_fee: 'late_fee.assessed',
        notify_tenant: 'payment.nsf',
      },
      owner_distribution: {
        calculate: 'distribution.scheduled',
        approve: 'distribution.scheduled',
        distribute: 'distribution.completed',
      },
      lease_renewal: {
        notify: 'lease.renewed',
        generate_offer: 'lease.renewed',
        process_response: 'lease.renewed',
      },
      late_fee_assessment: {
        check_grace_period: 'late_fee.assessed',
        calculate_fee: 'late_fee.assessed',
        post_charge: 'late_fee.assessed',
      },
      period_closing: {
        validate: 'period.closed',
        freeze: 'period.closed',
        generate_reports: 'period.closed',
      },
    };

    const sagaEvents = stepEventMap[sagaName];
    if (sagaEvents && sagaEvents[step]) {
      return sagaEvents[step] as 'payment.nsf' | 'distribution.scheduled' | 'journal.posted' | 'late_fee.assessed';
    }

    // Default fallback
    return 'journal.posted';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Monitor configuration options
 */
export interface SagaMonitorOptions {
  staleThresholdMinutes?: number;
  monitorIntervalMs?: number;
}

/**
 * Result of zombie resurrection check
 */
export interface ZombieResurrectionResult {
  zombiesFound: number;
  resurrected: number;
  failed: number;
  timedOut: number;
}

/**
 * Create and start the saga monitor
 */
export function createSagaMonitor(options: SagaMonitorOptions = {}): SagaMonitor {
  return new SagaMonitor(options);
}

/**
 * Run a single zombie check (for cron jobs or testing)
 */
export async function runZombieCheck(options: SagaMonitorOptions = {}): Promise<ZombieResurrectionResult> {
  const monitor = new SagaMonitor(options);
  return monitor.resurrectZombies();
}
