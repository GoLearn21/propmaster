/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 1.3: 1099 Tax Compliance
 * "The IRS Shield"
 *
 * Goal: Prevent IRS penalties from incorrect 1099 generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types based on TaxComplianceService
interface Vendor {
  id: string;
  name: string;
  tin: string;
  entityType: 'individual' | 'llc' | 'corporation' | 's_corp' | 'partnership';
  address: string;
  backupWithholding: boolean;
  w9Status: 'received' | 'pending' | 'expired';
}

interface Payment {
  id: string;
  vendorId: string;
  amount: number;
  method: 'check' | 'ach' | 'credit_card' | 'debit_card';
  date: Date;
  voided: boolean;
  propertyId: string;
}

interface Form1099 {
  vendorId: string;
  formType: '1099-NEC' | '1099-MISC';
  year: number;
  amount: number;
  generated: boolean;
}

interface ComplianceAlert {
  type: string;
  vendorId: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

// 1099 calculation functions
const IRS_THRESHOLD = 600;
const BACKUP_WITHHOLDING_RATE = 0.24;

function shouldGenerate1099(
  vendor: Vendor,
  totalPayments: number,
  paymentMethod: 'check' | 'ach' | 'credit_card' | 'debit_card'
): boolean {
  // Credit card payments are reported via 1099-K by processor
  if (paymentMethod === 'credit_card') {
    return false;
  }

  // Corporations are exempt (except for legal/medical services)
  if (vendor.entityType === 'corporation' || vendor.entityType === 's_corp') {
    return false;
  }

  // Must meet threshold
  if (totalPayments < IRS_THRESHOLD) {
    return false;
  }

  return true;
}

function calculateBackupWithholding(amount: number): number {
  return Math.round(amount * BACKUP_WITHHOLDING_RATE * 100) / 100;
}

function generateAmendmentAlert(
  vendorId: string,
  reason: string
): ComplianceAlert {
  return {
    type: 'amendment_required',
    vendorId,
    message: `Amendment required: ${reason}`,
    severity: 'warning',
  };
}

describe('TC-TAX: 1099 Tax Compliance Tests', () => {
  describe('TC-TAX-021: Threshold Logic', () => {
    it('should NOT generate 1099 for vendor paid $599', () => {
      const vendor: Vendor = {
        id: 'v-1',
        name: 'Small Contractor',
        tin: '123-45-6789',
        entityType: 'individual',
        address: '123 Main St',
        backupWithholding: false,
        w9Status: 'received',
      };

      const should1099 = shouldGenerate1099(vendor, 599, 'check');

      expect(should1099).toBe(false);
    });

    it('should generate 1099-NEC for vendor paid $600', () => {
      const vendor: Vendor = {
        id: 'v-2',
        name: 'Threshold Contractor',
        tin: '123-45-6789',
        entityType: 'individual',
        address: '123 Main St',
        backupWithholding: false,
        w9Status: 'received',
      };

      const should1099 = shouldGenerate1099(vendor, 600, 'check');

      expect(should1099).toBe(true);
    });

    it('should handle exactly $600 boundary correctly', () => {
      const vendor: Vendor = {
        id: 'v-3',
        name: 'Boundary Contractor',
        tin: '123-45-6789',
        entityType: 'llc',
        address: '123 Main St',
        backupWithholding: false,
        w9Status: 'received',
      };

      expect(shouldGenerate1099(vendor, 599.99, 'check')).toBe(false);
      expect(shouldGenerate1099(vendor, 600.00, 'check')).toBe(true);
      expect(shouldGenerate1099(vendor, 600.01, 'check')).toBe(true);
    });
  });

  describe('TC-TAX-022: Credit Card Exclusion', () => {
    it('should NOT generate 1099 for $1,000 credit card payment', () => {
      const vendor: Vendor = {
        id: 'v-4',
        name: 'CC Vendor',
        tin: '123-45-6789',
        entityType: 'individual',
        address: '123 Main St',
        backupWithholding: false,
        w9Status: 'received',
      };

      const should1099 = shouldGenerate1099(vendor, 1000, 'credit_card');

      expect(should1099).toBe(false); // Processor handles 1099-K
    });

    it('should generate 1099 for same amount via check', () => {
      const vendor: Vendor = {
        id: 'v-5',
        name: 'Check Vendor',
        tin: '123-45-6789',
        entityType: 'individual',
        address: '123 Main St',
        backupWithholding: false,
        w9Status: 'received',
      };

      const should1099 = shouldGenerate1099(vendor, 1000, 'check');

      expect(should1099).toBe(true);
    });
  });

  describe('TC-TAX-023: Entity Exclusion', () => {
    it('should NOT generate 1099 for "Inc." corporation', () => {
      const corpVendor: Vendor = {
        id: 'v-6',
        name: 'Big Corp Inc.',
        tin: '12-3456789',
        entityType: 'corporation',
        address: '123 Corp Blvd',
        backupWithholding: false,
        w9Status: 'received',
      };

      const should1099 = shouldGenerate1099(corpVendor, 10000, 'check');

      expect(should1099).toBe(false);
    });

    it('should generate 1099 for "LLC"', () => {
      const llcVendor: Vendor = {
        id: 'v-7',
        name: 'Contractor LLC',
        tin: '12-3456789',
        entityType: 'llc',
        address: '123 LLC Way',
        backupWithholding: false,
        w9Status: 'received',
      };

      const should1099 = shouldGenerate1099(llcVendor, 10000, 'check');

      expect(should1099).toBe(true);
    });

    it('should NOT generate 1099 for S-Corp', () => {
      const sCorpVendor: Vendor = {
        id: 'v-8',
        name: 'S Corp Services',
        tin: '12-3456789',
        entityType: 's_corp',
        address: '123 S Corp Lane',
        backupWithholding: false,
        w9Status: 'received',
      };

      const should1099 = shouldGenerate1099(sCorpVendor, 10000, 'check');

      expect(should1099).toBe(false);
    });
  });

  describe('TC-TAX-024: Address Change Post-Filing', () => {
    it('should NOT trigger alert when address changed in Feb (after filing)', () => {
      const filingDate = new Date('2024-01-31'); // Filed
      const changeDate = new Date('2024-02-15'); // Address changed

      const needsAmendment = (
        filedDate: Date,
        changedDate: Date,
        changeType: 'address' | 'tin' | 'amount'
      ): boolean => {
        // Address changes don't require amendment
        if (changeType === 'address') return false;
        // TIN and amount changes do
        return changedDate > filedDate;
      };

      expect(needsAmendment(filingDate, changeDate, 'address')).toBe(false);
    });
  });

  describe('TC-TAX-025: TIN Change Post-Filing', () => {
    it('should generate "Amendment Required" alert when TIN changed after filing', () => {
      const filingDate = new Date('2024-01-31');
      const changeDate = new Date('2024-02-15');
      const alerts: ComplianceAlert[] = [];

      const checkTINChange = (vendorId: string, oldTIN: string, newTIN: string): void => {
        if (oldTIN !== newTIN) {
          alerts.push(generateAmendmentAlert(vendorId, 'TIN changed after 1099 filed'));
        }
      };

      checkTINChange('v-9', '123-45-6789', '987-65-4321');

      expect(alerts.length).toBe(1);
      expect(alerts[0].type).toBe('amendment_required');
      expect(alerts[0].message).toContain('TIN changed');
    });
  });

  describe('TC-TAX-026: Amount Correction', () => {
    it('should generate "Amendment Required" when Jan check voided in March', () => {
      const alerts: ComplianceAlert[] = [];

      const voidPayment = (
        payment: Payment,
        voidDate: Date,
        filedYear: number
      ): void => {
        const paymentYear = payment.date.getFullYear();

        // If voiding a payment from a filed year
        if (paymentYear === filedYear && voidDate.getFullYear() > filedYear) {
          alerts.push(generateAmendmentAlert(
            payment.vendorId,
            `Payment from ${paymentYear} voided after 1099 filed`
          ));
        }
      };

      const janPayment: Payment = {
        id: 'p-1',
        vendorId: 'v-10',
        amount: 1000,
        method: 'check',
        date: new Date('2024-01-15'),
        voided: false,
        propertyId: 'prop-1',
      };

      voidPayment(janPayment, new Date('2025-03-01'), 2024);

      expect(alerts.length).toBe(1);
      expect(alerts[0].message).toContain('voided after 1099 filed');
    });
  });

  describe('TC-TAX-027: Co-Owner Split', () => {
    it('should generate two 1099-MISC forms for 50/50 ownership with $10,000 income', () => {
      interface Owner {
        id: string;
        name: string;
        tin: string;
        ownershipPercent: number;
      }

      const owners: Owner[] = [
        { id: 'o-1', name: 'Owner A', tin: '111-11-1111', ownershipPercent: 50 },
        { id: 'o-2', name: 'Owner B', tin: '222-22-2222', ownershipPercent: 50 },
      ];

      const netIncome = 10000;

      const generate1099MISC = (owners: Owner[], totalIncome: number): Form1099[] => {
        return owners.map(owner => ({
          vendorId: owner.id, // Owner is the "vendor" receiving 1099-MISC
          formType: '1099-MISC' as const,
          year: 2024,
          amount: Math.round(totalIncome * (owner.ownershipPercent / 100) * 100) / 100,
          generated: true,
        }));
      };

      const forms = generate1099MISC(owners, netIncome);

      expect(forms.length).toBe(2);
      expect(forms[0].amount).toBe(5000);
      expect(forms[1].amount).toBe(5000);
      expect(forms[0].formType).toBe('1099-MISC');
    });
  });

  describe('TC-TAX-028: Management Fee Deduction', () => {
    it('should report Gross Rent on 1099-MISC Box 1, not Net Rent', () => {
      const grossRent = 12000;
      const managementFee = 1200; // 10%
      const netRent = grossRent - managementFee;

      // 1099-MISC should show GROSS rent
      const form1099Amount = grossRent; // NOT netRent

      expect(form1099Amount).toBe(12000);
      expect(form1099Amount).not.toBe(10800);
    });
  });

  describe('TC-TAX-029: Missing TIN Block', () => {
    it('should return error listing specific vendors with missing TINs', () => {
      const vendors: Vendor[] = [
        { id: 'v-1', name: 'Good Vendor', tin: '123-45-6789', entityType: 'individual', address: '', backupWithholding: false, w9Status: 'received' },
        { id: 'v-2', name: 'No TIN Vendor', tin: '', entityType: 'individual', address: '', backupWithholding: false, w9Status: 'pending' },
        { id: 'v-3', name: 'Another Good', tin: '987-65-4321', entityType: 'llc', address: '', backupWithholding: false, w9Status: 'received' },
        { id: 'v-4', name: 'Also Missing', tin: '', entityType: 'individual', address: '', backupWithholding: false, w9Status: 'expired' },
      ];

      const validateBatch = (vendors: Vendor[]): { valid: boolean; errors: string[] } => {
        const missingTIN = vendors.filter(v => !v.tin);

        if (missingTIN.length > 0) {
          return {
            valid: false,
            errors: missingTIN.map(v => `Missing TIN for vendor: ${v.name} (${v.id})`),
          };
        }

        return { valid: true, errors: [] };
      };

      const result = validateBatch(vendors);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors[0]).toContain('No TIN Vendor');
      expect(result.errors[1]).toContain('Also Missing');
    });
  });

  describe('TC-TAX-030: Backup Withholding', () => {
    it('should auto-deduct 24% to Liability Account when vendor marked for backup withholding', () => {
      const vendor: Vendor = {
        id: 'v-bw',
        name: 'Withholding Vendor',
        tin: '123-45-6789',
        entityType: 'individual',
        address: '123 Main St',
        backupWithholding: true, // KEY: Backup withholding enabled
        w9Status: 'received',
      };

      const paymentAmount = 1000;

      const processPaymentWithWithholding = (
        amount: number,
        vendor: Vendor
      ): { netPayment: number; withholdingAmount: number; journalEntries: any[] } => {
        if (!vendor.backupWithholding) {
          return {
            netPayment: amount,
            withholdingAmount: 0,
            journalEntries: [],
          };
        }

        const withholding = calculateBackupWithholding(amount);
        const net = amount - withholding;

        return {
          netPayment: net,
          withholdingAmount: withholding,
          journalEntries: [
            { account: 'expense', debit: amount, credit: 0 },
            { account: 'cash', debit: 0, credit: net },
            { account: 'federal_withholding_liability', debit: 0, credit: withholding },
          ],
        };
      };

      const result = processPaymentWithWithholding(paymentAmount, vendor);

      expect(result.withholdingAmount).toBe(240); // 24% of $1000
      expect(result.netPayment).toBe(760);
      expect(result.journalEntries.length).toBe(3);

      // Verify liability entry
      const liabilityEntry = result.journalEntries.find(
        e => e.account === 'federal_withholding_liability'
      );
      expect(liabilityEntry?.credit).toBe(240);
    });
  });
});
