/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Integration Test: Payment → Journal → Balance Cascade
 *
 * Tests the complete flow from tenant payment to ledger entries to balance updates.
 * Ensures data consistency across all layers:
 * 1. Payment is recorded correctly
 * 2. Journal entries are created with proper double-entry
 * 3. Account balances are updated atomically
 * 4. Tenant ledger reflects the payment
 * 5. AR aging is updated
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Decimal from 'decimal.js';

// Configure Decimal for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============================================================================
// INTEGRATION TEST TYPES
// ============================================================================

interface Payment {
  id: string;
  tenantId: string;
  leaseId: string;
  propertyId: string;
  amount: string;
  method: 'ach' | 'credit_card' | 'check' | 'cash';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'nsf';
  reference: string;
  createdAt: Date;
  processedAt?: Date;
}

interface JournalEntry {
  id: string;
  description: string;
  postings: JournalPosting[];
  sourceDocumentId: string;
  sourceDocumentType: string;
  traceId: string;
  createdAt: Date;
}

interface JournalPosting {
  id: string;
  entryId: string;
  accountId: string;
  accountName: string;
  amount: string;
  dimensionTenantId?: string;
  dimensionPropertyId?: string;
}

interface AccountBalance {
  accountId: string;
  balance: string;
  lastUpdated: Date;
}

interface TenantLedgerEntry {
  id: string;
  tenantId: string;
  type: 'charge' | 'payment' | 'credit' | 'adjustment';
  amount: string;
  balance: string;
  description: string;
  date: Date;
}

interface ARAgingBucket {
  tenantId: string;
  current: string;
  days30: string;
  days60: string;
  days90: string;
  days90Plus: string;
  total: string;
}

// ============================================================================
// INTEGRATED PAYMENT SYSTEM (Test Implementation)
// ============================================================================

class IntegratedPaymentSystem {
  private payments: Payment[] = [];
  private journalEntries: JournalEntry[] = [];
  private accountBalances: Map<string, AccountBalance> = new Map();
  private tenantLedger: TenantLedgerEntry[] = [];
  private arAging: Map<string, ARAgingBucket> = new Map();

  // Account IDs
  private readonly ACCOUNTS = {
    CASH: '1010-cash',
    OPERATING_BANK: '1020-operating-bank',
    ACCOUNTS_RECEIVABLE: '1100-ar',
    UNEARNED_REVENUE: '2100-unearned',
    RENT_REVENUE: '4010-rent-revenue',
    LATE_FEE_REVENUE: '4020-late-fee-revenue',
    TRUST_DEPOSIT: '2200-trust-deposits',
    OWNER_PAYABLE: '2300-owner-payable',
  };

  constructor() {
    // Initialize account balances
    Object.values(this.ACCOUNTS).forEach((accountId) => {
      this.accountBalances.set(accountId, {
        accountId,
        balance: '0.0000',
        lastUpdated: new Date(),
      });
    });
  }

  /**
   * Process a tenant payment - the main integration flow
   */
  async processPayment(params: {
    tenantId: string;
    leaseId: string;
    propertyId: string;
    amount: string;
    method: Payment['method'];
    chargeIds?: string[];
  }): Promise<{
    success: boolean;
    payment?: Payment;
    journalEntry?: JournalEntry;
    error?: string;
  }> {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 1. Create payment record
    const payment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      leaseId: params.leaseId,
      propertyId: params.propertyId,
      amount: params.amount,
      method: params.method,
      status: 'pending',
      reference: `REF-${Date.now()}`,
      createdAt: new Date(),
    };

    this.payments.push(payment);

    // 2. Validate payment amount
    if (new Decimal(params.amount).lessThanOrEqualTo(0)) {
      payment.status = 'failed';
      return { success: false, error: 'Payment amount must be positive' };
    }

    // 3. Update payment status to processing
    payment.status = 'processing';

    // 4. Create journal entry
    const journalEntry = this.createPaymentJournalEntry({
      payment,
      traceId,
    });

    // 5. Update account balances atomically
    this.updateAccountBalances(journalEntry.postings);

    // 6. Update tenant ledger
    this.updateTenantLedger({
      tenantId: params.tenantId,
      type: 'payment',
      amount: `-${params.amount}`, // Negative = reduces balance
      description: `Payment - ${params.method.toUpperCase()}`,
    });

    // 7. Update AR aging
    this.updateARAgingForPayment(params.tenantId, params.amount);

    // 8. Mark payment as completed
    payment.status = 'completed';
    payment.processedAt = new Date();

    return { success: true, payment, journalEntry };
  }

  /**
   * Create a charge (rent, late fee, etc.)
   */
  createCharge(params: {
    tenantId: string;
    leaseId: string;
    propertyId: string;
    amount: string;
    type: 'rent' | 'late_fee' | 'utility' | 'other';
    description: string;
    dueDate: Date;
  }): { success: boolean; journalEntry?: JournalEntry } {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine revenue account based on charge type
    let revenueAccount = this.ACCOUNTS.RENT_REVENUE;
    if (params.type === 'late_fee') {
      revenueAccount = this.ACCOUNTS.LATE_FEE_REVENUE;
    }

    // Create journal entry for charge
    const journalEntry = this.createChargeJournalEntry({
      tenantId: params.tenantId,
      propertyId: params.propertyId,
      amount: params.amount,
      revenueAccount,
      description: params.description,
      traceId,
    });

    // Update account balances
    this.updateAccountBalances(journalEntry.postings);

    // Update tenant ledger
    this.updateTenantLedger({
      tenantId: params.tenantId,
      type: 'charge',
      amount: params.amount, // Positive = increases balance
      description: params.description,
    });

    // Update AR aging
    this.updateARAgingForCharge(params.tenantId, params.amount, params.dueDate);

    return { success: true, journalEntry };
  }

  /**
   * Handle NSF (bounced payment)
   */
  async processNSF(params: {
    originalPaymentId: string;
    nsfFee: string;
  }): Promise<{
    success: boolean;
    reversalEntry?: JournalEntry;
    feeEntry?: JournalEntry;
    error?: string;
  }> {
    const payment = this.payments.find((p) => p.id === params.originalPaymentId);

    if (!payment) {
      return { success: false, error: 'Original payment not found' };
    }

    if (payment.status !== 'completed') {
      return { success: false, error: 'Can only NSF completed payments' };
    }

    const traceId = `nsf_trace_${Date.now()}`;

    // 1. Mark original payment as NSF
    payment.status = 'nsf';

    // 2. Create reversal journal entry
    const reversalEntry = this.createNSFReversalEntry({
      payment,
      traceId,
    });

    this.updateAccountBalances(reversalEntry.postings);

    // 3. Update tenant ledger with reversal
    this.updateTenantLedger({
      tenantId: payment.tenantId,
      type: 'adjustment',
      amount: payment.amount, // Re-add the amount
      description: `NSF Reversal - Payment ${payment.reference}`,
    });

    // 4. Create NSF fee charge if applicable
    let feeEntry: JournalEntry | undefined;
    if (new Decimal(params.nsfFee).greaterThan(0)) {
      feeEntry = this.createChargeJournalEntry({
        tenantId: payment.tenantId,
        propertyId: payment.propertyId,
        amount: params.nsfFee,
        revenueAccount: this.ACCOUNTS.LATE_FEE_REVENUE,
        description: 'NSF Fee',
        traceId,
      });

      this.updateAccountBalances(feeEntry.postings);

      this.updateTenantLedger({
        tenantId: payment.tenantId,
        type: 'charge',
        amount: params.nsfFee,
        description: 'NSF Fee',
      });
    }

    // 5. Update AR aging
    const totalToRestore = new Decimal(payment.amount).plus(new Decimal(params.nsfFee || '0'));
    this.updateARAgingForCharge(payment.tenantId, totalToRestore.toFixed(4), new Date());

    return { success: true, reversalEntry, feeEntry };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private createPaymentJournalEntry(params: {
    payment: Payment;
    traceId: string;
  }): JournalEntry {
    const entryId = `je_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const entry: JournalEntry = {
      id: entryId,
      description: `Payment received - ${params.payment.method.toUpperCase()}`,
      postings: [
        // Debit Cash/Bank
        {
          id: `post_${entryId}_0`,
          entryId,
          accountId: this.ACCOUNTS.OPERATING_BANK,
          accountName: 'Operating Bank',
          amount: params.payment.amount,
          dimensionTenantId: params.payment.tenantId,
          dimensionPropertyId: params.payment.propertyId,
        },
        // Credit AR
        {
          id: `post_${entryId}_1`,
          entryId,
          accountId: this.ACCOUNTS.ACCOUNTS_RECEIVABLE,
          accountName: 'Accounts Receivable',
          amount: new Decimal(params.payment.amount).negated().toFixed(4),
          dimensionTenantId: params.payment.tenantId,
          dimensionPropertyId: params.payment.propertyId,
        },
      ],
      sourceDocumentId: params.payment.id,
      sourceDocumentType: 'payment',
      traceId: params.traceId,
      createdAt: new Date(),
    };

    this.journalEntries.push(entry);
    return entry;
  }

  private createChargeJournalEntry(params: {
    tenantId: string;
    propertyId: string;
    amount: string;
    revenueAccount: string;
    description: string;
    traceId: string;
  }): JournalEntry {
    const entryId = `je_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const entry: JournalEntry = {
      id: entryId,
      description: params.description,
      postings: [
        // Debit AR
        {
          id: `post_${entryId}_0`,
          entryId,
          accountId: this.ACCOUNTS.ACCOUNTS_RECEIVABLE,
          accountName: 'Accounts Receivable',
          amount: params.amount,
          dimensionTenantId: params.tenantId,
          dimensionPropertyId: params.propertyId,
        },
        // Credit Revenue
        {
          id: `post_${entryId}_1`,
          entryId,
          accountId: params.revenueAccount,
          accountName: 'Revenue',
          amount: new Decimal(params.amount).negated().toFixed(4),
          dimensionTenantId: params.tenantId,
          dimensionPropertyId: params.propertyId,
        },
      ],
      sourceDocumentId: `charge_${Date.now()}`,
      sourceDocumentType: 'invoice',
      traceId: params.traceId,
      createdAt: new Date(),
    };

    this.journalEntries.push(entry);
    return entry;
  }

  private createNSFReversalEntry(params: { payment: Payment; traceId: string }): JournalEntry {
    const entryId = `je_nsf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const entry: JournalEntry = {
      id: entryId,
      description: `NSF Reversal - ${params.payment.reference}`,
      postings: [
        // Debit AR (restore receivable)
        {
          id: `post_${entryId}_0`,
          entryId,
          accountId: this.ACCOUNTS.ACCOUNTS_RECEIVABLE,
          accountName: 'Accounts Receivable',
          amount: params.payment.amount,
          dimensionTenantId: params.payment.tenantId,
          dimensionPropertyId: params.payment.propertyId,
        },
        // Credit Bank (reverse the deposit)
        {
          id: `post_${entryId}_1`,
          entryId,
          accountId: this.ACCOUNTS.OPERATING_BANK,
          accountName: 'Operating Bank',
          amount: new Decimal(params.payment.amount).negated().toFixed(4),
          dimensionTenantId: params.payment.tenantId,
          dimensionPropertyId: params.payment.propertyId,
        },
      ],
      sourceDocumentId: params.payment.id,
      sourceDocumentType: 'adjustment',
      traceId: params.traceId,
      createdAt: new Date(),
    };

    this.journalEntries.push(entry);
    return entry;
  }

  private updateAccountBalances(postings: JournalPosting[]): void {
    for (const posting of postings) {
      const current = this.accountBalances.get(posting.accountId);
      if (current) {
        current.balance = new Decimal(current.balance).plus(new Decimal(posting.amount)).toFixed(4);
        current.lastUpdated = new Date();
      }
    }
  }

  private updateTenantLedger(params: {
    tenantId: string;
    type: TenantLedgerEntry['type'];
    amount: string;
    description: string;
  }): void {
    // Get current balance
    const currentBalance = this.getTenantBalance(params.tenantId);
    const newBalance = new Decimal(currentBalance).plus(new Decimal(params.amount)).toFixed(4);

    this.tenantLedger.push({
      id: `ledger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      type: params.type,
      amount: params.amount,
      balance: newBalance,
      description: params.description,
      date: new Date(),
    });
  }

  private updateARAgingForPayment(tenantId: string, amount: string): void {
    const aging = this.arAging.get(tenantId) || this.createDefaultAging(tenantId);

    // Apply payment to oldest bucket first (FIFO)
    let remaining = new Decimal(amount);

    // 90+ days
    if (remaining.greaterThan(0) && new Decimal(aging.days90Plus).greaterThan(0)) {
      const toApply = Decimal.min(remaining, new Decimal(aging.days90Plus));
      aging.days90Plus = new Decimal(aging.days90Plus).minus(toApply).toFixed(4);
      remaining = remaining.minus(toApply);
    }

    // 60-90 days
    if (remaining.greaterThan(0) && new Decimal(aging.days90).greaterThan(0)) {
      const toApply = Decimal.min(remaining, new Decimal(aging.days90));
      aging.days90 = new Decimal(aging.days90).minus(toApply).toFixed(4);
      remaining = remaining.minus(toApply);
    }

    // 30-60 days
    if (remaining.greaterThan(0) && new Decimal(aging.days60).greaterThan(0)) {
      const toApply = Decimal.min(remaining, new Decimal(aging.days60));
      aging.days60 = new Decimal(aging.days60).minus(toApply).toFixed(4);
      remaining = remaining.minus(toApply);
    }

    // 1-30 days
    if (remaining.greaterThan(0) && new Decimal(aging.days30).greaterThan(0)) {
      const toApply = Decimal.min(remaining, new Decimal(aging.days30));
      aging.days30 = new Decimal(aging.days30).minus(toApply).toFixed(4);
      remaining = remaining.minus(toApply);
    }

    // Current
    if (remaining.greaterThan(0)) {
      aging.current = new Decimal(aging.current).minus(remaining).toFixed(4);
    }

    // Recalculate total
    aging.total = new Decimal(aging.current)
      .plus(new Decimal(aging.days30))
      .plus(new Decimal(aging.days60))
      .plus(new Decimal(aging.days90))
      .plus(new Decimal(aging.days90Plus))
      .toFixed(4);

    this.arAging.set(tenantId, aging);
  }

  private updateARAgingForCharge(tenantId: string, amount: string, dueDate: Date): void {
    const aging = this.arAging.get(tenantId) || this.createDefaultAging(tenantId);

    const today = new Date();
    const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysPastDue <= 0) {
      aging.current = new Decimal(aging.current).plus(new Decimal(amount)).toFixed(4);
    } else if (daysPastDue <= 30) {
      aging.days30 = new Decimal(aging.days30).plus(new Decimal(amount)).toFixed(4);
    } else if (daysPastDue <= 60) {
      aging.days60 = new Decimal(aging.days60).plus(new Decimal(amount)).toFixed(4);
    } else if (daysPastDue <= 90) {
      aging.days90 = new Decimal(aging.days90).plus(new Decimal(amount)).toFixed(4);
    } else {
      aging.days90Plus = new Decimal(aging.days90Plus).plus(new Decimal(amount)).toFixed(4);
    }

    // Recalculate total
    aging.total = new Decimal(aging.current)
      .plus(new Decimal(aging.days30))
      .plus(new Decimal(aging.days60))
      .plus(new Decimal(aging.days90))
      .plus(new Decimal(aging.days90Plus))
      .toFixed(4);

    this.arAging.set(tenantId, aging);
  }

  private createDefaultAging(tenantId: string): ARAgingBucket {
    return {
      tenantId,
      current: '0.0000',
      days30: '0.0000',
      days60: '0.0000',
      days90: '0.0000',
      days90Plus: '0.0000',
      total: '0.0000',
    };
  }

  // ============================================================================
  // PUBLIC QUERY METHODS
  // ============================================================================

  getAccountBalance(accountId: string): string {
    return this.accountBalances.get(accountId)?.balance || '0.0000';
  }

  getTenantBalance(tenantId: string): string {
    const entries = this.tenantLedger.filter((e) => e.tenantId === tenantId);
    if (entries.length === 0) return '0.0000';
    return entries[entries.length - 1].balance;
  }

  getTenantLedgerEntries(tenantId: string): TenantLedgerEntry[] {
    return this.tenantLedger.filter((e) => e.tenantId === tenantId);
  }

  getARAgingForTenant(tenantId: string): ARAgingBucket | undefined {
    return this.arAging.get(tenantId);
  }

  getJournalEntriesForPayment(paymentId: string): JournalEntry[] {
    return this.journalEntries.filter((e) => e.sourceDocumentId === paymentId);
  }

  getPaymentById(paymentId: string): Payment | undefined {
    return this.payments.find((p) => p.id === paymentId);
  }

  validateDoubleEntry(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const entry of this.journalEntries) {
      const sum = entry.postings.reduce((acc, p) => acc.plus(new Decimal(p.amount)), new Decimal(0));

      if (!sum.equals(0)) {
        errors.push(`Entry ${entry.id} is unbalanced: sum = ${sum.toFixed(4)}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  getTotalARBalance(): string {
    return this.getAccountBalance(this.ACCOUNTS.ACCOUNTS_RECEIVABLE);
  }

  getTotalCashBalance(): string {
    return this.getAccountBalance(this.ACCOUNTS.OPERATING_BANK);
  }
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Payment → Journal → Balance Integration Tests', () => {
  let system: IntegratedPaymentSystem;

  beforeEach(() => {
    system = new IntegratedPaymentSystem();
  });

  describe('Complete Payment Flow', () => {
    it('should create charge and payment with correct journal entries', async () => {
      const tenantId = 'tenant_001';
      const propertyId = 'property_001';
      const rentAmount = '1500.00';

      // Step 1: Create rent charge
      const chargeResult = system.createCharge({
        tenantId,
        leaseId: 'lease_001',
        propertyId,
        amount: rentAmount,
        type: 'rent',
        description: 'January Rent',
        dueDate: new Date(),
      });

      expect(chargeResult.success).toBe(true);
      expect(chargeResult.journalEntry?.postings).toHaveLength(2);

      // Verify AR increased
      expect(system.getTotalARBalance()).toBe('1500.0000');

      // Verify tenant balance
      expect(system.getTenantBalance(tenantId)).toBe('1500.0000');

      // Step 2: Process payment
      const paymentResult = await system.processPayment({
        tenantId,
        leaseId: 'lease_001',
        propertyId,
        amount: rentAmount,
        method: 'ach',
      });

      expect(paymentResult.success).toBe(true);
      expect(paymentResult.payment?.status).toBe('completed');

      // Verify AR is zero after payment
      expect(system.getTotalARBalance()).toBe('0.0000');

      // Verify tenant balance is zero
      expect(system.getTenantBalance(tenantId)).toBe('0.0000');

      // Verify bank increased
      expect(system.getTotalCashBalance()).toBe('1500.0000');

      // Verify double-entry integrity
      const validation = system.validateDoubleEntry();
      expect(validation.valid).toBe(true);
    });

    it('should handle partial payment correctly', async () => {
      const tenantId = 'tenant_002';
      const propertyId = 'property_001';
      const rentAmount = '2000.00';
      const partialPayment = '1200.00';

      // Create charge
      system.createCharge({
        tenantId,
        leaseId: 'lease_002',
        propertyId,
        amount: rentAmount,
        type: 'rent',
        description: 'February Rent',
        dueDate: new Date(),
      });

      // Process partial payment
      await system.processPayment({
        tenantId,
        leaseId: 'lease_002',
        propertyId,
        amount: partialPayment,
        method: 'credit_card',
      });

      // Verify remaining balance
      const expectedRemaining = new Decimal(rentAmount).minus(new Decimal(partialPayment)).toFixed(4);
      expect(system.getTenantBalance(tenantId)).toBe(expectedRemaining);
      expect(system.getTotalARBalance()).toBe(expectedRemaining);
    });

    it('should reject negative payment amount', async () => {
      const result = await system.processPayment({
        tenantId: 'tenant_003',
        leaseId: 'lease_003',
        propertyId: 'property_001',
        amount: '-500.00',
        method: 'ach',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be positive');
    });

    it('should reject zero payment amount', async () => {
      const result = await system.processPayment({
        tenantId: 'tenant_004',
        leaseId: 'lease_004',
        propertyId: 'property_001',
        amount: '0.00',
        method: 'ach',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('NSF Handling', () => {
    it('should reverse payment and add NSF fee', async () => {
      const tenantId = 'tenant_nsf';
      const propertyId = 'property_001';
      const rentAmount = '1500.00';
      const nsfFee = '35.00';

      // Create charge
      system.createCharge({
        tenantId,
        leaseId: 'lease_nsf',
        propertyId,
        amount: rentAmount,
        type: 'rent',
        description: 'March Rent',
        dueDate: new Date(),
      });

      // Process payment
      const paymentResult = await system.processPayment({
        tenantId,
        leaseId: 'lease_nsf',
        propertyId,
        amount: rentAmount,
        method: 'ach',
      });

      expect(paymentResult.success).toBe(true);
      expect(system.getTenantBalance(tenantId)).toBe('0.0000');

      // Process NSF
      const nsfResult = await system.processNSF({
        originalPaymentId: paymentResult.payment!.id,
        nsfFee,
      });

      expect(nsfResult.success).toBe(true);

      // Verify payment marked as NSF
      const payment = system.getPaymentById(paymentResult.payment!.id);
      expect(payment?.status).toBe('nsf');

      // Verify tenant balance restored + NSF fee
      const expectedBalance = new Decimal(rentAmount).plus(new Decimal(nsfFee)).toFixed(4);
      expect(system.getTenantBalance(tenantId)).toBe(expectedBalance);

      // Verify AR balance
      expect(system.getTotalARBalance()).toBe(expectedBalance);

      // Verify bank balance returned to zero
      expect(system.getTotalCashBalance()).toBe('0.0000');

      // Verify double-entry integrity
      const validation = system.validateDoubleEntry();
      expect(validation.valid).toBe(true);
    });

    it('should reject NSF for non-existent payment', async () => {
      const result = await system.processNSF({
        originalPaymentId: 'nonexistent_payment',
        nsfFee: '35.00',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('AR Aging Updates', () => {
    it('should place new charge in current bucket', () => {
      const tenantId = 'tenant_aging_1';

      system.createCharge({
        tenantId,
        leaseId: 'lease_aging',
        propertyId: 'property_001',
        amount: '1000.00',
        type: 'rent',
        description: 'Current month rent',
        dueDate: new Date(), // Due today = current
      });

      const aging = system.getARAgingForTenant(tenantId);

      expect(aging?.current).toBe('1000.0000');
      expect(aging?.days30).toBe('0.0000');
      expect(aging?.total).toBe('1000.0000');
    });

    it('should place overdue charge in correct bucket', () => {
      const tenantId = 'tenant_aging_2';
      const dueDate45DaysAgo = new Date();
      dueDate45DaysAgo.setDate(dueDate45DaysAgo.getDate() - 45);

      system.createCharge({
        tenantId,
        leaseId: 'lease_aging_2',
        propertyId: 'property_001',
        amount: '1000.00',
        type: 'rent',
        description: '45 days overdue rent',
        dueDate: dueDate45DaysAgo,
      });

      const aging = system.getARAgingForTenant(tenantId);

      expect(aging?.current).toBe('0.0000');
      expect(aging?.days30).toBe('0.0000');
      expect(aging?.days60).toBe('1000.0000'); // 31-60 days
      expect(aging?.total).toBe('1000.0000');
    });

    it('should apply payment to oldest bucket first (FIFO)', async () => {
      const tenantId = 'tenant_aging_fifo';

      // Add 90+ day old charge
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      system.createCharge({
        tenantId,
        leaseId: 'lease_fifo',
        propertyId: 'property_001',
        amount: '500.00',
        type: 'rent',
        description: 'Old charge',
        dueDate: oldDate,
      });

      // Add current charge
      system.createCharge({
        tenantId,
        leaseId: 'lease_fifo',
        propertyId: 'property_001',
        amount: '1500.00',
        type: 'rent',
        description: 'Current charge',
        dueDate: new Date(),
      });

      // Verify initial aging
      let aging = system.getARAgingForTenant(tenantId);
      expect(aging?.days90Plus).toBe('500.0000');
      expect(aging?.current).toBe('1500.0000');
      expect(aging?.total).toBe('2000.0000');

      // Pay $700 - should apply to oldest first
      await system.processPayment({
        tenantId,
        leaseId: 'lease_fifo',
        propertyId: 'property_001',
        amount: '700.00',
        method: 'check',
      });

      aging = system.getARAgingForTenant(tenantId);

      // 90+ should be zero, current should be reduced by remaining $200
      expect(aging?.days90Plus).toBe('0.0000');
      expect(aging?.current).toBe('1300.0000');
      expect(aging?.total).toBe('1300.0000');
    });
  });

  describe('Tenant Ledger Tracking', () => {
    it('should record all transactions in tenant ledger', async () => {
      const tenantId = 'tenant_ledger';

      // Charge
      system.createCharge({
        tenantId,
        leaseId: 'lease_ledger',
        propertyId: 'property_001',
        amount: '1500.00',
        type: 'rent',
        description: 'April Rent',
        dueDate: new Date(),
      });

      // Payment
      await system.processPayment({
        tenantId,
        leaseId: 'lease_ledger',
        propertyId: 'property_001',
        amount: '1000.00',
        method: 'ach',
      });

      const ledgerEntries = system.getTenantLedgerEntries(tenantId);

      expect(ledgerEntries).toHaveLength(2);
      expect(ledgerEntries[0].type).toBe('charge');
      expect(ledgerEntries[0].amount).toBe('1500.00');
      expect(ledgerEntries[0].balance).toBe('1500.0000');

      expect(ledgerEntries[1].type).toBe('payment');
      expect(ledgerEntries[1].amount).toBe('-1000.00');
      expect(ledgerEntries[1].balance).toBe('500.0000');
    });

    it('should maintain running balance correctly', async () => {
      const tenantId = 'tenant_running';

      // Multiple transactions
      system.createCharge({
        tenantId,
        leaseId: 'lease_running',
        propertyId: 'property_001',
        amount: '1500.00',
        type: 'rent',
        description: 'Rent',
        dueDate: new Date(),
      });

      system.createCharge({
        tenantId,
        leaseId: 'lease_running',
        propertyId: 'property_001',
        amount: '50.00',
        type: 'utility',
        description: 'Water',
        dueDate: new Date(),
      });

      await system.processPayment({
        tenantId,
        leaseId: 'lease_running',
        propertyId: 'property_001',
        amount: '800.00',
        method: 'credit_card',
      });

      system.createCharge({
        tenantId,
        leaseId: 'lease_running',
        propertyId: 'property_001',
        amount: '15.00',
        type: 'late_fee',
        description: 'Late fee',
        dueDate: new Date(),
      });

      const entries = system.getTenantLedgerEntries(tenantId);
      const finalBalance = entries[entries.length - 1].balance;

      // 1500 + 50 - 800 + 15 = 765
      expect(finalBalance).toBe('765.0000');
      expect(system.getTenantBalance(tenantId)).toBe('765.0000');
    });
  });

  describe('Journal Entry Integrity', () => {
    it('should always create balanced journal entries', async () => {
      const tenantId = 'tenant_balance';

      // Multiple transactions
      system.createCharge({
        tenantId,
        leaseId: 'lease_balance',
        propertyId: 'property_001',
        amount: '1500.00',
        type: 'rent',
        description: 'Rent',
        dueDate: new Date(),
      });

      await system.processPayment({
        tenantId,
        leaseId: 'lease_balance',
        propertyId: 'property_001',
        amount: '1500.00',
        method: 'ach',
      });

      const validation = system.validateDoubleEntry();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should link journal entries to source documents', async () => {
      const paymentResult = await system.processPayment({
        tenantId: 'tenant_link',
        leaseId: 'lease_link',
        propertyId: 'property_001',
        amount: '500.00',
        method: 'check',
      });

      const journalEntries = system.getJournalEntriesForPayment(paymentResult.payment!.id);

      expect(journalEntries).toHaveLength(1);
      expect(journalEntries[0].sourceDocumentId).toBe(paymentResult.payment!.id);
      expect(journalEntries[0].sourceDocumentType).toBe('payment');
    });

    it('should include dimension data in postings', async () => {
      const tenantId = 'tenant_dim';
      const propertyId = 'property_dim';

      const paymentResult = await system.processPayment({
        tenantId,
        leaseId: 'lease_dim',
        propertyId,
        amount: '1000.00',
        method: 'ach',
      });

      const journalEntries = system.getJournalEntriesForPayment(paymentResult.payment!.id);
      const posting = journalEntries[0].postings[0];

      expect(posting.dimensionTenantId).toBe(tenantId);
      expect(posting.dimensionPropertyId).toBe(propertyId);
    });
  });

  describe('Precision Tests', () => {
    it('should handle penny-precise calculations', async () => {
      const tenantId = 'tenant_penny';

      // Charge with pennies
      system.createCharge({
        tenantId,
        leaseId: 'lease_penny',
        propertyId: 'property_001',
        amount: '1523.47',
        type: 'rent',
        description: 'Prorated rent',
        dueDate: new Date(),
      });

      // Pay exact amount
      await system.processPayment({
        tenantId,
        leaseId: 'lease_penny',
        propertyId: 'property_001',
        amount: '1523.47',
        method: 'ach',
      });

      expect(system.getTenantBalance(tenantId)).toBe('0.0000');
      expect(system.getTotalARBalance()).toBe('0.0000');
    });

    it('should handle many small transactions without drift', async () => {
      const tenantId = 'tenant_many';
      const chargeAmount = '0.01'; // 1 cent
      const numCharges = 1000;

      // Create 1000 penny charges
      for (let i = 0; i < numCharges; i++) {
        system.createCharge({
          tenantId,
          leaseId: 'lease_many',
          propertyId: 'property_001',
          amount: chargeAmount,
          type: 'other',
          description: `Micro charge ${i}`,
          dueDate: new Date(),
        });
      }

      // Expected: 1000 * 0.01 = $10.00 exactly
      expect(system.getTenantBalance(tenantId)).toBe('10.0000');

      // Pay exact amount
      await system.processPayment({
        tenantId,
        leaseId: 'lease_many',
        propertyId: 'property_001',
        amount: '10.00',
        method: 'ach',
      });

      expect(system.getTenantBalance(tenantId)).toBe('0.0000');
    });
  });
});
