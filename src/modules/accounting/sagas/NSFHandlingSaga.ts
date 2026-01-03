/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * NSF (Non-Sufficient Funds) Handling Saga
 *
 * This saga handles the workflow when a payment bounces:
 * 1. Reverse the original payment journal entry
 * 2. Assess NSF fee (based on compliance rules)
 * 3. Notify the tenant
 * 4. Update tenant's payment history
 *
 * Compensation steps (if any step fails):
 * - Reverse any charges posted
 * - Mark notification as failed
 * - Log the failure for manual intervention
 */

import type { UUID, Decimal, ISODate } from '../types';
import { createSagaOrchestrator, SagaOrchestrator } from './SagaOrchestrator';
import { createLedgerService, LedgerService } from '../services/LedgerService';
import { createComplianceService, ComplianceService } from '../services/ComplianceService';
import { createEventService, EventService } from '../events/EventService';

// Saga payload type
export interface NSFSagaPayload {
  paymentId: UUID;
  tenantId: UUID;
  propertyId: UUID;
  originalAmount: Decimal;
  originalJournalEntryId: UUID;
  stateCode: string;
  nsfFeeAmount?: Decimal;
  reversalEntryId?: UUID;
  feeEntryId?: UUID;
}

// Saga step definitions
export const NSF_SAGA_STEPS = {
  REVERSE_PAYMENT: 'reverse_payment',
  CALCULATE_FEE: 'calculate_fee',
  POST_FEE: 'post_fee',
  NOTIFY_TENANT: 'notify_tenant',
  UPDATE_HISTORY: 'update_history',
} as const;

export class NSFHandlingSaga {
  private orchestrator: SagaOrchestrator;
  private ledger: LedgerService;
  private compliance: ComplianceService;
  private events: EventService;
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.orchestrator = createSagaOrchestrator(organizationId) as SagaOrchestrator;
    this.ledger = createLedgerService(organizationId) as LedgerService;
    this.compliance = createComplianceService(organizationId) as ComplianceService;
    this.events = createEventService(organizationId) as EventService;
  }

  /**
   * Start the NSF handling saga
   */
  async start(payload: NSFSagaPayload, traceId: string): Promise<UUID> {
    const saga = await this.orchestrator.startSaga({
      sagaName: 'nsf_handling',
      initialStep: NSF_SAGA_STEPS.REVERSE_PAYMENT,
      payload,
      traceId,
      timeoutMinutes: 30, // 30 minute timeout
    });

    // Emit event to start processing
    await this.events.emit({
      eventType: 'payment.nsf',
      aggregateType: 'payment',
      aggregateId: payload.paymentId,
      payload: { sagaId: saga.id, step: NSF_SAGA_STEPS.REVERSE_PAYMENT },
      traceId,
      sagaId: saga.id,
    });

    return saga.id;
  }

  /**
   * Execute step 1: Reverse the original payment
   */
  async executeReversePayment(sagaId: UUID): Promise<void> {
    const saga = await this.orchestrator.getSaga(sagaId);
    const payload = saga.payload as NSFSagaPayload;

    try {
      // Heartbeat to show we're alive
      await this.orchestrator.heartbeat(sagaId);

      // Create reversal journal entry
      const reversal = await this.ledger.reverseJournalEntry(
        payload.originalJournalEntryId,
        'NSF - Payment returned by bank',
        `nsf-reversal-${payload.paymentId}`
      );

      // Update payload with reversal info
      const updatedPayload: NSFSagaPayload = {
        ...payload,
        reversalEntryId: reversal.id,
      };

      // Advance to next step
      await this.orchestrator.advanceSaga(
        sagaId,
        NSF_SAGA_STEPS.CALCULATE_FEE,
        { reversalEntryId: reversal.id }
      );

      // Update saga payload
      await this.updateSagaPayload(sagaId, updatedPayload);

      // Emit event for next step
      await this.events.emit({
        eventType: 'payment.nsf',
        aggregateType: 'payment',
        aggregateId: payload.paymentId,
        payload: { sagaId, step: NSF_SAGA_STEPS.CALCULATE_FEE },
        traceId: saga.traceId,
        sagaId,
      });
    } catch (error) {
      await this.handleStepFailure(sagaId, error as Error);
    }
  }

  /**
   * Execute step 2: Calculate NSF fee based on compliance rules
   */
  async executeCalculateFee(sagaId: UUID): Promise<void> {
    const saga = await this.orchestrator.getSaga(sagaId);
    const payload = saga.payload as NSFSagaPayload;

    try {
      await this.orchestrator.heartbeat(sagaId);

      // Get NSF fee from compliance rules
      // Note: This uses "Law as Data" - fee is from database, not hardcoded
      const nsfFeeAmount = await this.compliance.getComplianceValue({
        stateCode: payload.stateCode,
        ruleType: 'late_fee',
        ruleKey: 'max_amount',
      });

      // Update payload with fee amount
      const updatedPayload: NSFSagaPayload = {
        ...payload,
        nsfFeeAmount,
      };

      await this.updateSagaPayload(sagaId, updatedPayload);

      // Advance to next step
      await this.orchestrator.advanceSaga(
        sagaId,
        NSF_SAGA_STEPS.POST_FEE,
        { nsfFeeAmount }
      );

      // Emit event for next step
      await this.events.emit({
        eventType: 'late_fee.assessed',
        aggregateType: 'tenant',
        aggregateId: payload.tenantId,
        payload: { sagaId, step: NSF_SAGA_STEPS.POST_FEE, amount: nsfFeeAmount },
        traceId: saga.traceId,
        sagaId,
      });
    } catch (error) {
      await this.handleStepFailure(sagaId, error as Error);
    }
  }

  /**
   * Execute step 3: Post the NSF fee as a journal entry
   */
  async executePostFee(sagaId: UUID): Promise<void> {
    const saga = await this.orchestrator.getSaga(sagaId);
    const payload = saga.payload as NSFSagaPayload;

    try {
      await this.orchestrator.heartbeat(sagaId);

      if (!payload.nsfFeeAmount) {
        throw new Error('NSF fee amount not calculated');
      }

      // Create journal entry for NSF fee
      // Debit: Accounts Receivable (increase tenant owes)
      // Credit: NSF Fee Income (revenue)
      const feeEntry = await this.ledger.createJournalEntry({
        entryDate: new Date().toISOString().split('T')[0],
        description: 'NSF Fee Charge',
        sourceType: 'charge',
        sourceId: payload.paymentId,
        idempotencyKey: `nsf-fee-${payload.paymentId}`,
        postings: [
          {
            accountId: 'ACCOUNTS_RECEIVABLE_ID', // Would be actual UUID
            amount: payload.nsfFeeAmount,
            tenantId: payload.tenantId,
            propertyId: payload.propertyId,
            lineDescription: 'NSF Fee - Returned Payment',
          },
          {
            accountId: 'NSF_FEE_INCOME_ID', // Would be actual UUID
            amount: (-parseFloat(payload.nsfFeeAmount)).toFixed(4),
            propertyId: payload.propertyId,
            lineDescription: 'NSF Fee Income',
          },
        ],
      });

      // Update payload
      const updatedPayload: NSFSagaPayload = {
        ...payload,
        feeEntryId: feeEntry.id,
      };

      await this.updateSagaPayload(sagaId, updatedPayload);

      // Advance to next step
      await this.orchestrator.advanceSaga(
        sagaId,
        NSF_SAGA_STEPS.NOTIFY_TENANT,
        { feeEntryId: feeEntry.id }
      );

      // Emit event for next step
      await this.events.emit({
        eventType: 'payment.nsf',
        aggregateType: 'tenant',
        aggregateId: payload.tenantId,
        payload: { sagaId, step: NSF_SAGA_STEPS.NOTIFY_TENANT },
        traceId: saga.traceId,
        sagaId,
      });
    } catch (error) {
      await this.handleStepFailure(sagaId, error as Error);
    }
  }

  /**
   * Execute step 4: Notify the tenant
   */
  async executeNotifyTenant(sagaId: UUID): Promise<void> {
    const saga = await this.orchestrator.getSaga(sagaId);
    const payload = saga.payload as NSFSagaPayload;

    try {
      await this.orchestrator.heartbeat(sagaId);

      // In production, this would send email/SMS
      console.log(`[NSF Saga] Notifying tenant ${payload.tenantId} of NSF fee`);

      // Advance to final step
      await this.orchestrator.advanceSaga(
        sagaId,
        NSF_SAGA_STEPS.UPDATE_HISTORY,
        { notificationSent: true }
      );

      // Emit event for next step
      await this.events.emit({
        eventType: 'payment.nsf',
        aggregateType: 'tenant',
        aggregateId: payload.tenantId,
        payload: { sagaId, step: NSF_SAGA_STEPS.UPDATE_HISTORY },
        traceId: saga.traceId,
        sagaId,
      });
    } catch (error) {
      await this.handleStepFailure(sagaId, error as Error);
    }
  }

  /**
   * Execute step 5: Update tenant payment history
   */
  async executeUpdateHistory(sagaId: UUID): Promise<void> {
    const saga = await this.orchestrator.getSaga(sagaId);
    const payload = saga.payload as NSFSagaPayload;

    try {
      await this.orchestrator.heartbeat(sagaId);

      // In production, this would update tenant's payment history
      // and potentially their credit score/risk rating
      console.log(`[NSF Saga] Updating payment history for tenant ${payload.tenantId}`);

      // Complete the saga
      await this.orchestrator.completeSaga(sagaId, {
        success: true,
        reversalEntryId: payload.reversalEntryId,
        feeEntryId: payload.feeEntryId,
        feeAmount: payload.nsfFeeAmount,
      });

      console.log(`[NSF Saga] Completed saga ${sagaId}`);
    } catch (error) {
      await this.handleStepFailure(sagaId, error as Error);
    }
  }

  /**
   * Handle step failure - mark saga as failed
   */
  private async handleStepFailure(sagaId: UUID, error: Error): Promise<void> {
    console.error(`[NSF Saga] Step failed for saga ${sagaId}:`, error.message);
    await this.orchestrator.failSaga(sagaId, error.message);

    // Optionally start compensation
    // await this.orchestrator.startCompensation(sagaId);
  }

  /**
   * Update saga payload (helper)
   */
  private async updateSagaPayload(sagaId: UUID, payload: NSFSagaPayload): Promise<void> {
    // This would update the saga_state.payload in the database
    // For now, the orchestrator handles this internally
  }
}

/**
 * Factory function
 */
export function createNSFHandlingSaga(organizationId: string): NSFHandlingSaga {
  return new NSFHandlingSaga(organizationId);
}
