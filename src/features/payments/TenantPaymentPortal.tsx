import React, { useState } from 'react';
import { 
  useTenantPaymentPortalData,
  usePaymentMethods,
  useCreatePaymentIntent,
  useConfirmPayment,
  useAddPaymentMethod,
  useSetupAutopay,
  useCancelAutopay
} from '../../hooks/usePayments';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { 
  CreditCard,
  DollarSign,
  Calendar,
  History,
  Settings,
  Plus,
  Check,
  AlertCircle,
  Clock,
  RefreshCw,
  Download
} from 'lucide-react';

interface TenantPaymentPortalProps {
  tenantId: string;
}

export function TenantPaymentPortal({ tenantId }: TenantPaymentPortalProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [showAutopaySetup, setShowAutopaySetup] = useState(false);

  const { 
    data: portalData, 
    isLoading: portalLoading, 
    error: portalError,
    refetch 
  } = useTenantPaymentPortalData(tenantId);

  const { data: paymentMethods } = usePaymentMethods(tenantId);
  const createPaymentIntent = useCreatePaymentIntent();
  const confirmPayment = useConfirmPayment();
  const addPaymentMethod = useAddPaymentMethod();
  const setupAutopay = useSetupAutopay();
  const cancelAutopay = useCancelAutopay();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'danger';
      case 'failed':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const handleMakePayment = async () => {
    if (!paymentAmount || !selectedPaymentMethod || !portalData?.lease) {
      return;
    }

    setIsProcessing(true);
    try {
      // Create payment intent
      const paymentIntent = await createPaymentIntent.mutateAsync({
        amount: parseFloat(paymentAmount),
        tenantId,
        leaseId: portalData.lease.id,
        description: 'Rent Payment',
      });

      // Confirm payment with selected method
      await confirmPayment.mutateAsync({
        payment_intent_id: paymentIntent.id,
        payment_method_id: selectedPaymentMethod,
        amount: parseFloat(paymentAmount),
        metadata: {
          tenant_id: tenantId,
          lease_id: portalData.lease.id,
        },
      });

      // Reset form
      setPaymentAmount('');
      setSelectedPaymentMethod('');
      
      // Refresh portal data
      refetch();
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleAutopay = async () => {
    if (!portalData?.lease) return;

    try {
      if (portalData.autopay_enabled) {
        await cancelAutopay.mutateAsync(tenantId);
      } else {
        if (selectedPaymentMethod) {
          await setupAutopay.mutateAsync({
            tenant_id: tenantId,
            lease_id: portalData.lease.id,
            payment_method_id: selectedPaymentMethod,
            amount: portalData.lease.rent_amount,
            due_day: portalData.lease.payment_day,
          });
        }
      }
      refetch();
    } catch (error) {
      console.error('Autopay toggle failed:', error);
    }
  };

  if (portalLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (portalError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Portal</h3>
            <p className="text-gray-500 mb-4">Unable to load your payment portal data.</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Payment Portal</h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {portalData?.tenant.first_name}! Manage your rent payments and billing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Balance Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-900">Current Balance</h2>
              {portalData?.outstanding_balance > 0 && (
                <Badge variant="warning">Payment Due</Badge>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(portalData?.outstanding_balance || 0)}
                </div>
                <p className="text-gray-600">Outstanding Balance</p>
                {portalData?.next_due_date && (
                  <p className="text-sm text-gray-500 mt-1">
                    Next due: {formatDate(portalData.next_due_date)}
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-center">
                {portalData?.outstanding_balance > 0 ? (
                  <div className="text-center">
                    <Clock className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                    <p className="text-sm text-orange-600">Payment Required</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-600">All Caught Up!</p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Make Payment Card */}
          {portalData?.outstanding_balance > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Make a Payment</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount
                  </label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full"
                  />
                  <div className="flex space-x-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentAmount(portalData?.outstanding_balance.toString() || '')}
                    >
                      Full Balance
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentAmount(portalData?.lease.rent_amount.toString() || '')}
                    >
                      Monthly Rent
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                  >
                    <option value="">Select payment method</option>
                    {paymentMethods?.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.type === 'card' ? 
                          `**** **** **** ${method.last4} (${method.brand})` :
                          `**** ${method.last4} (${method.bank_name})`
                        }
                        {method.is_default && ' (Default)'}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowAddPaymentMethod(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Payment Method
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleMakePayment}
                disabled={!paymentAmount || !selectedPaymentMethod || isProcessing}
                className="w-full md:w-auto"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Pay {paymentAmount ? formatCurrency(parseFloat(paymentAmount)) : 'Amount'}
                  </>
                )}
              </Button>
            </Card>
          )}

          {/* Payment History */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            <div className="space-y-3">
              {portalData?.recent_payments.length > 0 ? (
                portalData.recent_payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(payment.payment_date)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={getStatusBadgeVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        Receipt
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h4>
                  <p className="text-gray-500">Your payment history will appear here.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property Info */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Lease Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Property</p>
                <p className="font-medium text-gray-900">{portalData?.lease.property?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Rent</p>
                <p className="font-medium text-gray-900">
                  {formatCurrency(portalData?.lease.rent_amount || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Due Date</p>
                <p className="font-medium text-gray-900">
                  {portalData?.lease.payment_day}th of each month
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Lease Term</p>
                <p className="font-medium text-gray-900">
                  {formatDate(portalData?.lease.start_date || '')} - {formatDate(portalData?.lease.end_date || '')}
                </p>
              </div>
            </div>
          </Card>

          {/* AutoPay Settings */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">AutoPay</h3>
              <Badge variant={portalData?.autopay_enabled ? 'success' : 'secondary'}>
                {portalData?.autopay_enabled ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              {portalData?.autopay_enabled
                ? 'Your rent is automatically paid each month.'
                : 'Set up automatic monthly payments for convenience.'}
            </p>

            <Button
              variant={portalData?.autopay_enabled ? 'outline' : 'default'}
              size="sm"
              onClick={handleToggleAutopay}
              disabled={!selectedPaymentMethod && !portalData?.autopay_enabled}
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              {portalData?.autopay_enabled ? 'Disable AutoPay' : 'Setup AutoPay'}
            </Button>
          </Card>

          {/* Payment Methods */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Payment Methods</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddPaymentMethod(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {paymentMethods?.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {method.type === 'card' ? 
                          `**** ${method.last4}` :
                          `**** ${method.last4}`
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {method.type === 'card' ? method.brand : method.bank_name}
                      </div>
                    </div>
                  </div>
                  {method.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              )) || (
                <div className="text-center py-4">
                  <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No payment methods</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}