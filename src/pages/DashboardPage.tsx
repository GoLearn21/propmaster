/**
 * Dashboard Page - Titanium Precision Design System
 *
 * Features:
 * - Bento grid layout with asymmetric cards
 * - Sparkline trend indicators
 * - New metric cards with spring physics
 * - React Query for caching and deduplication
 * - Lazy loading for heavy chart components
 */

import React, { Suspense, memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  Button,
  Breadcrumb,
} from '../components/ui';
import {
  Building2,
  Users,
  DollarSign,
  Wrench,
  TrendingUp,
  TrendingDown,
  Home,
  Calendar,
  FileText,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';

// New Titanium Precision components
import {
  BentoGrid,
  BentoItem,
  BentoHeader,
  BentoMetric,
  BentoProgress,
} from '../components/dashboard/BentoGrid';
import { Sparkline, TrendIndicator } from '../components/dashboard/Sparkline';
import { MetricCard } from '../components/ui/Card';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { CommandPalette } from '../components/CommandPalette';

// React Query hooks
import { useAllDashboardData, useInvalidateDashboard } from '../hooks/useDashboardData';

// Skeleton components for loading states
import {
  ChartSkeleton,
  TaskSummarySkeleton,
  ActivityFeedSkeleton,
  PropertyTableSkeleton,
  WorkflowCardsSkeleton,
} from '../components/dashboard/DashboardSkeleton';
import { SkeletonMetricCard, SkeletonBentoGrid } from '../components/ui/Skeleton';

// Lazy load heavy chart components
const RevenueChart = React.lazy(() =>
  import('../components/dashboard/RevenueChart').then(module => ({
    default: module.RevenueChart
  }))
);

const OccupancyChart = React.lazy(() =>
  import('../components/dashboard/OccupancyChart').then(module => ({
    default: module.OccupancyChart
  }))
);

const TaskSummaryWidget = React.lazy(() =>
  import('../components/dashboard/TaskSummaryWidget').then(module => ({
    default: module.TaskSummaryWidget
  }))
);

const RecentActivityFeed = React.lazy(() =>
  import('../components/dashboard/RecentActivityFeed').then(module => ({
    default: module.RecentActivityFeed
  }))
);

const PropertyPerformanceTable = React.lazy(() =>
  import('../components/dashboard/PropertyPerformanceTable').then(module => ({
    default: module.PropertyPerformanceTable
  }))
);

const WorkflowCards = React.lazy(() =>
  import('../components/dashboard/WorkflowCards').then(module => ({
    default: module.WorkflowCards
  }))
);

// Types
import type { DashboardStats } from '../services/dashboardServiceOptimized';
import { cn } from '@/lib/utils';

// Hero Metrics - Bento style
const HeroMetrics = memo<{ stats: DashboardStats | undefined; isLoading: boolean }>(({ stats, isLoading }) => {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonMetricCard key={i} />)}
      </div>
    );
  }

  // Mock sparkline data (in production, this would come from the API)
  const revenueData = [95000, 102000, 98000, 115000, 108000, 122000, stats.monthlyRevenue];
  const occupancyData = [89, 91, 88, 93, 92, 94, stats.occupancyRate];

  return (
    <BentoGrid columns={4} gap="md">
      {/* Revenue - Large card spanning 2 columns */}
      <BentoItem colSpan={2} variant="gradient" className="relative overflow-hidden">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-text-secondary">Monthly Revenue</p>
            <p className="text-4xl font-bold text-text-primary mt-2 font-tabular">
              ${stats.monthlyRevenue.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="success" dot size="sm">
                <TrendingUp className="h-3 w-3 mr-1" />
                +5.2%
              </Badge>
              <span className="text-sm text-text-tertiary">vs last month</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-accent-green/10">
            <DollarSign className="h-6 w-6 text-accent-green" />
          </div>
        </div>
        <Sparkline
          data={revenueData}
          variant="area"
          color="success"
          width={300}
          height={60}
          className="absolute bottom-0 left-0 right-0 opacity-50"
        />
      </BentoItem>

      {/* Occupancy Rate */}
      <BentoItem variant="gradient">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-text-secondary">Occupancy Rate</p>
          <div className="p-2 rounded-lg bg-status-success/10">
            <Home className="h-5 w-5 text-status-success" />
          </div>
        </div>
        <p className="text-3xl font-bold text-text-primary font-tabular">
          {stats.occupancyRate.toFixed(1)}%
        </p>
        <TrendIndicator data={occupancyData} className="mt-3" />
      </BentoItem>

      {/* Active Tasks */}
      <BentoItem variant="gradient">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-text-secondary">Active Tasks</p>
          <div className="p-2 rounded-lg bg-status-warning/10">
            <Wrench className="h-5 w-5 text-status-warning" />
          </div>
        </div>
        <p className="text-3xl font-bold text-text-primary font-tabular">
          {stats.activeTasks}
        </p>
        {stats.overdueTasksCount > 0 && (
          <Badge variant="error" dot size="sm" className="mt-3">
            {stats.overdueTasksCount} overdue
          </Badge>
        )}
        {stats.overdueTasksCount === 0 && (
          <Badge variant="success" size="sm" className="mt-3">
            All on track
          </Badge>
        )}
      </BentoItem>
    </BentoGrid>
  );
});

HeroMetrics.displayName = 'HeroMetrics';

// Secondary Stats Row
const SecondaryMetrics = memo<{ stats: DashboardStats | undefined; isLoading: boolean }>(({ stats, isLoading }) => {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} variant="default" padding="md">
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-20 bg-neutral-200 rounded" />
              <div className="h-8 w-16 bg-neutral-200 rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card variant="default" padding="md" hoverable>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Properties</p>
            <p className="text-lg font-bold text-text-primary font-tabular">{stats.totalProperties}</p>
          </div>
        </div>
      </Card>

      <Card variant="default" padding="md" hoverable>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-status-info/10">
            <Home className="h-4 w-4 text-status-info" />
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Total Units</p>
            <p className="text-lg font-bold text-text-primary font-tabular">{stats.totalUnits}</p>
          </div>
        </div>
      </Card>

      <Card variant="default" padding="md" hoverable>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-pink/10">
            <Users className="h-4 w-4 text-accent-pink" />
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Tenants</p>
            <p className="text-lg font-bold text-text-primary font-tabular">{stats.totalTenants}</p>
          </div>
        </div>
      </Card>

      <Card variant="default" padding="md" hoverable>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-status-error/10">
            <DollarSign className="h-4 w-4 text-status-error" />
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Outstanding</p>
            <p className="text-lg font-bold text-text-primary font-tabular">
              ${stats.outstandingBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
});

SecondaryMetrics.displayName = 'SecondaryMetrics';

// Quick Actions - Bento style
const QuickActions = memo(() => (
  <BentoItem variant="default" className="border border-neutral-200">
    <BentoHeader title="Quick Actions" description="Common tasks at your fingertips" />
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {[
        { icon: Building2, label: 'Add Property', href: '/properties/new', color: 'text-primary' },
        { icon: Users, label: 'Add Tenant', href: '/people', color: 'text-accent-pink' },
        { icon: DollarSign, label: 'Record Payment', href: '/accounting', color: 'text-accent-green' },
        { icon: Wrench, label: 'Create Task', href: '/tasks-maintenance', color: 'text-status-warning' },
        { icon: Calendar, label: 'Calendar', href: '/calendar', color: 'text-status-info' },
        { icon: FileText, label: 'Reports', href: '/reports', color: 'text-text-secondary' },
      ].map((action) => (
        <Link
          key={action.href}
          to={action.href}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-xl',
            'bg-neutral-50 hover:bg-neutral-100',
            'transition-all duration-200 hover:-translate-y-0.5',
            'dark:bg-neutral-800 dark:hover:bg-neutral-700'
          )}
        >
          <action.icon className={cn('h-5 w-5', action.color)} />
          <span className="text-xs font-medium text-text-secondary text-center">{action.label}</span>
        </Link>
      ))}
    </div>
  </BentoItem>
));

QuickActions.displayName = 'QuickActions';

const DashboardPage: React.FC = () => {
  // Use React Query for all dashboard data
  const { data, isLoading, isFetching, refetch } = useAllDashboardData();
  const invalidateDashboard = useInvalidateDashboard();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const handleRefresh = useCallback(() => {
    toast.success('Refreshing dashboard data...');
    invalidateDashboard();
    refetch();
  }, [invalidateDashboard, refetch]);

  return (
    <>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: 'Dashboard' }]} />

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Dashboard Overview</h1>
            <p className="text-text-secondary mt-1">
              Welcome back! Here's your portfolio at a glance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />}
              onClick={handleRefresh}
              disabled={isFetching}
            >
              Refresh
            </Button>
            <Link to="/reports">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>
                View Reports
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setCommandPaletteOpen(true)}
            >
              Create
            </Button>
          </div>
        </div>

        {/* Hero Metrics - Bento Grid */}
        <HeroMetrics stats={data?.stats} isLoading={isLoading} />

        {/* Secondary Stats Row */}
        <SecondaryMetrics stats={data?.stats} isLoading={isLoading} />

        {/* Charts Row - Lazy loaded */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<ChartSkeleton />}>
            <Card variant="elevated" padding="md">
              <RevenueChart data={data?.revenueTrend || []} loading={isLoading} />
            </Card>
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <Card variant="elevated" padding="md">
              <OccupancyChart
                data={data?.occupancyTrend || []}
                currentRate={data?.stats?.occupancyRate || 0}
                loading={isLoading}
              />
            </Card>
          </Suspense>
        </div>

        {/* Task Summary and Activity - Lazy loaded */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<TaskSummarySkeleton />}>
            {data?.taskSummary && (
              <TaskSummaryWidget summary={data.taskSummary} loading={isLoading} />
            )}
          </Suspense>
          <Suspense fallback={<ActivityFeedSkeleton />}>
            <RecentActivityFeed activities={data?.recentActivities || []} loading={isLoading} />
          </Suspense>
        </div>

        {/* Workflow Cards - Lazy loaded */}
        <Suspense fallback={<WorkflowCardsSkeleton />}>
          <WorkflowCards />
        </Suspense>

        {/* Property Performance Table - Lazy loaded */}
        <Suspense fallback={<PropertyTableSkeleton />}>
          <PropertyPerformanceTable properties={data?.propertyPerformance || []} loading={isLoading} />
        </Suspense>

        {/* Quick Actions */}
        <QuickActions />
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
};

export default DashboardPage;
