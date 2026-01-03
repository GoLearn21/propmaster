// Reports Service Layer and Types
import { supabase } from '../lib/supabase';

// Report Types
export type ReportCategory = 'favorites' | 'business_overview' | 'financial' | 'operational' | 'tenant_management';

export interface Report {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  icon: string;
  isFavorite: boolean;
  lastGenerated?: Date;
}

export interface SavedReport {
  id: string;
  reportId: string;
  reportName: string;
  name: string;
  filters: {
    startDate?: string;
    endDate?: string;
    propertyId?: string;
  };
  createdAt: string;
  generatedAt?: string;
}

export interface ScheduledReport {
  id: string;
  reportId: string;
  reportName: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  emailTo: string[];
  format: 'pdf' | 'excel' | 'csv';
  lastRun?: string;
  nextRun?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  propertyId?: string;
  unitId?: string;
  status?: string;
}

// Report Definitions
export const AVAILABLE_REPORTS: Report[] = [
  {
    id: 'ar-aging',
    name: 'A/R Aging Detail',
    description: 'Outstanding receivables by age (0-30, 31-60, 61-90, 90+ days)',
    category: 'financial',
    icon: 'DollarSign',
    isFavorite: false,
  },
  {
    id: 'balance-sheet',
    name: 'Balance Sheet',
    description: 'Assets, liabilities, and equity analysis',
    category: 'financial',
    icon: 'Scale',
    isFavorite: false,
  },
  {
    id: 'profit-loss',
    name: 'Profit and Loss',
    description: 'Income and expense categories with period comparison',
    category: 'financial',
    icon: 'TrendingUp',
    isFavorite: true,
  },
  {
    id: 'cash-flow',
    name: 'Cash Flow Statement',
    description: 'Operating, investing, and financing activities',
    category: 'financial',
    icon: 'ArrowDownUp',
    isFavorite: false,
  },
  {
    id: 'property-reserves',
    name: 'Property Reserve Funds',
    description: 'Reserve fund balances and capital expenditure planning',
    category: 'financial',
    icon: 'PiggyBank',
    isFavorite: false,
  },
  {
    id: 'rent-roll',
    name: 'Rent Roll',
    description: 'Unit-by-unit rental information and lease details',
    category: 'business_overview',
    icon: 'FileText',
    isFavorite: true,
  },
  {
    id: 'current-tenants',
    name: 'Current Tenants',
    description: 'Tenant profiles, contact information, and lease details',
    category: 'tenant_management',
    icon: 'Users',
    isFavorite: false,
  },
  {
    id: 'general-ledger',
    name: 'General Ledger',
    description: 'Account transactions and detailed transaction history',
    category: 'financial',
    icon: 'BookOpen',
    isFavorite: false,
  },
  {
    id: 'tasks-by-property',
    name: 'Tasks by Property',
    description: 'Maintenance and operational tasks by property',
    category: 'operational',
    icon: 'ClipboardList',
    isFavorite: false,
  },
  {
    id: 'overdue-tasks',
    name: 'Overdue Tasks',
    description: 'Past due maintenance tasks with priority escalation',
    category: 'operational',
    icon: 'AlertTriangle',
    isFavorite: true,
  },
  {
    id: 'undeposited-funds',
    name: 'Undeposited Funds',
    description: 'Pending deposits and payments awaiting bank deposit',
    category: 'financial',
    icon: 'Wallet',
    isFavorite: false,
  },
];

// Favorite Reports Management
const FAVORITES_KEY = 'propmaster_favorite_reports';

export function getFavoriteReports(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteReport(reportId: string): boolean {
  const favorites = getFavoriteReports();
  const index = favorites.indexOf(reportId);
  
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(reportId);
  }
  
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return index === -1; // Return true if added, false if removed
}

export function getReportsWithFavorites(): Report[] {
  const favorites = getFavoriteReports();
  return AVAILABLE_REPORTS.map(report => ({
    ...report,
    isFavorite: favorites.includes(report.id),
  }));
}

// Report Data Fetching Functions

/**
 * Generate A/R Aging Detail Report
 */
export async function generateARAgingReport(filters?: ReportFilter) {
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*, unit_id, units(unit_number, properties(name))')
    .order('balance_due', { ascending: false });

  if (error) throw error;

  // Calculate aging buckets
  const today = new Date();
  const agingData = tenants?.map(tenant => {
    const balance = tenant.balance_due || 0;
    const daysOverdue = tenant.lease_end_date 
      ? Math.floor((today.getTime() - new Date(tenant.lease_end_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    let agingBucket = '0-30 days';
    if (daysOverdue > 90) agingBucket = '90+ days';
    else if (daysOverdue > 60) agingBucket = '61-90 days';
    else if (daysOverdue > 30) agingBucket = '31-60 days';

    return {
      tenant: `${tenant.first_name} ${tenant.last_name}`,
      unit: tenant.units?.unit_number,
      property: tenant.units?.properties?.name,
      balance,
      agingBucket,
      daysOverdue,
    };
  }) || [];

  return agingData;
}

/**
 * Generate Rent Roll Report
 */
export async function generateRentRollReport(filters?: ReportFilter) {
  let query = supabase
    .from('units')
    .select('*, properties(name, address), tenants(first_name, last_name, lease_start_date, lease_end_date, balance_due)')
    .order('unit_number');

  if (filters?.propertyId) {
    query = query.eq('property_id', filters.propertyId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data?.map(unit => ({
    property: unit.properties?.name,
    address: unit.properties?.address,
    unit: unit.unit_number,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms,
    sqft: unit.square_feet,
    rent: unit.rent_amount,
    status: unit.status,
    tenant: unit.tenants?.[0] 
      ? `${unit.tenants[0].first_name} ${unit.tenants[0].last_name}`
      : 'Vacant',
    leaseStart: unit.tenants?.[0]?.lease_start_date,
    leaseEnd: unit.tenants?.[0]?.lease_end_date,
    balance: unit.tenants?.[0]?.balance_due || 0,
  })) || [];
}

/**
 * Generate Current Tenants Report
 */
export async function generateCurrentTenantsReport(filters?: ReportFilter) {
  const { data, error } = await supabase
    .from('tenants')
    .select('*, units(unit_number, properties(name))')
    .order('last_name');

  if (error) throw error;

  return data?.map(tenant => ({
    name: `${tenant.first_name} ${tenant.last_name}`,
    email: tenant.email,
    phone: tenant.phone,
    unit: tenant.units?.unit_number,
    property: tenant.units?.properties?.name,
    leaseStart: tenant.lease_start_date,
    leaseEnd: tenant.lease_end_date,
    rent: tenant.rent_amount,
    balance: tenant.balance_due,
  })) || [];
}

/**
 * Generate Tasks by Property Report
 */
export async function generateTasksByPropertyReport(filters?: ReportFilter) {
  let query = supabase
    .from('tasks')
    .select('*, properties(name)')
    .order('created_at', { ascending: false });

  if (filters?.propertyId) {
    query = query.eq('property_id', filters.propertyId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data?.map(task => ({
    property: task.properties?.name || 'Unassigned',
    title: task.title,
    type: task.task_type,
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date,
    assignedTo: task.assigned_to,
    frequency: task.frequency,
  })) || [];
}

/**
 * Generate Overdue Tasks Report
 */
export async function generateOverdueTasksReport() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('*, properties(name)')
    .lt('due_date', today)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true });

  if (error) throw error;

  return data?.map(task => ({
    property: task.properties?.name || 'Unassigned',
    title: task.title,
    type: task.task_type,
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date,
    daysOverdue: Math.floor(
      (new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24)
    ),
    assignedTo: task.assigned_to,
  })) || [];
}

/**
 * Generate Profit and Loss Report
 */
export async function generateProfitLossReport(filters?: ReportFilter) {
  // Calculate from actual database data
  const { data: properties } = await supabase.from('properties').select('*');
  const { data: units } = await supabase.from('units').select('rent_amount, status');
  const { data: tenants } = await supabase.from('tenants').select('balance_due');
  
  // Calculate rental income from occupied units
  const rentalIncome = units?.reduce((sum, unit) => {
    return sum + (unit.status === 'occupied' ? (unit.rent_amount || 0) : 0);
  }, 0) || 0;

  // Calculate late fees from tenant balances over threshold
  const lateFees = tenants?.reduce((sum, tenant) => {
    const balance = tenant.balance_due || 0;
    return sum + (balance > 100 ? 50 : 0); // $50 late fee if balance > $100
  }, 0) || 0;

  // Estimated expenses based on property count
  const propertyCount = properties?.length || 0;
  const baseExpenses = {
    maintenance: propertyCount * 500,
    utilities: propertyCount * 300,
    insurance: propertyCount * 400,
    propertyTax: propertyCount * 800,
    management: rentalIncome * 0.08, // 8% management fee
    repairs: propertyCount * 350,
  };

  const totalIncome = rentalIncome + lateFees;
  const totalExpenses = Object.values(baseExpenses).reduce((sum, val) => sum + val, 0);

  return {
    income: {
      rentalIncome,
      lateFees,
      otherIncome: 0,
      total: totalIncome,
    },
    expenses: {
      ...baseExpenses,
      total: totalExpenses,
    },
    netIncome: totalIncome - totalExpenses,
    properties: propertyCount,
  };
}

/**
 * Generate Balance Sheet Report
 */
export async function generateBalanceSheetReport(filters?: ReportFilter) {
  const { data: properties } = await supabase.from('properties').select('*');
  const { data: units } = await supabase.from('units').select('rent_amount');
  const { data: tenants } = await supabase.from('tenants').select('balance_due');

  // Calculate assets
  const totalRentReceivable = tenants?.reduce((sum, t) => sum + (t.balance_due || 0), 0) || 0;
  const propertyValue = (properties?.length || 0) * 250000; // Average property value
  const cashOnHand = (units?.length || 0) * 1500; // Average monthly rent collected

  // Calculate liabilities
  const mortgagePayable = propertyValue * 0.6; // 60% LTV
  const securityDeposits = (units?.length || 0) * 1000;

  const totalAssets = propertyValue + cashOnHand + totalRentReceivable;
  const totalLiabilities = mortgagePayable + securityDeposits;
  const equity = totalAssets - totalLiabilities;

  return {
    assets: {
      propertyValue,
      cashOnHand,
      accountsReceivable: totalRentReceivable,
      total: totalAssets,
    },
    liabilities: {
      mortgagePayable,
      securityDeposits,
      accountsPayable: 0,
      total: totalLiabilities,
    },
    equity: {
      ownersEquity: equity,
      retainedEarnings: 0,
      total: equity,
    },
    totalLiabilitiesAndEquity: totalLiabilities + equity,
  };
}

/**
 * Generate Cash Flow Statement Report
 */
export async function generateCashFlowReport(filters?: ReportFilter) {
  const profitLoss = await generateProfitLossReport(filters);
  const { data: properties } = await supabase.from('properties').select('*');

  const propertyCount = properties?.length || 0;

  return {
    operatingActivities: {
      netIncome: profitLoss.netIncome,
      adjustments: {
        depreciation: propertyCount * 800,
        accountsReceivableChange: -500,
        accountsPayableChange: 300,
      },
      total: profitLoss.netIncome + (propertyCount * 800) - 500 + 300,
    },
    investingActivities: {
      propertyAcquisitions: 0,
      capitalImprovements: -propertyCount * 1000,
      total: -propertyCount * 1000,
    },
    financingActivities: {
      mortgagePayments: -propertyCount * 2000,
      ownerContributions: 0,
      total: -propertyCount * 2000,
    },
    netCashFlow: profitLoss.netIncome + (propertyCount * 800) - 200 - (propertyCount * 1000) - (propertyCount * 2000),
  };
}

/**
 * Generate Property Reserve Funds Report
 */
export async function generatePropertyReservesReport(filters?: ReportFilter) {
  let query = supabase.from('properties').select('*');
  
  if (filters?.propertyId) {
    query = query.eq('id', filters.propertyId);
  }

  const { data: properties } = await query;

  return properties?.map(property => ({
    property: property.name,
    address: property.address,
    currentReserve: Math.floor(Math.random() * 10000) + 5000, // Would come from accounting system
    monthlyContribution: 500,
    targetReserve: 25000,
    percentFunded: ((Math.floor(Math.random() * 10000) + 5000) / 25000) * 100,
    lastCapitalExpense: 'Roof Repair - $3,500',
    lastExpenseDate: '2024-09-15',
  })) || [];
}

/**
 * Generate General Ledger Report
 */
export async function generateGeneralLedgerReport(filters?: ReportFilter) {
  const { data: tenants } = await supabase.from('tenants').select('*, units(unit_number, properties(name))');
  
  // Generate sample transactions from tenant data
  const transactions = tenants?.flatMap(tenant => [
    {
      date: tenant.lease_start_date,
      account: 'Rental Income',
      description: `Rent - ${tenant.first_name} ${tenant.last_name} - ${tenant.units?.properties?.name}`,
      debit: 0,
      credit: tenant.rent_amount || 0,
      balance: tenant.rent_amount || 0,
    },
    ...(tenant.balance_due && tenant.balance_due > 0 ? [{
      date: tenant.lease_end_date || new Date().toISOString(),
      account: 'Accounts Receivable',
      description: `Outstanding Balance - ${tenant.first_name} ${tenant.last_name}`,
      debit: tenant.balance_due,
      credit: 0,
      balance: tenant.balance_due,
    }] : []),
  ]) || [];

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Generate Undeposited Funds Report
 */
export async function generateUndepositedFundsReport() {
  const { data: tenants } = await supabase.from('tenants').select('*, units(unit_number, properties(name))');
  
  // Simulate undeposited funds from recent payments
  const undepositedFunds = tenants?.filter(t => t.balance_due === 0).slice(0, 5).map(tenant => ({
    date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tenant: `${tenant.first_name} ${tenant.last_name}`,
    unit: tenant.units?.unit_number,
    property: tenant.units?.properties?.name,
    amount: tenant.rent_amount || 0,
    paymentMethod: Math.random() > 0.5 ? 'Check' : 'Cash',
    status: 'Pending Deposit',
  })) || [];

  return undepositedFunds;
}

/**
 * Export report data to CSV format
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header];
      return typeof value === 'string' && value.includes(',')
        ? `"${value}"`
        : value;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}

// ============== SAVED REPORTS ==============

const SAVED_REPORTS_KEY = 'propmaster_saved_reports';
const SCHEDULED_REPORTS_KEY = 'propmaster_scheduled_reports';

/**
 * Get all saved reports
 */
export function getSavedReports(): SavedReport[] {
  try {
    const stored = localStorage.getItem(SAVED_REPORTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save a report configuration
 */
export function saveReport(report: Omit<SavedReport, 'id' | 'createdAt'>): SavedReport {
  const savedReports = getSavedReports();
  const newSavedReport: SavedReport = {
    ...report,
    id: `saved-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  savedReports.push(newSavedReport);
  localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(savedReports));
  return newSavedReport;
}

/**
 * Delete a saved report
 */
export function deleteSavedReport(id: string): boolean {
  const savedReports = getSavedReports();
  const index = savedReports.findIndex(r => r.id === id);
  if (index > -1) {
    savedReports.splice(index, 1);
    localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(savedReports));
    return true;
  }
  return false;
}

// ============== SCHEDULED REPORTS ==============

/**
 * Get all scheduled reports
 */
export function getScheduledReports(): ScheduledReport[] {
  try {
    const stored = localStorage.getItem(SCHEDULED_REPORTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Schedule a report
 */
export function scheduleReport(schedule: Omit<ScheduledReport, 'id' | 'createdAt' | 'isActive' | 'nextRun'>): ScheduledReport {
  const scheduledReports = getScheduledReports();

  // Calculate next run time
  const now = new Date();
  const [hours, minutes] = schedule.time.split(':').map(Number);
  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  if (nextRun <= now) {
    // Schedule for tomorrow at minimum
    nextRun.setDate(nextRun.getDate() + 1);
  }

  // Adjust based on frequency
  if (schedule.frequency === 'weekly' && schedule.dayOfWeek !== undefined) {
    while (nextRun.getDay() !== schedule.dayOfWeek) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if ((schedule.frequency === 'monthly' || schedule.frequency === 'quarterly') && schedule.dayOfMonth) {
    nextRun.setDate(schedule.dayOfMonth);
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + (schedule.frequency === 'quarterly' ? 3 : 1));
    }
  }

  const newScheduledReport: ScheduledReport = {
    ...schedule,
    id: `sched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    isActive: true,
    nextRun: nextRun.toISOString(),
  };

  scheduledReports.push(newScheduledReport);
  localStorage.setItem(SCHEDULED_REPORTS_KEY, JSON.stringify(scheduledReports));
  return newScheduledReport;
}

/**
 * Toggle scheduled report active status
 */
export function toggleScheduledReport(id: string): boolean {
  const scheduledReports = getScheduledReports();
  const report = scheduledReports.find(r => r.id === id);
  if (report) {
    report.isActive = !report.isActive;
    localStorage.setItem(SCHEDULED_REPORTS_KEY, JSON.stringify(scheduledReports));
    return report.isActive;
  }
  return false;
}

/**
 * Delete a scheduled report
 */
export function deleteScheduledReport(id: string): boolean {
  const scheduledReports = getScheduledReports();
  const index = scheduledReports.findIndex(r => r.id === id);
  if (index > -1) {
    scheduledReports.splice(index, 1);
    localStorage.setItem(SCHEDULED_REPORTS_KEY, JSON.stringify(scheduledReports));
    return true;
  }
  return false;
}
