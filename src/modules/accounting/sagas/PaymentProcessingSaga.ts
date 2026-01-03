/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * PaymentProcessingSaga - Rent Payment Workflow
 *
 * TITANIUM RULES ENFORCED:
 * 1. Immutable Ledger - All payments create journal entries, never modified
 * 2. Double-Entry Only - Debit Cash, Credit Receivable
 * 3. Law as Data - Late fee calculation from compliance_rules
 * 4. O(1) Reads - Balance updates via triggers
 *
 * SAGA STEPS:
 * 1. RECORD_PAYMENT - Create journal entry for payment receipt
 * 2. APPLY_TO_CHARGES - Apply payment to oldest charges first (compliance-driven)
 * 3. CALCULATE_FEES - Apply late fees if applicable
 * 4. UPDATE_BALANCES - Trigger balance recalculation
 * 5. NOTIFY_EXTERNAL - Webhook/notification to external systems
 */

import { supabase } from '@/lib/supabase';
import type { Decimal, ISODate, UUID, JournalPostingInput } from '../types';
import { LedgerService, createLedgerService } from '../services/LedgerService';
import { ComplianceService, createComplianceService } from '../services/ComplianceService';
import { EventService, createEventService } from '../events/EventService';
import { SagaOrchestrator, createSagaOrchestrator } from './SagaOrchestrator';

export const PAYMENT_SAGA_STEPS = [
  'RECORD_PAYMENT',
  'APPLY_TO_CHARGES',
  'CALCULATE_FEES',
  'UPDATE_BALANCES',
  'NOTIFY_EXTERNAL',
] as const;

export type PaymentSagaStep = (typeof PAYMENT_SAGA_STEPS)[number];

export interface PaymentSagaPayload {
  paymentId: UUID;
  tenantId: UUID;
  propertyId: UUID;
  leaseId: UUID;
  amount: Decimal;
  paymentDate: ISODate;
  paymentMethod: 'ach' | 'check' | 'credit_card' | 'cash' | 'money_order';
  externalReference?: string;
  memo?: string;
  // Populated during saga execution
  journalEntryId?: UUID;
  appliedCharges?: AppliedCharge[];
  lateFeeAssessed?: Decimal;
  remainingCredit?: Decimal;
}

export interface AppliedCharge {
  chargeId: UUID;
  chargeType: string;
  originalAmount: Decimal;
  amountApplied: Decimal;
  remainingBalance: Decimal;
  chargeDate: ISODate;
}

export class PaymentProcessingSaga {
  private organizationId: string;
  private ledger: LedgerService;
  private compliance: ComplianceService;
  private events: EventService;
  private orchestrator: SagaOrchestrator;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.ledger = createLedgerService(organizationId);
    this.compliance = createComplianceService(organizationId);
    this.events = createEventService(organizationId);
    this.orchestrator = createSagaOrchestrator(organizationId);
  }

  /**
   * Start a new payment processing saga
   */
  async startPaymentSaga(payload: PaymentSagaPayload): Promise<{
    sagaId: UUID;
    success: boolean;
    error?: string;
  }> {
    try {
      // Validate payment amount
      if (parseFloat(payload.amount) <= 0) {
        throw new PaymentSagaError(
          'Payment amount must be positive',
          'INVALID_AMOUNT'
        );
      }

      // Check for duplicate payment (idempotency)
      if (payload.externalReference) {
        const { data: existing } = await supabase
          .from('idempotency_keys')
          .select('response')
          .eq('key', `payment:${payload.externalReference}`)
          .single();

        if (existing) {
          console.log('[PaymentSaga] Duplicate payment detected, returning existing result');
          return existing.response as { sagaId: UUID; success: boolean };
        }
      }

      // Start the saga
      const sagaId = await this.orchestrator.startSaga(
        'PAYMENT_PROCESSING',
        payload,
        PAYMENT_SAGA_STEPS as unknown as string[]
      );

      // Execute first step
      await this.executeStep(sagaId, 'RECORD_PAYMENT', payload);

      // Store idempotency key
      if (payload.externalReference) {
        await supabase.from('idempotency_keys').insert({
          key: `payment:${payload.externalReference}`,
          response: { sagaId, success: true },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      return { sagaId, success: true };
    } catch (error) {
      console.error('[PaymentSaga] Failed to start payment saga:', error);
      return {
        sagaId: '' as UUID,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a specific saga step
   */
  async executeStep(
    sagaId: UUID,
    step: PaymentSagaStep,
    payload: PaymentSagaPayload
  ): Promise<PaymentSagaPayload> {
    // Update heartbeat
    await this.orchestrator.heartbeat(sagaId);

    try {
      let updatedPayload: PaymentSagaPayload;

      switch (step) {
        case 'RECORD_PAYMENT':
          updatedPayload = await this.recordPayment(sagaId, payload);
          break;
        case 'APPLY_TO_CHARGES':
          updatedPayload = await this.applyToCharges(sagaId, payload);
          break;
        case 'CALCULATE_FEES':
          updatedPayload = await this.calculateFees(sagaId, payload);
          break;
        case 'UPDATE_BALANCES':
          updatedPayload = await this.updateBalances(sagaId, payload);
          break;
        case 'NOTIFY_EXTERNAL':
          updatedPayload = await this.notifyExternal(sagaId, payload);
          break;
        default:
          throw new PaymentSagaError(`Unknown step: ${step}`, 'UNKNOWN_STEP');
      }

      // Advance to next step
      const currentIndex = PAYMENT_SAGA_STEPS.indexOf(step);
      if (currentIndex < PAYMENT_SAGA_STEPS.length - 1) {
        const nextStep = PAYMENT_SAGA_STEPS[currentIndex + 1];
        await this.orchestrator.advanceSaga(sagaId, nextStep, updatedPayload);

        // Emit event for next step
        await this.events.emit({
          eventType: 'saga.step.ready',
          payload: {
            sagaId,
            sagaType: 'PAYMENT_PROCESSING',
            step: nextStep,
            payload: updatedPayload,
          },
        });
      } else {
        // Saga complete
        await this.orchestrator.completeSaga(sagaId, updatedPayload);

        // Emit completion event
        await this.events.emit({
          eventType: 'payment.processed',
          payload: {
            paymentId: payload.paymentId,
            tenantId: payload.tenantId,
            propertyId: payload.propertyId,
            amount: payload.amount,
            journalEntryId: updatedPayload.journalEntryId,
            appliedCharges: updatedPayload.appliedCharges,
            lateFeeAssessed: updatedPayload.lateFeeAssessed,
          },
        });
      }

      return updatedPayload;
    } catch (error) {
      console.error(`[PaymentSaga] Step ${step} failed:`, error);

      // Start compensation
      await this.orchestrator.failSaga(
        sagaId,
        error instanceof Error ? error.message : 'Unknown error'
      );
      await this.compensate(sagaId, step, payload);

      throw error;
    }
  }

  /**
   * Step 1: Record Payment
   * Create journal entry: Debit Cash, Credit A/R
   */
  private async recordPayment(
    sagaId: UUID,
    payload: PaymentSagaPayload
  ): Promise<PaymentSagaPayload> {
    console.log(`[PaymentSaga:${sagaId}] Recording payment of ${payload.amount}`);

    // Get account IDs
    const { cashAccountId, receivableAccountId } = await this.getPaymentAccounts(
      payload.propertyId
    );

    // Create journal entry
    const postings: JournalPostingInput[] = [
      {
        accountId: cashAccountId,
        amount: payload.amount, // Debit (positive)
        propertyId: payload.propertyId,
        tenantId: payload.tenantId,
        description: `Payment received - ${payload.paymentMethod}`,
      },
      {
        accountId: receivableAccountId,
        amount: (-parseFloat(payload.amount)).toFixed(4) as Decimal, // Credit (negative)
        propertyId: payload.propertyId,
        tenantId: payload.tenantId,
        description: `Payment applied to tenant account`,
      },
    ];

    const journalEntry = await this.ledger.createJournalEntry({
      entryDate: payload.paymentDate,
      entryType: 'payment',
      description: `Rent payment - ${payload.memo || payload.paymentMethod}`,
      postings,
      metadata: {
        paymentId: payload.paymentId,
        paymentMethod: payload.paymentMethod,
        externalReference: payload.externalReference,
        sagaId,
      },
    });

    return {
      ...payload,
      journalEntryId: journalEntry.id,
    };
  }

  /**
   * Step 2: Apply to Charges
   * FIFO application - oldest charges first (compliance-driven)
   */
  private async applyToCharges(
    sagaId: UUID,
    payload: PaymentSagaPayload
  ): Promise<PaymentSagaPayload> {
    console.log(`[PaymentSaga:${sagaId}] Applying payment to charges`);

    // Get outstanding charges for tenant, ordered by date (FIFO)
    const { data: charges, error } = await supabase
      .from('tenant_charges')
      .select('*')
      .eq('tenant_id', payload.tenantId)
      .eq('property_id', payload.propertyId)
      .gt('balance_due', 0)
      .order('charge_date', { ascending: true });

    if (error) {
      throw new PaymentSagaError(
        `Failed to fetch charges: ${error.message}`,
        'FETCH_CHARGES_FAILED'
      );
    }

    let remainingPayment = parseFloat(payload.amount);
    const appliedCharges: AppliedCharge[] = [];

    for (const charge of charges || []) {
      if (remainingPayment <= 0) break;

      const balanceDue = parseFloat(charge.balance_due);
      const amountToApply = Math.min(remainingPayment, balanceDue);

      // Update charge balance
      const { error: updateError } = await supabase
        .from('tenant_charges')
        .update({
          balance_due: (balanceDue - amountToApply).toFixed(2),
          last_payment_date: payload.paymentDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', charge.id);

      if (updateError) {
        throw new PaymentSagaError(
          `Failed to update charge: ${updateError.message}`,
          'UPDATE_CHARGE_FAILED'
        );
      }

      // Record payment allocation
      await supabase.from('payment_allocations').insert({
        payment_id: payload.paymentId,
        charge_id: charge.id,
        amount_applied: amountToApply.toFixed(2),
        applied_date: payload.paymentDate,
        journal_entry_id: payload.journalEntryId,
      });

      appliedCharges.push({
        chargeId: charge.id,
        chargeType: charge.charge_type,
        originalAmount: charge.amount,
        amountApplied: amountToApply.toFixed(4) as Decimal,
        remainingBalance: (balanceDue - amountToApply).toFixed(4) as Decimal,
        chargeDate: charge.charge_date,
      });

      remainingPayment -= amountToApply;
    }

    return {
      ...payload,
      appliedCharges,
      remainingCredit: remainingPayment > 0.01
        ? (remainingPayment.toFixed(4) as Decimal)
        : ('0.0000' as Decimal),
    };
  }

  /**
   * Step 3: Calculate Fees
   * Apply late fees if payment is past grace period (compliance-driven)
   */
  private async calculateFees(
    sagaId: UUID,
    payload: PaymentSagaPayload
  ): Promise<PaymentSagaPayload> {
    console.log(`[PaymentSaga:${sagaId}] Calculating fees`);

    // Get compliance values
    const gracePeriod = await this.compliance.getGracePeriodDays();
    const lateFeePercent = await this.compliance.getLateFeePercent();
    const lateFeeMaximum = await this.compliance.getLateFeeMaximum();

    // Check if any applied charges were past grace period
    let totalLateFee = 0;

    for (const charge of payload.appliedCharges || []) {
      const chargeDate = new Date(charge.chargeDate);
      const paymentDate = new Date(payload.paymentDate);
      const daysPastDue = Math.floor(
        (paymentDate.getTime() - chargeDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysPastDue > gracePeriod) {
        // Calculate late fee
        const chargeAmount = parseFloat(charge.originalAmount);
        let lateFee = chargeAmount * (lateFeePercent / 100);

        // Apply maximum cap if set
        if (lateFeeMaximum && lateFee > lateFeeMaximum) {
          lateFee = lateFeeMaximum;
        }

        totalLateFee += lateFee;
      }
    }

    if (totalLateFee > 0) {
      // Create late fee charge
      const { lateFeeAccountId, receivableAccountId } = await this.getLateFeeAccounts(
        payload.propertyId
      );

      // Create late fee journal entry
      await this.ledger.createJournalEntry({
        entryDate: payload.paymentDate,
        entryType: 'late_fee',
        description: `Late fee assessed`,
        postings: [
          {
            accountId: receivableAccountId,
            amount: totalLateFee.toFixed(4) as Decimal,
            propertyId: payload.propertyId,
            tenantId: payload.tenantId,
            description: 'Late fee assessed',
          },
          {
            accountId: lateFeeAccountId,
            amount: (-totalLateFee).toFixed(4) as Decimal,
            propertyId: payload.propertyId,
            tenantId: payload.tenantId,
            description: 'Late fee revenue',
          },
        ],
        metadata: {
          paymentId: payload.paymentId,
          sagaId,
          gracePeriod,
          lateFeePercent,
        },
      });

      // Create charge record
      await supabase.from('tenant_charges').insert({
        tenant_id: payload.tenantId,
        property_id: payload.propertyId,
        lease_id: payload.leaseId,
        charge_type: 'late_fee',
        amount: totalLateFee.toFixed(2),
        balance_due: totalLateFee.toFixed(2),
        charge_date: payload.paymentDate,
        description: 'Late payment fee',
      });

      // Emit late fee event
      await this.events.emit({
        eventType: 'late_fee.assessed',
        payload: {
          tenantId: payload.tenantId,
          propertyId: payload.propertyId,
          amount: totalLateFee.toFixed(2),
          paymentId: payload.paymentId,
        },
      });
    }

    return {
      ...payload,
      lateFeeAssessed: totalLateFee > 0
        ? (totalLateFee.toFixed(4) as Decimal)
        : ('0.0000' as Decimal),
    };
  }

  /**
   * Step 4: Update Balances
   * Trigger balance recalculation (handled by DB triggers, this is a verification step)
   */
  private async updateBalances(
    sagaId: UUID,
    payload: PaymentSagaPayload
  ): Promise<PaymentSagaPayload> {
    console.log(`[PaymentSaga:${sagaId}] Verifying balance updates`);

    // Get current tenant balance
    const { data: tenantBalance } = await supabase
      .from('dimensional_balances')
      .select('balance')
      .eq('tenant_id', payload.tenantId)
      .eq('property_id', payload.propertyId)
      .single();

    console.log(
      `[PaymentSaga:${sagaId}] Tenant balance: ${tenantBalance?.balance || '0.00'}`
    );

    // Handle remaining credit if any
    if (parseFloat(payload.remainingCredit || '0') > 0.01) {
      // Record credit on tenant account
      await supabase.from('tenant_credits').insert({
        tenant_id: payload.tenantId,
        property_id: payload.propertyId,
        amount: payload.remainingCredit,
        credit_date: payload.paymentDate,
        source_payment_id: payload.paymentId,
        description: 'Overpayment credit',
      });

      await this.events.emit({
        eventType: 'tenant.credit.created',
        payload: {
          tenantId: payload.tenantId,
          propertyId: payload.propertyId,
          amount: payload.remainingCredit,
          paymentId: payload.paymentId,
        },
      });
    }

    return payload;
  }

  /**
   * Step 5: Notify External
   * Send webhooks and notifications
   */
  private async notifyExternal(
    sagaId: UUID,
    payload: PaymentSagaPayload
  ): Promise<PaymentSagaPayload> {
    console.log(`[PaymentSaga:${sagaId}] Sending notifications`);

    // Queue tenant notification
    await this.events.emit({
      eventType: 'notification.send',
      payload: {
        type: 'payment_received',
        recipientType: 'tenant',
        recipientId: payload.tenantId,
        data: {
          amount: payload.amount,
          paymentDate: payload.paymentDate,
          paymentMethod: payload.paymentMethod,
          appliedTo: payload.appliedCharges?.length || 0,
          remainingCredit: payload.remainingCredit,
        },
      },
    });

    // Queue property manager notification
    await this.events.emit({
      eventType: 'notification.send',
      payload: {
        type: 'payment_received',
        recipientType: 'property_manager',
        propertyId: payload.propertyId,
        data: {
          tenantId: payload.tenantId,
          amount: payload.amount,
          paymentDate: payload.paymentDate,
        },
      },
    });

    // Queue webhook if configured
    await this.events.emit({
      eventType: 'webhook.send',
      payload: {
        event: 'payment.completed',
        data: {
          paymentId: payload.paymentId,
          tenantId: payload.tenantId,
          propertyId: payload.propertyId,
          amount: payload.amount,
          journalEntryId: payload.journalEntryId,
          appliedCharges: payload.appliedCharges,
          lateFeeAssessed: payload.lateFeeAssessed,
          remainingCredit: payload.remainingCredit,
          processedAt: new Date().toISOString(),
        },
      },
    });

    return payload;
  }

  /**
   * Compensation: Reverse completed steps on failure
   */
  private async compensate(
    sagaId: UUID,
    failedStep: PaymentSagaStep,
    payload: PaymentSagaPayload
  ): Promise<void> {
    console.log(`[PaymentSaga:${sagaId}] Starting compensation from step: ${failedStep}`);

    await this.orchestrator.startCompensation(sagaId);

    const stepIndex = PAYMENT_SAGA_STEPS.indexOf(failedStep);

    // Compensate in reverse order
    for (let i = stepIndex - 1; i >= 0; i--) {
      const step = PAYMENT_SAGA_STEPS[i];

      try {
        switch (step) {
          case 'RECORD_PAYMENT':
            if (payload.journalEntryId) {
              // Reverse the journal entry
              await this.ledger.reverseJournalEntry(
                payload.journalEntryId,
                payload.paymentDate,
                'Payment saga compensation'
              );
            }
            break;

          case 'APPLY_TO_CHARGES':
            // Restore charge balances
            for (const charge of payload.appliedCharges || []) {
              await supabase
                .from('tenant_charges')
                .update({
                  balance_due: parseFloat(charge.remainingBalance) + parseFloat(charge.amountApplied),
                })
                .eq('id', charge.chargeId);

              // Delete payment allocation
              await supabase
                .from('payment_allocations')
                .delete()
                .eq('payment_id', payload.paymentId)
                .eq('charge_id', charge.chargeId);
            }
            break;

          case 'CALCULATE_FEES':
            // Late fee reversal would be handled by reversing the journal entry
            // No additional compensation needed
            break;
        }

        console.log(`[PaymentSaga:${sagaId}] Compensated step: ${step}`);
      } catch (error) {
        console.error(`[PaymentSaga:${sagaId}] Compensation failed for step ${step}:`, error);
        // Continue with other compensations
      }
    }

    // Emit compensation complete event
    await this.events.emit({
      eventType: 'payment.compensation.completed',
      payload: {
        sagaId,
        paymentId: payload.paymentId,
        failedStep,
      },
    });
  }

  // Helper methods

  private async getPaymentAccounts(propertyId: UUID): Promise<{
    cashAccountId: UUID;
    receivableAccountId: UUID;
  }> {
    // Get trust bank account (cash)
    const { data: cashAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'trust_bank')
      .single();

    // Get accounts receivable
    const { data: arAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'accounts_receivable')
      .single();

    if (!cashAccount || !arAccount) {
      throw new PaymentSagaError(
        'Required accounts not found',
        'ACCOUNTS_NOT_FOUND'
      );
    }

    return {
      cashAccountId: cashAccount.id,
      receivableAccountId: arAccount.id,
    };
  }

  private async getLateFeeAccounts(propertyId: UUID): Promise<{
    lateFeeAccountId: UUID;
    receivableAccountId: UUID;
  }> {
    // Get late fee revenue account
    const { data: lateFeeAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'late_fee_income')
      .single();

    // Get accounts receivable
    const { data: arAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'accounts_receivable')
      .single();

    if (!lateFeeAccount || !arAccount) {
      throw new PaymentSagaError(
        'Late fee accounts not found',
        'ACCOUNTS_NOT_FOUND'
      );
    }

    return {
      lateFeeAccountId: lateFeeAccount.id,
      receivableAccountId: arAccount.id,
    };
  }
}

export class PaymentSagaError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'PaymentSagaError';
    this.code = code;
  }
}

export function createPaymentProcessingSaga(organizationId: string): PaymentProcessingSaga {
  return new PaymentProcessingSaga(organizationId);
}
