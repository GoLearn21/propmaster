/**
 * Phase 3B: Tenant Payments Page (Enhanced)
 * Allows tenants to pay rent with Stripe cards and Plaid ACH
 * Includes processing fees display, payment confirmation, and autopay
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRequireTenantAuth } from '../contexts/TenantAuthContext';
import { supabase } from '../lib/supabase';
import {
  CreditCard,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Settings,
  Plus,
  Building2,
  ChevronRight,
  Info,
  Clock,
  Shield,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import AddCardModal from '../components/tenant/AddCardModal';
import PlaidLinkButton from '../components/tenant/PlaidLinkButton';
import { PaymentMethodList } from '../components/tenant/PaymentMethodCard';
import PaymentConfirmation, { PaymentProcessing, ACHPending } from '../components/tenant/PaymentConfirmation';
import {
  getPaymentMethods,
  processRentPayment,
  calculateProcessingFee,
  PaymentMethod,
} from '../services/tenant/stripeService';
import { getACHProcessingFee } from '../services/tenant/plaidService';
import toast from 'react-hot-toast';

/**
 * Tenant balance interface
 */
interface TenantBalance {
  outstanding_amount: number;
  next_payment_amount: number;
  next_payment_due_date: string | null;
  is_overdue: boolean;
  days_until_due: number;
  autopay_enabled: boolean;
}

/**
 * Payment step states
 */
type PaymentStep = 'select' | 'confirm' | 'processing' | 'success' | 'failed' | 'pending';

export default function TenantPaymentsPage() {
  const { tenant } = useRequireTenantAuth();
  const navigate = useNavigate();

  // Data states
  const [balance, setBalance] = useState<TenantBalance | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment flow states
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('select');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    paymentId?: string;
    receiptUrl?: string;
    error?: string;
  } | null>(null);

  // Modal states
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);

  /**
   * Load payment data on mount
   */
  useEffect(() => {
    if (tenant) {
      loadPaymentData();
    }
  }, [tenant]);

  /**
   * Load all payment data
   */
  async function loadPaymentData() {
    if (!tenant) return;

    try {
      setLoading(true);
      setError(null);

      // Get active lease
      const { data: leases, error: leaseError } = await supabase
        .from('leases')
        .select('id, monthly_rent, rent_due_day')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .limit(1);

      if (leaseError || !leases || leases.length === 0) {
        setError('No active lease found');
        setLoading(false);
        return;
      }

      const lease = leases[0];
      setLeaseId(lease.id);

      // Load payment methods
      const methods = await getPaymentMethods(tenant.id);
      setPaymentMethods(methods);

      // Set default selected method
      const defaultMethod = methods.find((m) => m.is_default) || methods[0];
      if (defaultMethod) {
        setSelectedMethod(defaultMethod);
      }

      // CRITICAL FIX: Fetch balance from authoritative source (database)
      // instead of calculating client-side (which caused data inconsistencies)
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('balance_due')
        .eq('id', tenant.id)
        .single();

      // Use the authoritative balance_due from database (single source of truth)
      const outstanding = Number(tenantData?.balance_due || 0);

      // Calculate next due date
      const today = new Date();
      const dueDay = lease.rent_due_day || 1;
      let nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
      if (nextDueDate < today) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      const daysUntilDue = Math.ceil(
        (nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      setBalance({
        outstanding_amount: Math.max(0, outstanding),
        next_payment_amount: lease.monthly_rent,
        next_payment_due_date: nextDueDate.toISOString(),
        is_overdue: outstanding > 0 && daysUntilDue <= 0,
        days_until_due: daysUntilDue,
        autopay_enabled: false, // TODO: Check autopay status
      });

      // Set default payment amount
      setPaymentAmount(lease.monthly_rent);
      setCustomAmount(lease.monthly_rent.toString());
    } catch (err) {
      console.error('Error loading payment data:', err);
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Calculate fee based on selected method
   */
  function getFee(): number {
    if (!selectedMethod) return 0;
    if (selectedMethod.type === 'us_bank_account') {
      return getACHProcessingFee(paymentAmount);
    }
    return calculateProcessingFee(paymentAmount, 'card');
  }

  /**
   * Get total with fee
   */
  function getTotal(): number {
    return paymentAmount + getFee();
  }

  /**
   * Handle payment submission
   */
  async function handlePayment() {
    if (!tenant || !leaseId || !selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setPaymentStep('processing');

    try {
      const result = await processRentPayment(
        tenant.id,
        leaseId,
        paymentAmount,
        selectedMethod.id,
        selectedMethod.stripe_payment_method_id
      );

      setPaymentResult({
        success: result.success,
        paymentId: result.payment_id,
        receiptUrl: result.receipt_url,
        error: result.error,
      });

      if (result.success) {
        // For ACH, show pending state
        if (selectedMethod.type === 'us_bank_account') {
          setPaymentStep('pending');
        } else {
          setPaymentStep('success');
        }
        toast.success('Payment processed successfully!');
      } else {
        setPaymentStep('failed');
        toast.error(result.error || 'Payment failed');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setPaymentResult({
        success: false,
        error: 'An unexpected error occurred',
      });
      setPaymentStep('failed');
      toast.error('An unexpected error occurred');
    }
  }

  /**
   * Handle payment method added
   */
  function handlePaymentMethodAdded() {
    loadPaymentData();
    setShowAddCardModal(false);
    setShowAddBankModal(false);
    toast.success('Payment method added successfully');
  }

  /**
   * Reset payment flow
   */
  function resetPayment() {
    setPaymentStep('select');
    setPaymentResult(null);
    loadPaymentData();
  }

  /**
   * Format currency
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-neutral-dark">Loading payment information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !balance) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
            Unable to Load Payments
          </h2>
          <p className="text-neutral-dark mb-6">{error}</p>
          <Button variant="primary" onClick={() => navigate('/tenant/dashboard')}>
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // Payment processing/confirmation states
  if (paymentStep === 'processing') {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8">
          <PaymentProcessing amount={paymentAmount} />
        </Card>
      </div>
    );
  }

  if (paymentStep === 'success' && paymentResult) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8">
          <PaymentConfirmation
            success={true}
            amount={paymentAmount}
            paymentId={paymentResult.paymentId}
            receiptUrl={paymentResult.receiptUrl}
            paymentMethod={selectedMethod ? {
              type: selectedMethod.type,
              last4: selectedMethod.last4,
              brand: selectedMethod.brand,
              bank_name: selectedMethod.bank_name,
            } : undefined}
            onClose={resetPayment}
          />
        </Card>
      </div>
    );
  }

  if (paymentStep === 'pending') {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8">
          <ACHPending amount={paymentAmount} onClose={resetPayment} />
        </Card>
      </div>
    );
  }

  if (paymentStep === 'failed' && paymentResult) {
    return (
      <div className="min-h-screen bg-neutral-lightest flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8">
          <PaymentConfirmation
            success={false}
            amount={paymentAmount}
            errorMessage={paymentResult.error}
            onRetry={() => setPaymentStep('confirm')}
            onClose={resetPayment}
          />
        </Card>
      </div>
    );
  }

  // Confirmation step
  if (paymentStep === 'confirm') {
    return (
      <div className="min-h-screen bg-neutral-lightest py-8 px-4">
        <div className="max-w-lg mx-auto">
          {/* Back button */}
          <button
            onClick={() => setPaymentStep('select')}
            className="flex items-center text-neutral-dark hover:text-primary mb-6 transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
            Back
          </button>

          <Card className="p-6">
            <h1 className="text-2xl font-bold text-neutral-darkest mb-6">
              Confirm Payment
            </h1>

            {/* Payment Summary */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-neutral-dark">Rent Payment</span>
                <span className="font-medium text-neutral-darkest">
                  {formatCurrency(paymentAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-dark flex items-center gap-1">
                  Processing Fee
                  <Info className="h-4 w-4 text-neutral" title="Fee charged by payment processor" />
                </span>
                <span className="text-neutral-dark">
                  {formatCurrency(getFee())}
                </span>
              </div>
              <div className="border-t border-neutral-light pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-neutral-darkest">Total</span>
                  <span className="text-2xl font-bold text-neutral-darkest">
                    {formatCurrency(getTotal())}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            {selectedMethod && (
              <div className="bg-neutral-lightest rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  {selectedMethod.type === 'card' ? (
                    <CreditCard className="h-5 w-5 text-neutral" />
                  ) : (
                    <Building2 className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <p className="font-medium text-neutral-darkest">
                      {selectedMethod.type === 'card'
                        ? `${selectedMethod.brand} ****${selectedMethod.last4}`
                        : `${selectedMethod.bank_name} ****${selectedMethod.last4}`
                      }
                    </p>
                    <p className="text-xs text-neutral">
                      {selectedMethod.type === 'card' ? 'Credit/Debit Card' : 'Bank Account (ACH)'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ACH Notice */}
            {selectedMethod?.type === 'us_bank_account' && (
              <div className="flex items-start gap-3 bg-primary/5 rounded-lg p-4 mb-6">
                <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-neutral-dark">
                  ACH payments typically take 2-3 business days to complete.
                  You'll receive a confirmation email once processed.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                onClick={handlePayment}
                className="w-full"
              >
                Pay {formatCurrency(getTotal())}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setPaymentStep('select')}
                className="w-full"
              >
                Cancel
              </Button>
            </div>

            {/* Security Note */}
            <p className="text-xs text-neutral text-center mt-4 flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" />
              Secured with 256-bit SSL encryption
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Main payment selection view
  return (
    <div className="min-h-screen bg-neutral-lightest py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-darkest">Payments</h1>
          <p className="mt-2 text-neutral-dark">
            Manage your rent payments and payment methods
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/20 rounded-lg p-4">
            <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Summary */}
          <div className="lg:col-span-2">
            {balance && (
              <Card className={`p-6 border-l-4 ${
                balance.is_overdue ? 'border-l-error' : 'border-l-success'
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-neutral-darkest">
                    Current Balance
                  </h2>
                  <DollarSign className={`h-8 w-8 ${
                    balance.is_overdue ? 'text-error' : 'text-success'
                  }`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-neutral mb-1">Outstanding Balance</p>
                    <p className={`text-3xl font-bold ${
                      balance.is_overdue ? 'text-error' : 'text-neutral-darkest'
                    }`}>
                      {formatCurrency(balance.outstanding_amount)}
                    </p>
                  </div>

                  {balance.next_payment_due_date && (
                    <>
                      <div>
                        <p className="text-sm text-neutral mb-1">Next Payment Due</p>
                        <p className="text-lg font-semibold text-neutral-darkest">
                          {new Date(balance.next_payment_due_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <p className={`text-sm ${
                          balance.is_overdue ? 'text-error' : 'text-neutral'
                        }`}>
                          {balance.is_overdue
                            ? 'Overdue'
                            : `${balance.days_until_due} days remaining`
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-neutral mb-1">Monthly Rent</p>
                        <p className="text-lg font-semibold text-neutral-darkest">
                          {formatCurrency(balance.next_payment_amount)}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {balance.autopay_enabled && (
                  <div className="mt-6 flex items-center gap-2 bg-primary/10 rounded-lg p-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <p className="text-sm text-primary-dark">
                      Autopay is enabled. Your rent will be charged automatically.
                    </p>
                  </div>
                )}
              </Card>
            )}

            {/* Make Payment */}
            <Card className="p-6 mt-6">
              <h2 className="text-xl font-semibold text-neutral-darkest mb-6 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                Make a Payment
              </h2>

              {/* Amount Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-dark mb-3">
                  Payment Amount
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {balance && (
                    <>
                      <button
                        onClick={() => {
                          setPaymentAmount(balance.next_payment_amount);
                          setCustomAmount(balance.next_payment_amount.toString());
                        }}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          paymentAmount === balance.next_payment_amount
                            ? 'border-primary bg-primary/5'
                            : 'border-neutral-light hover:border-neutral'
                        }`}
                      >
                        <p className="text-sm text-neutral mb-1">Monthly Rent</p>
                        <p className="text-xl font-bold text-neutral-darkest">
                          {formatCurrency(balance.next_payment_amount)}
                        </p>
                      </button>
                      {balance.outstanding_amount > balance.next_payment_amount && (
                        <button
                          onClick={() => {
                            setPaymentAmount(balance.outstanding_amount);
                            setCustomAmount(balance.outstanding_amount.toString());
                          }}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            paymentAmount === balance.outstanding_amount
                              ? 'border-primary bg-primary/5'
                              : 'border-neutral-light hover:border-neutral'
                          }`}
                        >
                          <p className="text-sm text-neutral mb-1">Full Balance</p>
                          <p className="text-xl font-bold text-neutral-darkest">
                            {formatCurrency(balance.outstanding_amount)}
                          </p>
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-dark font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setPaymentAmount(parseFloat(e.target.value) || 0);
                    }}
                    className="w-full pl-8 pr-4 py-3 border border-neutral-light rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Enter custom amount"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-neutral-dark">
                    Payment Method
                  </label>
                  <Link
                    to="/tenant/payments/methods"
                    className="text-sm text-primary hover:text-primary-dark transition-colors"
                  >
                    Manage Methods
                  </Link>
                </div>

                {paymentMethods.length > 0 ? (
                  <PaymentMethodList
                    methods={paymentMethods}
                    selectedId={selectedMethod?.id}
                    onSelect={setSelectedMethod}
                    showActions={false}
                  />
                ) : (
                  <div className="text-center py-8 bg-neutral-lightest rounded-lg">
                    <CreditCard className="h-12 w-12 text-neutral mx-auto mb-3" />
                    <p className="text-neutral-dark mb-4">No payment methods saved</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        variant="primary"
                        onClick={() => setShowAddCardModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Card
                      </Button>
                      <PlaidLinkButton
                        tenantId={tenant?.id || ''}
                        onSuccess={handlePaymentMethodAdded}
                        showFeeInfo={false}
                      />
                    </div>
                  </div>
                )}

                {/* Add Payment Method Buttons */}
                {paymentMethods.length > 0 && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setShowAddCardModal(true)}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Card
                    </button>
                    <button
                      onClick={() => setShowAddBankModal(true)}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Bank Account
                    </button>
                  </div>
                )}
              </div>

              {/* Fee Preview */}
              {selectedMethod && paymentAmount > 0 && (
                <div className="bg-neutral-lightest rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-neutral">Payment</span>
                    <span className="text-neutral-darkest">{formatCurrency(paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-neutral flex items-center gap-1">
                      Processing Fee
                      <span className="text-xs">
                        ({selectedMethod.type === 'us_bank_account' ? '0.8% max $5' : '2.9% + $0.30'})
                      </span>
                    </span>
                    <span className="text-neutral-dark">{formatCurrency(getFee())}</span>
                  </div>
                  <div className="border-t border-neutral-light pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-neutral-darkest">Total</span>
                      <span className="font-bold text-lg text-neutral-darkest">
                        {formatCurrency(getTotal())}
                      </span>
                    </div>
                  </div>
                  {selectedMethod.type === 'us_bank_account' && (
                    <p className="text-xs text-success mt-2 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Saving {formatCurrency(calculateProcessingFee(paymentAmount, 'card') - getFee())} with ACH
                    </p>
                  )}
                </div>
              )}

              {/* Pay Button */}
              <Button
                variant="primary"
                size="lg"
                onClick={() => setPaymentStep('confirm')}
                disabled={!selectedMethod || paymentAmount <= 0}
                className="w-full"
              >
                Continue to Payment
              </Button>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold text-neutral-darkest mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to="/tenant/payments/history"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-lightest transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-neutral" />
                    <span className="text-neutral-dark">Payment History</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral" />
                </Link>
                <Link
                  to="/tenant/payments/methods"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-lightest transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-neutral" />
                    <span className="text-neutral-dark">Payment Methods</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral" />
                </Link>
                <Link
                  to="/tenant/settings"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-lightest transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-neutral" />
                    <span className="text-neutral-dark">Autopay Settings</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral" />
                </Link>
              </div>
            </Card>

            {/* Payment Methods Summary */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-darkest">Saved Methods</h3>
                <span className="text-sm text-neutral">{paymentMethods.length}</span>
              </div>
              <div className="space-y-2">
                {paymentMethods.slice(0, 3).map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-neutral-lightest"
                  >
                    {method.type === 'card' ? (
                      <CreditCard className="h-4 w-4 text-neutral" />
                    ) : (
                      <Building2 className="h-4 w-4 text-primary" />
                    )}
                    <span className="text-sm text-neutral-dark flex-1 truncate">
                      ****{method.last4}
                    </span>
                    {method.is_default && (
                      <span className="text-xs text-primary">Default</span>
                    )}
                  </div>
                ))}
                {paymentMethods.length === 0 && (
                  <p className="text-sm text-neutral text-center py-2">
                    No methods saved
                  </p>
                )}
              </div>
            </Card>

            {/* Security Badge */}
            <Card className="p-4 bg-neutral-lightest border-0">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-success" />
                <div>
                  <p className="font-medium text-neutral-darkest text-sm">
                    Secure Payments
                  </p>
                  <p className="text-xs text-neutral">
                    256-bit SSL encryption
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
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
              <h2 className="text-xl font-semibold text-neutral-darkest mb-4">
                Connect Bank Account
              </h2>
              <p className="text-neutral-dark mb-6">
                Link your bank account for lower fees on rent payments.
              </p>
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
    </div>
  );
}
