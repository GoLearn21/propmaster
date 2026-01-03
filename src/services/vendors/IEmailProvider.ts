/**
 * Email Provider Interface
 * Supports multiple vendors: AWS SES, SendGrid, Mailgun, Postmark, etc.
 */

export interface EmailMessage {
  to: string | string[];
  from: string;
  replyTo?: string;
  subject: string;
  textContent?: string;
  htmlContent?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded
    contentType: string;
  }>;
  cc?: string[];
  bcc?: string[];
  tags?: Record<string, string>;
}

export interface EmailSendResult {
  messageId: string;
  status: 'queued' | 'sent' | 'failed';
  error?: string;
}

export interface IEmailProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Send a single email
   */
  sendEmail(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Send bulk emails
   */
  sendBulkEmails(messages: EmailMessage[]): Promise<EmailSendResult[]>;

  /**
   * Send templated email
   */
  sendTemplateEmail(
    templateId: string,
    to: string | string[],
    data: Record<string, any>
  ): Promise<EmailSendResult>;

  /**
   * Verify email address
   */
  verifyEmailAddress(email: string): Promise<{ valid: boolean; reason?: string }>;
}
