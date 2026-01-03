/**
 * Security Deposit Tracking
 * Track deposits, returns, and state-specific compliance (NC, SC, GA)
 * Zero-tolerance accounting with full audit trail
 *
 * State Rules:
 * - NC: Max 2 months rent, trust account REQUIRED, return within 30 days
 * - SC: No statutory limit, return within 30 days
 * - GA: No limit, escrow required for 10+ units, return within 30 days
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { useTenants } from '../../../../hooks/useTenants';
import { toast } from 'sonner';
import {
  Shield,
  DollarSign,
  User,
  Building,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  FileText,
  Send,
  Download,
  Plus,
  ArrowRight,
  X,
  Search,
  Banknote,
  Home,
  ClipboardCheck,
  AlertCircle,
  RefreshCw,
  Eye,
  Loader2,
  Receipt,
  Minus,
  FileCheck,
  Printer,
  Mail,
  History,
  Scale,
  Info,
  Calculator,
  Landmark,
  CreditCard,
  Check,
  XCircle,
} from 'lucide-react';

interface SecurityDeposit {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyName: string;
  propertyId?: string;
  leaseId?: string;
  unit: string;
  state: 'NC' | 'SC' | 'GA';
  depositAmount: number;
  monthlyRent: number;
  depositRatio: number;
  dateReceived: string;
  status: 'held' | 'pending_return' | 'processing' | 'returned' | 'forfeited' | 'partial_refund';
  moveOutDate?: string;
  returnDeadline?: string;
  daysUntilDeadline?: number;
  escrowAccount?: string;
  interestEarned?: number;
  deductions?: Deduction[];
  refundAmount?: number;
  refundDate?: string;
  inspectionDate?: string;
  inspectionNotes?: string;
}

interface Deduction {
  id: string;
  category: string;
  description: string;
  amount: number;
}

interface SecurityDepositTrackingProps {
  loading?: boolean;
}

// State-specific deposit rules
const STATE_DEPOSIT_RULES = {
  NC: {
    name: 'North Carolina',
    maxMonths: 2,
    returnDays: 30,
    escrowRequired: true,
    interestRequired: false,
    description: 'Max 2 months rent. Must hold in trust account. Return within 30 days of move-out.',
    citation: 'NC Gen. Stat. § 42-50 through 42-56',
    penalties: 'Failure to comply may result in forfeiting right to retain any portion of deposit.',
  },
  SC: {
    name: 'South Carolina',
    maxMonths: null,
    returnDays: 30,
    escrowRequired: false,
    interestRequired: false,
    description: 'No statutory limit on deposit amount. Return within 30 days.',
    citation: 'SC Code § 27-40-410',
    penalties: 'Landlord liable for deposit amount plus damages if not returned timely.',
  },
  GA: {
    name: 'Georgia',
    maxMonths: null,
    returnDays: 30,
    escrowRequired: '10+ units',
    interestRequired: false,
    description: 'No limit. Escrow required for properties with 10+ units. Return within 30 days.',
    citation: 'GA Code § 44-7-30 through 44-7-37',
    penalties: 'Three times the deposit amount if withheld in bad faith.',
  },
};

// Deduction categories
const DEDUCTION_CATEGORIES = [
  { value: 'cleaning', label: 'Cleaning Beyond Normal Wear', icon: Home },
  { value: 'damage_repair', label: 'Damage Repair', icon: AlertTriangle },
  { value: 'unpaid_rent', label: 'Unpaid Rent', icon: DollarSign },
  { value: 'unpaid_utilities', label: 'Unpaid Utilities', icon: Banknote },
  { value: 'key_replacement', label: 'Key/Lock Replacement', icon: Shield },
  { value: 'other', label: 'Other', icon: FileText },
];

// Trust/Escrow accounts
const ESCROW_ACCOUNTS = [
  { id: 'trust-nc-1', name: 'NC Trust Account #12345', state: 'NC', bank: 'First Citizens Bank' },
  { id: 'escrow-ga-1', name: 'GA Escrow Account #67890', state: 'GA', bank: 'Truist Bank' },
  { id: 'trust-sc-1', name: 'SC Operating Account #11111', state: 'SC', bank: 'South State Bank' },
];

// Initial deposit data
const initialDeposits: SecurityDeposit[] = [
  {
    id: 'dep-1',
    tenantId: 'tenant-1',
    tenantName: 'Johnson Family',
    propertyName: 'Raleigh Oak Apartments',
    propertyId: 'prop-1',
    leaseId: 'lease-1',
    unit: '101A',
    state: 'NC',
    depositAmount: 1500,
    monthlyRent: 1500,
    depositRatio: 1,
    dateReceived: '2024-06-01',
    status: 'held',
    escrowAccount: 'NC Trust Account #12345',
  },
  {
    id: 'dep-2',
    tenantId: 'tenant-8',
    tenantName: 'Brown, Patricia',
    propertyName: 'Charlotte Uptown Lofts',
    propertyId: 'prop-2',
    leaseId: 'lease-8',
    unit: '302',
    state: 'NC',
    depositAmount: 3700,
    monthlyRent: 1850,
    depositRatio: 2,
    dateReceived: '2023-08-15',
    status: 'pending_return',
    moveOutDate: '2025-12-15',
    returnDeadline: '2026-01-14',
    daysUntilDeadline: 15,
    escrowAccount: 'NC Trust Account #12345',
    inspectionDate: '2025-12-16',
    inspectionNotes: 'Minor wall scuffs, normal wear and tear. Carpet professionally cleaned.',
  },
  {
    id: 'dep-3',
    tenantId: 'tenant-3',
    tenantName: 'Williams Tech LLC',
    propertyName: 'Atlanta Midtown Tower',
    propertyId: 'prop-3',
    leaseId: 'lease-3',
    unit: '2201',
    state: 'GA',
    depositAmount: 11000,
    monthlyRent: 5500,
    depositRatio: 2,
    dateReceived: '2024-01-01',
    status: 'held',
    escrowAccount: 'GA Escrow Account #67890',
  },
  {
    id: 'dep-4',
    tenantId: 'tenant-4',
    tenantName: 'Chen, Amanda',
    propertyName: 'Charleston Harbor View',
    propertyId: 'prop-4',
    leaseId: 'lease-4',
    unit: '304',
    state: 'SC',
    depositAmount: 2100,
    monthlyRent: 2100,
    depositRatio: 1,
    dateReceived: '2024-03-01',
    status: 'held',
    escrowAccount: 'SC Operating Account #11111',
  },
  {
    id: 'dep-5',
    tenantId: 'tenant-9',
    tenantName: 'Garcia, Maria',
    propertyName: 'Decatur Family Homes',
    propertyId: 'prop-5',
    leaseId: 'lease-9',
    unit: '8A',
    state: 'GA',
    depositAmount: 3600,
    monthlyRent: 1800,
    depositRatio: 2,
    dateReceived: '2024-02-01',
    status: 'returned',
    moveOutDate: '2025-11-30',
    returnDeadline: '2025-12-30',
    refundAmount: 3200,
    refundDate: '2025-12-15',
    deductions: [
      { id: 'd1', category: 'cleaning', description: 'Deep cleaning required', amount: 250 },
      { id: 'd2', category: 'damage_repair', description: 'Patch holes in walls (5 locations)', amount: 150 },
    ],
  },
  {
    id: 'dep-6',
    tenantId: 'tenant-10',
    tenantName: 'Martinez, Carlos',
    propertyName: 'Raleigh Oak Apartments',
    propertyId: 'prop-1',
    leaseId: 'lease-10',
    unit: '205B',
    state: 'NC',
    depositAmount: 3000,
    monthlyRent: 1500,
    depositRatio: 2,
    dateReceived: '2024-04-01',
    status: 'processing',
    moveOutDate: '2025-12-20',
    returnDeadline: '2026-01-19',
    daysUntilDeadline: 20,
    escrowAccount: 'NC Trust Account #12345',
    inspectionDate: '2025-12-21',
    inspectionNotes: 'Significant carpet stains in living room. Broken blinds in bedroom. Unpaid water bill.',
    deductions: [
      { id: 'd3', category: 'cleaning', description: 'Carpet cleaning/replacement', amount: 450 },
      { id: 'd4', category: 'damage_repair', description: 'Replace blinds (3 windows)', amount: 180 },
      { id: 'd5', category: 'unpaid_utilities', description: 'Outstanding water bill', amount: 87.50 },
    ],
  },
];

export const SecurityDepositTracking: React.FC<SecurityDepositTrackingProps> = ({
  loading = false,
}) => {
  // State
  const [deposits, setDeposits] = useState<SecurityDeposit[]>(initialDeposits);
  const [filterState, setFilterState] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal states
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showInitiateReturnModal, setShowInitiateReturnModal] = useState(false);
  const [showProcessRefundModal, setShowProcessRefundModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<SecurityDeposit | null>(null);

  // Form states
  const [recordForm, setRecordForm] = useState({
    tenantSearch: '',
    depositAmount: '',
    escrowAccount: '',
    dateReceived: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);

  const [returnForm, setReturnForm] = useState({
    moveOutDate: '',
    inspectionDate: '',
    inspectionNotes: '',
  });

  const [refundForm, setRefundForm] = useState({
    deductions: [] as Deduction[],
    newDeductionCategory: '',
    newDeductionDescription: '',
    newDeductionAmount: '',
    refundMethod: 'check' as 'check' | 'ach',
    sendItemizedStatement: true,
  });

  // Processing states
  const [isRecording, setIsRecording] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Hooks
  const { data: tenantsData } = useTenants();
  const tenants = tenantsData || [];

  // Filtered tenants for autocomplete
  const filteredTenants = useMemo(() => {
    if (!recordForm.tenantSearch.trim()) return [];
    const search = recordForm.tenantSearch.toLowerCase();
    return tenants.filter((t: any) =>
      t.first_name?.toLowerCase().includes(search) ||
      t.last_name?.toLowerCase().includes(search) ||
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(search)
    ).slice(0, 5);
  }, [tenants, recordForm.tenantSearch]);

  // Filtered deposits
  const filteredDeposits = useMemo(() => {
    return deposits.filter(d => {
      const matchesState = filterState === 'all' || d.state === filterState;
      const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
      return matchesState && matchesStatus;
    });
  }, [deposits, filterState, filterStatus]);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'held':
        return <Badge className="bg-blue-500 text-white">Held in Escrow</Badge>;
      case 'pending_return':
        return <Badge className="bg-amber-500 text-white">Move-Out Scheduled</Badge>;
      case 'processing':
        return <Badge className="bg-purple-500 text-white">Processing Refund</Badge>;
      case 'returned':
        return <Badge className="bg-green-500 text-white">Refunded</Badge>;
      case 'partial_refund':
        return <Badge className="bg-cyan-500 text-white">Partial Refund</Badge>;
      case 'forfeited':
        return <Badge className="bg-red-500 text-white">Forfeited</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'NC': return 'bg-blue-100 text-blue-800';
      case 'SC': return 'bg-purple-100 text-purple-800';
      case 'GA': return 'bg-orange-100 text-orange-800';
      default: return 'bg-neutral-100 text-neutral-800';
    }
  };

  const checkCompliance = (deposit: SecurityDeposit): { isCompliant: boolean; issues: string[] } => {
    const issues: string[] = [];
    const rules = STATE_DEPOSIT_RULES[deposit.state];

    if (deposit.state === 'NC' && deposit.depositRatio > 2) {
      issues.push(`Exceeds NC maximum of 2 months rent (current: ${deposit.depositRatio}x)`);
    }

    if (deposit.state === 'NC' && !deposit.escrowAccount) {
      issues.push('NC requires deposit to be held in trust account');
    }

    if (deposit.state === 'GA' && !deposit.escrowAccount) {
      issues.push('GA may require escrow for properties with 10+ units');
    }

    return { isCompliant: issues.length === 0, issues };
  };

  // Calculate days until deadline
  const calculateDaysUntilDeadline = (moveOutDate: string): number => {
    const moveOut = new Date(moveOutDate);
    const deadline = new Date(moveOut);
    deadline.setDate(deadline.getDate() + 30);
    const today = new Date();
    return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Security deposits refreshed');
    setIsRefreshing(false);
  };

  const handleSelectTenant = (tenant: any) => {
    setSelectedTenant(tenant);
    setRecordForm(prev => ({
      ...prev,
      tenantSearch: `${tenant.first_name} ${tenant.last_name}`,
      depositAmount: tenant.lease?.monthly_rent ? (tenant.lease.monthly_rent * 1).toString() : '',
    }));
    setShowTenantDropdown(false);
  };

  const handleRecordDeposit = async () => {
    if (!selectedTenant) {
      toast.error('Please select a tenant');
      return;
    }
    if (!recordForm.depositAmount || parseFloat(recordForm.depositAmount) <= 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }
    if (!recordForm.escrowAccount) {
      toast.error('Please select an escrow/trust account');
      return;
    }

    setIsRecording(true);

    try {
      const state = selectedTenant.property?.state || 'NC';
      const monthlyRent = selectedTenant.lease?.monthly_rent || 0;
      const depositAmount = parseFloat(recordForm.depositAmount);
      const ratio = monthlyRent > 0 ? depositAmount / monthlyRent : 0;

      // Check NC compliance
      if (state === 'NC' && ratio > 2) {
        toast.error(
          <div className="space-y-1">
            <p className="font-semibold">NC Compliance Warning</p>
            <p className="text-sm">Deposit exceeds NC maximum of 2 months rent</p>
            <p className="text-xs">Current: {ratio.toFixed(1)}x rent. Please reduce to comply.</p>
          </div>
        );
        setIsRecording(false);
        return;
      }

      const newDeposit: SecurityDeposit = {
        id: `dep-${Date.now()}`,
        tenantId: selectedTenant.id,
        tenantName: `${selectedTenant.last_name}, ${selectedTenant.first_name}`,
        propertyName: selectedTenant.property?.name || 'Unknown Property',
        propertyId: selectedTenant.property_id,
        leaseId: selectedTenant.lease_id,
        unit: selectedTenant.unit?.unit_number || 'N/A',
        state: state as 'NC' | 'SC' | 'GA',
        depositAmount,
        monthlyRent,
        depositRatio: Math.round(ratio * 10) / 10,
        dateReceived: recordForm.dateReceived,
        status: 'held',
        escrowAccount: recordForm.escrowAccount,
      };

      setDeposits(prev => [newDeposit, ...prev]);

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Security Deposit Recorded</p>
          <p className="text-sm">{newDeposit.tenantName} - {formatCurrency(depositAmount)}</p>
          <p className="text-xs text-green-700">{state} compliant - Held in {recordForm.escrowAccount}</p>
        </div>,
        { duration: 5000 }
      );

      setShowRecordModal(false);
      setSelectedTenant(null);
      setRecordForm({
        tenantSearch: '',
        depositAmount: '',
        escrowAccount: '',
        dateReceived: new Date().toISOString().split('T')[0],
        notes: '',
      });

    } catch (error) {
      console.error('[SecurityDeposit] Record failed:', error);
      toast.error('Failed to record security deposit');
    } finally {
      setIsRecording(false);
    }
  };

  const openInitiateReturnModal = (deposit: SecurityDeposit) => {
    setSelectedDeposit(deposit);
    setReturnForm({
      moveOutDate: '',
      inspectionDate: '',
      inspectionNotes: '',
    });
    setShowInitiateReturnModal(true);
  };

  const handleInitiateReturn = async () => {
    if (!selectedDeposit) return;
    if (!returnForm.moveOutDate) {
      toast.error('Please enter the move-out date');
      return;
    }

    setIsInitiating(true);

    try {
      const moveOutDate = new Date(returnForm.moveOutDate);
      const returnDeadline = new Date(moveOutDate);
      returnDeadline.setDate(returnDeadline.getDate() + 30);

      setDeposits(prev => prev.map(d => {
        if (d.id === selectedDeposit.id) {
          return {
            ...d,
            status: 'pending_return' as const,
            moveOutDate: returnForm.moveOutDate,
            returnDeadline: returnDeadline.toISOString().split('T')[0],
            daysUntilDeadline: calculateDaysUntilDeadline(returnForm.moveOutDate),
            inspectionDate: returnForm.inspectionDate || undefined,
            inspectionNotes: returnForm.inspectionNotes || undefined,
          };
        }
        return d;
      }));

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Return Process Initiated</p>
          <p className="text-sm">{selectedDeposit.tenantName}</p>
          <p className="text-xs">Refund deadline: {formatDate(returnDeadline.toISOString().split('T')[0])}</p>
          <p className="text-xs text-amber-700">You have 30 days to process the refund per {selectedDeposit.state} law</p>
        </div>,
        { duration: 6000 }
      );

      setShowInitiateReturnModal(false);
      setSelectedDeposit(null);

    } catch (error) {
      console.error('[SecurityDeposit] Initiate return failed:', error);
      toast.error('Failed to initiate return');
    } finally {
      setIsInitiating(false);
    }
  };

  const openProcessRefundModal = (deposit: SecurityDeposit) => {
    setSelectedDeposit(deposit);
    setRefundForm({
      deductions: deposit.deductions || [],
      newDeductionCategory: '',
      newDeductionDescription: '',
      newDeductionAmount: '',
      refundMethod: 'check',
      sendItemizedStatement: true,
    });
    setShowProcessRefundModal(true);
  };

  const addDeduction = () => {
    if (!refundForm.newDeductionCategory || !refundForm.newDeductionAmount) {
      toast.error('Please fill in deduction category and amount');
      return;
    }

    const newDeduction: Deduction = {
      id: `ded-${Date.now()}`,
      category: refundForm.newDeductionCategory,
      description: refundForm.newDeductionDescription || DEDUCTION_CATEGORIES.find(c => c.value === refundForm.newDeductionCategory)?.label || '',
      amount: parseFloat(refundForm.newDeductionAmount),
    };

    setRefundForm(prev => ({
      ...prev,
      deductions: [...prev.deductions, newDeduction],
      newDeductionCategory: '',
      newDeductionDescription: '',
      newDeductionAmount: '',
    }));
  };

  const removeDeduction = (id: string) => {
    setRefundForm(prev => ({
      ...prev,
      deductions: prev.deductions.filter(d => d.id !== id),
    }));
  };

  const handleProcessRefund = async () => {
    if (!selectedDeposit) return;

    setIsProcessing(true);

    try {
      const totalDeductions = refundForm.deductions.reduce((sum, d) => sum + d.amount, 0);
      const refundAmount = selectedDeposit.depositAmount - totalDeductions;

      if (refundAmount < 0) {
        toast.error('Deductions exceed deposit amount. Adjust deductions or collect additional payment.');
        setIsProcessing(false);
        return;
      }

      setDeposits(prev => prev.map(d => {
        if (d.id === selectedDeposit.id) {
          return {
            ...d,
            status: refundAmount === selectedDeposit.depositAmount ? 'returned' as const : 'partial_refund' as const,
            deductions: refundForm.deductions,
            refundAmount,
            refundDate: new Date().toISOString().split('T')[0],
          };
        }
        return d;
      }));

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Refund Processed Successfully</p>
          <p className="text-sm">{selectedDeposit.tenantName}</p>
          <div className="text-xs space-y-0.5">
            <p>Original Deposit: {formatCurrency(selectedDeposit.depositAmount)}</p>
            {totalDeductions > 0 && <p className="text-red-600">Deductions: -{formatCurrency(totalDeductions)}</p>}
            <p className="text-green-700 font-medium">Refund Amount: {formatCurrency(refundAmount)}</p>
          </div>
          {refundForm.sendItemizedStatement && (
            <p className="text-xs text-blue-600">Itemized statement will be sent to tenant</p>
          )}
        </div>,
        { duration: 8000 }
      );

      setShowProcessRefundModal(false);
      setSelectedDeposit(null);

    } catch (error) {
      console.error('[SecurityDeposit] Process refund failed:', error);
      toast.error('Failed to process refund');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDetailsModal = (deposit: SecurityDeposit) => {
    setSelectedDeposit(deposit);
    setShowDetailsModal(true);
  };

  const handleExportReport = () => {
    // Generate CSV content
    const headers = ['Tenant', 'Property', 'Unit', 'State', 'Deposit Amount', 'Status', 'Date Received', 'Escrow Account'];
    const rows = filteredDeposits.map(d => [
      d.tenantName,
      d.propertyName,
      d.unit,
      d.state,
      d.depositAmount.toFixed(2),
      d.status,
      d.dateReceived,
      d.escrowAccount || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-deposits-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Report exported successfully');
  };

  // Calculate stats
  const stats = useMemo(() => {
    const held = deposits.filter(d => d.status === 'held');
    const pendingReturn = deposits.filter(d => d.status === 'pending_return' || d.status === 'processing');
    const returned = deposits.filter(d => d.status === 'returned' || d.status === 'partial_refund');
    const urgent = pendingReturn.filter(d => d.daysUntilDeadline !== undefined && d.daysUntilDeadline <= 7);
    const nonCompliant = deposits.filter(d => !checkCompliance(d).isCompliant);

    return {
      totalHeld: held.reduce((sum, d) => sum + d.depositAmount, 0),
      heldCount: held.length,
      pendingReturnCount: pendingReturn.length,
      returnedCount: returned.length,
      urgentCount: urgent.length,
      urgentDeposits: urgent,
      complianceRate: deposits.length > 0 ? ((deposits.length - nonCompliant.length) / deposits.length * 100) : 100,
      nonCompliantCount: nonCompliant.length,
    };
  }, [deposits]);

  // Refund calculation for modal
  const refundCalculation = useMemo(() => {
    if (!selectedDeposit) return { totalDeductions: 0, refundAmount: 0 };
    const totalDeductions = refundForm.deductions.reduce((sum, d) => sum + d.amount, 0);
    return {
      totalDeductions,
      refundAmount: Math.max(0, selectedDeposit.depositAmount - totalDeductions),
    };
  }, [selectedDeposit, refundForm.deductions]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="text-small text-neutral-medium">Deposits Held</span>
          </div>
          <p className="text-h3 font-bold text-blue-600">{formatCurrency(stats.totalHeld)}</p>
          <p className="text-small text-neutral-medium mt-1">{stats.heldCount} active deposits</p>
        </Card>

        <Card className={`p-4 ${stats.pendingReturnCount > 0 ? 'bg-amber-50 border-amber-200' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-small text-neutral-medium">Pending Returns</span>
          </div>
          <p className="text-h3 font-bold text-amber-600">{stats.pendingReturnCount}</p>
          {stats.urgentCount > 0 && (
            <p className="text-small text-red-600 font-medium mt-1">
              {stats.urgentCount} due within 7 days!
            </p>
          )}
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-small text-green-700">Returned</span>
          </div>
          <p className="text-h3 font-bold text-green-600">{stats.returnedCount}</p>
          <p className="text-small text-green-700 mt-1">This year</p>
        </Card>

        <Card className={`p-4 ${stats.complianceRate < 100 ? 'bg-red-50 border-red-200' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-small text-neutral-medium">Compliance</span>
          </div>
          <p className={`text-h3 font-bold ${stats.complianceRate === 100 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.complianceRate.toFixed(0)}%
          </p>
          {stats.nonCompliantCount > 0 && (
            <p className="text-small text-red-600 mt-1">{stats.nonCompliantCount} issues</p>
          )}
        </Card>

        <Card
          className="p-4 hover:bg-primary/5 transition-colors cursor-pointer border-2 border-dashed border-primary/30"
          onClick={() => setShowRecordModal(true)}
        >
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Plus className="h-6 w-6 text-primary mx-auto mb-1" />
              <span className="text-small font-medium text-primary">Record Deposit</span>
            </div>
          </div>
        </Card>
      </div>

      {/* State Rules Reference */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Scale className="h-5 w-5 text-primary" />
          <h3 className="text-h4 font-semibold text-neutral-black">State Security Deposit Laws</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(STATE_DEPOSIT_RULES).map(([code, rules]) => (
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
                  <span className="text-neutral-medium">Max Deposit</span>
                  <span className="font-medium">{rules.maxMonths ? `${rules.maxMonths} months rent` : 'No limit'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-medium">Return Deadline</span>
                  <span className="font-medium">{rules.returnDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-medium">Trust Account</span>
                  <span className="font-medium">
                    {typeof rules.escrowRequired === 'string' ? rules.escrowRequired : rules.escrowRequired ? 'Required' : 'Not required'}
                  </span>
                </div>
              </div>

              <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
                <Info className="h-3 w-3 inline mr-1" />
                {rules.description}
              </div>

              <p className="text-xs text-neutral-medium mt-2 italic">{rules.citation}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Urgent Returns Alert */}
      {stats.urgentDeposits.length > 0 && (
        <Card className="p-4 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 mb-3">
                Action Required: {stats.urgentDeposits.length} refund{stats.urgentDeposits.length > 1 ? 's' : ''} due within 7 days
              </h4>
              <div className="space-y-2">
                {stats.urgentDeposits.map((deposit) => (
                  <div key={deposit.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-red-200">
                    <div>
                      <p className="font-medium text-neutral-black">{deposit.tenantName}</p>
                      <p className="text-small text-neutral-medium">
                        {deposit.propertyName} - Unit {deposit.unit} | {formatCurrency(deposit.depositAmount)}
                      </p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="font-bold text-red-600">{deposit.daysUntilDeadline} days left</p>
                      <p className="text-small text-neutral-medium">Due: {formatDate(deposit.returnDeadline!)}</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => openProcessRefundModal(deposit)}
                    >
                      Process Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filters & Actions */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-small text-neutral-medium">State:</label>
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg text-small focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All States ({deposits.length})</option>
                <option value="NC">North Carolina ({deposits.filter(d => d.state === 'NC').length})</option>
                <option value="SC">South Carolina ({deposits.filter(d => d.state === 'SC').length})</option>
                <option value="GA">Georgia ({deposits.filter(d => d.state === 'GA').length})</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-small text-neutral-medium">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg text-small focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Statuses</option>
                <option value="held">Held in Escrow ({deposits.filter(d => d.status === 'held').length})</option>
                <option value="pending_return">Move-Out Scheduled ({deposits.filter(d => d.status === 'pending_return').length})</option>
                <option value="processing">Processing ({deposits.filter(d => d.status === 'processing').length})</option>
                <option value="returned">Refunded ({deposits.filter(d => d.status === 'returned').length})</option>
                <option value="partial_refund">Partial Refund ({deposits.filter(d => d.status === 'partial_refund').length})</option>
              </select>
            </div>

            <span className="text-small text-neutral-medium">
              Showing {filteredDeposits.length} deposit{filteredDeposits.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </Card>

      {/* Deposits Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-h4 font-semibold text-neutral-black">Security Deposits</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-lighter">
              <tr>
                <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Tenant</th>
                <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Property</th>
                <th className="px-4 py-3 text-center text-small font-medium text-neutral-medium">State</th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">Deposit</th>
                <th className="px-4 py-3 text-center text-small font-medium text-neutral-medium">Ratio</th>
                <th className="px-4 py-3 text-center text-small font-medium text-neutral-medium">Status</th>
                <th className="px-4 py-3 text-center text-small font-medium text-neutral-medium">Compliance</th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Shield className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
                    <p className="text-neutral-medium">No deposits match your filters</p>
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((deposit) => {
                  const compliance = checkCompliance(deposit);
                  return (
                    <tr
                      key={deposit.id}
                      className={`hover:bg-neutral-lighter/50 transition-colors ${
                        deposit.status === 'pending_return' && deposit.daysUntilDeadline && deposit.daysUntilDeadline <= 7
                          ? 'bg-red-50/50'
                          : deposit.status === 'returned' || deposit.status === 'partial_refund'
                          ? 'bg-green-50/30'
                          : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            deposit.status === 'returned' ? 'bg-green-100' :
                            deposit.status === 'pending_return' ? 'bg-amber-100' :
                            'bg-primary/10'
                          }`}>
                            <User className={`h-4 w-4 ${
                              deposit.status === 'returned' ? 'text-green-600' :
                              deposit.status === 'pending_return' ? 'text-amber-600' :
                              'text-primary'
                            }`} />
                          </div>
                          <div>
                            <p className="text-small font-medium text-neutral-black">{deposit.tenantName}</p>
                            <p className="text-xs text-neutral-medium">Unit {deposit.unit}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-neutral-medium" />
                          <span className="text-small text-neutral-black">{deposit.propertyName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-small font-medium ${getStateColor(deposit.state)}`}>
                          {deposit.state}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-small font-bold text-neutral-black">{formatCurrency(deposit.depositAmount)}</p>
                        {deposit.refundAmount !== undefined && deposit.refundAmount !== deposit.depositAmount && (
                          <p className="text-xs text-green-600">Refund: {formatCurrency(deposit.refundAmount)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-small font-medium ${
                          deposit.state === 'NC' && deposit.depositRatio > 2 ? 'text-red-600' : 'text-neutral-black'
                        }`}>
                          {deposit.depositRatio}x rent
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(deposit.status)}
                        {deposit.status === 'pending_return' && deposit.daysUntilDeadline !== undefined && (
                          <p className={`text-xs mt-1 font-medium ${
                            deposit.daysUntilDeadline <= 7 ? 'text-red-600' : 'text-amber-600'
                          }`}>
                            {deposit.daysUntilDeadline} days to refund
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {compliance.isCompliant ? (
                          <div className="flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center" title={compliance.issues.join(', ')}>
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {deposit.status === 'held' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openInitiateReturnModal(deposit)}
                              title="Begin the return process when tenant moves out"
                            >
                              <Home className="h-3 w-3 mr-1" />
                              Begin Return
                            </Button>
                          )}
                          {(deposit.status === 'pending_return' || deposit.status === 'processing') && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => openProcessRefundModal(deposit)}
                              title="Process the refund and send itemized statement"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Process Refund
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailsModal(deposit)}
                            title="View deposit details and history"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Escrow Account Summary */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Landmark className="h-5 w-5 text-primary" />
          <h3 className="text-h4 font-semibold text-neutral-black">Trust/Escrow Accounts</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ESCROW_ACCOUNTS.map(account => {
            const accountDeposits = deposits.filter(d => d.escrowAccount === account.name && d.status === 'held');
            const totalAmount = accountDeposits.reduce((sum, d) => sum + d.depositAmount, 0);

            return (
              <div key={account.id} className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-neutral-black">{account.name}</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <p className="text-small text-neutral-medium mb-2">{account.bank}</p>
                <p className="text-h4 font-bold text-neutral-black">{formatCurrency(totalAmount)}</p>
                <p className="text-small text-neutral-medium">{accountDeposits.length} deposits</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Record Deposit Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">Record Security Deposit</h2>
                  <p className="text-small text-neutral-medium mt-1">Record a new deposit with escrow account assignment</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowRecordModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Tenant Selection */}
                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">Select Tenant *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                    <input
                      type="text"
                      value={recordForm.tenantSearch}
                      onChange={(e) => {
                        setRecordForm(prev => ({ ...prev, tenantSearch: e.target.value }));
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
                                {tenant.property?.name} - Unit {tenant.unit?.unit_number}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedTenant && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div className="flex-1">
                          <p className="text-small font-medium text-green-800">
                            {selectedTenant.first_name} {selectedTenant.last_name}
                          </p>
                          <p className="text-xs text-green-700">
                            {selectedTenant.property?.name} - Unit {selectedTenant.unit?.unit_number} |
                            State: {selectedTenant.property?.state || 'NC'} |
                            Rent: {formatCurrency(selectedTenant.lease?.monthly_rent || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">Deposit Amount *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                      <input
                        type="number"
                        value={recordForm.depositAmount}
                        onChange={(e) => setRecordForm(prev => ({ ...prev, depositAmount: e.target.value }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    {selectedTenant && recordForm.depositAmount && (
                      <p className="text-xs text-neutral-medium mt-1">
                        = {(parseFloat(recordForm.depositAmount) / (selectedTenant.lease?.monthly_rent || 1)).toFixed(1)}x monthly rent
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">Date Received *</label>
                    <input
                      type="date"
                      value={recordForm.dateReceived}
                      onChange={(e) => setRecordForm(prev => ({ ...prev, dateReceived: e.target.value }))}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                {/* Escrow Account */}
                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">Trust/Escrow Account *</label>
                  <select
                    value={recordForm.escrowAccount}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, escrowAccount: e.target.value }))}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select account...</option>
                    {ESCROW_ACCOUNTS.map(account => (
                      <option key={account.id} value={account.name}>
                        {account.name} ({account.bank})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Compliance Notice */}
                {selectedTenant && (
                  <div className={`p-4 rounded-lg ${
                    selectedTenant.property?.state === 'NC' ? 'bg-blue-50 border border-blue-200' : 'bg-neutral-lighter'
                  }`}>
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-small font-medium text-blue-900">
                          {selectedTenant.property?.state || 'NC'} Compliance Requirements
                        </p>
                        <p className="text-small text-blue-700 mt-1">
                          {STATE_DEPOSIT_RULES[selectedTenant.property?.state as keyof typeof STATE_DEPOSIT_RULES || 'NC'].description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowRecordModal(false)}>Cancel</Button>
                <Button
                  onClick={handleRecordDeposit}
                  disabled={!selectedTenant || !recordForm.depositAmount || !recordForm.escrowAccount || isRecording}
                >
                  {isRecording ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording...</>
                  ) : (
                    <><Shield className="h-4 w-4 mr-2" />Record Deposit</>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Initiate Return Modal */}
      {showInitiateReturnModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">Begin Return Process</h2>
                  <p className="text-small text-neutral-medium mt-1">{selectedDeposit.tenantName}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowInitiateReturnModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between text-small mb-2">
                    <span className="text-blue-700">Deposit Amount:</span>
                    <span className="font-bold text-blue-900">{formatCurrency(selectedDeposit.depositAmount)}</span>
                  </div>
                  <div className="flex justify-between text-small">
                    <span className="text-blue-700">Held Since:</span>
                    <span className="font-medium text-blue-900">{formatDate(selectedDeposit.dateReceived)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">Move-Out Date *</label>
                  <input
                    type="date"
                    value={returnForm.moveOutDate}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, moveOutDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {returnForm.moveOutDate && (
                    <p className="text-xs text-amber-600 mt-1">
                      Refund deadline: {formatDate((() => {
                        const d = new Date(returnForm.moveOutDate);
                        d.setDate(d.getDate() + 30);
                        return d.toISOString().split('T')[0];
                      })())} (30 days per {selectedDeposit.state} law)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">Inspection Date</label>
                  <input
                    type="date"
                    value={returnForm.inspectionDate}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, inspectionDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">Inspection Notes</label>
                  <textarea
                    value={returnForm.inspectionNotes}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, inspectionNotes: e.target.value }))}
                    placeholder="Document condition of property, any damages, cleaning needed, etc."
                    rows={3}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-small font-medium text-amber-800">What happens next:</p>
                      <ol className="text-small text-amber-700 mt-2 list-decimal list-inside space-y-1">
                        <li>Deposit status changes to "Move-Out Scheduled"</li>
                        <li>Complete your move-out inspection and document any deductions</li>
                        <li>Process the refund within 30 days</li>
                        <li>Send itemized statement with any deductions to tenant</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowInitiateReturnModal(false)}>Cancel</Button>
                <Button onClick={handleInitiateReturn} disabled={!returnForm.moveOutDate || isInitiating}>
                  {isInitiating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                  ) : (
                    <><ClipboardCheck className="h-4 w-4 mr-2" />Begin Return Process</>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Process Refund Modal */}
      {showProcessRefundModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">Process Security Deposit Refund</h2>
                  <p className="text-small text-neutral-medium mt-1">{selectedDeposit.tenantName} - {selectedDeposit.propertyName}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowProcessRefundModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Deposit Summary */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-small">
                    <div>
                      <p className="text-blue-700">Original Deposit</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(selectedDeposit.depositAmount)}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Move-Out Date</p>
                      <p className="text-lg font-bold text-blue-900">{selectedDeposit.moveOutDate ? formatDate(selectedDeposit.moveOutDate) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-blue-700">Days Until Deadline</p>
                      <p className={`text-lg font-bold ${selectedDeposit.daysUntilDeadline && selectedDeposit.daysUntilDeadline <= 7 ? 'text-red-600' : 'text-blue-900'}`}>
                        {selectedDeposit.daysUntilDeadline ?? 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inspection Notes */}
                {selectedDeposit.inspectionNotes && (
                  <div className="p-4 bg-neutral-lighter rounded-lg">
                    <p className="text-small font-medium text-neutral-black mb-2">Inspection Notes:</p>
                    <p className="text-small text-neutral-medium">{selectedDeposit.inspectionNotes}</p>
                  </div>
                )}

                {/* Deductions */}
                <div>
                  <h4 className="font-medium text-neutral-black mb-3">Deductions</h4>

                  {refundForm.deductions.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {refundForm.deductions.map((deduction) => (
                        <div key={deduction.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div>
                            <p className="text-small font-medium text-neutral-black">{deduction.description}</p>
                            <p className="text-xs text-neutral-medium">{DEDUCTION_CATEGORIES.find(c => c.value === deduction.category)?.label}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-small font-bold text-red-600">-{formatCurrency(deduction.amount)}</span>
                            <Button variant="ghost" size="sm" onClick={() => removeDeduction(deduction.id)}>
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Deduction Form */}
                  <div className="p-4 border border-dashed border-border rounded-lg">
                    <p className="text-small font-medium text-neutral-black mb-3">Add Deduction</p>
                    <div className="grid grid-cols-3 gap-3">
                      <select
                        value={refundForm.newDeductionCategory}
                        onChange={(e) => setRefundForm(prev => ({ ...prev, newDeductionCategory: e.target.value }))}
                        className="px-3 py-2 border border-border rounded-lg text-small"
                      >
                        <option value="">Category...</option>
                        {DEDUCTION_CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={refundForm.newDeductionDescription}
                        onChange={(e) => setRefundForm(prev => ({ ...prev, newDeductionDescription: e.target.value }))}
                        placeholder="Description"
                        className="px-3 py-2 border border-border rounded-lg text-small"
                      />
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                          <input
                            type="number"
                            value={refundForm.newDeductionAmount}
                            onChange={(e) => setRefundForm(prev => ({ ...prev, newDeductionAmount: e.target.value }))}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-small"
                          />
                        </div>
                        <Button variant="outline" size="sm" onClick={addDeduction}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refund Summary */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between text-small">
                      <span className="text-neutral-medium">Original Deposit:</span>
                      <span className="font-medium">{formatCurrency(selectedDeposit.depositAmount)}</span>
                    </div>
                    {refundCalculation.totalDeductions > 0 && (
                      <div className="flex justify-between text-small text-red-600">
                        <span>Total Deductions:</span>
                        <span className="font-medium">-{formatCurrency(refundCalculation.totalDeductions)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-green-300 pt-2 mt-2">
                      <span className="text-green-800">Refund Amount:</span>
                      <span className="text-green-600">{formatCurrency(refundCalculation.refundAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Refund Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">Refund Method</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRefundForm(prev => ({ ...prev, refundMethod: 'check' }))}
                        className={`flex-1 p-3 border rounded-lg flex items-center justify-center gap-2 ${
                          refundForm.refundMethod === 'check' ? 'border-primary bg-primary/5 text-primary' : 'border-border'
                        }`}
                      >
                        <FileText className="h-4 w-4" />
                        <span className="text-small font-medium">Check</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefundForm(prev => ({ ...prev, refundMethod: 'ach' }))}
                        className={`flex-1 p-3 border rounded-lg flex items-center justify-center gap-2 ${
                          refundForm.refundMethod === 'ach' ? 'border-primary bg-primary/5 text-primary' : 'border-border'
                        }`}
                      >
                        <Building className="h-4 w-4" />
                        <span className="text-small font-medium">ACH</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={refundForm.sendItemizedStatement}
                        onChange={(e) => setRefundForm(prev => ({ ...prev, sendItemizedStatement: e.target.checked }))}
                        className="w-4 h-4 rounded border-border"
                      />
                      <span className="text-small text-neutral-black">Send itemized statement to tenant</span>
                    </label>
                  </div>
                </div>

                {/* Legal Notice */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Scale className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-small font-medium text-amber-800">{selectedDeposit.state} Legal Requirement</p>
                      <p className="text-small text-amber-700 mt-1">
                        {STATE_DEPOSIT_RULES[selectedDeposit.state].description}
                      </p>
                      <p className="text-xs text-amber-600 mt-2 italic">
                        {STATE_DEPOSIT_RULES[selectedDeposit.state].penalties}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowProcessRefundModal(false)}>Cancel</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleProcessRefund}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                  ) : (
                    <><Check className="h-4 w-4 mr-2" />Process Refund ({formatCurrency(refundCalculation.refundAmount)})</>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">Deposit Details</h2>
                  <p className="text-small text-neutral-medium mt-1">{selectedDeposit.tenantName}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDetailsModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-lighter rounded-lg">
                    <p className="text-small text-neutral-medium">Property</p>
                    <p className="font-medium text-neutral-black">{selectedDeposit.propertyName}</p>
                    <p className="text-small text-neutral-medium">Unit {selectedDeposit.unit}</p>
                  </div>
                  <div className="p-4 bg-neutral-lighter rounded-lg">
                    <p className="text-small text-neutral-medium">State</p>
                    <span className={`inline-block px-2 py-1 rounded text-small font-medium ${getStateColor(selectedDeposit.state)}`}>
                      {selectedDeposit.state} - {STATE_DEPOSIT_RULES[selectedDeposit.state].name}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-small text-neutral-medium">Deposit Amount</p>
                    <p className="text-h4 font-bold text-neutral-black">{formatCurrency(selectedDeposit.depositAmount)}</p>
                    <p className="text-xs text-neutral-medium">{selectedDeposit.depositRatio}x monthly rent</p>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-small text-neutral-medium">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedDeposit.status)}</div>
                  </div>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <p className="text-small text-neutral-medium mb-2">Timeline</p>
                  <div className="space-y-2 text-small">
                    <div className="flex justify-between">
                      <span className="text-neutral-medium">Date Received:</span>
                      <span className="font-medium">{formatDate(selectedDeposit.dateReceived)}</span>
                    </div>
                    {selectedDeposit.moveOutDate && (
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Move-Out Date:</span>
                        <span className="font-medium">{formatDate(selectedDeposit.moveOutDate)}</span>
                      </div>
                    )}
                    {selectedDeposit.returnDeadline && (
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Refund Deadline:</span>
                        <span className={`font-medium ${selectedDeposit.daysUntilDeadline && selectedDeposit.daysUntilDeadline <= 7 ? 'text-red-600' : ''}`}>
                          {formatDate(selectedDeposit.returnDeadline)}
                        </span>
                      </div>
                    )}
                    {selectedDeposit.refundDate && (
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Refund Date:</span>
                        <span className="font-medium text-green-600">{formatDate(selectedDeposit.refundDate)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedDeposit.escrowAccount && (
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-small text-neutral-medium mb-1">Escrow Account</p>
                    <p className="font-medium text-neutral-black">{selectedDeposit.escrowAccount}</p>
                  </div>
                )}

                {selectedDeposit.deductions && selectedDeposit.deductions.length > 0 && (
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-small font-medium text-neutral-black mb-3">Deductions Applied</p>
                    <div className="space-y-2">
                      {selectedDeposit.deductions.map(d => (
                        <div key={d.id} className="flex justify-between text-small">
                          <span className="text-neutral-medium">{d.description}</span>
                          <span className="text-red-600">-{formatCurrency(d.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-small font-bold border-t pt-2 mt-2">
                        <span>Refund Amount</span>
                        <span className="text-green-600">{formatCurrency(selectedDeposit.refundAmount || 0)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedDeposit.inspectionNotes && (
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-small font-medium text-neutral-black mb-2">Inspection Notes</p>
                    <p className="text-small text-neutral-medium">{selectedDeposit.inspectionNotes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Close</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SecurityDepositTracking;
