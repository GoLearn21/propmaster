/**
 * Tenant Payment Methods Page
 * Manage saved credit cards and bank accounts
 * Add, remove, and set default payment methods
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRequireTenantAuth } from '../../contexts/TenantAuthContext';
import {
  CreditCard,
  Building2,
  Plus,
  ChevronLeft,
  AlertCircle,
  Shield,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import AddCardModal from '../../components/tenant/AddCardModal';
import PlaidLinkButton from '../../components/tenant/PlaidLinkButton';
import {
  getPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  PaymentMethod,
  formatCardExpiry,
  isCardExpired,
} from '../../services/tenant/stripeService';
import { getBankAccountTypeDisplay } from '../../services/tenant/plaidService';
import toast from 'react-hot-toast';

export default function TenantPaymentMethodsPage() {
  const { tenant } = useRequireTenantAuth();

  // Data states
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // Confirmation modal
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    method: PaymentMethod | null;
  }>({ isOpen: false, method: null });

  /**
   * Load payment methods on mount
   */
  useEffect(() => {
    if (tenant) {
      loadPaymentMethods();
    }
  }, [tenant]);

  /**
   * Load all payment methods
   */
  async function loadPaymentMethods() {
    if (!tenant) return;

    try {
      setLoading(true);
      setError(null);
      const methods = await getPaymentMethods(tenant.id);
      setPaymentMethods(methods);
    } catch (err) {
      console.error('Error loading payment methods:', err);
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle set default payment method
   */
  async function handleSetDefault(methodId: string) {
    if (!tenant) return;

    setSettingDefaultId(methodId);

    try {
      const result = await setDefaultPaymentMethod(methodId, tenant.id);
      if (result.success) {
        toast.success('Default payment method updated');
        loadPaymentMethods();
      } else {
        toast.error(result.error || 'Failed to update default');
      }
    } catch (err) {
      console.error('Error setting default:', err);
      toast.error('Failed to update default payment method');
    } finally {
      setSettingDefaultId(null);
    }
  }

  /**
   * Handle delete payment method
   */
  async function handleDelete() {
    if (!tenant || !deleteConfirmation.method) return;

    const methodId = deleteConfirmation.method.id;
    setDeletingId(methodId);

    try {
      const result = await deletePaymentMethod(methodId, tenant.id);
      if (result.success) {
        toast.success('Payment method removed');
        loadPaymentMethods();
      } else {
        toast.error(result.error || 'Failed to remove payment method');
      }
    } catch (err) {
      console.error('Error deleting payment method:', err);
      toast.error('Failed to remove payment method');
    } finally {
      setDeletingId(null);
      setDeleteConfirmation({ isOpen: false, method: null });
    }
  }

  /**
   * Handle payment method added
   */
  function handlePaymentMethodAdded() {
    loadPaymentMethods();
    setShowAddCardModal(false);
    setShowAddBankModal(false);
    toast.success('Payment method added successfully');
  }

  /**
   * Get card brand logo URL
   */
  function getCardBrandLogo(brand: string): string | null {
    const logos: Record<string, string> = {
      visa: 'https://js.stripe.com/v3/fingerprinted/img/visa-729c05c240c4bdb47b03ac81d9945bfe.svg',
      mastercard: 'https://js.stripe.com/v3/fingerprinted/img/mastercard-4d8844094130711885b5e41b28c9848f.svg',
      amex: 'https://js.stripe.com/v3/fingerprinted/img/amex-a49b82f46c5cd6a96a6e418a6ca1717c.svg',
      discover: 'https://js.stripe.com/v3/fingerprinted/img/discover-ac52cd46f89fa40a29a0bfb954e33173.svg',
    };
    return logos[brand?.toLowerCase()] || null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-neutral-dark">Loading payment methods...</p>
        </div>
      </div>
    );
  }

  // Separate cards and bank accounts
  const cards = paymentMethods.filter((m) => m.type === 'card');
  const bankAccounts = paymentMethods.filter((m) => m.type === 'us_bank_account');

  return (
    <div className="min-h-screen bg-neutral-lightest py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/tenant/payments"
            className="flex items-center text-neutral-dark hover:text-primary mb-4 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Payments
          </Link>
          <h1 className="text-3xl font-bold text-neutral-darkest">Payment Methods</h1>
          <p className="mt-2 text-neutral-dark">
            Manage your saved credit cards and bank accounts
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/20 rounded-lg p-4">
            <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Add Payment Method Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button variant="primary" onClick={() => setShowAddCardModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Credit/Debit Card
          </Button>
          <Button variant="outline" onClick={() => setShowAddBankModal(true)}>
            <Building2 className="h-4 w-4 mr-2" />
            Connect Bank Account
          </Button>
        </div>

        {/* Credit/Debit Cards */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-darkest">
                Credit & Debit Cards
              </h2>
              <p className="text-sm text-neutral">
                Processing fee: 2.9% + $0.30
              </p>
            </div>
          </div>

          {cards.length === 0 ? (
            <div className="text-center py-8 bg-neutral-lightest rounded-lg">
              <CreditCard className="h-12 w-12 text-neutral mx-auto mb-3" />
              <p className="text-neutral-dark mb-4">No cards saved</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddCardModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => {
                const expired = card.exp_month && card.exp_year
                  ? isCardExpired(card.exp_month, card.exp_year)
                  : false;
                const logoUrl = getCardBrandLogo(card.brand || '');

                return (
                  <div
                    key={card.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      expired ? 'border-error/30 bg-error/5' : 'border-neutral-light'
                    }`}
                  >
                    {/* Card Logo */}
                    {logoUrl ? (
                      <img src={logoUrl} alt={card.brand} className="h-8 w-auto" />
                    ) : (
                      <div className="flex h-10 w-14 items-center justify-center rounded bg-neutral-lightest">
                        <CreditCard className="h-5 w-5 text-neutral" />
                      </div>
                    )}

                    {/* Card Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-darkest">
                          {card.brand?.charAt(0).toUpperCase()}{card.brand?.slice(1)} ****{card.last4}
                        </span>
                        {card.is_default && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                            Default
                          </span>
                        )}
                        {expired && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-error/10 text-error rounded-full">
                            Expired
                          </span>
                        )}
                      </div>
                      {card.exp_month && card.exp_year && (
                        <p className={`text-sm ${expired ? 'text-error' : 'text-neutral'}`}>
                          Expires {formatCardExpiry(card.exp_month, card.exp_year)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!card.is_default && (
                        <button
                          onClick={() => handleSetDefault(card.id)}
                          disabled={settingDefaultId === card.id}
                          className="text-sm text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
                        >
                          {settingDefaultId === card.id ? 'Setting...' : 'Set Default'}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setDeleteConfirmation({ isOpen: true, method: card })
                        }
                        disabled={deletingId === card.id}
                        className="p-2 text-neutral hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Remove card"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Bank Accounts */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Building2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-darkest">
                Bank Accounts (ACH)
              </h2>
              <p className="text-sm text-success">
                Lower fees: 0.8% (max $5) - Save up to 40%
              </p>
            </div>
          </div>

          {bankAccounts.length === 0 ? (
            <div className="text-center py-8 bg-neutral-lightest rounded-lg">
              <Building2 className="h-12 w-12 text-neutral mx-auto mb-3" />
              <p className="text-neutral-dark mb-2">No bank accounts connected</p>
              <p className="text-sm text-neutral mb-4">
                Connect your bank account to save on processing fees
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddBankModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Connect Bank
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bankAccounts.map((bank) => (
                <div
                  key={bank.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-neutral-light"
                >
                  {/* Bank Icon */}
                  <div className="flex h-10 w-14 items-center justify-center rounded bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>

                  {/* Bank Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-darkest">
                        {bank.bank_name} ****{bank.last4}
                      </span>
                      {bank.is_default && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {bank.account_type && (
                        <span className="text-sm text-neutral capitalize">
                          {getBankAccountTypeDisplay(bank.account_type)}
                        </span>
                      )}
                      {bank.is_verified && (
                        <span className="text-xs text-success flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!bank.is_default && (
                      <button
                        onClick={() => handleSetDefault(bank.id)}
                        disabled={settingDefaultId === bank.id}
                        className="text-sm text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
                      >
                        {settingDefaultId === bank.id ? 'Setting...' : 'Set Default'}
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setDeleteConfirmation({ isOpen: true, method: bank })
                      }
                      disabled={deletingId === bank.id}
                      className="p-2 text-neutral hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                      title="Remove bank account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Security Note */}
        <Card className="p-4 bg-neutral-lightest border-0">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-success flex-shrink-0" />
            <div>
              <p className="font-medium text-neutral-darkest text-sm">
                Your payment information is secure
              </p>
              <p className="text-xs text-neutral mt-1">
                We use Stripe and Plaid to securely store your payment methods.
                Your full card numbers and bank credentials are never stored on our servers.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Card Modal */}
      <AddCardModal
        isOpen={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        tenantId={tenant?.id || ''}
        onSuccess={handlePaymentMethodAdded}
      />

      {/* Add Bank Modal */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowAddBankModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <Card className="relative w-full max-w-md p-6">
              <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
                Connect Bank Account
              </h2>
              <p className="text-neutral-dark mb-6">
                Link your bank account for lower processing fees on rent payments.
              </p>

              {/* Benefits */}
              <div className="bg-success/5 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-success mb-2">
                  Benefits of ACH Payments
                </p>
                <ul className="text-sm text-neutral-dark space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Save up to 40% on processing fees
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Only 0.8% fee (capped at $5)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Instant verification with Plaid
                  </li>
                </ul>
              </div>

              <PlaidLinkButton
                tenantId={tenant?.id || ''}
                onSuccess={() => {
                  handlePaymentMethodAdded();
                  setShowAddBankModal(false);
                }}
                onError={(error) => toast.error(error)}
                variant="primary"
                size="lg"
                fullWidth
                showFeeInfo={false}
              />
              <Button
                variant="outline"
                onClick={() => setShowAddBankModal(false)}
                className="w-full mt-3"
              >
                Cancel
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && deleteConfirmation.method && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() =>
              setDeleteConfirmation({ isOpen: false, method: null })
            }
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <Card className="relative w-full max-w-sm p-6">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10 mb-4">
                  <Trash2 className="h-6 w-6 text-error" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-darkest mb-2">
                  Remove Payment Method?
                </h3>
                <p className="text-sm text-neutral-dark mb-6">
                  Are you sure you want to remove{' '}
                  {deleteConfirmation.method.type === 'card'
                    ? `${deleteConfirmation.method.brand} ****${deleteConfirmation.method.last4}`
                    : `${deleteConfirmation.method.bank_name} ****${deleteConfirmation.method.last4}`
                  }?
                  {deleteConfirmation.method.is_default && (
                    <span className="block text-warning mt-2">
                      This is your default payment method.
                    </span>
                  )}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setDeleteConfirmation({ isOpen: false, method: null })
                    }
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleDelete}
                    disabled={deletingId !== null}
                    className="flex-1 bg-error hover:bg-error/90"
                  >
                    {deletingId ? 'Removing...' : 'Remove'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
