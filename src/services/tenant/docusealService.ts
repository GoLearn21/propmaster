/**
 * DocuSeal E-Signature Service
 * Handles integration with DocuSeal API for document signing
 * Provides DocuSign-quality signing experience
 *
 * DocuSeal Documentation: https://www.docuseal.com/docs
 * React Component: @docuseal/react
 */

import { supabase } from '../../lib/supabase';

/**
 * DocuSeal configuration
 * API key should be stored in environment variables
 */
const DOCUSEAL_API_URL = import.meta.env.VITE_DOCUSEAL_API_URL || 'https://api.docuseal.com';
const DOCUSEAL_API_KEY = import.meta.env.VITE_DOCUSEAL_API_KEY || '';

/**
 * Submission status from DocuSeal
 */
export type DocuSealStatus =
  | 'pending'
  | 'sent'
  | 'opened'
  | 'completed'
  | 'expired'
  | 'archived';

/**
 * Submitter (signer) from DocuSeal
 */
export interface DocuSealSubmitter {
  id: number;
  submission_id: number;
  uuid: string;
  email: string;
  slug: string;
  sent_at: string | null;
  opened_at: string | null;
  completed_at: string | null;
  declined_at: string | null;
  status: 'pending' | 'sent' | 'opened' | 'completed' | 'declined';
  metadata: Record<string, unknown>;
  values: Array<{
    field: string;
    value: string;
  }>;
  documents: Array<{
    name: string;
    url: string;
  }>;
  role: string;
  embed_src: string;
}

/**
 * Submission from DocuSeal
 */
export interface DocuSealSubmission {
  id: number;
  source: string;
  submitters_order: string;
  slug: string;
  audit_log_url: string;
  combined_document_url: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  status: DocuSealStatus;
  submitters: DocuSealSubmitter[];
  template: {
    id: number;
    name: string;
  };
  created_by_user: {
    id: number;
    email: string;
  } | null;
}

/**
 * Template from DocuSeal
 */
export interface DocuSealTemplate {
  id: number;
  slug: string;
  name: string;
  schema: Array<{
    attachment_uuid: string;
    name: string;
  }>;
  fields: Array<{
    uuid: string;
    submitter_uuid: string;
    name: string;
    type: string;
    required: boolean;
    areas: Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      page: number;
    }>;
  }>;
  submitters: Array<{
    name: string;
    uuid: string;
  }>;
  author: {
    id: number;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Create submission request
 */
export interface CreateSubmissionRequest {
  template_id: number;
  submitters: Array<{
    email: string;
    name?: string;
    role?: string;
    phone?: string;
    values?: Record<string, string>;
    metadata?: Record<string, unknown>;
  }>;
  send_email?: boolean;
  order?: 'preserved' | 'random';
  completed_redirect_url?: string;
  message?: {
    subject?: string;
    body?: string;
  };
}

/**
 * Signing embed data
 */
export interface SigningEmbedData {
  submitterId: number;
  slug: string;
  embedSrc: string;
  status: string;
  fields: number;
  completedFields: number;
}

/**
 * Make authenticated request to DocuSeal API
 */
async function docusealFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${DOCUSEAL_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'X-Auth-Token': DOCUSEAL_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DocuSeal API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Get all templates
 */
export async function getTemplates(): Promise<DocuSealTemplate[]> {
  return docusealFetch<DocuSealTemplate[]>('/templates');
}

/**
 * Get a specific template
 */
export async function getTemplate(templateId: number): Promise<DocuSealTemplate> {
  return docusealFetch<DocuSealTemplate>(`/templates/${templateId}`);
}

/**
 * Create a new submission (signature request)
 */
export async function createSubmission(
  request: CreateSubmissionRequest
): Promise<DocuSealSubmission> {
  return docusealFetch<DocuSealSubmission>('/submissions', {
    method: 'POST',
    body: JSON.stringify({
      ...request,
      send_email: request.send_email ?? false, // Default to embedded signing
    }),
  });
}

/**
 * Get a submission by ID
 */
export async function getSubmission(submissionId: number): Promise<DocuSealSubmission> {
  return docusealFetch<DocuSealSubmission>(`/submissions/${submissionId}`);
}

/**
 * Get submissions for a template
 */
export async function getSubmissions(
  templateId?: number,
  options?: { limit?: number; after?: number; before?: number }
): Promise<DocuSealSubmission[]> {
  const params = new URLSearchParams();
  if (templateId) params.set('template_id', templateId.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.after) params.set('after', options.after.toString());
  if (options?.before) params.set('before', options.before.toString());

  const query = params.toString();
  return docusealFetch<DocuSealSubmission[]>(`/submissions${query ? `?${query}` : ''}`);
}

/**
 * Archive a submission
 */
export async function archiveSubmission(submissionId: number): Promise<DocuSealSubmission> {
  return docusealFetch<DocuSealSubmission>(`/submissions/${submissionId}`, {
    method: 'DELETE',
  });
}

/**
 * Get embed data for a submitter (for embedded signing)
 */
export async function getSubmitterEmbedData(
  submissionId: number,
  submitterEmail: string
): Promise<SigningEmbedData | null> {
  const submission = await getSubmission(submissionId);

  const submitter = submission.submitters.find(
    (s) => s.email.toLowerCase() === submitterEmail.toLowerCase()
  );

  if (!submitter) {
    return null;
  }

  // Calculate field completion
  const totalFields = submission.template?.fields?.length || 0;
  const completedFields = submitter.values?.length || 0;

  return {
    submitterId: submitter.id,
    slug: submitter.slug,
    embedSrc: submitter.embed_src,
    status: submitter.status,
    fields: totalFields,
    completedFields,
  };
}

/**
 * Create a lease signing request for a tenant
 */
export async function createLeaseSigningRequest(
  tenantId: string,
  leaseId: string,
  templateId: number,
  tenantEmail: string,
  tenantName: string,
  prefillData?: Record<string, string>
): Promise<{
  success: boolean;
  signingRequestId?: string;
  embedUrl?: string;
  error?: string;
}> {
  try {
    // Create DocuSeal submission
    const submission = await createSubmission({
      template_id: templateId,
      submitters: [
        {
          email: tenantEmail,
          name: tenantName,
          role: 'tenant',
          values: prefillData,
          metadata: {
            tenant_id: tenantId,
            lease_id: leaseId,
          },
        },
      ],
      send_email: false, // Use embedded signing
      completed_redirect_url: `${window.location.origin}/tenant/documents?signed=true`,
    });

    const submitter = submission.submitters[0];

    // Store in our database
    const { data: signingRequest, error: dbError } = await supabase
      .from('signing_requests')
      .insert({
        lease_id: leaseId,
        status: 'pending_signature',
        docuseal_submission_id: submission.id.toString(),
        docuseal_slug: submission.slug,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing signing request:', dbError);
    }

    // Store signer info
    if (signingRequest) {
      await supabase.from('signing_request_signers').insert({
        signing_request_id: signingRequest.id,
        tenant_id: tenantId,
        email: tenantEmail,
        name: tenantName,
        role: 'tenant',
        status: 'sent',
        docuseal_signer_id: submitter.id.toString(),
        signature_url: submitter.embed_src,
        sent_at: new Date().toISOString(),
      });
    }

    return {
      success: true,
      signingRequestId: signingRequest?.id,
      embedUrl: submitter.embed_src,
    };
  } catch (error) {
    console.error('Error creating lease signing request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create signing request',
    };
  }
}

/**
 * Get signing URL for an existing request
 */
export async function getSigningUrl(
  signingRequestId: string,
  tenantId: string
): Promise<{ success: boolean; embedUrl?: string; error?: string }> {
  try {
    // Get the signing request
    const { data: signer, error } = await supabase
      .from('signing_request_signers')
      .select('signature_url, status, docuseal_signer_id')
      .eq('signing_request_id', signingRequestId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !signer) {
      return { success: false, error: 'Signing request not found' };
    }

    if (signer.status === 'signed') {
      return { success: false, error: 'Document already signed' };
    }

    if (signer.signature_url) {
      return { success: true, embedUrl: signer.signature_url };
    }

    return { success: false, error: 'No signing URL available' };
  } catch (error) {
    console.error('Error getting signing URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get signing URL',
    };
  }
}

/**
 * Handle signing completion (called from webhook or callback)
 */
export async function handleSigningComplete(
  submissionId: string,
  submitterEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the submission from DocuSeal
    const submission = await getSubmission(parseInt(submissionId));
    const submitter = submission.submitters.find(
      (s) => s.email.toLowerCase() === submitterEmail.toLowerCase()
    );

    if (!submitter) {
      return { success: false, error: 'Submitter not found' };
    }

    // Update our database
    const { error: signerError } = await supabase
      .from('signing_request_signers')
      .update({
        status: submitter.status === 'completed' ? 'signed' : submitter.status,
        signed_at: submitter.completed_at,
        updated_at: new Date().toISOString(),
      })
      .eq('docuseal_signer_id', submitter.id.toString());

    if (signerError) {
      console.error('Error updating signer:', signerError);
    }

    // Check if all signers are complete
    const allComplete = submission.submitters.every((s) => s.status === 'completed');

    if (allComplete) {
      // Update the signing request status
      await supabase
        .from('signing_requests')
        .update({
          status: 'signed',
          signed_document_url: submission.combined_document_url,
          updated_at: new Date().toISOString(),
        })
        .eq('docuseal_submission_id', submissionId);
    }

    return { success: true };
  } catch (error) {
    console.error('Error handling signing completion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process signing completion',
    };
  }
}

/**
 * Handle signing events from DocuSeal webhook
 */
export async function handleWebhookEvent(
  event: {
    event_type: 'form.viewed' | 'form.started' | 'form.completed' | 'form.declined';
    timestamp: string;
    data: {
      id: number;
      submission_id: number;
      email: string;
      status: string;
      completed_at?: string;
      declined_at?: string;
    };
  }
): Promise<{ success: boolean }> {
  const { event_type, data } = event;

  let status: string;
  let updateData: Record<string, unknown> = {};

  switch (event_type) {
    case 'form.viewed':
      status = 'opened';
      updateData = { opened_at: new Date().toISOString() };
      break;
    case 'form.started':
      status = 'opened';
      break;
    case 'form.completed':
      status = 'signed';
      updateData = { signed_at: data.completed_at };
      break;
    case 'form.declined':
      status = 'declined';
      updateData = { declined_at: data.declined_at };
      break;
    default:
      return { success: true };
  }

  // Update signer status
  await supabase
    .from('signing_request_signers')
    .update({
      status,
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('docuseal_signer_id', data.id.toString());

  // Log to audit table
  const { data: signer } = await supabase
    .from('signing_request_signers')
    .select('id, signing_request_id')
    .eq('docuseal_signer_id', data.id.toString())
    .single();

  if (signer) {
    await supabase.from('signing_audit_log').insert({
      signing_request_id: signer.signing_request_id,
      signer_id: signer.id,
      action: event_type.replace('form.', ''),
      details: { docuseal_event: event },
    });
  }

  // If completed, check if all signers are done
  if (event_type === 'form.completed') {
    await handleSigningComplete(data.submission_id.toString(), data.email);
  }

  return { success: true };
}

/**
 * Check if DocuSeal is configured
 */
export function isDocuSealConfigured(): boolean {
  return Boolean(DOCUSEAL_API_KEY);
}

/**
 * Get DocuSeal embed configuration for React component
 */
export function getDocuSealEmbedConfig() {
  return {
    host: DOCUSEAL_API_URL.replace('/api', ''),
    customCss: `
      .docuseal-form {
        font-family: inherit;
      }
      .docuseal-form button {
        border-radius: 8px;
      }
    `,
    withTitle: false,
    withSendButton: false,
    withDownloadButton: true,
  };
}
