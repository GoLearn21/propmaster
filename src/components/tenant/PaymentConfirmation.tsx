/**
 * Payment Confirmation Component
 * Success/failure UI after payment processing
 * Provides receipt download and next steps
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Download,
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface PaymentConfirmationProps {
  success: boolean;
  amount: number;
  paymentId?: string;
  receiptUrl?: string;
  errorMessage?: string;
  paymentMethod?: {
    type: 'card' | 'us_bank_account';
    last4: string;
    brand?: string;
    bank_name?: string;
  };
  onRetry?: () => void;
  onClose?: () => void;
}

export default function PaymentConfirmation({
  success,
  amount,
  paymentId,
  receiptUrl,
  errorMessage,
  paymentMethod,
  onRetry,
  onClose,
}: PaymentConfirmationProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(new Date());

  if (success) {
    return (
      <div className="text-center py-8">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-6">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>

        {/* Success Message */}
        <h2 className="text-2xl font-bold text-neutral-darkest mb-2">
          Payment Successful!
        </h2>
        <p className="text-neutral-dark mb-6">
          Your payment has been processed successfully.
        </p>

        {/* Amount */}
        <div className="mb-6">
          <p className="text-4xl font-bold text-neutral-darkest">{formattedAmount}</p>
          <p className="text-sm text-neutral mt-1">Rent payment</p>
        </div>

        {/* Payment Details */}
        <div className="bg-neutral-lightest rounded-lg p-4 mb-6 max-w-sm mx-auto">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-neutral flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </span>
              <span className="text-neutral-darkest font-medium">{formattedDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time
              </span>
              <span className="text-neutral-darkest font-medium">{formattedTime}</span>
            </div>
            {paymentMethod && (
              <div className="flex items-center justify-between">
                <span className="text-neutral">Payment Method</span>
                <span className="text-neutral-darkest font-medium">
                  {paymentMethod.type === 'card'
                    ? `${paymentMethod.brand?.charAt(0).toUpperCase()}${paymentMethod.brand?.slice(1)} ****${paymentMethod.last4}`
                    : `${paymentMethod.bank_name} ****${paymentMethod.last4}`
                  }
                </span>
              </div>
            )}
            {paymentId && (
              <div className="flex items-center justify-between">
                <span className="text-neutral flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Confirmation
                </span>
                <span className="text-neutral-darkest font-mono text-xs">
                  {paymentId.slice(0, 12)}...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 max-w-xs mx-auto">
          {receiptUrl && (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-neutral-lightest hover:bg-neutral-light rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              Download Receipt
            </a>
          )}

          <Link
            to="/tenant/payments/history"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            View Payment History
            <ArrowRight className="h-4 w-4" />
          </Link>

          {onClose && (
            <Button
              variant="primary"
              size="lg"
              onClick={onClose}
              className="w-full"
            >
              Done
            </Button>
          )}
        </div>

        {/* Note */}
        <p className="text-xs text-neutral mt-6">
          A confirmation email has been sent to your registered email address.
        </p>
      </div>
    );
  }

  // Failure state
  return (
    <div className="text-center py-8">
      {/* Error Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-error/10 mb-6">
        <XCircle className="h-10 w-10 text-error" />
      </div>

      {/* Error Message */}
      <h2 className="text-2xl font-bold text-neutral-darkest mb-2">
        Payment Failed
      </h2>
      <p className="text-neutral-dark mb-4">
        We couldn't process your payment.
      </p>

      {/* Error Details */}
      {errorMessage && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6 max-w-sm mx-auto">
          <div className="flex items-start gap-3 text-left">
            <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Amount Attempted */}
      <div className="mb-6">
        <p className="text-lg text-neutral line-through">{formattedAmount}</p>
        <p className="text-sm text-neutral mt-1">Payment not processed</p>
      </div>

      {/* Suggestions */}
      <div className="bg-neutral-lightest rounded-lg p-4 mb-6 max-w-sm mx-auto text-left">
        <p className="text-sm font-medium text-neutral-darkest mb-2">
          What you can try:
        </p>
        <ul className="text-sm text-neutral space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary">1.</span>
            Check your card details and try again
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">2.</span>
            Use a different payment method
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">3.</span>
            Contact your bank if the issue persists
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="space-y-3 max-w-xs mx-auto">
        {onRetry && (
          <Button
            variant="primary"
            size="lg"
            onClick={onRetry}
            className="w-full"
          >
            Try Again
          </Button>
        )}

        <Link
          to="/tenant/payments/methods"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 text-primary hover:bg-primary/5 rounded-lg transition-colors"
        >
          Manage Payment Methods
          <ArrowRight className="h-4 w-4" />
        </Link>

        {onClose && (
          <button
            onClick={onClose}
            className="w-full px-4 py-3 text-neutral hover:text-neutral-dark transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Support */}
      <p className="text-xs text-neutral mt-6">
        Need help?{' '}
        <Link to="/tenant/support" className="text-primary hover:underline">
          Contact Support
        </Link>
      </p>
    </div>
  );
}

/**
 * Payment Processing Component
 * Shows while payment is being processed
 */
export function PaymentProcessing({ amount }: { amount: number }) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  return (
    <div className="text-center py-12">
      {/* Loading Animation */}
      <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-neutral-light"></div>
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <span className="text-2xl">$</span>
      </div>

      {/* Message */}
      <h2 className="text-xl font-bold text-neutral-darkest mb-2">
        Processing Payment...
      </h2>
      <p className="text-neutral-dark mb-4">
        Please wait while we process your {formattedAmount} payment.
      </p>

      {/* Security Note */}
      <p className="text-xs text-neutral">
        Do not close this window or refresh the page.
      </p>
    </div>
  );
}

/**
 * ACH Pending Component
 * Shows when ACH payment is submitted but pending bank processing
 */
export function ACHPending({
  amount,
  estimatedDate,
  onClose,
}: {
  amount: number;
  estimatedDate?: string;
  onClose?: () => void;
}) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  const defaultEstimate = new Date();
  defaultEstimate.setDate(defaultEstimate.getDate() + 3);
  const displayDate = estimatedDate || defaultEstimate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="text-center py-8">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
        <Clock className="h-10 w-10 text-primary" />
      </div>

      {/* Message */}
      <h2 className="text-2xl font-bold text-neutral-darkest mb-2">
        Payment Submitted
      </h2>
      <p className="text-neutral-dark mb-6">
        Your ACH payment is being processed.
      </p>

      {/* Amount */}
      <div className="mb-6">
        <p className="text-4xl font-bold text-neutral-darkest">{formattedAmount}</p>
        <p className="text-sm text-neutral mt-1">Bank transfer (ACH)</p>
      </div>

      {/* Timeline */}
      <div className="bg-neutral-lightest rounded-lg p-4 mb-6 max-w-sm mx-auto">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium text-neutral-darkest">
              Expected completion
            </p>
            <p className="text-sm text-neutral">{displayDate}</p>
          </div>
        </div>
        <p className="text-xs text-neutral mt-3">
          Bank transfers typically take 2-3 business days to complete.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 max-w-xs mx-auto">
        <Link
          to="/tenant/payments/history"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 text-primary hover:bg-primary/5 rounded-lg transition-colors"
        >
          Track Payment Status
          <ArrowRight className="h-4 w-4" />
        </Link>

        {onClose && (
          <Button
            variant="primary"
            size="lg"
            onClick={onClose}
            className="w-full"
          >
            Done
          </Button>
        )}
      </div>

      {/* Note */}
      <p className="text-xs text-neutral mt-6">
        You'll receive an email notification when your payment is complete.
      </p>
    </div>
  );
}
