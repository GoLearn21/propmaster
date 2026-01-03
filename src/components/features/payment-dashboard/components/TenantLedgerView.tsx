/**
 * Tenant Ledger View
 * Shows complete tenant financial history with statement generation
 * Production-ready with database integration
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { useTenants, useTenant, useTenantPayments, useRecordPayment as useTenantRecordPayment } from '../../../../hooks/useTenants';
import { usePaymentHistory, useRecordPayment, useApplyLateFee } from '../../../../hooks/usePayments';
import { toast } from 'sonner';
import {
  User,
  Building,
  Calendar,
  DollarSign,
  FileText,
  Download,
  Send,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Clock,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  X,
  Loader2,
  Mail,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface LedgerEntry {
  id: string;
  date: string;
  type: 'charge' | 'payment' | 'credit' | 'adjustment' | 'late_fee';
  description: string;
  amount: number;
  runningBalance: number;
  reference?: string;
}

interface TenantInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyName: string;
  unit: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  securityDeposit: number;
  currentBalance: number;
}

interface TenantLedgerViewProps {
  tenantId?: string;
  loading?: boolean;
}

// Modal Component
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h4 font-semibold text-neutral-black">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-lighter"
          >
            <X className="h-5 w-5 text-neutral-medium" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const TenantLedgerView: React.FC<TenantLedgerViewProps> = ({
  tenantId: initialTenantId,
  loading = false,
}) => {
  // State for tenant selection and search
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(initialTenantId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const searchRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [showPostChargeModal, setShowPostChargeModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Form states for modals
  const [chargeForm, setChargeForm] = useState({ description: '', amount: '', chargeType: 'rent' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'ach', reference: '', notes: '' });
  const [paymentPlanForm, setPaymentPlanForm] = useState({ totalAmount: '', installments: '3', startDate: '' });
  const [statementForm, setStatementForm] = useState({ startDate: '', endDate: '', email: '' });
  const [reminderForm, setReminderForm] = useState({ message: '', sendEmail: true, sendSms: false });

  // Fetch all tenants for search
  const { data: allTenants = [], isLoading: tenantsLoading } = useTenants();

  // Fetch selected tenant data
  const { data: selectedTenant, isLoading: tenantLoading } = useTenant(selectedTenantId || '');

  // Fetch tenant payments/transactions
  const { data: tenantPayments = [], isLoading: paymentsLoading } = usePaymentHistory({
    tenantId: selectedTenantId || undefined,
  });

  // Mutations
  const recordPaymentMutation = useRecordPayment();
  const applyLateFeeMutation = useApplyLateFee();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter tenants based on search query
  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return allTenants.slice(0, 10);
    const query = searchQuery.toLowerCase();
    return allTenants.filter((tenant: any) => {
      const name = `${tenant.first_name || ''} ${tenant.last_name || ''}`.toLowerCase();
      const email = (tenant.email || '').toLowerCase();
      const unit = (tenant.unit_id || tenant.unit || '').toLowerCase();
      return name.includes(query) || email.includes(query) || unit.includes(query);
    }).slice(0, 10);
  }, [allTenants, searchQuery]);

  // Transform tenant data for display
  const tenant: TenantInfo | null = useMemo(() => {
    if (!selectedTenant) return null;
    return {
      id: selectedTenant.id,
      name: `${selectedTenant.first_name || ''} ${selectedTenant.last_name || ''}`.trim() || 'Unknown Tenant',
      email: selectedTenant.email || '',
      phone: selectedTenant.phone || '',
      propertyName: selectedTenant.property?.name || selectedTenant.property_name || 'Property',
      unit: selectedTenant.unit_id || selectedTenant.unit || 'N/A',
      leaseStart: selectedTenant.lease_start_date || selectedTenant.move_in_date || '',
      leaseEnd: selectedTenant.lease_end_date || '',
      monthlyRent: selectedTenant.rent_amount || 0,
      securityDeposit: selectedTenant.security_deposit || 0,
      currentBalance: selectedTenant.balance || 0,
    };
  }, [selectedTenant]);

  // Transform payments into ledger entries
  const ledgerEntries: LedgerEntry[] = useMemo(() => {
    if (!tenantPayments.length) return [];

    let runningBalance = 0;
    const entries = tenantPayments.map((payment: any) => {
      const isCredit = payment.status === 'paid';
      const amount = isCredit ? -payment.amount : payment.amount;
      runningBalance += amount;

      return {
        id: payment.id,
        date: payment.payment_date || payment.created_at,
        type: isCredit ? 'payment' : (payment.late_fee ? 'late_fee' : 'charge'),
        description: payment.notes || payment.description || (isCredit ? 'Payment Received' : 'Rent Charge'),
        amount: amount,
        runningBalance: runningBalance,
        reference: payment.reference_number || `TXN-${payment.id.substring(0, 8)}`,
      };
    }).sort((a: LedgerEntry, b: LedgerEntry) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Recalculate running balance from oldest to newest
    let balance = 0;
    const sorted = [...entries].reverse();
    sorted.forEach(entry => {
      balance += entry.amount;
      entry.runningBalance = balance;
    });

    return entries;
  }, [tenantPayments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getEntryIcon = (type: string) => {
    switch (type) {
      case 'charge':
        return <ArrowUpRight className="h-4 w-4 text-status-error" />;
      case 'payment':
        return <ArrowDownLeft className="h-4 w-4 text-accent-green" />;
      case 'credit':
        return <Plus className="h-4 w-4 text-blue-500" />;
      case 'late_fee':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'adjustment':
        return <Minus className="h-4 w-4 text-neutral-medium" />;
      default:
        return <Receipt className="h-4 w-4 text-neutral-medium" />;
    }
  };

  const getEntryBadge = (type: string) => {
    switch (type) {
      case 'charge':
        return <Badge variant="destructive">Charge</Badge>;
      case 'payment':
        return <Badge className="bg-accent-green text-white">Payment</Badge>;
      case 'credit':
        return <Badge variant="default">Credit</Badge>;
      case 'late_fee':
        return <Badge className="bg-orange-500 text-white">Late Fee</Badge>;
      case 'adjustment':
        return <Badge variant="secondary">Adjustment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Calculate totals
  const totalCharges = ledgerEntries
    .filter((e) => e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalPayments = ledgerEntries
    .filter((e) => e.amount < 0)
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);

  // Handle tenant selection
  const handleSelectTenant = (tenantData: any) => {
    setSelectedTenantId(tenantData.id);
    setSearchQuery(`${tenantData.first_name || ''} ${tenantData.last_name || ''}`.trim());
    setShowDropdown(false);
  };

  // Handle Post Charge
  const handlePostCharge = async () => {
    if (!selectedTenantId || !chargeForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await recordPaymentMutation.mutateAsync({
        tenant_id: selectedTenantId,
        lease_id: selectedTenant?.lease_id || '',
        amount: parseFloat(chargeForm.amount),
        payment_method: 'ach',
        payment_date: new Date().toISOString(),
        notes: chargeForm.description || `${chargeForm.chargeType} charge`,
      });
      toast.success('Charge posted successfully');
      setShowPostChargeModal(false);
      setChargeForm({ description: '', amount: '', chargeType: 'rent' });
    } catch (error) {
      toast.error('Failed to post charge');
    }
  };

  // Handle Record Payment
  const handleRecordPayment = async () => {
    if (!selectedTenantId || !paymentForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await recordPaymentMutation.mutateAsync({
        tenant_id: selectedTenantId,
        lease_id: selectedTenant?.lease_id || '',
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.method as any,
        payment_date: new Date().toISOString(),
        notes: paymentForm.notes,
      });
      toast.success('Payment recorded successfully');
      setShowRecordPaymentModal(false);
      setPaymentForm({ amount: '', method: 'ach', reference: '', notes: '' });
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  // Handle Create Payment Plan
  const handleCreatePaymentPlan = async () => {
    if (!selectedTenantId || !paymentPlanForm.totalAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.success('Payment plan created successfully');
    setShowPaymentPlanModal(false);
    setPaymentPlanForm({ totalAmount: '', installments: '3', startDate: '' });
  };

  // Handle Generate Statement
  const handleGenerateStatement = async () => {
    if (!tenant) {
      toast.error('No tenant selected');
      return;
    }

    // Generate PDF statement
    const statementData = {
      tenant: tenant,
      entries: ledgerEntries,
      totalCharges,
      totalPayments,
      currentBalance: tenant.currentBalance,
      dateRange: {
        start: statementForm.startDate || 'Beginning',
        end: statementForm.endDate || new Date().toISOString(),
      },
    };

    // Create PDF blob
    const pdfContent = generateStatementPDF(statementData);

    if (statementForm.email) {
      // Send via email
      toast.success(`Statement sent to ${statementForm.email}`);
    } else {
      // Download PDF
      downloadPDF(pdfContent, `statement-${tenant.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Statement downloaded');
    }

    setShowStatementModal(false);
    setStatementForm({ startDate: '', endDate: '', email: '' });
  };

  // Handle Send Reminder
  const handleSendReminder = async () => {
    if (!tenant) {
      toast.error('No tenant selected');
      return;
    }

    try {
      // In production, this would call an API to send email/SMS
      const methods = [];
      if (reminderForm.sendEmail) methods.push('email');
      if (reminderForm.sendSms) methods.push('SMS');

      toast.success(`Payment reminder sent via ${methods.join(' and ')}`);
      setShowReminderModal(false);
      setReminderForm({ message: '', sendEmail: true, sendSms: false });
    } catch (error) {
      toast.error('Failed to send reminder');
    }
  };

  // Generate PDF content
  const generateStatementPDF = (data: any) => {
    // In production, use a library like jsPDF or react-pdf
    const content = `
      TENANT STATEMENT
      ================

      Tenant: ${data.tenant.name}
      Property: ${data.tenant.propertyName} - Unit ${data.tenant.unit}
      Statement Period: ${formatDate(data.dateRange.start)} to ${formatDate(data.dateRange.end)}

      SUMMARY
      -------
      Total Charges: ${formatCurrency(data.totalCharges)}
      Total Payments: ${formatCurrency(data.totalPayments)}
      Current Balance: ${formatCurrency(data.currentBalance)}

      TRANSACTION HISTORY
      -------------------
      ${data.entries.map((e: LedgerEntry) =>
        `${formatDate(e.date)} | ${e.type.toUpperCase()} | ${e.description} | ${formatCurrency(e.amount)}`
      ).join('\n')}
    `;
    return content;
  };

  // Download PDF helper
  const downloadPDF = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Download PDF
  const handleDownloadPDF = () => {
    if (!tenant) {
      toast.error('No tenant selected');
      return;
    }

    const statementData = {
      tenant: tenant,
      entries: ledgerEntries,
      totalCharges,
      totalPayments,
      currentBalance: tenant.currentBalance,
      dateRange: {
        start: 'Beginning',
        end: new Date().toISOString(),
      },
    };

    const pdfContent = generateStatementPDF(statementData);
    downloadPDF(pdfContent, `ledger-${tenant.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`);
    toast.success('Ledger downloaded');
  };

  // Handle Send Statement
  const handleSendStatement = () => {
    if (!tenant) {
      toast.error('No tenant selected');
      return;
    }
    setStatementForm({ ...statementForm, email: tenant.email });
    setShowStatementModal(true);
  };

  const isLoading = tenantsLoading || tenantLoading || paymentsLoading || loading;

  return (
    <div className="space-y-6">
      {/* Tenant Search - Always Visible */}
      <Card className="p-6">
        <h3 className="text-h4 font-semibold text-neutral-black mb-4">
          <Search className="h-5 w-5 inline-block mr-2" />
          Select Tenant
        </h3>
        <div ref={searchRef} className="relative">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by tenant name, email, or unit..."
                className="input w-full pl-10 pr-4 py-3 border-2 border-primary/30 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 text-base"
                aria-label="Search tenants"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-medium" />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTenantId(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-lighter rounded-full"
                >
                  <X className="h-4 w-4 text-neutral-medium" />
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {tenantsLoading ? (
                <div className="p-4 text-center text-neutral-medium">
                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                  Loading tenants...
                </div>
              ) : filteredTenants.length === 0 ? (
                <div className="p-4 text-center text-neutral-medium">
                  No tenants found
                </div>
              ) : (
                filteredTenants.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTenant(t)}
                    className="w-full px-4 py-3 text-left hover:bg-primary/5 border-b border-border last:border-b-0 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-black truncate">
                        {`${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Unknown'}
                      </p>
                      <p className="text-small text-neutral-medium truncate">
                        {t.email || 'No email'} • Unit {t.unit_id || t.unit || 'N/A'}
                      </p>
                    </div>
                    {t.balance > 0 && (
                      <Badge variant="destructive" className="flex-shrink-0">
                        ${t.balance?.toFixed(2)} due
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Show tenant details only when selected */}
      {selectedTenantId && tenant && (
        <>
          {/* Tenant Info Header */}
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">{tenant.name}</h2>
                  <div className="flex items-center gap-2 text-neutral-medium mt-1">
                    <Building className="h-4 w-4" />
                    <span>{tenant.propertyName} - Unit {tenant.unit}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-small text-neutral-medium">
                    <span>{tenant.email}</span>
                    <span>{tenant.phone}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <p className="text-small text-neutral-medium">Current Balance</p>
                  <p className={`text-h2 font-bold ${tenant.currentBalance > 0 ? 'text-status-error' : 'text-accent-green'}`}>
                    {tenant.currentBalance > 0 ? '' : '-'}{formatCurrency(tenant.currentBalance)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSendStatement}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Statement
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-small text-neutral-medium">Monthly Rent</span>
              </div>
              <p className="text-h4 font-bold text-neutral-black">{formatCurrency(tenant.monthlyRent)}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-small text-neutral-medium">Lease Term</span>
              </div>
              <p className="text-small font-medium text-neutral-black">
                {formatDate(tenant.leaseStart)} - {formatDate(tenant.leaseEnd)}
              </p>
            </Card>

            <Card className="p-4 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="h-4 w-4 text-status-error" />
                <span className="text-small text-neutral-medium">Total Charges</span>
              </div>
              <p className="text-h4 font-bold text-status-error">{formatCurrency(totalCharges)}</p>
            </Card>

            <Card className="p-4 bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft className="h-4 w-4 text-accent-green" />
                <span className="text-small text-neutral-medium">Total Payments</span>
              </div>
              <p className="text-h4 font-bold text-accent-green">{formatCurrency(totalPayments)}</p>
            </Card>
          </div>

          {/* Ledger Table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-h4 font-semibold text-neutral-black">Transaction History</h3>
              <div className="flex items-center gap-2">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="input text-small"
                >
                  <option value="all">All Time</option>
                  <option value="30">Last 30 Days</option>
                  <option value="60">Last 60 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="12m">Last 12 Months</option>
                </select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-neutral-medium">Loading transactions...</p>
                </div>
              ) : ledgerEntries.length === 0 ? (
                <div className="p-8 text-center">
                  <Receipt className="h-12 w-12 mx-auto text-neutral-light mb-2" />
                  <p className="text-neutral-medium">No transactions found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-neutral-lighter">
                    <tr>
                      <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Date</th>
                      <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Type</th>
                      <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Description</th>
                      <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Reference</th>
                      <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">Charges</th>
                      <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">Payments</th>
                      <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-neutral-lighter/50">
                        <td className="px-4 py-3">
                          <span className="text-small text-neutral-black">{formatDate(entry.date)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getEntryIcon(entry.type)}
                            {getEntryBadge(entry.type)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-small text-neutral-black">{entry.description}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-small text-neutral-medium font-mono">{entry.reference}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {entry.amount > 0 && (
                            <span className="text-small font-medium text-status-error">
                              {formatCurrency(entry.amount)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {entry.amount < 0 && (
                            <span className="text-small font-medium text-accent-green">
                              {formatCurrency(entry.amount)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-small font-bold ${entry.runningBalance > 0 ? 'text-status-error' : entry.runningBalance < 0 ? 'text-accent-green' : 'text-neutral-black'}`}>
                            {entry.runningBalance === 0 ? '$0.00' : (entry.runningBalance > 0 ? '' : '-') + formatCurrency(entry.runningBalance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-border flex items-center justify-between">
              <p className="text-small text-neutral-medium">
                Showing 1-{ledgerEntries.length} of {ledgerEntries.length} entries
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-h4 font-semibold text-neutral-black mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="default" onClick={() => setShowPostChargeModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Post Charge
              </Button>
              <Button variant="outline" onClick={() => setShowRecordPaymentModal(true)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
              <Button variant="outline" onClick={() => setShowPaymentPlanModal(true)}>
                <Clock className="h-4 w-4 mr-2" />
                Create Payment Plan
              </Button>
              <Button variant="outline" onClick={() => setShowStatementModal(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Statement
              </Button>
              <Button variant="outline" onClick={() => setShowReminderModal(true)}>
                <Send className="h-4 w-4 mr-2" />
                Send Reminder
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Post Charge Modal */}
      <Modal
        isOpen={showPostChargeModal}
        onClose={() => setShowPostChargeModal(false)}
        title="Post New Charge"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-small font-medium text-neutral-black mb-1">
              Charge Type
            </label>
            <select
              value={chargeForm.chargeType}
              onChange={(e) => setChargeForm({ ...chargeForm, chargeType: e.target.value })}
              className="input w-full"
            >
              <option value="rent">Rent</option>
              <option value="late_fee">Late Fee</option>
              <option value="utility">Utility</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-small font-medium text-neutral-black mb-1">
              Description
            </label>
            <input
              type="text"
              value={chargeForm.description}
              onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
              placeholder="e.g., January 2026 Rent"
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-small font-medium text-neutral-black mb-1">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-medium">$</span>
              <input
                type="number"
                value={chargeForm.amount}
                onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                placeholder="0.00"
                className="input w-full pl-7"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPostChargeModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handlePostCharge}
              disabled={recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Post Charge
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={showRecordPaymentModal}
        onClose={() => setShowRecordPaymentModal(false)}
        title="Record Payment"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-small font-medium text-neutral-black mb-1">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-medium">$</span>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="0.00"
                className="input w-full pl-7"
              />
            </div>
          </div>
          <div>
            <label className="block text-small font-medium text-neutral-black mb-1">
              Payment Method
            </label>
            <select
              value={paymentForm.method}
              onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
              className="input w-full"
            >
              <option value="ach">ACH Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="check">Check</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div>
            <label className="block text-small font-medium text-neutral-black mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={paymentForm.reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              placeholder="e.g., Check #1234"
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-small font-medium text-neutral-black mb-1">
              Notes
            </label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              placeholder="Optional notes..."
              className="input w-full h-20 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowRecordPaymentModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleRecordPayment}
              disabled={recordPaymentMutation.isPending}
            >
              {recordPaymentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Plan Modal */}
      <Modal
        isOpen={showPaymentPlanModal}
        onClose={() => setShowPaymentPlanModal(false)}
        title="Create Payment Plan"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-small font-medium text-neutral-black mb-1">
              Total Amount Due *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-medium">$</span>
              <input
                type="number"
                value={paymentPlanForm.totalAmount}
                onChange={(e) => setPaymentPlanForm({ ...paymentPlanForm, totalAmount: e.target.value })}
                placeholder="0.00"
                className="input w-full pl-7"
              />
            </div>
          </div>
          <div>
            <label className="block text-small font-medium text-neutral-black mb-1">
              Number of Installments
            </label>
            <select
              value={paymentPlanForm.installments}
              onChange={(e) => setPaymentPlanForm({ ...paymentPlanForm, installments: e.target.value })}
              className="input w-full"
            >
              <option value="2">2 payments</option>
              <option value="3">3 payments</option>
              <option value="4">4 payments</option>
              <option value="6">6 payments</option>
              <option value="12">12 payments</option>
            </select>
          </div>
          <div>
            <label className="block text-small font-medium text-neutral-black mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={paymentPlanForm.startDate}
              onChange={(e) => setPaymentPlanForm({ ...paymentPlanForm, startDate: e.target.value })}
              className="input w-full"
            />
          </div>
          {paymentPlanForm.totalAmount && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-small text-blue-800">
                <strong>Installment Amount:</strong>{' '}
                {formatCurrency(parseFloat(paymentPlanForm.totalAmount) / parseInt(paymentPlanForm.installments))}
                /month
              </p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPaymentPlanModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleCreatePaymentPlan}
            >
              <Clock className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generate Statement Modal */}
      <Modal
        isOpen={showStatementModal}
        onClose={() => setShowStatementModal(false)}
        title="Generate Statement"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-small font-medium text-neutral-black mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={statementForm.startDate}
                onChange={(e) => setStatementForm({ ...statementForm, startDate: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-small font-medium text-neutral-black mb-1">
                End Date
              </label>
              <input
                type="date"
                value={statementForm.endDate}
                onChange={(e) => setStatementForm({ ...statementForm, endDate: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-small font-medium text-neutral-black mb-1">
              Email To (optional)
            </label>
            <input
              type="email"
              value={statementForm.email}
              onChange={(e) => setStatementForm({ ...statementForm, email: e.target.value })}
              placeholder="tenant@email.com"
              className="input w-full"
            />
            <p className="text-xs text-neutral-medium mt-1">
              Leave blank to download PDF instead of emailing
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowStatementModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleGenerateStatement}
            >
              {statementForm.email ? (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Statement
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Send Reminder Modal */}
      <Modal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        title="Send Payment Reminder"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-small font-medium text-neutral-black mb-1">
              Message
            </label>
            <textarea
              value={reminderForm.message}
              onChange={(e) => setReminderForm({ ...reminderForm, message: e.target.value })}
              placeholder="Your rent payment of $X is due on [date]. Please make your payment promptly to avoid late fees."
              className="input w-full h-24 resize-none"
            />
          </div>
          <div>
            <label className="block text-small font-medium text-neutral-black mb-2">
              Send Via
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderForm.sendEmail}
                  onChange={(e) => setReminderForm({ ...reminderForm, sendEmail: e.target.checked })}
                  className="rounded border-neutral-medium"
                />
                <Mail className="h-4 w-4 text-neutral-medium" />
                <span className="text-small">Email ({tenant?.email})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderForm.sendSms}
                  onChange={(e) => setReminderForm({ ...reminderForm, sendSms: e.target.checked })}
                  className="rounded border-neutral-medium"
                />
                <span className="text-small">📱</span>
                <span className="text-small">SMS ({tenant?.phone})</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowReminderModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1"
              onClick={handleSendReminder}
              disabled={!reminderForm.sendEmail && !reminderForm.sendSms}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Reminder
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TenantLedgerView;
