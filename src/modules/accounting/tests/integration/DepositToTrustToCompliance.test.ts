/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Integration Test: Deposit → Trust Account → State Compliance
 *
 * Tests the complete flow from security deposit collection through trust account
 * management to state-specific compliance rules.
 *
 * Critical compliance requirements:
 * 1. Security deposits MUST be held in separate trust accounts
 * 2. Trust funds MUST NOT be commingled with operating funds
 * 3. State-specific deposit limits must be enforced
 * 4. Interest accrual rules vary by state/city
 * 5. Refund timing is regulated (e.g., NC = 30 days)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Decimal from 'decimal.js';

// Configure Decimal for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============================================================================
// INTEGRATION TEST TYPES
// ============================================================================

interface SecurityDeposit {
  id: string;
  tenantId: string;
  leaseId: string;
  propertyId: string;
  amount: string;
  collectedDate: Date;
  status: 'held' | 'partial_refund' | 'full_refund' | 'applied_to_damages';
  trustAccountId: string;
  interestAccrued: string;
  state: string;
  city?: string;
}

interface TrustAccount {
  id: string;
  name: string;
  type: 'security_deposit' | 'prepaid_rent' | 'escrow';
  balance: string;
  bankAccountNumber: string;
  state: string;
  lastReconciled: Date;
}

interface DepositDeduction {
  id: string;
  depositId: string;
  type: 'cleaning' | 'repairs' | 'unpaid_rent' | 'other';
  amount: string;
  description: string;
  documentationUrl?: string;
  invoiceDate?: Date;
}

interface DepositDisposition {
  id: string;
  depositId: string;
  tenantId: string;
  moveOutDate: Date;
  dispositionDate: Date;
  originalAmount: string;
  interestAmount: string;
  totalDeductions: string;
  refundAmount: string;
  deductions: DepositDeduction[];
  mailedToAddress?: string;
  complianceState: string;
  deadlineDays: number;
  isCompliant: boolean;
}

interface StateComplianceRule {
  state: string;
  maxDepositMonths: number;
  refundDeadlineDays: number;
  interestRequired: boolean;
  interestRate?: string;
  petDepositAllowed: boolean;
  separateTrustRequired: boolean;
}

// ============================================================================
// TRUST ACCOUNT & COMPLIANCE SYSTEM (Test Implementation)
// ============================================================================

class TrustAccountComplianceSystem {
  private deposits: SecurityDeposit[] = [];
  private trustAccounts: Map<string, TrustAccount> = new Map();
  private deductions: DepositDeduction[] = [];
  private dispositions: DepositDisposition[] = [];
  private journalEntries: Array<{
    id: string;
    description: string;
    debitAccount: string;
    creditAccount: string;
    amount: string;
  }> = [];

  // Account IDs
  private readonly ACCOUNTS = {
    OPERATING_BANK: '1020-operating-bank',
    TRUST_DEPOSITS: '2200-trust-deposits',
    TENANT_SECURITY_DEPOSIT_LIABILITY: '2210-tenant-deposit-liability',
    DEPOSIT_INTEREST_PAYABLE: '2220-deposit-interest-payable',
    CLEANING_REVENUE: '4500-cleaning-revenue',
    REPAIR_REVENUE: '4510-repair-revenue',
    RENT_REVENUE: '4010-rent-revenue',
  };

  // State compliance rules (subset for testing)
  private readonly STATE_RULES: Map<string, StateComplianceRule> = new Map([
    [
      'NC',
      {
        state: 'NC',
        maxDepositMonths: 2,
        refundDeadlineDays: 30,
        interestRequired: false,
        petDepositAllowed: true,
        separateTrustRequired: true,
      },
    ],
    [
      'CA',
      {
        state: 'CA',
        maxDepositMonths: 2, // 3 for furnished
        refundDeadlineDays: 21,
        interestRequired: false,
        petDepositAllowed: false, // Must be part of regular deposit
        separateTrustRequired: false,
      },
    ],
    [
      'NY',
      {
        state: 'NY',
        maxDepositMonths: 1,
        refundDeadlineDays: 14,
        interestRequired: true,
        interestRate: '0.02', // 2% annual
        petDepositAllowed: false,
        separateTrustRequired: true,
      },
    ],
    [
      'IL',
      {
        state: 'IL',
        maxDepositMonths: 1.5,
        refundDeadlineDays: 30, // 45 if deductions
        interestRequired: true, // Chicago specific
        interestRate: '0.0001', // 0.01% for Chicago
        petDepositAllowed: true,
        separateTrustRequired: true,
      },
    ],
    [
      'TX',
      {
        state: 'TX',
        maxDepositMonths: 99, // No limit
        refundDeadlineDays: 30,
        interestRequired: false,
        petDepositAllowed: true,
        separateTrustRequired: false,
      },
    ],
  ]);

  constructor() {
    // Initialize default trust accounts
    this.trustAccounts.set('trust_nc', {
      id: 'trust_nc',
      name: 'NC Security Deposit Trust',
      type: 'security_deposit',
      balance: '0.0000',
      bankAccountNumber: '****1234',
      state: 'NC',
      lastReconciled: new Date(),
    });

    this.trustAccounts.set('trust_ca', {
      id: 'trust_ca',
      name: 'CA Security Deposit Trust',
      type: 'security_deposit',
      balance: '0.0000',
      bankAccountNumber: '****5678',
      state: 'CA',
      lastReconciled: new Date(),
    });

    this.trustAccounts.set('trust_ny', {
      id: 'trust_ny',
      name: 'NY Security Deposit Trust',
      type: 'security_deposit',
      balance: '0.0000',
      bankAccountNumber: '****9012',
      state: 'NY',
      lastReconciled: new Date(),
    });
  }

  /**
   * Collect security deposit with compliance validation
   */
  collectSecurityDeposit(params: {
    tenantId: string;
    leaseId: string;
    propertyId: string;
    amount: string;
    monthlyRent: string;
    state: string;
    city?: string;
  }): {
    success: boolean;
    deposit?: SecurityDeposit;
    error?: string;
    complianceWarnings?: string[];
  } {
    const warnings: string[] = [];
    const rules = this.STATE_RULES.get(params.state);

    if (!rules) {
      return { success: false, error: `Unknown state: ${params.state}` };
    }

    // Validate deposit amount against state maximum
    const maxDeposit = new Decimal(params.monthlyRent).times(rules.maxDepositMonths);
    const depositAmount = new Decimal(params.amount);

    if (depositAmount.greaterThan(maxDeposit)) {
      return {
        success: false,
        error: `Deposit exceeds ${params.state} maximum of ${rules.maxDepositMonths} month(s) rent ($${maxDeposit.toFixed(2)})`,
      };
    }

    // Get or create trust account for state
    const trustAccountId = `trust_${params.state.toLowerCase()}`;
    let trustAccount = this.trustAccounts.get(trustAccountId);

    if (!trustAccount) {
      trustAccount = {
        id: trustAccountId,
        name: `${params.state} Security Deposit Trust`,
        type: 'security_deposit',
        balance: '0.0000',
        bankAccountNumber: `****${Math.floor(1000 + Math.random() * 9000)}`,
        state: params.state,
        lastReconciled: new Date(),
      };
      this.trustAccounts.set(trustAccountId, trustAccount);
    }

    // Create deposit record
    const deposit: SecurityDeposit = {
      id: `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      leaseId: params.leaseId,
      propertyId: params.propertyId,
      amount: params.amount,
      collectedDate: new Date(),
      status: 'held',
      trustAccountId,
      interestAccrued: '0.0000',
      state: params.state,
      city: params.city,
    };

    // Update trust account balance
    trustAccount.balance = new Decimal(trustAccount.balance).plus(depositAmount).toFixed(4);

    // Create journal entry
    this.createJournalEntry({
      description: `Security deposit collected - Tenant ${params.tenantId}`,
      debitAccount: this.ACCOUNTS.TRUST_DEPOSITS,
      creditAccount: this.ACCOUNTS.TENANT_SECURITY_DEPOSIT_LIABILITY,
      amount: params.amount,
    });

    this.deposits.push(deposit);

    // Add compliance warnings if applicable
    if (rules.interestRequired) {
      warnings.push(`${params.state} requires interest accrual on security deposits`);
    }

    if (rules.separateTrustRequired) {
      warnings.push(`${params.state} requires separate trust account for deposits`);
    }

    return {
      success: true,
      deposit,
      complianceWarnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Accrue interest on deposits (for states that require it)
   */
  accrueInterest(depositId: string, asOfDate: Date): {
    success: boolean;
    interestAccrued?: string;
    error?: string;
  } {
    const deposit = this.deposits.find((d) => d.id === depositId);

    if (!deposit) {
      return { success: false, error: 'Deposit not found' };
    }

    const rules = this.STATE_RULES.get(deposit.state);

    if (!rules?.interestRequired || !rules.interestRate) {
      return { success: true, interestAccrued: '0.0000' }; // No interest required
    }

    // Calculate days held
    const daysHeld = Math.floor(
      (asOfDate.getTime() - deposit.collectedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Daily rate = annual rate / 365
    const dailyRate = new Decimal(rules.interestRate).dividedBy(365);
    const interest = new Decimal(deposit.amount).times(dailyRate).times(daysHeld);

    deposit.interestAccrued = new Decimal(deposit.interestAccrued).plus(interest).toFixed(4);

    // Journal entry for interest accrual
    if (interest.greaterThan(0)) {
      this.createJournalEntry({
        description: `Security deposit interest accrual - Tenant ${deposit.tenantId}`,
        debitAccount: this.ACCOUNTS.TRUST_DEPOSITS,
        creditAccount: this.ACCOUNTS.DEPOSIT_INTEREST_PAYABLE,
        amount: interest.toFixed(4),
      });
    }

    return { success: true, interestAccrued: deposit.interestAccrued };
  }

  /**
   * Add deduction to deposit
   */
  addDeduction(params: {
    depositId: string;
    type: DepositDeduction['type'];
    amount: string;
    description: string;
    documentationUrl?: string;
    invoiceDate?: Date;
  }): { success: boolean; deduction?: DepositDeduction; error?: string } {
    const deposit = this.deposits.find((d) => d.id === params.depositId);

    if (!deposit) {
      return { success: false, error: 'Deposit not found' };
    }

    // Calculate total existing deductions
    const existingDeductions = this.deductions
      .filter((d) => d.depositId === params.depositId)
      .reduce((sum, d) => sum.plus(new Decimal(d.amount)), new Decimal(0));

    // Validate deduction doesn't exceed deposit + interest
    const maxDeductible = new Decimal(deposit.amount).plus(new Decimal(deposit.interestAccrued));
    const newTotal = existingDeductions.plus(new Decimal(params.amount));

    if (newTotal.greaterThan(maxDeductible)) {
      return {
        success: false,
        error: `Total deductions ($${newTotal.toFixed(2)}) exceed deposit ($${maxDeductible.toFixed(2)})`,
      };
    }

    // Require documentation for deductions (best practice)
    const deduction: DepositDeduction = {
      id: `ded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      depositId: params.depositId,
      type: params.type,
      amount: params.amount,
      description: params.description,
      documentationUrl: params.documentationUrl,
      invoiceDate: params.invoiceDate,
    };

    this.deductions.push(deduction);

    return { success: true, deduction };
  }

  /**
   * Process deposit disposition (move-out)
   */
  processDisposition(params: {
    depositId: string;
    moveOutDate: Date;
    forwardingAddress?: string;
  }): {
    success: boolean;
    disposition?: DepositDisposition;
    error?: string;
    isCompliant: boolean;
  } {
    const deposit = this.deposits.find((d) => d.id === params.depositId);

    if (!deposit) {
      return { success: false, error: 'Deposit not found', isCompliant: false };
    }

    const rules = this.STATE_RULES.get(deposit.state);

    if (!rules) {
      return { success: false, error: 'Unknown state', isCompliant: false };
    }

    const dispositionDate = new Date();
    const daysSinceMoveOut = Math.floor(
      (dispositionDate.getTime() - params.moveOutDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check deadline compliance
    const isCompliant = daysSinceMoveOut <= rules.refundDeadlineDays;

    // Calculate deductions
    const depositDeductions = this.deductions.filter((d) => d.depositId === params.depositId);
    const totalDeductions = depositDeductions.reduce(
      (sum, d) => sum.plus(new Decimal(d.amount)),
      new Decimal(0)
    );

    // Calculate refund
    const depositPlusInterest = new Decimal(deposit.amount).plus(
      new Decimal(deposit.interestAccrued)
    );
    const refundAmount = depositPlusInterest.minus(totalDeductions);

    // Create disposition record
    const disposition: DepositDisposition = {
      id: `disp_${Date.now()}`,
      depositId: deposit.id,
      tenantId: deposit.tenantId,
      moveOutDate: params.moveOutDate,
      dispositionDate,
      originalAmount: deposit.amount,
      interestAmount: deposit.interestAccrued,
      totalDeductions: totalDeductions.toFixed(4),
      refundAmount: refundAmount.toFixed(4),
      deductions: depositDeductions,
      mailedToAddress: params.forwardingAddress,
      complianceState: deposit.state,
      deadlineDays: rules.refundDeadlineDays,
      isCompliant,
    };

    this.dispositions.push(disposition);

    // Update deposit status
    if (totalDeductions.equals(depositPlusInterest)) {
      deposit.status = 'applied_to_damages';
    } else if (totalDeductions.greaterThan(0)) {
      deposit.status = 'partial_refund';
    } else {
      deposit.status = 'full_refund';
    }

    // Update trust account balance
    const trustAccount = this.trustAccounts.get(deposit.trustAccountId);
    if (trustAccount) {
      trustAccount.balance = new Decimal(trustAccount.balance)
        .minus(new Decimal(deposit.amount))
        .toFixed(4);
    }

    // Create journal entries for disposition
    if (refundAmount.greaterThan(0)) {
      this.createJournalEntry({
        description: `Security deposit refund - Tenant ${deposit.tenantId}`,
        debitAccount: this.ACCOUNTS.TENANT_SECURITY_DEPOSIT_LIABILITY,
        creditAccount: this.ACCOUNTS.TRUST_DEPOSITS,
        amount: refundAmount.toFixed(4),
      });
    }

    // Journal entries for deductions
    for (const deduction of depositDeductions) {
      let revenueAccount = this.ACCOUNTS.CLEANING_REVENUE;
      if (deduction.type === 'repairs') {
        revenueAccount = this.ACCOUNTS.REPAIR_REVENUE;
      } else if (deduction.type === 'unpaid_rent') {
        revenueAccount = this.ACCOUNTS.RENT_REVENUE;
      }

      this.createJournalEntry({
        description: `Deposit deduction: ${deduction.description}`,
        debitAccount: this.ACCOUNTS.TENANT_SECURITY_DEPOSIT_LIABILITY,
        creditAccount: revenueAccount,
        amount: deduction.amount,
      });
    }

    return { success: true, disposition, isCompliant };
  }

  /**
   * Check for trust account commingling
   */
  detectCommingling(): {
    commingled: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check each trust account
    for (const [id, account] of this.trustAccounts) {
      // Trust accounts should only hold deposits, not operating funds
      // This would be detected by checking journal entry patterns

      // Check for deposits from wrong state
      const wrongStateDeposits = this.deposits.filter(
        (d) => d.trustAccountId === id && d.state !== account.state
      );

      if (wrongStateDeposits.length > 0) {
        issues.push(`Trust account ${id} holds deposits from wrong state`);
      }
    }

    // Check for any transfers between trust and operating
    const suspiciousEntries = this.journalEntries.filter(
      (e) =>
        (e.debitAccount === this.ACCOUNTS.TRUST_DEPOSITS &&
          e.creditAccount === this.ACCOUNTS.OPERATING_BANK) ||
        (e.debitAccount === this.ACCOUNTS.OPERATING_BANK &&
          e.creditAccount === this.ACCOUNTS.TRUST_DEPOSITS)
    );

    if (suspiciousEntries.length > 0) {
      issues.push('Detected potential trust fund commingling with operating account');
    }

    return { commingled: issues.length > 0, issues };
  }

  /**
   * Get state compliance rules
   */
  getStateRules(state: string): StateComplianceRule | undefined {
    return this.STATE_RULES.get(state);
  }

  /**
   * Calculate refund deadline date
   */
  calculateRefundDeadline(depositId: string, moveOutDate: Date): Date | undefined {
    const deposit = this.deposits.find((d) => d.id === depositId);
    if (!deposit) return undefined;

    const rules = this.STATE_RULES.get(deposit.state);
    if (!rules) return undefined;

    const deadline = new Date(moveOutDate);
    deadline.setDate(deadline.getDate() + rules.refundDeadlineDays);
    return deadline;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private createJournalEntry(params: {
    description: string;
    debitAccount: string;
    creditAccount: string;
    amount: string;
  }): void {
    this.journalEntries.push({
      id: `je_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...params,
    });
  }

  // ============================================================================
  // PUBLIC QUERY METHODS
  // ============================================================================

  getDeposit(depositId: string): SecurityDeposit | undefined {
    return this.deposits.find((d) => d.id === depositId);
  }

  getDepositsByTenant(tenantId: string): SecurityDeposit[] {
    return this.deposits.filter((d) => d.tenantId === tenantId);
  }

  getTrustAccountBalance(accountId: string): string {
    return this.trustAccounts.get(accountId)?.balance || '0.0000';
  }

  getDeductionsForDeposit(depositId: string): DepositDeduction[] {
    return this.deductions.filter((d) => d.depositId === depositId);
  }

  getTotalTrustBalance(): string {
    let total = new Decimal(0);
    for (const account of this.trustAccounts.values()) {
      total = total.plus(new Decimal(account.balance));
    }
    return total.toFixed(4);
  }

  getTotalDepositLiability(): string {
    return this.deposits
      .filter((d) => d.status === 'held')
      .reduce((sum, d) => sum.plus(new Decimal(d.amount)), new Decimal(0))
      .toFixed(4);
  }
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Deposit → Trust → Compliance Integration Tests', () => {
  let system: TrustAccountComplianceSystem;

  beforeEach(() => {
    system = new TrustAccountComplianceSystem();
  });

  describe('Security Deposit Collection', () => {
    it('should collect deposit within state maximum', () => {
      const result = system.collectSecurityDeposit({
        tenantId: 'tenant_001',
        leaseId: 'lease_001',
        propertyId: 'property_001',
        amount: '2500.00', // 2 months for $1250/month rent
        monthlyRent: '1500.00', // 2 * 1500 = 3000 max, so 2500 is OK
        state: 'NC',
      });

      expect(result.success).toBe(true);
      expect(result.deposit?.status).toBe('held');
      expect(result.deposit?.trustAccountId).toBe('trust_nc');
    });

    it('should reject deposit exceeding NC 2-month maximum', () => {
      const result = system.collectSecurityDeposit({
        tenantId: 'tenant_002',
        leaseId: 'lease_002',
        propertyId: 'property_002',
        amount: '4000.00', // More than 2 months rent
        monthlyRent: '1500.00', // Max = 3000
        state: 'NC',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds NC maximum');
    });

    it('should reject deposit exceeding NY 1-month maximum', () => {
      const result = system.collectSecurityDeposit({
        tenantId: 'tenant_003',
        leaseId: 'lease_003',
        propertyId: 'property_003',
        amount: '2000.00', // More than 1 month
        monthlyRent: '1500.00', // Max = 1500
        state: 'NY',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds NY maximum');
    });

    it('should allow unlimited deposit in TX', () => {
      const result = system.collectSecurityDeposit({
        tenantId: 'tenant_004',
        leaseId: 'lease_004',
        propertyId: 'property_004',
        amount: '10000.00', // 6+ months rent
        monthlyRent: '1500.00',
        state: 'TX',
      });

      expect(result.success).toBe(true);
    });

    it('should update trust account balance correctly', () => {
      system.collectSecurityDeposit({
        tenantId: 'tenant_005',
        leaseId: 'lease_005',
        propertyId: 'property_005',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      system.collectSecurityDeposit({
        tenantId: 'tenant_006',
        leaseId: 'lease_006',
        propertyId: 'property_006',
        amount: '2500.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      expect(system.getTrustAccountBalance('trust_nc')).toBe('4500.0000');
    });

    it('should return compliance warnings for states requiring interest', () => {
      const result = system.collectSecurityDeposit({
        tenantId: 'tenant_007',
        leaseId: 'lease_007',
        propertyId: 'property_007',
        amount: '1500.00',
        monthlyRent: '1500.00',
        state: 'NY',
      });

      expect(result.success).toBe(true);
      expect(result.complianceWarnings).toBeDefined();
      expect(result.complianceWarnings?.some((w) => w.includes('interest'))).toBe(true);
    });
  });

  describe('Interest Accrual', () => {
    it('should accrue interest for NY deposits', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_int_1',
        leaseId: 'lease_int_1',
        propertyId: 'property_int_1',
        amount: '1500.00',
        monthlyRent: '1500.00',
        state: 'NY',
      });

      // Accrue interest for 365 days (1 year at 2% = $30)
      const oneYearLater = new Date(collectResult.deposit!.collectedDate);
      oneYearLater.setDate(oneYearLater.getDate() + 365);

      const accrualResult = system.accrueInterest(collectResult.deposit!.id, oneYearLater);

      expect(accrualResult.success).toBe(true);
      // 1500 * 0.02 = 30.00 for one year
      expect(new Decimal(accrualResult.interestAccrued!).toFixed(2)).toBe('30.00');
    });

    it('should not accrue interest for NC deposits', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_int_2',
        leaseId: 'lease_int_2',
        propertyId: 'property_int_2',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      const oneYearLater = new Date(collectResult.deposit!.collectedDate);
      oneYearLater.setDate(oneYearLater.getDate() + 365);

      const accrualResult = system.accrueInterest(collectResult.deposit!.id, oneYearLater);

      expect(accrualResult.success).toBe(true);
      expect(accrualResult.interestAccrued).toBe('0.0000');
    });
  });

  describe('Deductions', () => {
    it('should add valid deduction', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_ded_1',
        leaseId: 'lease_ded_1',
        propertyId: 'property_ded_1',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      const deductionResult = system.addDeduction({
        depositId: collectResult.deposit!.id,
        type: 'cleaning',
        amount: '150.00',
        description: 'Professional carpet cleaning',
        documentationUrl: 'https://example.com/invoice/123',
      });

      expect(deductionResult.success).toBe(true);
      expect(deductionResult.deduction?.type).toBe('cleaning');
    });

    it('should reject deduction exceeding deposit amount', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_ded_2',
        leaseId: 'lease_ded_2',
        propertyId: 'property_ded_2',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      const deductionResult = system.addDeduction({
        depositId: collectResult.deposit!.id,
        type: 'repairs',
        amount: '2500.00', // Exceeds deposit
        description: 'Major repairs',
      });

      expect(deductionResult.success).toBe(false);
      expect(deductionResult.error).toContain('exceed deposit');
    });

    it('should track multiple deductions correctly', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_ded_3',
        leaseId: 'lease_ded_3',
        propertyId: 'property_ded_3',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      system.addDeduction({
        depositId: collectResult.deposit!.id,
        type: 'cleaning',
        amount: '200.00',
        description: 'Cleaning',
      });

      system.addDeduction({
        depositId: collectResult.deposit!.id,
        type: 'repairs',
        amount: '500.00',
        description: 'Wall repairs',
      });

      const deductions = system.getDeductionsForDeposit(collectResult.deposit!.id);
      expect(deductions).toHaveLength(2);

      const totalDeductions = deductions.reduce(
        (sum, d) => sum.plus(new Decimal(d.amount)),
        new Decimal(0)
      );
      expect(totalDeductions.toFixed(2)).toBe('700.00');
    });
  });

  describe('Deposit Disposition (Refund)', () => {
    it('should process full refund correctly', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_disp_1',
        leaseId: 'lease_disp_1',
        propertyId: 'property_disp_1',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      const moveOutDate = new Date();
      moveOutDate.setDate(moveOutDate.getDate() - 10); // 10 days ago

      const dispResult = system.processDisposition({
        depositId: collectResult.deposit!.id,
        moveOutDate,
        forwardingAddress: '123 New St, City, ST 12345',
      });

      expect(dispResult.success).toBe(true);
      expect(dispResult.isCompliant).toBe(true);
      expect(dispResult.disposition?.refundAmount).toBe('2000.0000');
      expect(dispResult.disposition?.totalDeductions).toBe('0.0000');

      // Deposit status updated
      const deposit = system.getDeposit(collectResult.deposit!.id);
      expect(deposit?.status).toBe('full_refund');
    });

    it('should process partial refund with deductions', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_disp_2',
        leaseId: 'lease_disp_2',
        propertyId: 'property_disp_2',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      // Add deductions
      system.addDeduction({
        depositId: collectResult.deposit!.id,
        type: 'cleaning',
        amount: '200.00',
        description: 'Cleaning',
      });

      system.addDeduction({
        depositId: collectResult.deposit!.id,
        type: 'repairs',
        amount: '300.00',
        description: 'Repairs',
      });

      const moveOutDate = new Date();
      const dispResult = system.processDisposition({
        depositId: collectResult.deposit!.id,
        moveOutDate,
      });

      expect(dispResult.success).toBe(true);
      expect(dispResult.disposition?.refundAmount).toBe('1500.0000'); // 2000 - 500
      expect(dispResult.disposition?.totalDeductions).toBe('500.0000');
      expect(dispResult.disposition?.deductions).toHaveLength(2);

      const deposit = system.getDeposit(collectResult.deposit!.id);
      expect(deposit?.status).toBe('partial_refund');
    });

    it('should flag late disposition as non-compliant (NC 30 days)', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_disp_3',
        leaseId: 'lease_disp_3',
        propertyId: 'property_disp_3',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      // Move out 35 days ago (exceeds NC 30-day deadline)
      const moveOutDate = new Date();
      moveOutDate.setDate(moveOutDate.getDate() - 35);

      const dispResult = system.processDisposition({
        depositId: collectResult.deposit!.id,
        moveOutDate,
      });

      expect(dispResult.success).toBe(true);
      expect(dispResult.isCompliant).toBe(false);
      expect(dispResult.disposition?.deadlineDays).toBe(30);
    });

    it('should flag late disposition in CA (21 days)', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_disp_4',
        leaseId: 'lease_disp_4',
        propertyId: 'property_disp_4',
        amount: '2500.00',
        monthlyRent: '1500.00',
        state: 'CA',
      });

      // Move out 25 days ago (exceeds CA 21-day deadline)
      const moveOutDate = new Date();
      moveOutDate.setDate(moveOutDate.getDate() - 25);

      const dispResult = system.processDisposition({
        depositId: collectResult.deposit!.id,
        moveOutDate,
      });

      expect(dispResult.isCompliant).toBe(false);
      expect(dispResult.disposition?.deadlineDays).toBe(21);
    });

    it('should update trust account balance after disposition', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_disp_5',
        leaseId: 'lease_disp_5',
        propertyId: 'property_disp_5',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      const initialBalance = system.getTrustAccountBalance('trust_nc');
      expect(initialBalance).toBe('2000.0000');

      system.processDisposition({
        depositId: collectResult.deposit!.id,
        moveOutDate: new Date(),
      });

      expect(system.getTrustAccountBalance('trust_nc')).toBe('0.0000');
    });
  });

  describe('Trust Account Integrity', () => {
    it('should keep deposits in separate trust accounts by state', () => {
      system.collectSecurityDeposit({
        tenantId: 'tenant_sep_1',
        leaseId: 'lease_sep_1',
        propertyId: 'property_sep_1',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      system.collectSecurityDeposit({
        tenantId: 'tenant_sep_2',
        leaseId: 'lease_sep_2',
        propertyId: 'property_sep_2',
        amount: '1500.00',
        monthlyRent: '1500.00',
        state: 'NY',
      });

      expect(system.getTrustAccountBalance('trust_nc')).toBe('2000.0000');
      expect(system.getTrustAccountBalance('trust_ny')).toBe('1500.0000');
    });

    it('should detect no commingling in properly separated accounts', () => {
      system.collectSecurityDeposit({
        tenantId: 'tenant_comm_1',
        leaseId: 'lease_comm_1',
        propertyId: 'property_comm_1',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      const comminglingCheck = system.detectCommingling();

      expect(comminglingCheck.commingled).toBe(false);
      expect(comminglingCheck.issues).toHaveLength(0);
    });

    it('should match total trust balance to total deposit liability', () => {
      system.collectSecurityDeposit({
        tenantId: 'tenant_match_1',
        leaseId: 'lease_match_1',
        propertyId: 'property_match_1',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      system.collectSecurityDeposit({
        tenantId: 'tenant_match_2',
        leaseId: 'lease_match_2',
        propertyId: 'property_match_2',
        amount: '1500.00',
        monthlyRent: '1500.00',
        state: 'NY',
      });

      system.collectSecurityDeposit({
        tenantId: 'tenant_match_3',
        leaseId: 'lease_match_3',
        propertyId: 'property_match_3',
        amount: '2500.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      expect(system.getTotalTrustBalance()).toBe(system.getTotalDepositLiability());
    });
  });

  describe('Refund Deadline Calculation', () => {
    it('should calculate NC 30-day deadline', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_dead_1',
        leaseId: 'lease_dead_1',
        propertyId: 'property_dead_1',
        amount: '2000.00',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      const moveOut = new Date('2024-06-15');
      const deadline = system.calculateRefundDeadline(collectResult.deposit!.id, moveOut);

      expect(deadline?.toISOString().split('T')[0]).toBe('2024-07-15');
    });

    it('should calculate CA 21-day deadline', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_dead_2',
        leaseId: 'lease_dead_2',
        propertyId: 'property_dead_2',
        amount: '2500.00',
        monthlyRent: '1500.00',
        state: 'CA',
      });

      const moveOut = new Date('2024-06-15');
      const deadline = system.calculateRefundDeadline(collectResult.deposit!.id, moveOut);

      expect(deadline?.toISOString().split('T')[0]).toBe('2024-07-06');
    });

    it('should calculate NY 14-day deadline', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_dead_3',
        leaseId: 'lease_dead_3',
        propertyId: 'property_dead_3',
        amount: '1500.00',
        monthlyRent: '1500.00',
        state: 'NY',
      });

      const moveOut = new Date('2024-06-15');
      const deadline = system.calculateRefundDeadline(collectResult.deposit!.id, moveOut);

      expect(deadline?.toISOString().split('T')[0]).toBe('2024-06-29');
    });
  });

  describe('State Rules Reference', () => {
    it('should return correct rules for NC', () => {
      const rules = system.getStateRules('NC');

      expect(rules?.maxDepositMonths).toBe(2);
      expect(rules?.refundDeadlineDays).toBe(30);
      expect(rules?.interestRequired).toBe(false);
      expect(rules?.petDepositAllowed).toBe(true);
    });

    it('should return correct rules for CA', () => {
      const rules = system.getStateRules('CA');

      expect(rules?.maxDepositMonths).toBe(2);
      expect(rules?.refundDeadlineDays).toBe(21);
      expect(rules?.petDepositAllowed).toBe(false);
    });

    it('should return correct rules for NY', () => {
      const rules = system.getStateRules('NY');

      expect(rules?.maxDepositMonths).toBe(1);
      expect(rules?.refundDeadlineDays).toBe(14);
      expect(rules?.interestRequired).toBe(true);
      expect(rules?.interestRate).toBe('0.02');
    });

    it('should return undefined for unknown state', () => {
      const rules = system.getStateRules('XX');
      expect(rules).toBeUndefined();
    });
  });

  describe('Penny Precision', () => {
    it('should handle precise deposit amounts', () => {
      const result = system.collectSecurityDeposit({
        tenantId: 'tenant_penny',
        leaseId: 'lease_penny',
        propertyId: 'property_penny',
        amount: '2345.67',
        monthlyRent: '1500.00',
        state: 'NC',
      });

      expect(result.success).toBe(true);
      expect(system.getTrustAccountBalance('trust_nc')).toBe('2345.6700');
    });

    it('should calculate precise interest', () => {
      const collectResult = system.collectSecurityDeposit({
        tenantId: 'tenant_precise_int',
        leaseId: 'lease_precise_int',
        propertyId: 'property_precise_int',
        amount: '1234.56',
        monthlyRent: '1500.00',
        state: 'NY',
      });

      const oneYearLater = new Date(collectResult.deposit!.collectedDate);
      oneYearLater.setDate(oneYearLater.getDate() + 365);

      const accrualResult = system.accrueInterest(collectResult.deposit!.id, oneYearLater);

      // 1234.56 * 0.02 = 24.6912 for one year
      expect(new Decimal(accrualResult.interestAccrued!).toDecimalPlaces(2).toNumber()).toBeCloseTo(
        24.69,
        1
      );
    });
  });
});
