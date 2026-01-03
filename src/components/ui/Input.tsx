import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Input Component - Titanium Precision Design System
 *
 * Features:
 * - Enhanced focus states with primary ring
 * - Smooth transitions and animations
 * - Ceramic surface colors
 * - Clear error states with status colors
 * - Support for icons and helper text
 */

const inputVariants = cva(
  [
    'flex w-full rounded-lg border bg-white',
    'text-text-primary placeholder:text-text-muted',
    'transition-all duration-200 ease-smooth',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-100',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'border-neutral-200',
          'hover:border-neutral-300',
          'focus:border-primary focus:ring-primary/20',
        ].join(' '),

        filled: [
          'border-transparent bg-neutral-100',
          'hover:bg-neutral-50',
          'focus:bg-white focus:border-primary focus:ring-primary/20',
        ].join(' '),

        ghost: [
          'border-transparent bg-transparent',
          'hover:bg-neutral-50',
          'focus:bg-white focus:border-primary focus:ring-primary/20',
        ].join(' '),
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-3 text-base',
        lg: 'h-12 px-4 text-lg',
      },
      state: {
        default: '',
        error: [
          'border-status-error',
          'focus:border-status-error focus:ring-status-error/20',
          'text-status-error placeholder:text-status-error/60',
        ].join(' '),
        success: [
          'border-status-success',
          'focus:border-status-success focus:ring-status-success/20',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Icon on the left side */
  leftIcon?: React.ReactNode;
  /** Icon on the right side */
  rightIcon?: React.ReactNode;
  /** Error message to display */
  error?: string;
  /** Label text */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Required field indicator */
  required?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      variant,
      size,
      state,
      leftIcon,
      rightIcon,
      error,
      label,
      helperText,
      id,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;
    const inputState = hasError ? 'error' : state;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              disabled ? 'text-text-muted' : 'text-text-primary'
            )}
          >
            {label}
            {required && (
              <span className="text-status-error ml-0.5">*</span>
            )}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                hasError ? 'text-status-error' : 'text-text-tertiary'
              )}
            >
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            disabled={disabled}
            className={cn(
              inputVariants({ variant, size, state: inputState }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? `${inputId}-error`
                : helperText
                ? `${inputId}-helper`
                : undefined
            }
            {...props}
          />
          {rightIcon && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                hasError ? 'text-status-error' : 'text-text-tertiary'
              )}
            >
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-status-error flex items-center gap-1"
            role="alert"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 15A7 7 0 108 1a7 7 0 000 14zm0-9.75a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zm0 7a1 1 0 100-2 1 1 0 000 2z"
              />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={`${inputId}-helper`}
            className="mt-1.5 text-sm text-text-tertiary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * SearchInput - Specialized input for search functionality
 * Includes built-in search icon and clear button
 */
interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  /** Callback when clear button is clicked */
  onClear?: () => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, value, ...props }, ref) => {
    const hasValue = value !== undefined && value !== '';

    return (
      <Input
        ref={ref}
        type="search"
        value={value}
        leftIcon={
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
        rightIcon={
          hasValue && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="p-0.5 hover:bg-neutral-100 rounded transition-colors"
              aria-label="Clear search"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : undefined
        }
        className={cn(
          // Hide browser default clear button
          '[&::-webkit-search-cancel-button]:hidden',
          className
        )}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

/**
 * NumberInput - Specialized input for numeric values
 * Uses tabular figures for proper alignment
 */
const NumberInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      className={cn('font-tabular', className)}
      {...props}
    />
  )
);

NumberInput.displayName = 'NumberInput';

/**
 * CurrencyInput - Specialized input for monetary values
 * Includes currency symbol and tabular figures
 */
interface CurrencyInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  /** Currency symbol to display */
  currency?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, currency = '$', ...props }, ref) => (
    <Input
      ref={ref}
      type="number"
      leftIcon={
        <span className="text-text-secondary font-medium">{currency}</span>
      }
      className={cn('font-tabular', className)}
      {...props}
    />
  )
);

CurrencyInput.displayName = 'CurrencyInput';

export { Input, SearchInput, NumberInput, CurrencyInput, inputVariants };
