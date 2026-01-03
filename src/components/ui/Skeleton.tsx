import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Skeleton Component - Titanium Precision Design System
 *
 * Features:
 * - Shimmer animation for loading states
 * - Multiple preset shapes (text, avatar, card, etc.)
 * - Configurable sizes and animations
 * - Dark mode support
 */

const skeletonVariants = cva(
  [
    'relative overflow-hidden',
    'bg-neutral-200',
    'dark:bg-neutral-700',
    'rounded',
    // Shimmer effect
    'before:absolute before:inset-0',
    'before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent',
    'before:animate-shimmer',
    'dark:before:via-white/10',
  ].join(' '),
  {
    variants: {
      variant: {
        default: '',
        // No shimmer - static loading state
        static: 'before:hidden',
        // Pulse animation instead of shimmer
        pulse: 'before:hidden animate-pulse',
      },
      shape: {
        default: 'rounded',
        circle: 'rounded-full',
        pill: 'rounded-full',
        square: 'rounded-none',
        card: 'rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      shape: 'default',
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, shape, width, height, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, shape }), className)}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          ...style,
        }}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

/**
 * SkeletonText - Skeleton for text lines
 */
interface SkeletonTextProps extends SkeletonProps {
  /** Number of lines to render */
  lines?: number;
  /** Width of the last line (percentage) */
  lastLineWidth?: string;
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ className, lines = 1, lastLineWidth = '70%', ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            height={14}
            style={{
              width: i === lines - 1 && lines > 1 ? lastLineWidth : '100%',
            }}
            {...props}
          />
        ))}
      </div>
    );
  }
);

SkeletonText.displayName = 'SkeletonText';

/**
 * SkeletonAvatar - Skeleton for avatar/profile images
 */
interface SkeletonAvatarProps extends Omit<SkeletonProps, 'shape'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const avatarSizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

const SkeletonAvatar = React.forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  ({ className, size = 'md', ...props }, ref) => {
    const dimension = avatarSizes[size];
    return (
      <Skeleton
        ref={ref}
        shape="circle"
        width={dimension}
        height={dimension}
        className={className}
        {...props}
      />
    );
  }
);

SkeletonAvatar.displayName = 'SkeletonAvatar';

/**
 * SkeletonCard - Skeleton for card layouts
 */
interface SkeletonCardProps extends Omit<SkeletonProps, 'shape'> {
  /** Show header with avatar */
  showHeader?: boolean;
  /** Number of text lines in body */
  bodyLines?: number;
  /** Show footer/action area */
  showFooter?: boolean;
}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  (
    { className, showHeader = true, bodyLines = 3, showFooter = false, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'p-4 bg-white rounded-xl border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700',
          className
        )}
        {...props}
      >
        {showHeader && (
          <div className="flex items-center gap-3 mb-4">
            <SkeletonAvatar size="md" />
            <div className="flex-1 space-y-2">
              <Skeleton height={14} width="60%" />
              <Skeleton height={12} width="40%" />
            </div>
          </div>
        )}
        <div className="space-y-2">
          {Array.from({ length: bodyLines }).map((_, i) => (
            <Skeleton
              key={i}
              height={14}
              width={i === bodyLines - 1 ? '70%' : '100%'}
            />
          ))}
        </div>
        {showFooter && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Skeleton height={32} width={100} shape="pill" />
            <Skeleton height={32} width={100} shape="pill" />
          </div>
        )}
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';

/**
 * SkeletonTable - Skeleton for table rows
 */
interface SkeletonTableProps extends SkeletonProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Show header row */
  showHeader?: boolean;
}

const SkeletonTable = React.forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ className, rows = 5, columns = 4, showHeader = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-xl border border-neutral-200 overflow-hidden dark:bg-neutral-800 dark:border-neutral-700',
          className
        )}
        {...props}
      >
        {showHeader && (
          <div className="flex items-center gap-4 p-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} height={12} className="flex-1" />
            ))}
          </div>
        )}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-4 p-4 border-b border-neutral-100 dark:border-neutral-700 last:border-0"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                height={14}
                className="flex-1"
                style={{
                  width: colIndex === 0 ? '40%' : '100%',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
);

SkeletonTable.displayName = 'SkeletonTable';

/**
 * SkeletonMetricCard - Skeleton for dashboard metric cards
 */
const SkeletonMetricCard = React.forwardRef<
  HTMLDivElement,
  Omit<SkeletonProps, 'shape'>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'p-6 bg-gradient-to-br from-white to-neutral-50 rounded-2xl shadow-md border border-neutral-100',
        'dark:from-neutral-800 dark:to-neutral-900 dark:border-neutral-700',
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton height={14} width="50%" />
          <Skeleton height={28} width="70%" />
          <Skeleton height={12} width="40%" />
        </div>
        <Skeleton height={40} width={40} shape="card" />
      </div>
      <div className="mt-4">
        <Skeleton height={48} width="100%" shape="card" />
      </div>
    </div>
  );
});

SkeletonMetricCard.displayName = 'SkeletonMetricCard';

/**
 * SkeletonBentoGrid - Skeleton for bento grid layouts
 */
interface SkeletonBentoGridProps extends SkeletonProps {
  /** Number of cards */
  cards?: number;
}

const SkeletonBentoGrid = React.forwardRef<HTMLDivElement, SkeletonBentoGridProps>(
  ({ className, cards = 4, ...props }, ref) => {
    // Create varied sizes for bento effect
    const gridItems = Array.from({ length: cards }).map((_, i) => ({
      colSpan: i === 0 ? 2 : 1,
      rowSpan: i === 1 ? 2 : 1,
    }));

    return (
      <div
        ref={ref}
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
          className
        )}
        {...props}
      >
        {gridItems.map((item, i) => (
          <div
            key={i}
            className={cn(
              'p-6 bg-gradient-to-br from-white to-neutral-50 rounded-2xl shadow-md',
              'dark:from-neutral-800 dark:to-neutral-900',
              item.colSpan === 2 && 'md:col-span-2',
              item.rowSpan === 2 && 'md:row-span-2'
            )}
          >
            <div className="space-y-4">
              <Skeleton height={20} width="60%" />
              <Skeleton height={36} width="80%" />
              {item.rowSpan === 2 && (
                <>
                  <Skeleton height={100} width="100%" shape="card" />
                  <SkeletonText lines={2} />
                </>
              )}
              {item.colSpan === 2 && (
                <Skeleton height={120} width="100%" shape="card" />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
);

SkeletonBentoGrid.displayName = 'SkeletonBentoGrid';

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  SkeletonMetricCard,
  SkeletonBentoGrid,
  skeletonVariants,
};
