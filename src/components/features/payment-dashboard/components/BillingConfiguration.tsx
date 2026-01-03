/**
 * Billing Configuration
 * State-organized property billing settings for NC, SC, GA
 * Designed for 500+ property portfolios with clear action items
 *
 * Now uses real database data via React Query hooks
 * Falls back to mock data when database is empty
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { Input } from '../../../ui/Input';
import { toast } from 'sonner';
import {
  Settings,
  Save,
  RotateCcw,
  Building,
  Calendar,
  DollarSign,
  Clock,
  Mail,
  Bell,
  ToggleRight,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  MapPin,
  X,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  RefreshCw,
  Loader2,
  Check,
  Scale,
  Home,
  Users,
  TrendingUp,
  Percent,
  Hash,
  Database,
} from 'lucide-react';
import { BillingConfiguration as BillingConfigType } from '../types';
import {
  usePropertiesWithBilling,
  useCreateBillingConfiguration,
  useDismissPendingAction,
  useBillingStats,
  PropertyWithBilling,
  BillingPendingAction,
} from '../../../../hooks/useBillingConfiguration';

// Extended configuration with state and status
interface PropertyBillingConfig extends BillingConfigType {
  state: 'NC' | 'SC' | 'GA';
  unitCount: number;
  occupiedUnits: number;
  avgRent: number;
  pendingActions: PendingAction[];
  complianceStatus: 'compliant' | 'warning' | 'non_compliant';
  lastUpdated: string;
}

interface PendingAction {
  id: string;
  type: 'late_fee_review' | 'billing_day_change' | 'compliance_update' | 'reminder_config' | 'approval_needed';
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

// State compliance rules
const STATE_COMPLIANCE = {
  NC: {
    name: 'North Carolina',
    maxLateFeePercent: 5,
    minLateFeeAmount: 15,
    gracePeriodRequired: 5,
    description: 'Late fee: Greater of 5% or $15. Grace period: 5 days required.',
    citation: 'NC Gen. Stat. § 42-46',
  },
  SC: {
    name: 'South Carolina',
    maxLateFeePercent: null,
    minLateFeeAmount: null,
    gracePeriodRequired: 5,
    description: 'Reasonable late fee standard. Typically 5-10% is acceptable.',
    citation: 'SC Code § 27-40-310',
  },
  GA: {
    name: 'Georgia',
    maxLateFeePercent: null,
    minLateFeeAmount: null,
    gracePeriodRequired: 0,
    description: 'Late fee must be in lease. No statutory limit but must be reasonable.',
    citation: 'GA Code § 44-7-2',
  },
};

// Generate sample data for 500+ properties across states
const generatePropertyData = (): PropertyBillingConfig[] => {
  const properties: PropertyBillingConfig[] = [];
  const states: ('NC' | 'SC' | 'GA')[] = ['NC', 'SC', 'GA'];
  const propertyTypes = [
    'Apartments', 'Residences', 'Towers', 'Gardens', 'Village', 'Place', 'Commons', 'Heights', 'Park', 'Square'
  ];
  const streetNames = [
    'Oak', 'Maple', 'Pine', 'Cedar', 'Elm', 'Willow', 'Magnolia', 'Peach', 'Dogwood', 'Cypress',
    'Main', 'Market', 'Church', 'Trade', 'Queen', 'King', 'College', 'Broad', 'Meeting', 'Bay'
  ];
  const cities = {
    NC: ['Raleigh', 'Charlotte', 'Durham', 'Greensboro', 'Winston-Salem', 'Cary', 'Wilmington', 'Asheville'],
    SC: ['Charleston', 'Columbia', 'Greenville', 'Spartanburg', 'Mount Pleasant', 'Rock Hill', 'Myrtle Beach'],
    GA: ['Atlanta', 'Savannah', 'Augusta', 'Athens', 'Macon', 'Marietta', 'Alpharetta', 'Decatur'],
  };

  const pendingActionTypes: PendingAction['type'][] = [
    'late_fee_review', 'billing_day_change', 'compliance_update', 'reminder_config', 'approval_needed'
  ];

  const pendingActionDescriptions: Record<PendingAction['type'], string[]> = {
    late_fee_review: ['Review late fee structure', 'Late fee compliance check needed', 'Annual late fee audit'],
    billing_day_change: ['Tenant requested billing date change', 'Billing cycle adjustment needed'],
    compliance_update: ['State compliance update required', 'New regulation review needed'],
    reminder_config: ['Configure reminder schedule', 'Update notification settings'],
    approval_needed: ['Settings change pending approval', 'Manager approval required'],
  };

  // Generate properties per state
  const propertyCountByState = { NC: 200, SC: 150, GA: 150 }; // Total 500

  Object.entries(propertyCountByState).forEach(([state, count]) => {
    const stateKey = state as 'NC' | 'SC' | 'GA';
    const stateCities = cities[stateKey];

    for (let i = 0; i < count; i++) {
      const city = stateCities[Math.floor(Math.random() * stateCities.length)];
      const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
      const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
      const unitCount = Math.floor(Math.random() * 200) + 10;
      const occupancyRate = 0.85 + Math.random() * 0.13;
      const occupiedUnits = Math.floor(unitCount * occupancyRate);
      const avgRent = Math.floor((1000 + Math.random() * 2000) / 50) * 50;

      // Determine if property has pending actions (about 20% of properties)
      const hasPendingActions = Math.random() < 0.2;
      const pendingActions: PendingAction[] = [];

      if (hasPendingActions) {
        const actionCount = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < actionCount; j++) {
          const actionType = pendingActionTypes[Math.floor(Math.random() * pendingActionTypes.length)];
          const descriptions = pendingActionDescriptions[actionType];
          pendingActions.push({
            id: `action-${state}-${i}-${j}`,
            type: actionType,
            description: descriptions[Math.floor(Math.random() * descriptions.length)],
            priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low',
            dueDate: Math.random() > 0.5
              ? new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              : undefined,
          });
        }
      }

      // Compliance status
      let complianceStatus: PropertyBillingConfig['complianceStatus'] = 'compliant';
      const lateFeeAmount = Math.floor(Math.random() * 10) + 3;
      const lateFeeType = Math.random() > 0.5 ? 'percentage' : 'fixed';
      const gracePeriod = Math.floor(Math.random() * 7) + 3;

      if (stateKey === 'NC') {
        if (lateFeeType === 'percentage' && lateFeeAmount > 5) {
          complianceStatus = 'non_compliant';
        } else if (gracePeriod < 5) {
          complianceStatus = 'non_compliant';
        } else if (pendingActions.length > 0) {
          complianceStatus = 'warning';
        }
      } else if (pendingActions.length > 0) {
        complianceStatus = 'warning';
      }

      properties.push({
        id: `prop-${stateKey}-${i.toString().padStart(4, '0')}`,
        propertyId: `${stateKey}-${city.substring(0, 3).toUpperCase()}-${(i + 1).toString().padStart(4, '0')}`,
        propertyName: `${streetName} ${propertyType}`,
        state: stateKey,
        unitCount,
        occupiedUnits,
        avgRent,
        automaticBilling: Math.random() > 0.3,
        billingDay: [1, 5, 10, 15][Math.floor(Math.random() * 4)],
        gracePeriodDays: gracePeriod,
        lateFeeEnabled: Math.random() > 0.1,
        lateFeeType: lateFeeType as 'fixed' | 'percentage',
        lateFeeAmount: lateFeeType === 'percentage' ? lateFeeAmount : lateFeeAmount * 10,
        lateFeeGraceDays: Math.floor(Math.random() * 5),
        reminderSettings: {
          initialReminder: Math.floor(Math.random() * 5) + 2,
          secondReminder: Math.floor(Math.random() * 7) + 5,
          finalNotice: Math.floor(Math.random() * 14) + 14,
        },
        pendingActions,
        complianceStatus,
        lastUpdated: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    }
  });

  return properties;
};

export const BillingConfiguration: React.FC = () => {
  // React Query hooks for real data
  const { data: realData, isLoading: isLoadingData, error: dataError, refetch } = usePropertiesWithBilling();
  const { data: statsData } = useBillingStats();
  const createBillingConfig = useCreateBillingConfiguration();
  const dismissAction = useDismissPendingAction();

  // State for configurations - use real data if available, otherwise mock data
  const [useMockData, setUseMockData] = useState(false);
  const [mockConfigurations, setMockConfigurations] = useState<PropertyBillingConfig[]>([]);

  // Initialize mock data only when needed (no real data available)
  useEffect(() => {
    if (!isLoadingData && (!realData || realData.length === 0)) {
      if (mockConfigurations.length === 0) {
        setMockConfigurations(generatePropertyData());
        setUseMockData(true);
      }
    } else if (realData && realData.length > 0) {
      setUseMockData(false);
    }
  }, [isLoadingData, realData, mockConfigurations.length]);

  // Convert real data to PropertyBillingConfig format
  const configurations: PropertyBillingConfig[] = useMemo(() => {
    if (useMockData || !realData || realData.length === 0) {
      return mockConfigurations;
    }

    return realData.map(item => ({
      id: item.id,
      propertyId: item.property?.id || item.property_id,
      propertyName: item.property?.name || 'Unknown Property',
      state: item.state,
      unitCount: item.unitCount || item.property?.total_units || 0,
      occupiedUnits: item.occupiedUnits || item.property?.occupied_units || 0,
      avgRent: item.avgRent || 0,
      automaticBilling: item.auto_generate_invoices,
      billingDay: item.billing_day,
      gracePeriodDays: item.grace_period_days,
      lateFeeEnabled: item.late_fee_amount > 0,
      lateFeeType: item.late_fee_type === 'percentage' ? 'percentage' : 'fixed',
      lateFeeAmount: item.late_fee_amount,
      lateFeeGraceDays: item.grace_period_days,
      reminderSettings: {
        initialReminder: item.reminder_days_before_due,
        secondReminder: item.reminder_days_after_due,
        finalNotice: 14,
      },
      pendingActions: (item.pendingActions || []).map(action => ({
        id: action.id,
        type: action.action_type as PendingAction['type'],
        description: action.description,
        priority: action.priority,
        dueDate: action.due_date || undefined,
      })),
      complianceStatus: item.compliance_status,
      lastUpdated: item.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    }));
  }, [realData, useMockData, mockConfigurations]);

  // UI State
  const [activeState, setActiveState] = useState<'all' | 'NC' | 'SC' | 'GA'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'warning' | 'non_compliant' | 'pending_actions'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'units' | 'compliance' | 'pendingActions'>('name');
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal states
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyBillingConfig | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);

  // Form states
  const [newPropertyForm, setNewPropertyForm] = useState({
    propertyName: '',
    state: 'NC' as 'NC' | 'SC' | 'GA',
    unitCount: '',
    avgRent: '',
    billingDay: '1',
    gracePeriodDays: '5',
    lateFeeEnabled: true,
    lateFeeType: 'percentage' as 'percentage' | 'fixed',
    lateFeeAmount: '',
    automaticBilling: true,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filtered and sorted configurations
  const filteredConfigurations = useMemo(() => {
    let filtered = configurations;

    // Filter by state
    if (activeState !== 'all') {
      filtered = filtered.filter(c => c.state === activeState);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.propertyName.toLowerCase().includes(search) ||
        c.propertyId.toLowerCase().includes(search)
      );
    }

    // Filter by status
    if (filterStatus === 'compliant') {
      filtered = filtered.filter(c => c.complianceStatus === 'compliant');
    } else if (filterStatus === 'warning') {
      filtered = filtered.filter(c => c.complianceStatus === 'warning');
    } else if (filterStatus === 'non_compliant') {
      filtered = filtered.filter(c => c.complianceStatus === 'non_compliant');
    } else if (filterStatus === 'pending_actions') {
      filtered = filtered.filter(c => c.pendingActions.length > 0);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'units':
          return b.unitCount - a.unitCount;
        case 'compliance':
          const order = { non_compliant: 0, warning: 1, compliant: 2 };
          return order[a.complianceStatus] - order[b.complianceStatus];
        case 'pendingActions':
          return b.pendingActions.length - a.pendingActions.length;
        default:
          return a.propertyName.localeCompare(b.propertyName);
      }
    });

    return filtered;
  }, [configurations, activeState, searchTerm, filterStatus, sortBy]);

  // Paginated configurations
  const paginatedConfigurations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredConfigurations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredConfigurations, currentPage]);

  const totalPages = Math.ceil(filteredConfigurations.length / itemsPerPage);

  // Statistics by state
  const stateStats = useMemo(() => {
    const stats: Record<string, {
      total: number;
      units: number;
      autoBilling: number;
      compliant: number;
      warning: number;
      nonCompliant: number;
      pendingActions: number;
      highPriorityActions: number;
    }> = {
      NC: { total: 0, units: 0, autoBilling: 0, compliant: 0, warning: 0, nonCompliant: 0, pendingActions: 0, highPriorityActions: 0 },
      SC: { total: 0, units: 0, autoBilling: 0, compliant: 0, warning: 0, nonCompliant: 0, pendingActions: 0, highPriorityActions: 0 },
      GA: { total: 0, units: 0, autoBilling: 0, compliant: 0, warning: 0, nonCompliant: 0, pendingActions: 0, highPriorityActions: 0 },
    };

    configurations.forEach(c => {
      stats[c.state].total++;
      stats[c.state].units += c.unitCount;
      if (c.automaticBilling) stats[c.state].autoBilling++;
      if (c.complianceStatus === 'compliant') stats[c.state].compliant++;
      if (c.complianceStatus === 'warning') stats[c.state].warning++;
      if (c.complianceStatus === 'non_compliant') stats[c.state].nonCompliant++;
      stats[c.state].pendingActions += c.pendingActions.length;
      stats[c.state].highPriorityActions += c.pendingActions.filter(a => a.priority === 'high').length;
    });

    return stats;
  }, [configurations]);

  // Total statistics
  const totalStats = useMemo(() => ({
    total: configurations.length,
    units: configurations.reduce((sum, c) => sum + c.unitCount, 0),
    autoBilling: configurations.filter(c => c.automaticBilling).length,
    pendingActions: configurations.reduce((sum, c) => sum + c.pendingActions.length, 0),
    highPriorityActions: configurations.reduce((sum, c) =>
      sum + c.pendingActions.filter(a => a.priority === 'high').length, 0),
    nonCompliant: configurations.filter(c => c.complianceStatus === 'non_compliant').length,
  }), [configurations]);

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getComplianceBadge = (status: PropertyBillingConfig['complianceStatus']) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-500 text-white">Compliant</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500 text-white">Needs Review</Badge>;
      case 'non_compliant':
        return <Badge className="bg-red-500 text-white">Non-Compliant</Badge>;
    }
  };

  const getPriorityBadge = (priority: PendingAction['priority']) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800">Low</Badge>;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'NC': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SC': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'GA': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-neutral-100 text-neutral-800';
    }
  };

  // Handlers
  const togglePropertyExpanded = (propertyId: string) => {
    setExpandedProperties(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  };

  const handleAddProperty = async () => {
    if (!newPropertyForm.propertyName.trim()) {
      toast.error('Please enter a property name');
      return;
    }
    if (!newPropertyForm.unitCount || parseInt(newPropertyForm.unitCount) <= 0) {
      toast.error('Please enter a valid unit count');
      return;
    }
    if (!newPropertyForm.avgRent || parseFloat(newPropertyForm.avgRent) <= 0) {
      toast.error('Please enter a valid average rent');
      return;
    }

    // Validate NC compliance
    if (newPropertyForm.state === 'NC' && newPropertyForm.lateFeeEnabled) {
      if (newPropertyForm.lateFeeType === 'percentage' && parseFloat(newPropertyForm.lateFeeAmount) > 5) {
        toast.error('NC late fee cannot exceed 5% of rent');
        return;
      }
      if (parseInt(newPropertyForm.gracePeriodDays) < 5) {
        toast.error('NC requires minimum 5-day grace period');
        return;
      }
    }

    setIsAdding(true);

    try {
      const stateIndex = configurations.filter(c => c.state === newPropertyForm.state).length;
      const newConfig: PropertyBillingConfig = {
        id: `prop-${newPropertyForm.state}-${Date.now()}`,
        propertyId: `${newPropertyForm.state}-NEW-${(stateIndex + 1).toString().padStart(4, '0')}`,
        propertyName: newPropertyForm.propertyName,
        state: newPropertyForm.state,
        unitCount: parseInt(newPropertyForm.unitCount),
        occupiedUnits: Math.floor(parseInt(newPropertyForm.unitCount) * 0.9),
        avgRent: parseFloat(newPropertyForm.avgRent),
        automaticBilling: newPropertyForm.automaticBilling,
        billingDay: parseInt(newPropertyForm.billingDay),
        gracePeriodDays: parseInt(newPropertyForm.gracePeriodDays),
        lateFeeEnabled: newPropertyForm.lateFeeEnabled,
        lateFeeType: newPropertyForm.lateFeeType,
        lateFeeAmount: parseFloat(newPropertyForm.lateFeeAmount) || (newPropertyForm.lateFeeType === 'percentage' ? 5 : 50),
        lateFeeGraceDays: 3,
        reminderSettings: {
          initialReminder: 3,
          secondReminder: 7,
          finalNotice: 14,
        },
        pendingActions: [],
        complianceStatus: 'compliant',
        lastUpdated: new Date().toISOString().split('T')[0],
      };

      setConfigurations(prev => [newConfig, ...prev]);

      toast.success(
        <div className="space-y-1">
          <p className="font-semibold">Property Added Successfully</p>
          <p className="text-sm">{newConfig.propertyName} ({newConfig.state})</p>
          <p className="text-xs text-green-700">{newConfig.unitCount} units configured</p>
        </div>,
        { duration: 5000 }
      );

      setShowAddPropertyModal(false);
      setNewPropertyForm({
        propertyName: '',
        state: 'NC',
        unitCount: '',
        avgRent: '',
        billingDay: '1',
        gracePeriodDays: '5',
        lateFeeEnabled: true,
        lateFeeType: 'percentage',
        lateFeeAmount: '',
        automaticBilling: true,
      });

    } catch (error) {
      console.error('[Billing] Add property failed:', error);
      toast.error('Failed to add property');
    } finally {
      setIsAdding(false);
    }
  };

  const handleExportSettings = useCallback(() => {
    setIsExporting(true);

    try {
      const dataToExport = activeState === 'all' ? configurations : configurations.filter(c => c.state === activeState);

      const headers = [
        'Property ID',
        'Property Name',
        'State',
        'Units',
        'Occupied',
        'Avg Rent',
        'Auto Billing',
        'Billing Day',
        'Grace Period',
        'Late Fee Enabled',
        'Late Fee Type',
        'Late Fee Amount',
        'Compliance Status',
        'Pending Actions',
        'Last Updated',
      ];

      const rows = dataToExport.map(c => [
        c.propertyId,
        c.propertyName,
        c.state,
        c.unitCount,
        c.occupiedUnits,
        c.avgRent,
        c.automaticBilling ? 'Yes' : 'No',
        c.billingDay,
        c.gracePeriodDays,
        c.lateFeeEnabled ? 'Yes' : 'No',
        c.lateFeeType,
        c.lateFeeType === 'percentage' ? `${c.lateFeeAmount}%` : `$${c.lateFeeAmount}`,
        c.complianceStatus,
        c.pendingActions.length,
        c.lastUpdated,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billing-settings-${activeState === 'all' ? 'all-states' : activeState}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(
        <div className="space-y-1">
          <p className="font-medium">Export Successful</p>
          <p className="text-sm text-neutral-medium">
            {dataToExport.length} properties exported to CSV
          </p>
        </div>
      );

      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export settings');
    } finally {
      setIsExporting(false);
    }
  }, [configurations, activeState]);

  const updateConfig = (configId: string, field: string, value: any) => {
    if (useMockData) {
      setMockConfigurations(prev => prev.map(config =>
        config.id === configId
          ? { ...config, [field]: value, lastUpdated: new Date().toISOString().split('T')[0] }
          : config
      ));
    }
    // For real data, would need to implement useUpdateBillingConfiguration mutation
  };

  const handleSaveConfig = (configId: string) => {
    toast.success('Configuration saved');
    setEditingConfig(null);
  };

  const handleDismissAction = (configId: string, actionId: string) => {
    if (useMockData) {
      // For mock data, update local state
      setMockConfigurations(prev => prev.map(config =>
        config.id === configId
          ? { ...config, pendingActions: config.pendingActions.filter(a => a.id !== actionId) }
          : config
      ));
      toast.success('Action dismissed');
    } else {
      // For real data, use the mutation
      dismissAction.mutate(actionId, {
        onSuccess: () => {
          toast.success('Action dismissed');
          refetch();
        },
        onError: () => {
          toast.error('Failed to dismiss action');
        },
      });
    }
  };

  const viewPropertyDetails = (property: PropertyBillingConfig) => {
    setSelectedProperty(property);
    setShowDetailsModal(true);
  };

  // Show loading state
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-neutral-medium">Loading billing configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h3 text-neutral-black font-semibold">Billing Configuration</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-small text-neutral-medium">
              Manage billing settings for {configurations.length} properties across NC, SC, and GA
            </p>
            {useMockData ? (
              <Badge className="bg-amber-100 text-amber-800 text-xs">
                <Database className="h-3 w-3 mr-1" />
                Demo Data
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800 text-xs">
                <Database className="h-3 w-3 mr-1" />
                Live Data
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!useMockData && (
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowAddPropertyModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
          <Button variant="outline" onClick={() => setShowExportModal(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export Settings
          </Button>
        </div>
      </div>

      {/* State Dashboard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* All States Card */}
        <Card
          className={`p-4 cursor-pointer transition-all ${
            activeState === 'all' ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-neutral-lighter'
          }`}
          onClick={() => { setActiveState('all'); setCurrentPage(1); }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              <span className="font-semibold text-neutral-black">All States</span>
            </div>
            {activeState === 'all' && <Check className="h-5 w-5 text-primary" />}
          </div>
          <div className="space-y-1">
            <p className="text-h4 font-bold text-neutral-black">{totalStats.total} Properties</p>
            <p className="text-small text-neutral-medium">{totalStats.units.toLocaleString()} total units</p>
          </div>
          {totalStats.highPriorityActions > 0 && (
            <div className="mt-3 p-2 bg-red-50 rounded-lg">
              <p className="text-xs text-red-700 font-medium">
                {totalStats.highPriorityActions} high priority actions
              </p>
            </div>
          )}
        </Card>

        {/* State Cards */}
        {(['NC', 'SC', 'GA'] as const).map(state => (
          <Card
            key={state}
            className={`p-4 cursor-pointer transition-all ${
              activeState === state ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-neutral-lighter'
            }`}
            onClick={() => { setActiveState(state); setCurrentPage(1); }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className={`h-5 w-5 ${
                  state === 'NC' ? 'text-blue-600' :
                  state === 'SC' ? 'text-purple-600' : 'text-orange-600'
                }`} />
                <span className={`px-2 py-0.5 rounded text-small font-medium ${getStateColor(state)}`}>
                  {state}
                </span>
                <span className="font-medium text-neutral-black">{STATE_COMPLIANCE[state].name}</span>
              </div>
              {activeState === state && <Check className="h-5 w-5 text-primary" />}
            </div>

            <div className="space-y-1">
              <p className="text-h4 font-bold text-neutral-black">{stateStats[state].total} Properties</p>
              <p className="text-small text-neutral-medium">{stateStats[state].units.toLocaleString()} units</p>
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {stateStats[state].nonCompliant > 0 && (
                <Badge className="bg-red-100 text-red-800 text-xs">
                  {stateStats[state].nonCompliant} non-compliant
                </Badge>
              )}
              {stateStats[state].warning > 0 && (
                <Badge className="bg-amber-100 text-amber-800 text-xs">
                  {stateStats[state].warning} warnings
                </Badge>
              )}
              {stateStats[state].highPriorityActions > 0 && (
                <Badge className="bg-red-100 text-red-800 text-xs">
                  {stateStats[state].highPriorityActions} urgent
                </Badge>
              )}
            </div>

            {stateStats[state].pendingActions > 0 && (
              <div className="mt-2">
                <p className="text-xs text-neutral-medium">
                  {stateStats[state].pendingActions} pending action{stateStats[state].pendingActions > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* State Compliance Reference */}
      {activeState !== 'all' && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Scale className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-small font-semibold text-blue-900">
                {STATE_COMPLIANCE[activeState].name} Compliance Requirements
              </p>
              <p className="text-small text-blue-700 mt-1">{STATE_COMPLIANCE[activeState].description}</p>
              <p className="text-xs text-blue-600 mt-1 italic">{STATE_COMPLIANCE[activeState].citation}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10 pr-4 py-2 w-64 border border-border rounded-lg text-small focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as any); setCurrentPage(1); }}
              className="px-3 py-2 border border-border rounded-lg text-small focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Statuses</option>
              <option value="compliant">Compliant Only</option>
              <option value="warning">Needs Review</option>
              <option value="non_compliant">Non-Compliant</option>
              <option value="pending_actions">Has Pending Actions</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-border rounded-lg text-small focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="name">Sort by Name</option>
              <option value="units">Sort by Units</option>
              <option value="compliance">Sort by Compliance</option>
              <option value="pendingActions">Sort by Actions</option>
            </select>
          </div>

          <p className="text-small text-neutral-medium">
            Showing {paginatedConfigurations.length} of {filteredConfigurations.length} properties
          </p>
        </div>
      </Card>

      {/* Urgent Actions Alert */}
      {totalStats.highPriorityActions > 0 && (
        <Card className="p-4 border-l-4 border-red-500 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800">
                {totalStats.highPriorityActions} High Priority Action{totalStats.highPriorityActions > 1 ? 's' : ''} Required
              </h4>
              <p className="text-small text-red-700 mt-1">
                Review and resolve urgent billing configuration issues to maintain compliance.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Property List */}
      <div className="space-y-3">
        {paginatedConfigurations.length === 0 ? (
          <Card className="p-12 text-center">
            <Building className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
            <p className="text-neutral-medium">No properties match your filters</p>
          </Card>
        ) : (
          paginatedConfigurations.map((config) => (
            <Card key={config.id} className={`overflow-hidden ${
              config.complianceStatus === 'non_compliant' ? 'border-l-4 border-red-500' :
              config.complianceStatus === 'warning' ? 'border-l-4 border-amber-500' : ''
            }`}>
              {/* Property Header */}
              <div
                className="p-4 cursor-pointer hover:bg-neutral-lighter/50"
                onClick={() => togglePropertyExpanded(config.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      config.state === 'NC' ? 'bg-blue-100' :
                      config.state === 'SC' ? 'bg-purple-100' : 'bg-orange-100'
                    }`}>
                      <Building className={`h-5 w-5 ${
                        config.state === 'NC' ? 'text-blue-600' :
                        config.state === 'SC' ? 'text-purple-600' : 'text-orange-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-neutral-black">{config.propertyName}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStateColor(config.state)}`}>
                          {config.state}
                        </span>
                        {getComplianceBadge(config.complianceStatus)}
                      </div>
                      <p className="text-small text-neutral-medium">
                        {config.propertyId} • {config.unitCount} units • {config.occupiedUnits} occupied ({Math.round(config.occupiedUnits / config.unitCount * 100)}%)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {config.pendingActions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-100 text-amber-800">
                          {config.pendingActions.length} action{config.pendingActions.length > 1 ? 's' : ''}
                        </Badge>
                        {config.pendingActions.some(a => a.priority === 'high') && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Badge variant={config.automaticBilling ? 'default' : 'secondary'} className={config.automaticBilling ? 'bg-green-500' : ''}>
                        {config.automaticBilling ? 'Auto' : 'Manual'}
                      </Badge>
                    </div>

                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); viewPropertyDetails(config); }}>
                      <Eye className="h-4 w-4" />
                    </Button>

                    {expandedProperties.has(config.id) ? (
                      <ChevronUp className="h-5 w-5 text-neutral-medium" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-neutral-medium" />
                    )}
                  </div>
                </div>

                {/* Quick Stats Row */}
                <div className="mt-3 flex items-center gap-6 text-small text-neutral-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Due: {config.billingDay}{config.billingDay === 1 ? 'st' : config.billingDay === 2 ? 'nd' : config.billingDay === 3 ? 'rd' : 'th'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Grace: {config.gracePeriodDays} days
                  </span>
                  {config.lateFeeEnabled && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      Late fee: {config.lateFeeType === 'percentage' ? `${config.lateFeeAmount}%` : formatCurrency(config.lateFeeAmount)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    Avg rent: {formatCurrency(config.avgRent)}
                  </span>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedProperties.has(config.id) && (
                <div className="border-t border-border p-4 bg-neutral-lighter/30">
                  {/* Pending Actions */}
                  {config.pendingActions.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-small font-semibold text-neutral-black mb-2">Pending Actions</h5>
                      <div className="space-y-2">
                        {config.pendingActions.map((action) => (
                          <div key={action.id} className={`p-3 rounded-lg border ${
                            action.priority === 'high' ? 'bg-red-50 border-red-200' :
                            action.priority === 'medium' ? 'bg-amber-50 border-amber-200' :
                            'bg-blue-50 border-blue-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getPriorityBadge(action.priority)}
                                <span className="text-small font-medium">{action.description}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {action.dueDate && (
                                  <span className="text-xs text-neutral-medium">Due: {action.dueDate}</span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDismissAction(config.id, action.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Configuration Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h5 className="text-small font-semibold text-neutral-black">Billing Schedule</h5>
                      <div className="p-3 bg-white rounded-lg border border-border">
                        <div className="space-y-2 text-small">
                          <div className="flex justify-between">
                            <span className="text-neutral-medium">Billing Day</span>
                            <span className="font-medium">{config.billingDay}{config.billingDay === 1 ? 'st' : config.billingDay === 2 ? 'nd' : 'th'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-medium">Grace Period</span>
                            <span className="font-medium">{config.gracePeriodDays} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-medium">Auto-Billing</span>
                            <span className={`font-medium ${config.automaticBilling ? 'text-green-600' : 'text-neutral-medium'}`}>
                              {config.automaticBilling ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-small font-semibold text-neutral-black">Late Fee Settings</h5>
                      <div className="p-3 bg-white rounded-lg border border-border">
                        <div className="space-y-2 text-small">
                          <div className="flex justify-between">
                            <span className="text-neutral-medium">Late Fee</span>
                            <span className={`font-medium ${config.lateFeeEnabled ? '' : 'text-neutral-medium'}`}>
                              {config.lateFeeEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          {config.lateFeeEnabled && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-neutral-medium">Amount</span>
                                <span className="font-medium">
                                  {config.lateFeeType === 'percentage' ? `${config.lateFeeAmount}%` : formatCurrency(config.lateFeeAmount)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-neutral-medium">Grace Days</span>
                                <span className="font-medium">{config.lateFeeGraceDays} days</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-small font-semibold text-neutral-black">Reminders</h5>
                      <div className="p-3 bg-white rounded-lg border border-border">
                        <div className="space-y-2 text-small">
                          <div className="flex justify-between">
                            <span className="text-neutral-medium">Initial</span>
                            <span className="font-medium">{config.reminderSettings.initialReminder} days before</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-medium">Second</span>
                            <span className="font-medium">{config.reminderSettings.secondReminder} days after</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-medium">Final</span>
                            <span className="font-medium">{config.reminderSettings.finalNotice} days after</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingConfig(config.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Settings
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-small text-neutral-medium">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {showAddPropertyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">Add New Property</h2>
                  <p className="text-small text-neutral-medium mt-1">Configure billing settings for a new property</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowAddPropertyModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Property Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-small font-medium text-neutral-black mb-2">Property Name *</label>
                    <input
                      type="text"
                      value={newPropertyForm.propertyName}
                      onChange={(e) => setNewPropertyForm(prev => ({ ...prev, propertyName: e.target.value }))}
                      placeholder="e.g., Oak Gardens Apartments"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">State *</label>
                    <select
                      value={newPropertyForm.state}
                      onChange={(e) => setNewPropertyForm(prev => ({ ...prev, state: e.target.value as any }))}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="NC">North Carolina</option>
                      <option value="SC">South Carolina</option>
                      <option value="GA">Georgia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">Unit Count *</label>
                    <input
                      type="number"
                      value={newPropertyForm.unitCount}
                      onChange={(e) => setNewPropertyForm(prev => ({ ...prev, unitCount: e.target.value }))}
                      placeholder="e.g., 50"
                      min="1"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">Average Rent *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                      <input
                        type="number"
                        value={newPropertyForm.avgRent}
                        onChange={(e) => setNewPropertyForm(prev => ({ ...prev, avgRent: e.target.value }))}
                        placeholder="1500"
                        min="0"
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-small font-medium text-neutral-black mb-2">Billing Day</label>
                    <select
                      value={newPropertyForm.billingDay}
                      onChange={(e) => setNewPropertyForm(prev => ({ ...prev, billingDay: e.target.value }))}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="1">1st of Month</option>
                      <option value="5">5th of Month</option>
                      <option value="10">10th of Month</option>
                      <option value="15">15th of Month</option>
                    </select>
                  </div>
                </div>

                {/* Grace Period */}
                <div>
                  <label className="block text-small font-medium text-neutral-black mb-2">
                    Grace Period
                    {newPropertyForm.state === 'NC' && (
                      <span className="text-xs text-blue-600 ml-2">(NC requires minimum 5 days)</span>
                    )}
                  </label>
                  <select
                    value={newPropertyForm.gracePeriodDays}
                    onChange={(e) => setNewPropertyForm(prev => ({ ...prev, gracePeriodDays: e.target.value }))}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {newPropertyForm.state !== 'NC' && <option value="3">3 Days</option>}
                    <option value="5">5 Days</option>
                    <option value="7">7 Days</option>
                    <option value="10">10 Days</option>
                  </select>
                </div>

                {/* Late Fee Settings */}
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-small font-medium text-neutral-black">Late Fee</p>
                      <p className="text-xs text-neutral-medium">Apply late fees for overdue payments</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewPropertyForm(prev => ({ ...prev, lateFeeEnabled: !prev.lateFeeEnabled }))}
                      className={newPropertyForm.lateFeeEnabled ? 'text-green-600' : 'text-neutral-medium'}
                    >
                      <ToggleRight className={`h-5 w-5 ${newPropertyForm.lateFeeEnabled ? 'fill-current' : ''}`} />
                    </Button>
                  </div>

                  {newPropertyForm.lateFeeEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-neutral-medium mb-1">Fee Type</label>
                        <select
                          value={newPropertyForm.lateFeeType}
                          onChange={(e) => setNewPropertyForm(prev => ({ ...prev, lateFeeType: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-border rounded-lg text-small"
                        >
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed Amount</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-medium mb-1">
                          Amount {newPropertyForm.state === 'NC' && newPropertyForm.lateFeeType === 'percentage' && '(NC max 5%)'}
                        </label>
                        <div className="relative">
                          {newPropertyForm.lateFeeType === 'fixed' && (
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                          )}
                          <input
                            type="number"
                            value={newPropertyForm.lateFeeAmount}
                            onChange={(e) => setNewPropertyForm(prev => ({ ...prev, lateFeeAmount: e.target.value }))}
                            placeholder={newPropertyForm.lateFeeType === 'percentage' ? '5' : '50'}
                            min="0"
                            max={newPropertyForm.state === 'NC' && newPropertyForm.lateFeeType === 'percentage' ? '5' : undefined}
                            className={`w-full ${newPropertyForm.lateFeeType === 'fixed' ? 'pl-10' : 'pl-4'} pr-4 py-2 border border-border rounded-lg text-small`}
                          />
                          {newPropertyForm.lateFeeType === 'percentage' && (
                            <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-medium" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto Billing */}
                <div className="flex items-center justify-between p-4 bg-neutral-lighter rounded-lg">
                  <div>
                    <p className="text-small font-medium text-neutral-black">Automatic Billing</p>
                    <p className="text-xs text-neutral-medium">Charge payment methods automatically on due date</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewPropertyForm(prev => ({ ...prev, automaticBilling: !prev.automaticBilling }))}
                    className={newPropertyForm.automaticBilling ? 'text-green-600' : 'text-neutral-medium'}
                  >
                    <ToggleRight className={`h-5 w-5 ${newPropertyForm.automaticBilling ? 'fill-current' : ''}`} />
                  </Button>
                </div>

                {/* State Compliance Notice */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Scale className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-small font-medium text-blue-900">
                        {STATE_COMPLIANCE[newPropertyForm.state].name} Compliance
                      </p>
                      <p className="text-small text-blue-700 mt-1">
                        {STATE_COMPLIANCE[newPropertyForm.state].description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowAddPropertyModal(false)}>Cancel</Button>
                <Button onClick={handleAddProperty} disabled={isAdding}>
                  {isAdding ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-2" />Add Property</>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">Export Billing Settings</h2>
                  <p className="text-small text-neutral-medium mt-1">Download configuration as CSV</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowExportModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-neutral-lighter rounded-lg">
                  <p className="text-small text-neutral-medium mb-2">Export Scope</p>
                  <p className="font-medium text-neutral-black">
                    {activeState === 'all'
                      ? `All States (${configurations.length} properties)`
                      : `${STATE_COMPLIANCE[activeState].name} (${configurations.filter(c => c.state === activeState).length} properties)`
                    }
                  </p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-small font-medium text-blue-900">CSV Format</p>
                      <p className="text-xs text-blue-700">
                        Includes property details, billing settings, and compliance status
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowExportModal(false)}>Cancel</Button>
                <Button onClick={handleExportSettings} disabled={isExporting}>
                  {isExporting ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Exporting...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" />Export CSV</>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Property Details Modal */}
      {showDetailsModal && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedProperty.state === 'NC' ? 'bg-blue-100' :
                    selectedProperty.state === 'SC' ? 'bg-purple-100' : 'bg-orange-100'
                  }`}>
                    <Building className={`h-5 w-5 ${
                      selectedProperty.state === 'NC' ? 'text-blue-600' :
                      selectedProperty.state === 'SC' ? 'text-purple-600' : 'text-orange-600'
                    }`} />
                  </div>
                  <div>
                    <h2 className="text-h3 font-bold text-neutral-black">{selectedProperty.propertyName}</h2>
                    <p className="text-small text-neutral-medium">{selectedProperty.propertyId}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDetailsModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Status Row */}
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-small font-medium ${getStateColor(selectedProperty.state)}`}>
                    {selectedProperty.state} - {STATE_COMPLIANCE[selectedProperty.state].name}
                  </span>
                  {getComplianceBadge(selectedProperty.complianceStatus)}
                  <Badge variant={selectedProperty.automaticBilling ? 'default' : 'secondary'} className={selectedProperty.automaticBilling ? 'bg-green-500' : ''}>
                    {selectedProperty.automaticBilling ? 'Auto-Billing' : 'Manual Billing'}
                  </Badge>
                </div>

                {/* Property Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-neutral-lighter rounded-lg text-center">
                    <p className="text-h4 font-bold text-neutral-black">{selectedProperty.unitCount}</p>
                    <p className="text-xs text-neutral-medium">Total Units</p>
                  </div>
                  <div className="p-4 bg-neutral-lighter rounded-lg text-center">
                    <p className="text-h4 font-bold text-green-600">{selectedProperty.occupiedUnits}</p>
                    <p className="text-xs text-neutral-medium">Occupied</p>
                  </div>
                  <div className="p-4 bg-neutral-lighter rounded-lg text-center">
                    <p className="text-h4 font-bold text-neutral-black">
                      {Math.round(selectedProperty.occupiedUnits / selectedProperty.unitCount * 100)}%
                    </p>
                    <p className="text-xs text-neutral-medium">Occupancy</p>
                  </div>
                  <div className="p-4 bg-neutral-lighter rounded-lg text-center">
                    <p className="text-h4 font-bold text-neutral-black">{formatCurrency(selectedProperty.avgRent)}</p>
                    <p className="text-xs text-neutral-medium">Avg Rent</p>
                  </div>
                </div>

                {/* Billing Configuration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-border rounded-lg">
                    <h4 className="font-semibold text-neutral-black mb-3">Billing Schedule</h4>
                    <div className="space-y-2 text-small">
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Billing Day</span>
                        <span className="font-medium">{selectedProperty.billingDay}{selectedProperty.billingDay === 1 ? 'st' : 'th'} of Month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Grace Period</span>
                        <span className="font-medium">{selectedProperty.gracePeriodDays} days</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <h4 className="font-semibold text-neutral-black mb-3">Late Fee</h4>
                    <div className="space-y-2 text-small">
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Status</span>
                        <span className={`font-medium ${selectedProperty.lateFeeEnabled ? 'text-green-600' : 'text-neutral-medium'}`}>
                          {selectedProperty.lateFeeEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      {selectedProperty.lateFeeEnabled && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-neutral-medium">Amount</span>
                            <span className="font-medium">
                              {selectedProperty.lateFeeType === 'percentage'
                                ? `${selectedProperty.lateFeeAmount}%`
                                : formatCurrency(selectedProperty.lateFeeAmount)
                              }
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-medium">Grace Days</span>
                            <span className="font-medium">{selectedProperty.lateFeeGraceDays} days</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pending Actions */}
                {selectedProperty.pendingActions.length > 0 && (
                  <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                    <h4 className="font-semibold text-amber-800 mb-3">
                      Pending Actions ({selectedProperty.pendingActions.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedProperty.pendingActions.map((action) => (
                        <div key={action.id} className="flex items-center justify-between p-2 bg-white rounded border border-amber-200">
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(action.priority)}
                            <span className="text-small">{action.description}</span>
                          </div>
                          {action.dueDate && (
                            <span className="text-xs text-neutral-medium">Due: {action.dueDate}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* State Compliance */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Scale className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-small font-medium text-blue-900">
                        {STATE_COMPLIANCE[selectedProperty.state].name} Compliance
                      </p>
                      <p className="text-small text-blue-700 mt-1">
                        {STATE_COMPLIANCE[selectedProperty.state].description}
                      </p>
                      <p className="text-xs text-blue-600 mt-1 italic">
                        {STATE_COMPLIANCE[selectedProperty.state].citation}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-medium text-right">
                  Last updated: {selectedProperty.lastUpdated}
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>Close</Button>
                <Button onClick={() => { setShowDetailsModal(false); setEditingConfig(selectedProperty.id); }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Settings
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
