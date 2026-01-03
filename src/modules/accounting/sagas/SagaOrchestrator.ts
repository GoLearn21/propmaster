/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * SagaOrchestrator - Persistent State Machine for Multi-Step Workflows
 *
 * Sagas are used for workflows that span multiple services/transactions:
 * - NSF Handling (reverse payment, assess fee, notify tenant)
 * - Owner Distributions (calculate, approve, distribute)
 * - Lease Renewal (notify, generate offer, process response)
 * - Period Closing (validate, freeze, generate reports)
 *
 * Key Features:
 * - Persistent state machine survives crashes
 * - Compensation steps for rollback on failure
 * - Heartbeat monitoring for zombie detection
 */

import { supabase } from '@/lib/supabase';
import type {
  CreateSagaInput,
  ISagaOrchestrator,
  SagaName,
  SagaState,
  SagaStatus,
  SagaStepLog,
  UUID,
} from '../types';
import { EventService } from '../events/EventService';

export class SagaOrchestrator implements ISagaOrchestrator {
  private organizationId: string;
  private eventService: EventService;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.eventService = new EventService(organizationId);
  }

  /**
   * Start a new saga
   */
  async startSaga<T>(input: CreateSagaInput<T>): Promise<SagaState<T>> {
    const timeoutAt = input.timeoutMinutes
      ? new Date(Date.now() + input.timeoutMinutes * 60 * 1000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('saga_state')
      .insert({
        organization_id: this.organizationId,
        saga_name: input.sagaName,
        saga_version: 1,
        current_step: input.initialStep,
        status: 'running',
        steps_completed: [],
        compensation_steps: [],
        payload: input.payload,
        trace_id: input.traceId,
        timeout_at: timeoutAt,
        initiated_by: input.initiatedBy,
        last_heartbeat: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new SagaError(
        'Failed to start saga',
        'SAGA_START_FAILED',
        { input, error: error.message }
      );
    }

    // Log the initial step
    await this.logStep(data.id, input.initialStep, 'forward', 'started', input.payload);

    return this.mapDbToSagaState(data);
  }

  /**
   * Advance saga to the next step
   */
  async advanceSaga(
    sagaId: UUID,
    nextStep: string,
    output?: unknown
  ): Promise<SagaState> {
    // Get current saga state
    const saga = await this.getSaga(sagaId);

    if (saga.status !== 'running') {
      throw new SagaError(
        `Cannot advance saga in status: ${saga.status}`,
        'INVALID_SAGA_STATUS',
        { sagaId, status: saga.status }
      );
    }

    // Log completion of current step
    await this.logStep(sagaId, saga.currentStep, 'forward', 'completed', undefined, output);

    // Update saga state
    const stepsCompleted = [...saga.stepsCompleted, saga.currentStep];

    const { data, error } = await supabase
      .from('saga_state')
      .update({
        current_step: nextStep,
        steps_completed: stepsCompleted,
        updated_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
      })
      .eq('id', sagaId)
      .eq('organization_id', this.organizationId)
      .select()
      .single();

    if (error) {
      throw new SagaError(
        'Failed to advance saga',
        'SAGA_ADVANCE_FAILED',
        { sagaId, nextStep, error: error.message }
      );
    }

    // Log the new step
    await this.logStep(sagaId, nextStep, 'forward', 'started', saga.payload);

    return this.mapDbToSagaState(data);
  }

  /**
   * Mark saga as failed
   */
  async failSaga(sagaId: UUID, error: string): Promise<SagaState> {
    const saga = await this.getSaga(sagaId);

    // Log the failure
    await this.logStep(sagaId, saga.currentStep, 'forward', 'failed', undefined, undefined, error);

    const { data, error: updateError } = await supabase
      .from('saga_state')
      .update({
        status: 'failed',
        error_message: error,
        error_step: saga.currentStep,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sagaId)
      .eq('organization_id', this.organizationId)
      .select()
      .single();

    if (updateError) {
      throw new SagaError(
        'Failed to mark saga as failed',
        'SAGA_FAIL_FAILED',
        { sagaId, error: updateError.message }
      );
    }

    return this.mapDbToSagaState(data);
  }

  /**
   * Mark saga as completed
   */
  async completeSaga(sagaId: UUID, result?: unknown): Promise<SagaState> {
    const saga = await this.getSaga(sagaId);

    if (saga.status !== 'running') {
      throw new SagaError(
        `Cannot complete saga in status: ${saga.status}`,
        'INVALID_SAGA_STATUS',
        { sagaId, status: saga.status }
      );
    }

    // Log completion of final step
    await this.logStep(sagaId, saga.currentStep, 'forward', 'completed', undefined, result);

    const stepsCompleted = [...saga.stepsCompleted, saga.currentStep];

    const { data, error } = await supabase
      .from('saga_state')
      .update({
        status: 'completed',
        steps_completed: stepsCompleted,
        result: result,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sagaId)
      .eq('organization_id', this.organizationId)
      .select()
      .single();

    if (error) {
      throw new SagaError(
        'Failed to complete saga',
        'SAGA_COMPLETE_FAILED',
        { sagaId, error: error.message }
      );
    }

    return this.mapDbToSagaState(data);
  }

  /**
   * Start compensation (rollback) for a failed saga
   */
  async startCompensation(sagaId: UUID): Promise<SagaState> {
    const saga = await this.getSaga(sagaId);

    if (saga.status !== 'failed') {
      throw new SagaError(
        'Can only start compensation for failed sagas',
        'INVALID_SAGA_STATUS',
        { sagaId, status: saga.status }
      );
    }

    // Get compensation steps (reverse order of completed steps)
    const compensationSteps = [...saga.stepsCompleted].reverse();

    const { data, error } = await supabase
      .from('saga_state')
      .update({
        status: 'compensating',
        compensation_steps: compensationSteps,
        current_step: compensationSteps[0] || 'none',
        updated_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
      })
      .eq('id', sagaId)
      .eq('organization_id', this.organizationId)
      .select()
      .single();

    if (error) {
      throw new SagaError(
        'Failed to start compensation',
        'SAGA_COMPENSATE_FAILED',
        { sagaId, error: error.message }
      );
    }

    // Log compensation start
    if (compensationSteps.length > 0) {
      await this.logStep(sagaId, compensationSteps[0], 'compensation', 'started', saga.payload);
    }

    return this.mapDbToSagaState(data);
  }

  /**
   * Advance compensation to next step
   */
  async advanceCompensation(sagaId: UUID, output?: unknown): Promise<SagaState> {
    const saga = await this.getSaga(sagaId);

    if (saga.status !== 'compensating') {
      throw new SagaError(
        'Saga is not in compensating state',
        'INVALID_SAGA_STATUS',
        { sagaId, status: saga.status }
      );
    }

    // Log completion of current compensation step
    await this.logStep(sagaId, saga.currentStep, 'compensation', 'completed', undefined, output);

    // Find next compensation step
    const currentIndex = saga.compensationSteps.indexOf(saga.currentStep);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= saga.compensationSteps.length) {
      // All compensations complete
      const { data, error } = await supabase
        .from('saga_state')
        .update({
          status: 'compensated',
          current_step: 'done',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sagaId)
        .eq('organization_id', this.organizationId)
        .select()
        .single();

      if (error) {
        throw new SagaError(
          'Failed to complete compensation',
          'SAGA_COMPENSATE_COMPLETE_FAILED',
          { sagaId, error: error.message }
        );
      }

      return this.mapDbToSagaState(data);
    }

    // Move to next compensation step
    const nextStep = saga.compensationSteps[nextIndex];

    const { data, error } = await supabase
      .from('saga_state')
      .update({
        current_step: nextStep,
        updated_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
      })
      .eq('id', sagaId)
      .eq('organization_id', this.organizationId)
      .select()
      .single();

    if (error) {
      throw new SagaError(
        'Failed to advance compensation',
        'SAGA_COMPENSATE_ADVANCE_FAILED',
        { sagaId, error: error.message }
      );
    }

    // Log next compensation step
    await this.logStep(sagaId, nextStep, 'compensation', 'started', saga.payload);

    return this.mapDbToSagaState(data);
  }

  /**
   * Update heartbeat (call this periodically during long-running steps)
   */
  async heartbeat(sagaId: UUID): Promise<void> {
    const { error } = await supabase.rpc('update_saga_heartbeat', {
      p_saga_id: sagaId,
    });

    if (error) {
      console.error('Failed to update saga heartbeat:', error.message);
    }
  }

  /**
   * Get saga by ID
   */
  async getSaga(sagaId: UUID): Promise<SagaState> {
    const { data, error } = await supabase
      .from('saga_state')
      .select('*')
      .eq('id', sagaId)
      .eq('organization_id', this.organizationId)
      .single();

    if (error || !data) {
      throw new SagaError(
        'Saga not found',
        'SAGA_NOT_FOUND',
        { sagaId }
      );
    }

    return this.mapDbToSagaState(data);
  }

  /**
   * Get saga step history
   */
  async getSagaSteps(sagaId: UUID): Promise<SagaStepLog[]> {
    const { data, error } = await supabase
      .from('saga_step_log')
      .select('*')
      .eq('saga_id', sagaId)
      .order('started_at', { ascending: true });

    if (error) {
      throw new SagaError(
        'Failed to fetch saga steps',
        'SAGA_STEPS_FETCH_FAILED',
        { sagaId, error: error.message }
      );
    }

    return (data || []).map(this.mapDbToSagaStepLog);
  }

  /**
   * Get all running sagas for this organization
   */
  async getRunningSagas(): Promise<SagaState[]> {
    const { data, error } = await supabase
      .from('saga_state')
      .select('*')
      .eq('organization_id', this.organizationId)
      .in('status', ['running', 'compensating'])
      .order('created_at', { ascending: false });

    if (error) {
      throw new SagaError(
        'Failed to fetch running sagas',
        'SAGA_FETCH_FAILED',
        { error: error.message }
      );
    }

    return (data || []).map(this.mapDbToSagaState);
  }

  /**
   * Log a saga step (internal use)
   */
  private async logStep(
    sagaId: UUID,
    stepName: string,
    stepType: 'forward' | 'compensation',
    status: 'started' | 'completed' | 'failed',
    inputPayload?: unknown,
    outputPayload?: unknown,
    errorMessage?: string
  ): Promise<void> {
    const { error } = await supabase.from('saga_step_log').insert({
      saga_id: sagaId,
      step_name: stepName,
      step_type: stepType,
      status: status,
      input_payload: inputPayload,
      output_payload: outputPayload,
      error_message: errorMessage,
      completed_at: status !== 'started' ? new Date().toISOString() : null,
    });

    if (error) {
      console.error('Failed to log saga step:', error.message);
    }
  }

  private mapDbToSagaState(row: Record<string, unknown>): SagaState {
    return {
      id: row.id as string,
      organizationId: row.organization_id as string,
      sagaName: row.saga_name as SagaName,
      sagaVersion: row.saga_version as number,
      currentStep: row.current_step as string,
      status: row.status as SagaStatus,
      stepsCompleted: row.steps_completed as string[],
      compensationSteps: row.compensation_steps as string[],
      payload: row.payload,
      result: row.result,
      errorMessage: row.error_message as string | undefined,
      errorStep: row.error_step as string | undefined,
      retryCount: row.retry_count as number,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      lastHeartbeat: row.last_heartbeat as string,
      timeoutAt: row.timeout_at as string | undefined,
      completedAt: row.completed_at as string | undefined,
      traceId: row.trace_id as string,
      initiatedBy: row.initiated_by as string | undefined,
    };
  }

  private mapDbToSagaStepLog(row: Record<string, unknown>): SagaStepLog {
    return {
      id: row.id as number,
      sagaId: row.saga_id as string,
      stepName: row.step_name as string,
      stepType: row.step_type as 'forward' | 'compensation',
      status: row.status as 'started' | 'completed' | 'failed',
      inputPayload: row.input_payload,
      outputPayload: row.output_payload,
      errorMessage: row.error_message as string | undefined,
      startedAt: row.started_at as string,
      completedAt: row.completed_at as string | undefined,
      durationMs: row.duration_ms as number | undefined,
    };
  }
}

/**
 * Custom error class for saga-related errors
 */
export class SagaError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'SagaError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Factory function for creating SagaOrchestrator
 */
export function createSagaOrchestrator(organizationId: string): ISagaOrchestrator {
  return new SagaOrchestrator(organizationId);
}
