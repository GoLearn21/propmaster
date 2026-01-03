import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-neutral-dark mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            className={cn(
              'flex h-10 w-full rounded-md border border-neutral-light bg-white px-3 py-2 text-base text-neutral-black',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-lighter',
              'transition-colors appearance-none',
              'pr-10',
              error && 'border-status-error focus:border-status-error focus:ring-status-error/10',
              className
            )}
            ref={ref}
            {...props}
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-medium">
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
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-status-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-neutral-medium">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
