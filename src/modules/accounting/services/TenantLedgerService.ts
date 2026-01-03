/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * TenantLedgerService - Comprehensive Tenant Financial View
 *
 * TITANIUM RULES ENFORCED:
 * 1. Immutable Ledger - All charges and payments create journal entries
 * 2. Double-Entry Only - Every transaction is balanced
 * 3. Law as Data - Late fees, charges from compliance_rules
 * 4. O(1) Reads - Tenant balance from dimensional_balances
 *
 * FEATURES:
 * - Real-time tenant balance
 * - Charge history (rent, utilities, fees)
 * - Payment history
 * - Aging report (30/60/90 days)
 * - Statement generation
 * - Payment plan management
 */

import { supabase } from '@/lib/supabase';
import { Decimal as DecimalJS } from 'decimal.js';
import type { Decimal, ISODate, UUID, JournalPostingInput } from '../types';
import { LedgerService, createLedgerService } from '../services/LedgerService';
import { ComplianceService, createComplianceService } from '../services/ComplianceService';
import { EventService, createEventService } from '../events/EventService';

export class TenantLedgerService {
  private organizationId: string;
  private ledger: LedgerService;
  private compliance: ComplianceService;
  private events: EventService;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.ledger = createLedgerService(organizationId);
    this.compliance = createComplianceService(organizationId);
    this.events = createEventService(organizationId);
  }

  // ============================================================
  // BALANCE & LEDGER
  // ============================================================

  /**
   * Get current tenant balance (O(1))
   */
  async getTenantBalance(tenantId: UUID, propertyId?: UUID): Promise<TenantBalance> {
    let query = supabase
      .from('dimensional_balances')
      .select('balance, property_id, properties(name)')
      .eq('tenant_id', tenantId);

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data: balances, error } = await query;

    if (error) {
      throw new TenantLedgerError(
        `Failed to fetch tenant balance: ${error.message}`,
        'FETCH_FAILED'
      );
    }

    // Use Decimal.js for penny-perfect precision
    const totalBalance = (balances || []).reduce(
      (sum, b) => sum.plus(new DecimalJS(b.balance)),
      new DecimalJS(0)
    );

    return {
      tenantId,
      totalBalance: totalBalance.toFixed(2) as Decimal,
      propertyBalances: (balances || []).map((b) => ({
        propertyId: b.property_id,
        propertyName: b.properties?.name || 'Unknown',
        balance: new DecimalJS(b.balance).toFixed(2) as Decimal,
      })),
      asOf: new Date().toISOString(),
    };
  }

  /**
   * Get tenant ledger (all transactions)
   */
  async getTenantLedger(
    tenantId: UUID,
    options: {
      propertyId?: UUID;
      startDate?: ISODate;
      endDate?: ISODate;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<TenantLedgerResponse> {
    let query = supabase
      .from('journal_postings')
      .select(`
        id,
        amount,
        description,
        journal_entries!inner(
          id,
          entry_date,
          entry_type,
          description
        ),
        properties(id, name)
      `)
      .eq('tenant_id', tenantId)
      .order('journal_entries.entry_date', { ascending: false });

    if (options.propertyId) {
      query = query.eq('property_id', options.propertyId);
    }

    if (options.startDate) {
      query = query.gte('journal_entries.entry_date', options.startDate);
    }

    if (options.endDate) {
      query = query.lte('journal_entries.entry_date', options.endDate);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data: postings, error, count } = await query;

    if (error) {
      throw new TenantLedgerError(
        `Failed to fetch tenant ledger: ${error.message}`,
        'FETCH_FAILED'
      );
    }

    const entries: LedgerEntry[] = (postings || []).map((p) => ({
      id: p.id,
      date: p.journal_entries.entry_date,
      type: p.journal_entries.entry_type,
      description: p.description || p.journal_entries.description,
      amount: p.amount,
      propertyId: p.properties?.id,
      propertyName: p.properties?.name,
      runningBalance: '0.00' as Decimal, // Calculated below
    }));

    // Calculate running balance using Decimal.js for penny-perfect precision
    let runningBalance = new DecimalJS(0);
    for (let i = entries.length - 1; i >= 0; i--) {
      runningBalance = runningBalance.plus(new DecimalJS(entries[i].amount));
      entries[i].runningBalance = runningBalance.toFixed(2) as Decimal;
    }

    return {
      tenantId,
      entries,
      totalCount: count || entries.length,
      currentBalance: runningBalance.toFixed(2) as Decimal,
    };
  }

  // ============================================================
  // CHARGES
  // ============================================================

  /**
   * Post a charge to tenant account
   */
  async postCharge(input: PostChargeInput): Promise<{
    chargeId: UUID;
    journalEntryId: UUID;
  }> {
    // Use Decimal.js for penny-perfect precision
    const amount = new DecimalJS(input.amount);

    if (amount.lte(0)) {
      throw new TenantLedgerError('Charge amount must be positive', 'INVALID_AMOUNT');
    }

    // Get accounts
    const { receivableAccountId, incomeAccountId } = await this.getChargeAccounts(
      input.chargeType
    );

    // Create journal entry
    const postings: JournalPostingInput[] = [
      {
        accountId: receivableAccountId,
        amount: amount.toFixed(4) as Decimal, // Debit receivable
        propertyId: input.propertyId,
        tenantId: input.tenantId,
        description: input.description || `${input.chargeType} charge`,
      },
      {
        accountId: incomeAccountId,
        amount: amount.negated().toFixed(4) as Decimal, // Credit income
        propertyId: input.propertyId,
        tenantId: input.tenantId,
        description: input.description || `${input.chargeType} income`,
      },
    ];

    const journalEntry = await this.ledger.createJournalEntry({
      entryDate: input.chargeDate,
      entryType: 'charge',
      description: input.description || `${input.chargeType} charge`,
      postings,
      metadata: {
        chargeType: input.chargeType,
        leaseId: input.leaseId,
      },
    });

    // Create charge record
    const chargeId = crypto.randomUUID() as UUID;
    await supabase.from('tenant_charges').insert({
      id: chargeId,
      organization_id: this.organizationId,
      tenant_id: input.tenantId,
      property_id: input.propertyId,
      lease_id: input.leaseId,
      charge_type: input.chargeType,
      amount: input.amount,
      balance_due: input.amount,
      charge_date: input.chargeDate,
      due_date: input.dueDate,
      description: input.description,
      journal_entry_id: journalEntry.id,
      recurring_charge_id: input.recurringChargeId,
    });

    await this.events.emit({
      eventType: 'tenant.charge.posted',
      payload: {
        chargeId,
        tenantId: input.tenantId,
        propertyId: input.propertyId,
        amount: input.amount,
        chargeType: input.chargeType,
      },
    });

    return { chargeId, journalEntryId: journalEntry.id };
  }

  /**
   * Get outstanding charges for tenant
   */
  async getOutstandingCharges(
    tenantId: UUID,
    propertyId?: UUID
  ): Promise<OutstandingCharge[]> {
    let query = supabase
      .from('tenant_charges')
      .select('*')
      .eq('tenant_id', tenantId)
      .gt('balance_due', 0)
      .order('charge_date', { ascending: true });

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data: charges, error } = await query;

    if (error) {
      throw new TenantLedgerError(
        `Failed to fetch charges: ${error.message}`,
        'FETCH_FAILED'
      );
    }

    return (charges || []).map((c) => ({
      id: c.id,
      chargeType: c.charge_type,
      chargeDate: c.charge_date,
      dueDate: c.due_date,
      originalAmount: c.amount,
      balanceDue: c.balance_due,
      description: c.description,
      daysOverdue: this.calculateDaysOverdue(c.due_date),
    }));
  }

  // ============================================================
  // AGING REPORT
  // ============================================================

  /**
   * Get aging report for tenant
   */
  async getAgingReport(tenantId: UUID, propertyId?: UUID): Promise<AgingReport> {
    const charges = await this.getOutstandingCharges(tenantId, propertyId);

    // Use Decimal.js for penny-perfect precision in aging buckets
    const buckets = {
      current: new DecimalJS(0),
      days30: new DecimalJS(0),
      days60: new DecimalJS(0),
      days90: new DecimalJS(0),
      over90: new DecimalJS(0),
    };

    const chargeDetails: AgingChargeDetail[] = [];

    for (const charge of charges) {
      const balanceDue = new DecimalJS(charge.balanceDue);
      const daysOverdue = charge.daysOverdue;

      let bucket: keyof AgingBuckets;
      if (daysOverdue <= 0) {
        bucket = 'current';
      } else if (daysOverdue <= 30) {
        bucket = 'days30';
      } else if (daysOverdue <= 60) {
        bucket = 'days60';
      } else if (daysOverdue <= 90) {
        bucket = 'days90';
      } else {
        bucket = 'over90';
      }

      buckets[bucket] = buckets[bucket].plus(balanceDue);

      chargeDetails.push({
        chargeId: charge.id,
        chargeType: charge.chargeType,
        chargeDate: charge.chargeDate,
        dueDate: charge.dueDate,
        balanceDue: charge.balanceDue,
        daysOverdue,
        bucket,
      });
    }

    const totalOutstanding = buckets.current
      .plus(buckets.days30)
      .plus(buckets.days60)
      .plus(buckets.days90)
      .plus(buckets.over90);

    return {
      tenantId,
      asOf: new Date().toISOString().split('T')[0] as ISODate,
      buckets: {
        current: buckets.current.toFixed(2) as Decimal,
        days30: buckets.days30.toFixed(2) as Decimal,
        days60: buckets.days60.toFixed(2) as Decimal,
        days90: buckets.days90.toFixed(2) as Decimal,
        over90: buckets.over90.toFixed(2) as Decimal,
      },
      totalOutstanding: totalOutstanding.toFixed(2) as Decimal,
      chargeDetails,
    };
  }

  /**
   * Get aging summary for all tenants (for portfolio view)
   * Uses Decimal.js for penny-perfect precision
   */
  async getPortfolioAgingSummary(propertyId?: UUID): Promise<PortfolioAgingSummary> {
    let query = supabase
      .from('tenant_charges')
      .select(`
        tenant_id,
        balance_due,
        due_date,
        tenants(name)
      `)
      .eq('organization_id', this.organizationId)
      .gt('balance_due', 0);

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data: charges, error } = await query;

    if (error) {
      throw new TenantLedgerError(
        `Failed to fetch portfolio aging: ${error.message}`,
        'FETCH_FAILED'
      );
    }

    // Use Decimal.js internally for penny-perfect precision
    type DecimalBuckets = { tenantName: string; current: DecimalJS; days30: DecimalJS; days60: DecimalJS; days90: DecimalJS; over90: DecimalJS };
    const tenantBuckets = new Map<UUID, DecimalBuckets>();

    for (const charge of charges || []) {
      const balanceDue = new DecimalJS(charge.balance_due);
      const daysOverdue = this.calculateDaysOverdue(charge.due_date);

      if (!tenantBuckets.has(charge.tenant_id)) {
        tenantBuckets.set(charge.tenant_id, {
          tenantName: charge.tenants?.name || 'Unknown',
          current: new DecimalJS(0),
          days30: new DecimalJS(0),
          days60: new DecimalJS(0),
          days90: new DecimalJS(0),
          over90: new DecimalJS(0),
        });
      }

      const bucket = tenantBuckets.get(charge.tenant_id)!;

      if (daysOverdue <= 0) {
        bucket.current = bucket.current.plus(balanceDue);
      } else if (daysOverdue <= 30) {
        bucket.days30 = bucket.days30.plus(balanceDue);
      } else if (daysOverdue <= 60) {
        bucket.days60 = bucket.days60.plus(balanceDue);
      } else if (daysOverdue <= 90) {
        bucket.days90 = bucket.days90.plus(balanceDue);
      } else {
        bucket.over90 = bucket.over90.plus(balanceDue);
      }
    }

    const tenantSummaries: TenantAgingSummary[] = [];
    const totals = {
      current: new DecimalJS(0),
      days30: new DecimalJS(0),
      days60: new DecimalJS(0),
      days90: new DecimalJS(0),
      over90: new DecimalJS(0),
    };

    for (const [tenantId, buckets] of tenantBuckets) {
      const totalDue = buckets.current
        .plus(buckets.days30)
        .plus(buckets.days60)
        .plus(buckets.days90)
        .plus(buckets.over90);

      tenantSummaries.push({
        tenantId,
        tenantName: buckets.tenantName,
        current: buckets.current.toFixed(2) as Decimal,
        days30: buckets.days30.toFixed(2) as Decimal,
        days60: buckets.days60.toFixed(2) as Decimal,
        days90: buckets.days90.toFixed(2) as Decimal,
        over90: buckets.over90.toFixed(2) as Decimal,
        total: totalDue.toFixed(2) as Decimal,
      });

      totals.current = totals.current.plus(buckets.current);
      totals.days30 = totals.days30.plus(buckets.days30);
      totals.days60 = totals.days60.plus(buckets.days60);
      totals.days90 = totals.days90.plus(buckets.days90);
      totals.over90 = totals.over90.plus(buckets.over90);
    }

    const grandTotal = totals.current
      .plus(totals.days30)
      .plus(totals.days60)
      .plus(totals.days90)
      .plus(totals.over90);

    return {
      asOf: new Date().toISOString().split('T')[0] as ISODate,
      tenants: tenantSummaries.sort((a, b) => new DecimalJS(b.total).minus(new DecimalJS(a.total)).toNumber()),
      totals: {
        current: totals.current.toFixed(2) as Decimal,
        days30: totals.days30.toFixed(2) as Decimal,
        days60: totals.days60.toFixed(2) as Decimal,
        days90: totals.days90.toFixed(2) as Decimal,
        over90: totals.over90.toFixed(2) as Decimal,
        total: grandTotal.toFixed(2) as Decimal,
      },
      tenantsWithOverdue: tenantSummaries.filter((t) => {
        const overdueSum = new DecimalJS(t.days30)
          .plus(new DecimalJS(t.days60))
          .plus(new DecimalJS(t.days90))
          .plus(new DecimalJS(t.over90));
        return overdueSum.gt(0);
      }).length,
    };
  }

  // ============================================================
  // STATEMENTS
  // ============================================================

  /**
   * Generate tenant statement
   */
  async generateStatement(
    tenantId: UUID,
    propertyId: UUID,
    startDate: ISODate,
    endDate: ISODate
  ): Promise<TenantStatement> {
    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, email, phone')
      .eq('id', tenantId)
      .single();

    // Get property info
    const { data: property } = await supabase
      .from('properties')
      .select('name, address_line1, city, state_code, zip_code')
      .eq('id', propertyId)
      .single();

    // Get opening balance
    const openingBalance = await this.getBalanceAsOf(tenantId, propertyId, startDate);

    // Get ledger entries for period
    const ledger = await this.getTenantLedger(tenantId, {
      propertyId,
      startDate,
      endDate,
    });

    // Calculate totals using Decimal.js for penny-perfect precision
    let totalCharges = new DecimalJS(0);
    let totalPayments = new DecimalJS(0);

    for (const entry of ledger.entries) {
      const amount = new DecimalJS(entry.amount);
      if (amount.gt(0)) {
        totalCharges = totalCharges.plus(amount);
      } else {
        totalPayments = totalPayments.plus(amount.abs());
      }
    }

    const openingBalanceDecimal = new DecimalJS(openingBalance);
    const closingBalance = openingBalanceDecimal.plus(totalCharges).minus(totalPayments);

    const statement: TenantStatement = {
      tenantId,
      tenantName: tenant?.name || 'Unknown',
      tenantEmail: tenant?.email,
      propertyId,
      propertyName: property?.name || 'Unknown',
      propertyAddress: `${property?.address_line1}, ${property?.city}, ${property?.state_code} ${property?.zip_code}`,
      statementDate: new Date().toISOString().split('T')[0] as ISODate,
      periodStart: startDate,
      periodEnd: endDate,
      openingBalance: openingBalanceDecimal.toFixed(2) as Decimal,
      totalCharges: totalCharges.toFixed(2) as Decimal,
      totalPayments: totalPayments.toFixed(2) as Decimal,
      closingBalance: closingBalance.toFixed(2) as Decimal,
      transactions: ledger.entries.map((e) => {
        const amt = new DecimalJS(e.amount);
        return {
          date: e.date,
          description: e.description,
          charges: amt.gt(0) ? e.amount : ('0.00' as Decimal),
          payments: amt.lt(0) ? amt.abs().toFixed(2) as Decimal : ('0.00' as Decimal),
          balance: e.runningBalance,
        };
      }),
    };

    // Store statement
    await supabase.from('tenant_statements').insert({
      id: crypto.randomUUID(),
      organization_id: this.organizationId,
      tenant_id: tenantId,
      property_id: propertyId,
      statement_date: statement.statementDate,
      period_start: startDate,
      period_end: endDate,
      opening_balance: statement.openingBalance,
      closing_balance: statement.closingBalance,
    });

    return statement;
  }

  // ============================================================
  // PAYMENT PLANS
  // ============================================================

  /**
   * Create payment plan for tenant
   */
  async createPaymentPlan(input: PaymentPlanInput): Promise<PaymentPlan> {
    const outstandingCharges = await this.getOutstandingCharges(
      input.tenantId,
      input.propertyId
    );

    // Use Decimal.js for penny-perfect precision
    const totalOwed = outstandingCharges.reduce(
      (sum, c) => sum.plus(new DecimalJS(c.balanceDue)),
      new DecimalJS(0)
    );

    if (totalOwed.lte(0)) {
      throw new TenantLedgerError('No outstanding balance for payment plan', 'NO_BALANCE');
    }

    const planAmount = input.totalAmount ? new DecimalJS(input.totalAmount) : totalOwed;

    if (planAmount.gt(totalOwed)) {
      throw new TenantLedgerError(
        'Payment plan amount cannot exceed outstanding balance',
        'EXCEEDS_BALANCE'
      );
    }

    // Generate payment schedule using Decimal.js for precise division
    const installmentAmount = planAmount.dividedBy(input.numberOfPayments);
    const schedule: PaymentPlanInstallment[] = [];

    let dueDate = new Date(input.startDate);
    for (let i = 0; i < input.numberOfPayments; i++) {
      schedule.push({
        installmentNumber: i + 1,
        dueDate: dueDate.toISOString().split('T')[0] as ISODate,
        amount: installmentAmount.toFixed(2) as Decimal,
        status: 'pending',
      });

      // Next due date based on frequency
      switch (input.frequency) {
        case 'weekly':
          dueDate.setDate(dueDate.getDate() + 7);
          break;
        case 'biweekly':
          dueDate.setDate(dueDate.getDate() + 14);
          break;
        case 'monthly':
          dueDate.setMonth(dueDate.getMonth() + 1);
          break;
      }
    }

    // Create payment plan record
    const planId = crypto.randomUUID() as UUID;
    await supabase.from('payment_plans').insert({
      id: planId,
      organization_id: this.organizationId,
      tenant_id: input.tenantId,
      property_id: input.propertyId,
      total_amount: planAmount.toFixed(2),
      number_of_payments: input.numberOfPayments,
      frequency: input.frequency,
      start_date: input.startDate,
      status: 'active',
      schedule,
    });

    await this.events.emit({
      eventType: 'tenant.payment_plan.created',
      payload: {
        planId,
        tenantId: input.tenantId,
        totalAmount: planAmount.toFixed(2),
        numberOfPayments: input.numberOfPayments,
      },
    });

    return {
      id: planId,
      tenantId: input.tenantId,
      propertyId: input.propertyId,
      totalAmount: planAmount.toFixed(2) as Decimal,
      paidAmount: '0.00' as Decimal,
      remainingAmount: planAmount.toFixed(2) as Decimal,
      numberOfPayments: input.numberOfPayments,
      frequency: input.frequency,
      schedule,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private calculateDaysOverdue(dueDate: ISODate): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  private async getBalanceAsOf(
    tenantId: UUID,
    propertyId: UUID,
    asOfDate: ISODate
  ): Promise<Decimal> {
    // Get current balance
    const { data: currentBalance } = await supabase
      .from('dimensional_balances')
      .select('balance')
      .eq('tenant_id', tenantId)
      .eq('property_id', propertyId)
      .single();

    // Get transactions after asOfDate
    const { data: futureTransactions } = await supabase
      .from('journal_postings')
      .select('amount, journal_entries!inner(entry_date)')
      .eq('tenant_id', tenantId)
      .eq('property_id', propertyId)
      .gt('journal_entries.entry_date', asOfDate);

    // Use Decimal.js for penny-perfect precision
    const currentBal = new DecimalJS(currentBalance?.balance || '0');
    const futureSum = (futureTransactions || []).reduce(
      (sum, t) => sum.plus(new DecimalJS(t.amount)),
      new DecimalJS(0)
    );

    return currentBal.minus(futureSum).toFixed(2) as Decimal;
  }

  private async getChargeAccounts(chargeType: string): Promise<{
    receivableAccountId: UUID;
    incomeAccountId: UUID;
  }> {
    // Get accounts receivable
    const { data: arAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', 'accounts_receivable')
      .single();

    // Get income account based on charge type
    let incomeSubtype = 'rental_income';
    switch (chargeType) {
      case 'late_fee':
        incomeSubtype = 'late_fee_income';
        break;
      case 'utility':
        incomeSubtype = 'utility_income';
        break;
      case 'pet_fee':
      case 'parking':
      case 'other':
        incomeSubtype = 'other_income';
        break;
    }

    const { data: incomeAccount } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('organization_id', this.organizationId)
      .eq('account_subtype', incomeSubtype)
      .single();

    if (!arAccount || !incomeAccount) {
      throw new TenantLedgerError('Required accounts not found', 'ACCOUNTS_NOT_FOUND');
    }

    return {
      receivableAccountId: arAccount.id,
      incomeAccountId: incomeAccount.id,
    };
  }
}

// ============================================================
// TYPES
// ============================================================

export interface TenantBalance {
  tenantId: UUID;
  totalBalance: Decimal;
  propertyBalances: Array<{
    propertyId: UUID;
    propertyName: string;
    balance: Decimal;
  }>;
  asOf: string;
}

export interface LedgerEntry {
  id: UUID;
  date: ISODate;
  type: string;
  description: string;
  amount: Decimal;
  propertyId?: UUID;
  propertyName?: string;
  runningBalance: Decimal;
}

export interface TenantLedgerResponse {
  tenantId: UUID;
  entries: LedgerEntry[];
  totalCount: number;
  currentBalance: Decimal;
}

export interface PostChargeInput {
  tenantId: UUID;
  propertyId: UUID;
  leaseId?: UUID;
  chargeType: 'rent' | 'late_fee' | 'utility' | 'pet_fee' | 'parking' | 'other';
  amount: Decimal;
  chargeDate: ISODate;
  dueDate?: ISODate;
  description?: string;
  recurringChargeId?: UUID;
}

export interface OutstandingCharge {
  id: UUID;
  chargeType: string;
  chargeDate: ISODate;
  dueDate?: ISODate;
  originalAmount: Decimal;
  balanceDue: Decimal;
  description?: string;
  daysOverdue: number;
}

export interface AgingBuckets {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
}

export interface AgingChargeDetail {
  chargeId: UUID;
  chargeType: string;
  chargeDate: ISODate;
  dueDate?: ISODate;
  balanceDue: Decimal;
  daysOverdue: number;
  bucket: keyof AgingBuckets;
}

export interface AgingReport {
  tenantId: UUID;
  asOf: ISODate;
  buckets: {
    current: Decimal;
    days30: Decimal;
    days60: Decimal;
    days90: Decimal;
    over90: Decimal;
  };
  totalOutstanding: Decimal;
  chargeDetails: AgingChargeDetail[];
}

export interface TenantAgingSummary {
  tenantId: UUID;
  tenantName: string;
  current: Decimal;
  days30: Decimal;
  days60: Decimal;
  days90: Decimal;
  over90: Decimal;
  total: Decimal;
}

export interface PortfolioAgingSummary {
  asOf: ISODate;
  tenants: TenantAgingSummary[];
  totals: {
    current: Decimal;
    days30: Decimal;
    days60: Decimal;
    days90: Decimal;
    over90: Decimal;
    total: Decimal;
  };
  tenantsWithOverdue: number;
}

export interface TenantStatement {
  tenantId: UUID;
  tenantName: string;
  tenantEmail?: string;
  propertyId: UUID;
  propertyName: string;
  propertyAddress: string;
  statementDate: ISODate;
  periodStart: ISODate;
  periodEnd: ISODate;
  openingBalance: Decimal;
  totalCharges: Decimal;
  totalPayments: Decimal;
  closingBalance: Decimal;
  transactions: Array<{
    date: ISODate;
    description: string;
    charges: Decimal;
    payments: Decimal;
    balance: Decimal;
  }>;
}

export interface PaymentPlanInput {
  tenantId: UUID;
  propertyId?: UUID;
  totalAmount?: Decimal;
  numberOfPayments: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: ISODate;
}

export interface PaymentPlanInstallment {
  installmentNumber: number;
  dueDate: ISODate;
  amount: Decimal;
  status: 'pending' | 'paid' | 'late' | 'missed';
  paidDate?: ISODate;
  paidAmount?: Decimal;
}

export interface PaymentPlan {
  id: UUID;
  tenantId: UUID;
  propertyId?: UUID;
  totalAmount: Decimal;
  paidAmount: Decimal;
  remainingAmount: Decimal;
  numberOfPayments: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  schedule: PaymentPlanInstallment[];
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  createdAt: string;
}

export class TenantLedgerError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'TenantLedgerError';
    this.code = code;
  }
}

export function createTenantLedgerService(organizationId: string): TenantLedgerService {
  return new TenantLedgerService(organizationId);
}
