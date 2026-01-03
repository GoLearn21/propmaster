import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * Button Component - Titanium Precision Design System
 *
 * Features:
 * - Spring physics (scale 0.98 on press)
 * - Colored ambient shadows (glow effect)
 * - Hover lift effect (-2px translateY)
 * - Smooth transitions with spring easing
 */

const buttonVariants = cva(
  // Base styles with spring physics
  [
    'inline-flex items-center justify-center gap-2',
    'font-semibold rounded-lg',
    'transition-all duration-200 ease-spring',
    'active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary CTA - Accent green with success shadow
        primary: [
          'bg-accent-green text-white',
          'hover:bg-accent-green-hover',
          'hover:-translate-y-0.5',
          'shadow-md hover:shadow-success-lg',
          'focus-visible:ring-accent-green',
        ].join(' '),

        // Secondary - MasterKey Teal with primary shadow
        secondary: [
          'bg-primary text-white',
          'hover:bg-primary-dark',
          'hover:-translate-y-0.5',
          'shadow-md hover:shadow-primary-lg',
          'focus-visible:ring-primary',
        ].join(' '),

        // Outline - Border with subtle fill on hover
        outline: [
          'border-2 border-neutral-200',
          'bg-transparent text-text-primary',
          'hover:bg-neutral-50 hover:border-neutral-300',
          'hover:-translate-y-0.5',
          'focus-visible:ring-primary',
          'dark:border-neutral-700 dark:text-text-primary',
          'dark:hover:bg-neutral-800',
        ].join(' '),

        // Ghost - No background, subtle hover
        ghost: [
          'bg-transparent text-text-secondary',
          'hover:bg-neutral-100 hover:text-text-primary',
          'focus-visible:ring-primary',
          'dark:hover:bg-neutral-800',
        ].join(' '),

        // Destructive - Error red with error shadow
        destructive: [
          'bg-status-error text-white',
          'hover:bg-status-error/90',
          'hover:-translate-y-0.5',
          'shadow-md hover:shadow-error-lg',
          'focus-visible:ring-status-error',
        ].join(' '),

        // Link - Text-only, no background
        link: [
          'bg-transparent text-primary',
          'underline-offset-4 hover:underline',
          'p-0 h-auto',
          'focus-visible:ring-primary',
        ].join(' '),

        // Soft variants (lighter backgrounds)
        'soft-primary': [
          'bg-primary/10 text-primary',
          'hover:bg-primary/20',
          'focus-visible:ring-primary',
        ].join(' '),

        'soft-success': [
          'bg-status-success/10 text-status-success',
          'hover:bg-status-success/20',
          'focus-visible:ring-status-success',
        ].join(' '),

        'soft-warning': [
          'bg-status-warning/10 text-status-warning',
          'hover:bg-status-warning/20',
          'focus-visible:ring-status-warning',
        ].join(' '),

        'soft-error': [
          'bg-status-error/10 text-status-error',
          'hover:bg-status-error/20',
          'focus-visible:ring-status-error',
        ].join(' '),
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded-md',
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-12 w-12 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as child component (for link wrappers) */
  asChild?: boolean;
  /** Show loading spinner */
  loading?: boolean;
  /** Icon on the left side */
  leftIcon?: React.ReactNode;
  /** Icon on the right side */
  rightIcon?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    loading,
    leftIcon,
    rightIcon,
    fullWidth,
    children,
    disabled,
    ...props
  }, ref) => {
    return (
      <button
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && 'w-full',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
