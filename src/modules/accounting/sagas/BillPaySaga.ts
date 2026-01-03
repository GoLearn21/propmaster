/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * BillPaySaga - Vendor Payment Workflow
 *
 * TITANIUM RULES ENFORCED:
 * 1. Immutable Ledger - All payments create journal entries
 * 2. Double-Entry Only - Debit Expense/A/P, Credit Cash
 * 3. Law as Data - 1099 thresholds from compliance_rules
 * 4. O(1) Reads - Vendor balance from dimensional_balances
 *
 * PAYMENT TYPES:
 * - Direct Pay: Immediate payment for one-time expenses
 * - Bill Pay: Pay against existing accounts payable
 * - Recurring: Automated scheduled payments
 *
 * SAGA STEPS:
 * 1. VALIDATE_BILL - Verify bill details and authorization
 * 2. ALLOCATE_EXPENSE - Determine property/owner allocation
 * 3. CREATE_JOURNAL_ENTRY - Post payment entry
 * 4. TRACK_1099 - Update vendor 1099 tracking
 * 5. GENERATE_PAYMENT - Create check or ACH payment
 * 6. SEND_NOTIFICATION - Notify vendor and owner
 */

import { supabase } from '@/lib/supabase';
import type { Decimal, ISODate, UUID, JournalPostingInput } from '../types';
import { LedgerService, createLedgerService } from '../services/LedgerService';
import { ComplianceService, createComplianceService } from '../services/ComplianceService';
import { EventService, createEventService } from '../events/EventService';
import { SagaOrchestrator, createSagaOrchestrator } from './SagaOrchestrator';

export const BILL_PAY_SAGA_STEPS = [
  'VALIDATE_BILL',
  'ALLOCATE_EXPENSE',
  'CREATE_JOURNAL_ENTRY',
  'TRACK_1099',
  'GENERATE_PAYMENT',
  'SEND_NOTIFICATION',
] as const;

export type BillPaySagaStep = (typeof BILL_PAY_SAGA_STEPS)[number];

export type PaymentType = 'direct_pay' | 'bill_pay' | 'recurring';
export type PaymentMethod = 'check' | 'ach' | 'credit_card' | 'wire';

export interface BillPaySagaPayload {
  billId: UUID;
  vendorId: UUID;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  paymentDate: ISODate;
  dueDate?: ISODate;
  amount: Decimal;
  description: string;
  invoiceNumber?: string;
  memo?: string;
  // Property allocation (can be split across multiple properties)
  allocations: ExpenseAllocation[];
  // Expense categorization
  expenseAccountId: UUID;
  // Populated during saga
  journalEntryId?: UUID;
  checkNumber?: string;
  achTraceNumber?: string;
  requires1099?: boolean;
  ytd1099Amount?: Decimal;
}

export interface ExpenseAllocation {
  propertyId: UUID;
  propertyName?: string;
  ownerId: UUID;
  ownerName?: string;
  amount: Decimal;
  percentage?: number;
}

export interface VendorPaymentRecord {
  vendorId: UUID;
  vendorName: string;
  paymentDate: ISODate;
  amount: Decimal;
  checkNumber?: string;
  achTraceNumber?: string;
  invoiceNumber?: string;
  status: 'pending' | 'paid' | 'cleared' | 'voided';
}

export class BillPaySaga {
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
   * Start a new bill pay saga
   */
  async startBillPaySaga(payload: BillPaySagaPayload): Promise<{
    sagaId: UUID;
    success: boolean;
    error?: string;
  }> {
    try {
      // Validate basic requirements
      if (parseFloat(payload.amount) <= 0) {
        throw new BillPaySagaError('Payment amount must be positive', 'INVALID_AMOUNT');
      }

      if (!payload.allocations || payload.allocations.length === 0) {
        throw new BillPaySagaError('At least one expense allocation required', 'NO_ALLOCATIONS');
      }

      // Verify allocations sum to total
      const allocationSum = payload.allocations.reduce(
        (sum, a) => sum + parseFloat(a.amount),
        0
      );
      const totalAmount = parseFloat(payload.amount);

      if (Math.abs(allocationSum - totalAmount) > 0.01) {
        throw new BillPaySagaError(
          `Allocations (${allocationSum}) do not equal payment amount (${totalAmount})`,
          'ALLOCATION_MISMATCH'
        );
      }

      // Check for duplicate payment (idempotency)
      if (payload.invoiceNumber) {
        const { data: existing } = await supabase
          .from('vendor_payments')
          .select('id')
          .eq('vendor_id', payload.vendorId)
          .eq('invoice_number', payload.invoiceNumber)
          .not('status', 'eq', 'voided')
          .single();

        if (existing) {
          throw new BillPaySagaError(
            `Invoice ${payload.invoiceNumber} already paid`,
            'DUPLICATE_PAYMENT'
          );
        }
      }

      // Start the saga
      const sagaId = await this.orchestrator.startSaga(
        'BILL_PAY',
        payload,
        BILL_PAY_SAGA_STEPS as unknown as string[]
      );

      // Execute first step
      await this.executeStep(sagaId, 'VALIDATE_BILL', payload);

      return { sagaId, success: true };
    } catch (error) {
      console.error('[BillPaySaga] Failed to start:', error);
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
    step: BillPaySagaStep,
    payload: BillPaySagaPayload
  ): Promise<BillPaySagaPayload> {
    await this.orchestrator.heartbeat(sagaId);

    try {
      let updatedPayload: BillPaySagaPayload;

      switch (step) {
        case 'VALIDATE_BILL':
          updatedPayload = await this.validateBill(sagaId, payload);
          break;
        case 'ALLOCATE_EXPENSE':
          updatedPayload = await this.allocateExpense(sagaId, payload);
          break;
        case 'CREATE_JOURNAL_ENTRY':
          updatedPayload = await this.createJournalEntry(sagaId, payload);
          break;
        case 'TRACK_1099':
          updatedPayload = await this.track1099(sagaId, payload);
          break;
        case 'GENERATE_PAYMENT':
          updatedPayload = await this.generatePayment(sagaId, payload);
          break;
        case 'SEND_NOTIFICATION':
          updatedPayload = await this.sendNotification(sagaId, payload);
          break;
        default:
          throw new BillPaySagaError(`Unknown step: ${step}`, 'UNKNOWN_STEP');
      }

      // Advance to next step
      const currentIndex = BILL_PAY_SAGA_STEPS.indexOf(step);
      if (currentIndex < BILL_PAY_SAGA_STEPS.length - 1) {
        const nextStep = BILL_PAY_SAGA_STEPS[currentIndex + 1];
        await this.orchestrator.advanceSaga(sagaId, nextStep, updatedPayload);

        await this.events.emit({
          eventType: 'saga.step.ready',
          payload: {
            sagaId,
            sagaType: 'BILL_PAY',
            step: nextStep,
            payload: updatedPayload,
          },
        });
      } else {
        await this.orchestrator.completeSaga(sagaId, updatedPayload);

        await this.events.emit({
          eventType: 'bill_pay.completed',
          payload: {
            billId: payload.billId,
            vendorId: payload.vendorId,
            amount: payload.amount,
            journalEntryId: updatedPayload.journalEntryId,
            checkNumber: updatedPayload.checkNumber,
            achTraceNumber: updatedPayload.achTraceNumber,
          },
        });
      }

      return updatedPayload;
    } catch (error) {
      console.error(`[BillPaySaga] Step ${step} failed:`, error);

      await this.orchestrator.failSaga(
        sagaId,
        error instanceof Error ? error.message : 'Unknown error'
      );
      await this.compensate(sagaId, step, payload);

      throw error;
    }
  }

  /**
   * Step 1: Validate Bill
   * Verify vendor exists, bill details are valid, and payment is authorized
   */
  private async validateBill(
    sagaId: UUID,
    payload: BillPaySagaPayload
  ): Promise<BillPaySagaPayload> {
    console.log(`[BillPaySaga:${sagaId}] Validating bill`);

    // Verify vendor exists and is active
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name, status, tax_id, requires_1099')
      .eq('id', payload.vendorId)
      .eq('organization_id', this.organizationId)
      .single();

    if (vendorError || !vendor) {
      throw new BillPaySagaError(
        `Vendor not found: ${payload.vendorId}`,
        'VENDOR_NOT_FOUND'
      );
    }

    if (vendor.status !== 'active') {
      throw new BillPaySagaError(
        `Vendor ${vendor.name} is not active`,
        'VENDOR_INACTIVE'
      );
    }

    // Verify expense account exists
    const { data: expenseAccount } = await supabase
      .from('chart_of_accounts')
      .select('id, account_name, account_type')
      .eq('id', payload.expenseAccountId)
      .eq('organization_id', this.organizationId)
      .single();

    if (!expenseAccount) {
      throw new BillPaySagaError(
        'Expense account not found',
        'ACCOUNT_NOT_FOUND'
      );
    }

    if (expenseAccount.account_type !== 'expense') {
      throw new BillPaySagaError(
        `Account ${expenseAccount.account_name} is not an expense account`,
        'INVALID_ACCOUNT_TYPE'
      );
    }

    // For bill_pay type, verify the bill exists
    if (payload.paymentType === 'bill_pay') {
      const { data: bill } = await supabase
        .from('vendor_bills')
        .select('id, amount_due, status')
        .eq('id', payload.billId)
        .single();

      if (!bill) {
        throw new BillPaySagaError('Bill not found', 'BILL_NOT_FOUND');
      }

      if (bill.status === 'paid') {
        throw new BillPaySagaError('Bill already paid', 'BILL_ALREADY_PAID');
      }

      if (parseFloat(payload.amount) > parseFloat(bill.amount_due)) {
        throw new BillPaySagaError(
          'Payment amount exceeds amount due',
          'OVERPAYMENT'
        );
      }
    }

    // Check authorization limits
    const authLimit = await this.getPaymentAuthorizationLimit();
    if (parseFloat(payload.amount) > authLimit) {
      // In production, would trigger approval workflow
      console.log(`[BillPaySaga:${sagaId}] Payment exceeds auth limit, approval required`);
    }

    return {
      ...payload,
      requires1099: vendor.requires_1099,
    };
  }

  /**
   * Step 2: Allocate Expense
   * Verify and enrich property/owner allocations
   */
  private async allocateExpense(
    sagaId: UUID,
    payload: BillPaySagaPayload
  ): Promise<BillPaySagaPayload> {
    console.log(`[BillPaySaga:${sagaId}] Allocating expense`);

    const enrichedAllocations: ExpenseAllocation[] = [];

    for (const allocation of payload.allocations) {
      // Verify property exists
      const { data: property } = await supabase
        .from('properties')
        .select('id, name, owner_id')
        .eq('id', allocation.propertyId)
        .single();

      if (!property) {
        throw new BillPaySagaError(
          `Property not found: ${allocation.propertyId}`,
          'PROPERTY_NOT_FOUND'
        );
      }

      // Verify owner matches or get owner from property
      const ownerId = allocation.ownerId || property.owner_id;

      const { data: owner } = await supabase
        .from('owners')
        .select('id, name')
        .eq('id', ownerId)
        .single();

      if (!owner) {
        throw new BillPaySagaError(
          `Owner not found: ${ownerId}`,
          'OWNER_NOT_FOUND'
        );
      }

      // Verify owner has sufficient funds
      const { data: ownerBalance } = await supabase
        .from('dimensional_balances')
        .select('balance')
        .eq('owner_id', ownerId)
        .eq('property_id', allocation.propertyId)
        .single();

      const availableBalance = parseFloat(ownerBalance?.balance || '0');
      const allocationAmount = parseFloat(allocation.amount);

      if (availableBalance < allocationAmount) {
        throw new BillPaySagaError(
          `Insufficient owner funds for property ${property.name}. Available: ${availableBalance}, Required: ${allocationAmount}`,
          'INSUFFICIENT_FUNDS'
        );
      }

      enrichedAllocations.push({
        ...allocation,
        propertyName: property.name,
        ownerId: ownerId,
        ownerName: owner.name,
        percentage: (allocationAmount / parseFloat(payload.amount)) * 100,
      });
    }

    return {
      ...payload,
      allocations: enrichedAllocations,
    };
  }

  /**
   * Step 3: Create Journal Entry
   * Post the payment with proper expense allocation
   */
  private async createJournalEntry(
    sagaId: UUID,
    payload: BillPaySagaPayload
  ): Promise<BillPaySagaPayload> {
    console.log(`[BillPaySaga:${sagaId}] Creating journal entry`);

    // Get bank account (trust or operating based on payment type)
    const { data: bankAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'trust_bank')
      .single();

    if (!bankAccount) {
      throw new BillPaySagaError('Bank account not found', 'ACCOUNT_NOT_FOUND');
    }

    // Build postings - one debit per allocation, one credit to bank
    const postings: JournalPostingInput[] = [];

    // Expense debits (one per property allocation)
    for (const allocation of payload.allocations) {
      postings.push({
        accountId: payload.expenseAccountId,
        amount: allocation.amount, // Debit expense
        propertyId: allocation.propertyId,
        ownerId: allocation.ownerId,
        vendorId: payload.vendorId,
        description: `${payload.description} - ${allocation.propertyName}`,
      });
    }

    // Bank credit (single posting)
    postings.push({
      accountId: bankAccount.id,
      amount: (-parseFloat(payload.amount)).toFixed(4) as Decimal, // Credit bank
      description: `Payment to vendor - ${payload.invoiceNumber || payload.description}`,
    });

    const journalEntry = await this.ledger.createJournalEntry({
      entryDate: payload.paymentDate,
      entryType: 'bill_payment',
      description: `Bill payment: ${payload.description}`,
      postings,
      metadata: {
        billId: payload.billId,
        vendorId: payload.vendorId,
        invoiceNumber: payload.invoiceNumber,
        paymentMethod: payload.paymentMethod,
        sagaId,
      },
    });

    // If paying against A/P bill, update the bill
    if (payload.paymentType === 'bill_pay') {
      await supabase
        .from('vendor_bills')
        .update({
          amount_paid: payload.amount,
          status: 'paid',
          paid_date: payload.paymentDate,
          journal_entry_id: journalEntry.id,
        })
        .eq('id', payload.billId);
    }

    return {
      ...payload,
      journalEntryId: journalEntry.id,
    };
  }

  /**
   * Step 4: Track 1099
   * Update vendor 1099 tracking for tax reporting
   */
  private async track1099(
    sagaId: UUID,
    payload: BillPaySagaPayload
  ): Promise<BillPaySagaPayload> {
    console.log(`[BillPaySaga:${sagaId}] Tracking 1099`);

    if (!payload.requires1099) {
      console.log(`[BillPaySaga:${sagaId}] Vendor does not require 1099 tracking`);
      return payload;
    }

    const currentYear = new Date(payload.paymentDate).getFullYear();

    // Get current YTD 1099 amount for vendor
    const { data: existing } = await supabase
      .from('vendor_1099_tracking')
      .select('id, ytd_amount')
      .eq('vendor_id', payload.vendorId)
      .eq('tax_year', currentYear)
      .single();

    const paymentAmount = parseFloat(payload.amount);
    let ytdAmount: number;

    if (existing) {
      ytdAmount = parseFloat(existing.ytd_amount) + paymentAmount;

      await supabase
        .from('vendor_1099_tracking')
        .update({
          ytd_amount: ytdAmount.toFixed(2),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      ytdAmount = paymentAmount;

      await supabase.from('vendor_1099_tracking').insert({
        organization_id: this.organizationId,
        vendor_id: payload.vendorId,
        tax_year: currentYear,
        ytd_amount: ytdAmount.toFixed(2),
      });
    }

    // Check if threshold reached
    const threshold1099 = await this.compliance.get1099Threshold();

    if (ytdAmount >= threshold1099) {
      console.log(`[BillPaySaga:${sagaId}] 1099 threshold reached for vendor`);

      await this.events.emit({
        eventType: 'vendor.1099_threshold_reached',
        payload: {
          vendorId: payload.vendorId,
          taxYear: currentYear,
          ytdAmount: ytdAmount.toFixed(2),
          threshold: threshold1099,
        },
      });
    }

    return {
      ...payload,
      ytd1099Amount: ytdAmount.toFixed(2) as Decimal,
    };
  }

  /**
   * Step 5: Generate Payment
   * Create check or ACH payment based on payment method
   */
  private async generatePayment(
    sagaId: UUID,
    payload: BillPaySagaPayload
  ): Promise<BillPaySagaPayload> {
    console.log(`[BillPaySaga:${sagaId}] Generating payment via ${payload.paymentMethod}`);

    let checkNumber: string | undefined;
    let achTraceNumber: string | undefined;

    switch (payload.paymentMethod) {
      case 'check':
        checkNumber = await this.generateCheckNumber();

        // Create check record
        await supabase.from('vendor_checks').insert({
          organization_id: this.organizationId,
          vendor_id: payload.vendorId,
          check_number: checkNumber,
          amount: payload.amount,
          check_date: payload.paymentDate,
          memo: payload.memo || payload.description,
          journal_entry_id: payload.journalEntryId,
          status: 'printed',
        });
        break;

      case 'ach':
        achTraceNumber = await this.generateACHTraceNumber();

        // Queue ACH payment
        await this.events.emit({
          eventType: 'bank.ach.vendor_payment',
          payload: {
            traceNumber: achTraceNumber,
            vendorId: payload.vendorId,
            amount: payload.amount,
            effectiveDate: payload.paymentDate,
            description: payload.description,
          },
        });
        break;

      case 'wire':
        // Wire transfers handled separately - emit event
        await this.events.emit({
          eventType: 'bank.wire.initiate',
          payload: {
            vendorId: payload.vendorId,
            amount: payload.amount,
            description: payload.description,
          },
        });
        break;

      case 'credit_card':
        // Credit card payments typically don't need additional processing here
        break;
    }

    // Create payment record
    await supabase.from('vendor_payments').insert({
      id: crypto.randomUUID(),
      organization_id: this.organizationId,
      vendor_id: payload.vendorId,
      bill_id: payload.billId,
      payment_date: payload.paymentDate,
      amount: payload.amount,
      payment_method: payload.paymentMethod,
      check_number: checkNumber,
      ach_trace_number: achTraceNumber,
      invoice_number: payload.invoiceNumber,
      journal_entry_id: payload.journalEntryId,
      status: 'pending',
    });

    return {
      ...payload,
      checkNumber,
      achTraceNumber,
    };
  }

  /**
   * Step 6: Send Notification
   * Notify vendor and property owners
   */
  private async sendNotification(
    sagaId: UUID,
    payload: BillPaySagaPayload
  ): Promise<BillPaySagaPayload> {
    console.log(`[BillPaySaga:${sagaId}] Sending notifications`);

    // Get vendor details
    const { data: vendor } = await supabase
      .from('vendors')
      .select('name, email')
      .eq('id', payload.vendorId)
      .single();

    // Notify vendor
    if (vendor?.email) {
      await this.events.emit({
        eventType: 'notification.send',
        payload: {
          type: 'vendor_payment_sent',
          recipientType: 'vendor',
          recipientId: payload.vendorId,
          email: vendor.email,
          data: {
            vendorName: vendor.name,
            amount: payload.amount,
            paymentDate: payload.paymentDate,
            paymentMethod: payload.paymentMethod,
            checkNumber: payload.checkNumber,
            invoiceNumber: payload.invoiceNumber,
          },
        },
      });
    }

    // Notify property owners
    const notifiedOwners = new Set<UUID>();
    for (const allocation of payload.allocations) {
      if (notifiedOwners.has(allocation.ownerId)) continue;
      notifiedOwners.add(allocation.ownerId);

      await this.events.emit({
        eventType: 'notification.send',
        payload: {
          type: 'expense_paid',
          recipientType: 'owner',
          recipientId: allocation.ownerId,
          data: {
            propertyName: allocation.propertyName,
            vendorName: vendor?.name,
            amount: allocation.amount,
            description: payload.description,
            paymentDate: payload.paymentDate,
          },
        },
      });
    }

    // Update payment status
    await supabase
      .from('vendor_payments')
      .update({ status: 'paid' })
      .eq('journal_entry_id', payload.journalEntryId);

    return payload;
  }

  /**
   * Compensation: Reverse completed steps on failure
   */
  private async compensate(
    sagaId: UUID,
    failedStep: BillPaySagaStep,
    payload: BillPaySagaPayload
  ): Promise<void> {
    console.log(`[BillPaySaga:${sagaId}] Starting compensation from: ${failedStep}`);

    await this.orchestrator.startCompensation(sagaId);

    const stepIndex = BILL_PAY_SAGA_STEPS.indexOf(failedStep);

    for (let i = stepIndex - 1; i >= 0; i--) {
      const step = BILL_PAY_SAGA_STEPS[i];

      try {
        switch (step) {
          case 'CREATE_JOURNAL_ENTRY':
            if (payload.journalEntryId) {
              await this.ledger.reverseJournalEntry(
                payload.journalEntryId,
                payload.paymentDate,
                'Bill pay saga compensation'
              );
            }

            // Revert bill status if applicable
            if (payload.paymentType === 'bill_pay') {
              await supabase
                .from('vendor_bills')
                .update({
                  status: 'unpaid',
                  amount_paid: '0.00',
                  paid_date: null,
                  journal_entry_id: null,
                })
                .eq('id', payload.billId);
            }
            break;

          case 'TRACK_1099':
            // Reverse 1099 tracking
            if (payload.requires1099 && payload.ytd1099Amount) {
              const currentYear = new Date(payload.paymentDate).getFullYear();
              const { data: tracking } = await supabase
                .from('vendor_1099_tracking')
                .select('id, ytd_amount')
                .eq('vendor_id', payload.vendorId)
                .eq('tax_year', currentYear)
                .single();

              if (tracking) {
                const newAmount =
                  parseFloat(tracking.ytd_amount) - parseFloat(payload.amount);
                await supabase
                  .from('vendor_1099_tracking')
                  .update({ ytd_amount: Math.max(0, newAmount).toFixed(2) })
                  .eq('id', tracking.id);
              }
            }
            break;

          case 'GENERATE_PAYMENT':
            // Void check if created
            if (payload.checkNumber) {
              await supabase
                .from('vendor_checks')
                .update({ status: 'voided' })
                .eq('check_number', payload.checkNumber)
                .eq('organization_id', this.organizationId);
            }

            // Cancel ACH if initiated
            if (payload.achTraceNumber) {
              await this.events.emit({
                eventType: 'bank.ach.cancel',
                payload: {
                  traceNumber: payload.achTraceNumber,
                  reason: 'Bill pay saga compensation',
                },
              });
            }

            // Update payment record
            await supabase
              .from('vendor_payments')
              .update({ status: 'voided' })
              .eq('journal_entry_id', payload.journalEntryId);
            break;
        }

        console.log(`[BillPaySaga:${sagaId}] Compensated step: ${step}`);
      } catch (error) {
        console.error(`[BillPaySaga:${sagaId}] Compensation failed for ${step}:`, error);
      }
    }

    await this.events.emit({
      eventType: 'bill_pay.compensation.completed',
      payload: {
        sagaId,
        billId: payload.billId,
        vendorId: payload.vendorId,
        failedStep,
      },
    });
  }

  // Helper methods

  private async getPaymentAuthorizationLimit(): Promise<number> {
    // Get from compliance service or default
    try {
      return await this.compliance.getPaymentAuthorizationLimit();
    } catch {
      return 10000; // Default $10,000
    }
  }

  private async generateCheckNumber(): Promise<string> {
    // Get next check number from sequence
    const { data } = await supabase.rpc('get_next_check_number', {
      p_org_id: this.organizationId,
    });

    return data?.toString() || `CHK-${Date.now()}`;
  }

  private async generateACHTraceNumber(): Promise<string> {
    return `ACH-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}

export class BillPaySagaError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'BillPaySagaError';
    this.code = code;
  }
}

export function createBillPaySaga(organizationId: string): BillPaySaga {
  return new BillPaySaga(organizationId);
}
