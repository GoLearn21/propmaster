/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * TC-HIS: Historical Disaster Prevention Tests
 *
 * Fraud patterns from major accounting scandals:
 * - Enron (2001): Off-balance-sheet entities, mark-to-market abuse
 * - WorldCom (2002): Expense capitalization, reserve manipulation
 * - Tyco (2002): Related party transactions, executive loans
 * - HealthSouth (2003): Revenue inflation, fictitious entries
 *
 * Property Management specific fraud patterns:
 * - Salami slicing: Siphoning pennies to hidden accounts
 * - Fictitious vendors: Fake vendors for embezzlement
 * - Round-trip transactions: Same-day in/out to inflate revenue
 * - Bill and hold: Premature revenue recognition
 * - Related party fraud: Owner-connected vendor payments
 *
 * Test IDs: TC-HIS-001 through TC-HIS-015
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Decimal from 'decimal.js';

// Configure Decimal for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============================================================================
// FRAUD DETECTION TYPES
// ============================================================================

interface Transaction {
  id: string;
  date: Date;
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  accountId: string;
  counterpartyId?: string;
  description: string;
  createdBy: string;
  createdAt: Date;
}

interface Entity {
  id: string;
  name: string;
  type: 'property' | 'subsidiary' | 'trust' | 'vendor' | 'owner';
  parentEntityId?: string;
  controlledBy?: string;
  isConsolidated: boolean;
}

interface Vendor {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  taxId?: string;
  address?: string;
  bankAccount?: string;
  totalPaymentsReceived: string;
  relatedPartyFlag: boolean;
  relatedToOwnerId?: string;
}

interface Invoice {
  id: string;
  vendorId: string;
  amount: string;
  date: Date;
  description: string;
  approvedBy?: string;
  paidDate?: Date;
}

interface Lease {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: string;
  status: 'active' | 'pending' | 'expired' | 'terminated';
  moveInDate?: Date;
}

interface RevenueEntry {
  id: string;
  leaseId: string;
  type: 'rent' | 'late_fee' | 'utility' | 'other';
  amount: string;
  periodStart: Date;
  periodEnd: Date;
  recognizedDate: Date;
  isEarned: boolean;
}

interface Reserve {
  id: string;
  name: string;
  type: 'bad_debt' | 'maintenance' | 'vacancy' | 'other';
  balance: string;
  lastAdjustment: Date;
  adjustmentHistory: Array<{
    date: Date;
    amount: string;
    reason: string;
    approvedBy: string;
  }>;
}

interface FraudAlert {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  relatedEntityId?: string;
  detectedAt: Date;
  resolvedAt?: Date;
}

// ============================================================================
// FRAUD DETECTION SYSTEM (Test Implementation)
// ============================================================================

class FraudDetectionSystem {
  private transactions: Transaction[] = [];
  private entities: Entity[] = [];
  private vendors: Vendor[] = [];
  private invoices: Invoice[] = [];
  private leases: Lease[] = [];
  private revenue: RevenueEntry[] = [];
  private reserves: Reserve[] = [];
  private alerts: FraudAlert[] = [];
  private accountBalances: Map<string, string> = new Map();

  // ============================================================================
  // TC-HIS-001: ENRON - Controlled Entity Consolidation
  // ============================================================================

  /**
   * Detect off-balance-sheet entities that should be consolidated
   * Enron hid $38B in debt in unconsolidated SPEs
   */
  detectUnconsolidatedEntities(): {
    found: boolean;
    entities: Entity[];
    potentialHiddenDebt: string;
  } {
    // Find entities that are controlled but not consolidated
    const unconsolidated = this.entities.filter(
      (e) => e.controlledBy && !e.isConsolidated && e.type !== 'vendor'
    );

    // Estimate hidden debt (simplified)
    const hiddenDebt = this.transactions
      .filter(
        (t) =>
          unconsolidated.some((e) => e.id === t.accountId) &&
          t.type === 'expense' &&
          new Decimal(t.amount).greaterThan(0)
      )
      .reduce((sum, t) => sum.plus(new Decimal(t.amount)), new Decimal(0));

    return {
      found: unconsolidated.length > 0,
      entities: unconsolidated,
      potentialHiddenDebt: hiddenDebt.toFixed(4),
    };
  }

  // ============================================================================
  // TC-HIS-002: WORLDCOM - Expense Capitalization
  // ============================================================================

  /**
   * Detect expenses being incorrectly capitalized as assets
   * WorldCom capitalized $3.8B in line costs that should have been expenses
   */
  detectExpenseCapitalization(): {
    suspicious: boolean;
    items: Array<{ description: string; amount: string; ratio: number }>;
  } {
    const CAPITALIZATION_THRESHOLD = 0.3; // 30% of revenue going to "assets" is suspicious

    // Group transactions by type
    const expenses = this.transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum.plus(new Decimal(t.amount).abs()), new Decimal(0));

    const capitalizedItems = this.transactions.filter(
      (t) =>
        t.type === 'expense' &&
        (t.description.toLowerCase().includes('capital') ||
          t.description.toLowerCase().includes('asset') ||
          t.description.toLowerCase().includes('improvement'))
    );

    const totalCapitalized = capitalizedItems.reduce(
      (sum, t) => sum.plus(new Decimal(t.amount).abs()),
      new Decimal(0)
    );

    const ratio = expenses.greaterThan(0)
      ? totalCapitalized.dividedBy(expenses).toNumber()
      : 0;

    return {
      suspicious: ratio > CAPITALIZATION_THRESHOLD,
      items: capitalizedItems.map((t) => ({
        description: t.description,
        amount: t.amount,
        ratio,
      })),
    };
  }

  // ============================================================================
  // TC-HIS-003: SALAMI SLICING - Penny Accumulation
  // ============================================================================

  /**
   * Detect salami slicing - small amounts siphoned to a hidden account
   * Classic embezzlement: round down all transactions, accumulate pennies
   */
  detectSalamiSlicing(): {
    detected: boolean;
    suspiciousAccount?: string;
    accumulatedAmount: string;
    transactionCount: number;
  } {
    // Look for accounts with many small credits and no corresponding business purpose
    const accountCredits = new Map<string, { count: number; total: Decimal }>();

    for (const tx of this.transactions) {
      const amount = new Decimal(tx.amount);

      // Focus on small positive amounts (typical salami slice is < $1)
      if (amount.greaterThan(0) && amount.lessThan(1)) {
        const current = accountCredits.get(tx.accountId) || {
          count: 0,
          total: new Decimal(0),
        };
        accountCredits.set(tx.accountId, {
          count: current.count + 1,
          total: current.total.plus(amount),
        });
      }
    }

    // Flag accounts with many small credits (pattern threshold: 10+ small transactions)
    for (const [accountId, data] of accountCredits) {
      if (data.count >= 10 && data.total.greaterThan(5)) {
        return {
          detected: true,
          suspiciousAccount: accountId,
          accumulatedAmount: data.total.toFixed(4),
          transactionCount: data.count,
        };
      }
    }

    return {
      detected: false,
      accumulatedAmount: '0.0000',
      transactionCount: 0,
    };
  }

  // ============================================================================
  // TC-HIS-004: REVENUE RECOGNITION - Earned Period Only
  // ============================================================================

  /**
   * Ensure rent revenue is only recognized in the earned period
   * Can't recognize January rent in December's financials
   */
  validateRevenueRecognition(): {
    valid: boolean;
    violations: Array<{
      entryId: string;
      recognizedDate: Date;
      periodStart: Date;
      issue: string;
    }>;
  } {
    const violations: Array<{
      entryId: string;
      recognizedDate: Date;
      periodStart: Date;
      issue: string;
    }> = [];

    for (const entry of this.revenue) {
      const recognizedDate = entry.recognizedDate;
      const periodStart = entry.periodStart;

      // Revenue cannot be recognized before the period starts
      if (recognizedDate < periodStart) {
        violations.push({
          entryId: entry.id,
          recognizedDate,
          periodStart,
          issue: 'Revenue recognized before earned period',
        });
      }

      // For rent, must have active lease and actual occupancy
      if (entry.type === 'rent') {
        const lease = this.leases.find((l) => l.id === entry.leaseId);

        if (!lease) {
          violations.push({
            entryId: entry.id,
            recognizedDate,
            periodStart,
            issue: 'Revenue without associated lease',
          });
        } else if (!lease.moveInDate) {
          violations.push({
            entryId: entry.id,
            recognizedDate,
            periodStart,
            issue: 'Rent recognized without tenant move-in',
          });
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  // ============================================================================
  // TC-HIS-005: FICTITIOUS VENDOR - Same Day Creation & Payment
  // ============================================================================

  /**
   * Flag vendors created on the same day as large invoices
   * Classic embezzlement pattern: create fake vendor, submit invoice, pay self
   */
  detectFictitiousVendors(): {
    detected: boolean;
    suspiciousVendors: Array<{
      vendor: Vendor;
      invoiceAmount: string;
      daysBetweenCreationAndInvoice: number;
    }>;
  } {
    const suspicious: Array<{
      vendor: Vendor;
      invoiceAmount: string;
      daysBetweenCreationAndInvoice: number;
    }> = [];

    const LARGE_INVOICE_THRESHOLD = 1000;
    const SUSPICIOUS_DAYS = 7; // Vendor created within 7 days of large invoice

    for (const vendor of this.vendors) {
      const vendorInvoices = this.invoices.filter((i) => i.vendorId === vendor.id);

      for (const invoice of vendorInvoices) {
        const daysBetween = Math.abs(
          Math.floor(
            (invoice.date.getTime() - vendor.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        );

        if (
          new Decimal(invoice.amount).greaterThanOrEqualTo(LARGE_INVOICE_THRESHOLD) &&
          daysBetween <= SUSPICIOUS_DAYS
        ) {
          suspicious.push({
            vendor,
            invoiceAmount: invoice.amount,
            daysBetweenCreationAndInvoice: daysBetween,
          });
        }
      }
    }

    return {
      detected: suspicious.length > 0,
      suspiciousVendors: suspicious,
    };
  }

  // ============================================================================
  // TC-HIS-006: ROUND-TRIP TRANSACTIONS
  // ============================================================================

  /**
   * Detect same-day in/out transactions that may inflate revenue
   * Money comes in and goes right back out (often to same or related party)
   */
  detectRoundTripTransactions(): {
    detected: boolean;
    suspicious: Array<{
      inTransaction: Transaction;
      outTransaction: Transaction;
      amount: string;
    }>;
  } {
    const suspicious: Array<{
      inTransaction: Transaction;
      outTransaction: Transaction;
      amount: string;
    }> = [];

    // Group transactions by date
    const byDate = new Map<string, Transaction[]>();

    for (const tx of this.transactions) {
      const dateKey = tx.date.toISOString().split('T')[0];
      const existing = byDate.get(dateKey) || [];
      existing.push(tx);
      byDate.set(dateKey, existing);
    }

    // Look for matching in/out on same day
    for (const [, txs] of byDate) {
      const income = txs.filter((t) => t.type === 'income');
      const expenses = txs.filter((t) => t.type === 'expense');

      for (const inc of income) {
        for (const exp of expenses) {
          // Same amount or very close
          const incAmount = new Decimal(inc.amount).abs();
          const expAmount = new Decimal(exp.amount).abs();

          if (incAmount.equals(expAmount) && incAmount.greaterThan(1000)) {
            suspicious.push({
              inTransaction: inc,
              outTransaction: exp,
              amount: inc.amount,
            });
          }
        }
      }
    }

    return {
      detected: suspicious.length > 0,
      suspicious,
    };
  }

  // ============================================================================
  // TC-HIS-007: COOKIE JAR RESERVES
  // ============================================================================

  /**
   * Block arbitrary reserve manipulation
   * Companies inflate reserves in good years, release in bad years to smooth earnings
   */
  validateReserveAdjustments(): {
    valid: boolean;
    violations: Array<{
      reserveId: string;
      amount: string;
      issue: string;
    }>;
  } {
    const violations: Array<{
      reserveId: string;
      amount: string;
      issue: string;
    }> = [];

    const MAX_SINGLE_ADJUSTMENT_PERCENT = 0.5; // 50% change in one adjustment is suspicious
    const MIN_RESERVE_BALANCE = 0; // Reserves cannot go negative

    for (const reserve of this.reserves) {
      const balance = new Decimal(reserve.balance);

      // Check for negative reserves
      if (balance.lessThan(MIN_RESERVE_BALANCE)) {
        violations.push({
          reserveId: reserve.id,
          amount: reserve.balance,
          issue: 'Reserve balance is negative',
        });
      }

      // Check each adjustment for suspicious patterns
      for (const adj of reserve.adjustmentHistory) {
        const adjAmount = new Decimal(adj.amount).abs();

        // Large adjustment without proper approval
        if (adjAmount.greaterThan(10000) && !adj.approvedBy) {
          violations.push({
            reserveId: reserve.id,
            amount: adj.amount,
            issue: 'Large reserve adjustment without approval',
          });
        }

        // Vague reason
        if (adj.reason.length < 10 || adj.reason.toLowerCase().includes('other')) {
          violations.push({
            reserveId: reserve.id,
            amount: adj.amount,
            issue: 'Reserve adjustment with vague reason',
          });
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  // ============================================================================
  // TC-HIS-008: CHANNEL STUFFING - Future-Dated Revenue
  // ============================================================================

  /**
   * Prevent future-dated charges from appearing in current AR
   * Can't book next month's rent as current receivable
   */
  detectChannelStuffing(): {
    detected: boolean;
    futureCharges: Array<{
      entryId: string;
      periodStart: Date;
      amount: string;
    }>;
  } {
    const today = new Date();
    const futureCharges: Array<{
      entryId: string;
      periodStart: Date;
      amount: string;
    }> = [];

    for (const entry of this.revenue) {
      // Revenue for future periods shouldn't be in current AR
      if (entry.periodStart > today && !entry.isEarned) {
        futureCharges.push({
          entryId: entry.id,
          periodStart: entry.periodStart,
          amount: entry.amount,
        });
      }
    }

    return {
      detected: futureCharges.length > 0,
      futureCharges,
    };
  }

  // ============================================================================
  // TC-HIS-009: BILL AND HOLD - Occupancy Requirement
  // ============================================================================

  /**
   * Require actual occupancy before recognizing rent revenue
   * Can't book rent on vacant unit or unoccupied property
   */
  validateOccupancyForRevenue(): {
    valid: boolean;
    violations: Array<{
      entryId: string;
      leaseId: string;
      issue: string;
    }>;
  } {
    const violations: Array<{
      entryId: string;
      leaseId: string;
      issue: string;
    }> = [];

    for (const entry of this.revenue) {
      if (entry.type !== 'rent') continue;

      const lease = this.leases.find((l) => l.id === entry.leaseId);

      if (!lease) {
        violations.push({
          entryId: entry.id,
          leaseId: entry.leaseId,
          issue: 'Revenue without lease',
        });
        continue;
      }

      // Lease must be active
      if (lease.status !== 'active') {
        violations.push({
          entryId: entry.id,
          leaseId: entry.leaseId,
          issue: `Revenue on ${lease.status} lease`,
        });
      }

      // Tenant must have moved in
      if (!lease.moveInDate) {
        violations.push({
          entryId: entry.id,
          leaseId: entry.leaseId,
          issue: 'Revenue before tenant move-in',
        });
      } else if (lease.moveInDate > entry.periodStart) {
        violations.push({
          entryId: entry.id,
          leaseId: entry.leaseId,
          issue: 'Revenue recognized before actual move-in date',
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  // ============================================================================
  // TC-HIS-010: RELATED PARTY TRANSACTIONS
  // ============================================================================

  /**
   * Flag owner-related vendor transactions
   * Owner's brother-in-law doing overpriced repairs is a conflict of interest
   */
  detectRelatedPartyTransactions(): {
    detected: boolean;
    transactions: Array<{
      vendor: Vendor;
      totalPaid: string;
      relationship: string;
    }>;
  } {
    const related: Array<{
      vendor: Vendor;
      totalPaid: string;
      relationship: string;
    }> = [];

    for (const vendor of this.vendors) {
      if (vendor.relatedPartyFlag && vendor.relatedToOwnerId) {
        related.push({
          vendor,
          totalPaid: vendor.totalPaymentsReceived,
          relationship: `Related to owner ${vendor.relatedToOwnerId}`,
        });
      }
    }

    return {
      detected: related.length > 0,
      transactions: related,
    };
  }

  // ============================================================================
  // TEST DATA SETUP METHODS
  // ============================================================================

  addTransaction(tx: Transaction): void {
    this.transactions.push(tx);
  }

  addEntity(entity: Entity): void {
    this.entities.push(entity);
  }

  addVendor(vendor: Vendor): void {
    this.vendors.push(vendor);
  }

  addInvoice(invoice: Invoice): void {
    this.invoices.push(invoice);
  }

  addLease(lease: Lease): void {
    this.leases.push(lease);
  }

  addRevenue(entry: RevenueEntry): void {
    this.revenue.push(entry);
  }

  addReserve(reserve: Reserve): void {
    this.reserves.push(reserve);
  }

  clear(): void {
    this.transactions = [];
    this.entities = [];
    this.vendors = [];
    this.invoices = [];
    this.leases = [];
    this.revenue = [];
    this.reserves = [];
    this.alerts = [];
    this.accountBalances.clear();
  }
}

// ============================================================================
// TORTURE TESTS
// ============================================================================

describe('TC-HIS: Historical Disaster Prevention Tests', () => {
  let system: FraudDetectionSystem;

  beforeEach(() => {
    system = new FraudDetectionSystem();
  });

  // --------------------------------------------------------------------------
  // TC-HIS-001: Enron - Unconsolidated Entities
  // --------------------------------------------------------------------------
  describe('TC-HIS-001: Enron Pattern - Hidden Entities', () => {
    it('should detect unconsolidated controlled entities', () => {
      // Add controlled but unconsolidated entity (Enron-style SPE)
      system.addEntity({
        id: 'entity_hidden',
        name: 'Hidden Subsidiary LLC',
        type: 'subsidiary',
        controlledBy: 'parent_company',
        isConsolidated: false,
      });

      // Add debt hidden in the unconsolidated entity
      system.addTransaction({
        id: 'tx_hidden_debt',
        date: new Date(),
        type: 'expense',
        amount: '5000000.00', // $5M hidden debt
        accountId: 'entity_hidden',
        description: 'Debt obligation',
        createdBy: 'system',
        createdAt: new Date(),
      });

      const result = system.detectUnconsolidatedEntities();

      expect(result.found).toBe(true);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].name).toBe('Hidden Subsidiary LLC');
      expect(new Decimal(result.potentialHiddenDebt).greaterThan(0)).toBe(true);
    });

    it('should pass when all controlled entities are consolidated', () => {
      system.addEntity({
        id: 'entity_good',
        name: 'Proper Subsidiary LLC',
        type: 'subsidiary',
        controlledBy: 'parent_company',
        isConsolidated: true, // Properly consolidated
      });

      const result = system.detectUnconsolidatedEntities();

      expect(result.found).toBe(false);
      expect(result.entities).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // TC-HIS-002: WorldCom - Expense Capitalization
  // --------------------------------------------------------------------------
  describe('TC-HIS-002: WorldCom Pattern - Expense Capitalization', () => {
    it('should detect excessive expense capitalization', () => {
      // Normal operating expenses
      system.addTransaction({
        id: 'tx_normal_1',
        date: new Date(),
        type: 'expense',
        amount: '1000.00',
        accountId: 'operating',
        description: 'Utilities',
        createdBy: 'user1',
        createdAt: new Date(),
      });

      // Suspicious capitalization of operating costs
      system.addTransaction({
        id: 'tx_capital_1',
        date: new Date(),
        type: 'expense',
        amount: '5000.00',
        accountId: 'assets',
        description: 'Capital improvement - routine maintenance', // Suspicious!
        createdBy: 'user1',
        createdAt: new Date(),
      });

      system.addTransaction({
        id: 'tx_capital_2',
        date: new Date(),
        type: 'expense',
        amount: '3000.00',
        accountId: 'assets',
        description: 'Asset acquisition - repairs', // Also suspicious
        createdBy: 'user1',
        createdAt: new Date(),
      });

      const result = system.detectExpenseCapitalization();

      expect(result.suspicious).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should pass with normal capitalization ratios', () => {
      // Mostly normal expenses
      for (let i = 0; i < 10; i++) {
        system.addTransaction({
          id: `tx_normal_${i}`,
          date: new Date(),
          type: 'expense',
          amount: '1000.00',
          accountId: 'operating',
          description: 'Normal operating expense',
          createdBy: 'user1',
          createdAt: new Date(),
        });
      }

      // One legitimate capital expense (< 30%)
      system.addTransaction({
        id: 'tx_legit_capital',
        date: new Date(),
        type: 'expense',
        amount: '2000.00',
        accountId: 'assets',
        description: 'Capital improvement - new HVAC',
        createdBy: 'user1',
        createdAt: new Date(),
      });

      const result = system.detectExpenseCapitalization();

      expect(result.suspicious).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // TC-HIS-003: Salami Slicing
  // --------------------------------------------------------------------------
  describe('TC-HIS-003: Salami Slicing Detection', () => {
    it('should detect penny accumulation pattern', () => {
      const hiddenAccount = 'account_embezzle';

      // Simulate salami slicing - many small amounts to hidden account
      for (let i = 0; i < 50; i++) {
        system.addTransaction({
          id: `tx_slice_${i}`,
          date: new Date(),
          type: 'transfer',
          amount: '0.17', // Small amount each time
          accountId: hiddenAccount,
          description: 'Rounding adjustment',
          createdBy: 'system',
          createdAt: new Date(),
        });
      }

      const result = system.detectSalamiSlicing();

      expect(result.detected).toBe(true);
      expect(result.suspiciousAccount).toBe(hiddenAccount);
      expect(new Decimal(result.accumulatedAmount).greaterThan(5)).toBe(true);
    });

    it('should pass with normal small transaction patterns', () => {
      // Just a few small adjustments (normal)
      for (let i = 0; i < 3; i++) {
        system.addTransaction({
          id: `tx_normal_${i}`,
          date: new Date(),
          type: 'transfer',
          amount: '0.50',
          accountId: 'adjustments',
          description: 'Normal adjustment',
          createdBy: 'user1',
          createdAt: new Date(),
        });
      }

      const result = system.detectSalamiSlicing();

      expect(result.detected).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // TC-HIS-004: Revenue Recognition
  // --------------------------------------------------------------------------
  describe('TC-HIS-004: Revenue Recognition Validation', () => {
    it('should reject revenue recognized before earned period', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      system.addLease({
        id: 'lease_001',
        propertyId: 'prop_001',
        tenantId: 'tenant_001',
        startDate: futureDate,
        endDate: new Date(futureDate.getTime() + 365 * 24 * 60 * 60 * 1000),
        monthlyRent: '1500.00',
        status: 'active',
        moveInDate: futureDate,
      });

      // Recognizing next month's rent today (premature!)
      system.addRevenue({
        id: 'rev_001',
        leaseId: 'lease_001',
        type: 'rent',
        amount: '1500.00',
        periodStart: futureDate,
        periodEnd: new Date(futureDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        recognizedDate: new Date(), // TODAY - before period starts
        isEarned: false,
      });

      const result = system.validateRevenueRecognition();

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.issue.includes('before earned period'))).toBe(true);
    });

    it('should accept properly timed revenue recognition', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 15); // Started 15 days ago

      system.addLease({
        id: 'lease_002',
        propertyId: 'prop_002',
        tenantId: 'tenant_002',
        startDate,
        endDate: new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000),
        monthlyRent: '1500.00',
        status: 'active',
        moveInDate: startDate,
      });

      system.addRevenue({
        id: 'rev_002',
        leaseId: 'lease_002',
        type: 'rent',
        amount: '1500.00',
        periodStart: startDate,
        periodEnd: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        recognizedDate: new Date(), // Today - after period started
        isEarned: true,
      });

      const result = system.validateRevenueRecognition();

      expect(result.valid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TC-HIS-005: Fictitious Vendors
  // --------------------------------------------------------------------------
  describe('TC-HIS-005: Fictitious Vendor Detection', () => {
    it('should flag vendor created same day as large invoice', () => {
      const today = new Date();

      system.addVendor({
        id: 'vendor_fishy',
        name: 'Totally Real Contractor LLC',
        createdAt: today,
        createdBy: 'user_suspect',
        taxId: '12-3456789',
        totalPaymentsReceived: '0.00',
        relatedPartyFlag: false,
      });

      system.addInvoice({
        id: 'invoice_001',
        vendorId: 'vendor_fishy',
        amount: '15000.00', // Large invoice
        date: today, // Same day as vendor creation!
        description: 'Emergency repairs',
      });

      const result = system.detectFictitiousVendors();

      expect(result.detected).toBe(true);
      expect(result.suspiciousVendors.some((v) => v.vendor.id === 'vendor_fishy')).toBe(true);
      expect(result.suspiciousVendors[0].daysBetweenCreationAndInvoice).toBe(0);
    });

    it('should pass for established vendors', () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 6); // 6 months ago

      system.addVendor({
        id: 'vendor_legit',
        name: 'Established Contractor Inc',
        createdAt: oldDate,
        createdBy: 'admin',
        taxId: '98-7654321',
        totalPaymentsReceived: '50000.00',
        relatedPartyFlag: false,
      });

      system.addInvoice({
        id: 'invoice_002',
        vendorId: 'vendor_legit',
        amount: '15000.00',
        date: new Date(),
        description: 'Regular maintenance',
      });

      const result = system.detectFictitiousVendors();

      expect(result.detected).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // TC-HIS-006: Round-Trip Transactions
  // --------------------------------------------------------------------------
  describe('TC-HIS-006: Round-Trip Transaction Detection', () => {
    it('should detect same-day matching in/out transactions', () => {
      const today = new Date();

      system.addTransaction({
        id: 'tx_in',
        date: today,
        type: 'income',
        amount: '50000.00',
        accountId: 'operating',
        counterpartyId: 'company_x',
        description: 'Investment income',
        createdBy: 'user1',
        createdAt: today,
      });

      system.addTransaction({
        id: 'tx_out',
        date: today, // Same day
        type: 'expense',
        amount: '50000.00', // Same amount
        accountId: 'operating',
        counterpartyId: 'company_y',
        description: 'Consulting fee',
        createdBy: 'user1',
        createdAt: today,
      });

      const result = system.detectRoundTripTransactions();

      expect(result.detected).toBe(true);
      expect(result.suspicious).toHaveLength(1);
      expect(result.suspicious[0].amount).toBe('50000.00');
    });

    it('should pass for normal daily operations', () => {
      const today = new Date();

      system.addTransaction({
        id: 'tx_rent',
        date: today,
        type: 'income',
        amount: '1500.00',
        accountId: 'operating',
        description: 'Rent payment',
        createdBy: 'system',
        createdAt: today,
      });

      system.addTransaction({
        id: 'tx_utility',
        date: today,
        type: 'expense',
        amount: '200.00', // Different amount
        accountId: 'operating',
        description: 'Electric bill',
        createdBy: 'user1',
        createdAt: today,
      });

      const result = system.detectRoundTripTransactions();

      expect(result.detected).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // TC-HIS-007: Cookie Jar Reserves
  // --------------------------------------------------------------------------
  describe('TC-HIS-007: Cookie Jar Reserve Manipulation', () => {
    it('should flag large unapproved reserve adjustment', () => {
      system.addReserve({
        id: 'reserve_bad_debt',
        name: 'Bad Debt Reserve',
        type: 'bad_debt',
        balance: '50000.00',
        lastAdjustment: new Date(),
        adjustmentHistory: [
          {
            date: new Date(),
            amount: '25000.00', // Large adjustment
            reason: 'Other', // Vague reason
            approvedBy: '', // No approval!
          },
        ],
      });

      const result = system.validateReserveAdjustments();

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.issue.includes('without approval'))).toBe(true);
      expect(result.violations.some((v) => v.issue.includes('vague reason'))).toBe(true);
    });

    it('should pass for properly documented reserve adjustments', () => {
      system.addReserve({
        id: 'reserve_maint',
        name: 'Maintenance Reserve',
        type: 'maintenance',
        balance: '10000.00',
        lastAdjustment: new Date(),
        adjustmentHistory: [
          {
            date: new Date(),
            amount: '5000.00',
            reason: 'Quarterly increase based on maintenance plan budget review',
            approvedBy: 'cfo_001',
          },
        ],
      });

      const result = system.validateReserveAdjustments();

      expect(result.valid).toBe(true);
    });

    it('should flag negative reserve balance', () => {
      system.addReserve({
        id: 'reserve_negative',
        name: 'Vacancy Reserve',
        type: 'vacancy',
        balance: '-5000.00', // Negative!
        lastAdjustment: new Date(),
        adjustmentHistory: [],
      });

      const result = system.validateReserveAdjustments();

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.issue.includes('negative'))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TC-HIS-008: Channel Stuffing - Future-Dated Revenue
  // --------------------------------------------------------------------------
  describe('TC-HIS-008: Channel Stuffing Detection', () => {
    it('should detect future-dated charges in current AR', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);

      system.addRevenue({
        id: 'rev_future',
        leaseId: 'lease_001',
        type: 'rent',
        amount: '1500.00',
        periodStart: futureDate, // Future period
        periodEnd: new Date(futureDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        recognizedDate: new Date(),
        isEarned: false, // Not earned yet but booked
      });

      const result = system.detectChannelStuffing();

      expect(result.detected).toBe(true);
      expect(result.futureCharges).toHaveLength(1);
    });

    it('should pass for current period charges', () => {
      const currentPeriod = new Date();
      currentPeriod.setDate(1); // First of current month

      system.addRevenue({
        id: 'rev_current',
        leaseId: 'lease_001',
        type: 'rent',
        amount: '1500.00',
        periodStart: currentPeriod,
        periodEnd: new Date(currentPeriod.getTime() + 30 * 24 * 60 * 60 * 1000),
        recognizedDate: new Date(),
        isEarned: true,
      });

      const result = system.detectChannelStuffing();

      expect(result.detected).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // TC-HIS-009: Bill and Hold - Occupancy Requirement
  // --------------------------------------------------------------------------
  describe('TC-HIS-009: Occupancy Validation for Revenue', () => {
    it('should reject rent revenue without tenant move-in', () => {
      system.addLease({
        id: 'lease_pending',
        propertyId: 'prop_001',
        tenantId: 'tenant_001',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        monthlyRent: '1500.00',
        status: 'active',
        // moveInDate: undefined - Tenant hasn't moved in!
      });

      system.addRevenue({
        id: 'rev_no_movein',
        leaseId: 'lease_pending',
        type: 'rent',
        amount: '1500.00',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        recognizedDate: new Date(),
        isEarned: true,
      });

      const result = system.validateOccupancyForRevenue();

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.issue.includes('move-in'))).toBe(true);
    });

    it('should reject rent on terminated lease', () => {
      system.addLease({
        id: 'lease_terminated',
        propertyId: 'prop_001',
        tenantId: 'tenant_001',
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        monthlyRent: '1500.00',
        status: 'terminated',
        moveInDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      });

      system.addRevenue({
        id: 'rev_terminated',
        leaseId: 'lease_terminated',
        type: 'rent',
        amount: '1500.00',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        recognizedDate: new Date(),
        isEarned: true,
      });

      const result = system.validateOccupancyForRevenue();

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.issue.includes('terminated'))).toBe(true);
    });

    it('should pass for active lease with move-in', () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      system.addLease({
        id: 'lease_active',
        propertyId: 'prop_001',
        tenantId: 'tenant_001',
        startDate,
        endDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000),
        monthlyRent: '1500.00',
        status: 'active',
        moveInDate: startDate,
      });

      system.addRevenue({
        id: 'rev_valid',
        leaseId: 'lease_active',
        type: 'rent',
        amount: '1500.00',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        recognizedDate: new Date(),
        isEarned: true,
      });

      const result = system.validateOccupancyForRevenue();

      expect(result.valid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TC-HIS-010: Related Party Transactions
  // --------------------------------------------------------------------------
  describe('TC-HIS-010: Related Party Transaction Detection', () => {
    it('should flag owner-related vendor transactions', () => {
      system.addVendor({
        id: 'vendor_related',
        name: "Owner's Brother Contracting",
        createdAt: new Date(),
        createdBy: 'admin',
        totalPaymentsReceived: '75000.00',
        relatedPartyFlag: true,
        relatedToOwnerId: 'owner_001',
      });

      const result = system.detectRelatedPartyTransactions();

      expect(result.detected).toBe(true);
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].relationship).toContain('owner_001');
    });

    it('should pass for unrelated vendors', () => {
      system.addVendor({
        id: 'vendor_independent',
        name: 'ABC Plumbing Co',
        createdAt: new Date(),
        createdBy: 'admin',
        totalPaymentsReceived: '25000.00',
        relatedPartyFlag: false,
      });

      const result = system.detectRelatedPartyTransactions();

      expect(result.detected).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // BONUS: Combined Fraud Detection
  // --------------------------------------------------------------------------
  describe('BONUS: Combined Fraud Scenarios', () => {
    it('should detect multiple fraud patterns simultaneously', () => {
      const today = new Date();

      // Add fictitious vendor (TC-HIS-005)
      system.addVendor({
        id: 'vendor_fake',
        name: 'Fake Services LLC',
        createdAt: today,
        createdBy: 'insider',
        totalPaymentsReceived: '0.00',
        relatedPartyFlag: true, // Also related party (TC-HIS-010)
        relatedToOwnerId: 'owner_001',
      });

      system.addInvoice({
        id: 'inv_fake',
        vendorId: 'vendor_fake',
        amount: '20000.00',
        date: today,
        description: 'Consulting',
      });

      // Add salami slicing (TC-HIS-003)
      for (let i = 0; i < 20; i++) {
        system.addTransaction({
          id: `slice_${i}`,
          date: today,
          type: 'transfer',
          amount: '0.99',
          accountId: 'hidden_fund',
          description: 'Rounding',
          createdBy: 'system',
          createdAt: today,
        });
      }

      // Run all checks
      const fictitiousResult = system.detectFictitiousVendors();
      const relatedResult = system.detectRelatedPartyTransactions();
      const salamiResult = system.detectSalamiSlicing();

      // All should detect issues
      expect(fictitiousResult.detected).toBe(true);
      expect(relatedResult.detected).toBe(true);
      expect(salamiResult.detected).toBe(true);
    });
  });
});
