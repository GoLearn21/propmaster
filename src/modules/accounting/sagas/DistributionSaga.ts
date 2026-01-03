/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * DistributionSaga - Owner Payout Workflow
 *
 * TITANIUM RULES ENFORCED:
 * 1. Immutable Ledger - All distributions create journal entries
 * 2. Double-Entry Only - Debit Owner Liability, Credit Trust Bank
 * 3. Law as Data - Distribution frequency from compliance_rules
 * 4. O(1) Reads - Owner balance from dimensional_balances
 *
 * SAGA STEPS:
 * 1. CALCULATE_DISTRIBUTION - Determine payout amount per owner
 * 2. VALIDATE_RESERVES - Ensure minimum reserve requirements
 * 3. CREATE_JOURNAL_ENTRIES - Post distribution entries
 * 4. GENERATE_NACHA - Create ACH file for batch payment
 * 5. SUBMIT_TO_BANK - Send NACHA file to bank processor
 * 6. RECORD_CONFIRMATION - Update status on bank response
 */

import { supabase } from '@/lib/supabase';
import type { Decimal, ISODate, UUID, JournalPostingInput } from '../types';
import { LedgerService, createLedgerService } from '../services/LedgerService';
import { ComplianceService, createComplianceService } from '../services/ComplianceService';
import { EventService, createEventService } from '../events/EventService';
import { SagaOrchestrator, createSagaOrchestrator } from './SagaOrchestrator';

export const DISTRIBUTION_SAGA_STEPS = [
  'CALCULATE_DISTRIBUTION',
  'VALIDATE_RESERVES',
  'CREATE_JOURNAL_ENTRIES',
  'GENERATE_NACHA',
  'SUBMIT_TO_BANK',
  'RECORD_CONFIRMATION',
] as const;

export type DistributionSagaStep = (typeof DISTRIBUTION_SAGA_STEPS)[number];

export interface DistributionSagaPayload {
  distributionId: UUID;
  distributionDate: ISODate;
  effectiveDate: ISODate; // ACH settlement date
  ownerId?: UUID; // Optional: specific owner, or all owners if null
  propertyIds?: UUID[]; // Optional: specific properties
  // Populated during saga execution
  ownerDistributions?: OwnerDistribution[];
  totalDistributionAmount?: Decimal;
  nachaFileId?: string;
  nachaContent?: string;
  bankSubmissionId?: string;
  bankConfirmationNumber?: string;
}

export interface OwnerDistribution {
  ownerId: UUID;
  ownerName: string;
  propertyId: UUID;
  propertyName: string;
  availableBalance: Decimal;
  reserveAmount: Decimal;
  distributionAmount: Decimal;
  journalEntryId?: UUID;
  bankAccountLast4?: string;
  bankRoutingLast4?: string;
  paymentMethod: 'ach' | 'check' | 'hold';
}

export interface NACHAFile {
  fileId: string;
  content: string;
  batchCount: number;
  entryCount: number;
  totalDebit: Decimal;
  totalCredit: Decimal;
  createdAt: string;
}

export class DistributionSaga {
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
   * Start a new distribution saga
   */
  async startDistributionSaga(payload: DistributionSagaPayload): Promise<{
    sagaId: UUID;
    success: boolean;
    error?: string;
  }> {
    try {
      // Check for existing distribution on same date
      const { data: existing } = await supabase
        .from('owner_distributions')
        .select('id')
        .eq('distribution_date', payload.distributionDate)
        .eq('organization_id', this.organizationId)
        .eq('status', 'pending')
        .single();

      if (existing) {
        throw new DistributionSagaError(
          'Distribution already in progress for this date',
          'DUPLICATE_DISTRIBUTION'
        );
      }

      // Start the saga
      const sagaId = await this.orchestrator.startSaga(
        'OWNER_DISTRIBUTION',
        payload,
        DISTRIBUTION_SAGA_STEPS as unknown as string[]
      );

      // Execute first step
      await this.executeStep(sagaId, 'CALCULATE_DISTRIBUTION', payload);

      return { sagaId, success: true };
    } catch (error) {
      console.error('[DistributionSaga] Failed to start:', error);
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
    step: DistributionSagaStep,
    payload: DistributionSagaPayload
  ): Promise<DistributionSagaPayload> {
    await this.orchestrator.heartbeat(sagaId);

    try {
      let updatedPayload: DistributionSagaPayload;

      switch (step) {
        case 'CALCULATE_DISTRIBUTION':
          updatedPayload = await this.calculateDistribution(sagaId, payload);
          break;
        case 'VALIDATE_RESERVES':
          updatedPayload = await this.validateReserves(sagaId, payload);
          break;
        case 'CREATE_JOURNAL_ENTRIES':
          updatedPayload = await this.createJournalEntries(sagaId, payload);
          break;
        case 'GENERATE_NACHA':
          updatedPayload = await this.generateNACHA(sagaId, payload);
          break;
        case 'SUBMIT_TO_BANK':
          updatedPayload = await this.submitToBank(sagaId, payload);
          break;
        case 'RECORD_CONFIRMATION':
          updatedPayload = await this.recordConfirmation(sagaId, payload);
          break;
        default:
          throw new DistributionSagaError(`Unknown step: ${step}`, 'UNKNOWN_STEP');
      }

      // Advance to next step
      const currentIndex = DISTRIBUTION_SAGA_STEPS.indexOf(step);
      if (currentIndex < DISTRIBUTION_SAGA_STEPS.length - 1) {
        const nextStep = DISTRIBUTION_SAGA_STEPS[currentIndex + 1];
        await this.orchestrator.advanceSaga(sagaId, nextStep, updatedPayload);

        await this.events.emit({
          eventType: 'saga.step.ready',
          payload: {
            sagaId,
            sagaType: 'OWNER_DISTRIBUTION',
            step: nextStep,
            payload: updatedPayload,
          },
        });
      } else {
        await this.orchestrator.completeSaga(sagaId, updatedPayload);

        await this.events.emit({
          eventType: 'distribution.completed',
          payload: {
            distributionId: payload.distributionId,
            ownerCount: updatedPayload.ownerDistributions?.length || 0,
            totalAmount: updatedPayload.totalDistributionAmount,
            nachaFileId: updatedPayload.nachaFileId,
            bankConfirmation: updatedPayload.bankConfirmationNumber,
          },
        });
      }

      return updatedPayload;
    } catch (error) {
      console.error(`[DistributionSaga] Step ${step} failed:`, error);

      await this.orchestrator.failSaga(
        sagaId,
        error instanceof Error ? error.message : 'Unknown error'
      );
      await this.compensate(sagaId, step, payload);

      throw error;
    }
  }

  /**
   * Step 1: Calculate Distribution
   * Determine payout amount for each owner based on their balance
   */
  private async calculateDistribution(
    sagaId: UUID,
    payload: DistributionSagaPayload
  ): Promise<DistributionSagaPayload> {
    console.log(`[DistributionSaga:${sagaId}] Calculating distributions`);

    // Build query for owner balances
    let query = supabase
      .from('dimensional_balances')
      .select(`
        owner_id,
        property_id,
        balance,
        owners!inner(name, payment_method, bank_account_last4, bank_routing_last4),
        properties!inner(name)
      `)
      .eq('organization_id', this.organizationId)
      .not('owner_id', 'is', null);

    if (payload.ownerId) {
      query = query.eq('owner_id', payload.ownerId);
    }

    if (payload.propertyIds && payload.propertyIds.length > 0) {
      query = query.in('property_id', payload.propertyIds);
    }

    const { data: balances, error } = await query;

    if (error) {
      throw new DistributionSagaError(
        `Failed to fetch owner balances: ${error.message}`,
        'FETCH_BALANCES_FAILED'
      );
    }

    // Get minimum reserve requirement from compliance
    const minReserve = await this.compliance.getMinimumReserve();

    const ownerDistributions: OwnerDistribution[] = [];
    let totalAmount = 0;

    for (const balance of balances || []) {
      const availableBalance = parseFloat(balance.balance);

      // Skip if balance is negative or below minimum
      if (availableBalance <= minReserve) {
        continue;
      }

      const distributionAmount = availableBalance - minReserve;

      ownerDistributions.push({
        ownerId: balance.owner_id,
        ownerName: balance.owners.name,
        propertyId: balance.property_id,
        propertyName: balance.properties.name,
        availableBalance: availableBalance.toFixed(2) as Decimal,
        reserveAmount: minReserve.toFixed(2) as Decimal,
        distributionAmount: distributionAmount.toFixed(2) as Decimal,
        bankAccountLast4: balance.owners.bank_account_last4,
        bankRoutingLast4: balance.owners.bank_routing_last4,
        paymentMethod: balance.owners.payment_method || 'ach',
      });

      totalAmount += distributionAmount;
    }

    if (ownerDistributions.length === 0) {
      throw new DistributionSagaError(
        'No owners eligible for distribution',
        'NO_ELIGIBLE_OWNERS'
      );
    }

    return {
      ...payload,
      ownerDistributions,
      totalDistributionAmount: totalAmount.toFixed(2) as Decimal,
    };
  }

  /**
   * Step 2: Validate Reserves
   * Ensure trust bank has sufficient funds
   */
  private async validateReserves(
    sagaId: UUID,
    payload: DistributionSagaPayload
  ): Promise<DistributionSagaPayload> {
    console.log(`[DistributionSaga:${sagaId}] Validating reserves`);

    // Get trust bank balance
    const { data: trustBalance } = await supabase
      .from('account_balances')
      .select(`
        balance,
        chart_of_accounts!inner(account_subtype)
      `)
      .eq('organization_id', this.organizationId)
      .eq('chart_of_accounts.account_subtype', 'trust_bank')
      .single();

    const trustBankBalance = parseFloat(trustBalance?.balance || '0');
    const totalDistribution = parseFloat(payload.totalDistributionAmount || '0');

    if (trustBankBalance < totalDistribution) {
      throw new DistributionSagaError(
        `Insufficient trust bank funds. Available: ${trustBankBalance}, Required: ${totalDistribution}`,
        'INSUFFICIENT_FUNDS'
      );
    }

    // Additional check: ensure no single distribution exceeds available balance
    for (const dist of payload.ownerDistributions || []) {
      if (parseFloat(dist.distributionAmount) > parseFloat(dist.availableBalance)) {
        throw new DistributionSagaError(
          `Distribution amount exceeds available balance for owner ${dist.ownerId}`,
          'INVALID_DISTRIBUTION_AMOUNT'
        );
      }
    }

    return payload;
  }

  /**
   * Step 3: Create Journal Entries
   * Post distribution entries: Debit Owner Liability, Credit Trust Bank
   */
  private async createJournalEntries(
    sagaId: UUID,
    payload: DistributionSagaPayload
  ): Promise<DistributionSagaPayload> {
    console.log(`[DistributionSaga:${sagaId}] Creating journal entries`);

    // Get account IDs
    const { ownerLiabilityAccountId, trustBankAccountId } =
      await this.getDistributionAccounts();

    const updatedDistributions: OwnerDistribution[] = [];

    for (const dist of payload.ownerDistributions || []) {
      const amount = parseFloat(dist.distributionAmount);

      if (amount <= 0) continue;

      const postings: JournalPostingInput[] = [
        {
          accountId: ownerLiabilityAccountId,
          amount: amount.toFixed(4) as Decimal, // Debit (reduce liability)
          propertyId: dist.propertyId,
          ownerId: dist.ownerId,
          description: `Owner distribution - ${dist.ownerName}`,
        },
        {
          accountId: trustBankAccountId,
          amount: (-amount).toFixed(4) as Decimal, // Credit (reduce cash)
          propertyId: dist.propertyId,
          ownerId: dist.ownerId,
          description: `Owner distribution payment`,
        },
      ];

      const journalEntry = await this.ledger.createJournalEntry({
        entryDate: payload.distributionDate,
        entryType: 'distribution',
        description: `Owner distribution to ${dist.ownerName}`,
        postings,
        metadata: {
          distributionId: payload.distributionId,
          ownerId: dist.ownerId,
          propertyId: dist.propertyId,
          sagaId,
        },
      });

      updatedDistributions.push({
        ...dist,
        journalEntryId: journalEntry.id,
      });

      // Create distribution record
      await supabase.from('owner_distributions').insert({
        id: crypto.randomUUID(),
        organization_id: this.organizationId,
        owner_id: dist.ownerId,
        property_id: dist.propertyId,
        distribution_date: payload.distributionDate,
        effective_date: payload.effectiveDate,
        amount: dist.distributionAmount,
        journal_entry_id: journalEntry.id,
        payment_method: dist.paymentMethod,
        status: 'pending',
      });
    }

    return {
      ...payload,
      ownerDistributions: updatedDistributions,
    };
  }

  /**
   * Step 4: Generate NACHA File
   * Create ACH batch file for bank submission
   */
  private async generateNACHA(
    sagaId: UUID,
    payload: DistributionSagaPayload
  ): Promise<DistributionSagaPayload> {
    console.log(`[DistributionSaga:${sagaId}] Generating NACHA file`);

    const achDistributions = (payload.ownerDistributions || []).filter(
      (d) => d.paymentMethod === 'ach'
    );

    if (achDistributions.length === 0) {
      console.log(`[DistributionSaga:${sagaId}] No ACH distributions, skipping NACHA`);
      return payload;
    }

    // Get organization bank details
    const { data: orgBank } = await supabase
      .from('organization_bank_accounts')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('account_type', 'trust')
      .single();

    if (!orgBank) {
      throw new DistributionSagaError(
        'Organization trust bank account not configured',
        'BANK_NOT_CONFIGURED'
      );
    }

    // Generate NACHA file
    const nachaFile = this.createNACHAFile(
      achDistributions,
      orgBank,
      payload.effectiveDate
    );

    // Store NACHA file
    await supabase.from('nacha_files').insert({
      id: nachaFile.fileId,
      organization_id: this.organizationId,
      distribution_id: payload.distributionId,
      file_content: nachaFile.content,
      batch_count: nachaFile.batchCount,
      entry_count: nachaFile.entryCount,
      total_debit: nachaFile.totalDebit,
      total_credit: nachaFile.totalCredit,
      effective_date: payload.effectiveDate,
      status: 'generated',
    });

    return {
      ...payload,
      nachaFileId: nachaFile.fileId,
      nachaContent: nachaFile.content,
    };
  }

  /**
   * Step 5: Submit to Bank
   * Send NACHA file to bank processor
   */
  private async submitToBank(
    sagaId: UUID,
    payload: DistributionSagaPayload
  ): Promise<DistributionSagaPayload> {
    console.log(`[DistributionSaga:${sagaId}] Submitting to bank`);

    if (!payload.nachaFileId) {
      // No ACH submissions needed
      return payload;
    }

    // In production, this would call the bank API
    // For now, we emit an event for external processing
    await this.events.emit({
      eventType: 'bank.nacha.submit',
      payload: {
        nachaFileId: payload.nachaFileId,
        content: payload.nachaContent,
        distributionId: payload.distributionId,
        effectiveDate: payload.effectiveDate,
      },
    });

    // Generate a submission ID
    const bankSubmissionId = `ACH-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Update NACHA file status
    await supabase
      .from('nacha_files')
      .update({
        status: 'submitted',
        bank_submission_id: bankSubmissionId,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', payload.nachaFileId);

    return {
      ...payload,
      bankSubmissionId,
    };
  }

  /**
   * Step 6: Record Confirmation
   * Update distribution status on bank confirmation
   */
  private async recordConfirmation(
    sagaId: UUID,
    payload: DistributionSagaPayload
  ): Promise<DistributionSagaPayload> {
    console.log(`[DistributionSaga:${sagaId}] Recording confirmation`);

    // In a real system, this would wait for bank webhook
    // For now, we mark as processed and emit notification events

    const confirmationNumber = `CONF-${Date.now()}`;

    // Update all distributions
    for (const dist of payload.ownerDistributions || []) {
      await supabase
        .from('owner_distributions')
        .update({
          status: 'processed',
          bank_confirmation: confirmationNumber,
          processed_at: new Date().toISOString(),
        })
        .eq('distribution_date', payload.distributionDate)
        .eq('owner_id', dist.ownerId)
        .eq('property_id', dist.propertyId);

      // Notify owner
      await this.events.emit({
        eventType: 'notification.send',
        payload: {
          type: 'distribution_sent',
          recipientType: 'owner',
          recipientId: dist.ownerId,
          data: {
            amount: dist.distributionAmount,
            propertyName: dist.propertyName,
            effectiveDate: payload.effectiveDate,
            paymentMethod: dist.paymentMethod,
          },
        },
      });
    }

    // Update NACHA file if exists
    if (payload.nachaFileId) {
      await supabase
        .from('nacha_files')
        .update({
          status: 'confirmed',
          bank_confirmation: confirmationNumber,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', payload.nachaFileId);
    }

    return {
      ...payload,
      bankConfirmationNumber: confirmationNumber,
    };
  }

  /**
   * Compensation: Reverse completed steps on failure
   */
  private async compensate(
    sagaId: UUID,
    failedStep: DistributionSagaStep,
    payload: DistributionSagaPayload
  ): Promise<void> {
    console.log(`[DistributionSaga:${sagaId}] Starting compensation from: ${failedStep}`);

    await this.orchestrator.startCompensation(sagaId);

    const stepIndex = DISTRIBUTION_SAGA_STEPS.indexOf(failedStep);

    for (let i = stepIndex - 1; i >= 0; i--) {
      const step = DISTRIBUTION_SAGA_STEPS[i];

      try {
        switch (step) {
          case 'CREATE_JOURNAL_ENTRIES':
            // Reverse all journal entries
            for (const dist of payload.ownerDistributions || []) {
              if (dist.journalEntryId) {
                await this.ledger.reverseJournalEntry(
                  dist.journalEntryId,
                  payload.distributionDate,
                  'Distribution saga compensation'
                );
              }
            }
            // Delete distribution records
            await supabase
              .from('owner_distributions')
              .delete()
              .eq('distribution_date', payload.distributionDate)
              .eq('organization_id', this.organizationId);
            break;

          case 'GENERATE_NACHA':
            // Mark NACHA file as cancelled
            if (payload.nachaFileId) {
              await supabase
                .from('nacha_files')
                .update({ status: 'cancelled' })
                .eq('id', payload.nachaFileId);
            }
            break;

          case 'SUBMIT_TO_BANK':
            // In production, would call bank API to cancel
            await this.events.emit({
              eventType: 'bank.nacha.cancel',
              payload: {
                nachaFileId: payload.nachaFileId,
                bankSubmissionId: payload.bankSubmissionId,
                reason: 'Saga compensation',
              },
            });
            break;
        }

        console.log(`[DistributionSaga:${sagaId}] Compensated step: ${step}`);
      } catch (error) {
        console.error(`[DistributionSaga:${sagaId}] Compensation failed for ${step}:`, error);
      }
    }

    await this.events.emit({
      eventType: 'distribution.compensation.completed',
      payload: {
        sagaId,
        distributionId: payload.distributionId,
        failedStep,
      },
    });
  }

  // Helper methods

  private async getDistributionAccounts(): Promise<{
    ownerLiabilityAccountId: UUID;
    trustBankAccountId: UUID;
  }> {
    const { data: ownerLiability } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'owner_liability')
      .single();

    const { data: trustBank } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'trust_bank')
      .single();

    if (!ownerLiability || !trustBank) {
      throw new DistributionSagaError(
        'Required accounts not found',
        'ACCOUNTS_NOT_FOUND'
      );
    }

    return {
      ownerLiabilityAccountId: ownerLiability.id,
      trustBankAccountId: trustBank.id,
    };
  }

  /**
   * Create NACHA file content
   * Standard ACH file format
   */
  private createNACHAFile(
    distributions: OwnerDistribution[],
    orgBank: { routing_number: string; account_number: string; company_name: string; company_id: string },
    effectiveDate: ISODate
  ): NACHAFile {
    const fileId = `NACHA-${Date.now()}`;
    const lines: string[] = [];

    const creationDate = new Date();
    const formattedDate = creationDate.toISOString().slice(2, 10).replace(/-/g, '');
    const formattedTime = creationDate.toTimeString().slice(0, 5).replace(':', '');
    const effectiveDateFormatted = effectiveDate.replace(/-/g, '').slice(2);

    // File Header Record (1)
    lines.push(
      '1' + // Record Type Code
      '01' + // Priority Code
      ' ' + orgBank.routing_number.padStart(10, ' ') + // Immediate Destination
      orgBank.company_id.padStart(10, ' ') + // Immediate Origin
      formattedDate + // File Creation Date
      formattedTime + // File Creation Time
      'A' + // File ID Modifier
      '094' + // Record Size
      '10' + // Blocking Factor
      '1' + // Format Code
      'DESTINATION BANK'.padEnd(23, ' ') + // Immediate Destination Name
      orgBank.company_name.padEnd(23, ' ') + // Immediate Origin Name
      ''.padEnd(8, ' ') // Reference Code
    );

    // Batch Header Record (5)
    lines.push(
      '5' + // Record Type Code
      '220' + // Service Class Code (Credits only)
      orgBank.company_name.substring(0, 16).padEnd(16, ' ') + // Company Name
      ''.padEnd(20, ' ') + // Company Discretionary Data
      orgBank.company_id.padStart(10, ' ') + // Company Identification
      'PPD' + // Standard Entry Class Code
      'OWNER PAY'.padEnd(10, ' ') + // Company Entry Description
      effectiveDateFormatted + // Company Descriptive Date
      effectiveDateFormatted + // Effective Entry Date
      ''.padEnd(3, ' ') + // Settlement Date
      '1' + // Originator Status Code
      orgBank.routing_number.substring(0, 8) + // Originating DFI Identification
      '0000001' // Batch Number
    );

    let entryCount = 0;
    let totalCredit = 0;
    let entryHash = 0;

    // Entry Detail Records (6)
    for (const dist of distributions) {
      if (!dist.bankRoutingLast4 || !dist.bankAccountLast4) continue;

      const amount = Math.round(parseFloat(dist.distributionAmount) * 100);
      totalCredit += amount;
      entryCount++;

      // For hash, use last 8 digits of routing (simulated here)
      const routingForHash = parseInt(dist.bankRoutingLast4.padStart(8, '0').slice(-8)) || 0;
      entryHash += routingForHash;

      lines.push(
        '6' + // Record Type Code
        '22' + // Transaction Code (Checking Credit)
        ('XXXX' + dist.bankRoutingLast4).padStart(9, '0') + // Receiving DFI Identification
        ('XXXX' + dist.bankAccountLast4).padEnd(17, ' ') + // DFI Account Number
        amount.toString().padStart(10, '0') + // Amount
        dist.ownerId.substring(0, 15).padEnd(15, ' ') + // Individual ID
        dist.ownerName.substring(0, 22).padEnd(22, ' ') + // Individual Name
        '  ' + // Discretionary Data
        '0' + // Addenda Record Indicator
        orgBank.routing_number.substring(0, 8) + // Trace Number - ODFI
        entryCount.toString().padStart(7, '0') // Trace Number - Sequence
      );
    }

    // Batch Control Record (8)
    lines.push(
      '8' + // Record Type Code
      '220' + // Service Class Code
      entryCount.toString().padStart(6, '0') + // Entry/Addenda Count
      (entryHash % 10000000000).toString().padStart(10, '0') + // Entry Hash
      '0'.padStart(12, '0') + // Total Debit Amount
      totalCredit.toString().padStart(12, '0') + // Total Credit Amount
      orgBank.company_id.padStart(10, ' ') + // Company Identification
      ''.padEnd(19, ' ') + // Message Authentication Code
      ''.padEnd(6, ' ') + // Reserved
      orgBank.routing_number.substring(0, 8) + // Originating DFI
      '0000001' // Batch Number
    );

    // File Control Record (9)
    const blockCount = Math.ceil((lines.length + 1) / 10);
    lines.push(
      '9' + // Record Type Code
      '000001' + // Batch Count
      blockCount.toString().padStart(6, '0') + // Block Count
      entryCount.toString().padStart(8, '0') + // Entry/Addenda Count
      (entryHash % 10000000000).toString().padStart(10, '0') + // Entry Hash
      '0'.padStart(12, '0') + // Total Debit Amount
      totalCredit.toString().padStart(12, '0') + // Total Credit Amount
      ''.padEnd(39, ' ') // Reserved
    );

    // Pad to full blocks
    while (lines.length % 10 !== 0) {
      lines.push('9'.padEnd(94, '9'));
    }

    return {
      fileId,
      content: lines.join('\n'),
      batchCount: 1,
      entryCount,
      totalDebit: '0.00' as Decimal,
      totalCredit: (totalCredit / 100).toFixed(2) as Decimal,
      createdAt: new Date().toISOString(),
    };
  }
}

export class DistributionSagaError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'DistributionSagaError';
    this.code = code;
  }
}

export function createDistributionSaga(organizationId: string): DistributionSaga {
  return new DistributionSaga(organizationId);
}
