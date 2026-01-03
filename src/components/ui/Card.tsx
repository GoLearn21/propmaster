import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Card Component - Titanium Precision Design System
 *
 * Features:
 * - Claymorphism with subtle inner shadows
 * - Bento grid variant for dashboard layouts
 * - Glass morphism variant for overlays
 * - Spring physics hover lift effect
 * - Ceramic surface colors (not pure white)
 */

const cardVariants = cva(
  'transition-all duration-200',
  {
    variants: {
      variant: {
        // Default - Clean ceramic surface with subtle border
        default: [
          'bg-white',
          'rounded-xl',
          'border border-neutral-200',
          'shadow-sm',
        ].join(' '),

        // Elevated - Lift effect on hover
        elevated: [
          'bg-white',
          'rounded-xl',
          'shadow-md',
          'hover:shadow-lg hover:-translate-y-0.5',
        ].join(' '),

        // Glass - Frosted glass morphism
        glass: [
          'bg-white/80',
          'backdrop-blur-xl backdrop-saturate-150',
          'rounded-xl',
          'border border-white/20',
          'shadow-lg',
        ].join(' '),

        // Bento - For bento grid dashboard layouts
        bento: [
          'bg-gradient-to-br from-white to-neutral-50',
          'rounded-2xl',
          'shadow-md',
          'hover:shadow-lg hover:-translate-y-0.5',
        ].join(' '),

        // Clay - Claymorphism with inner shadow
        clay: [
          'bg-white',
          'rounded-xl',
          'shadow-md',
          'dark:bg-neutral-800',
        ].join(' '),

        // Outline - Subtle border, no fill
        outline: [
          'bg-transparent',
          'rounded-xl',
          'border border-neutral-200',
          'hover:bg-neutral-50',
        ].join(' '),

        // Ghost - Minimal, light background
        ghost: [
          'bg-neutral-50',
          'rounded-xl',
          'hover:bg-neutral-100',
        ].join(' '),

        // Interactive - For clickable cards
        interactive: [
          'bg-white',
          'rounded-xl',
          'border border-neutral-200',
          'shadow-sm',
          'cursor-pointer',
          'hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30',
          'active:scale-[0.99]',
        ].join(' '),

        // Metric - For dashboard metric cards
        metric: [
          'bg-gradient-to-br from-white to-neutral-50',
          'rounded-2xl',
          'shadow-md',
          'border border-neutral-100',
        ].join(' '),
      },
      padding: {
        none: 'p-0',
        xs: 'p-3',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Enable hover lift effect */
  hoverable?: boolean;
  /** Render as a different element */
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hoverable, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, padding }),
          hoverable && 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5',
          // Clay card inner shadow effect
          variant === 'clay' && 'shadow-[0_4px_12px_rgba(26,29,46,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
));

CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-none tracking-tight text-text-primary',
      className
    )}
    {...props}
  />
));

CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-text-secondary mt-1', className)}
    {...props}
  />
));

CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));

CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center pt-4 border-t border-neutral-200',
      className
    )}
    {...props}
  />
));

CardFooter.displayName = 'CardFooter';

/**
 * BentoCard - Specialized card for bento grid layouts
 * Includes gradient background and optimized spacing
 */
const BentoCard = React.forwardRef<
  HTMLDivElement,
  CardProps & {
    /** Span multiple columns */
    colSpan?: 1 | 2 | 3;
    /** Span multiple rows */
    rowSpan?: 1 | 2;
  }
>(({ className, colSpan = 1, rowSpan = 1, children, ...props }, ref) => (
  <Card
    ref={ref}
    variant="bento"
    className={cn(
      colSpan === 2 && 'col-span-2',
      colSpan === 3 && 'col-span-3',
      rowSpan === 2 && 'row-span-2',
      className
    )}
    {...props}
  >
    {children}
  </Card>
));

BentoCard.displayName = 'BentoCard';

/**
 * MetricCard - Specialized card for dashboard metrics
 * Includes support for sparklines and trend indicators
 */
interface MetricCardProps extends Omit<CardProps, 'variant'> {
  /** Metric title */
  title: string;
  /** Primary metric value */
  value: string | number;
  /** Change indicator (e.g., "+12.5%") */
  change?: string;
  /** Whether change is positive */
  changePositive?: boolean;
  /** Optional sparkline component */
  sparkline?: React.ReactNode;
  /** Optional icon */
  icon?: React.ReactNode;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, title, value, change, changePositive, sparkline, icon, ...props }, ref) => (
    <Card
      ref={ref}
      variant="metric"
      padding="md"
      className={className}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1 font-tabular">
            {value}
          </p>
          {change && (
            <p
              className={cn(
                'text-sm font-medium mt-1',
                changePositive ? 'text-status-success' : 'text-status-error'
              )}
            >
              {changePositive ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
        )}
      </div>
      {sparkline && <div className="mt-4">{sparkline}</div>}
    </Card>
  )
);

MetricCard.displayName = 'MetricCard';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  BentoCard,
  MetricCard,
  cardVariants,
};
