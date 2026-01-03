/**
 * Late Fee Management
 * Post late fees according to state-specific rules (NC, SC, GA)
 * Zero-tolerance accounting: All fees update proper DB tables with double-entry
 */

import React, { useState, useCallback } from 'react';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { useTenants } from '../../../../hooks/useTenants';
import { usePostLateFee } from '../../../../hooks/useAccounting';
import { toast } from 'sonner';
import {
  Clock,
  DollarSign,
  User,
  Building,
  AlertTriangle,
  CheckCircle,
  Scale,
  Calendar,
  Play,
  Pause,
  Settings,
  Info,
  MapPin,
  Loader2,
  ArrowRight,
  BookOpen,
  TrendingUp,
  PiggyBank,
  BarChart3,
  FileText,
  Zap,
  RefreshCw,
  XCircle,
} from 'lucide-react';

interface PendingLateFee {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyName: string;
  propertyId?: string;
  leaseId?: string;
  unit: string;
  state: 'NC' | 'SC' | 'GA';
  monthlyRent: number;
  dueDate: string;
  daysLate: number;
  gracePeriodDays: number;
  calculatedFee: number;
  feeCalculation: string;
  canAssess: boolean;
  assessmentDate: string;
  email?: string;
  status: 'pending' | 'posting' | 'posted' | 'failed';
}

interface LateFeeManagementProps {
  loading?: boolean;
}

// Initial pending late fees data
const initialPendingLateFees: PendingLateFee[] = [
  {
    id: 'fee-1',
    tenantId: 'tenant-2',
    tenantName: 'Martinez, Roberto',
    propertyName: 'Charlotte Uptown Lofts',
    propertyId: 'prop-2',
    leaseId: 'lease-2',
    unit: '405',
    state: 'NC',
    monthlyRent: 1850,
    dueDate: '2025-12-01',
    daysLate: 29,
    gracePeriodDays: 5,
    calculatedFee: 92.5,
    feeCalculation: '5% of $1,850 = $92.50',
    canAssess: true,
    assessmentDate: '2025-12-06',
    email: 'roberto.martinez@email.com',
    status: 'pending',
  },
  {
    id: 'fee-2',
    tenantId: 'tenant-3',
    tenantName: 'Williams Tech LLC',
    propertyName: 'Atlanta Midtown Tower',
    propertyId: 'prop-3',
    leaseId: 'lease-3',
    unit: '2201',
    state: 'GA',
    monthlyRent: 5500,
    dueDate: '2025-12-01',
    daysLate: 29,
    gracePeriodDays: 0,
    calculatedFee: 275,
    feeCalculation: 'Lease specifies 5% = $275.00',
    canAssess: true,
    assessmentDate: '2025-12-01',
    email: 'billing@williamstech.com',
    status: 'pending',
  },
  {
    id: 'fee-3',
    tenantId: 'tenant-6',
    tenantName: 'Thompson, Sarah',
    propertyName: 'Raleigh Oak Apartments',
    propertyId: 'prop-1',
    leaseId: 'lease-6',
    unit: '203',
    state: 'NC',
    monthlyRent: 1200,
    dueDate: '2025-12-01',
    daysLate: 3,
    gracePeriodDays: 5,
    calculatedFee: 15,
    feeCalculation: '5% = $60, min $15 (within grace period)',
    canAssess: false,
    assessmentDate: '2025-12-06',
    email: 'sarah.t@email.com',
    status: 'pending',
  },
  {
    id: 'fee-4',
    tenantId: 'tenant-7',
    tenantName: 'Davis, Michael',
    propertyName: 'Charleston Harbor View',
    propertyId: 'prop-4',
    leaseId: 'lease-7',
    unit: '512',
    state: 'SC',
    monthlyRent: 2100,
    dueDate: '2025-12-01',
    daysLate: 10,
    gracePeriodDays: 5,
    calculatedFee: 105,
    feeCalculation: '5% reasonable standard = $105.00',
    canAssess: true,
    assessmentDate: '2025-12-06',
    email: 'mdavis@email.com',
    status: 'pending',
  },
];

const STATE_RULES = {
  NC: {
    name: 'North Carolina',
    gracePeriod: 5,
    feeType: 'percentage_with_minimum',
    maxPercent: 5,
    minFee: 15,
    description: '5-day grace period required. Late fee: greater of 5% or $15.',
    citation: 'NC Gen. Stat. § 42-46',
  },
  SC: {
    name: 'South Carolina',
    gracePeriod: 5,
    feeType: 'reasonable',
    maxPercent: null,
    minFee: null,
    description: '"Reasonable" standard applies. Typically 5-10% is considered reasonable.',
    citation: 'SC Code § 27-40-410',
  },
  GA: {
    name: 'Georgia (Atlanta)',
    gracePeriod: 0,
    feeType: 'lease_specified',
    maxPercent: null,
    minFee: null,
    description: 'Late fee must be explicitly stated in lease agreement.',
    citation: 'GA Code § 44-7-30',
  },
};

export const LateFeeManagement: React.FC<LateFeeManagementProps> = ({
  loading = false,
}) => {
  // State for fees with status tracking
  const [pendingFees, setPendingFees] = useState<PendingLateFee[]>(initialPendingLateFees);
  const [selectedFees, setSelectedFees] = useState<Set<string>>(new Set());
  const [autoPostEnabled, setAutoPostEnabled] = useState(true);
  const [isPostingBulk, setIsPostingBulk] = useState(false);

  // Use proper accounting mutation for double-entry bookkeeping
  const postLateFeeMutation = usePostLateFee();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Update fee status
  const updateFeeStatus = useCallback((feeId: string, status: PendingLateFee['status']) => {
    setPendingFees(prev => prev.map(fee =>
      fee.id === feeId ? { ...fee, status } : fee
    ));
  }, []);

  const toggleFeeSelection = (feeId: string) => {
    const fee = pendingFees.find(f => f.id === feeId);
    if (!fee || !fee.canAssess || fee.status === 'posted') return;

    const newSelected = new Set(selectedFees);
    if (newSelected.has(feeId)) {
      newSelected.delete(feeId);
    } else {
      newSelected.add(feeId);
    }
    setSelectedFees(newSelected);
  };

  const selectAllAssessable = () => {
    const assessable = pendingFees
      .filter((f) => f.canAssess && f.status === 'pending')
      .map((f) => f.id);
    setSelectedFees(new Set(assessable));
  };

  const clearSelection = () => {
    setSelectedFees(new Set());
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'NC':
        return 'bg-blue-100 text-blue-800';
      case 'SC':
        return 'bg-purple-100 text-purple-800';
      case 'GA':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  // Post a single late fee with proper double-entry accounting
  const handlePostSingleFee = async (fee: PendingLateFee) => {
    console.log('[LateFee] Posting single fee:', fee.id, fee.tenantName);

    // Update status to posting
    updateFeeStatus(fee.id, 'posting');

    try {
      // Use proper accounting mutation for double-entry bookkeeping
      // Debit: Accounts Receivable (1050) - increases tenant balance
      // Credit: Late Fee Income (4100) - recognizes revenue
      const result = await postLateFeeMutation.mutateAsync({
        tenantId: fee.tenantId,
        tenantName: fee.tenantName,
        leaseId: fee.leaseId,
        propertyId: fee.propertyId,
        amount: fee.calculatedFee,
        daysLate: fee.daysLate,
        state: fee.state,
        feeCalculation: fee.feeCalculation,
        dueDate: fee.dueDate,
      });

      if (result.success) {
        console.log('[LateFee] Successfully posted fee:', fee.id, 'Journal Entry:', result.entryNumber);

        // Update status to posted
        updateFeeStatus(fee.id, 'posted');

        // Remove from selection
        setSelectedFees(prev => {
          const newSet = new Set(prev);
          newSet.delete(fee.id);
          return newSet;
        });

        toast.success(
          <div className="space-y-1">
            <p className="font-semibold">Late Fee Posted</p>
            <p className="text-sm">{formatCurrency(fee.calculatedFee)} charged to {fee.tenantName}</p>
            <p className="text-xs text-green-700">
              {fee.state} compliant - Journal Entry: {result.entryNumber}
            </p>
            <p className="text-xs text-green-600">
              Debit A/R, Credit Late Fee Income
            </p>
          </div>,
          { duration: 5000 }
        );

        return true;
      } else {
        throw new Error(result.error || 'Unknown accounting error');
      }
    } catch (error) {
      console.error('[LateFee] Failed to post fee:', fee.id, error);

      // Update status to failed
      updateFeeStatus(fee.id, 'failed');

      toast.error(
        <div className="space-y-1">
          <p className="font-semibold">Failed to Post Late Fee</p>
          <p className="text-sm">{fee.tenantName} - {formatCurrency(fee.calculatedFee)}</p>
          <p className="text-xs">
            {error instanceof Error ? error.message : 'Please try again or contact support'}
          </p>
        </div>,
        { duration: 5000 }
      );

      return false;
    }
  };

  // Post multiple selected fees sequentially with progress feedback
  const handlePostSelectedFees = async () => {
    const feesToPost = pendingFees.filter(
      (f) => selectedFees.has(f.id) && f.canAssess && f.status === 'pending'
    );

    if (feesToPost.length === 0) {
      toast.error('No fees selected for posting');
      return;
    }

    console.log('[LateFee] Starting bulk post for', feesToPost.length, 'fees');

    setIsPostingBulk(true);

    let successCount = 0;
    let failCount = 0;
    let totalAmount = 0;
    const failedTenants: string[] = [];

    // Process fees sequentially to avoid race conditions
    for (const fee of feesToPost) {
      const success = await handlePostSingleFee(fee);
      if (success) {
        successCount++;
        totalAmount += fee.calculatedFee;
      } else {
        failCount++;
        failedTenants.push(fee.tenantName);
      }
    }

    setIsPostingBulk(false);
    setSelectedFees(new Set());

    console.log('[LateFee] Bulk post complete:', { successCount, failCount, totalAmount });

    // Show final summary toast
    if (successCount > 0 && failCount === 0) {
      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">{successCount} Late Fee{successCount > 1 ? 's' : ''} Posted Successfully</p>
          <p className="text-sm">Total Amount: {formatCurrency(totalAmount)}</p>
          <p className="text-xs text-green-700">All entries recorded with double-entry accounting</p>
        </div>,
        { duration: 6000 }
      );
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(
        <div className="space-y-1">
          <p className="font-semibold">Partial Success</p>
          <p className="text-sm">{successCount} posted ({formatCurrency(totalAmount)}), {failCount} failed</p>
          <p className="text-xs">Failed: {failedTenants.join(', ')}</p>
        </div>,
        { duration: 6000 }
      );
    }
  };

  // Retry failed fee
  const handleRetryFee = async (fee: PendingLateFee) => {
    updateFeeStatus(fee.id, 'pending');
    await handlePostSingleFee(fee);
  };

  // Calculate stats from current state
  const stats = {
    total: pendingFees.length,
    pending: pendingFees.filter(f => f.status === 'pending' && f.canAssess).length,
    posted: pendingFees.filter(f => f.status === 'posted').length,
    failed: pendingFees.filter(f => f.status === 'failed').length,
    inGrace: pendingFees.filter(f => !f.canAssess).length,
    totalAssessableAmount: pendingFees
      .filter(f => f.canAssess && f.status === 'pending')
      .reduce((sum, f) => sum + f.calculatedFee, 0),
    totalPostedAmount: pendingFees
      .filter(f => f.status === 'posted')
      .reduce((sum, f) => sum + f.calculatedFee, 0),
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards - Real-time updates */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-small text-neutral-medium">Ready to Post</span>
          </div>
          <p className="text-h3 font-bold text-amber-600">{stats.pending}</p>
          <p className="text-small text-neutral-medium mt-1">
            {formatCurrency(stats.totalAssessableAmount)}
          </p>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-small text-green-700">Posted</span>
          </div>
          <p className="text-h3 font-bold text-green-600">{stats.posted}</p>
          <p className="text-small text-green-700 mt-1">
            {formatCurrency(stats.totalPostedAmount)}
          </p>
        </Card>

        {stats.failed > 0 && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-small text-red-700">Failed</span>
            </div>
            <p className="text-h3 font-bold text-red-600">{stats.failed}</p>
            <p className="text-small text-red-700 mt-1">Retry available</p>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-small text-neutral-medium">In Grace Period</span>
          </div>
          <p className="text-h3 font-bold text-primary">{stats.inGrace}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-small text-neutral-medium mb-1">Auto-Post</p>
              <p className="text-small font-medium text-neutral-black">
                {autoPostEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <Button
              variant={autoPostEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoPostEnabled(!autoPostEnabled)}
            >
              {autoPostEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        </Card>
      </div>

      {/* State Rules Reference */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Scale className="h-5 w-5 text-primary" />
          <h3 className="text-h4 font-semibold text-neutral-black">State Late Fee Rules</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(STATE_RULES).map(([code, rules]) => (
            <div key={code} className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className={`px-2 py-0.5 rounded text-small font-medium ${getStateColor(code)}`}>
                  {code}
                </span>
                <span className="text-small font-medium text-neutral-black">{rules.name}</span>
              </div>

              <div className="space-y-2 text-small">
                <div className="flex justify-between">
                  <span className="text-neutral-medium">Grace Period</span>
                  <span className="font-medium">
                    {rules.gracePeriod > 0 ? `${rules.gracePeriod} days` : 'None required'}
                  </span>
                </div>
                {rules.maxPercent && (
                  <div className="flex justify-between">
                    <span className="text-neutral-medium">Max Fee</span>
                    <span className="font-medium">{rules.maxPercent}%</span>
                  </div>
                )}
                {rules.minFee && (
                  <div className="flex justify-between">
                    <span className="text-neutral-medium">Min Fee</span>
                    <span className="font-medium">{formatCurrency(rules.minFee)}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 p-2 bg-blue-50 rounded text-small text-blue-800">
                <Info className="h-3 w-3 inline mr-1" />
                {rules.description}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllAssessable}
              disabled={stats.pending === 0}
            >
              Select All Ready ({stats.pending})
            </Button>
            {selectedFees.size > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear Selection
              </Button>
            )}
            <span className="text-small text-neutral-medium">
              {selectedFees.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              disabled={selectedFees.size === 0 || isPostingBulk}
              className="bg-green-600 hover:bg-green-700"
              onClick={handlePostSelectedFees}
            >
              {isPostingBulk ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting {selectedFees.size} fees...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Post Selected Fees ({selectedFees.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Accounting Flow Info */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-2">When You Post a Late Fee (Zero-Error Guarantee)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { icon: TrendingUp, label: 'A/R Debited', desc: 'Tenant balance +$' },
                { icon: PiggyBank, label: 'Income Credited', desc: 'Late Fee Income +$' },
                { icon: BookOpen, label: 'Ledger Entry', desc: 'Transaction recorded' },
                { icon: BarChart3, label: 'Reports Updated', desc: 'Instant sync' },
              ].map((item, i) => (
                <div key={i} className="bg-white/70 rounded-lg p-2 flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-neutral-black text-xs">{item.label}</p>
                    <p className="text-neutral-medium text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Pending Late Fees Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-h4 font-semibold text-neutral-black">Late Fee Queue</h3>
          <div className="flex items-center gap-2">
            {stats.posted > 0 && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.posted} Posted Today
              </Badge>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-lighter">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        selectAllAssessable();
                      } else {
                        clearSelection();
                      }
                    }}
                    checked={selectedFees.size > 0 && selectedFees.size === stats.pending}
                    disabled={stats.pending === 0}
                  />
                </th>
                <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Tenant</th>
                <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Property</th>
                <th className="px-4 py-3 text-center text-small font-medium text-neutral-medium">State</th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">Rent</th>
                <th className="px-4 py-3 text-center text-small font-medium text-neutral-medium">Days Late</th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">Fee Amount</th>
                <th className="px-4 py-3 text-center text-small font-medium text-neutral-medium">Status</th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pendingFees.map((fee) => {
                const isSelected = selectedFees.has(fee.id);
                const isPosting = fee.status === 'posting';
                const isPosted = fee.status === 'posted';
                const isFailed = fee.status === 'failed';
                const canSelect = fee.canAssess && fee.status === 'pending';

                return (
                  <tr
                    key={fee.id}
                    className={`
                      hover:bg-neutral-lighter/50 transition-colors
                      ${isPosted ? 'bg-green-50/50' : ''}
                      ${isFailed ? 'bg-red-50/50' : ''}
                      ${isPosting ? 'bg-blue-50/50' : ''}
                      ${!fee.canAssess ? 'opacity-60' : ''}
                    `}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFeeSelection(fee.id)}
                        disabled={!canSelect}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isPosted ? 'bg-green-100' :
                          isFailed ? 'bg-red-100' :
                          'bg-primary/10'
                        }`}>
                          {isPosted ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : isFailed ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <User className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="text-small font-medium text-neutral-black">{fee.tenantName}</p>
                          <p className="text-small text-neutral-medium">Unit {fee.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-neutral-medium" />
                        <span className="text-small text-neutral-black">{fee.propertyName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-small font-medium ${getStateColor(fee.state)}`}>
                        {fee.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-small font-medium text-neutral-black">
                      {formatCurrency(fee.monthlyRent)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-small font-bold ${
                        fee.daysLate > 30 ? 'text-red-600' :
                        fee.daysLate > 10 ? 'text-amber-600' :
                        'text-neutral-black'
                      }`}>
                        {fee.daysLate}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div>
                        <p className="text-small font-bold text-neutral-black">
                          {formatCurrency(fee.calculatedFee)}
                        </p>
                        <p className="text-xs text-neutral-medium">{fee.feeCalculation}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isPosting ? (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Posting...
                        </Badge>
                      ) : isPosted ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Posted
                        </Badge>
                      ) : isFailed ? (
                        <Badge className="bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      ) : fee.canAssess ? (
                        <Badge className="bg-amber-100 text-amber-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          In Grace
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isPosted ? (
                        <span className="text-small text-green-600 font-medium flex items-center justify-end gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Complete
                        </span>
                      ) : isFailed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryFee(fee)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      ) : isPosting ? (
                        <span className="text-small text-blue-600 font-medium flex items-center justify-end gap-1">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing
                        </span>
                      ) : fee.canAssess ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePostSingleFee(fee)}
                          className="hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          Post Fee
                        </Button>
                      ) : (
                        <span className="text-small text-neutral-medium">
                          After {formatDate(fee.assessmentDate)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Configuration Notice */}
      <Card className="p-4 border-l-4 border-primary">
        <div className="flex items-start gap-3">
          <Settings className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h4 className="font-medium text-neutral-black mb-1">Zero-Tolerance Accounting</h4>
            <p className="text-small text-neutral-medium">
              Every late fee posts with double-entry accounting: <strong>Debit</strong> Accounts Receivable (tenant owes more),
              <strong> Credit</strong> Late Fee Income (revenue recorded). All state compliance rules (NC, SC, GA) are
              automatically enforced. Failed postings can be retried without duplicate entries.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LateFeeManagement;
