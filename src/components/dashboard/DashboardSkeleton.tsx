/**
 * Dashboard Skeleton Loading Components
 *
 * Provides smooth perceived performance during data loading.
 * Uses CSS animations for minimal JS overhead.
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '../ui';

// Base skeleton animation class
const skeletonClass = 'animate-pulse bg-neutral-100 rounded';

/**
 * Skeleton for stat cards
 */
export const StatCardSkeleton: React.FC = () => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1">
          <div className={`h-4 w-24 ${skeletonClass}`} />
          <div className={`h-8 w-16 ${skeletonClass}`} />
          <div className={`h-3 w-32 ${skeletonClass}`} />
        </div>
        <div className={`h-12 w-12 rounded-lg ${skeletonClass}`} />
      </div>
    </CardContent>
  </Card>
);

/**
 * Skeleton for secondary stat cards (smaller)
 */
export const SecondaryStatSkeleton: React.FC = () => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className={`h-3 w-20 ${skeletonClass}`} />
          <div className={`h-6 w-12 ${skeletonClass}`} />
          <div className={`h-2 w-24 ${skeletonClass}`} />
        </div>
        <div className={`h-10 w-10 rounded-lg ${skeletonClass}`} />
      </div>
    </CardContent>
  </Card>
);

/**
 * Skeleton for chart components
 */
export const ChartSkeleton: React.FC<{ title?: string; description?: string }> = ({
  title = 'Loading...',
  description = 'Please wait'
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className={`h-5 w-32 ${skeletonClass}`} />
          <div className={`h-3 w-48 ${skeletonClass}`} />
        </div>
        <div className="flex items-center gap-4">
          <div className="space-y-1 text-right">
            <div className={`h-2 w-16 ${skeletonClass} ml-auto`} />
            <div className={`h-4 w-12 ${skeletonClass} ml-auto`} />
          </div>
          <div className={`h-10 w-10 rounded-lg ${skeletonClass}`} />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="h-[300px] flex items-center justify-center">
        <div className="w-full h-full relative">
          {/* Chart area skeleton */}
          <div className={`absolute inset-0 ${skeletonClass} opacity-50`} />
          {/* Animated bars for visual interest */}
          <div className="absolute bottom-8 left-8 right-8 flex items-end justify-around gap-2 h-48">
            {[0.6, 0.8, 0.5, 0.9, 0.7, 0.85].map((height, i) => (
              <div
                key={i}
                className={`w-full ${skeletonClass}`}
                style={{
                  height: `${height * 100}%`,
                  animationDelay: `${i * 100}ms`
                }}
              />
            ))}
          </div>
        </div>
      </div>
      {/* Footer stats skeleton */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-neutral-light">
        {[1, 2, 3].map(i => (
          <div key={i} className="text-center space-y-2">
            <div className={`h-2 w-16 mx-auto ${skeletonClass}`} />
            <div className={`h-5 w-20 mx-auto ${skeletonClass}`} />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/**
 * Skeleton for task summary widget
 */
export const TaskSummarySkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className={`h-5 w-24 ${skeletonClass}`} />
          <div className={`h-3 w-40 ${skeletonClass}`} />
        </div>
        <div className={`h-8 w-20 rounded ${skeletonClass}`} />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-4 w-4 rounded ${skeletonClass}`} />
              <div className={`h-4 w-20 ${skeletonClass}`} />
            </div>
            <div className={`h-6 w-8 rounded-full ${skeletonClass}`} />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/**
 * Skeleton for activity feed
 */
export const ActivityFeedSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="space-y-2">
        <div className={`h-5 w-32 ${skeletonClass}`} />
        <div className={`h-3 w-48 ${skeletonClass}`} />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-start gap-3 pb-4 border-b border-neutral-light last:border-0">
            <div className={`h-8 w-8 rounded-full ${skeletonClass}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 w-3/4 ${skeletonClass}`} />
              <div className={`h-3 w-1/2 ${skeletonClass}`} />
              <div className={`h-2 w-20 ${skeletonClass}`} />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/**
 * Skeleton for property performance table
 */
export const PropertyTableSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="space-y-2">
        <div className={`h-5 w-40 ${skeletonClass}`} />
        <div className={`h-3 w-56 ${skeletonClass}`} />
      </div>
    </CardHeader>
    <CardContent>
      {/* Table header */}
      <div className="grid grid-cols-6 gap-4 pb-3 border-b border-neutral-light mb-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className={`h-3 w-full ${skeletonClass}`} />
        ))}
      </div>
      {/* Table rows */}
      {[1, 2, 3, 4, 5].map(row => (
        <div key={row} className="grid grid-cols-6 gap-4 py-3 border-b border-neutral-50">
          {[1, 2, 3, 4, 5, 6].map(col => (
            <div key={col} className={`h-4 w-full ${skeletonClass}`} />
          ))}
        </div>
      ))}
    </CardContent>
  </Card>
);

/**
 * Skeleton for workflow cards
 */
export const WorkflowCardsSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <Card key={i}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className={`h-10 w-10 rounded-full ${skeletonClass}`} />
            <div className={`h-4 w-20 ${skeletonClass}`} />
            <div className={`h-6 w-8 ${skeletonClass}`} />
            <div className={`h-8 w-full rounded ${skeletonClass}`} />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/**
 * Full dashboard skeleton
 */
export const DashboardSkeleton: React.FC = () => (
  <div className="p-8 space-y-6">
    {/* Header skeleton */}
    <div className="space-y-2">
      <div className={`h-6 w-48 ${skeletonClass}`} />
    </div>
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className={`h-8 w-64 ${skeletonClass}`} />
        <div className={`h-4 w-96 ${skeletonClass}`} />
      </div>
      <div className="flex gap-3">
        <div className={`h-10 w-24 rounded ${skeletonClass}`} />
        <div className={`h-10 w-28 rounded ${skeletonClass}`} />
      </div>
    </div>

    {/* Key stats grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
    </div>

    {/* Secondary stats */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => <SecondaryStatSkeleton key={i} />)}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>

    {/* Task summary and activity */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <TaskSummarySkeleton />
      <ActivityFeedSkeleton />
    </div>

    {/* Workflow cards */}
    <WorkflowCardsSkeleton />

    {/* Property table */}
    <PropertyTableSkeleton />
  </div>
);

export default DashboardSkeleton;
