/**
 * Plaid Link Button Component
 * One-click bank account connection via Plaid Link
 * Provides instant ACH verification (no micro-deposits)
 */

import React, { useState } from 'react';
import { Building2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  connectBankAccount,
  BankAccountDetails,
  getACHFeeDescription,
  isPlaidAvailable,
} from '../../services/tenant/plaidService';

interface PlaidLinkButtonProps {
  tenantId: string;
  onSuccess: (bankAccount: BankAccountDetails) => void;
  onError?: (error: string) => void;
  variant?: 'primary' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  showFeeInfo?: boolean;
}

export default function PlaidLinkButton({
  tenantId,
  onSuccess,
  onError,
  variant = 'outline',
  size = 'md',
  fullWidth = false,
  showFeeInfo = true,
}: PlaidLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Handle bank connection
   */
  const handleConnect = async () => {
    if (!isPlaidAvailable()) {
      const msg = 'Bank connection is not configured';
      setErrorMessage(msg);
      setStatus('error');
      if (onError) onError(msg);
      return;
    }

    setLoading(true);
    setStatus('connecting');
    setErrorMessage(null);

    await connectBankAccount(
      tenantId,
      (bankAccount: BankAccountDetails) => {
        setLoading(false);
        setStatus('success');
        onSuccess(bankAccount);

        // Reset status after 3 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      },
      (error: string) => {
        setLoading(false);
        setStatus('error');
        setErrorMessage(error);
        if (onError) onError(error);

        // Reset status after 5 seconds
        setTimeout(() => {
          setStatus('idle');
          setErrorMessage(null);
        }, 5000);
      },
      () => {
        // User cancelled
        setLoading(false);
        setStatus('idle');
      }
    );
  };

  /**
   * Render button content based on status
   */
  const renderButtonContent = () => {
    switch (status) {
      case 'connecting':
        return (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
            Connecting...
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-2 text-success" />
            Bank Connected!
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="h-4 w-4 mr-2" />
            Try Again
          </>
        );
      default:
        return (
          <>
            <Building2 className="h-4 w-4 mr-2" />
            Connect Bank Account
          </>
        );
    }
  };

  /**
   * Get button variant based on status
   */
  const getButtonVariant = () => {
    if (status === 'success') return 'secondary';
    if (status === 'error') return 'outline';
    return variant;
  };

  // Calculate example fee for $1000 payment
  const exampleFeeDescription = getACHFeeDescription(1000);

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      <Button
        type="button"
        variant={getButtonVariant()}
        size={size}
        onClick={handleConnect}
        disabled={loading || status === 'success'}
        className={`${fullWidth ? 'w-full' : ''} flex items-center justify-center`}
      >
        {renderButtonContent()}
      </Button>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-2 flex items-start gap-2 text-sm text-error">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Fee Info */}
      {showFeeInfo && status === 'idle' && (
        <div className="mt-3 flex items-start gap-2 text-xs text-neutral">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <div>
            <p>
              <strong>Lower fees:</strong> Only 0.8% (max $5) per payment
            </p>
            <p className="text-neutral-dark mt-0.5">
              Example: {exampleFeeDescription} on a $1,000 payment
            </p>
          </div>
        </div>
      )}

      {/* Security Note */}
      {status === 'idle' && (
        <p className="mt-2 text-xs text-neutral text-center">
          Secure bank connection powered by Plaid
        </p>
      )}
    </div>
  );
}

/**
 * Bank Account Card Component
 * Displays a connected bank account with actions
 */
interface BankAccountCardProps {
  bankName: string;
  last4: string;
  accountType: string;
  isDefault?: boolean;
  isVerified?: boolean;
  onSetDefault?: () => void;
  onDelete?: () => void;
}

export function BankAccountCard({
  bankName,
  last4,
  accountType,
  isDefault = false,
  isVerified = true,
  onSetDefault,
  onDelete,
}: BankAccountCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-neutral-light rounded-lg hover:border-neutral transition-colors">
      <div className="flex items-center gap-4">
        {/* Bank Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>

        {/* Account Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-neutral-darkest">{bankName}</span>
            {isDefault && (
              <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                Default
              </span>
            )}
          </div>
          <p className="text-sm text-neutral">
            {accountType.charAt(0).toUpperCase() + accountType.slice(1)} ****{last4}
          </p>
          {isVerified && (
            <p className="text-xs text-success flex items-center gap-1 mt-1">
              <CheckCircle className="h-3 w-3" />
              Verified
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!isDefault && onSetDefault && (
          <button
            onClick={onSetDefault}
            className="text-sm text-primary hover:text-primary-dark transition-colors"
          >
            Set Default
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-sm text-neutral hover:text-error transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
