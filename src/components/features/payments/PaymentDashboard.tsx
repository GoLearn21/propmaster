import React, { useState } from 'react';
import { PaymentDashboardProps } from './types';
import { usePaymentDashboard } from './hooks/usePaymentDashboard';
import PaymentOverview from './PaymentOverview';
import PaymentHistoryTable from './PaymentHistoryTable';
import OutstandingBalances from './OutstandingBalances';
import CollectionStatus from './CollectionStatus';
import BillingConfiguration from './BillingConfiguration';
import PaymentMethodManagement from './PaymentMethodManagement';

type TabType = 'overview' | 'history' | 'outstanding' | 'collection' | 'billing' | 'methods';

const PaymentDashboard: React.FC<PaymentDashboardProps> = ({ propertyId, tenantId, dateRange }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { 
    metrics, 
    paymentHistory, 
    outstandingBalances, 
    collectionStatus, 
    billingConfig,
    paymentMethods,
    loading,
    error,
    refreshData 
  } = usePaymentDashboard({ propertyId, tenantId, dateRange });

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: '📊' },
    { id: 'history' as TabType, label: 'Payment History', icon: '📋' },
    { id: 'outstanding' as TabType, label: 'Outstanding', icon: '⚠️' },
    { id: 'collection' as TabType, label: 'Collection Status', icon: '📈' },
    { id: 'billing' as TabType, label: 'Billing Config', icon: '⚙️' },
    { id: 'methods' as TabType, label: 'Payment Methods', icon: '💳' }
  ];

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Payment Data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={refreshData}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <PaymentOverview metrics={metrics} loading={loading} />;
      case 'history':
        return <PaymentHistoryTable payments={paymentHistory} loading={loading} />;
      case 'outstanding':
        return <OutstandingBalances balances={outstandingBalances} loading={loading} />;
      case 'collection':
        return <CollectionStatus status={collectionStatus} loading={loading} />;
      case 'billing':
        return <BillingConfiguration configs={billingConfig} loading={loading} />;
      case 'methods':
        return <PaymentMethodManagement paymentMethods={paymentMethods} loading={loading} />;
      default:
        return <PaymentOverview metrics={metrics} loading={loading} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage payments, track collections, and configure billing settings
            </p>
          </div>
          <button
            onClick={refreshData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default PaymentDashboard;