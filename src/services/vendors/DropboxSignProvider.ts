/**
 * Dropbox Sign (formerly HelloSign) eSignature Provider
 * Official Dropbox Sign API integration for document signing workflows
 */

import { 
  IESignatureProvider, 
  SignatureRequest, 
  CreateSignatureRequest 
} from './IESignatureProvider';

export interface DropboxSignConfig {
  apiKey: string;
  clientId?: string;
  environment: 'production' | 'sandbox';
  baseUrl?: string;
}

export class DropboxSignProvider implements IESignatureProvider {
  private config: DropboxSignConfig;
  private baseUrl: string;

  constructor(config: DropboxSignConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 
      (config.environment === 'production' 
        ? 'https://api.hellosign.com' 
        : 'https://api.hellosign.com'); // Dropbox Sign uses same URL for sandbox
  }

  getName(): string {
    return 'Dropbox Sign';
  }

  async createSignatureRequest(request: CreateSignatureRequest): Promise<SignatureRequest> {
    try {
      console.log('Dropbox Sign: Creating signature request for', request.documentName);

      const formData = new FormData();
      
      // Basic request parameters
      formData.append('title', request.documentName);
      formData.append('subject', request.subject || `Please sign: ${request.documentName}`);
      formData.append('message', request.message || 'Please review and sign this document.');
      
      if (request.testMode) {
        formData.append('test_mode', '1');
      }

      // Add signers
      request.signers.forEach((signer, index) => {
        formData.append(`signers[${index}][name]`, signer.name);
        formData.append(`signers[${index}][email_address]`, signer.email);
        if (signer.order !== undefined) {
          formData.append(`signers[${index}][order]`, signer.order.toString());
        }
      });

      // Handle document input
      if (request.documentBase64) {
        // Convert base64 to blob and append as file
        const blob = this.base64ToBlob(request.documentBase64);
        formData.append('file[0]', blob, request.documentName);
      } else if (request.documentUrl) {
        formData.append('file_url[0]', request.documentUrl);
      } else {
        throw new Error('Either documentBase64 or documentUrl must be provided');
      }

      const response = await fetch(`${this.baseUrl}/v3/signature_request/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Dropbox Sign API Error:', response.status, errorData);
        throw new Error(`Dropbox Sign API Error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('Dropbox Sign: Signature request created:', result.signature_request.signature_request_id);

      return this.transformSignatureRequest(result.signature_request);
    } catch (error) {
      console.error('Dropbox Sign signature request creation failed:', error);
      throw new Error(`Dropbox Sign signature request failed: ${error.message}`);
    }
  }

  async getSignatureRequest(requestId: string): Promise<SignatureRequest> {
    try {
      console.log('Dropbox Sign: Fetching signature request:', requestId);

      const response = await fetch(`${this.baseUrl}/v3/signature_request/${requestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Dropbox Sign API Error:', response.status, errorData);
        throw new Error(`Dropbox Sign API Error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('Dropbox Sign: Signature request fetched:', result.signature_request.status);

      return this.transformSignatureRequest(result.signature_request);
    } catch (error) {
      console.error('Dropbox Sign signature request fetch failed:', error);
      throw new Error(`Dropbox Sign signature request fetch failed: ${error.message}`);
    }
  }

  async cancelSignatureRequest(requestId: string): Promise<boolean> {
    try {
      console.log('Dropbox Sign: Cancelling signature request:', requestId);

      const response = await fetch(`${this.baseUrl}/v3/signature_request/cancel/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Dropbox Sign API Error:', response.status, errorData);
        return false;
      }

      console.log('Dropbox Sign: Signature request cancelled successfully');
      return true;
    } catch (error) {
      console.error('Dropbox Sign cancellation failed:', error);
      return false;
    }
  }

  async downloadSignedDocument(requestId: string): Promise<{ url: string; filename: string }> {
    try {
      console.log('Dropbox Sign: Downloading signed document for:', requestId);

      const response = await fetch(`${this.baseUrl}/v3/signature_request/files/${requestId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Dropbox Sign API Error:', response.status, errorData);
        throw new Error(`Dropbox Sign API Error: ${response.status} - ${errorData}`);
      }

      // Get the signed document as blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename = `signed_document_${requestId}.pdf`;

      console.log('Dropbox Sign: Document downloaded successfully');

      return { url, filename };
    } catch (error) {
      console.error('Dropbox Sign document download failed:', error);
      throw new Error(`Dropbox Sign document download failed: ${error.message}`);
    }
  }

  async sendReminder(requestId: string, signerEmail: string): Promise<boolean> {
    try {
      console.log('Dropbox Sign: Sending reminder for request:', requestId, 'to:', signerEmail);

      const formData = new FormData();
      formData.append('email_address', signerEmail);

      const response = await fetch(`${this.baseUrl}/v3/signature_request/remind/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Dropbox Sign API Error:', response.status, errorData);
        return false;
      }

      console.log('Dropbox Sign: Reminder sent successfully');
      return true;
    } catch (error) {
      console.error('Dropbox Sign reminder failed:', error);
      return false;
    }
  }

  private transformSignatureRequest(data: any): SignatureRequest {
    return {
      id: data.signature_request_id,
      documentName: data.title,
      documentUrl: data.files_url,
      signers: data.signatures?.map((sig: any) => ({
        email: sig.signer_email_address,
        name: sig.signer_name,
        role: this.mapSignerRole(sig.signer_role || 'tenant'),
      })) || [],
      status: this.mapStatus(data.status_code),
      createdAt: new Date(data.created_at * 1000), // Dropbox Sign uses Unix timestamp
      completedAt: data.status_code === 'signed' && data.signatures_complete_at 
        ? new Date(data.signatures_complete_at * 1000) 
        : undefined,
    };
  }

  private mapStatus(dropboxSignStatus: string): 'draft' | 'sent' | 'signed' | 'declined' | 'expired' {
    switch (dropboxSignStatus) {
      case 'signed':
        return 'signed';
      case 'declined':
        return 'declined';
      case 'expired':
        return 'expired';
      case 'awaiting_signature':
      case 'partial':
        return 'sent';
      case 'draft':
      default:
        return 'draft';
    }
  }

  private mapSignerRole(role: string): 'tenant' | 'landlord' | 'witness' | 'guarantor' {
    switch (role.toLowerCase()) {
      case 'tenant':
      case 'renter':
        return 'tenant';
      case 'landlord':
      case 'owner':
      case 'manager':
        return 'landlord';
      case 'witness':
        return 'witness';
      case 'guarantor':
      case 'cosigner':
        return 'guarantor';
      default:
        return 'tenant';
    }
  }

  private base64ToBlob(base64: string): Blob {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:.*,/, '');
    
    // Convert base64 to binary
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'application/pdf' });
  }

  // Template management for common lease documents
  async createTemplate(name: string, documentBase64: string, roles: Array<{ name: string; role: string }>): Promise<{ templateId: string }> {
    try {
      console.log('Dropbox Sign: Creating template:', name);

      const formData = new FormData();
      formData.append('title', name);
      formData.append('test_mode', this.config.environment === 'sandbox' ? '1' : '0');

      // Add document
      const blob = this.base64ToBlob(documentBase64);
      formData.append('file[0]', blob, `${name}.pdf`);

      // Add signer roles
      roles.forEach((role, index) => {
        formData.append(`signer_roles[${index}][name]`, role.name);
        formData.append(`signer_roles[${index}][order]`, index.toString());
      });

      const response = await fetch(`${this.baseUrl}/v3/template/create_embedded_draft`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Dropbox Sign template creation failed: ${errorData}`);
      }

      const result = await response.json();
      return { templateId: result.template.template_id };
    } catch (error) {
      console.error('Dropbox Sign template creation failed:', error);
      throw new Error(`Template creation failed: ${error.message}`);
    }
  }

  // Webhook signature validation for Dropbox Sign callbacks
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      // Dropbox Sign uses HMAC-SHA256 for webhook signatures
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Dropbox Sign webhook signature validation failed:', error);
      return false;
    }
  }

  // Get account information
  async getAccountInfo(): Promise<{ accountId: string; quotaTotal: number; quotaUsed: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/v3/account`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Dropbox Sign account info failed: ${errorData}`);
      }

      const result = await response.json();
      return {
        accountId: result.account.account_id,
        quotaTotal: result.account.quota_total,
        quotaUsed: result.account.quota_used,
      };
    } catch (error) {
      console.error('Dropbox Sign account info failed:', error);
      throw new Error(`Account info failed: ${error.message}`);
    }
  }
}