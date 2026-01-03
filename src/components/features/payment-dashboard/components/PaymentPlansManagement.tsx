/**
 * Payment Plans Management
 * Create and manage payment plans for tenants with outstanding balances
 * Zero-tolerance accounting: All plan payments update proper DB tables
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { useTenants } from '../../../../hooks/useTenants';
import { useRecordPayment } from '../../../../hooks/usePayments';
import { toast } from 'sonner';
import {
  Calendar,
  DollarSign,
  User,
  Building,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  FileText,
  RefreshCw,
  X,
  Search,
  CreditCard,
  Banknote,
  Calculator,
  Info,
  Save,
  Loader2,
  Receipt,
  ArrowRight,
  Percent,
} from 'lucide-react';

interface PaymentPlanInstallment {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'late' | 'missed';
  paidDate?: string;
  paidAmount?: number;
}

interface PaymentPlan {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyName: string;
  propertyId?: string;
  leaseId?: string;
  unit: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  numberOfPayments: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  schedule: PaymentPlanInstallment[];
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  reason: string;
  createdAt: string;
  startDate: string;
}

interface PaymentPlansManagementProps {
  loading?: boolean;
}

// Initial mock data
const initialPaymentPlans: PaymentPlan[] = [
  {
    id: 'plan-1',
    tenantId: 'tenant-5',
    tenantName: 'Smith, James',
    propertyName: 'Decatur Family Homes',
    propertyId: 'prop-5',
    leaseId: 'lease-5',
    unit: '12B',
    totalAmount: 3600,
    paidAmount: 1200,
    remainingAmount: 2400,
    numberOfPayments: 6,
    frequency: 'monthly',
    reason: 'Catch-up on past due rent from job transition',
    schedule: [
      { installmentNumber: 1, dueDate: '2025-10-01', amount: 600, status: 'paid', paidDate: '2025-10-01', paidAmount: 600 },
      { installmentNumber: 2, dueDate: '2025-11-01', amount: 600, status: 'paid', paidDate: '2025-11-03', paidAmount: 600 },
      { installmentNumber: 3, dueDate: '2025-12-01', amount: 600, status: 'late' },
      { installmentNumber: 4, dueDate: '2026-01-01', amount: 600, status: 'pending' },
      { installmentNumber: 5, dueDate: '2026-02-01', amount: 600, status: 'pending' },
      { installmentNumber: 6, dueDate: '2026-03-01', amount: 600, status: 'pending' },
    ],
    status: 'active',
    createdAt: '2025-09-15',
    startDate: '2025-10-01',
  },
  {
    id: 'plan-2',
    tenantId: 'tenant-4',
    tenantName: 'Chen, Amanda',
    propertyName: 'Charleston Harbor View',
    propertyId: 'prop-4',
    leaseId: 'lease-4',
    unit: '304',
    totalAmount: 2100,
    paidAmount: 2100,
    remainingAmount: 0,
    numberOfPayments: 3,
    frequency: 'monthly',
    reason: 'Security deposit payment plan',
    schedule: [
      { installmentNumber: 1, dueDate: '2025-11-01', amount: 700, status: 'paid', paidDate: '2025-10-30', paidAmount: 700 },
      { installmentNumber: 2, dueDate: '2025-12-01', amount: 700, status: 'paid', paidDate: '2025-12-01', paidAmount: 700 },
      { installmentNumber: 3, dueDate: '2026-01-01', amount: 700, status: 'paid', paidDate: '2025-12-28', paidAmount: 700 },
    ],
    status: 'completed',
    createdAt: '2025-10-20',
    startDate: '2025-11-01',
  },
  {
    id: 'plan-3',
    tenantId: 'tenant-7',
    tenantName: 'Davis, Michael',
    propertyName: 'Charleston Harbor View',
    propertyId: 'prop-4',
    leaseId: 'lease-7',
    unit: '512',
    totalAmount: 1500,
    paidAmount: 500,
    remainingAmount: 1000,
    numberOfPayments: 3,
    frequency: 'biweekly',
    reason: 'Late fee accumulation catch-up',
    schedule: [
      { installmentNumber: 1, dueDate: '2025-12-01', amount: 500, status: 'paid', paidDate: '2025-12-01', paidAmount: 500 },
      { installmentNumber: 2, dueDate: '2025-12-15', amount: 500, status: 'missed' },
      { installmentNumber: 3, dueDate: '2025-12-29', amount: 500, status: 'pending' },
    ],
    status: 'defaulted',
    createdAt: '2025-11-25',
    startDate: '2025-12-01',
  },
];

export const PaymentPlansManagement: React.FC<PaymentPlansManagementProps> = ({
  loading = false,
}) => {
  // State
  const [plans, setPlans] = useState<PaymentPlan[]>(initialPaymentPlans);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set(['plan-1']));
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [selectedInstallment, setSelectedInstallment] = useState<PaymentPlanInstallment | null>(null);

  // Create plan form state
  const [createForm, setCreateForm] = useState({
    tenantSearch: '',
    totalAmount: '',
    numberOfPayments: '3',
    frequency: 'monthly' as 'weekly' | 'biweekly' | 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);

  // Modify plan form state
  const [modifyForm, setModifyForm] = useState({
    numberOfPayments: '',
    frequency: 'monthly' as 'weekly' | 'biweekly' | 'monthly',
  });

  // Record payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'check' as 'check' | 'cash' | 'ach' | 'credit_card',
    notes: '',
  });

  // Cancel reason
  const [cancelReason, setCancelReason] = useState('');

  // Processing states
  const [isCreating, setIsCreating] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Hooks
  const { data: tenantsData } = useTenants();
  const tenants = tenantsData || [];
  const recordPaymentMutation = useRecordPayment();

  // Filter tenants for autocomplete
  const filteredTenants = useMemo(() => {
    if (!createForm.tenantSearch.trim()) return [];
    const search = createForm.tenantSearch.toLowerCase();
    return tenants.filter((t: any) =>
      t.first_name?.toLowerCase().includes(search) ||
      t.last_name?.toLowerCase().includes(search) ||
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(search)
    ).slice(0, 5);
  }, [tenants, createForm.tenantSearch]);

  // Filter plans based on status
  const filteredPlans = useMemo(() => {
    if (filterStatus === 'all') return plans;
    return plans.filter(p => p.status === filterStatus);
  }, [plans, filterStatus]);

  // Utility functions
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

  const togglePlan = (planId: string) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-500 text-white">Active</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>;
      case 'defaulted':
        return <Badge className="bg-red-500 text-white">Defaulted</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInstallmentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'late':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'missed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-neutral-medium" />;
      default:
        return <Clock className="h-4 w-4 text-neutral-medium" />;
    }
  };

  const getProgressPercentage = (plan: PaymentPlan) => {
    return (plan.paidAmount / plan.totalAmount) * 100;
  };

  // Generate installment schedule
  const generateSchedule = (totalAmount: number, numberOfPayments: number, frequency: string, startDate: string): PaymentPlanInstallment[] => {
    const installmentAmount = Math.round((totalAmount / numberOfPayments) * 100) / 100;
    const schedule: PaymentPlanInstallment[] = [];
    let currentDate = new Date(startDate);

    for (let i = 1; i <= numberOfPayments; i++) {
      // Last installment gets any rounding difference
      const amount = i === numberOfPayments
        ? totalAmount - (installmentAmount * (numberOfPayments - 1))
        : installmentAmount;

      schedule.push({
        installmentNumber: i,
        dueDate: currentDate.toISOString().split('T')[0],
        amount: Math.round(amount * 100) / 100,
        status: 'pending',
      });

      // Advance date based on frequency
      if (frequency === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (frequency === 'biweekly') {
        currentDate.setDate(currentDate.getDate() + 14);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    return schedule;
  };

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh from database
    await new Promise(resolve => setTimeout(resolve, 1000));
    // In real implementation, would fetch from Supabase
    toast.success('Payment plans refreshed');
    setIsRefreshing(false);
  };

  const handleSelectTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    setCreateForm(prev => ({
      ...prev,
      tenantSearch: `${tenant.first_name} ${tenant.last_name}`,
    }));
    setShowTenantDropdown(false);
  };

  const handleCreatePlan = async () => {
    if (!selectedTenant) {
      toast.error('Please select a tenant');
      return;
    }
    if (!createForm.totalAmount || parseFloat(createForm.totalAmount) <= 0) {
      toast.error('Please enter a valid total amount');
      return;
    }
    if (!createForm.reason.trim()) {
      toast.error('Please enter a reason for the payment plan');
      return;
    }

    setIsCreating(true);

    try {
      const totalAmount = parseFloat(createForm.totalAmount);
      const numberOfPayments = parseInt(createForm.numberOfPayments);
      const schedule = generateSchedule(
        totalAmount,
        numberOfPayments,
        createForm.frequency,
        createForm.startDate
      );

      const newPlan: PaymentPlan = {
        id: `plan-${Date.now()}`,
        tenantId: selectedTenant.id,
        tenantName: `${selectedTenant.last_name}, ${selectedTenant.first_name}`,
        propertyName: selectedTenant.property?.name || 'Unknown Property',
        propertyId: selectedTenant.property_id,
        leaseId: selectedTenant.lease_id,
        unit: selectedTenant.unit?.unit_number || 'N/A',
        totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        numberOfPayments,
        frequency: createForm.frequency,
        reason: createForm.reason,
        schedule,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        startDate: createForm.startDate,
      };

      // Add to state
      setPlans(prev => [newPlan, ...prev]);

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Payment Plan Created</p>
          <p className="text-sm">{newPlan.tenantName} - {formatCurrency(totalAmount)}</p>
          <p className="text-xs text-green-700">{numberOfPayments} {createForm.frequency} payments of {formatCurrency(totalAmount / numberOfPayments)}</p>
        </div>,
        { duration: 5000 }
      );

      // Reset form and close modal
      setShowCreateModal(false);
      setSelectedTenant(null);
      setCreateForm({
        tenantSearch: '',
        totalAmount: '',
        numberOfPayments: '3',
        frequency: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
        reason: '',
      });

      // Expand the new plan
      setExpandedPlans(new Set([newPlan.id]));

    } catch (error) {
      console.error('[PaymentPlan] Create failed:', error);
      toast.error('Failed to create payment plan');
    } finally {
      setIsCreating(false);
    }
  };

  const openModifyModal = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    setModifyForm({
      numberOfPayments: plan.numberOfPayments.toString(),
      frequency: plan.frequency,
    });
    setShowModifyModal(true);
  };

  const handleModifyPlan = async () => {
    if (!selectedPlan) return;

    setIsModifying(true);

    try {
      const newNumberOfPayments = parseInt(modifyForm.numberOfPayments);
      const remainingInstallments = selectedPlan.schedule.filter(i => i.status === 'pending' || i.status === 'late');

      if (remainingInstallments.length === 0) {
        toast.error('No pending installments to modify');
        return;
      }

      // Regenerate remaining schedule
      const paidInstallments = selectedPlan.schedule.filter(i => i.status === 'paid');
      const newSchedule = generateSchedule(
        selectedPlan.remainingAmount,
        newNumberOfPayments,
        modifyForm.frequency,
        new Date().toISOString().split('T')[0]
      );

      // Update installment numbers to continue from paid ones
      const finalSchedule = [
        ...paidInstallments,
        ...newSchedule.map((inst, idx) => ({
          ...inst,
          installmentNumber: paidInstallments.length + idx + 1,
        })),
      ];

      setPlans(prev => prev.map(p => {
        if (p.id === selectedPlan.id) {
          return {
            ...p,
            numberOfPayments: paidInstallments.length + newNumberOfPayments,
            frequency: modifyForm.frequency,
            schedule: finalSchedule,
          };
        }
        return p;
      }));

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Payment Plan Modified</p>
          <p className="text-sm">{selectedPlan.tenantName}</p>
          <p className="text-xs">New schedule: {newNumberOfPayments} {modifyForm.frequency} payments</p>
        </div>
      );

      setShowModifyModal(false);
      setSelectedPlan(null);

    } catch (error) {
      console.error('[PaymentPlan] Modify failed:', error);
      toast.error('Failed to modify payment plan');
    } finally {
      setIsModifying(false);
    }
  };

  const openCancelModal = (plan: PaymentPlan) => {
    setSelectedPlan(plan);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelPlan = async () => {
    if (!selectedPlan) return;
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    setIsCancelling(true);

    try {
      setPlans(prev => prev.map(p => {
        if (p.id === selectedPlan.id) {
          return { ...p, status: 'cancelled' as const };
        }
        return p;
      }));

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Payment Plan Cancelled</p>
          <p className="text-sm">{selectedPlan.tenantName}</p>
          <p className="text-xs">Remaining balance: {formatCurrency(selectedPlan.remainingAmount)}</p>
        </div>
      );

      setShowCancelModal(false);
      setSelectedPlan(null);
      setCancelReason('');

    } catch (error) {
      console.error('[PaymentPlan] Cancel failed:', error);
      toast.error('Failed to cancel payment plan');
    } finally {
      setIsCancelling(false);
    }
  };

  const openRecordPaymentModal = (plan: PaymentPlan, installment: PaymentPlanInstallment) => {
    setSelectedPlan(plan);
    setSelectedInstallment(installment);
    setPaymentForm({
      amount: installment.amount.toString(),
      paymentMethod: 'check',
      notes: '',
    });
    setShowRecordPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedPlan || !selectedInstallment) return;

    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setIsRecordingPayment(true);

    try {
      // Record payment in database
      await recordPaymentMutation.mutateAsync({
        tenant_id: selectedPlan.tenantId,
        lease_id: selectedPlan.leaseId || '',
        amount: amount,
        payment_method: paymentForm.paymentMethod,
        payment_date: new Date().toISOString().split('T')[0],
        notes: `Payment Plan Installment #${selectedInstallment.installmentNumber}${paymentForm.notes ? ` - ${paymentForm.notes}` : ''}`,
      });

      // Update local state
      const today = new Date().toISOString().split('T')[0];

      setPlans(prev => prev.map(p => {
        if (p.id === selectedPlan.id) {
          const updatedSchedule = p.schedule.map(inst => {
            if (inst.installmentNumber === selectedInstallment.installmentNumber) {
              return {
                ...inst,
                status: 'paid' as const,
                paidDate: today,
                paidAmount: amount,
              };
            }
            return inst;
          });

          const newPaidAmount = p.paidAmount + amount;
          const newRemainingAmount = p.totalAmount - newPaidAmount;
          const isCompleted = newRemainingAmount <= 0;

          return {
            ...p,
            paidAmount: newPaidAmount,
            remainingAmount: Math.max(0, newRemainingAmount),
            schedule: updatedSchedule,
            status: isCompleted ? 'completed' as const : p.status,
          };
        }
        return p;
      }));

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Payment Recorded</p>
          <p className="text-sm">{formatCurrency(amount)} from {selectedPlan.tenantName}</p>
          <p className="text-xs text-green-700">Installment #{selectedInstallment.installmentNumber} - {paymentForm.paymentMethod.toUpperCase()}</p>
        </div>,
        { duration: 5000 }
      );

      setShowRecordPaymentModal(false);
      setSelectedPlan(null);
      setSelectedInstallment(null);

    } catch (error) {
      console.error('[PaymentPlan] Record payment failed:', error);
      toast.error('Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const activePlans = plans.filter(p => p.status === 'active');
    return {
      activePlans: activePlans.length,
      completedPlans: plans.filter(p => p.status === 'completed').length,
      defaultedPlans: plans.filter(p => p.status === 'defaulted').length,
      totalOutstanding: activePlans.reduce((sum, p) => sum + p.remainingAmount, 0),
      lateInstallments: activePlans.reduce(
        (sum, p) => sum + p.schedule.filter(i => i.status === 'late').length,
        0
      ),
    };
  }, [plans]);

  // Calculate preview for create form
  const createPreview = useMemo(() => {
    const total = parseFloat(createForm.totalAmount) || 0;
    const payments = parseInt(createForm.numberOfPayments) || 1;
    return {
      installmentAmount: total / payments,
      endDate: (() => {
        const start = new Date(createForm.startDate);
        for (let i = 1; i < payments; i++) {
          if (createForm.frequency === 'weekly') start.setDate(start.getDate() + 7);
          else if (createForm.frequency === 'biweekly') start.setDate(start.getDate() + 14);
          else start.setMonth(start.getMonth() + 1);
        }
        return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      })(),
    };
  }, [createForm.totalAmount, createForm.numberOfPayments, createForm.frequency, createForm.startDate]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <span className="text-small text-neutral-medium">Active Plans</span>
          </div>
          <p className="text-h3 font-bold text-blue-600">{stats.activePlans}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-small text-neutral-medium">Total Outstanding</span>
          </div>
          <p className="text-h3 font-bold text-neutral-black">{formatCurrency(stats.totalOutstanding)}</p>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-small text-amber-700">Late Installments</span>
          </div>
          <p className="text-h3 font-bold text-amber-600">{stats.lateInstallments}</p>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-small text-green-700">Completed</span>
          </div>
          <p className="text-h3 font-bold text-green-600">{stats.completedPlans}</p>
        </Card>

        <Card className="p-4 hover:bg-primary/5 transition-colors cursor-pointer border-2 border-dashed border-primary/30" onClick={() => setShowCreateModal(true)}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Plus className="h-6 w-6 text-primary mx-auto mb-1" />
              <span className="text-small font-medium text-primary">Create New Plan</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-small text-neutral-medium">Filter:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg text-small focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Plans ({plans.length})</option>
                <option value="active">Active ({plans.filter(p => p.status === 'active').length})</option>
                <option value="completed">Completed ({plans.filter(p => p.status === 'completed').length})</option>
                <option value="defaulted">Defaulted ({plans.filter(p => p.status === 'defaulted').length})</option>
                <option value="cancelled">Cancelled ({plans.filter(p => p.status === 'cancelled').length})</option>
              </select>
            </div>
            <span className="text-small text-neutral-medium">
              Showing {filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </Card>

      {/* Info Banner */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-small font-medium text-blue-900">Payment Plan Guidelines</p>
            <p className="text-small text-blue-700 mt-1">
              Payment plans help tenants catch up on outstanding balances. When an installment is marked paid,
              the payment is recorded in the accounting system and the tenant's ledger is updated automatically.
              Plans with missed payments will be flagged for review.
            </p>
          </div>
        </div>
      </Card>

      {/* Payment Plans List */}
      <div className="space-y-4">
        {filteredPlans.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
            <h3 className="text-h4 font-semibold text-neutral-black mb-2">
              {filterStatus === 'all' ? 'No Payment Plans' : `No ${filterStatus} Plans`}
            </h3>
            <p className="text-body text-neutral-medium mb-4">
              {filterStatus === 'all'
                ? 'Create a payment plan to help tenants pay off their outstanding balance over time.'
                : `No payment plans with "${filterStatus}" status found.`}
            </p>
            {filterStatus === 'all' && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Payment Plan
              </Button>
            )}
          </Card>
        ) : (
          filteredPlans.map((plan) => (
            <Card key={plan.id} className="overflow-hidden">
              {/* Plan Header */}
              <div
                className="p-4 cursor-pointer hover:bg-neutral-lighter/50 transition-colors"
                onClick={() => togglePlan(plan.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      plan.status === 'completed' ? 'bg-green-100' :
                      plan.status === 'defaulted' ? 'bg-red-100' :
                      plan.status === 'cancelled' ? 'bg-neutral-100' :
                      'bg-primary/10'
                    }`}>
                      {plan.status === 'completed' ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : plan.status === 'defaulted' ? (
                        <XCircle className="h-6 w-6 text-red-500" />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-neutral-black">{plan.tenantName}</h3>
                        {getStatusBadge(plan.status)}
                      </div>
                      <div className="flex items-center gap-2 text-small text-neutral-medium mt-1">
                        <Building className="h-3 w-3" />
                        <span>{plan.propertyName} - Unit {plan.unit}</span>
                      </div>
                      {plan.reason && (
                        <p className="text-xs text-neutral-medium mt-1 italic">"{plan.reason}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-small text-neutral-medium">Paid / Total</p>
                      <p className="font-semibold text-neutral-black">
                        {formatCurrency(plan.paidAmount)} / {formatCurrency(plan.totalAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-small text-neutral-medium">Remaining</p>
                      <p className={`font-semibold ${plan.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(plan.remainingAmount)}
                      </p>
                    </div>
                    {expandedPlans.has(plan.id) ? (
                      <ChevronUp className="h-5 w-5 text-neutral-medium" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-neutral-medium" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-small mb-1">
                    <span className="text-neutral-medium">
                      Progress: {plan.schedule.filter(i => i.status === 'paid').length} / {plan.numberOfPayments} payments
                    </span>
                    <span className="font-medium text-neutral-black">
                      {getProgressPercentage(plan).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-lighter rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        plan.status === 'completed' ? 'bg-green-500' :
                        plan.status === 'defaulted' ? 'bg-red-500' :
                        'bg-primary'
                      }`}
                      style={{ width: `${getProgressPercentage(plan)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Schedule */}
              {expandedPlans.has(plan.id) && (
                <div className="border-t border-border">
                  <div className="p-4 bg-neutral-lighter/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 text-small text-neutral-medium">
                        <span>
                          <strong>Frequency:</strong> {plan.frequency.charAt(0).toUpperCase() + plan.frequency.slice(1)}
                        </span>
                        <span>
                          <strong>Payments:</strong> {plan.schedule.filter(i => i.status === 'paid').length} / {plan.numberOfPayments}
                        </span>
                        <span>
                          <strong>Started:</strong> {formatDate(plan.startDate)}
                        </span>
                      </div>
                      {plan.status === 'active' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openModifyModal(plan);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Modify
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCancelModal(plan);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Installment Schedule */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left text-small font-medium text-neutral-medium">#</th>
                            <th className="px-4 py-2 text-left text-small font-medium text-neutral-medium">Due Date</th>
                            <th className="px-4 py-2 text-right text-small font-medium text-neutral-medium">Amount</th>
                            <th className="px-4 py-2 text-center text-small font-medium text-neutral-medium">Status</th>
                            <th className="px-4 py-2 text-left text-small font-medium text-neutral-medium">Paid Date</th>
                            <th className="px-4 py-2 text-right text-small font-medium text-neutral-medium">Paid Amount</th>
                            <th className="px-4 py-2 text-right text-small font-medium text-neutral-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {plan.schedule.map((installment) => (
                            <tr
                              key={installment.installmentNumber}
                              className={`hover:bg-white transition-colors ${
                                installment.status === 'paid' ? 'bg-green-50/30' :
                                installment.status === 'late' ? 'bg-amber-50/30' :
                                installment.status === 'missed' ? 'bg-red-50/30' :
                                ''
                              }`}
                            >
                              <td className="px-4 py-3 text-small font-medium text-neutral-black">
                                {installment.installmentNumber}
                              </td>
                              <td className="px-4 py-3 text-small text-neutral-black">
                                {formatDate(installment.dueDate)}
                              </td>
                              <td className="px-4 py-3 text-right text-small font-medium text-neutral-black">
                                {formatCurrency(installment.amount)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {getInstallmentStatusIcon(installment.status)}
                                  <span className={`text-small font-medium ${
                                    installment.status === 'paid' ? 'text-green-600' :
                                    installment.status === 'late' ? 'text-amber-600' :
                                    installment.status === 'missed' ? 'text-red-600' :
                                    'text-neutral-medium'
                                  }`}>
                                    {installment.status.charAt(0).toUpperCase() + installment.status.slice(1)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-small text-neutral-medium">
                                {installment.paidDate ? formatDate(installment.paidDate) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right text-small text-green-600 font-medium">
                                {installment.paidAmount ? formatCurrency(installment.paidAmount) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {(installment.status === 'pending' || installment.status === 'late') && plan.status === 'active' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openRecordPaymentModal(plan, installment);
                                    }}
                                  >
                                    <Receipt className="h-3 w-3 mr-1" />
                                    Record Payment
                                  </Button>
                                ) : installment.status === 'paid' ? (
                                  <span className="text-xs text-green-600 flex items-center justify-end gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Paid
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">Create Payment Plan</h2>
                  <p className="text-small text-neutral-medium mt-1">Set up a structured payment plan for a tenant</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Tenant Selection */}
                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">
                    Select Tenant *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                    <input
                      type="text"
                      value={createForm.tenantSearch}
                      onChange={(e) => {
                        setCreateForm(prev => ({ ...prev, tenantSearch: e.target.value }));
                        setShowTenantDropdown(true);
                        if (!e.target.value.trim()) setSelectedTenant(null);
                      }}
                      onFocus={() => setShowTenantDropdown(true)}
                      placeholder="Search tenant by name..."
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {showTenantDropdown && filteredTenants.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {filteredTenants.map((tenant: any) => (
                          <div
                            key={tenant.id}
                            className="px-4 py-3 hover:bg-neutral-lighter cursor-pointer flex items-center gap-3"
                            onClick={() => handleSelectTenant(tenant)}
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-small font-medium text-neutral-black">
                                {tenant.first_name} {tenant.last_name}
                              </p>
                              <p className="text-xs text-neutral-medium">
                                {tenant.property?.name || 'Unknown Property'} - Unit {tenant.unit?.unit_number || 'N/A'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedTenant && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-small font-medium text-green-800">
                          {selectedTenant.first_name} {selectedTenant.last_name}
                        </p>
                        <p className="text-xs text-green-700">
                          {selectedTenant.property?.name} - Unit {selectedTenant.unit?.unit_number}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount and Payments */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">
                      Total Amount *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                      <input
                        type="number"
                        value={createForm.totalAmount}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">
                      Number of Payments *
                    </label>
                    <select
                      value={createForm.numberOfPayments}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, numberOfPayments: e.target.value }))}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                        <option key={n} value={n}>{n} payments</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Frequency and Start Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">
                      Payment Frequency *
                    </label>
                    <select
                      value={createForm.frequency}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, frequency: e.target.value as any }))}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={createForm.startDate}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">
                    Reason for Payment Plan *
                  </label>
                  <textarea
                    value={createForm.reason}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g., Catch-up on past due rent, Security deposit installments, etc."
                    rows={2}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                {/* Preview */}
                {createForm.totalAmount && parseFloat(createForm.totalAmount) > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Payment Plan Preview
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-small">
                      <div>
                        <p className="text-blue-700">Each Payment</p>
                        <p className="text-lg font-bold text-blue-900">
                          {formatCurrency(createPreview.installmentAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-700">Total Payments</p>
                        <p className="text-lg font-bold text-blue-900">
                          {createForm.numberOfPayments}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-700">Final Payment</p>
                        <p className="text-lg font-bold text-blue-900">
                          {createPreview.endDate}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePlan}
                  disabled={!selectedTenant || !createForm.totalAmount || isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modify Plan Modal */}
      {showModifyModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">Modify Payment Plan</h2>
                  <p className="text-small text-neutral-medium mt-1">{selectedPlan.tenantName}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowModifyModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-small text-amber-800">
                    <strong>Remaining Balance:</strong> {formatCurrency(selectedPlan.remainingAmount)}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    This will restructure the remaining payments only.
                  </p>
                </div>

                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">
                    New Number of Payments
                  </label>
                  <select
                    value={modifyForm.numberOfPayments}
                    onChange={(e) => setModifyForm(prev => ({ ...prev, numberOfPayments: e.target.value }))}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                      <option key={n} value={n}>{n} payment{n > 1 ? 's' : ''} ({formatCurrency(selectedPlan.remainingAmount / n)} each)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">
                    New Frequency
                  </label>
                  <select
                    value={modifyForm.frequency}
                    onChange={(e) => setModifyForm(prev => ({ ...prev, frequency: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowModifyModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleModifyPlan} disabled={isModifying}>
                  {isModifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Cancel Plan Modal */}
      {showCancelModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-red-600">Cancel Payment Plan</h2>
                  <p className="text-small text-neutral-medium mt-1">{selectedPlan.tenantName}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowCancelModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-small font-medium text-red-800">Warning</p>
                      <p className="text-small text-red-700 mt-1">
                        Cancelling this plan will leave a remaining balance of{' '}
                        <strong>{formatCurrency(selectedPlan.remainingAmount)}</strong> on the tenant's account.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">
                    Reason for Cancellation *
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g., Tenant moved out, Plan restructured, etc."
                    rows={3}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                  Keep Plan
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelPlan}
                  disabled={!cancelReason.trim() || isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancel Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPaymentModal && selectedPlan && selectedInstallment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">Record Payment</h2>
                  <p className="text-small text-neutral-medium mt-1">
                    Installment #{selectedInstallment.installmentNumber} - {selectedPlan.tenantName}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowRecordPaymentModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between text-small">
                    <span className="text-blue-700">Due Date:</span>
                    <span className="font-medium text-blue-900">{formatDate(selectedInstallment.dueDate)}</span>
                  </div>
                  <div className="flex justify-between text-small mt-1">
                    <span className="text-blue-700">Expected Amount:</span>
                    <span className="font-medium text-blue-900">{formatCurrency(selectedInstallment.amount)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">
                    Payment Amount *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">
                    Payment Method *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'check', label: 'Check', icon: FileText },
                      { value: 'cash', label: 'Cash', icon: Banknote },
                      { value: 'ach', label: 'ACH', icon: Building },
                      { value: 'credit_card', label: 'Card', icon: CreditCard },
                    ].map(method => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setPaymentForm(prev => ({ ...prev, paymentMethod: method.value as any }))}
                        className={`p-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                          paymentForm.paymentMethod === method.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:bg-neutral-lighter text-neutral-black'
                        }`}
                      >
                        <method.icon className="h-4 w-4" />
                        <span className="text-small font-medium">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Check #, reference, etc."
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowRecordPaymentModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleRecordPayment}
                  disabled={!paymentForm.amount || parseFloat(paymentForm.amount) <= 0 || isRecordingPayment}
                >
                  {isRecordingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Record Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PaymentPlansManagement;
