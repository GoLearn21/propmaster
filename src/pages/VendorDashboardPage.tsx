/**
 * Vendor Dashboard Page - "The Workbench"
 *
 * Titanium Precision Design System
 * Color Accent: Blue (#3B82F6)
 *
 * Features:
 * - Job cards with priority indicators
 * - Quick accept/decline actions
 * - Bento-style stat cards
 * - Practical, efficient interface
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRequireVendorAuth } from '../contexts/VendorAuthContext';
import { getAssignedWorkOrders } from '../services/vendorAuthService';
import { vendorLogger } from '../services/portalLogger';
import VendorLayout from '../layouts/VendorLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { BentoGrid, BentoItem } from '../components/dashboard/BentoGrid';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  Wrench,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  MapPin,
  ArrowRight,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Briefcase,
  Loader2,
} from 'lucide-react';

export default function VendorDashboardPage() {
  const { vendor, loading: authLoading, initialized, isDemo } = useRequireVendorAuth();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed_this_month: 0,
    urgent: 0,
  });

  useEffect(() => {
    vendorLogger.ui.componentMounted('VendorDashboardPage');
    return () => {
      vendorLogger.debug('UI_UNMOUNT', 'VendorDashboardPage unmounted');
    };
  }, []);

  useEffect(() => {
    if (vendor && initialized) {
      loadDashboardData();
    }
  }, [vendor, initialized]);

  const loadDashboardData = async () => {
    if (!vendor) return;

    vendorLogger.data.fetchStart('dashboard_data');
    vendorLogger.perf.measureStart('dashboard_load');

    try {
      setLoading(true);

      // For demo mode, use mock data
      if (isDemo) {
        vendorLogger.debug('DASHBOARD', 'Loading demo dashboard data');
        // Simulate some work orders for demo
        const mockOrders = [
          {
            id: 'demo-wo-001',
            title: 'HVAC Repair - Unit 101',
            description: 'Air conditioning not cooling properly. Tenant reports warm air.',
            status: 'assigned',
            priority: 'high',
            created_at: new Date().toISOString(),
            properties: { name: 'Sunset Apartments' },
            units: { unit_number: '101' },
          },
          {
            id: 'demo-wo-002',
            title: 'Plumbing - Kitchen Leak',
            description: 'Kitchen faucet has a slow leak.',
            status: 'in_progress',
            priority: 'medium',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            properties: { name: 'Oak Ridge Complex' },
            units: { unit_number: '205' },
          },
          {
            id: 'demo-wo-003',
            title: 'Electrical Inspection',
            description: 'Annual electrical inspection required.',
            status: 'pending',
            priority: 'low',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            properties: { name: 'Pine View Homes' },
            units: { unit_number: '12' },
          },
        ];

        setWorkOrders(mockOrders);
        setStats({
          total: 3,
          pending: 2,
          in_progress: 1,
          completed_this_month: vendor.completed_jobs_count || 25,
          urgent: 1,
        });
        setLoading(false);
        vendorLogger.data.fetchSuccess('dashboard_data', mockOrders.length);
        vendorLogger.perf.measureEnd('dashboard_load');
        return;
      }

      // Load recent work orders from database
      const orders = await getAssignedWorkOrders(vendor.id, { limit: 10 });
      setWorkOrders(orders);

      // Calculate stats
      const pending = orders.filter((o) => o.status === 'pending' || o.status === 'assigned')
        .length;
      const inProgress = orders.filter((o) => o.status === 'in_progress').length;
      const urgent = orders.filter((o) => o.priority === 'urgent' || o.priority === 'high')
        .length;

      setStats({
        total: vendor.active_jobs_count || 0,
        pending,
        in_progress: inProgress,
        completed_this_month: vendor.completed_jobs_count || 0,
        urgent,
      });

      vendorLogger.data.fetchSuccess('dashboard_data', orders.length);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      vendorLogger.data.fetchError('dashboard_data', err);
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      vendorLogger.perf.measureEnd('dashboard_load');
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
      pending: { variant: 'warning', label: 'Pending' },
      assigned: { variant: 'info', label: 'Assigned' },
      in_progress: { variant: 'info', label: 'In Progress' },
      completed: { variant: 'success', label: 'Completed' },
      cancelled: { variant: 'error', label: 'Cancelled' },
    };
    return configs[status] || { variant: 'default' as const, label: status };
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { color: string; bgColor: string; label: string }> = {
      low: { color: 'text-text-tertiary', bgColor: 'bg-neutral-100', label: 'Low' },
      medium: { color: 'text-status-warning', bgColor: 'bg-status-warning/10', label: 'Medium' },
      high: { color: 'text-status-error', bgColor: 'bg-status-error/10', label: 'High' },
      urgent: { color: 'text-status-error', bgColor: 'bg-status-error/10', label: 'Urgent' },
    };
    return configs[priority] || configs.medium;
  };

  // Show loading screen while auth is initializing
  if (!initialized || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Loading dashboard...</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Please wait</p>
        </div>
      </div>
    );
  }

  // If no vendor after initialization, something went wrong
  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Unable to load dashboard</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Please try logging in again</p>
          <Link to="/vendor/login" className="mt-4 inline-block">
            <Button variant="primary">Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <VendorLayout>
      <div className="space-y-6 p-6 lg:p-8">
        {/* Demo Mode Banner */}
        {isDemo && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Demo Mode Active</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">You're viewing sample data. Some features may be limited.</p>
            </div>
          </div>
        )}

        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Welcome back, {vendor?.first_name}!
            </h1>
            <p className="text-text-secondary mt-1">
              Here's an overview of your current work assignments
            </p>
          </div>
          <Link to="/vendor/jobs">
            <Button variant="primary" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
              View All Jobs
            </Button>
          </Link>
        </div>

        {/* Stats Grid - Bento Style */}
        <BentoGrid columns={4} gap="md">
          {/* Active Jobs - Large Card */}
          <BentoItem colSpan={2} variant="gradient" className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Active Jobs</p>
                <p className="text-4xl font-bold text-text-primary mt-2 font-tabular">
                  {stats.total}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="info" dot size="sm">
                    {stats.pending} pending
                  </Badge>
                  <Badge variant="success" dot size="sm">
                    {stats.in_progress} in progress
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-status-info/10">
                <Briefcase className="h-6 w-6 text-status-info" />
              </div>
            </div>
            {/* Decorative background */}
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-status-info/5" />
          </BentoItem>

          {/* Pending */}
          <BentoItem variant="gradient">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium text-text-secondary">Pending Review</p>
              <div className="p-2 rounded-lg bg-status-warning/10">
                <Timer className="h-5 w-5 text-status-warning" />
              </div>
            </div>
            <p className="text-3xl font-bold text-text-primary font-tabular">
              {stats.pending}
            </p>
            <p className="text-xs text-text-tertiary mt-2">Awaiting your response</p>
          </BentoItem>

          {/* Completed This Month */}
          <BentoItem variant="gradient">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium text-text-secondary">Completed</p>
              <div className="p-2 rounded-lg bg-status-success/10">
                <CheckCircle2 className="h-5 w-5 text-status-success" />
              </div>
            </div>
            <p className="text-3xl font-bold text-text-primary font-tabular">
              {stats.completed_this_month}
            </p>
            <p className="text-xs text-text-tertiary mt-2">This month</p>
          </BentoItem>
        </BentoGrid>

        {/* Urgent Jobs Alert */}
        {stats.urgent > 0 && (
          <Card variant="default" padding="md" className="border-status-error/30 bg-status-error/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-xl bg-status-error/10 flex items-center justify-center mr-4">
                  <Zap className="h-5 w-5 text-status-error" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">
                    {stats.urgent} Urgent Job{stats.urgent > 1 ? 's' : ''} Requiring Attention
                  </p>
                  <p className="text-sm text-text-secondary">
                    High priority work orders need immediate response
                  </p>
                </div>
              </div>
              <Link to="/vendor/jobs?priority=urgent">
                <Button variant="outline" size="sm" className="border-status-error text-status-error hover:bg-status-error/10">
                  View Urgent
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Recent Work Orders */}
        <Card variant="elevated" padding="none" className="overflow-hidden">
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Recent Work Orders</h2>
                <p className="text-sm text-text-tertiary mt-0.5">Your latest assigned jobs</p>
              </div>
              <Link to="/vendor/jobs">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  View All
                </Button>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="h-10 w-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse mx-auto mb-3" />
              <p className="text-text-secondary">Loading work orders...</p>
            </div>
          ) : workOrders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-14 w-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                <Wrench className="h-7 w-7 text-text-muted" />
              </div>
              <p className="text-text-secondary font-medium">No work orders assigned yet</p>
              <p className="text-sm text-text-tertiary mt-1">
                New jobs will appear here when assigned to you
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {workOrders.slice(0, 5).map((order) => {
                const priorityConfig = getPriorityConfig(order.priority);
                const statusConfig = getStatusConfig(order.status);

                return (
                  <Link
                    key={order.id}
                    to={`/vendor/jobs/${order.id}`}
                    className={cn(
                      'block p-5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
                      'transition-colors duration-200'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold text-text-primary truncate">
                            {order.title}
                          </h3>
                          {(order.priority === 'urgent' || order.priority === 'high') && (
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                              priorityConfig.bgColor,
                              priorityConfig.color
                            )}>
                              {order.priority === 'urgent' && <Zap className="h-3 w-3" />}
                              {priorityConfig.label}
                            </span>
                          )}
                          <Badge variant={statusConfig.variant} dot size="sm">
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-2 mb-3">
                          {order.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-text-tertiary">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate max-w-[150px]">
                              {order.properties?.name || 'Unknown Property'}
                            </span>
                          </div>
                          {order.units?.unit_number && (
                            <span className="text-text-tertiary">
                              Unit {order.units.unit_number}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-text-muted flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        {/* Quick Actions - Bento Grid */}
        <BentoItem variant="default" className="border border-neutral-200 dark:border-neutral-700">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Quick Actions</h2>
            <p className="text-sm text-text-tertiary mt-0.5">Common tasks at your fingertips</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: ClipboardList, label: 'All Jobs', href: '/vendor/jobs', color: 'text-status-info' },
              { icon: Clock, label: 'Pending', href: '/vendor/work-orders?status=pending', color: 'text-status-warning' },
              { icon: DollarSign, label: 'Payments', href: '/vendor/payments', color: 'text-accent-green' },
              { icon: Wrench, label: 'Profile', href: '/vendor/profile', color: 'text-primary' },
            ].map((action) => (
              <Link
                key={action.href}
                to={action.href}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl',
                  'bg-neutral-50 dark:bg-neutral-800',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-700',
                  'transition-all duration-200 hover:-translate-y-0.5',
                  'group'
                )}
              >
                <div className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center',
                  'bg-white dark:bg-neutral-900',
                  'shadow-sm group-hover:shadow-md',
                  'transition-all duration-200'
                )}>
                  <action.icon className={cn('h-5 w-5', action.color)} />
                </div>
                <span className="text-sm font-medium text-text-secondary text-center">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </BentoItem>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="default" padding="md" hoverable>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-status-success/10">
                <TrendingUp className="h-5 w-5 text-status-success" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Completion Rate</p>
                <p className="text-lg font-bold text-text-primary font-tabular">
                  {stats.total > 0
                    ? Math.round((stats.completed_this_month / (stats.total + stats.completed_this_month)) * 100)
                    : 100}%
                </p>
              </div>
            </div>
          </Card>

          <Card variant="default" padding="md" hoverable>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-status-info/10">
                <Clock className="h-5 w-5 text-status-info" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary">Avg. Response Time</p>
                <p className="text-lg font-bold text-text-primary">2.4 hrs</p>
              </div>
            </div>
          </Card>

          <Card variant="default" padding="md" hoverable>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent-green/10">
                <DollarSign className="h-5 w-5 text-accent-green" />
              </div>
              <div>
                <p className="text-xs text-text-tertiary">This Month Earnings</p>
                <p className="text-lg font-bold text-text-primary font-tabular">
                  ${((stats.completed_this_month || 0) * 150).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </VendorLayout>
  );
}
