/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 18: Multi-Entity Complexity
 *
 * Goal: Handle multi-owner properties, management company splits, consolidated reporting
 * Critical for: Accurate owner statements, proper fee calculations, 1099 generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Entity types
interface Owner {
  id: string;
  name: string;
  taxId: string;
  entityType: 'individual' | 'llc' | 'corporation' | 'partnership' | 'trust';
  ownershipPercentage: number;
  paymentMethod: 'ach' | 'check' | 'hold';
}

interface Property {
  id: string;
  address: string;
  owners: Owner[];
  managementFeePercent: number;
  managementFeeType: 'collected' | 'gross' | 'net';
  reserveAmount: number;
}

interface ManagementCompany {
  id: string;
  name: string;
  taxId: string;
  feeStructure: 'percentage' | 'flat' | 'tiered';
  minimumFee: number;
}

interface OwnerStatement {
  ownerId: string;
  propertyId: string;
  periodStart: Date;
  periodEnd: Date;
  grossIncome: number;
  expenses: Array<{ description: string; amount: number }>;
  managementFee: number;
  ownerShare: number;
  reserve: number;
  distribution: number;
}

// Management Fee Calculator
class ManagementFeeCalculator {
  calculate(
    grossRent: number,
    collectedRent: number,
    expenses: number,
    feePercent: number,
    feeType: 'collected' | 'gross' | 'net',
    minimumFee: number
  ): { fee: number; basis: number; basisType: string } {
    let basis: number;
    let basisType: string;

    switch (feeType) {
      case 'collected':
        basis = collectedRent;
        basisType = 'Rent Collected';
        break;
      case 'gross':
        basis = grossRent;
        basisType = 'Gross Rent';
        break;
      case 'net':
        basis = collectedRent - expenses;
        basisType = 'Net Operating Income';
        break;
      default:
        basis = collectedRent;
        basisType = 'Rent Collected';
    }

    const calculatedFee = basis * (feePercent / 100);
    const fee = Math.max(calculatedFee, minimumFee);

    return {
      fee: Math.round(fee * 100) / 100,
      basis: Math.round(basis * 100) / 100,
      basisType,
    };
  }

  calculateTieredFee(
    portfolio: Array<{ propertyId: string; rent: number }>,
    tiers: Array<{ upTo: number; percent: number }>
  ): { totalFee: number; breakdown: Array<{ tier: string; amount: number; fee: number }> } {
    const totalRent = portfolio.reduce((sum, p) => sum + p.rent, 0);
    let remainingRent = totalRent;
    let totalFee = 0;
    const breakdown: Array<{ tier: string; amount: number; fee: number }> = [];

    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const previousLimit = i > 0 ? tiers[i - 1].upTo : 0;
      const tierLimit = tier.upTo - previousLimit;

      const tierAmount = Math.min(remainingRent, tierLimit);
      const tierFee = tierAmount * (tier.percent / 100);

      if (tierAmount > 0) {
        breakdown.push({
          tier: `$${previousLimit} - $${tier.upTo}`,
          amount: tierAmount,
          fee: Math.round(tierFee * 100) / 100,
        });
        totalFee += tierFee;
        remainingRent -= tierAmount;
      }

      if (remainingRent <= 0) break;
    }

    return {
      totalFee: Math.round(totalFee * 100) / 100,
      breakdown,
    };
  }
}

// Multi-Owner Distribution Calculator
class MultiOwnerDistributionCalculator {
  calculateDistributions(
    netOperatingIncome: number,
    owners: Owner[],
    reserveContribution: number
  ): Array<{ ownerId: string; share: number; distribution: number; method: string }> {
    const distributable = netOperatingIncome - reserveContribution;
    const distributions: Array<{ ownerId: string; share: number; distribution: number; method: string }> = [];

    for (const owner of owners) {
      const ownerShare = distributable * (owner.ownershipPercentage / 100);

      distributions.push({
        ownerId: owner.id,
        share: Math.round(ownerShare * 100) / 100,
        distribution: owner.paymentMethod === 'hold' ? 0 : Math.round(ownerShare * 100) / 100,
        method: owner.paymentMethod,
      });
    }

    return distributions;
  }

  validateOwnershipTotal(owners: Owner[]): { valid: boolean; totalPercentage: number } {
    const total = owners.reduce((sum, o) => sum + o.ownershipPercentage, 0);
    return {
      valid: Math.abs(total - 100) < 0.01,
      totalPercentage: total,
    };
  }
}

// Consolidated Statement Generator
class ConsolidatedStatementGenerator {
  generatePortfolioStatement(
    properties: Array<{
      property: Property;
      income: number;
      expenses: number;
      managementFee: number;
    }>,
    ownerId: string
  ): {
    totalIncome: number;
    totalExpenses: number;
    totalManagementFees: number;
    ownerNetIncome: number;
    propertyBreakdown: Array<{
      propertyId: string;
      ownerShare: number;
      income: number;
      expenses: number;
      fee: number;
      net: number;
    }>;
  } {
    const breakdown: Array<{
      propertyId: string;
      ownerShare: number;
      income: number;
      expenses: number;
      fee: number;
      net: number;
    }> = [];

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalFees = 0;
    let ownerNet = 0;

    for (const p of properties) {
      const ownerData = p.property.owners.find(o => o.id === ownerId);
      if (!ownerData) continue;

      const ownerShare = ownerData.ownershipPercentage / 100;
      const ownerIncome = p.income * ownerShare;
      const ownerExpenses = p.expenses * ownerShare;
      const ownerFee = p.managementFee * ownerShare;
      const net = ownerIncome - ownerExpenses - ownerFee;

      breakdown.push({
        propertyId: p.property.id,
        ownerShare: ownerData.ownershipPercentage,
        income: Math.round(ownerIncome * 100) / 100,
        expenses: Math.round(ownerExpenses * 100) / 100,
        fee: Math.round(ownerFee * 100) / 100,
        net: Math.round(net * 100) / 100,
      });

      totalIncome += ownerIncome;
      totalExpenses += ownerExpenses;
      totalFees += ownerFee;
      ownerNet += net;
    }

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalManagementFees: Math.round(totalFees * 100) / 100,
      ownerNetIncome: Math.round(ownerNet * 100) / 100,
      propertyBreakdown: breakdown,
    };
  }
}

// 1099 Generator for Multi-Entity
class MultiEntity1099Generator {
  generate1099s(
    owners: Owner[],
    yearlyPayments: Map<string, number>
  ): Array<{
    ownerId: string;
    name: string;
    taxId: string;
    amount: number;
    form1099Required: boolean;
    reason?: string;
  }> {
    const results: Array<{
      ownerId: string;
      name: string;
      taxId: string;
      amount: number;
      form1099Required: boolean;
      reason?: string;
    }> = [];

    for (const owner of owners) {
      const amount = yearlyPayments.get(owner.id) || 0;

      // Corporations (except legal/medical) don't get 1099
      // LLCs taxed as S-Corp also exempt
      const isExemptEntity = owner.entityType === 'corporation';

      // Under $600 threshold
      const underThreshold = amount < 600;

      let form1099Required = true;
      let reason: string | undefined;

      if (isExemptEntity) {
        form1099Required = false;
        reason = 'Corporation - exempt from 1099-MISC';
      } else if (underThreshold) {
        form1099Required = false;
        reason = 'Under $600 threshold';
      }

      results.push({
        ownerId: owner.id,
        name: owner.name,
        taxId: owner.taxId,
        amount: Math.round(amount * 100) / 100,
        form1099Required,
        reason,
      });
    }

    return results;
  }

  splitAmongCoOwners(
    totalPayment: number,
    owners: Owner[]
  ): Array<{ ownerId: string; amount: number; form1099Amount: number }> {
    return owners.map(owner => {
      const amount = totalPayment * (owner.ownershipPercentage / 100);
      return {
        ownerId: owner.id,
        amount: Math.round(amount * 100) / 100,
        form1099Amount: Math.round(amount * 100) / 100, // Each owner gets 1099 for their share
      };
    });
  }
}

// Intercompany Transaction Handler
class IntercompanyHandler {
  recordIntercompanyTransfer(
    fromPropertyId: string,
    toPropertyId: string,
    amount: number,
    reason: string
  ): {
    journalEntries: Array<{
      propertyId: string;
      account: string;
      debit: number;
      credit: number;
    }>;
    eliminationEntry?: Array<{
      account: string;
      debit: number;
      credit: number;
    }>;
  } {
    const entries = [
      // From property: decrease cash, record due from
      { propertyId: fromPropertyId, account: 'cash', debit: 0, credit: amount },
      { propertyId: fromPropertyId, account: 'due_from_related_property', debit: amount, credit: 0 },
      // To property: increase cash, record due to
      { propertyId: toPropertyId, account: 'cash', debit: amount, credit: 0 },
      { propertyId: toPropertyId, account: 'due_to_related_property', debit: 0, credit: amount },
    ];

    // Elimination entry for consolidated reporting
    const eliminationEntry = [
      { account: 'due_to_related_property', debit: amount, credit: 0 },
      { account: 'due_from_related_property', debit: 0, credit: amount },
    ];

    return { journalEntries: entries, eliminationEntry };
  }
}

describe('TC-MUL: Multi-Entity Complexity Tests', () => {
  describe('TC-MUL-251: Management Fee - Collected Rent Basis', () => {
    it('should calculate fee on collected rent only', () => {
      const calculator = new ManagementFeeCalculator();

      const result = calculator.calculate(
        10000,  // Gross rent due
        8000,   // Actually collected
        2000,   // Expenses
        10,     // 10% fee
        'collected',
        100     // Minimum
      );

      expect(result.fee).toBe(800); // 10% of $8000
      expect(result.basisType).toBe('Rent Collected');
    });
  });

  describe('TC-MUL-252: Management Fee - Gross Rent Basis', () => {
    it('should calculate fee on gross rent regardless of collection', () => {
      const calculator = new ManagementFeeCalculator();

      const result = calculator.calculate(
        10000,
        8000,
        2000,
        10,
        'gross',
        100
      );

      expect(result.fee).toBe(1000); // 10% of $10000
    });
  });

  describe('TC-MUL-253: Management Fee - Net Operating Income', () => {
    it('should calculate fee on NOI (collected minus expenses)', () => {
      const calculator = new ManagementFeeCalculator();

      const result = calculator.calculate(
        10000,
        8000,
        2000,
        10,
        'net',
        100
      );

      expect(result.fee).toBe(600); // 10% of ($8000 - $2000)
    });
  });

  describe('TC-MUL-254: Management Fee - Minimum Applied', () => {
    it('should apply minimum fee when calculated is lower', () => {
      const calculator = new ManagementFeeCalculator();

      const result = calculator.calculate(
        500,    // Low rent
        500,
        0,
        10,
        'collected',
        100     // Minimum $100
      );

      expect(result.fee).toBe(100); // Minimum applied
    });
  });

  describe('TC-MUL-255: Tiered Management Fee', () => {
    it('should calculate fee with volume-based tiers', () => {
      const calculator = new ManagementFeeCalculator();

      const tiers = [
        { upTo: 10000, percent: 10 },
        { upTo: 25000, percent: 8 },
        { upTo: Infinity, percent: 6 },
      ];

      const portfolio = [
        { propertyId: 'p-1', rent: 5000 },
        { propertyId: 'p-2', rent: 8000 },
        { propertyId: 'p-3', rent: 12000 },
      ];

      const result = calculator.calculateTieredFee(portfolio, tiers);

      // First $10k at 10% = $1000
      // Next $15k at 8% = $1200
      // Total = $2200
      expect(result.totalFee).toBe(2200);
      expect(result.breakdown.length).toBe(2);
    });
  });

  describe('TC-MUL-256: Multi-Owner Distribution Split', () => {
    it('should split NOI according to ownership percentages', () => {
      const calculator = new MultiOwnerDistributionCalculator();

      const owners: Owner[] = [
        { id: 'o-1', name: 'Owner A', taxId: '111-11-1111', entityType: 'individual', ownershipPercentage: 60, paymentMethod: 'ach' },
        { id: 'o-2', name: 'Owner B', taxId: '222-22-2222', entityType: 'llc', ownershipPercentage: 40, paymentMethod: 'ach' },
      ];

      const result = calculator.calculateDistributions(10000, owners, 500);

      // Distributable = $10000 - $500 = $9500
      expect(result[0].share).toBe(5700); // 60% of $9500
      expect(result[1].share).toBe(3800); // 40% of $9500
    });
  });

  describe('TC-MUL-257: Multi-Owner - Hold Payment', () => {
    it('should hold distribution for owner with hold payment method', () => {
      const calculator = new MultiOwnerDistributionCalculator();

      const owners: Owner[] = [
        { id: 'o-1', name: 'Owner A', taxId: '111-11-1111', entityType: 'individual', ownershipPercentage: 50, paymentMethod: 'ach' },
        { id: 'o-2', name: 'Owner B', taxId: '222-22-2222', entityType: 'individual', ownershipPercentage: 50, paymentMethod: 'hold' },
      ];

      const result = calculator.calculateDistributions(10000, owners, 0);

      expect(result[0].distribution).toBe(5000);
      expect(result[1].distribution).toBe(0); // Held
      expect(result[1].share).toBe(5000); // Still calculated
    });
  });

  describe('TC-MUL-258: Ownership Percentage Validation', () => {
    it('should validate ownership totals 100%', () => {
      const calculator = new MultiOwnerDistributionCalculator();

      const validOwners: Owner[] = [
        { id: 'o-1', name: 'A', taxId: '1', entityType: 'individual', ownershipPercentage: 50, paymentMethod: 'ach' },
        { id: 'o-2', name: 'B', taxId: '2', entityType: 'individual', ownershipPercentage: 50, paymentMethod: 'ach' },
      ];

      const invalidOwners: Owner[] = [
        { id: 'o-1', name: 'A', taxId: '1', entityType: 'individual', ownershipPercentage: 60, paymentMethod: 'ach' },
        { id: 'o-2', name: 'B', taxId: '2', entityType: 'individual', ownershipPercentage: 50, paymentMethod: 'ach' },
      ];

      expect(calculator.validateOwnershipTotal(validOwners).valid).toBe(true);
      expect(calculator.validateOwnershipTotal(invalidOwners).valid).toBe(false);
      expect(calculator.validateOwnershipTotal(invalidOwners).totalPercentage).toBe(110);
    });
  });

  describe('TC-MUL-259: Consolidated Portfolio Statement', () => {
    it('should generate consolidated statement across properties', () => {
      const generator = new ConsolidatedStatementGenerator();

      const properties = [
        {
          property: {
            id: 'p-1',
            address: '123 Main',
            owners: [{ id: 'o-1', name: 'Owner', taxId: '111', entityType: 'individual' as const, ownershipPercentage: 100, paymentMethod: 'ach' as const }],
            managementFeePercent: 10,
            managementFeeType: 'collected' as const,
            reserveAmount: 500,
          },
          income: 5000,
          expenses: 1000,
          managementFee: 500,
        },
        {
          property: {
            id: 'p-2',
            address: '456 Oak',
            owners: [{ id: 'o-1', name: 'Owner', taxId: '111', entityType: 'individual' as const, ownershipPercentage: 50, paymentMethod: 'ach' as const }],
            managementFeePercent: 10,
            managementFeeType: 'collected' as const,
            reserveAmount: 300,
          },
          income: 4000,
          expenses: 800,
          managementFee: 400,
        },
      ];

      const result = generator.generatePortfolioStatement(properties, 'o-1');

      // Property 1: 100% of ($5000 - $1000 - $500) = $3500
      // Property 2: 50% of ($4000 - $800 - $400) = $1400
      expect(result.ownerNetIncome).toBe(4900);
      expect(result.propertyBreakdown.length).toBe(2);
    });
  });

  describe('TC-MUL-260: 1099 Generation - Corporation Exempt', () => {
    it('should not generate 1099 for corporations', () => {
      const generator = new MultiEntity1099Generator();

      const owners: Owner[] = [
        { id: 'o-1', name: 'ABC Corp', taxId: '12-3456789', entityType: 'corporation', ownershipPercentage: 100, paymentMethod: 'ach' },
      ];

      const payments = new Map([['o-1', 50000]]);

      const result = generator.generate1099s(owners, payments);

      expect(result[0].form1099Required).toBe(false);
      expect(result[0].reason).toContain('Corporation');
    });
  });

  describe('TC-MUL-261: 1099 Generation - Under Threshold', () => {
    it('should not require 1099 for payments under $600', () => {
      const generator = new MultiEntity1099Generator();

      const owners: Owner[] = [
        { id: 'o-1', name: 'Small Owner', taxId: '111-11-1111', entityType: 'individual', ownershipPercentage: 100, paymentMethod: 'ach' },
      ];

      const payments = new Map([['o-1', 500]]);

      const result = generator.generate1099s(owners, payments);

      expect(result[0].form1099Required).toBe(false);
      expect(result[0].reason).toContain('Under $600');
    });
  });

  describe('TC-MUL-262: 1099 Split Among Co-Owners', () => {
    it('should split 1099 amounts by ownership percentage', () => {
      const generator = new MultiEntity1099Generator();

      const owners: Owner[] = [
        { id: 'o-1', name: 'Owner A', taxId: '111', entityType: 'individual', ownershipPercentage: 60, paymentMethod: 'ach' },
        { id: 'o-2', name: 'Owner B', taxId: '222', entityType: 'individual', ownershipPercentage: 40, paymentMethod: 'ach' },
      ];

      const result = generator.splitAmongCoOwners(10000, owners);

      expect(result[0].form1099Amount).toBe(6000);
      expect(result[1].form1099Amount).toBe(4000);
    });
  });

  describe('TC-MUL-263: Intercompany Transfer Recording', () => {
    it('should record proper journal entries for property-to-property transfer', () => {
      const handler = new IntercompanyHandler();

      const result = handler.recordIntercompanyTransfer(
        'prop-a',
        'prop-b',
        5000,
        'Cover shortfall'
      );

      expect(result.journalEntries.length).toBe(4);

      // Verify from property entries
      const fromCash = result.journalEntries.find(e =>
        e.propertyId === 'prop-a' && e.account === 'cash'
      );
      expect(fromCash?.credit).toBe(5000);

      // Verify to property entries
      const toCash = result.journalEntries.find(e =>
        e.propertyId === 'prop-b' && e.account === 'cash'
      );
      expect(toCash?.debit).toBe(5000);

      // Verify elimination entries exist
      expect(result.eliminationEntry?.length).toBe(2);
    });
  });

  describe('TC-MUL-264: Management Company Expense Allocation', () => {
    it('should allocate shared expenses across properties', () => {
      interface SharedExpense {
        description: string;
        amount: number;
        allocationMethod: 'equal' | 'by_units' | 'by_sqft' | 'by_revenue';
      }

      const allocateSharedExpense = (
        expense: SharedExpense,
        properties: Array<{ id: string; units: number; sqft: number; revenue: number }>
      ): Array<{ propertyId: string; allocation: number }> => {
        const totals = properties.reduce(
          (acc, p) => ({
            units: acc.units + p.units,
            sqft: acc.sqft + p.sqft,
            revenue: acc.revenue + p.revenue,
          }),
          { units: 0, sqft: 0, revenue: 0 }
        );

        return properties.map(p => {
          let ratio: number;
          switch (expense.allocationMethod) {
            case 'equal':
              ratio = 1 / properties.length;
              break;
            case 'by_units':
              ratio = p.units / totals.units;
              break;
            case 'by_sqft':
              ratio = p.sqft / totals.sqft;
              break;
            case 'by_revenue':
              ratio = p.revenue / totals.revenue;
              break;
            default:
              ratio = 1 / properties.length;
          }

          return {
            propertyId: p.id,
            allocation: Math.round(expense.amount * ratio * 100) / 100,
          };
        });
      };

      const expense: SharedExpense = {
        description: 'Corporate office rent',
        amount: 3000,
        allocationMethod: 'by_revenue',
      };

      const properties = [
        { id: 'p-1', units: 10, sqft: 10000, revenue: 10000 },
        { id: 'p-2', units: 20, sqft: 20000, revenue: 20000 },
      ];

      const result = allocateSharedExpense(expense, properties);

      expect(result[0].allocation).toBe(1000); // 10000/30000 * 3000
      expect(result[1].allocation).toBe(2000); // 20000/30000 * 3000
    });
  });

  describe('TC-MUL-265: Owner Reserve Account Tracking', () => {
    it('should track separate reserve balances per owner', () => {
      interface OwnerReserve {
        ownerId: string;
        propertyId: string;
        balance: number;
        contributions: Array<{ date: Date; amount: number }>;
        withdrawals: Array<{ date: Date; amount: number; purpose: string }>;
      }

      const processReserveTransaction = (
        reserve: OwnerReserve,
        transactionType: 'contribution' | 'withdrawal',
        amount: number,
        purpose?: string
      ): OwnerReserve => {
        if (transactionType === 'contribution') {
          return {
            ...reserve,
            balance: reserve.balance + amount,
            contributions: [...reserve.contributions, { date: new Date(), amount }],
          };
        }

        if (amount > reserve.balance) {
          throw new Error('Insufficient reserve balance');
        }

        return {
          ...reserve,
          balance: reserve.balance - amount,
          withdrawals: [...reserve.withdrawals, { date: new Date(), amount, purpose: purpose || '' }],
        };
      };

      let reserve: OwnerReserve = {
        ownerId: 'o-1',
        propertyId: 'p-1',
        balance: 1000,
        contributions: [],
        withdrawals: [],
      };

      reserve = processReserveTransaction(reserve, 'contribution', 500);
      expect(reserve.balance).toBe(1500);

      reserve = processReserveTransaction(reserve, 'withdrawal', 300, 'Emergency repair');
      expect(reserve.balance).toBe(1200);
      expect(reserve.withdrawals.length).toBe(1);
    });
  });

  describe('TC-MUL-266: Multi-Property Vendor Payment', () => {
    it('should split vendor invoice across multiple properties', () => {
      interface VendorInvoice {
        vendorId: string;
        totalAmount: number;
        propertyAllocations: Array<{ propertyId: string; percentage: number }>;
      }

      const processMultiPropertyInvoice = (invoice: VendorInvoice): Array<{
        propertyId: string;
        amount: number;
        journalEntry: { account: string; debit: number; credit: number }[];
      }> => {
        return invoice.propertyAllocations.map(alloc => ({
          propertyId: alloc.propertyId,
          amount: Math.round(invoice.totalAmount * (alloc.percentage / 100) * 100) / 100,
          journalEntry: [
            { account: 'expense', debit: Math.round(invoice.totalAmount * (alloc.percentage / 100) * 100) / 100, credit: 0 },
            { account: 'accounts_payable', debit: 0, credit: Math.round(invoice.totalAmount * (alloc.percentage / 100) * 100) / 100 },
          ],
        }));
      };

      const invoice: VendorInvoice = {
        vendorId: 'vendor-1',
        totalAmount: 1000,
        propertyAllocations: [
          { propertyId: 'p-1', percentage: 60 },
          { propertyId: 'p-2', percentage: 40 },
        ],
      };

      const result = processMultiPropertyInvoice(invoice);

      expect(result[0].amount).toBe(600);
      expect(result[1].amount).toBe(400);
      expect(result[0].journalEntry[0].debit).toBe(600);
    });
  });
});
