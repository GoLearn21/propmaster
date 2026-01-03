/**
 * SMS Provider Interface
 * Supports multiple vendors: Telnyx, Twilio, Vonage, AWS SNS, etc.
 */

export interface SMSMessage {
  to: string; // E.164 format: +1234567890
  from: string; // Phone number or short code
  body: string;
  mediaUrls?: string[]; // For MMS
}

export interface SMSSendResult {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  to: string;
  cost?: {
    amount: number;
    currency: string;
  };
  error?: string;
}

export interface ISMSProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Send a single SMS
   */
  sendSMS(message: SMSMessage): Promise<SMSSendResult>;

  /**
   * Send bulk SMS
   */
  sendBulkSMS(messages: SMSMessage[]): Promise<SMSSendResult[]>;

  /**
   * Get message status
   */
  getMessageStatus(messageId: string): Promise<{
    status: 'queued' | 'sent' | 'delivered' | 'failed';
    errorCode?: string;
  }>;

  /**
   * Validate phone number
   */
  validatePhoneNumber(phoneNumber: string): Promise<{
    valid: boolean;
    formatted?: string;
    carrier?: string;
    type?: 'mobile' | 'landline' | 'voip';
  }>;
}
