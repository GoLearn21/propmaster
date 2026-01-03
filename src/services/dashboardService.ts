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

/**
 * Fetch comprehensive dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Fetch properties count
    const { data: properties, error: propsError } = await supabase
      .from('properties')
      .select('id', { count: 'exact' });

    if (propsError) throw propsError;

    // Fetch units and occupancy
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, status');

    if (unitsError) throw unitsError;

    const totalUnits = units?.length || 0;
    const occupiedUnits = units?.filter(u => u.status === 'occupied').length || 0;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    // Fetch active leases
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, monthly_rent')
      .eq('status', 'active');

    if (leasesError) throw leasesError;

    const activeLeases = leases?.length || 0;
    const monthlyRevenue = leases?.reduce((sum, lease) => sum + (lease.monthly_rent || 0), 0) || 0;

    // Fetch tenants count
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id', { count: 'exact' });

    if (tenantsError) throw tenantsError;

    // Fetch tasks statistics
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status, due_date');

    if (tasksError) throw tasksError;

    const activeTasks = tasks?.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length || 0;
    const now = new Date();
    const overdueTasksCount = tasks?.filter(t => 
      t.status !== 'completed' && 
      t.status !== 'cancelled' && 
      t.due_date && 
      new Date(t.due_date) < now
    ).length || 0;

    // For maintenance requests, we'll count pending/in_progress tasks
    const maintenanceRequests = tasks?.filter(t =>
      (t.status === 'pending' || t.status === 'in_progress')
    ).length || 0;

    // Calculate outstanding balance from payment_history table
    let outstandingBalance = 0;
    try {
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_history')
        .select('amount, status, late_fee')
        .in('status', ['pending', 'failed']);

      if (!paymentsError && payments) {
        outstandingBalance = payments.reduce((sum, payment) => {
          return sum + (payment.amount || 0) + (payment.late_fee || 0);
        }, 0);
      }
    } catch (err) {
      // payment_history table might not exist yet, default to 0
      console.log('payment_history table not available yet');
    }

    return {
      totalProperties: properties?.length || 0,
      totalUnits,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      activeLeases,
      monthlyRevenue,
      outstandingBalance,
      activeTasks,
      overdueTasksCount,
      maintenanceRequests,
      totalTenants: tenants?.length || 0,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
}

/**
 * Fetch revenue trend data for the past 6 months
 */
export async function getRevenueTrend(months: number = 6): Promise<RevenueDataPoint[]> {
  try {
    const now = new Date();
    const data: RevenueDataPoint[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

      // Fetch actual revenue from payments
      let revenue = 0;
      try {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'paid')
          .gte('payment_date', startOfMonth)
          .lte('payment_date', endOfMonth);

        revenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      } catch {
        // payments table might not exist or be empty
      }

      // Fetch actual expenses
      let expenses = 0;
      try {
        const { data: expenseData } = await supabase
          .from('expenses')
          .select('amount')
          .gte('expense_date', startOfMonth)
          .lte('expense_date', endOfMonth);

        expenses = expenseData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      } catch {
        // expenses table might not exist or be empty
      }

      // Also include work order costs as expenses
      try {
        const { data: workOrderCosts } = await supabase
          .from('work_orders')
          .select('actual_cost')
          .gte('completed_date', startOfMonth)
          .lte('completed_date', endOfMonth);

        expenses += workOrderCosts?.reduce((sum, wo) => sum + (wo.actual_cost || 0), 0) || 0;
      } catch {
        // work_orders table might not exist
      }

      data.push({
        month: monthName,
        revenue: Math.round(revenue),
        expenses: Math.round(expenses),
        profit: Math.round(revenue - expenses),
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching revenue trend:', error);
    throw error;
  }
}

/**
 * Fetch occupancy trend data
 * Note: For historical accuracy, implement an occupancy_snapshots table
 * that captures monthly occupancy data. For now, this uses lease data
 * to estimate historical occupancy.
 */
export async function getOccupancyTrend(months: number = 6): Promise<OccupancyTrendPoint[]> {
  try {
    const now = new Date();
    const data: OccupancyTrendPoint[] = [];

    // Get total units count
    const { data: allUnits } = await supabase
      .from('units')
      .select('id');
    const totalUnits = allUnits?.length || 0;

    if (totalUnits === 0) {
      // No units in system, return empty trend
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        data.push({ month: monthName, occupancyRate: 0 });
      }
      return data;
    }

    // Fetch all leases to calculate historical occupancy
    const { data: leases } = await supabase
      .from('leases')
      .select('id, start_date, end_date, status, unit_id');

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Count leases that were active during this month
      const occupiedUnits = new Set<string>();
      leases?.forEach(lease => {
        if (!lease.unit_id) return;
        const leaseStart = new Date(lease.start_date);
        const leaseEnd = lease.end_date ? new Date(lease.end_date) : new Date('2099-12-31');

        // Lease was active if it started before end of month and ended after start of month
        if (leaseStart <= endOfMonth && leaseEnd >= date) {
          occupiedUnits.add(lease.unit_id);
        }
      });

      const occupancyRate = (occupiedUnits.size / totalUnits) * 100;

      data.push({
        month: monthName,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching occupancy trend:', error);
    throw error;
  }
}

/**
 * Fetch property performance metrics
 */
export async function getPropertyPerformance(): Promise<PropertyPerformance[]> {
  try {
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, name');

    if (error) throw error;

    const performance: PropertyPerformance[] = [];

    for (const property of properties || []) {
      // Get units for this property
      const { data: units } = await supabase
        .from('units')
        .select('id, status')
        .eq('property_id', property.id);

      const totalUnits = units?.length || 0;
      const occupiedUnits = units?.filter(u => u.status === 'occupied').length || 0;
      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

      // Get leases for this property
      const { data: leases } = await supabase
        .from('leases')
        .select('monthly_rent')
        .eq('property_id', property.id)
        .eq('status', 'active');

      const monthlyRevenue = leases?.reduce((sum, l) => sum + (l.monthly_rent || 0), 0) || 0;

      // Calculate outstanding balance for this property
      let propertyOutstandingBalance = 0;
      try {
        const { data: propertyPayments } = await supabase
          .from('payment_history')
          .select('amount, status, late_fee, leases!inner(property_id)')
          .eq('leases.property_id', property.id)
          .in('status', ['pending', 'failed']);

        if (propertyPayments) {
          propertyOutstandingBalance = propertyPayments.reduce((sum, payment) => {
            return sum + (payment.amount || 0) + (payment.late_fee || 0);
          }, 0);
        }
      } catch (err) {
        // payment_history table might not exist yet
      }

      // Calculate maintenance costs for this property (last 30 days)
      let maintenanceCosts = 0;
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: workOrders } = await supabase
          .from('work_orders')
          .select('actual_cost')
          .eq('property_id', property.id)
          .gte('completed_date', thirtyDaysAgo.toISOString());

        if (workOrders) {
          maintenanceCosts = workOrders.reduce((sum, wo) => sum + (wo.actual_cost || 0), 0);
        }

        // Also check expenses table
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('property_id', property.id)
          .in('category', ['maintenance', 'repairs'])
          .gte('expense_date', thirtyDaysAgo.toISOString().split('T')[0]);

        if (expenses) {
          maintenanceCosts += expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        }
      } catch (err) {
        // work_orders or expenses table might not exist yet
      }

      performance.push({
        id: property.id,
        name: property.name,
        units: totalUnits,
        occupied: occupiedUnits,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        monthlyRevenue,
        outstandingBalance: Math.round(propertyOutstandingBalance * 100) / 100,
        maintenanceCosts: Math.round(maintenanceCosts * 100) / 100,
      });
    }

    return performance.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
  } catch (error) {
    console.error('Error fetching property performance:', error);
    throw error;
  }
}

/**
 * Fetch recent activities across all modules
 */
export async function getRecentActivities(limit: number = 10): Promise<ActivityItem[]> {
  try {
    const activities: ActivityItem[] = [];

    // Fetch recent tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, created_at, properties(name)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (tasks) {
      tasks.forEach(task => {
        activities.push({
          id: task.id,
          type: 'task',
          title: task.title,
          description: `Task ${task.status}`,
          timestamp: task.created_at,
          propertyName: (task.properties as any)?.name,
          status: task.status,
        });
      });
    }

    // TODO: Fetch recent payments, leases, communications when tables are available

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    throw error;
  }
}

/**
 * Fetch task summary statistics
 */
export async function getTaskSummary(): Promise<TaskSummary> {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, status, priority, due_date');

    if (error) throw error;

    const now = new Date();
    const summary: TaskSummary = {
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      byPriority: {
        high: 0,
        medium: 0,
        low: 0,
      },
    };

    tasks?.forEach(task => {
      // Count by status
      if (task.status === 'pending') summary.pending++;
      else if (task.status === 'in_progress') summary.inProgress++;
      else if (task.status === 'completed') summary.completed++;

      // Count overdue
      if (task.due_date && new Date(task.due_date) < now && 
          task.status !== 'completed' && task.status !== 'cancelled') {
        summary.overdue++;
      }

      // Count by priority
      if (task.priority === 'high') summary.byPriority.high++;
      else if (task.priority === 'medium') summary.byPriority.medium++;
      else if (task.priority === 'low') summary.byPriority.low++;
    });

    return summary;
  } catch (error) {
    console.error('Error fetching task summary:', error);
    throw error;
  }
}
