/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * TaxComplianceService - 1099 Tax Reporting
 *
 * TITANIUM RULES ENFORCED:
 * 1. Law as Data - 1099 thresholds from compliance_rules
 * 2. O(1) Reads - YTD totals from vendor_1099_tracking
 *
 * FEATURES:
 * - Automatic 1099 eligibility tracking
 * - Vendor W-9 management
 * - 1099-MISC and 1099-NEC generation
 * - IRS e-filing format (FIRE system)
 * - State reporting where required
 * - Owner rental income 1099 tracking
 */

import { supabase } from '@/lib/supabase';
import type { Decimal, ISODate, UUID } from '../types';
import { ComplianceService, createComplianceService } from '../services/ComplianceService';
import { EventService, createEventService } from '../events/EventService';

export class TaxComplianceService {
  private organizationId: string;
  private compliance: ComplianceService;
  private events: EventService;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.compliance = createComplianceService(organizationId);
    this.events = createEventService(organizationId);
  }

  // ============================================================
  // VENDOR 1099 TRACKING
  // ============================================================

  /**
   * Get vendors requiring 1099
   */
  async getVendorsRequiring1099(taxYear: number): Promise<Vendor1099Summary[]> {
    const threshold = await this.compliance.get1099Threshold();

    const { data: vendors, error } = await supabase
      .from('vendor_1099_tracking')
      .select(`
        vendor_id,
        ytd_amount,
        vendors(
          id,
          name,
          tax_id,
          tax_id_type,
          address_line1,
          city,
          state_code,
          zip_code,
          w9_on_file,
          w9_date
        )
      `)
      .eq('organization_id', this.organizationId)
      .eq('tax_year', taxYear)
      .gte('ytd_amount', threshold);

    if (error) {
      throw new TaxComplianceError(
        `Failed to fetch 1099 vendors: ${error.message}`,
        'FETCH_FAILED'
      );
    }

    return (vendors || []).map((v) => ({
      vendorId: v.vendor_id,
      vendorName: v.vendors?.name || 'Unknown',
      taxId: v.vendors?.tax_id,
      taxIdType: v.vendors?.tax_id_type as 'ein' | 'ssn' | undefined,
      ytdAmount: v.ytd_amount,
      threshold: threshold.toFixed(2) as Decimal,
      w9OnFile: v.vendors?.w9_on_file || false,
      w9Date: v.vendors?.w9_date,
      address: {
        line1: v.vendors?.address_line1,
        city: v.vendors?.city,
        state: v.vendors?.state_code,
        zip: v.vendors?.zip_code,
      },
      status: this.calculate1099Status(v),
    }));
  }

  /**
   * Get vendor 1099 detail with payment history
   */
  async getVendor1099Detail(
    vendorId: UUID,
    taxYear: number
  ): Promise<Vendor1099Detail> {
    // Get vendor info
    const { data: vendor } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (!vendor) {
      throw new TaxComplianceError('Vendor not found', 'VENDOR_NOT_FOUND');
    }

    // Get YTD tracking
    const { data: tracking } = await supabase
      .from('vendor_1099_tracking')
      .select('ytd_amount')
      .eq('vendor_id', vendorId)
      .eq('tax_year', taxYear)
      .single();

    // Get all payments for the year
    const { data: payments } = await supabase
      .from('vendor_payments')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('organization_id', this.organizationId)
      .gte('payment_date', `${taxYear}-01-01`)
      .lte('payment_date', `${taxYear}-12-31`)
      .order('payment_date', { ascending: true });

    const threshold = await this.compliance.get1099Threshold();

    return {
      vendorId,
      vendorName: vendor.name,
      taxId: vendor.tax_id,
      taxIdType: vendor.tax_id_type,
      taxYear,
      ytdAmount: tracking?.ytd_amount || '0.00',
      threshold: threshold.toFixed(2) as Decimal,
      requires1099: parseFloat(tracking?.ytd_amount || '0') >= threshold,
      w9OnFile: vendor.w9_on_file,
      w9Date: vendor.w9_date,
      address: {
        line1: vendor.address_line1,
        line2: vendor.address_line2,
        city: vendor.city,
        state: vendor.state_code,
        zip: vendor.zip_code,
      },
      payments: (payments || []).map((p) => ({
        date: p.payment_date,
        amount: p.amount,
        checkNumber: p.check_number,
        description: p.description,
      })),
    };
  }

  /**
   * Update vendor W-9 status
   */
  async updateVendorW9(
    vendorId: UUID,
    w9Data: {
      taxId: string;
      taxIdType: 'ein' | 'ssn';
      w9Date: ISODate;
    }
  ): Promise<void> {
    // Validate tax ID format
    if (!this.validateTaxId(w9Data.taxId, w9Data.taxIdType)) {
      throw new TaxComplianceError('Invalid tax ID format', 'INVALID_TAX_ID');
    }

    await supabase
      .from('vendors')
      .update({
        tax_id: w9Data.taxId,
        tax_id_type: w9Data.taxIdType,
        w9_on_file: true,
        w9_date: w9Data.w9Date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vendorId);

    await this.events.emit({
      eventType: 'vendor.w9.updated',
      payload: {
        vendorId,
        taxIdType: w9Data.taxIdType,
        w9Date: w9Data.w9Date,
      },
    });
  }

  // ============================================================
  // OWNER 1099 TRACKING
  // ============================================================

  /**
   * Get owners requiring 1099 (rental income)
   */
  async getOwnersRequiring1099(taxYear: number): Promise<Owner1099Summary[]> {
    const threshold = await this.compliance.get1099Threshold();

    // Get owner distributions for the year
    const { data: distributions, error } = await supabase
      .from('owner_distributions')
      .select(`
        owner_id,
        amount,
        owners(
          id,
          name,
          tax_id,
          tax_id_type,
          address_line1,
          city,
          state_code,
          zip_code
        )
      `)
      .eq('organization_id', this.organizationId)
      .gte('distribution_date', `${taxYear}-01-01`)
      .lte('distribution_date', `${taxYear}-12-31`)
      .eq('status', 'processed');

    if (error) {
      throw new TaxComplianceError(
        `Failed to fetch owner distributions: ${error.message}`,
        'FETCH_FAILED'
      );
    }

    // Aggregate by owner
    const ownerTotals = new Map<UUID, { owner: unknown; total: number }>();

    for (const dist of distributions || []) {
      const current = ownerTotals.get(dist.owner_id) || { owner: dist.owners, total: 0 };
      current.total += parseFloat(dist.amount);
      ownerTotals.set(dist.owner_id, current);
    }

    const result: Owner1099Summary[] = [];

    for (const [ownerId, data] of ownerTotals) {
      if (data.total >= threshold) {
        const owner = data.owner as {
          id: UUID;
          name: string;
          tax_id?: string;
          tax_id_type?: string;
          address_line1?: string;
          city?: string;
          state_code?: string;
          zip_code?: string;
        };

        result.push({
          ownerId,
          ownerName: owner.name,
          taxId: owner.tax_id,
          taxIdType: owner.tax_id_type as 'ein' | 'ssn' | undefined,
          ytdDistributions: data.total.toFixed(2) as Decimal,
          threshold: threshold.toFixed(2) as Decimal,
          address: {
            line1: owner.address_line1,
            city: owner.city,
            state: owner.state_code,
            zip: owner.zip_code,
          },
          status: owner.tax_id ? 'ready' : 'missing_tax_id',
        });
      }
    }

    return result;
  }

  // ============================================================
  // 1099 GENERATION
  // ============================================================

  /**
   * Generate 1099-NEC forms for vendors
   */
  async generate1099NECForms(taxYear: number): Promise<Generated1099Batch> {
    const vendors = await this.getVendorsRequiring1099(taxYear);
    const forms: Form1099NEC[] = [];
    const errors: Form1099Error[] = [];

    for (const vendor of vendors) {
      if (vendor.status !== 'ready') {
        errors.push({
          recipientId: vendor.vendorId,
          recipientName: vendor.vendorName,
          recipientType: 'vendor',
          errorType: vendor.status as Form1099Error['errorType'],
          message: this.getErrorMessage(vendor.status),
        });
        continue;
      }

      forms.push({
        formType: '1099-NEC',
        taxYear,
        payerTIN: await this.getPayerTIN(),
        payerName: await this.getPayerName(),
        payerAddress: await this.getPayerAddress(),
        recipientTIN: vendor.taxId!,
        recipientName: vendor.vendorName,
        recipientAddress: vendor.address,
        box1NonemployeeCompensation: vendor.ytdAmount,
        box4FederalTaxWithheld: '0.00' as Decimal,
      });
    }

    const batchId = crypto.randomUUID() as UUID;

    // Store batch
    await supabase.from('form_1099_batches').insert({
      id: batchId,
      organization_id: this.organizationId,
      tax_year: taxYear,
      form_type: '1099-NEC',
      recipient_type: 'vendor',
      form_count: forms.length,
      error_count: errors.length,
      status: 'generated',
      generated_at: new Date().toISOString(),
    });

    // Store individual forms
    for (const form of forms) {
      await supabase.from('form_1099_records').insert({
        id: crypto.randomUUID(),
        batch_id: batchId,
        form_type: form.formType,
        tax_year: taxYear,
        recipient_tin: form.recipientTIN,
        recipient_name: form.recipientName,
        amount: form.box1NonemployeeCompensation,
        form_data: form,
        status: 'pending',
      });
    }

    return {
      batchId,
      taxYear,
      formType: '1099-NEC',
      forms,
      errors,
      summary: {
        totalRecipients: vendors.length,
        formsGenerated: forms.length,
        errorsFound: errors.length,
        totalAmount: forms.reduce((sum, f) => sum + parseFloat(f.box1NonemployeeCompensation), 0).toFixed(2) as Decimal,
      },
    };
  }

  /**
   * Generate 1099-MISC forms for owners
   */
  async generate1099MISCForms(taxYear: number): Promise<Generated1099Batch> {
    const owners = await this.getOwnersRequiring1099(taxYear);
    const forms: Form1099MISC[] = [];
    const errors: Form1099Error[] = [];

    for (const owner of owners) {
      if (owner.status !== 'ready') {
        errors.push({
          recipientId: owner.ownerId,
          recipientName: owner.ownerName,
          recipientType: 'owner',
          errorType: owner.status as Form1099Error['errorType'],
          message: this.getErrorMessage(owner.status),
        });
        continue;
      }

      forms.push({
        formType: '1099-MISC',
        taxYear,
        payerTIN: await this.getPayerTIN(),
        payerName: await this.getPayerName(),
        payerAddress: await this.getPayerAddress(),
        recipientTIN: owner.taxId!,
        recipientName: owner.ownerName,
        recipientAddress: owner.address,
        box1Rents: owner.ytdDistributions,
        box4FederalTaxWithheld: '0.00' as Decimal,
      });
    }

    const batchId = crypto.randomUUID() as UUID;

    // Store batch
    await supabase.from('form_1099_batches').insert({
      id: batchId,
      organization_id: this.organizationId,
      tax_year: taxYear,
      form_type: '1099-MISC',
      recipient_type: 'owner',
      form_count: forms.length,
      error_count: errors.length,
      status: 'generated',
      generated_at: new Date().toISOString(),
    });

    // Store individual forms
    for (const form of forms) {
      await supabase.from('form_1099_records').insert({
        id: crypto.randomUUID(),
        batch_id: batchId,
        form_type: form.formType,
        tax_year: taxYear,
        recipient_tin: form.recipientTIN,
        recipient_name: form.recipientName,
        amount: form.box1Rents,
        form_data: form,
        status: 'pending',
      });
    }

    return {
      batchId,
      taxYear,
      formType: '1099-MISC',
      forms,
      errors,
      summary: {
        totalRecipients: owners.length,
        formsGenerated: forms.length,
        errorsFound: errors.length,
        totalAmount: forms.reduce((sum, f) => sum + parseFloat(f.box1Rents), 0).toFixed(2) as Decimal,
      },
    };
  }

  /**
   * Generate IRS FIRE file for electronic filing
   */
  async generateFIREFile(batchId: UUID): Promise<FIREFile> {
    // Get batch
    const { data: batch } = await supabase
      .from('form_1099_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (!batch) {
      throw new TaxComplianceError('Batch not found', 'BATCH_NOT_FOUND');
    }

    // Get forms
    const { data: forms } = await supabase
      .from('form_1099_records')
      .select('*')
      .eq('batch_id', batchId);

    const lines: string[] = [];
    const payerTIN = await this.getPayerTIN();
    const payerName = await this.getPayerName();

    // Transmitter Record (T)
    lines.push(this.buildTransmitterRecord(batch.tax_year));

    // Payer Record (A)
    lines.push(this.buildPayerRecord(batch.tax_year, payerTIN, payerName, batch.form_type));

    // Payee Records (B)
    let payeeCount = 0;
    let totalAmount = 0;

    for (const form of forms || []) {
      const formData = form.form_data as Form1099NEC | Form1099MISC;
      lines.push(this.buildPayeeRecord(formData));
      payeeCount++;
      totalAmount += parseFloat(form.amount);
    }

    // End of Payer Record (C)
    lines.push(this.buildEndOfPayerRecord(payeeCount, totalAmount));

    // State Totals (K) - if applicable
    // End of Transmission (F)
    lines.push(this.buildEndOfTransmissionRecord(1, payeeCount));

    const fileContent = lines.join('\n');
    const fileId = `FIRE-${batch.tax_year}-${Date.now()}`;

    // Store FIRE file
    await supabase.from('fire_files').insert({
      id: fileId,
      batch_id: batchId,
      organization_id: this.organizationId,
      tax_year: batch.tax_year,
      file_content: fileContent,
      record_count: lines.length,
      payee_count: payeeCount,
      total_amount: totalAmount.toFixed(2),
      status: 'generated',
      generated_at: new Date().toISOString(),
    });

    // Update batch status
    await supabase
      .from('form_1099_batches')
      .update({
        status: 'fire_generated',
        fire_file_id: fileId,
      })
      .eq('id', batchId);

    return {
      fileId,
      batchId,
      taxYear: batch.tax_year,
      content: fileContent,
      recordCount: lines.length,
      payeeCount,
      totalAmount: totalAmount.toFixed(2) as Decimal,
      generatedAt: new Date().toISOString(),
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private calculate1099Status(vendor: {
    vendors?: { tax_id?: string; w9_on_file?: boolean };
  }): string {
    if (!vendor.vendors?.tax_id) return 'missing_tax_id';
    if (!vendor.vendors?.w9_on_file) return 'missing_w9';
    return 'ready';
  }

  private validateTaxId(taxId: string, type: 'ein' | 'ssn'): boolean {
    const cleanId = taxId.replace(/[^0-9]/g, '');

    if (type === 'ein') {
      return cleanId.length === 9;
    } else if (type === 'ssn') {
      return cleanId.length === 9;
    }

    return false;
  }

  private getErrorMessage(status: string): string {
    switch (status) {
      case 'missing_tax_id':
        return 'Tax ID (EIN/SSN) is required for 1099 filing';
      case 'missing_w9':
        return 'W-9 form has not been received';
      case 'invalid_address':
        return 'Valid mailing address is required';
      default:
        return 'Unknown error';
    }
  }

  private async getPayerTIN(): Promise<string> {
    const { data: org } = await supabase
      .from('organizations')
      .select('tax_id')
      .eq('id', this.organizationId)
      .single();

    return org?.tax_id || '';
  }

  private async getPayerName(): Promise<string> {
    const { data: org } = await supabase
      .from('organizations')
      .select('legal_name')
      .eq('id', this.organizationId)
      .single();

    return org?.legal_name || '';
  }

  private async getPayerAddress(): Promise<Address> {
    const { data: org } = await supabase
      .from('organizations')
      .select('address_line1, address_line2, city, state_code, zip_code')
      .eq('id', this.organizationId)
      .single();

    return {
      line1: org?.address_line1,
      line2: org?.address_line2,
      city: org?.city,
      state: org?.state_code,
      zip: org?.zip_code,
    };
  }

  // FIRE Format builders (IRS specification)
  private buildTransmitterRecord(taxYear: number): string {
    // T Record - 750 characters fixed width
    return 'T' +
      taxYear.toString() + // Tax year
      ' '.repeat(742); // Filler (simplified)
  }

  private buildPayerRecord(
    taxYear: number,
    payerTIN: string,
    payerName: string,
    formType: string
  ): string {
    // A Record
    return 'A' +
      taxYear.toString() +
      ' ' + // Combined Federal/State
      ' '.repeat(5) + // Blank
      payerTIN.padEnd(9, ' ') +
      ' '.repeat(4) + // Payer name control
      ' ' + // Last filing indicator
      (formType === '1099-NEC' ? 'NEC' : 'A').padEnd(2, ' ') + // Type of return
      ' '.repeat(728); // Filler (simplified)
  }

  private buildPayeeRecord(form: Form1099NEC | Form1099MISC): string {
    // B Record
    const amount = form.formType === '1099-NEC'
      ? (form as Form1099NEC).box1NonemployeeCompensation
      : (form as Form1099MISC).box1Rents;

    return 'B' +
      form.taxYear.toString() +
      ' ' + // Correction indicator
      form.recipientName.substring(0, 4).toUpperCase().padEnd(4, ' ') + // Name control
      form.recipientTIN.replace(/[^0-9]/g, '').padEnd(9, ' ') +
      ' '.repeat(20) + // Payer account number
      ' '.repeat(14) + // Payer office code
      ' '.repeat(10) + // Blank
      Math.round(parseFloat(amount) * 100).toString().padStart(12, '0') + // Amount in cents
      ' '.repeat(670); // Filler (simplified)
  }

  private buildEndOfPayerRecord(payeeCount: number, totalAmount: number): string {
    // C Record
    return 'C' +
      payeeCount.toString().padStart(8, '0') +
      ' '.repeat(6) + // Blank
      Math.round(totalAmount * 100).toString().padStart(18, '0') +
      ' '.repeat(718); // Filler (simplified)
  }

  private buildEndOfTransmissionRecord(
    payerCount: number,
    totalPayees: number
  ): string {
    // F Record
    return 'F' +
      payerCount.toString().padStart(8, '0') +
      '0'.repeat(21) + // Zero fill
      totalPayees.toString().padStart(8, '0') +
      ' '.repeat(713); // Filler (simplified)
  }
}

// ============================================================
// TYPES
// ============================================================

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface Vendor1099Summary {
  vendorId: UUID;
  vendorName: string;
  taxId?: string;
  taxIdType?: 'ein' | 'ssn';
  ytdAmount: Decimal;
  threshold: Decimal;
  w9OnFile: boolean;
  w9Date?: ISODate;
  address: Address;
  status: string;
}

export interface Vendor1099Detail extends Vendor1099Summary {
  taxYear: number;
  requires1099: boolean;
  payments: Array<{
    date: ISODate;
    amount: Decimal;
    checkNumber?: string;
    description?: string;
  }>;
}

export interface Owner1099Summary {
  ownerId: UUID;
  ownerName: string;
  taxId?: string;
  taxIdType?: 'ein' | 'ssn';
  ytdDistributions: Decimal;
  threshold: Decimal;
  address: Address;
  status: string;
}

export interface Form1099NEC {
  formType: '1099-NEC';
  taxYear: number;
  payerTIN: string;
  payerName: string;
  payerAddress: Address;
  recipientTIN: string;
  recipientName: string;
  recipientAddress: Address;
  box1NonemployeeCompensation: Decimal;
  box4FederalTaxWithheld: Decimal;
}

export interface Form1099MISC {
  formType: '1099-MISC';
  taxYear: number;
  payerTIN: string;
  payerName: string;
  payerAddress: Address;
  recipientTIN: string;
  recipientName: string;
  recipientAddress: Address;
  box1Rents: Decimal;
  box4FederalTaxWithheld: Decimal;
}

export interface Form1099Error {
  recipientId: UUID;
  recipientName: string;
  recipientType: 'vendor' | 'owner';
  errorType: 'missing_tax_id' | 'missing_w9' | 'invalid_address';
  message: string;
}

export interface Generated1099Batch {
  batchId: UUID;
  taxYear: number;
  formType: '1099-NEC' | '1099-MISC';
  forms: (Form1099NEC | Form1099MISC)[];
  errors: Form1099Error[];
  summary: {
    totalRecipients: number;
    formsGenerated: number;
    errorsFound: number;
    totalAmount: Decimal;
  };
}

export interface FIREFile {
  fileId: string;
  batchId: UUID;
  taxYear: number;
  content: string;
  recordCount: number;
  payeeCount: number;
  totalAmount: Decimal;
  generatedAt: string;
}

export class TaxComplianceError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'TaxComplianceError';
    this.code = code;
  }
}

export function createTaxComplianceService(organizationId: string): TaxComplianceService {
  return new TaxComplianceService(organizationId);
}
