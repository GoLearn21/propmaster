// Transaction Creation Modal Component
import { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  DollarSign, 
  FileText, 
  Building2, 
  CreditCard,
  User,
  Truck,
  UserCheck,
  Save,
  ArrowLeft,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useTransactionManagement } from '../../hooks/useTransactionManagement';
import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  type TransactionType,
  type TransactionCategory,
  type PaymentMethod,
  type CreateTransactionInput,
  type TransactionFilters
} from '../../types/transaction';

interface TransactionCreationModalProps {
  propertyId?: string;
  unitId?: string;
  leaseId?: string;
  tenantId?: string;
  vendorId?: string;
  ownerId?: string;
  defaultAmount?: number;
  defaultType?: TransactionType;
  onClose: () => void;
  onSuccess: (transaction: any) => void;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 'type', title: 'Transaction Type', description: 'Choose the type of transaction', completed: false },
  { id: 'details', title: 'Transaction Details', description: 'Enter transaction information', completed: false },
  { id: 'parties', title: 'Parties', description: 'Select involved parties', completed: false },
  { id: 'review', title: 'Review', description: 'Review and confirm', completed: false },
];

const TRANSACTION_TYPE_GROUPS = {
  tenant: [
    'post_charge',
    'receive_payment',
    'issue_credit',
    'give_refund',
    'withhold_deposit'
  ],
  vendor: [
    'create_bill',
    'pay_bills',
    'add_credit',
    'management_fees'
  ],
  owner: [
    'owner_contribution',
    'owner_distribution'
  ],
  other: [
    'journal_entry',
    'bank_transfer',
    'bank_deposit',
    'expense',
    'check'
  ]
};

export default function TransactionCreationModal({
  propertyId,
  unitId,
  leaseId,
  tenantId,
  vendorId,
  ownerId,
  defaultAmount,
  defaultType,
  onClose,
  onSuccess
}: TransactionCreationModalProps) {
  const [state, actions] = useTransactionManagement({ propertyId });
  const [currentStep, setCurrentStep] = useState(0);
  const [transactionData, setTransactionData] = useState<Partial<CreateTransactionInput>>({
    property_id: propertyId,
    unit_id: unitId,
    lease_id: leaseId,
    tenant_id: tenantId,
    vendor_id: vendorId,
    owner_id: ownerId,
    amount: defaultAmount,
    transaction_date: new Date().toISOString().split('T')[0],
    currency: 'USD',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const { bankAccounts, transactionTemplates, loading: hookLoading } = state;

  // Load supporting data
  useEffect(() => {
    actions.loadBankAccounts();
    actions.loadTransactionTemplates();
  }, []);

  // Update steps completion status
  const updateStepsCompletion = () => {
    WIZARD_STEPS.forEach((step, index) => {
      step.completed = index < currentStep;
    });
  };

  useEffect(() => {
    updateStepsCompletion();
  }, [currentStep]);

  // Validation
  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepIndex === 0) {
      if (!transactionData.transaction_type) {
        newErrors.transaction_type = 'Transaction type is required';
      }
    }

    if (stepIndex === 1) {
      if (!transactionData.amount || transactionData.amount <= 0) {
        newErrors.amount = 'Amount must be greater than 0';
      }
      if (!transactionData.description) {
        newErrors.description = 'Description is required';
      }
      if (!transactionData.transaction_date) {
        newErrors.transaction_date = 'Transaction date is required';
      }
    }

    if (stepIndex === 2) {
      // Check if at least one party is selected based on transaction type
      const typeGroup = getTransactionTypeGroup(transactionData.transaction_type);
      if (typeGroup === 'tenant' && !transactionData.tenant_id) {
        newErrors.tenant_id = 'Tenant is required for this transaction type';
      } else if (typeGroup === 'vendor' && !transactionData.vendor_id) {
        newErrors.vendor_id = 'Vendor is required for this transaction type';
      } else if (typeGroup === 'owner' && !transactionData.owner_id) {
        newErrors.owner_id = 'Owner is required for this transaction type';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper to get transaction type group
  const getTransactionTypeGroup = (type?: TransactionType): 'tenant' | 'vendor' | 'owner' | 'other' | null => {
    if (!type) return null;
    
    if (TRANSACTION_TYPE_GROUPS.tenant.includes(type)) return 'tenant';
    if (TRANSACTION_TYPE_GROUPS.vendor.includes(type)) return 'vendor';
    if (TRANSACTION_TYPE_GROUPS.owner.includes(type)) return 'owner';
    return 'other';
  };

  // Navigation
  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep(1)) return;

    setLoading(true);
    try {
      const transaction = await actions.createNewTransaction(transactionData as CreateTransactionInput);
      if (transaction) {
        onSuccess(transaction);
      }
    } catch (error) {
      console.error('Failed to create transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const updateTransactionData = (field: string, value: any) => {
    setTransactionData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Transaction Type Selection
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Transaction Type</h3>
              
              {/* Tenant Transactions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Tenant Transactions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TRANSACTION_TYPE_GROUPS.tenant.map(type => (
                    <button
                      key={type}
                      onClick={() => updateTransactionData('transaction_type', type)}
                      className={`p-3 text-left border rounded-lg transition-colors ${
                        transactionData.transaction_type === type
                          ? 'border-teal-500 bg-teal-50 text-teal-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">
                        {TRANSACTION_TYPE_LABELS[type]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vendor Transactions */}
              <div className="space-y-3 mt-6">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Vendor Transactions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TRANSACTION_TYPE_GROUPS.vendor.map(type => (
                    <button
                      key={type}
                      onClick={() => updateTransactionData('transaction_type', type)}
                      className={`p-3 text-left border rounded-lg transition-colors ${
                        transactionData.transaction_type === type
                          ? 'border-teal-500 bg-teal-50 text-teal-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">
                        {TRANSACTION_TYPE_LABELS[type]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Owner Transactions */}
              <div className="space-y-3 mt-6">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Owner Transactions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TRANSACTION_TYPE_GROUPS.owner.map(type => (
                    <button
                      key={type}
                      onClick={() => updateTransactionData('transaction_type', type)}
                      className={`p-3 text-left border rounded-lg transition-colors ${
                        transactionData.transaction_type === type
                          ? 'border-teal-500 bg-teal-50 text-teal-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">
                        {TRANSACTION_TYPE_LABELS[type]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Other Transactions */}
              <div className="space-y-3 mt-6">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Other Transactions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TRANSACTION_TYPE_GROUPS.other.map(type => (
                    <button
                      key={type}
                      onClick={() => updateTransactionData('transaction_type', type)}
                      className={`p-3 text-left border rounded-lg transition-colors ${
                        transactionData.transaction_type === type
                          ? 'border-teal-500 bg-teal-50 text-teal-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">
                        {TRANSACTION_TYPE_LABELS[type]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {errors.transaction_type && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {errors.transaction_type}
              </div>
            )}
          </div>
        );

      case 1: // Transaction Details
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Transaction Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transactionData.amount || ''}
                    onChange={(e) => updateTransactionData('amount', parseFloat(e.target.value) || 0)}
                    className={`pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.amount ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={transactionData.currency || 'USD'}
                  onChange={(e) => updateTransactionData('currency', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="CAD">CAD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              {/* Transaction Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={transactionData.transaction_date || ''}
                    onChange={(e) => updateTransactionData('transaction_date', e.target.value)}
                    className={`pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                      errors.transaction_date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.transaction_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.transaction_date}</p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={transactionData.due_date || ''}
                    onChange={(e) => updateTransactionData('due_date', e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={transactionData.category || ''}
                  onChange={(e) => updateTransactionData('category', e.target.value as TransactionCategory)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {Object.entries(TRANSACTION_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={transactionData.description || ''}
                  onChange={(e) => updateTransactionData('description', e.target.value)}
                  rows={3}
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter transaction description"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              {/* Memo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Memo (Optional)
                </label>
                <textarea
                  value={transactionData.memo || ''}
                  onChange={(e) => updateTransactionData('memo', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Additional notes"
                />
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={transactionData.reference_number || ''}
                  onChange={(e) => updateTransactionData('reference_number', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Invoice #, Check #, etc."
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={transactionData.payment_method || ''}
                    onChange={(e) => updateTransactionData('payment_method', e.target.value as PaymentMethod)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select payment method</option>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bank Account */}
              {transactionData.payment_method && transactionData.payment_method !== 'cash' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Account
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      value={transactionData.bank_account_id || ''}
                      onChange={(e) => updateTransactionData('bank_account_id', e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="">Select bank account</option>
                      {bankAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.nickname} - {account.bank_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Check Number */}
              {transactionData.payment_method === 'check' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Check Number
                  </label>
                  <input
                    type="text"
                    value={transactionData.check_number || ''}
                    onChange={(e) => updateTransactionData('check_number', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Check number"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 2: // Parties
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Select Involved Parties</h3>
            
            {/* Property Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={propertyId || ''}
                  readOnly
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="Property will be automatically selected"
                />
              </div>
            </div>

            {/* Tenant Selection (for tenant transactions) */}
            {getTransactionTypeGroup(transactionData.transaction_type) === 'tenant' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenant *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={tenantId || ''}
                    readOnly
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Tenant will be automatically selected"
                  />
                </div>
                {errors.tenant_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.tenant_id}</p>
                )}
              </div>
            )}

            {/* Vendor Selection (for vendor transactions) */}
            {getTransactionTypeGroup(transactionData.transaction_type) === 'vendor' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor *
                </label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={vendorId || ''}
                    readOnly
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Vendor will be automatically selected"
                  />
                </div>
                {errors.vendor_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.vendor_id}</p>
                )}
              </div>
            )}

            {/* Owner Selection (for owner transactions) */}
            {getTransactionTypeGroup(transactionData.transaction_type) === 'owner' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Owner *
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={ownerId || ''}
                    readOnly
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg bg-gray-50"
                    placeholder="Owner will be automatically selected"
                  />
                </div>
                {errors.owner_id && (
                  <p className="mt-1 text-sm red-600">{errors.owner_id}</p>
                )}
              </div>
            )}

            {/* Unit Selection (if applicable) */}
            {unitId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <input
                  type="text"
                  value={unitId}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                  placeholder="Unit will be automatically selected"
                />
              </div>
            )}

            {/* Lease Selection (if applicable) */}
            {leaseId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lease
                </label>
                <input
                  type="text"
                  value={leaseId}
                  readOnly
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                  placeholder="Lease will be automatically selected"
                />
              </div>
            )}
          </div>
        );

      case 3: // Review
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Review Transaction</h3>
            
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Transaction Type</label>
                  <p className="text-sm text-gray-900">
                    {transactionData.transaction_type && TRANSACTION_TYPE_LABELS[transactionData.transaction_type]}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-sm text-gray-900">
                    {transactionData.amount && new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: transactionData.currency || 'USD'
                    }).format(transactionData.amount)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <p className="text-sm text-gray-900">
                    {transactionData.transaction_date && new Date(transactionData.transaction_date).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="text-sm text-gray-900">
                    {transactionData.payment_method && PAYMENT_METHOD_LABELS[transactionData.payment_method]}
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900">{transactionData.description}</p>
                </div>
                
                {transactionData.memo && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Memo</label>
                    <p className="text-sm text-gray-900">{transactionData.memo}</p>
                  </div>
                )}
                
                {transactionData.reference_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                    <p className="text-sm text-gray-900">{transactionData.reference_number}</p>
                  </div>
                )}
                
                {transactionData.category && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p className="text-sm text-gray-900">
                      {TRANSACTION_CATEGORY_LABELS[transactionData.category]}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Create New Transaction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Wizard Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  index === currentStep
                    ? 'border-teal-500 bg-teal-500 text-white'
                    : step.completed
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 bg-white text-gray-500'
                }`}>
                  {step.completed && index !== currentStep ? (
                    <span className="text-xs">✓</span>
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`w-20 h-0.5 mx-2 ${
                    step.completed ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {WIZARD_STEPS.map(step => (
              <div key={step.id} className="text-center flex-1">
                <p className={`text-xs font-medium ${
                  step.id === WIZARD_STEPS[currentStep].id
                    ? 'text-teal-600'
                    : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousStep}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {currentStep === WIZARD_STEPS.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Creating...' : 'Create Transaction'}
              </button>
            ) : (
              <button
                onClick={goToNextStep}
                className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}