/**
 * Add Card Modal Component
 * Stripe Elements integration for secure card input
 * Based on Stripe best practices for PCI compliance
 */

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import {
  loadStripe,
  createSetupIntent,
  savePaymentMethod,
  calculateProcessingFee,
} from '../../services/tenant/stripeService';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSuccess: () => void;
}

/**
 * Stripe Elements styling
 */
const cardElementStyle = {
  base: {
    color: '#1a1a2e',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    fontSmoothing: 'antialiased',
    fontSize: '16px',
    '::placeholder': {
      color: '#94a3b8',
    },
  },
  invalid: {
    color: '#ef4444',
    iconColor: '#ef4444',
  },
};

export default function AddCardModal({
  isOpen,
  onClose,
  tenantId,
  onSuccess,
}: AddCardModalProps) {
  const [stripe, setStripe] = useState<any>(null);
  const [elements, setElements] = useState<any>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [cardComplete, setCardComplete] = useState(false);

  /**
   * Initialize Stripe Elements
   */
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    async function initStripe() {
      try {
        const stripeInstance = await loadStripe();
        if (!mounted) return;

        setStripe(stripeInstance);
        const elementsInstance = stripeInstance.elements();
        setElements(elementsInstance);

        // Create card element
        const card = elementsInstance.create('card', {
          style: cardElementStyle,
          hidePostalCode: false,
        });

        setCardElement(card);
      } catch (err) {
        console.error('Error initializing Stripe:', err);
        if (mounted) {
          setError('Failed to load payment form');
        }
      }
    }

    initStripe();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  /**
   * Mount card element when ready
   */
  useEffect(() => {
    if (!cardElement || !isOpen) return;

    // Mount the card element
    const cardContainer = document.getElementById('card-element');
    if (cardContainer) {
      cardElement.mount('#card-element');

      // Listen for changes
      cardElement.on('change', (event: any) => {
        setCardComplete(event.complete);
        if (event.error) {
          setError(event.error.message);
        } else {
          setError(null);
        }
      });
    }

    return () => {
      cardElement.unmount();
    };
  }, [cardElement, isOpen]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !cardElement || !cardComplete) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create SetupIntent on server
      const setupResult = await createSetupIntent(tenantId);
      if (!setupResult.success || !setupResult.client_secret) {
        setError(setupResult.error || 'Failed to initialize card setup');
        setLoading(false);
        return;
      }

      // Confirm card setup with Stripe
      const { setupIntent, error: confirmError } = await stripe.confirmCardSetup(
        setupResult.client_secret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (confirmError) {
        setError(confirmError.message || 'Failed to add card');
        setLoading(false);
        return;
      }

      if (setupIntent.status !== 'succeeded') {
        setError(`Card setup failed: ${setupIntent.status}`);
        setLoading(false);
        return;
      }

      // Get card details from payment method
      const paymentMethodId = setupIntent.payment_method;
      const { paymentMethod } = await stripe.paymentMethods.retrieve
        ? await stripe.paymentMethods.retrieve(paymentMethodId)
        : { paymentMethod: null };

      // Fallback: We'll get card details from the setup intent
      const card = paymentMethod?.card || {};

      // Save payment method to database
      const saveResult = await savePaymentMethod(
        tenantId,
        paymentMethodId,
        'card',
        {
          last4: card.last4 || '****',
          brand: card.brand || 'unknown',
          exp_month: card.exp_month,
          exp_year: card.exp_year,
        },
        setAsDefault
      );

      if (!saveResult.success) {
        setError(saveResult.error || 'Failed to save card');
        setLoading(false);
        return;
      }

      // Success!
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error adding card:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Calculate example fee for $1000 payment
  const exampleFee = calculateProcessingFee(1000, 'card');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-light px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-darkest">
                  Add Credit/Debit Card
                </h2>
                <p className="text-sm text-neutral">Secure card storage</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg p-2 text-neutral hover:bg-neutral-lightest transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Error Alert */}
            {error && (
              <div className="mb-4 flex items-start gap-3 rounded-lg bg-error/10 border border-error/20 p-4">
                <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            {/* Card Element */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                Card Information
              </label>
              <div
                id="card-element"
                className="rounded-lg border border-neutral-light p-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all"
              />
              <p className="mt-2 text-xs text-neutral flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Secured with 256-bit SSL encryption
              </p>
            </div>

            {/* Set as Default */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                />
                <span className="text-sm text-neutral-dark">
                  Set as default payment method
                </span>
              </label>
            </div>

            {/* Fee Info */}
            <div className="mb-6 rounded-lg bg-neutral-lightest p-4">
              <p className="text-sm text-neutral-dark">
                <strong>Processing Fee:</strong> 2.9% + $0.30 per transaction
              </p>
              <p className="text-xs text-neutral mt-1">
                Example: ${exampleFee.toFixed(2)} fee on a $1,000 payment
              </p>
              <p className="text-xs text-primary mt-2">
                Tip: Save up to 40% by using a bank account instead
              </p>
            </div>

            {/* Card Logos */}
            <div className="mb-6 flex items-center justify-center gap-4">
              <img
                src="https://js.stripe.com/v3/fingerprinted/img/visa-729c05c240c4bdb47b03ac81d9945bfe.svg"
                alt="Visa"
                className="h-8"
              />
              <img
                src="https://js.stripe.com/v3/fingerprinted/img/mastercard-4d8844094130711885b5e41b28c9848f.svg"
                alt="Mastercard"
                className="h-8"
              />
              <img
                src="https://js.stripe.com/v3/fingerprinted/img/amex-a49b82f46c5cd6a96a6e418a6ca1717c.svg"
                alt="American Express"
                className="h-8"
              />
              <img
                src="https://js.stripe.com/v3/fingerprinted/img/discover-ac52cd46f89fa40a29a0bfb954e33173.svg"
                alt="Discover"
                className="h-8"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading || !cardComplete}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Adding Card...
                  </>
                ) : (
                  'Add Card'
                )}
              </Button>
            </div>
          </form>

          {/* Security Footer */}
          <div className="border-t border-neutral-light bg-neutral-lightest px-6 py-3">
            <p className="text-xs text-neutral text-center flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" />
              Your card is stored securely with Stripe. We never see your full card number.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
