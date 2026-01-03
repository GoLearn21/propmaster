/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * SecurityDepositSaga - Tenant Security Deposit Lifecycle
 *
 * CRITICAL: State-Specific Compliance
 *
 * Security deposits are heavily regulated by state law:
 * - Maximum amounts (often 1-3 months rent)
 * - Interest requirements (varies by state)
 * - Return deadlines (14-60 days depending on state)
 * - Separate account requirements
 * - Itemized deduction statements
 *
 * TITANIUM RULES ENFORCED:
 * 1. Immutable Ledger - All deposit transactions create journal entries
 * 2. Double-Entry Only - Debit Cash, Credit Liability
 * 3. Law as Data - All limits/rates from compliance_rules
 * 4. O(1) Reads - Deposit balances from dimensional_balances
 *
 * SAGA TYPES:
 * - COLLECT: Receive security deposit at move-in
 * - INTEREST: Accrue interest (where required)
 * - RETURN: Return deposit at move-out
 * - DEDUCT: Apply deductions for damages
 *
 * COLLECT SAGA STEPS:
 * 1. VALIDATE_AMOUNT - Check against state maximum
 * 2. CREATE_ENTRY - Post deposit receipt
 * 3. ISOLATE_FUNDS - Move to separate account if required
 * 4. NOTIFY_TENANT - Send deposit receipt
 *
 * RETURN SAGA STEPS:
 * 1. CALCULATE_INTEREST - Compute accrued interest
 * 2. ASSESS_DEDUCTIONS - Itemize damage deductions
 * 3. CREATE_ENTRIES - Post return/deduction entries
 * 4. GENERATE_STATEMENT - Create itemized statement
 * 5. PROCESS_REFUND - Issue refund check/ACH
 * 6. NOTIFY_TENANT - Send statement and payment
 */

import { supabase } from '@/lib/supabase';
import type { Decimal, ISODate, UUID, JournalPostingInput } from '../types';
import { LedgerService, createLedgerService } from '../services/LedgerService';
import { ComplianceService, createComplianceService } from '../services/ComplianceService';
import { EventService, createEventService } from '../events/EventService';
import { SagaOrchestrator, createSagaOrchestrator } from './SagaOrchestrator';

export const COLLECT_SAGA_STEPS = [
  'VALIDATE_AMOUNT',
  'CREATE_ENTRY',
  'ISOLATE_FUNDS',
  'NOTIFY_TENANT',
] as const;

export const RETURN_SAGA_STEPS = [
  'CALCULATE_INTEREST',
  'ASSESS_DEDUCTIONS',
  'CREATE_ENTRIES',
  'GENERATE_STATEMENT',
  'PROCESS_REFUND',
  'NOTIFY_TENANT',
] as const;

export type CollectSagaStep = (typeof COLLECT_SAGA_STEPS)[number];
export type ReturnSagaStep = (typeof RETURN_SAGA_STEPS)[number];
export type SecurityDepositSagaStep = CollectSagaStep | ReturnSagaStep;

export type SagaType = 'COLLECT' | 'RETURN' | 'INTEREST';

export interface SecurityDepositSagaPayload {
  depositId: UUID;
  sagaType: SagaType;
  tenantId: UUID;
  propertyId: UUID;
  leaseId: UUID;
  // For COLLECT
  amount?: Decimal;
  collectionDate?: ISODate;
  // For RETURN
  moveOutDate?: ISODate;
  returnDeadline?: ISODate;
  // Calculated during saga
  stateCode?: string;
  monthlyRent?: Decimal;
  maxDepositAllowed?: Decimal;
  interestRate?: number;
  accruedInterest?: Decimal;
  requiresSeparateAccount?: boolean;
  deductions?: DepositDeduction[];
  totalDeductions?: Decimal;
  refundAmount?: Decimal;
  journalEntryIds?: UUID[];
  checkNumber?: string;
  statementHtml?: string;
}

export interface DepositDeduction {
  category: 'cleaning' | 'repairs' | 'unpaid_rent' | 'late_fees' | 'other';
  description: string;
  amount: Decimal;
  invoiceId?: UUID;
  photoUrls?: string[];
}

export interface DepositInterestCalculation {
  principal: Decimal;
  annualRate: number;
  daysHeld: number;
  interestEarned: Decimal;
  compoundingPeriod: 'simple' | 'monthly' | 'quarterly' | 'annual';
}

export class SecurityDepositSaga {
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
   * Start a security deposit collection saga
   */
  async startCollectSaga(payload: SecurityDepositSagaPayload): Promise<{
    sagaId: UUID;
    success: boolean;
    error?: string;
  }> {
    try {
      payload.sagaType = 'COLLECT';

      if (!payload.amount || parseFloat(payload.amount) <= 0) {
        throw new SecurityDepositSagaError(
          'Deposit amount must be positive',
          'INVALID_AMOUNT'
        );
      }

      // Start the saga
      const sagaId = await this.orchestrator.startSaga(
        'SECURITY_DEPOSIT_COLLECT',
        payload,
        COLLECT_SAGA_STEPS as unknown as string[]
      );

      // Execute first step
      await this.executeCollectStep(sagaId, 'VALIDATE_AMOUNT', payload);

      return { sagaId, success: true };
    } catch (error) {
      console.error('[SecurityDepositSaga] Failed to start collect saga:', error);
      return {
        sagaId: '' as UUID,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Start a security deposit return saga
   */
  async startReturnSaga(payload: SecurityDepositSagaPayload): Promise<{
    sagaId: UUID;
    success: boolean;
    error?: string;
  }> {
    try {
      payload.sagaType = 'RETURN';

      if (!payload.moveOutDate) {
        throw new SecurityDepositSagaError(
          'Move out date is required',
          'MISSING_MOVE_OUT_DATE'
        );
      }

      // Get existing deposit
      const { data: deposit, error } = await supabase
        .from('security_deposits')
        .select('*')
        .eq('tenant_id', payload.tenantId)
        .eq('property_id', payload.propertyId)
        .eq('status', 'held')
        .single();

      if (error || !deposit) {
        throw new SecurityDepositSagaError(
          'No active security deposit found',
          'DEPOSIT_NOT_FOUND'
        );
      }

      payload.depositId = deposit.id;
      payload.amount = deposit.amount;

      // Start the saga
      const sagaId = await this.orchestrator.startSaga(
        'SECURITY_DEPOSIT_RETURN',
        payload,
        RETURN_SAGA_STEPS as unknown as string[]
      );

      // Execute first step
      await this.executeReturnStep(sagaId, 'CALCULATE_INTEREST', payload);

      return { sagaId, success: true };
    } catch (error) {
      console.error('[SecurityDepositSaga] Failed to start return saga:', error);
      return {
        sagaId: '' as UUID,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a collect saga step
   */
  async executeCollectStep(
    sagaId: UUID,
    step: CollectSagaStep,
    payload: SecurityDepositSagaPayload
  ): Promise<SecurityDepositSagaPayload> {
    await this.orchestrator.heartbeat(sagaId);

    try {
      let updatedPayload: SecurityDepositSagaPayload;

      switch (step) {
        case 'VALIDATE_AMOUNT':
          updatedPayload = await this.validateAmount(sagaId, payload);
          break;
        case 'CREATE_ENTRY':
          updatedPayload = await this.createCollectEntry(sagaId, payload);
          break;
        case 'ISOLATE_FUNDS':
          updatedPayload = await this.isolateFunds(sagaId, payload);
          break;
        case 'NOTIFY_TENANT':
          updatedPayload = await this.notifyTenantCollect(sagaId, payload);
          break;
        default:
          throw new SecurityDepositSagaError(`Unknown step: ${step}`, 'UNKNOWN_STEP');
      }

      // Advance to next step
      const currentIndex = COLLECT_SAGA_STEPS.indexOf(step);
      if (currentIndex < COLLECT_SAGA_STEPS.length - 1) {
        const nextStep = COLLECT_SAGA_STEPS[currentIndex + 1];
        await this.orchestrator.advanceSaga(sagaId, nextStep, updatedPayload);

        await this.events.emit({
          eventType: 'saga.step.ready',
          payload: { sagaId, sagaType: 'SECURITY_DEPOSIT_COLLECT', step: nextStep, payload: updatedPayload },
        });
      } else {
        await this.orchestrator.completeSaga(sagaId, updatedPayload);

        await this.events.emit({
          eventType: 'security_deposit.collected',
          payload: {
            depositId: payload.depositId,
            tenantId: payload.tenantId,
            propertyId: payload.propertyId,
            amount: payload.amount,
          },
        });
      }

      return updatedPayload;
    } catch (error) {
      console.error(`[SecurityDepositSaga] Collect step ${step} failed:`, error);
      await this.orchestrator.failSaga(sagaId, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Execute a return saga step
   */
  async executeReturnStep(
    sagaId: UUID,
    step: ReturnSagaStep,
    payload: SecurityDepositSagaPayload
  ): Promise<SecurityDepositSagaPayload> {
    await this.orchestrator.heartbeat(sagaId);

    try {
      let updatedPayload: SecurityDepositSagaPayload;

      switch (step) {
        case 'CALCULATE_INTEREST':
          updatedPayload = await this.calculateInterest(sagaId, payload);
          break;
        case 'ASSESS_DEDUCTIONS':
          updatedPayload = await this.assessDeductions(sagaId, payload);
          break;
        case 'CREATE_ENTRIES':
          updatedPayload = await this.createReturnEntries(sagaId, payload);
          break;
        case 'GENERATE_STATEMENT':
          updatedPayload = await this.generateStatement(sagaId, payload);
          break;
        case 'PROCESS_REFUND':
          updatedPayload = await this.processRefund(sagaId, payload);
          break;
        case 'NOTIFY_TENANT':
          updatedPayload = await this.notifyTenantReturn(sagaId, payload);
          break;
        default:
          throw new SecurityDepositSagaError(`Unknown step: ${step}`, 'UNKNOWN_STEP');
      }

      // Advance to next step
      const currentIndex = RETURN_SAGA_STEPS.indexOf(step);
      if (currentIndex < RETURN_SAGA_STEPS.length - 1) {
        const nextStep = RETURN_SAGA_STEPS[currentIndex + 1];
        await this.orchestrator.advanceSaga(sagaId, nextStep, updatedPayload);

        await this.events.emit({
          eventType: 'saga.step.ready',
          payload: { sagaId, sagaType: 'SECURITY_DEPOSIT_RETURN', step: nextStep, payload: updatedPayload },
        });
      } else {
        await this.orchestrator.completeSaga(sagaId, updatedPayload);

        await this.events.emit({
          eventType: 'security_deposit.returned',
          payload: {
            depositId: payload.depositId,
            tenantId: payload.tenantId,
            refundAmount: updatedPayload.refundAmount,
            totalDeductions: updatedPayload.totalDeductions,
          },
        });
      }

      return updatedPayload;
    } catch (error) {
      console.error(`[SecurityDepositSaga] Return step ${step} failed:`, error);
      await this.orchestrator.failSaga(sagaId, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // ============================================================
  // COLLECT SAGA STEPS
  // ============================================================

  /**
   * Validate deposit amount against state maximum
   */
  private async validateAmount(
    sagaId: UUID,
    payload: SecurityDepositSagaPayload
  ): Promise<SecurityDepositSagaPayload> {
    console.log(`[SecurityDepositSaga:${sagaId}] Validating deposit amount`);

    // Get property state
    const { data: property } = await supabase
      .from('properties')
      .select('state_code, monthly_rent')
      .eq('id', payload.propertyId)
      .single();

    if (!property) {
      throw new SecurityDepositSagaError('Property not found', 'PROPERTY_NOT_FOUND');
    }

    const stateCode = property.state_code;
    const monthlyRent = parseFloat(property.monthly_rent || '0');
    const depositAmount = parseFloat(payload.amount || '0');

    // Get state-specific max deposit (as multiplier of monthly rent)
    const maxMultiplier = await this.compliance.getSecurityDepositMax(stateCode);
    const maxDepositAllowed = monthlyRent * maxMultiplier;

    if (depositAmount > maxDepositAllowed) {
      throw new SecurityDepositSagaError(
        `Deposit $${depositAmount} exceeds state maximum of $${maxDepositAllowed} (${maxMultiplier}x monthly rent)`,
        'EXCEEDS_STATE_MAX'
      );
    }

    // Check if state requires interest
    const interestRate = await this.compliance.getSecurityDepositInterestRate(stateCode);

    // Check if state requires separate account
    const requiresSeparateAccount = await this.compliance.getSecurityDepositSeparateAccount(stateCode);

    return {
      ...payload,
      stateCode,
      monthlyRent: monthlyRent.toFixed(2) as Decimal,
      maxDepositAllowed: maxDepositAllowed.toFixed(2) as Decimal,
      interestRate,
      requiresSeparateAccount,
    };
  }

  /**
   * Create journal entry for deposit collection
   */
  private async createCollectEntry(
    sagaId: UUID,
    payload: SecurityDepositSagaPayload
  ): Promise<SecurityDepositSagaPayload> {
    console.log(`[SecurityDepositSaga:${sagaId}] Creating collect entry`);

    // Get accounts
    const { data: cashAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'trust_bank')
      .single();

    const { data: depositLiability } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'security_deposit')
      .single();

    if (!cashAccount || !depositLiability) {
      throw new SecurityDepositSagaError('Required accounts not found', 'ACCOUNTS_NOT_FOUND');
    }

    const amount = parseFloat(payload.amount || '0');

    const postings: JournalPostingInput[] = [
      {
        accountId: cashAccount.id,
        amount: amount.toFixed(4) as Decimal, // Debit cash
        propertyId: payload.propertyId,
        tenantId: payload.tenantId,
        description: 'Security deposit received',
      },
      {
        accountId: depositLiability.id,
        amount: (-amount).toFixed(4) as Decimal, // Credit liability
        propertyId: payload.propertyId,
        tenantId: payload.tenantId,
        description: 'Security deposit liability',
      },
    ];

    const journalEntry = await this.ledger.createJournalEntry({
      entryDate: payload.collectionDate || new Date().toISOString().split('T')[0] as ISODate,
      entryType: 'security_deposit',
      description: 'Security deposit collection',
      postings,
      metadata: {
        depositId: payload.depositId,
        tenantId: payload.tenantId,
        sagaId,
      },
    });

    // Create deposit record
    const depositId = crypto.randomUUID() as UUID;
    await supabase.from('security_deposits').insert({
      id: depositId,
      organization_id: this.organizationId,
      tenant_id: payload.tenantId,
      property_id: payload.propertyId,
      lease_id: payload.leaseId,
      amount: payload.amount,
      collected_date: payload.collectionDate,
      state_code: payload.stateCode,
      interest_rate: payload.interestRate,
      requires_separate_account: payload.requiresSeparateAccount,
      journal_entry_id: journalEntry.id,
      status: 'held',
    });

    return {
      ...payload,
      depositId,
      journalEntryIds: [journalEntry.id],
    };
  }

  /**
   * Isolate funds in separate account if required by state
   */
  private async isolateFunds(
    sagaId: UUID,
    payload: SecurityDepositSagaPayload
  ): Promise<SecurityDepositSagaPayload> {
    console.log(`[SecurityDepositSaga:${sagaId}] Isolating funds if required`);

    if (!payload.requiresSeparateAccount) {
      console.log(`[SecurityDepositSaga:${sagaId}] State does not require separate account`);
      return payload;
    }

    // Emit event for sweep saga to handle
    await this.events.emit({
      eventType: 'sweep.security_deposit',
      payload: {
        tenantId: payload.tenantId,
        propertyId: payload.propertyId,
        amount: payload.amount,
        depositId: payload.depositId,
      },
    });

    return payload;
  }

  /**
   * Send deposit receipt to tenant
   */
  private async notifyTenantCollect(
    sagaId: UUID,
    payload: SecurityDepositSagaPayload
  ): Promise<SecurityDepositSagaPayload> {
    console.log(`[SecurityDepositSaga:${sagaId}] Notifying tenant of collection`);

    await this.events.emit({
      eventType: 'notification.send',
      payload: {
        type: 'security_deposit_receipt',
        recipientType: 'tenant',
        recipientId: payload.tenantId,
        data: {
          amount: payload.amount,
          collectionDate: payload.collectionDate,
          interestRate: payload.interestRate,
          stateCode: payload.stateCode,
          propertyId: payload.propertyId,
        },
      },
    });

    return payload;
  }

  // ============================================================
  // RETURN SAGA STEPS
  // ============================================================

  /**
   * Calculate interest earned (where required by state)
   */
  private async calculateInterest(
    sagaId: UUID,
    payload: SecurityDepositSagaPayload
  ): Promise<SecurityDepositSagaPayload> {
    console.log(`[SecurityDepositSaga:${sagaId}] Calculating interest`);

    // Get deposit details
    const { data: deposit } = await supabase
      .from('security_deposits')
      .select('*')
      .eq('id', payload.depositId)
      .single();

    if (!deposit) {
      throw new SecurityDepositSagaError('Deposit not found', 'DEPOSIT_NOT_FOUND');
    }

    const interestRate = deposit.interest_rate || 0;

    if (interestRate <= 0) {
      console.log(`[SecurityDepositSaga:${sagaId}] No interest required for this state`);
      return {
        ...payload,
        interestRate: 0,
        accruedInterest: '0.00' as Decimal,
      };
    }

    // Calculate days held
    const collectedDate = new Date(deposit.collected_date);
    const returnDate = new Date(payload.moveOutDate || new Date());
    const daysHeld = Math.floor(
      (returnDate.getTime() - collectedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Simple interest calculation
    const principal = parseFloat(deposit.amount);
    const dailyRate = interestRate / 100 / 365;
    const interestEarned = principal * dailyRate * daysHeld;

    // Get return deadline from compliance
    const returnDays = await this.compliance.getSecurityDepositReturnDays(deposit.state_code);
    const returnDeadline = new Date(returnDate);
    returnDeadline.setDate(returnDeadline.getDate() + returnDays);

    return {
      ...payload,
      stateCode: deposit.state_code,
      interestRate,
      accruedInterest: interestEarned.toFixed(2) as Decimal,
      returnDeadline: returnDeadline.toISOString().split('T')[0] as ISODate,
    };
  }

  /**
   * Assess and itemize deductions
   */
  private async assessDeductions(
    sagaId: UUID,
    payload: SecurityDepositSagaPayload
  ): Promise<SecurityDepositSagaPayload> {
    console.log(`[SecurityDepositSaga:${sagaId}] Assessing deductions`);

    const deductions: DepositDeduction[] = [];

    // Get unpaid charges for tenant
    const { data: unpaidCharges } = await supabase
      .from('tenant_charges')
      .select('*')
      .eq('tenant_id', payload.tenantId)
      .eq('property_id', payload.propertyId)
      .gt('balance_due', 0);

    for (const charge of unpaidCharges || []) {
      let category: DepositDeduction['category'] = 'other';
      if (charge.charge_type === 'rent') category = 'unpaid_rent';
      if (charge.charge_type === 'late_fee') category = 'late_fees';

      deductions.push({
        category,
        description: charge.description || `Unpaid ${charge.charge_type}`,
        amount: charge.balance_due,
      });
    }

    // Get damage claims
    const { data: damages } = await supabase
      .from('move_out_damages')
      .select('*')
      .eq('tenant_id', payload.tenantId)
      .eq('property_id', payload.propertyId)
      .eq('status', 'approved');

    for (const damage of damages || []) {
      deductions.push({
        category: damage.damage_type === 'cleaning' ? 'cleaning' : 'repairs',
        description: damage.description,
        amount: damage.amount,
        invoiceId: damage.invoice_id,
        photoUrls: damage.photo_urls,
      });
    }

    const totalDeductions = deductions.reduce(
      (sum, d) => sum + parseFloat(d.amount),
      0
    );

    const depositAmount = parseFloat(payload.amount || '0');
    const interestEarned = parseFloat(payload.accruedInterest || '0');
    const refundAmount = depositAmount + interestEarned - totalDeductions;

    return {
      ...payload,
      deductions,
      totalDeductions: totalDeductions.toFixed(2) as Decimal,
      refundAmount: Math.max(0, refundAmount).toFixed(2) as Decimal,
    };
  }

  /**
   * Create journal entries for return and deductions
   */
  private async createReturnEntries(
    sagaId: UUID,
    payload: SecurityDepositSagaPayload
  ): Promise<SecurityDepositSagaPayload> {
    console.log(`[SecurityDepositSaga:${sagaId}] Creating return entries`);

    const journalEntryIds: UUID[] = [];
    const returnDate = payload.moveOutDate || new Date().toISOString().split('T')[0] as ISODate;

    // Get accounts
    const { data: depositLiability } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'security_deposit')
      .single();

    const { data: cashAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'trust_bank')
      .single();

    const { data: interestExpense } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'deposit_interest_expense')
      .single();

    if (!depositLiability || !cashAccount) {
      throw new SecurityDepositSagaError('Required accounts not found', 'ACCOUNTS_NOT_FOUND');
    }

    const depositAmount = parseFloat(payload.amount || '0');
    const interestAmount = parseFloat(payload.accruedInterest || '0');

    // 1. Release deposit liability
    const releasePostings: JournalPostingInput[] = [
      {
        accountId: depositLiability.id,
        amount: depositAmount.toFixed(4) as Decimal, // Debit (reduce liability)
        propertyId: payload.propertyId,
        tenantId: payload.tenantId,
        description: 'Security deposit release',
      },
      {
        accountId: cashAccount.id,
        amount: (-depositAmount).toFixed(4) as Decimal, // Credit cash
        propertyId: payload.propertyId,
        tenantId: payload.tenantId,
        description: 'Security deposit return',
      },
    ];

    const releaseEntry = await this.ledger.createJournalEntry({
      entryDate: returnDate,
      entryType: 'deposit_return',
      description: 'Security deposit release',
      postings: releasePostings,
      metadata: { depositId: payload.depositId, sagaId },
    });
    journalEntryIds.push(releaseEntry.id);

    // 2. Record interest if applicable
    if (interestAmount > 0 && interestExpense) {
      const interestPostings: JournalPostingInput[] = [
        {
          accountId: interestExpense.id,
          amount: interestAmount.toFixed(4) as Decimal, // Debit expense
          propertyId: payload.propertyId,
          description: 'Security deposit interest',
        },
        {
          accountId: cashAccount.id,
          amount: (-interestAmount).toFixed(4) as Decimal, // Credit cash
          propertyId: payload.propertyId,
          tenantId: payload.tenantId,
          description: 'Security deposit interest payment',
        },
      ];

      const interestEntry = await this.ledger.createJournalEntry({
        entryDate: returnDate,
        entryType: 'deposit_interest',
        description: 'Security deposit interest',
        postings: interestPostings,
        metadata: { depositId: payload.depositId, sagaId },
      });
      journalEntryIds.push(interestEntry.id);
    }

    // 3. Apply deductions - offset against amounts owed
    for (const deduction of payload.deductions || []) {
      // Get appropriate revenue/receivable account based on deduction type
      let deductionAccountId: UUID;

      const { data: account } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('organization_id', this.organizationId)
        .eq('account_subtype', deduction.category === 'unpaid_rent' ? 'accounts_receivable' : 'other_income')
        .single();

      deductionAccountId = account?.id || cashAccount.id;

      const deductionPostings: JournalPostingInput[] = [
        {
          accountId: cashAccount.id,
          amount: deduction.amount, // Debit cash (keep)
          propertyId: payload.propertyId,
          tenantId: payload.tenantId,
          description: `Deposit deduction: ${deduction.description}`,
        },
        {
          accountId: deductionAccountId,
          amount: (-parseFloat(deduction.amount)).toFixed(4) as Decimal, // Credit income/receivable
          propertyId: payload.propertyId,
          tenantId: payload.tenantId,
          description: `Deposit deduction: ${deduction.description}`,
        },
      ];

      const deductionEntry = await this.ledger.createJournalEntry({
        entryDate: returnDate,
        entryType: 'deposit_deduction',
        description: `Deposit deduction: ${deduction.description}`,
        postings: deductionPostings,
        metadata: { depositId: payload.depositId, deductionCategory: deduction.category, sagaId },
      });
      journalEntryIds.push(deductionEntry.id);
    }

    // Update deposit status
    await supabase
      .from('security_deposits')
      .update({
        status: 'returned',
        returned_date: returnDate,
        interest_paid: payload.accruedInterest,
        deductions_total: payload.totalDeductions,
        refund_amount: payload.refundAmount,
      })
      .eq('id', payload.depositId);

    return {
      ...payload,
      journalEntryIds,
    };
  }

  /**
   * Generate itemized statement
   */
  private async generateStatement(
    sagaId: UUID,
    payload: SecurityDepositSagaPayload
  ): Promise<SecurityDepositSagaPayload> {
    console.log(`[SecurityDepositSaga:${sagaId}] Generating statement`);

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, email')
      .eq('id', payload.tenantId)
      .single();

    // Get property info
    const { data: property } = await supabase
      .from('properties')
      .select('name, address_line1, city, state_code, zip_code')
      .eq('id', payload.propertyId)
      .single();

    const depositAmount = parseFloat(payload.amount || '0');
    const interestAmount = parseFloat(payload.accruedInterest || '0');
    const totalDeductions = parseFloat(payload.totalDeductions || '0');
    const refundAmount = parseFloat(payload.refundAmount || '0');

    // Generate HTML statement
    const statementHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Security Deposit Statement</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
    th { background-color: #f5f5f5; }
    .amount { text-align: right; }
    .total-row { font-weight: bold; background-color: #f9f9f9; }
    .refund-row { font-weight: bold; background-color: #e8f5e9; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>Security Deposit Itemized Statement</h1>

  <p><strong>Tenant:</strong> ${tenant?.name}</p>
  <p><strong>Property:</strong> ${property?.address_line1}, ${property?.city}, ${property?.state_code} ${property?.zip_code}</p>
  <p><strong>Move-Out Date:</strong> ${payload.moveOutDate}</p>
  <p><strong>Statement Date:</strong> ${new Date().toISOString().split('T')[0]}</p>

  <h2>Summary</h2>
  <table>
    <tr>
      <td>Original Security Deposit</td>
      <td class="amount">$${depositAmount.toFixed(2)}</td>
    </tr>
    ${interestAmount > 0 ? `
    <tr>
      <td>Interest Earned (${payload.interestRate}% annual)</td>
      <td class="amount">$${interestAmount.toFixed(2)}</td>
    </tr>
    ` : ''}
    <tr class="total-row">
      <td>Total Available</td>
      <td class="amount">$${(depositAmount + interestAmount).toFixed(2)}</td>
    </tr>
  </table>

  ${(payload.deductions || []).length > 0 ? `
  <h2>Itemized Deductions</h2>
  <table>
    <tr>
      <th>Category</th>
      <th>Description</th>
      <th class="amount">Amount</th>
    </tr>
    ${(payload.deductions || []).map(d => `
    <tr>
      <td>${d.category.replace('_', ' ').toUpperCase()}</td>
      <td>${d.description}</td>
      <td class="amount">$${parseFloat(d.amount).toFixed(2)}</td>
    </tr>
    `).join('')}
    <tr class="total-row">
      <td colspan="2">Total Deductions</td>
      <td class="amount">$${totalDeductions.toFixed(2)}</td>
    </tr>
  </table>
  ` : '<p>No deductions applied.</p>'}

  <h2>Refund</h2>
  <table>
    <tr class="refund-row">
      <td>Amount to be Refunded</td>
      <td class="amount">$${refundAmount.toFixed(2)}</td>
    </tr>
  </table>

  ${refundAmount > 0 ? `
  <p>Your refund will be sent within the timeframe required by ${payload.stateCode} law (${payload.returnDeadline}).</p>
  ` : `
  <p>Based on the deductions above, no refund is due. ${totalDeductions > depositAmount + interestAmount ?
    `An additional balance of $${(totalDeductions - depositAmount - interestAmount).toFixed(2)} remains due.` : ''}</p>
  `}

  <div class="footer">
    <p>If you have questions about this statement, please contact your property manager.</p>
    <p>This statement is provided in accordance with ${payload.stateCode} security deposit laws.</p>
  </div>
</body>
</html>
    `.trim();

    // Store statement
    await supabase.from('security_deposit_statements').insert({
      deposit_id: payload.depositId,
      tenant_id: payload.tenantId,
      property_id: payload.propertyId,
      statement_html: statementHtml,
      generated_date: new Date().toISOString(),
    });

    return {
      ...payload,
      statementHtml,
    };
  }

  /**
   * Process refund payment
   */
  private async processRefund(
    sagaId: UUID,
    payload: SecurityDepositSagaPayload
  ): Promise<SecurityDepositSagaPayload> {
    console.log(`[SecurityDepositSaga:${sagaId}] Processing refund`);

    const refundAmount = parseFloat(payload.refundAmount || '0');

    if (refundAmount <= 0) {
      console.log(`[SecurityDepositSaga:${sagaId}] No refund due`);
      return payload;
    }

    // Generate check number
    const { data: checkData } = await supabase.rpc('get_next_check_number', {
      p_org_id: this.organizationId,
    });

    const checkNumber = checkData?.toString() || `DEP-${Date.now()}`;

    // Create refund check record
    await supabase.from('security_deposit_refunds').insert({
      deposit_id: payload.depositId,
      tenant_id: payload.tenantId,
      amount: payload.refundAmount,
      check_number: checkNumber,
      issue_date: new Date().toISOString().split('T')[0],
      status: 'issued',
    });

    // Emit event for check printing
    await this.events.emit({
      eventType: 'check.print.queue',
      payload: {
        checkNumber,
        payee: payload.tenantId,
        amount: payload.refundAmount,
        memo: 'Security deposit refund',
        type: 'deposit_refund',
      },
    });

    return {
      ...payload,
      checkNumber,
    };
  }

  /**
   * Notify tenant of return
   */
  private async notifyTenantReturn(
    sagaId: UUID,
    payload: SecurityDepositSagaPayload
  ): Promise<SecurityDepositSagaPayload> {
    console.log(`[SecurityDepositSaga:${sagaId}] Notifying tenant of return`);

    await this.events.emit({
      eventType: 'notification.send',
      payload: {
        type: 'security_deposit_statement',
        recipientType: 'tenant',
        recipientId: payload.tenantId,
        data: {
          depositAmount: payload.amount,
          interestEarned: payload.accruedInterest,
          totalDeductions: payload.totalDeductions,
          refundAmount: payload.refundAmount,
          checkNumber: payload.checkNumber,
          statement: payload.statementHtml,
          deadline: payload.returnDeadline,
        },
        attachments: [
          {
            filename: 'security_deposit_statement.html',
            content: payload.statementHtml,
            contentType: 'text/html',
          },
        ],
      },
    });

    return payload;
  }
}

export class SecurityDepositSagaError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SecurityDepositSagaError';
    this.code = code;
  }
}

export function createSecurityDepositSaga(organizationId: string): SecurityDepositSaga {
  return new SecurityDepositSaga(organizationId);
}
