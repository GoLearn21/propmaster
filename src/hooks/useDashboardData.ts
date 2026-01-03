/**
 * React Query hooks for dashboard data
 *
 * Performance features:
 * - Automatic caching with staleTime
 * - Background refetching
 * - Request deduplication
 * - Optimistic updates ready
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAllDashboardDataOptimized,
  getDashboardStatsOptimized,
  getRevenueTrendOptimized,
  getOccupancyTrendOptimized,
  getPropertyPerformanceOptimized,
  getRecentActivitiesOptimized,
  getTaskSummaryOptimized,
  getWorkflowCountsOptimized,
  clearDashboardCache,
  DashboardStats,
  RevenueDataPoint,
  OccupancyTrendPoint,
  PropertyPerformance,
  ActivityItem,
  TaskSummary,
  WorkflowCounts,
} from '../services/dashboardServiceOptimized';

// Query keys for cache management
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  revenueTrend: (months: number) => [...dashboardKeys.all, 'revenueTrend', months] as const,
  occupancyTrend: (months: number) => [...dashboardKeys.all, 'occupancyTrend', months] as const,
  propertyPerformance: () => [...dashboardKeys.all, 'propertyPerformance'] as const,
  recentActivities: (limit: number) => [...dashboardKeys.all, 'recentActivities', limit] as const,
  taskSummary: () => [...dashboardKeys.all, 'taskSummary'] as const,
  workflowCounts: () => [...dashboardKeys.all, 'workflowCounts'] as const,
  allData: () => [...dashboardKeys.all, 'allData'] as const,
};

// Cache configuration - optimized for dashboard use case
const CACHE_CONFIG = {
  // Data is fresh for 30 seconds (matches server-side cache)
  staleTime: 30 * 1000,
  // Cache for 5 minutes in background
  gcTime: 5 * 60 * 1000,
  // Refetch on window focus for real-time feel
  refetchOnWindowFocus: true,
  // Don't refetch on mount if data is fresh
  refetchOnMount: false,
  // Retry once on failure
  retry: 1,
};

/**
 * Hook to fetch ALL dashboard data in a single optimized call
 * This is the primary hook for initial dashboard load
 */
export function useAllDashboardData() {
  return useQuery({
    queryKey: dashboardKeys.allData(),
    queryFn: getAllDashboardDataOptimized,
    ...CACHE_CONFIG,
    // Placeholder data for faster initial render
    placeholderData: {
      stats: {
        totalProperties: 0,
        totalUnits: 0,
        occupancyRate: 0,
        activeLeases: 0,
        monthlyRevenue: 0,
        outstandingBalance: 0,
        activeTasks: 0,
        overdueTasksCount: 0,
        maintenanceRequests: 0,
        totalTenants: 0,
      },
      revenueTrend: [],
      occupancyTrend: [],
      propertyPerformance: [],
      recentActivities: [],
      taskSummary: {
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        byPriority: { high: 0, medium: 0, low: 0 },
      },
    },
  });
}

/**
 * Hook for dashboard stats only
 */
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: dashboardKeys.stats(),
    queryFn: getDashboardStatsOptimized,
    ...CACHE_CONFIG,
  });
}

/**
 * Hook for revenue trend data
 */
export function useRevenueTrend(months: number = 6) {
  return useQuery<RevenueDataPoint[]>({
    queryKey: dashboardKeys.revenueTrend(months),
    queryFn: () => getRevenueTrendOptimized(months),
    ...CACHE_CONFIG,
  });
}

/**
 * Hook for occupancy trend data
 */
export function useOccupancyTrend(months: number = 6) {
  return useQuery<OccupancyTrendPoint[]>({
    queryKey: dashboardKeys.occupancyTrend(months),
    queryFn: () => getOccupancyTrendOptimized(months),
    ...CACHE_CONFIG,
  });
}

/**
 * Hook for property performance data
 */
export function usePropertyPerformance() {
  return useQuery<PropertyPerformance[]>({
    queryKey: dashboardKeys.propertyPerformance(),
    queryFn: getPropertyPerformanceOptimized,
    ...CACHE_CONFIG,
  });
}

/**
 * Hook for recent activities
 */
export function useRecentActivities(limit: number = 10) {
  return useQuery<ActivityItem[]>({
    queryKey: dashboardKeys.recentActivities(limit),
    queryFn: () => getRecentActivitiesOptimized(limit),
    ...CACHE_CONFIG,
  });
}

/**
 * Hook for task summary
 */
export function useTaskSummary() {
  return useQuery<TaskSummary>({
    queryKey: dashboardKeys.taskSummary(),
    queryFn: getTaskSummaryOptimized,
    ...CACHE_CONFIG,
  });
}

/**
 * Hook for workflow counts
 */
export function useWorkflowCounts() {
  return useQuery<WorkflowCounts>({
    queryKey: dashboardKeys.workflowCounts(),
    queryFn: getWorkflowCountsOptimized,
    ...CACHE_CONFIG,
  });
}

/**
 * Hook to invalidate all dashboard caches
 * Call this after mutations that affect dashboard data
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return () => {
    // Clear server-side cache
    clearDashboardCache();
    // Invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };
}

/**
 * Prefetch dashboard data
 * Call this on route hover for instant navigation
 */
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: dashboardKeys.allData(),
      queryFn: getAllDashboardDataOptimized,
      staleTime: CACHE_CONFIG.staleTime,
    });
  };
}
