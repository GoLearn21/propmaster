import { supabase } from '../lib/supabase';
import { getVendorManager } from './vendors/VendorManager';
import type { 
  Application,
  ApplicationDocument,
  TenantScreeningResult,
  LeaseDocument,
  ApplicationReview,
  CreateApplicationInput,
  RequestScreeningInput,
  CreateLeaseDocumentInput,
  ApplicationFilters,
  ScreeningFilters
} from '../types';

export class ApplicationService {
  // Application Management
  static async getApplications(filters?: ApplicationFilters): Promise<Application[]> {
    let query = supabase
      .from('applications')
      .select(`
        *,
        property:properties(*),
        unit:units(*),
        documents:application_documents(*),
        screening_results:tenant_screening_results(*),
        lease_document:lease_documents(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.property_id) {
      query = query.eq('property_id', filters.property_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }
    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  static async getApplication(id: string): Promise<Application> {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        property:properties(*),
        unit:units(*),
        documents:application_documents(*),
        screening_results:tenant_screening_results(*),
        lease_document:lease_documents(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async createApplication(input: CreateApplicationInput): Promise<Application> {
    const applicationData = {
      ...input,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('applications')
      .insert(applicationData)
      .select(`
        *,
        property:properties(*),
        unit:units(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  static async updateApplication(id: string, updates: Partial<Application>): Promise<Application> {
    const { data, error } = await supabase
      .from('applications')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        unit:units(*),
        documents:application_documents(*),
        screening_results:tenant_screening_results(*),
        lease_document:lease_documents(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  static async submitApplication(id: string): Promise<Application> {
    return this.updateApplication(id, {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    });
  }

  static async deleteApplication(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Document Management
  static async uploadDocument(
    applicationId: string, 
    file: File, 
    documentType: ApplicationDocument['document_type']
  ): Promise<ApplicationDocument> {
    try {
      // Upload file to Supabase Storage
      const fileName = `${applicationId}/${documentType}_${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('application-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('application-documents')
        .getPublicUrl(fileName);

      // Create document record
      const documentData = {
        application_id: applicationId,
        document_type: documentType,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        upload_date: new Date().toISOString(),
        verified: false,
      };

      const { data, error } = await supabase
        .from('application_documents')
        .insert(documentData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Document upload failed:', error);
      throw new Error(`Document upload failed: ${error.message}`);
    }
  }

  static async getApplicationDocuments(applicationId: string): Promise<ApplicationDocument[]> {
    const { data, error } = await supabase
      .from('application_documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('upload_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async verifyDocument(documentId: string, verifiedBy: string): Promise<ApplicationDocument> {
    const { data, error } = await supabase
      .from('application_documents')
      .update({
        verified: true,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteDocument(documentId: string): Promise<boolean> {
    // First get the document to find the file path
    const { data: document } = await supabase
      .from('application_documents')
      .select('file_url')
      .eq('id', documentId)
      .single();

    if (document) {
      // Extract file path from URL and delete from storage
      const filePath = document.file_url.split('/').pop();
      if (filePath) {
        await supabase.storage
          .from('application-documents')
          .remove([filePath]);
      }
    }

    // Delete document record
    const { error } = await supabase
      .from('application_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
    return true;
  }

  // Tenant Screening Integration
  static async requestTenantScreening(input: RequestScreeningInput): Promise<TenantScreeningResult> {
    try {
      const vendorManager = getVendorManager();
      const screeningProvider = vendorManager.getTenantScreeningProvider();

      // Get application details
      const application = await this.getApplication(input.application_id);
      
      // Request screening from provider
      const screeningRequest = {
        firstName: application.first_name,
        lastName: application.last_name,
        email: application.email,
        phone: application.phone,
        ssn: application.ssn,
        dateOfBirth: application.date_of_birth,
        currentAddress: application.current_address,
        reportTypes: input.report_types,
      };

      const { requestId } = await screeningProvider.requestScreening(screeningRequest);

      // Get pricing
      const pricing = await screeningProvider.getPricing(input.report_types);

      // Create screening result record
      const screeningData = {
        application_id: input.application_id,
        screening_provider: input.provider || 'transunion',
        provider_request_id: requestId,
        status: 'pending',
        report_types: input.report_types,
        cost: pricing.amount,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('tenant_screening_results')
        .insert(screeningData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Tenant screening request failed:', error);
      throw new Error(`Tenant screening request failed: ${error.message}`);
    }
  }

  static async getScreeningResults(filters?: ScreeningFilters): Promise<TenantScreeningResult[]> {
    let query = supabase
      .from('tenant_screening_results')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.application_id) {
      query = query.eq('application_id', filters.application_id);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.risk_level) {
      query = query.eq('overall_risk', filters.risk_level);
    }
    if (filters?.provider) {
      query = query.eq('screening_provider', filters.provider);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  static async updateScreeningResult(id: string): Promise<TenantScreeningResult> {
    try {
      // Get existing screening result
      const { data: existingResult } = await supabase
        .from('tenant_screening_results')
        .select('*')
        .eq('id', id)
        .single();

      if (!existingResult) {
        throw new Error('Screening result not found');
      }

      const vendorManager = getVendorManager();
      const screeningProvider = vendorManager.getTenantScreeningProvider();

      // Get updated report from provider
      const report = await screeningProvider.getReport(existingResult.provider_request_id);

      // Update the screening result with new data
      const updateData = {
        status: report.status,
        completed_at: report.completedAt ? report.completedAt.toISOString() : null,
        credit_score: report.creditScore,
        criminal_records: report.criminalRecords,
        eviction_records: report.evictionRecords,
        income_verification: report.incomeVerification,
        // Add risk assessment logic here
        overall_risk: this.calculateRisk(report),
        recommendation: this.calculateRecommendation(report),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('tenant_screening_results')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Screening result update failed:', error);
      throw new Error(`Screening result update failed: ${error.message}`);
    }
  }

  private static calculateRisk(report: any): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // Credit score risk
    if (report.creditScore) {
      if (report.creditScore < 600) riskScore += 3;
      else if (report.creditScore < 700) riskScore += 1;
    }

    // Criminal records risk
    if (report.criminalRecords && report.criminalRecords.length > 0) {
      riskScore += report.criminalRecords.length;
    }

    // Eviction records risk
    if (report.evictionRecords && report.evictionRecords.length > 0) {
      riskScore += report.evictionRecords.length * 2;
    }

    // Income verification risk
    if (report.incomeVerification && !report.incomeVerification.verified) {
      riskScore += 1;
    }

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private static calculateRecommendation(report: any): 'approve' | 'approve_with_conditions' | 'reject' {
    const risk = this.calculateRisk(report);
    
    if (risk === 'low') return 'approve';
    if (risk === 'medium') return 'approve_with_conditions';
    return 'reject';
  }

  // eSignature Integration
  static async createLeaseDocument(input: CreateLeaseDocumentInput): Promise<LeaseDocument> {
    try {
      const vendorManager = getVendorManager();
      const eSignatureProvider = vendorManager.getESignatureProvider();

      // Get lease template (this would be pre-configured)
      const leaseTemplate = await this.getLeaseTemplate(input.template_id);
      
      // Generate lease document with terms
      const generatedDocument = await this.generateLeaseDocument(leaseTemplate, input.lease_terms);

      // Create signature request
      const signatureRequest = await eSignatureProvider.createSignatureRequest({
        documentName: input.document_name,
        documentBase64: generatedDocument,
        signers: input.signers,
        subject: `Lease Agreement: ${input.document_name}`,
        message: 'Please review and sign your lease agreement.',
        testMode: process.env.NODE_ENV !== 'production',
      });

      // Create lease document record
      const leaseDocumentData = {
        application_id: input.application_id,
        template_id: input.template_id,
        document_name: input.document_name,
        document_type: 'lease',
        signature_provider: 'dropbox_sign',
        signature_request_id: signatureRequest.id,
        status: 'sent_for_signature',
        signers: input.signers.map(signer => ({
          ...signer,
          status: 'pending',
        })),
        created_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('lease_documents')
        .insert(leaseDocumentData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Lease document creation failed:', error);
      throw new Error(`Lease document creation failed: ${error.message}`);
    }
  }

  static async getLeaseDocuments(applicationId?: string): Promise<LeaseDocument[]> {
    let query = supabase
      .from('lease_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (applicationId) {
      query = query.eq('application_id', applicationId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  static async updateLeaseDocumentStatus(id: string): Promise<LeaseDocument> {
    try {
      // Get existing lease document
      const { data: existingDoc } = await supabase
        .from('lease_documents')
        .select('*')
        .eq('id', id)
        .single();

      if (!existingDoc || !existingDoc.signature_request_id) {
        throw new Error('Lease document or signature request not found');
      }

      const vendorManager = getVendorManager();
      const eSignatureProvider = vendorManager.getESignatureProvider();

      // Get updated signature request from provider
      const signatureRequest = await eSignatureProvider.getSignatureRequest(existingDoc.signature_request_id);

      // Update lease document with new status
      const updateData = {
        status: this.mapSignatureStatus(signatureRequest.status),
        completed_at: signatureRequest.completedAt ? signatureRequest.completedAt.toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      // If fully signed, download the signed document
      if (signatureRequest.status === 'signed') {
        const { url } = await eSignatureProvider.downloadSignedDocument(existingDoc.signature_request_id);
        updateData.signed_document_url = url;
      }

      const { data, error } = await supabase
        .from('lease_documents')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Lease document status update failed:', error);
      throw new Error(`Lease document status update failed: ${error.message}`);
    }
  }

  private static mapSignatureStatus(providerStatus: string): LeaseDocument['status'] {
    switch (providerStatus) {
      case 'signed':
        return 'fully_signed';
      case 'sent':
        return 'sent_for_signature';
      case 'declined':
        return 'declined';
      case 'expired':
        return 'expired';
      default:
        return 'sent_for_signature';
    }
  }

  private static async getLeaseTemplate(templateId: string): Promise<string> {
    // This would fetch a pre-configured lease template
    // For now, return a mock template
    return 'base64-encoded-lease-template';
  }

  private static async generateLeaseDocument(template: string, terms: any): Promise<string> {
    // This would generate a personalized lease document with the provided terms
    // For now, return the template as-is
    return template;
  }

  // Application Review
  static async createApplicationReview(
    applicationId: string,
    reviewData: Omit<ApplicationReview, 'id' | 'application_id' | 'reviewed_at'>
  ): Promise<ApplicationReview> {
    const reviewRecord = {
      application_id: applicationId,
      ...reviewData,
      reviewed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('application_reviews')
      .insert(reviewRecord)
      .select()
      .single();

    if (error) throw error;

    // Update application status based on review
    await this.updateApplication(applicationId, {
      status: reviewData.status === 'approved' ? 'approved' : 
             reviewData.status === 'rejected' ? 'rejected' : 'under_review',
      reviewed_at: new Date().toISOString(),
    });

    return data;
  }

  static async getApplicationReviews(applicationId: string): Promise<ApplicationReview[]> {
    const { data, error } = await supabase
      .from('application_reviews')
      .select('*')
      .eq('application_id', applicationId)
      .order('reviewed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}