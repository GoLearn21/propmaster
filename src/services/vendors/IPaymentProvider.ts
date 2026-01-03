/**
 * Payment Provider Interface
 * Supports multiple vendors: Stripe, Square, PayPal, etc.
 */

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'ach';
  last4: string;
  brand?: string; // For cards: Visa, Mastercard, etc.
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string; // For ACH
  accountType?: 'checking' | 'savings';
  isDefault: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  paymentMethodId?: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  completedAt?: Date;
}

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  paymentMethodId: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  captureMethod?: 'automatic' | 'manual';
}

export interface RefundRequest {
  paymentIntentId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
}

export interface IPaymentProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Create a customer
   */
  createCustomer(email: string, name: string, metadata?: Record<string, string>): Promise<{ customerId: string }>;

  /**
   * Add payment method to customer
   */
  addPaymentMethod(customerId: string, paymentMethodToken: string): Promise<PaymentMethod>;

  /**
   * Get customer payment methods
   */
  getPaymentMethods(customerId: string): Promise<PaymentMethod[]>;

  /**
   * Delete payment method
   */
  deletePaymentMethod(paymentMethodId: string): Promise<boolean>;

  /**
   * Create payment intent
   */
  createPayment(request: CreatePaymentRequest): Promise<PaymentIntent>;

  /**
   * Get payment status
   */
  getPayment(paymentIntentId: string): Promise<PaymentIntent>;

  /**
   * Process refund
   */
  refundPayment(request: RefundRequest): Promise<{ refundId: string; status: string }>;

  /**
   * Set up recurring payment
   */
  createSubscription(
    customerId: string,
    paymentMethodId: string,
    amount: number,
    interval: 'daily' | 'weekly' | 'monthly' | 'yearly'
  ): Promise<{ subscriptionId: string }>;

  /**
   * Cancel subscription
   */
  cancelSubscription(subscriptionId: string): Promise<boolean>;
}
