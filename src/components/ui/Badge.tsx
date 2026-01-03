import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge Component - Titanium Precision Design System
 *
 * Features:
 * - Jewel effect with colored backgrounds and borders
 * - Pulsing dot indicator for status emphasis
 * - Semantic status variants (success, warning, error, info)
 * - Soft backgrounds with contrasting text
 */

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5',
    'rounded-full',
    'text-xs font-medium',
    'transition-colors duration-200',
  ].join(' '),
  {
    variants: {
      variant: {
        // Jewel variants with borders (status indicators)
        success: [
          'bg-status-success-bg text-status-success',
          'border border-status-success/20',
        ].join(' '),

        warning: [
          'bg-status-warning-bg text-status-warning',
          'border border-status-warning/20',
        ].join(' '),

        error: [
          'bg-status-error-bg text-status-error',
          'border border-status-error/20',
        ].join(' '),

        info: [
          'bg-status-info-bg text-status-info',
          'border border-status-info/20',
        ].join(' '),

        // Brand variants
        primary: [
          'bg-primary/10 text-primary',
          'border border-primary/20',
        ].join(' '),

        secondary: [
          'bg-accent-green/10 text-accent-green',
          'border border-accent-green/20',
        ].join(' '),

        active: [
          'bg-accent-pink/10 text-accent-pink',
          'border border-accent-pink/20',
        ].join(' '),

        // Neutral variants
        default: [
          'bg-neutral-100 text-text-secondary',
          'border border-neutral-200',
        ].join(' '),

        outline: [
          'bg-transparent text-text-secondary',
          'border border-neutral-300',
        ].join(' '),

        // Solid variants (more emphasis)
        'solid-success': 'bg-status-success text-white',
        'solid-warning': 'bg-status-warning text-white',
        'solid-error': 'bg-status-error text-white',
        'solid-info': 'bg-status-info text-white',
        'solid-primary': 'bg-primary text-white',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-[10px]',
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Show a pulsing dot indicator */
  dot?: boolean;
  /** Show static dot (no animation) */
  staticDot?: boolean;
  /** Icon to show before text */
  icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, staticDot, icon, children, ...props }, ref) => {
    const showDot = dot || staticDot;
    const isPulsing = dot && !staticDot;

    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {showDot && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full bg-current shrink-0',
              isPulsing && 'animate-pulse-dot'
            )}
            aria-hidden="true"
          />
        )}
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

/**
 * Status-specific badge presets for common use cases
 */
const StatusBadge = ({
  status,
  children,
  ...props
}: Omit<BadgeProps, 'variant'> & {
  status: 'paid' | 'pending' | 'overdue' | 'active' | 'inactive' | 'draft' | 'completed' | 'in-progress' | 'cancelled' | string;
}) => {
  const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    paid: { variant: 'success', label: 'Paid' },
    pending: { variant: 'warning', label: 'Pending' },
    overdue: { variant: 'error', label: 'Overdue' },
    active: { variant: 'success', label: 'Active' },
    inactive: { variant: 'default', label: 'Inactive' },
    draft: { variant: 'outline', label: 'Draft' },
    completed: { variant: 'success', label: 'Completed' },
    'in-progress': { variant: 'info', label: 'In Progress' },
    cancelled: { variant: 'error', label: 'Cancelled' },
  };

  // Defensive: handle unknown statuses gracefully
  const config = statusConfig[status] || { variant: 'default' as const, label: status || 'Unknown' };

  return (
    <Badge variant={config.variant} dot {...props}>
      {children || config.label}
    </Badge>
  );
};

export { Badge, StatusBadge, badgeVariants };
