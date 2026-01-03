import React, { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { DollarSign, CreditCard, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import toast from 'react-hot-toast';

// Initialize Stripe (will need STRIPE_PUBLIC_KEY from environment)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface PaymentFormProps {
  leaseId: string;
  tenantId?: string;
  amount: number;
  description?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Payment Form Component (inside Stripe Elements)
function CheckoutForm({ amount, description, onSuccess }: { amount: number; description?: string; onSuccess?: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payments/success`,
        },
        redirect: 'if_required'
      });

      if (error) {
        setPaymentStatus('error');
        setErrorMessage(error.message || 'Payment failed');
        toast.error(error.message || 'Payment failed');
      } else {
        setPaymentStatus('success');
        toast.success('Payment successful!');
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500);
        }
      }
    } catch (error: any) {
      setPaymentStatus('error');
      setErrorMessage(error.message || 'An error occurred');
      toast.error(error.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentStatus === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-600">Your payment of ${amount.toFixed(2)} has been processed.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Amount to pay:</span>
          <span className="text-2xl font-bold text-gray-900">${amount.toFixed(2)}</span>
        </div>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <PaymentElement />
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
          isProcessing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-[#20B2AA] hover:bg-[#1a8f88] text-white'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Pay ${amount.toFixed(2)}</span>
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Secure payment powered by Stripe. Your card information is encrypted.
      </p>
    </form>
  );
}

// Main Payment Modal Component
export default function PaymentModal({ leaseId, tenantId, amount, description, onSuccess, onCancel }: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const initializePayment = async () => {
    setLoading(true);
    setError('');

    try {
      const paymentIntent = await paymentService.createPaymentIntent({
        amount,
        leaseId,
        tenantId,
        description: description || `Rent payment - ${new Date().toLocaleDateString()}`,
        currency: 'usd'
      });

      setClientSecret(paymentIntent.clientSecret);
    } catch (error: any) {
      setError(error.message || 'Failed to initialize payment');
      toast.error('Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (amount > 0 && leaseId) {
      initializePayment();
    }
  }, [amount, leaseId]);

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#20B2AA',
      },
    },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#20B2AA] rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Process Payment</h2>
                <p className="text-sm text-gray-600">Secure payment via Stripe</p>
              </div>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-[#20B2AA] animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Initializing payment...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-900 font-medium mb-2">Payment Initialization Failed</p>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={initializePayment}
                className="px-4 py-2 bg-[#20B2AA] text-white rounded-lg hover:bg-[#1a8f88] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm amount={amount} description={description} onSuccess={onSuccess} />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  );
}
