/**
 * Plaid Service for Tenant Portal
 * Handles ACH bank account verification via Plaid Link
 * Integrates with Stripe for payment method creation
 * Based on Plaid + Stripe integration best practices
 */

import { supabase } from '../../lib/supabase';

/**
 * Plaid Link configuration
 */
export interface PlaidLinkConfig {
  token: string;
  onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => void;
  onExit: (error: PlaidLinkError | null, metadata: PlaidLinkMetadata) => void;
  onEvent?: (eventName: string, metadata: PlaidLinkMetadata) => void;
}

/**
 * Plaid Link metadata
 */
export interface PlaidLinkMetadata {
  institution?: {
    name: string;
    institution_id: string;
  };
  accounts?: PlaidAccount[];
  link_session_id: string;
  transfer_status?: string;
}

/**
 * Plaid account
 */
export interface PlaidAccount {
  id: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  verification_status?: string;
}

/**
 * Plaid Link error
 */
export interface PlaidLinkError {
  error_type: string;
  error_code: string;
  error_message: string;
  display_message: string | null;
}

/**
 * Link token result
 */
export interface LinkTokenResult {
  success: boolean;
  linkToken?: string;
  error?: string;
}

/**
 * Exchange token result
 */
export interface ExchangeTokenResult {
  success: boolean;
  accessToken?: string;
  itemId?: string;
  accounts?: PlaidAccount[];
  stripePaymentMethodId?: string;
  error?: string;
}

/**
 * Bank account details for saving
 */
export interface BankAccountDetails {
  accountId: string;
  institutionName: string;
  accountName: string;
  accountMask: string;
  accountType: string;
  isVerified: boolean;
}

/**
 * Load Plaid Link SDK dynamically
 */
let plaidScriptLoaded = false;

export async function loadPlaidLink(): Promise<boolean> {
  if (plaidScriptLoaded) {
    return true;
  }

  return new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).Plaid) {
      plaidScriptLoaded = true;
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => {
      plaidScriptLoaded = true;
      resolve(true);
    };
    script.onerror = () => reject(new Error('Failed to load Plaid Link SDK'));
    document.head.appendChild(script);
  });
}

/**
 * Create a Plaid Link token for bank account connection
 * This calls a Supabase Edge Function to securely create the token
 */
export async function createLinkToken(tenantId: string): Promise<LinkTokenResult> {
  try {
    const { data, error } = await supabase.functions.invoke('plaid-link-token', {
      body: {
        tenant_id: tenantId,
        client_name: 'PropMaster',
        products: ['auth'],
        country_codes: ['US'],
        language: 'en',
      },
    });

    if (error) {
      console.error('Error creating Plaid link token:', error);
      return {
        success: false,
        error: error.message || 'Failed to create link token',
      };
    }

    return {
      success: true,
      linkToken: data.link_token,
    };
  } catch (error) {
    console.error('Error creating Plaid link token:', error);
    return {
      success: false,
      error: 'Failed to create link token',
    };
  }
}

/**
 * Exchange Plaid public token for access token and create Stripe payment method
 * This handles the Plaid to Stripe integration
 */
export async function exchangePublicToken(
  publicToken: string,
  accountId: string,
  tenantId: string
): Promise<ExchangeTokenResult> {
  try {
    const { data, error } = await supabase.functions.invoke('plaid-exchange-token', {
      body: {
        public_token: publicToken,
        account_id: accountId,
        tenant_id: tenantId,
      },
    });

    if (error) {
      console.error('Error exchanging Plaid token:', error);
      return {
        success: false,
        error: error.message || 'Failed to exchange token',
      };
    }

    return {
      success: true,
      accessToken: data.access_token,
      itemId: data.item_id,
      stripePaymentMethodId: data.stripe_payment_method_id,
      accounts: data.accounts,
    };
  } catch (error) {
    console.error('Error exchanging Plaid token:', error);
    return {
      success: false,
      error: 'Failed to exchange token',
    };
  }
}

/**
 * Open Plaid Link modal for bank account connection
 * Returns a promise that resolves with the selected account info
 */
export async function openPlaidLink(
  linkToken: string,
  onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => void,
  onExit?: (error: PlaidLinkError | null) => void
): Promise<void> {
  // Ensure Plaid SDK is loaded
  await loadPlaidLink();

  const Plaid = (window as any).Plaid;
  if (!Plaid) {
    throw new Error('Plaid SDK not available');
  }

  const handler = Plaid.create({
    token: linkToken,
    onSuccess: (publicToken: string, metadata: PlaidLinkMetadata) => {
      onSuccess(publicToken, metadata);
    },
    onExit: (error: PlaidLinkError | null, metadata: PlaidLinkMetadata) => {
      if (onExit) {
        onExit(error);
      }
    },
    onEvent: (eventName: string, metadata: PlaidLinkMetadata) => {
      console.log('Plaid Link event:', eventName, metadata);
    },
  });

  handler.open();
}

/**
 * Complete bank account connection flow
 * Creates link token, opens Plaid Link, exchanges token, and saves to database
 */
export async function connectBankAccount(
  tenantId: string,
  onSuccess: (bankAccount: BankAccountDetails) => void,
  onError: (error: string) => void,
  onCancel?: () => void
): Promise<void> {
  try {
    // Step 1: Create link token
    const linkTokenResult = await createLinkToken(tenantId);
    if (!linkTokenResult.success || !linkTokenResult.linkToken) {
      onError(linkTokenResult.error || 'Failed to initialize bank connection');
      return;
    }

    // Step 2: Open Plaid Link
    await openPlaidLink(
      linkTokenResult.linkToken,
      async (publicToken: string, metadata: PlaidLinkMetadata) => {
        try {
          // Get selected account
          const selectedAccount = metadata.accounts?.[0];
          if (!selectedAccount) {
            onError('No account selected');
            return;
          }

          // Step 3: Exchange token and create Stripe payment method
          const exchangeResult = await exchangePublicToken(
            publicToken,
            selectedAccount.id,
            tenantId
          );

          if (!exchangeResult.success) {
            onError(exchangeResult.error || 'Failed to verify bank account');
            return;
          }

          // Step 4: Save payment method to database
          const saveResult = await saveBankPaymentMethod(
            tenantId,
            exchangeResult.stripePaymentMethodId!,
            {
              accountId: selectedAccount.id,
              institutionName: metadata.institution?.name || 'Unknown Bank',
              accountName: selectedAccount.name,
              accountMask: selectedAccount.mask,
              accountType: selectedAccount.subtype,
              isVerified: true, // Plaid provides instant verification
            }
          );

          if (!saveResult.success) {
            onError(saveResult.error || 'Failed to save bank account');
            return;
          }

          // Success!
          onSuccess({
            accountId: selectedAccount.id,
            institutionName: metadata.institution?.name || 'Unknown Bank',
            accountName: selectedAccount.name,
            accountMask: selectedAccount.mask,
            accountType: selectedAccount.subtype,
            isVerified: true,
          });
        } catch (error) {
          console.error('Error completing bank connection:', error);
          onError('Failed to complete bank connection');
        }
      },
      (error: PlaidLinkError | null) => {
        if (error) {
          onError(error.display_message || error.error_message || 'Bank connection failed');
        } else if (onCancel) {
          onCancel();
        }
      }
    );
  } catch (error) {
    console.error('Error connecting bank account:', error);
    onError('Failed to connect bank account');
  }
}

/**
 * Save bank payment method to database
 */
async function saveBankPaymentMethod(
  tenantId: string,
  stripePaymentMethodId: string,
  bankDetails: BankAccountDetails
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if this is the first payment method (auto-set as default)
    const { data: existingMethods } = await supabase
      .from('tenant_payment_methods')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);

    const isFirstMethod = !existingMethods || existingMethods.length === 0;

    const { error } = await supabase.from('tenant_payment_methods').insert({
      tenant_id: tenantId,
      stripe_payment_method_id: stripePaymentMethodId,
      type: 'us_bank_account',
      last4: bankDetails.accountMask,
      bank_name: bankDetails.institutionName,
      account_type: bankDetails.accountType,
      is_default: isFirstMethod,
      is_verified: bankDetails.isVerified,
      plaid_account_id: bankDetails.accountId,
    });

    if (error) {
      console.error('Error saving bank payment method:', error);
      return {
        success: false,
        error: 'Failed to save bank account',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving bank payment method:', error);
    return {
      success: false,
      error: 'Failed to save bank account',
    };
  }
}

/**
 * Get ACH processing fee (0.8% capped at $5)
 */
export function getACHProcessingFee(amount: number): number {
  return Math.min(amount * 0.008, 5);
}

/**
 * Get ACH fee description
 */
export function getACHFeeDescription(amount: number): string {
  const fee = getACHProcessingFee(amount);
  if (fee >= 5) {
    return '$5.00 (capped)';
  }
  return `$${fee.toFixed(2)} (0.8%)`;
}

/**
 * Format bank account for display
 */
export function formatBankAccount(bankName: string, last4: string): string {
  return `${bankName} ****${last4}`;
}

/**
 * Get bank account type display name
 */
export function getBankAccountTypeDisplay(accountType: string): string {
  const types: Record<string, string> = {
    checking: 'Checking',
    savings: 'Savings',
    depository: 'Depository',
  };
  return types[accountType.toLowerCase()] || accountType;
}

/**
 * Check if Plaid is available in the current environment
 */
export function isPlaidAvailable(): boolean {
  const key = import.meta.env.VITE_PLAID_CLIENT_ID;
  return !!key;
}

/**
 * Re-verify a bank account (for micro-deposit verification if needed)
 */
export async function reverifyBankAccount(
  paymentMethodId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('plaid-reverify-account', {
      body: {
        payment_method_id: paymentMethodId,
        tenant_id: tenantId,
      },
    });

    if (error) {
      console.error('Error re-verifying bank account:', error);
      return {
        success: false,
        error: error.message || 'Failed to re-verify bank account',
      };
    }

    // Update verification status in database
    await supabase
      .from('tenant_payment_methods')
      .update({ is_verified: true })
      .eq('id', paymentMethodId)
      .eq('tenant_id', tenantId);

    return { success: true };
  } catch (error) {
    console.error('Error re-verifying bank account:', error);
    return {
      success: false,
      error: 'Failed to re-verify bank account',
    };
  }
}
