import React from 'react';
import { cn } from '@/lib/utils';

/**
 * BentoGrid Component - Titanium Precision Design System
 *
 * Features:
 * - Apple-style asymmetric grid layouts
 * - Responsive column configurations
 * - Support for spanning cells
 * - Smooth animations on load
 */

interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns on large screens */
  columns?: 2 | 3 | 4;
  /** Gap between grid items */
  gap?: 'sm' | 'md' | 'lg';
}

const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

const columnClasses = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

const BentoGrid = React.forwardRef<HTMLDivElement, BentoGridProps>(
  ({ className, columns = 3, gap = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'grid grid-cols-1 md:grid-cols-2',
          columnClasses[columns],
          gapClasses[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

BentoGrid.displayName = 'BentoGrid';

/**
 * BentoItem - Individual grid item with spanning support
 */
interface BentoItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Span multiple columns */
  colSpan?: 1 | 2 | 3 | 'full';
  /** Span multiple rows */
  rowSpan?: 1 | 2;
  /** Card variant */
  variant?: 'default' | 'elevated' | 'gradient' | 'glass';
  /** Enable hover animation */
  hoverable?: boolean;
}

const BentoItem = React.forwardRef<HTMLDivElement, BentoItemProps>(
  (
    {
      className,
      colSpan = 1,
      rowSpan = 1,
      variant = 'default',
      hoverable = true,
      children,
      ...props
    },
    ref
  ) => {
    const colSpanClasses = {
      1: '',
      2: 'md:col-span-2',
      3: 'md:col-span-2 lg:col-span-3',
      full: 'col-span-full',
    };

    const rowSpanClasses = {
      1: '',
      2: 'row-span-2',
    };

    const variantClasses = {
      default: 'bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700',
      elevated: 'bg-white shadow-md dark:bg-neutral-800',
      gradient:
        'bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-900',
      glass:
        'bg-white/80 backdrop-blur-xl border border-white/20 dark:bg-neutral-800/80',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl p-6',
          'transition-all duration-200',
          colSpanClasses[colSpan],
          rowSpanClasses[rowSpan],
          variantClasses[variant],
          hoverable && 'hover:shadow-lg hover:-translate-y-0.5',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

BentoItem.displayName = 'BentoItem';

/**
 * BentoHeader - Header section for bento items
 */
interface BentoHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

const BentoHeader = React.forwardRef<HTMLDivElement, BentoHeaderProps>(
  ({ className, title, description, action, icon, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-start justify-between mb-4', className)}
        {...props}
      >
        <div className="flex items-start gap-3">
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            {description && (
              <p className="text-sm text-text-secondary mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  }
);

BentoHeader.displayName = 'BentoHeader';

/**
 * BentoMetric - Large metric display for bento items
 */
interface BentoMetricProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | number;
  label: string;
  change?: {
    value: string;
    positive: boolean;
  };
  prefix?: string;
  suffix?: string;
}

const BentoMetric = React.forwardRef<HTMLDivElement, BentoMetricProps>(
  ({ className, value, label, change, prefix, suffix, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('', className)} {...props}>
        <p className="text-sm font-medium text-text-secondary mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-text-primary font-tabular">
            {prefix}
            {value}
            {suffix}
          </p>
          {change && (
            <span
              className={cn(
                'text-sm font-medium',
                change.positive ? 'text-status-success' : 'text-status-error'
              )}
            >
              {change.positive ? '↑' : '↓'} {change.value}
            </span>
          )}
        </div>
      </div>
    );
  }
);

BentoMetric.displayName = 'BentoMetric';

/**
 * BentoProgress - Progress bar for bento items
 */
interface BentoProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

const BentoProgress = React.forwardRef<HTMLDivElement, BentoProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      label,
      showValue = true,
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variantClasses = {
      default: 'bg-primary',
      success: 'bg-status-success',
      warning: 'bg-status-warning',
      error: 'bg-status-error',
    };

    return (
      <div ref={ref} className={cn('', className)} {...props}>
        {(label || showValue) && (
          <div className="flex items-center justify-between mb-2">
            {label && (
              <span className="text-sm font-medium text-text-secondary">
                {label}
              </span>
            )}
            {showValue && (
              <span className="text-sm font-medium text-text-primary font-tabular">
                {percentage.toFixed(0)}%
              </span>
            )}
          </div>
        )}
        <div className="h-2 bg-neutral-200 rounded-full overflow-hidden dark:bg-neutral-700">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              variantClasses[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

BentoProgress.displayName = 'BentoProgress';

/**
 * BentoList - Compact list for bento items
 */
interface BentoListItem {
  id: string;
  label: string;
  value?: string | number;
  icon?: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'info';
}

interface BentoListProps extends React.HTMLAttributes<HTMLDivElement> {
  items: BentoListItem[];
  onItemClick?: (item: BentoListItem) => void;
}

const BentoList = React.forwardRef<HTMLDivElement, BentoListProps>(
  ({ className, items, onItemClick, ...props }, ref) => {
    const statusColors = {
      success: 'bg-status-success',
      warning: 'bg-status-warning',
      error: 'bg-status-error',
      info: 'bg-status-info',
    };

    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg',
              'bg-neutral-50 dark:bg-neutral-900',
              onItemClick &&
                'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors'
            )}
          >
            {item.status && (
              <div
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  statusColors[item.status]
                )}
              />
            )}
            {item.icon && (
              <div className="text-text-tertiary shrink-0">{item.icon}</div>
            )}
            <span className="flex-1 text-sm font-medium text-text-primary truncate">
              {item.label}
            </span>
            {item.value !== undefined && (
              <span className="text-sm font-medium text-text-secondary font-tabular shrink-0">
                {item.value}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }
);

BentoList.displayName = 'BentoList';

export {
  BentoGrid,
  BentoItem,
  BentoHeader,
  BentoMetric,
  BentoProgress,
  BentoList,
};
export type { BentoGridProps, BentoItemProps, BentoListItem };
