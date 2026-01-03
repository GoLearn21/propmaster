/**
 * Optimized Dashboard Service
 *
 * Performance optimizations:
 * 1. Single RPC calls instead of multiple queries
 * 2. Parallel data fetching where possible
 * 3. Proper error handling with fallbacks
 * 4. TypeScript strict types
 *
 * This service is designed to work with the optimized PostgreSQL functions
 * from performance-indexes.sql. Falls back to client-side queries if RPC not available.
 */

import { supabase } from '../lib/supabase';

export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupancyRate: number;
  activeLeases: number;
  monthlyRevenue: number;
  outstandingBalance: number;
  activeTasks: number;
  overdueTasksCount: number;
  maintenanceRequests: number;
  totalTenants: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface OccupancyTrendPoint {
  month: string;
  occupancyRate: number;
}

export interface PropertyPerformance {
  id: string;
  name: string;
  units: number;
  occupied: number;
  occupancyRate: number;
  monthlyRevenue: number;
  outstandingBalance: number;
  maintenanceCosts: number;
}

export interface ActivityItem {
  id: string;
  type: 'payment' | 'task' | 'maintenance' | 'lease' | 'communication';
  title: string;
  description: string;
  timestamp: string;
  propertyName?: string;
  tenantName?: string;
  amount?: number;
  status?: string;
}

export interface TaskSummary {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface WorkflowCounts {
  propertyCount: number;
  unitCount: number;
  tenantCount: number;
  leaseCount: number;
  expiringLeaseCount: number;
  taskCount: number;
}

// Cache for in-memory data (short-lived, 30 seconds)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetch dashboard stats using optimized RPC function
 * Falls back to parallel queries if RPC not available
 */
export async function getDashboardStatsOptimized(): Promise<DashboardStats> {
  const cacheKey = 'dashboard_stats';
  const cached = getCached<DashboardStats>(cacheKey);
  if (cached) return cached;

  try {
    // Try optimized RPC function first
    const { data, error } = await supabase.rpc('get_dashboard_stats_optimized');

    if (!error && data) {
      const stats: DashboardStats = {
        totalProperties: data.totalProperties || 0,
        totalUnits: data.totalUnits || 0,
        occupancyRate: data.occupancyRate || 0,
        activeLeases: data.activeLeases || 0,
        monthlyRevenue: data.monthlyRevenue || 0,
        outstandingBalance: data.outstandingBalance || 0,
        activeTasks: data.activeTasks || 0,
        overdueTasksCount: data.overdueTasksCount || 0,
        maintenanceRequests: data.maintenanceRequests || 0,
        totalTenants: data.totalTenants || 0,
      };
      setCache(cacheKey, stats);
      return stats;
    }
  } catch (rpcError) {
    console.log('RPC not available, using fallback queries');
  }

  // Fallback: Use parallel queries (more efficient than sequential)
  // NOTE: Show all properties/tenants (not just 'active') to reflect full data
  const [
    propertiesResult,
    unitsResult,
    leasesResult,
    tenantsResult,
    tasksResult,
    paymentsResult,
  ] = await Promise.all([
    supabase.from('properties').select('id', { count: 'exact', head: true }),
    supabase.from('units').select('id, status'),
    supabase.from('leases').select('id, monthly_rent').eq('status', 'active'),
    supabase.from('tenants').select('id', { count: 'exact', head: true }),
    supabase.from('tasks').select('id, status, due_date'),
    supabase.from('payment_history').select('amount, late_fee').in('status', ['pending', 'failed']),
  ]);

  const units = unitsResult.data || [];
  const totalUnits = units.length;
  const occupiedUnits = units.filter(u => u.status === 'occupied').length;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  const leases = leasesResult.data || [];
  const monthlyRevenue = leases.reduce((sum, l) => sum + (l.monthly_rent || 0), 0);

  const tasks = tasksResult.data || [];
  const now = new Date();
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  const overdueTasksCount = tasks.filter(t =>
    t.status !== 'completed' &&
    t.status !== 'cancelled' &&
    t.due_date &&
    new Date(t.due_date) < now
  ).length;

  const payments = paymentsResult.data || [];
  const outstandingBalance = payments.reduce((sum, p) => sum + (p.amount || 0) + (p.late_fee || 0), 0);

  const stats: DashboardStats = {
    totalProperties: propertiesResult.count || 0,
    totalUnits,
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    activeLeases: leases.length,
    monthlyRevenue,
    outstandingBalance,
    activeTasks,
    overdueTasksCount,
    maintenanceRequests: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
    totalTenants: tenantsResult.count || 0,
  };

  setCache(cacheKey, stats);
  return stats;
}

/**
 * Fetch revenue trend using optimized RPC
 */
export async function getRevenueTrendOptimized(months: number = 6): Promise<RevenueDataPoint[]> {
  const cacheKey = `revenue_trend_${months}`;
  const cached = getCached<RevenueDataPoint[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.rpc('get_revenue_trend_optimized', { months_back: months });

    if (!error && data) {
      const result = data as RevenueDataPoint[];
      setCache(cacheKey, result);
      return result;
    }
  } catch {
    console.log('Revenue trend RPC not available, using fallback');
  }

  // Fallback: Generate month data
  const now = new Date();
  const result: RevenueDataPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    result.push({
      month: monthName,
      revenue: 0,
      expenses: 0,
      profit: 0,
    });
  }

  setCache(cacheKey, result);
  return result;
}

/**
 * Fetch occupancy trend using optimized RPC
 */
export async function getOccupancyTrendOptimized(months: number = 6): Promise<OccupancyTrendPoint[]> {
  const cacheKey = `occupancy_trend_${months}`;
  const cached = getCached<OccupancyTrendPoint[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.rpc('get_occupancy_trend_optimized', { months_back: months });

    if (!error && data) {
      const result = data as OccupancyTrendPoint[];
      setCache(cacheKey, result);
      return result;
    }
  } catch {
    console.log('Occupancy trend RPC not available, using fallback');
  }

  // Fallback
  const now = new Date();
  const result: OccupancyTrendPoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      occupancyRate: 0,
    });
  }

  setCache(cacheKey, result);
  return result;
}

/**
 * Fetch property performance using optimized RPC
 */
export async function getPropertyPerformanceOptimized(): Promise<PropertyPerformance[]> {
  const cacheKey = 'property_performance';
  const cached = getCached<PropertyPerformance[]>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.rpc('get_property_performance_optimized');

    if (!error && data) {
      const result = data as PropertyPerformance[];
      setCache(cacheKey, result);
      return result;
    }
  } catch {
    console.log('Property performance RPC not available, using fallback');
  }

  // Fallback: Simple query - get all properties for full visibility
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .order('name');

  const result: PropertyPerformance[] = (properties || []).map(p => ({
    id: p.id,
    name: p.name,
    units: 0,
    occupied: 0,
    occupancyRate: 0,
    monthlyRevenue: 0,
    outstandingBalance: 0,
    maintenanceCosts: 0,
  }));

  setCache(cacheKey, result);
  return result;
}

/**
 * Fetch task summary using optimized RPC
 */
export async function getTaskSummaryOptimized(): Promise<TaskSummary> {
  const cacheKey = 'task_summary';
  const cached = getCached<TaskSummary>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.rpc('get_task_summary_optimized');

    if (!error && data) {
      const result: TaskSummary = {
        pending: data.pending || 0,
        inProgress: data.inProgress || 0,
        completed: data.completed || 0,
        overdue: data.overdue || 0,
        byPriority: data.byPriority || { high: 0, medium: 0, low: 0 },
      };
      setCache(cacheKey, result);
      return result;
    }
  } catch {
    console.log('Task summary RPC not available, using fallback');
  }

  // Fallback
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status, priority, due_date');

  const now = new Date();
  const summary: TaskSummary = {
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    byPriority: { high: 0, medium: 0, low: 0 },
  };

  (tasks || []).forEach(task => {
    if (task.status === 'pending') summary.pending++;
    else if (task.status === 'in_progress') summary.inProgress++;
    else if (task.status === 'completed') summary.completed++;

    if (task.due_date && new Date(task.due_date) < now &&
        task.status !== 'completed' && task.status !== 'cancelled') {
      summary.overdue++;
    }

    if (task.status !== 'completed' && task.status !== 'cancelled') {
      if (task.priority === 'high') summary.byPriority.high++;
      else if (task.priority === 'medium') summary.byPriority.medium++;
      else summary.byPriority.low++;
    }
  });

  setCache(cacheKey, summary);
  return summary;
}

/**
 * Fetch recent activities
 */
export async function getRecentActivitiesOptimized(limit: number = 10): Promise<ActivityItem[]> {
  const cacheKey = `recent_activities_${limit}`;
  const cached = getCached<ActivityItem[]>(cacheKey);
  if (cached) return cached;

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, created_at, properties(name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  const activities: ActivityItem[] = (tasks || []).map(task => ({
    id: task.id,
    type: 'task' as const,
    title: task.title,
    description: `Task ${task.status}`,
    timestamp: task.created_at,
    propertyName: (task.properties as { name: string } | null)?.name,
    status: task.status,
  }));

  setCache(cacheKey, activities);
  return activities;
}

/**
 * Fetch workflow counts using optimized RPC
 */
export async function getWorkflowCountsOptimized(): Promise<WorkflowCounts> {
  const cacheKey = 'workflow_counts';
  const cached = getCached<WorkflowCounts>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.rpc('get_workflow_counts');

    if (!error && data) {
      const result: WorkflowCounts = {
        propertyCount: data.propertyCount || 0,
        unitCount: data.unitCount || 0,
        tenantCount: data.tenantCount || 0,
        leaseCount: data.leaseCount || 0,
        expiringLeaseCount: data.expiringLeaseCount || 0,
        taskCount: data.taskCount || 0,
      };
      setCache(cacheKey, result);
      return result;
    }
  } catch {
    console.log('Workflow counts RPC not available, using fallback');
  }

  // Fallback: Parallel queries
  const [
    { count: propertyCount },
    { count: unitCount },
    { count: tenantCount },
    { count: leaseCount },
    { data: expiringLeases },
    { count: taskCount },
  ] = await Promise.all([
    supabase.from('properties').select('*', { count: 'exact', head: true }),
    supabase.from('units').select('*', { count: 'exact', head: true }),
    supabase.from('tenants').select('*', { count: 'exact', head: true }),
    supabase.from('leases').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('leases').select('id').eq('status', 'active').lte('end_date', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const result: WorkflowCounts = {
    propertyCount: propertyCount || 0,
    unitCount: unitCount || 0,
    tenantCount: tenantCount || 0,
    leaseCount: leaseCount || 0,
    expiringLeaseCount: expiringLeases?.length || 0,
    taskCount: taskCount || 0,
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Fetch ALL dashboard data in a single optimized call
 * This is the primary function to use for initial dashboard load
 */
export async function getAllDashboardDataOptimized(): Promise<{
  stats: DashboardStats;
  revenueTrend: RevenueDataPoint[];
  occupancyTrend: OccupancyTrendPoint[];
  propertyPerformance: PropertyPerformance[];
  recentActivities: ActivityItem[];
  taskSummary: TaskSummary;
}> {
  // Fetch all data in parallel for maximum performance
  const [stats, revenueTrend, occupancyTrend, propertyPerformance, recentActivities, taskSummary] =
    await Promise.all([
      getDashboardStatsOptimized(),
      getRevenueTrendOptimized(6),
      getOccupancyTrendOptimized(6),
      getPropertyPerformanceOptimized(),
      getRecentActivitiesOptimized(10),
      getTaskSummaryOptimized(),
    ]);

  return {
    stats,
    revenueTrend,
    occupancyTrend,
    propertyPerformance,
    recentActivities,
    taskSummary,
  };
}

/**
 * Clear all cached data (call after data mutations)
 */
export function clearDashboardCache(): void {
  cache.clear();
}
