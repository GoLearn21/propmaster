// Transaction Creation Page Component
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText,
  Receipt,
  Save,
  X
} from 'lucide-react';
import TransactionCreationModal from '../components/transactions/TransactionCreationModal';
import TransactionManagementPage from './TransactionManagementPage';
import type { 
  TransactionType,
  TransactionFilters 
} from '../types/transaction';

export default function TransactionCreationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(true);
  const [prefillData, setPrefillData] = useState<{
    propertyId?: string;
    unitId?: string;
    leaseId?: string;
    tenantId?: string;
    vendorId?: string;
    ownerId?: string;
    defaultAmount?: number;
    defaultType?: TransactionType;
  }>({});

  // Parse URL parameters for pre-filling
  useEffect(() => {
    const propertyId = searchParams.get('propertyId');
    const unitId = searchParams.get('unitId');
    const leaseId = searchParams.get('leaseId');
    const tenantId = searchParams.get('tenantId');
    const vendorId = searchParams.get('vendorId');
    const ownerId = searchParams.get('ownerId');
    const amount = searchParams.get('amount');
    const type = searchParams.get('type');

    setPrefillData({
      propertyId: propertyId || undefined,
      unitId: unitId || undefined,
      leaseId: leaseId || undefined,
      tenantId: tenantId || undefined,
      vendorId: vendorId || undefined,
      ownerId: ownerId || undefined,
      defaultAmount: amount ? parseFloat(amount) : undefined,
      defaultType: type as TransactionType || undefined,
    });
  }, [searchParams]);

  const handleTransactionCreated = (transaction: any) => {
    // Navigate back to transaction management page
    navigate(`/properties/transactions?created=${transaction.id}`);
  };

  const handleCancel = () => {
    navigate('/properties/transactions');
  };

  if (showWizard) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleCancel}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Create New Transaction
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Enter transaction details and select the appropriate parties
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Transaction Types</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">15</p>
                </div>
                <Receipt className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">17</p>
                </div>
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Payment Methods</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">10</p>
                </div>
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Today</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Creation Modal */}
        <div className="px-8 pb-8">
          <TransactionCreationModal
            propertyId={prefillData.propertyId}
            unitId={prefillData.unitId}
            leaseId={prefillData.leaseId}
            tenantId={prefillData.tenantId}
            vendorId={prefillData.vendorId}
            ownerId={prefillData.ownerId}
            defaultAmount={prefillData.defaultAmount}
            defaultType={prefillData.defaultType}
            onClose={handleCancel}
            onSuccess={handleTransactionCreated}
          />
        </div>
      </div>
    );
  }

  // Fallback to regular transaction management page
  return <TransactionManagementPage />;
}