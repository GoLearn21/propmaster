/**
 * Tenant Document Service
 * Handles document management for tenants including:
 * - Lease documents
 * - Uploaded documents (insurance, IDs)
 * - Signing request status
 */

import { supabase } from '../../lib/supabase';

/**
 * Document types
 */
export type DocumentType =
  | 'lease'
  | 'addendum'
  | 'renewal'
  | 'notice'
  | 'disclosure'
  | 'insurance'
  | 'id'
  | 'receipt'
  | 'other';

/**
 * Document status
 */
export type DocumentStatus =
  | 'draft'
  | 'pending_signature'
  | 'partially_signed'
  | 'signed'
  | 'expired'
  | 'voided';

/**
 * Signer status
 */
export type SignerStatus =
  | 'pending'
  | 'sent'
  | 'opened'
  | 'signed'
  | 'declined'
  | 'expired';

/**
 * Document interface
 */
export interface TenantDocument {
  id: string;
  document_type: DocumentType;
  name: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  status: DocumentStatus;
  expires_at?: string;
  created_at: string;
  updated_at?: string;
  lease_id?: string;
  property?: {
    id: string;
    name: string;
    address: string;
  };
  unit?: {
    id: string;
    name: string;
  };
  signing_request?: SigningRequestSummary;
}

/**
 * Signing request summary
 */
export interface SigningRequestSummary {
  id: string;
  status: DocumentStatus;
  docuseal_slug?: string;
  total_signers: number;
  signed_signers: number;
  my_signer?: SignerInfo;
  created_at: string;
  completed_at?: string;
}

/**
 * Signer info for current tenant
 */
export interface SignerInfo {
  id: string;
  status: SignerStatus;
  role: string;
  signature_url?: string;
  signed_at?: string;
}

/**
 * Signing progress
 */
export interface SigningProgress {
  total_fields: number;
  completed_fields: number;
  progress_percent: number;
  total_signers: number;
  signed_signers: number;
  status: string;
}

/**
 * Document type metadata
 */
export const DOCUMENT_TYPES: Record<DocumentType, { label: string; icon: string; color: string }> = {
  lease: { label: 'Lease Agreement', icon: 'file-text', color: 'primary' },
  addendum: { label: 'Lease Addendum', icon: 'file-plus', color: 'secondary' },
  renewal: { label: 'Lease Renewal', icon: 'refresh-cw', color: 'success' },
  notice: { label: 'Notice', icon: 'alert-circle', color: 'warning' },
  disclosure: { label: 'Disclosure', icon: 'info', color: 'neutral' },
  insurance: { label: 'Insurance', icon: 'shield', color: 'primary' },
  id: { label: 'Identification', icon: 'user', color: 'secondary' },
  receipt: { label: 'Receipt', icon: 'receipt', color: 'success' },
  other: { label: 'Other', icon: 'file', color: 'neutral' },
};

/**
 * Document status metadata
 */
export const DOCUMENT_STATUSES: Record<DocumentStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'neutral' },
  pending_signature: { label: 'Awaiting Signature', color: 'warning' },
  partially_signed: { label: 'Partially Signed', color: 'secondary' },
  signed: { label: 'Signed', color: 'success' },
  expired: { label: 'Expired', color: 'error' },
  voided: { label: 'Voided', color: 'neutral' },
};

/**
 * Get all documents for a tenant
 */
export async function getTenantDocuments(
  tenantId: string,
  options?: {
    type?: DocumentType[];
    status?: DocumentStatus[];
    leaseId?: string;
  }
): Promise<TenantDocument[]> {
  // Get lease documents (from lease relationships)
  let leaseDocsQuery = supabase
    .from('lease_documents')
    .select(`
      *,
      lease:leases (
        id,
        unit:units (
          id,
          name,
          property:properties (
            id,
            name,
            street_address
          )
        )
      )
    `)
    .eq('lease.tenant_id', tenantId);

  if (options?.leaseId) {
    leaseDocsQuery = leaseDocsQuery.eq('lease_id', options.leaseId);
  }

  const { data: leaseDocs } = await leaseDocsQuery;

  // Get tenant-uploaded documents
  let tenantDocsQuery = supabase
    .from('tenant_documents')
    .select('*')
    .eq('tenant_id', tenantId);

  if (options?.type && options.type.length > 0) {
    tenantDocsQuery = tenantDocsQuery.in('document_type', options.type);
  }

  const { data: tenantDocs } = await tenantDocsQuery;

  // Get signing requests for this tenant
  const { data: signingRequests } = await supabase
    .from('signing_request_signers')
    .select(`
      *,
      signing_request:signing_requests (
        *,
        document:documents (*)
      )
    `)
    .eq('tenant_id', tenantId);

  // Combine and format documents
  const documents: TenantDocument[] = [];

  // Add lease documents
  leaseDocs?.forEach((doc) => {
    documents.push({
      id: doc.id,
      document_type: doc.type || 'lease',
      name: doc.name,
      description: doc.description,
      file_url: doc.url,
      file_name: doc.name,
      status: doc.status || 'signed',
      created_at: doc.uploaded_at,
      lease_id: doc.lease_id,
      property: doc.lease?.unit?.property ? {
        id: doc.lease.unit.property.id,
        name: doc.lease.unit.property.name,
        address: doc.lease.unit.property.street_address,
      } : undefined,
      unit: doc.lease?.unit ? {
        id: doc.lease.unit.id,
        name: doc.lease.unit.name,
      } : undefined,
    });
  });

  // Add tenant documents
  tenantDocs?.forEach((doc) => {
    documents.push({
      id: doc.id,
      document_type: doc.document_type,
      name: doc.file_name,
      file_url: doc.file_url,
      file_name: doc.file_name,
      status: 'signed',
      expires_at: doc.expires_at,
      created_at: doc.created_at,
    });
  });

  // Add signing requests with pending/in-progress status
  signingRequests?.forEach((signer) => {
    const sr = signer.signing_request;
    if (!sr) return;

    const existingIndex = documents.findIndex((d) => d.id === sr.document_id);
    if (existingIndex >= 0) {
      // Update existing document with signing info
      documents[existingIndex].signing_request = {
        id: sr.id,
        status: sr.status,
        docuseal_slug: sr.docuseal_slug,
        total_signers: 1, // Will be updated
        signed_signers: signer.status === 'signed' ? 1 : 0,
        my_signer: {
          id: signer.id,
          status: signer.status,
          role: signer.role,
          signature_url: signer.signature_url,
          signed_at: signer.signed_at,
        },
        created_at: sr.created_at,
        completed_at: sr.completed_at,
      };
      documents[existingIndex].status = sr.status;
    } else if (sr.document) {
      // Add new document from signing request
      documents.push({
        id: sr.document.id,
        document_type: sr.document.document_type || 'lease',
        name: sr.document.file_name,
        file_url: sr.document.file_url,
        file_name: sr.document.file_name,
        status: sr.status,
        created_at: sr.created_at,
        signing_request: {
          id: sr.id,
          status: sr.status,
          docuseal_slug: sr.docuseal_slug,
          total_signers: 1,
          signed_signers: signer.status === 'signed' ? 1 : 0,
          my_signer: {
            id: signer.id,
            status: signer.status,
            role: signer.role,
            signature_url: signer.signature_url,
            signed_at: signer.signed_at,
          },
          created_at: sr.created_at,
          completed_at: sr.completed_at,
        },
      });
    }
  });

  // Filter by status if specified
  let filteredDocs = documents;
  if (options?.status && options.status.length > 0) {
    filteredDocs = documents.filter((d) => options.status!.includes(d.status));
  }

  // Sort by created_at descending
  filteredDocs.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return filteredDocs;
}

/**
 * Get a single document by ID
 */
export async function getDocument(
  documentId: string,
  tenantId: string
): Promise<TenantDocument | null> {
  const documents = await getTenantDocuments(tenantId);
  return documents.find((d) => d.id === documentId) || null;
}

/**
 * Get signing progress for a document
 */
export async function getSigningProgress(
  signingRequestId: string
): Promise<SigningProgress | null> {
  const { data, error } = await supabase
    .rpc('get_signing_progress', { p_signing_request_id: signingRequestId });

  if (error || !data || data.length === 0) {
    console.error('Error getting signing progress:', error);
    return null;
  }

  return data[0] as SigningProgress;
}

/**
 * Get pending documents requiring signature
 */
export async function getPendingSignatures(tenantId: string): Promise<TenantDocument[]> {
  const documents = await getTenantDocuments(tenantId, {
    status: ['pending_signature', 'partially_signed'],
  });

  return documents.filter(
    (d) => d.signing_request?.my_signer?.status !== 'signed'
  );
}

/**
 * Download a document
 */
export async function downloadDocument(
  documentUrl: string,
  fileName: string
): Promise<void> {
  try {
    // If it's a Supabase storage URL, get a signed URL
    if (documentUrl.includes('supabase')) {
      const path = documentUrl.split('/storage/v1/object/public/')[1];
      if (path) {
        const { data } = await supabase.storage
          .from(path.split('/')[0])
          .createSignedUrl(path.split('/').slice(1).join('/'), 60);

        if (data?.signedUrl) {
          documentUrl = data.signedUrl;
        }
      }
    }

    // Create a link and trigger download
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading document:', error);
    throw new Error('Failed to download document');
  }
}

/**
 * Upload a tenant document (insurance, ID, etc.)
 */
export async function uploadTenantDocument(
  tenantId: string,
  file: File,
  documentType: DocumentType,
  expiresAt?: string
): Promise<{ success: boolean; document?: TenantDocument; error?: string }> {
  try {
    // Upload file to Supabase storage
    const timestamp = Date.now();
    const filePath = `tenant-documents/${tenantId}/${timestamp}-${file.name}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Create document record
    const { data: docData, error: docError } = await supabase
      .from('tenant_documents')
      .insert({
        tenant_id: tenantId,
        document_type: documentType,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (docError) {
      throw new Error(docError.message);
    }

    return {
      success: true,
      document: {
        id: docData.id,
        document_type: docData.document_type,
        name: docData.file_name,
        file_url: docData.file_url,
        file_name: docData.file_name,
        file_size: docData.file_size,
        mime_type: docData.mime_type,
        status: 'signed',
        expires_at: docData.expires_at,
        created_at: docData.created_at,
      },
    };
  } catch (error) {
    console.error('Error uploading document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload document',
    };
  }
}

/**
 * Delete a tenant-uploaded document
 */
export async function deleteTenantDocument(
  documentId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('tenant_documents')
    .delete()
    .eq('id', documentId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting document:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get document icon by type
 */
export function getDocumentIcon(type: DocumentType): string {
  return DOCUMENT_TYPES[type]?.icon || 'file';
}
