import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-neutral-dark mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-neutral-light bg-white px-3 py-2 text-base text-neutral-black',
            'placeholder:text-neutral-medium',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-lighter',
            'transition-colors resize-y',
            error && 'border-status-error focus:border-status-error focus:ring-status-error/10',
            className
          )}
          ref={ref}
          {...props}
        />
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

Textarea.displayName = 'Textarea';

export { Textarea };
