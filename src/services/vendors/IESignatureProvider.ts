/**
 * eSignature Provider Interface
 * Supports multiple vendors: Dropbox Sign (HelloSign), DocuSign, Adobe Sign, etc.
 */

export interface SignatureRequest {
  id: string;
  documentName: string;
  documentUrl: string;
  signers: Array<{
    email: string;
    name: string;
    role: 'tenant' | 'landlord' | 'witness' | 'guarantor';
  }>;
  status: 'draft' | 'sent' | 'signed' | 'declined' | 'expired';
  createdAt: Date;
  completedAt?: Date;
}

export interface CreateSignatureRequest {
  documentName: string;
  documentBase64?: string;
  documentUrl?: string;
  signers: Array<{
    email: string;
    name: string;
    role: string;
    order?: number;
  }>;
  subject?: string;
  message?: string;
  testMode?: boolean;
}

export interface IESignatureProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Create a signature request
   */
  createSignatureRequest(request: CreateSignatureRequest): Promise<SignatureRequest>;

  /**
   * Get signature request status
   */
  getSignatureRequest(requestId: string): Promise<SignatureRequest>;

  /**
   * Cancel a signature request
   */
  cancelSignatureRequest(requestId: string): Promise<boolean>;

  /**
   * Download signed document
   */
  downloadSignedDocument(requestId: string): Promise<{ url: string; filename: string }>;

  /**
   * Send reminder to signers
   */
  sendReminder(requestId: string, signerEmail: string): Promise<boolean>;
}
