/**
 * Stripe Service for Tenant Portal
 * Handles payment processing, payment methods, and receipts
 * Based on Stripe best practices and market research from Rentvine, DoorLoop, AppFolio
 */

import { supabase } from '../../lib/supabase';

// Stripe.js types (loaded dynamically)
declare global {
  interface Window {
    Stripe?: any;
  }
}

/**
 * Payment method types
 */
export interface PaymentMethod {
  id: string;
  tenant_id: string;
  stripe_payment_method_id: string;
  type: 'card' | 'us_bank_account';
  last4: string;
  brand?: string;
  bank_name?: string;
  account_type?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
}

/**
 * Payment intent result
 */
export interface PaymentIntentResult {
  success: boolean;
  payment_intent_id?: string;
  client_secret?: string;
  status?: string;
  error?: string;
}

/**
 * Setup intent result (for saving payment methods)
 */
export interface SetupIntentResult {
  success: boolean;
  setup_intent_id?: string;
  client_secret?: string;
  error?: string;
}

/**
 * Payment result
 */
export interface PaymentResult {
  success: boolean;
  payment_id?: string;
  receipt_url?: string;
  error?: string;
}

/**
 * Get Stripe publishable key from environment
 */
export function getStripePublishableKey(): string {
  return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
}

/**
 * Load Stripe.js dynamically
 */
let stripePromise: Promise<any> | null = null;

export async function loadStripe(): Promise<any> {
  if (stripePromise) {
    return stripePromise;
  }

  stripePromise = new Promise((resolve, reject) => {
    if (window.Stripe) {
      resolve(window.Stripe(getStripePublishableKey()));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      if (window.Stripe) {
        resolve(window.Stripe(getStripePublishableKey()));
      } else {
        reject(new Error('Stripe.js failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Stripe.js'));
    document.head.appendChild(script);
  });

  return stripePromise;
}

/**
 * Create a Setup Intent for saving payment methods
 * This creates a SetupIntent on the server and returns the client secret
 */
export async function createSetupIntent(
  tenantId: string
): Promise<SetupIntentResult> {
  try {
    // Call Supabase Edge Function to create SetupIntent
    const { data, error } = await supabase.functions.invoke('stripe-create-setup-intent', {
      body: { tenant_id: tenantId },
    });

    if (error) {
      console.error('Error creating setup intent:', error);
      return {
        success: false,
        error: error.message || 'Failed to create setup intent',
      };
    }

    return {
      success: true,
      setup_intent_id: data.setup_intent_id,
      client_secret: data.client_secret,
    };
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return {
      success: false,
      error: 'Failed to create setup intent',
    };
  }
}

/**
 * Create a Payment Intent for processing a payment
 */
export async function createPaymentIntent(
  tenantId: string,
  leaseId: string,
  amount: number,
  paymentMethodId?: string
): Promise<PaymentIntentResult> {
  try {
    // Call Supabase Edge Function to create PaymentIntent
    const { data, error } = await supabase.functions.invoke('stripe-create-payment-intent', {
      body: {
        tenant_id: tenantId,
        lease_id: leaseId,
        amount: Math.round(amount * 100), // Convert to cents
        payment_method_id: paymentMethodId,
      },
    });

    if (error) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error.message || 'Failed to create payment intent',
      };
    }

    return {
      success: true,
      payment_intent_id: data.payment_intent_id,
      client_secret: data.client_secret,
      status: data.status,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: 'Failed to create payment intent',
    };
  }
}

/**
 * Confirm a payment using Stripe.js
 */
export async function confirmPayment(
  clientSecret: string,
  paymentMethodId: string
): Promise<PaymentResult> {
  try {
    const stripe = await loadStripe();

    const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethodId,
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Payment failed',
      };
    }

    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        payment_id: paymentIntent.id,
        receipt_url: paymentIntent.receipt_url,
      };
    }

    return {
      success: false,
      error: `Payment status: ${paymentIntent.status}`,
    };
  } catch (error) {
    console.error('Error confirming payment:', error);
    return {
      success: false,
      error: 'Failed to process payment',
    };
  }
}

/**
 * Get saved payment methods for a tenant
 */
export async function getPaymentMethods(tenantId: string): Promise<PaymentMethod[]> {
  try {
    const { data, error } = await supabase
      .from('tenant_payment_methods')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return [];
  }
}

/**
 * Save a new payment method after successful setup
 */
export async function savePaymentMethod(
  tenantId: string,
  stripePaymentMethodId: string,
  type: 'card' | 'us_bank_account',
  details: {
    last4: string;
    brand?: string;
    bank_name?: string;
    account_type?: string;
    exp_month?: number;
    exp_year?: number;
    is_verified?: boolean;
    plaid_account_id?: string;
  },
  setAsDefault: boolean = false
): Promise<{ success: boolean; method?: PaymentMethod; error?: string }> {
  try {
    // If setting as default, first unset any existing defaults
    if (setAsDefault) {
      await supabase
        .from('tenant_payment_methods')
        .update({ is_default: false })
        .eq('tenant_id', tenantId);
    }

    // Check if this is the first payment method (auto-set as default)
    const { data: existingMethods } = await supabase
      .from('tenant_payment_methods')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);

    const isFirstMethod = !existingMethods || existingMethods.length === 0;

    // Insert new payment method
    const { data, error } = await supabase
      .from('tenant_payment_methods')
      .insert({
        tenant_id: tenantId,
        stripe_payment_method_id: stripePaymentMethodId,
        type,
        last4: details.last4,
        brand: details.brand,
        bank_name: details.bank_name,
        account_type: details.account_type,
        exp_month: details.exp_month,
        exp_year: details.exp_year,
        is_default: setAsDefault || isFirstMethod,
        is_verified: details.is_verified || type === 'card', // Cards are instantly verified
        plaid_account_id: details.plaid_account_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving payment method:', error);
      return {
        success: false,
        error: 'Failed to save payment method',
      };
    }

    return {
      success: true,
      method: data,
    };
  } catch (error) {
    console.error('Error saving payment method:', error);
    return {
      success: false,
      error: 'Failed to save payment method',
    };
  }
}

/**
 * Delete a payment method
 */
export async function deletePaymentMethod(
  methodId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the payment method to check if it's default
    const { data: method } = await supabase
      .from('tenant_payment_methods')
      .select('is_default, stripe_payment_method_id')
      .eq('id', methodId)
      .eq('tenant_id', tenantId)
      .single();

    if (!method) {
      return {
        success: false,
        error: 'Payment method not found',
      };
    }

    // Delete from Stripe via Edge Function
    await supabase.functions.invoke('stripe-detach-payment-method', {
      body: { payment_method_id: method.stripe_payment_method_id },
    });

    // Delete from database
    const { error } = await supabase
      .from('tenant_payment_methods')
      .delete()
      .eq('id', methodId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deleting payment method:', error);
      return {
        success: false,
        error: 'Failed to delete payment method',
      };
    }

    // If this was the default, set another method as default
    if (method.is_default) {
      const { data: remainingMethods } = await supabase
        .from('tenant_payment_methods')
        .select('id')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (remainingMethods && remainingMethods.length > 0) {
        await supabase
          .from('tenant_payment_methods')
          .update({ is_default: true })
          .eq('id', remainingMethods[0].id);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return {
      success: false,
      error: 'Failed to delete payment method',
    };
  }
}

/**
 * Set a payment method as default
 */
export async function setDefaultPaymentMethod(
  methodId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Unset all other defaults
    await supabase
      .from('tenant_payment_methods')
      .update({ is_default: false })
      .eq('tenant_id', tenantId);

    // Set new default
    const { error } = await supabase
      .from('tenant_payment_methods')
      .update({ is_default: true })
      .eq('id', methodId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error setting default payment method:', error);
      return {
        success: false,
        error: 'Failed to set default payment method',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error setting default payment method:', error);
    return {
      success: false,
      error: 'Failed to set default payment method',
    };
  }
}

/**
 * Process a rent payment
 */
export async function processRentPayment(
  tenantId: string,
  leaseId: string,
  amount: number,
  paymentMethodId: string,
  stripePaymentMethodId: string
): Promise<PaymentResult> {
  try {
    // Create payment intent
    const intentResult = await createPaymentIntent(
      tenantId,
      leaseId,
      amount,
      stripePaymentMethodId
    );

    if (!intentResult.success || !intentResult.client_secret) {
      return {
        success: false,
        error: intentResult.error || 'Failed to initiate payment',
      };
    }

    // Confirm the payment
    const paymentResult = await confirmPayment(
      intentResult.client_secret,
      stripePaymentMethodId
    );

    if (!paymentResult.success) {
      // Update payment record as failed
      await recordPaymentResult(
        tenantId,
        leaseId,
        amount,
        'failed',
        intentResult.payment_intent_id,
        paymentResult.error
      );

      return paymentResult;
    }

    // Record successful payment
    const paymentRecord = await recordPaymentResult(
      tenantId,
      leaseId,
      amount,
      'completed',
      paymentResult.payment_id,
      undefined,
      paymentResult.receipt_url
    );

    return {
      success: true,
      payment_id: paymentRecord.id,
      receipt_url: paymentResult.receipt_url,
    };
  } catch (error) {
    console.error('Error processing rent payment:', error);
    return {
      success: false,
      error: 'Failed to process payment',
    };
  }
}

/**
 * Record payment result in database
 */
async function recordPaymentResult(
  tenantId: string,
  leaseId: string,
  amount: number,
  status: 'completed' | 'failed' | 'pending',
  stripePaymentIntentId?: string,
  errorMessage?: string,
  receiptUrl?: string
): Promise<any> {
  // Get property_id from lease
  const { data: lease } = await supabase
    .from('leases')
    .select('property_id')
    .eq('id', leaseId)
    .single();

  const { data, error } = await supabase
    .from('payment_history')
    .insert({
      tenant_id: tenantId,
      lease_id: leaseId,
      property_id: lease?.property_id,
      amount,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'credit_card',
      status,
      stripe_payment_intent_id: stripePaymentIntentId,
      receipt_url: receiptUrl,
      notes: errorMessage ? `Payment failed: ${errorMessage}` : undefined,
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording payment:', error);
  }

  return data;
}

/**
 * Get payment receipt URL
 */
export async function getPaymentReceipt(
  paymentId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('payment_history')
      .select('receipt_url, stripe_payment_intent_id')
      .eq('id', paymentId)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (data.receipt_url) {
      return {
        success: true,
        url: data.receipt_url,
      };
    }

    // Generate receipt via Edge Function if not available
    const { data: receiptData, error: receiptError } = await supabase.functions.invoke(
      'generate-receipt',
      {
        body: {
          payment_id: paymentId,
          stripe_payment_intent_id: data.stripe_payment_intent_id,
        },
      }
    );

    if (receiptError) {
      return {
        success: false,
        error: 'Failed to generate receipt',
      };
    }

    return {
      success: true,
      url: receiptData.url,
    };
  } catch (error) {
    console.error('Error getting payment receipt:', error);
    return {
      success: false,
      error: 'Failed to get receipt',
    };
  }
}

/**
 * Calculate processing fee for a payment
 * ACH: 0.8% capped at $5
 * Card: 2.9% + $0.30
 */
export function calculateProcessingFee(
  amount: number,
  paymentType: 'card' | 'us_bank_account'
): number {
  if (paymentType === 'us_bank_account') {
    // ACH: 0.8% capped at $5
    return Math.min(amount * 0.008, 5);
  } else {
    // Card: 2.9% + $0.30
    return amount * 0.029 + 0.3;
  }
}

/**
 * Get card brand icon name
 */
export function getCardBrandIcon(brand: string): string {
  const brands: Record<string, string> = {
    visa: 'visa',
    mastercard: 'mastercard',
    amex: 'amex',
    discover: 'discover',
    diners: 'diners',
    jcb: 'jcb',
    unionpay: 'unionpay',
  };
  return brands[brand.toLowerCase()] || 'card';
}

/**
 * Format card expiry date
 */
export function formatCardExpiry(month: number, year: number): string {
  return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
}

/**
 * Check if card is expired
 */
export function isCardExpired(month: number, year: number): boolean {
  const now = new Date();
  const expiryDate = new Date(year, month, 0); // Last day of expiry month
  return now > expiryDate;
}
