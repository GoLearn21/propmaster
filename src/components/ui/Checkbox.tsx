import React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex flex-col">
        <div className="flex items-center">
          <input
            id={checkboxId}
            type="checkbox"
            className={cn(
              'h-4 w-4 rounded border-neutral-light text-primary',
              'focus:ring-2 focus:ring-primary focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'cursor-pointer transition-colors',
              error && 'border-status-error',
              className
            )}
            ref={ref}
            {...props}
          />
          {label && (
            <label
              htmlFor={checkboxId}
              className="ml-2 text-sm font-medium text-neutral-dark cursor-pointer"
            >
              {label}
            </label>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-status-error">{error}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
