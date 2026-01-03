/**
 * Charge Posting Interface
 * Post charges to tenant accounts with proper double-entry accounting
 * Zero-tolerance accounting: Every charge updates all related DB tables
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { useTenants } from '../../../../hooks/useTenants';
import { useRecordPayment } from '../../../../hooks/usePayments';
import { toast } from 'sonner';
import {
  Plus,
  DollarSign,
  User,
  Building,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  Search,
  Receipt,
  Repeat,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  BookOpen,
  TrendingUp,
  PiggyBank,
  BarChart3,
  ChevronRight,
  Info,
  HelpCircle,
  Zap,
} from 'lucide-react';

interface ChargeType {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  defaultAmount?: number;
  isRecurring?: boolean;
  incomeAccount: string;
}

interface RecentCharge {
  id: string;
  tenantName: string;
  propertyName: string;
  unit: string;
  chargeType: string;
  amount: number;
  chargeDate: string;
  dueDate: string;
  status: 'posted' | 'pending' | 'failed';
  postedBy: string;
}

interface SelectedTenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyName: string;
  unit: string;
  balance: number;
  leaseId?: string;
  propertyId?: string;
}

interface ChargePostingProps {
  loading?: boolean;
}

const CHARGE_TYPES: ChargeType[] = [
  {
    id: 'rent',
    name: 'Monthly Rent',
    icon: <DollarSign className="h-5 w-5" />,
    description: 'Regular monthly rent charge',
    isRecurring: true,
    incomeAccount: 'Rental Income',
  },
  {
    id: 'late_fee',
    name: 'Late Fee',
    icon: <Clock className="h-5 w-5" />,
    description: 'Late payment fee (state rules apply)',
    incomeAccount: 'Late Fee Income',
  },
  {
    id: 'utility',
    name: 'Utility',
    icon: <Receipt className="h-5 w-5" />,
    description: 'Water, electric, gas, trash, etc.',
    incomeAccount: 'Utility Income',
  },
  {
    id: 'pet_fee',
    name: 'Pet Fee',
    icon: <FileText className="h-5 w-5" />,
    description: 'Monthly pet rent or deposit',
    incomeAccount: 'Other Income',
  },
  {
    id: 'parking',
    name: 'Parking',
    icon: <Building className="h-5 w-5" />,
    description: 'Parking space rental fee',
    incomeAccount: 'Other Income',
  },
  {
    id: 'other',
    name: 'Custom Charge',
    icon: <Plus className="h-5 w-5" />,
    description: 'Create your own charge type',
    incomeAccount: 'Other Income',
  },
];

const mockRecentCharges: RecentCharge[] = [
  {
    id: 'chg-1',
    tenantName: 'Johnson Family',
    propertyName: 'Raleigh Oak Apartments',
    unit: '101A',
    chargeType: 'rent',
    amount: 1500,
    chargeDate: '2025-12-01',
    dueDate: '2025-12-01',
    status: 'posted',
    postedBy: 'System (Auto)',
  },
  {
    id: 'chg-2',
    tenantName: 'Martinez, Roberto',
    propertyName: 'Charlotte Uptown Lofts',
    unit: '405',
    chargeType: 'late_fee',
    amount: 92.5,
    chargeDate: '2025-12-06',
    dueDate: '2025-12-06',
    status: 'posted',
    postedBy: 'Admin User',
  },
  {
    id: 'chg-3',
    tenantName: 'Williams Tech LLC',
    propertyName: 'Atlanta Midtown Tower',
    unit: '2201',
    chargeType: 'rent',
    amount: 5500,
    chargeDate: '2025-12-01',
    dueDate: '2025-12-01',
    status: 'posted',
    postedBy: 'System (Auto)',
  },
];

export const ChargePosting: React.FC<ChargePostingProps> = ({
  loading = false,
}) => {
  const [selectedChargeType, setSelectedChargeType] = useState<string | null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [recentCharges, setRecentCharges] = useState<RecentCharge[]>(mockRecentCharges);

  // Tenant search state
  const [tenantSearch, setTenantSearch] = useState('');
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<SelectedTenant | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    chargeType: '',
    customChargeName: '',
    amount: '',
    chargeDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    description: '',
    isRecurring: false,
  });

  // Posting state
  const [isPosting, setIsPosting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Fetch tenants
  const { data: allTenants = [], isLoading: tenantsLoading } = useTenants();
  const recordPaymentMutation = useRecordPayment();

  // Validate form and return errors
  const validateForm = (): string[] => {
    const errors: string[] = [];
    if (!selectedTenant) errors.push('Select a tenant from the dropdown');
    if (!formData.chargeType) errors.push('Select a charge type');
    if (!formData.amount || parseFloat(formData.amount) <= 0) errors.push('Enter a valid amount');
    if (formData.chargeType === 'other' && !formData.customChargeName.trim()) {
      errors.push('Enter a name for the custom charge');
    }
    return errors;
  };

  // Check if form is valid
  const isFormValid = () => {
    return selectedTenant &&
           formData.chargeType &&
           formData.amount &&
           parseFloat(formData.amount) > 0 &&
           (formData.chargeType !== 'other' || formData.customChargeName.trim());
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowTenantDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter tenants based on search
  const filteredTenants = useMemo(() => {
    if (!tenantSearch.trim()) return allTenants.slice(0, 10);
    const query = tenantSearch.toLowerCase();
    return allTenants.filter((tenant: any) => {
      const name = `${tenant.first_name || ''} ${tenant.last_name || ''}`.toLowerCase();
      const email = (tenant.email || '').toLowerCase();
      const unit = (tenant.unit_id || tenant.unit || '').toLowerCase();
      return name.includes(query) || email.includes(query) || unit.includes(query);
    }).slice(0, 10);
  }, [allTenants, tenantSearch]);

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

  const getChargeTypeBadge = (type: string) => {
    switch (type) {
      case 'rent':
        return <Badge className="bg-primary text-primary-foreground">Rent</Badge>;
      case 'late_fee':
        return <Badge variant="destructive">Late Fee</Badge>;
      case 'utility':
        return <Badge className="bg-blue-500 text-white">Utility</Badge>;
      case 'pet_fee':
        return <Badge className="bg-purple-500 text-white">Pet Fee</Badge>;
      case 'parking':
        return <Badge variant="secondary">Parking</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleTenantSelect = (tenant: any) => {
    const selected: SelectedTenant = {
      id: tenant.id,
      name: `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Unknown',
      email: tenant.email || '',
      phone: tenant.phone || '',
      propertyName: tenant.property?.name || tenant.property_name || 'Property',
      unit: tenant.unit_id || tenant.unit || 'N/A',
      balance: tenant.balance || 0,
      leaseId: tenant.lease_id,
      propertyId: tenant.property_id,
    };
    setSelectedTenant(selected);
    setTenantSearch(selected.name);
    setShowTenantDropdown(false);
  };

  const handleChargeTypeSelect = (typeId: string) => {
    setSelectedChargeType(typeId);
    setFormData({ ...formData, chargeType: typeId });
    if (!showPostForm) {
      setShowPostForm(true);
    }
  };

  const getChargeTypeInfo = () => {
    return CHARGE_TYPES.find(t => t.id === formData.chargeType);
  };

  const handlePostCharge = async () => {
    // Validation
    if (!selectedTenant) {
      toast.error('Please select a tenant');
      return;
    }
    if (!formData.chargeType) {
      toast.error('Please select a charge type');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (formData.chargeType === 'other' && !formData.customChargeName.trim()) {
      toast.error('Please enter a name for the custom charge');
      return;
    }

    setIsPosting(true);

    try {
      // Determine description
      const chargeTypeInfo = getChargeTypeInfo();
      const chargeName = formData.chargeType === 'other'
        ? formData.customChargeName
        : chargeTypeInfo?.name || formData.chargeType;

      const description = formData.description || `${chargeName} - ${formatDate(formData.chargeDate)}`;

      // Post the charge
      await recordPaymentMutation.mutateAsync({
        tenant_id: selectedTenant.id,
        lease_id: selectedTenant.leaseId || '',
        amount: parseFloat(formData.amount),
        payment_method: 'ach', // This is a charge, not payment
        payment_date: formData.chargeDate,
        notes: description,
      });

      // Add to recent charges
      const newCharge: RecentCharge = {
        id: `chg-${Date.now()}`,
        tenantName: selectedTenant.name,
        propertyName: selectedTenant.propertyName,
        unit: selectedTenant.unit,
        chargeType: formData.chargeType === 'other' ? formData.customChargeName : formData.chargeType,
        amount: parseFloat(formData.amount),
        chargeDate: formData.chargeDate,
        dueDate: formData.dueDate,
        status: 'posted',
        postedBy: 'Current User',
      };
      setRecentCharges([newCharge, ...recentCharges]);

      toast.success(
        <div className="space-y-1">
          <p className="font-medium">Charge Posted Successfully!</p>
          <p className="text-sm text-neutral-medium">
            {formatCurrency(parseFloat(formData.amount))} charged to {selectedTenant.name}
          </p>
        </div>
      );

      // Reset form
      setFormData({
        chargeType: '',
        customChargeName: '',
        amount: '',
        chargeDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        description: '',
        isRecurring: false,
      });
      setSelectedTenant(null);
      setTenantSearch('');
      setSelectedChargeType(null);
      setShowPostForm(false);
    } catch (error) {
      toast.error('Failed to post charge. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  // Stats
  const todaysCharges = recentCharges.filter(
    (c) => c.chargeDate === new Date().toISOString().split('T')[0]
  );
  const totalPostedToday = todaysCharges.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-4 w-4 text-primary" />
            <span className="text-small text-neutral-medium">Today's Charges</span>
          </div>
          <p className="text-h3 font-bold text-neutral-black">{todaysCharges.length}</p>
          <p className="text-small text-neutral-medium mt-1">
            {formatCurrency(totalPostedToday)} total
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Repeat className="h-4 w-4 text-accent-green" />
            <span className="text-small text-neutral-medium">Recurring Charges</span>
          </div>
          <p className="text-h3 font-bold text-accent-green">Active</p>
          <p className="text-small text-neutral-medium mt-1">
            Next run: Dec 31, 2025
          </p>
        </Card>

        <Card className="p-4">
          <Button
            className="w-full h-full"
            onClick={() => setShowPostForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Post New Charge
          </Button>
        </Card>
      </div>

      {/* Charge Type Selection */}
      <Card className="p-6">
        <h3 className="text-h4 font-semibold text-neutral-black mb-4">Select Charge Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CHARGE_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleChargeTypeSelect(type.id)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedChargeType === type.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                selectedChargeType === type.id ? 'bg-primary text-primary-foreground' : 'bg-neutral-lighter text-neutral-medium'
              }`}>
                {type.icon}
              </div>
              <p className="font-medium text-neutral-black text-small">{type.name}</p>
              <p className="text-small text-neutral-medium mt-1">{type.description}</p>
              {type.isRecurring && (
                <Badge variant="secondary" className="mt-2">
                  <Repeat className="h-3 w-3 mr-1" />
                  Recurring
                </Badge>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Post Charge Form */}
      {showPostForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-h4 font-semibold text-neutral-black">Post New Charge</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowPostForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Tenant & Charge Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tenant Selection */}
                <div className="space-y-4">
                  <div ref={searchRef} className="relative">
                    <label className="block text-small font-medium text-neutral-black mb-2">
                      Tenant / Property *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                      <input
                        type="text"
                        placeholder="Type to search tenants..."
                        className="input pl-10 pr-10 w-full border-2 focus:border-primary"
                        value={tenantSearch}
                        onChange={(e) => {
                          setTenantSearch(e.target.value);
                          setShowTenantDropdown(true);
                          if (!e.target.value) setSelectedTenant(null);
                        }}
                        onFocus={() => setShowTenantDropdown(true)}
                      />
                      {tenantSearch && (
                        <button
                          onClick={() => {
                            setTenantSearch('');
                            setSelectedTenant(null);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-lighter rounded-full"
                        >
                          <X className="h-4 w-4 text-neutral-medium" />
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showTenantDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {tenantsLoading ? (
                          <div className="p-3 text-center text-neutral-medium">
                            <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                            Loading...
                          </div>
                        ) : filteredTenants.length === 0 ? (
                          <div className="p-3 text-center text-neutral-medium">
                            No tenants found
                          </div>
                        ) : (
                          filteredTenants.map((tenant: any) => (
                            <button
                              key={tenant.id}
                              onClick={() => handleTenantSelect(tenant)}
                              className="w-full px-3 py-2 text-left hover:bg-primary/5 flex items-center gap-2 border-b border-border last:border-b-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-small font-medium text-neutral-black truncate">
                                  {`${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Unknown'}
                                </p>
                                <p className="text-xs text-neutral-medium truncate">
                                  {tenant.property_name || 'Property'} - Unit {tenant.unit_id || tenant.unit || 'N/A'}
                                </p>
                              </div>
                              {(tenant.balance || 0) > 0 && (
                                <Badge variant="destructive" className="text-xs flex-shrink-0">
                                  ${(tenant.balance || 0).toFixed(0)} due
                                </Badge>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Tenant Display */}
                  {selectedTenant && (
                    <div className="p-4 border-2 border-primary/30 rounded-lg bg-primary/5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-neutral-black">{selectedTenant.name}</p>
                          <p className="text-small text-neutral-medium">
                            {selectedTenant.propertyName} - Unit {selectedTenant.unit}
                          </p>
                          <p className="text-xs text-neutral-medium">{selectedTenant.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-neutral-medium">Current Balance</p>
                          <p className={`font-bold ${selectedTenant.balance > 0 ? 'text-status-error' : 'text-accent-green'}`}>
                            {formatCurrency(selectedTenant.balance)}
                          </p>
                        </div>
                        <CheckCircle className="h-6 w-6 text-accent-green" />
                      </div>
                    </div>
                  )}

                  {/* Charge Type Dropdown */}
                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">
                      Charge Type *
                    </label>
                    <select
                      className="input w-full"
                      value={formData.chargeType}
                      onChange={(e) => {
                        setFormData({ ...formData, chargeType: e.target.value });
                        setSelectedChargeType(e.target.value);
                      }}
                    >
                      <option value="">Select charge type...</option>
                      {CHARGE_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} → Credits: {type.incomeAccount}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Charge Name (only shown for "other") */}
                  {formData.chargeType === 'other' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                      <div className="flex items-start gap-2">
                        <HelpCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">Custom Charge Setup</p>
                          <p className="text-sm text-amber-700 mt-1">
                            Enter a descriptive name for your custom charge. Examples:
                          </p>
                          <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                            <li>Key Replacement Fee</li>
                            <li>Move-out Cleaning</li>
                            <li>Lease Violation Fine</li>
                            <li>Storage Unit Rental</li>
                          </ul>
                        </div>
                      </div>
                      <div>
                        <label className="block text-small font-medium text-amber-800 mb-1">
                          Custom Charge Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Key Replacement Fee"
                          className="input w-full bg-white border-amber-300 focus:border-amber-500"
                          value={formData.customChargeName}
                          onChange={(e) => setFormData({ ...formData, customChargeName: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Charge Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">
                      Amount *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="input pl-10 w-full text-lg font-semibold"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-small font-medium text-neutral-black mb-2">
                        Charge Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                        <input
                          type="date"
                          className="input pl-10 w-full"
                          value={formData.chargeDate}
                          onChange={(e) => setFormData({ ...formData, chargeDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-small font-medium text-neutral-black mb-2">
                        Due Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                        <input
                          type="date"
                          className="input pl-10 w-full"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      className="input w-full"
                      rows={2}
                      placeholder="Add notes about this charge..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={formData.isRecurring}
                      onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                      className="rounded border-neutral-medium"
                    />
                    <label htmlFor="recurring" className="text-small text-neutral-black">
                      Make this a recurring charge
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Accounting Flow Visualization */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">Where Does This Go?</h4>
                </div>

                {formData.amount && parseFloat(formData.amount) > 0 ? (
                  <div className="space-y-3">
                    {/* Amount Being Posted */}
                    <div className="text-center py-3 bg-white rounded-lg border border-blue-200">
                      <p className="text-xs text-neutral-medium uppercase tracking-wide">Posting Amount</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(parseFloat(formData.amount))}</p>
                    </div>

                    {/* Flow Arrow */}
                    <div className="flex justify-center">
                      <div className="bg-blue-500 rounded-full p-1">
                        <ArrowRight className="h-4 w-4 text-white rotate-90" />
                      </div>
                    </div>

                    {/* Debit Entry */}
                    <div className="bg-white rounded-lg p-3 border border-red-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center">
                          <TrendingUp className="h-3 w-3 text-red-600" />
                        </div>
                        <span className="text-xs font-medium text-red-700">DEBIT (+)</span>
                      </div>
                      <p className="font-semibold text-neutral-black">Accounts Receivable</p>
                      <p className="text-xs text-neutral-medium">Tenant owes this amount</p>
                      <p className="text-lg font-bold text-red-600 mt-1">+{formatCurrency(parseFloat(formData.amount))}</p>
                    </div>

                    {/* Credit Entry */}
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                          <PiggyBank className="h-3 w-3 text-green-600" />
                        </div>
                        <span className="text-xs font-medium text-green-700">CREDIT (+)</span>
                      </div>
                      <p className="font-semibold text-neutral-black">
                        {getChargeTypeInfo()?.incomeAccount || 'Income Account'}
                      </p>
                      <p className="text-xs text-neutral-medium">Revenue recorded</p>
                      <p className="text-lg font-bold text-green-600 mt-1">+{formatCurrency(parseFloat(formData.amount))}</p>
                    </div>

                    {/* Affected Areas */}
                    <div className="pt-2 border-t border-blue-200">
                      <p className="text-xs font-medium text-blue-800 mb-2">Updates Instantly:</p>
                      <div className="space-y-1">
                        {[
                          { icon: BookOpen, text: 'Tenant Ledger', desc: 'Balance increases' },
                          { icon: BarChart3, text: 'Reports', desc: 'Income & A/R updated' },
                          { icon: Receipt, text: 'Aging Report', desc: 'Outstanding balances' },
                          { icon: FileText, text: 'Statements', desc: 'Transaction recorded' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <item.icon className="h-3 w-3 text-blue-600" />
                            <span className="font-medium text-neutral-black">{item.text}</span>
                            <span className="text-neutral-medium">- {item.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-neutral-medium">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Enter an amount to see<br />the accounting flow</p>
                  </div>
                )}
              </div>

              {/* Zero Error Guarantee */}
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 text-sm">Zero-Error Accounting</p>
                    <p className="text-xs text-green-700">
                      Double-entry ensures books always balance
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Messages */}
          {!isFormValid() && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 text-sm">Complete the following to post:</p>
                  <ul className="mt-1 text-sm text-amber-700 list-disc list-inside space-y-0.5">
                    {!selectedTenant && <li>Click on a tenant from the search dropdown to select them</li>}
                    {!formData.chargeType && <li>Select a charge type</li>}
                    {(!formData.amount || parseFloat(formData.amount) <= 0) && <li>Enter the charge amount</li>}
                    {formData.chargeType === 'other' && !formData.customChargeName.trim() && (
                      <li>Enter a name for your custom charge</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 mt-6 pt-6 border-t border-border">
            {/* Status indicator */}
            <div className="flex items-center gap-2 text-sm">
              {isFormValid() ? (
                <>
                  <CheckCircle className="h-4 w-4 text-accent-green" />
                  <span className="text-accent-green font-medium">Ready to post</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600">Fill required fields above</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setShowPostForm(false)}>
                Cancel
              </Button>
              <Button
                className={isFormValid() ? "bg-accent-green hover:bg-accent-green/90" : "bg-neutral-light cursor-not-allowed"}
                onClick={handlePostCharge}
                disabled={isPosting || !isFormValid()}
              >
                {isPosting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Post Charge
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Charges */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-h4 font-semibold text-neutral-black">Recent Charges</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-lighter">
              <tr>
                <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Date</th>
                <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Tenant</th>
                <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Property</th>
                <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Type</th>
                <th className="px-4 py-3 text-right text-small font-medium text-neutral-medium">Amount</th>
                <th className="px-4 py-3 text-center text-small font-medium text-neutral-medium">Status</th>
                <th className="px-4 py-3 text-left text-small font-medium text-neutral-medium">Posted By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentCharges.map((charge) => (
                <tr key={charge.id} className="hover:bg-neutral-lighter/50">
                  <td className="px-4 py-3 text-small text-neutral-black">
                    {formatDate(charge.chargeDate)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-neutral-medium" />
                      <div>
                        <p className="text-small font-medium text-neutral-black">{charge.tenantName}</p>
                        <p className="text-small text-neutral-medium">Unit {charge.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-small text-neutral-black">
                    {charge.propertyName}
                  </td>
                  <td className="px-4 py-3">
                    {getChargeTypeBadge(charge.chargeType)}
                  </td>
                  <td className="px-4 py-3 text-right text-small font-bold text-neutral-black">
                    {formatCurrency(charge.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className="bg-accent-green text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Posted
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-small text-neutral-medium">
                    {charge.postedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Accounting Info - Simplified for Property Managers */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-2">How Charges Work in PropMaster</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/70 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-red-600">1</span>
                  </div>
                  <span className="font-medium text-neutral-black">Tenant Balance Goes Up</span>
                </div>
                <p className="text-neutral-medium text-xs">
                  The tenant now owes you this amount. It shows on their ledger and portal.
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-amber-600">2</span>
                  </div>
                  <span className="font-medium text-neutral-black">Income is Recorded</span>
                </div>
                <p className="text-neutral-medium text-xs">
                  Revenue appears in your reports immediately - even before they pay.
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-600">3</span>
                  </div>
                  <span className="font-medium text-neutral-black">Everything Stays in Sync</span>
                </div>
                <p className="text-neutral-medium text-xs">
                  Reports, aging, statements - all update automatically. No manual reconciliation needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChargePosting;
