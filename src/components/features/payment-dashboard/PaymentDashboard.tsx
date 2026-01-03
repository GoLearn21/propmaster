import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/Tabs';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Settings,
  Download,
  Filter,
  RefreshCw,
  Scale,
  Clock,
  FileText,
  Calendar,
  Shield,
  Plus
} from 'lucide-react';

import { PaymentOverview } from './components/PaymentOverview';
import { PaymentHistoryTable } from './components/PaymentHistoryTable';
import { OutstandingBalances } from './components/OutstandingBalances';
import { CollectionStatus } from './components/CollectionStatus';
import { BillingConfiguration } from './components/BillingConfiguration';
import { PaymentMethodManagement } from './components/PaymentMethodManagement';
import { StateComplianceDisplay } from './components/StateComplianceDisplay';
import { AgingReport } from './components/AgingReport';
import { TenantLedgerView } from './components/TenantLedgerView';
import { PaymentPlansManagement } from './components/PaymentPlansManagement';
import { LateFeeManagement } from './components/LateFeeManagement';
import { ChargePosting } from './components/ChargePosting';
import { SecurityDepositTracking } from './components/SecurityDepositTracking';
import { usePaymentDashboard } from './hooks/usePaymentDashboard';
import { PaymentDashboardFilters } from './types';

export const PaymentDashboard: React.FC = () => {
  const {
    metrics,
    paymentHistory,
    outstandingBalances,
    collectionStatus,
    loading,
    error,
    refreshData,
    exportData
  } = usePaymentDashboard();

  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<PaymentDashboardFilters>({
    dateRange: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    propertyIds: [],
    status: [],
    paymentType: [],
    amountRange: { min: 0, max: 10000 }
  });

  const [showFilters, setShowFilters] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: DollarSign },
    { id: 'aging', label: 'AR Aging', icon: Clock },
    { id: 'ledger', label: 'Tenant Ledger', icon: FileText },
    { id: 'charges', label: 'Post Charges', icon: Plus },
    { id: 'latefees', label: 'Late Fees', icon: AlertTriangle },
    { id: 'plans', label: 'Payment Plans', icon: Calendar },
    { id: 'deposits', label: 'Security Deposits', icon: Shield },
    { id: 'compliance', label: 'State Rules', icon: Scale },
    { id: 'history', label: 'History', icon: TrendingUp },
    { id: 'billing', label: 'Billing', icon: Settings },
    { id: 'methods', label: 'Methods', icon: CreditCard }
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-status-error mx-auto mb-4" />
          <h2 className="text-h3 text-neutral-black mb-2">Error Loading Dashboard</h2>
          <p className="text-body text-neutral-medium mb-4">{error}</p>
          <Button onClick={refreshData} variant="default">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-lighter">
      {/* Header */}
      <div className="bg-primary shadow-lg">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-h2 text-primary-foreground font-bold">
                Payment Dashboard
              </h1>
              <p className="text-body text-primary-foreground opacity-90 mt-1">
                Manage rent collection, payments, and billing configuration
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              
              <Button
                variant="outline"
                onClick={exportData}
                disabled={loading}
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              <Button
                onClick={refreshData}
                disabled={loading}
                className="bg-accent-green hover:bg-accent-green-hover text-accent-foreground"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-border shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <PaymentFilters 
              filters={filters} 
              onFiltersChange={setFilters}
              onClose={() => setShowFilters(false)}
            />
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {/* Scrollable tab container to prevent wrapping and overlap */}
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex min-w-max gap-1 border-b-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap rounded-md data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:after:hidden hover:bg-neutral-light"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <PaymentOverview
              metrics={metrics}
              loading={loading}
              filters={filters}
            />
          </TabsContent>

          <TabsContent value="aging" className="space-y-6">
            <AgingReport loading={loading} />
          </TabsContent>

          <TabsContent value="ledger" className="space-y-6">
            <TenantLedgerView loading={loading} />
          </TabsContent>

          <TabsContent value="charges" className="space-y-6">
            <ChargePosting loading={loading} />
          </TabsContent>

          <TabsContent value="latefees" className="space-y-6">
            <LateFeeManagement loading={loading} />
          </TabsContent>

          <TabsContent value="plans" className="space-y-6">
            <PaymentPlansManagement loading={loading} />
          </TabsContent>

          <TabsContent value="deposits" className="space-y-6">
            <SecurityDepositTracking loading={loading} />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <StateComplianceDisplay />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <PaymentHistoryTable
              data={paymentHistory}
              loading={loading}
              filters={filters}
            />
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <BillingConfiguration />
          </TabsContent>

          <TabsContent value="methods" className="space-y-6">
            <PaymentMethodManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Filters Component
interface PaymentFiltersProps {
  filters: PaymentDashboardFilters;
  onFiltersChange: (filters: PaymentDashboardFilters) => void;
  onClose: () => void;
}

const PaymentFilters: React.FC<PaymentFiltersProps> = ({
  filters,
  onFiltersChange,
  onClose
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label className="block text-small font-medium text-neutral-black mb-2">
          Date Range
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            value={filters.dateRange.start}
            onChange={(e) => onFiltersChange({
              ...filters,
              dateRange: { ...filters.dateRange, start: e.target.value }
            })}
            className="input text-small"
          />
          <input
            type="date"
            value={filters.dateRange.end}
            onChange={(e) => onFiltersChange({
              ...filters,
              dateRange: { ...filters.dateRange, end: e.target.value }
            })}
            className="input text-small"
          />
        </div>
      </div>

      <div>
        <label className="block text-small font-medium text-neutral-black mb-2">
          Amount Range
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.amountRange.min}
            onChange={(e) => onFiltersChange({
              ...filters,
              amountRange: { ...filters.amountRange, min: Number(e.target.value) }
            })}
            className="input text-small"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.amountRange.max}
            onChange={(e) => onFiltersChange({
              ...filters,
              amountRange: { ...filters.amountRange, max: Number(e.target.value) }
            })}
            className="input text-small"
          />
        </div>
      </div>

      <div className="flex items-end gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Close
        </Button>
        <Button 
          onClick={() => onFiltersChange(filters)} 
          className="flex-1 bg-accent-green hover:bg-accent-green-hover"
        >
          Apply
        </Button>
      </div>
    </div>
  );
};

export default PaymentDashboard;