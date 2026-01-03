// Transaction Details Modal Component
import { useState, useEffect } from 'react';
import { 
  X, 
  Edit, 
  Trash2, 
  Check, 
  XCircle, 
  Calendar, 
  DollarSign, 
  FileText, 
  User, 
  Building2, 
  CreditCard,
  Receipt,
  Download,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useTransactionManagement } from '../../hooks/useTransactionManagement';
import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  STATUS_LABELS,
  type Transaction,
  type UpdateTransactionInput
} from '../../types/transaction';

interface TransactionDetailsModalProps {
  transactionId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TransactionDetailsModal({
  transactionId,
  onClose,
  onUpdate
}: TransactionDetailsModalProps) {
  const [state, actions] = useTransactionManagement();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Transaction>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { loading: hookLoading, error } = state;
  const { loadTransaction, updateExistingTransaction, approveTransactionById, voidTransactionById, removeTransaction } = actions;

  // Load transaction details
  useEffect(() => {
    loadTransactionDetails();
  }, [transactionId]);

  const loadTransactionDetails = async () => {
    setLoading(true);
    try {
      const transactionData = await loadTransaction(transactionId);
      if (transactionData) {
        setTransaction(transactionData);
        setEditData({
          description: transactionData.description,
          memo: transactionData.memo,
          amount: transactionData.amount,
          transaction_date: transactionData.transaction_date,
          due_date: transactionData.due_date,
          category: transactionData.category,
          payment_method: transactionData.payment_method,
          reference_number: transactionData.reference_number
        });
      }
    } catch (error) {
      console.error('Failed to load transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle status changes
  const handleApprove = async () => {
    if (await approveTransactionById(transactionId)) {
      await loadTransactionDetails();
      onUpdate();
    }
  };

  const handleVoid = async () => {
    const reason = prompt('Enter reason for voiding this transaction:');
    if (reason && await voidTransactionById(transactionId, reason)) {
      await loadTransactionDetails();
      onUpdate();
    }
  };

  const handleDelete = async () => {
    if (await removeTransaction(transactionId)) {
      onClose();
    }
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!editData) return;

    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      ...editData
    };

    if (await updateExistingTransaction(updateInput)) {
      await loadTransactionDetails();
      setEditMode(false);
      onUpdate();
    }
  };

  // Handle input changes
  const updateEditData = (field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'void': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading || hookLoading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Transaction Not Found</h3>
            <p className="text-gray-600 mb-4">The requested transaction could not be loaded.</p>
            <button
              onClick={onClose}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getStatusIcon(transaction.status)}
              <h2 className="text-xl font-semibold text-gray-900">Transaction Details</h2>
            </div>
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
              {STATUS_LABELS[transaction.status]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!editMode && transaction.status === 'draft' && (
              <>
                <button
                  onClick={handleApprove}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={handleVoid}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  Void
                </button>
              </>
            )}
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Transaction Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Type
                  </label>
                  <p className="text-sm text-gray-900">
                    {TRANSACTION_TYPE_LABELS[transaction.transaction_type]}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  {editMode ? (
                    <select
                      value={editData.category || ''}
                      onChange={(e) => updateEditData('category', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    >
                      {Object.entries(TRANSACTION_CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900">
                      {TRANSACTION_CATEGORY_LABELS[transaction.category]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  {editMode ? (
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editData.amount || ''}
                        onChange={(e) => updateEditData('amount', parseFloat(e.target.value) || 0)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 font-medium">
                      {formatCurrency(transaction.amount)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Description</h3>
              {editMode ? (
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => updateEditData('description', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                />
              ) : (
                <p className="text-sm text-gray-900">{transaction.description}</p>
              )}
              
              {transaction.memo && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Memo
                  </label>
                  {editMode ? (
                    <textarea
                      value={editData.memo || ''}
                      onChange={(e) => updateEditData('memo', e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{transaction.memo}</p>
                  )}
                </div>
              )}
            </div>

            {/* Reference Information */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Reference Information
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editData.reference_number || ''}
                      onChange={(e) => updateEditData('reference_number', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {transaction.reference_number || 'Not specified'}
                    </p>
                  )}
                </div>

                {transaction.check_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check Number
                    </label>
                    <p className="text-sm text-gray-900">{transaction.check_number}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Dates */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Dates
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Date
                  </label>
                  {editMode ? (
                    <input
                      type="date"
                      value={editData.transaction_date || ''}
                      onChange={(e) => updateEditData('transaction_date', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {formatDate(transaction.transaction_date)}
                    </p>
                  )}
                </div>

                {transaction.due_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    {editMode ? (
                      <input
                        type="date"
                        value={editData.due_date || ''}
                        onChange={(e) => updateEditData('due_date', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">
                        {formatDate(transaction.due_date)}
                      </p>
                    )}
                  </div>
                )}

                {transaction.paid_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paid Date
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatDate(transaction.paid_date)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Information
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  {editMode ? (
                    <select
                      value={editData.payment_method || ''}
                      onChange={(e) => updateEditData('payment_method', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900">
                      {transaction.payment_method ? PAYMENT_METHOD_LABELS[transaction.payment_method] : 'Not specified'}
                    </p>
                  )}
                </div>

                {transaction.bank_account && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Account
                    </label>
                    <p className="text-sm text-gray-900">
                      {transaction.bank_account.nickname} - {transaction.bank_account.bank_name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Related Parties */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Related Parties
              </h3>
              
              <div className="space-y-3">
                {transaction.property && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property
                    </label>
                    <p className="text-sm text-gray-900">{transaction.property.name}</p>
                  </div>
                )}

                {transaction.unit && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <p className="text-sm text-gray-900">{transaction.unit.unit_number}</p>
                  </div>
                )}

                {transaction.tenant && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tenant
                    </label>
                    <p className="text-sm text-gray-900">
                      {transaction.tenant.first_name} {transaction.tenant.last_name}
                    </p>
                  </div>
                )}

                {transaction.vendor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor
                    </label>
                    <p className="text-sm text-gray-900">
                      {transaction.vendor.name || transaction.vendor.company}
                    </p>
                  </div>
                )}

                {transaction.owner && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Owner
                    </label>
                    <p className="text-sm text-gray-900">
                      {transaction.owner.first_name} {transaction.owner.last_name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Audit Trail</h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-gray-700 mb-1">Created</label>
                  <p className="text-gray-900">
                    {formatDate(transaction.created_at)}
                    {transaction.created_by_user && (
                      <span className="text-gray-500"> by {transaction.created_by_user.first_name} {transaction.created_by_user.last_name}</span>
                    )}
                  </p>
                </div>

                {transaction.approved_by_user && transaction.approved_at && (
                  <div>
                    <label className="block text-gray-700 mb-1">Approved</label>
                    <p className="text-gray-900">
                      {formatDate(transaction.approved_at)}
                      {transaction.approved_by_user && (
                        <span className="text-gray-500"> by {transaction.approved_by_user.first_name} {transaction.approved_by_user.last_name}</span>
                      )}
                    </p>
                  </div>
                )}

                {transaction.bank_reconciliation_date && (
                  <div>
                    <label className="block text-gray-700 mb-1">Bank Reconciled</label>
                    <p className="text-gray-900">{formatDate(transaction.bank_reconciliation_date)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-4">
            {transaction.status === 'draft' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            
            {editMode && (
              <>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditData({});
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={hookLoading}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delete Transaction</h3>
                <p className="text-sm text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this transaction? This will permanently remove it from the system.
            </p>
            
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}