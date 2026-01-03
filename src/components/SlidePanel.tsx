import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/Button';

/**
 * SlidePanel Component - Titanium Precision Design System
 *
 * Features:
 * - Slide-in from right with spring animation
 * - Backdrop with blur effect
 * - Focus trap for accessibility
 * - Escape key to close
 * - Multiple width options
 */

interface SlidePanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback when panel should close */
  onClose: () => void;
  /** Panel title */
  title?: string;
  /** Panel description */
  description?: string;
  /** Panel width */
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Children to render in panel body */
  children: React.ReactNode;
  /** Footer content (typically action buttons) */
  footer?: React.ReactNode;
  /** Show close button */
  showClose?: boolean;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
}

const widthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full',
};

const SlidePanel: React.FC<SlidePanelProps> = ({
  isOpen,
  onClose,
  title,
  description,
  width = 'md',
  children,
  footer,
  showClose = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus the panel
      panelRef.current?.focus();
    } else {
      // Restore focus when closing
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40',
          'bg-neutral-900/50 backdrop-blur-sm',
          'animate-fade-in'
        )}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'slide-panel-title' : undefined}
        tabIndex={-1}
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50',
          'w-full',
          widthClasses[width],
          'bg-white dark:bg-neutral-900',
          'shadow-2xl',
          'flex flex-col',
          'animate-slide-in-right',
          'focus:outline-none'
        )}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex-1 min-w-0">
              {title && (
                <h2
                  id="slide-panel-title"
                  className="text-lg font-semibold text-text-primary truncate"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-text-secondary mt-1">{description}</p>
              )}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className={cn(
                  'p-2 rounded-lg shrink-0',
                  'text-text-tertiary hover:text-text-primary',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'transition-colors'
                )}
                aria-label="Close panel"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
            {footer}
          </div>
        )}
      </div>
    </>
  );
};

SlidePanel.displayName = 'SlidePanel';

/**
 * SlidePanelFooter - Common footer patterns
 */
interface SlidePanelFooterProps {
  /** Primary action button props */
  primaryAction?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  /** Secondary action (usually cancel) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional content on the left */
  leftContent?: React.ReactNode;
}

const SlidePanelFooter: React.FC<SlidePanelFooterProps> = ({
  primaryAction,
  secondaryAction,
  leftContent,
}) => (
  <div className="flex items-center justify-between gap-4">
    <div>{leftContent}</div>
    <div className="flex items-center gap-3">
      {secondaryAction && (
        <Button variant="outline" onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </Button>
      )}
      {primaryAction && (
        <Button
          variant="primary"
          onClick={primaryAction.onClick}
          loading={primaryAction.loading}
          disabled={primaryAction.disabled}
        >
          {primaryAction.label}
        </Button>
      )}
    </div>
  </div>
);

SlidePanelFooter.displayName = 'SlidePanelFooter';

/**
 * SlidePanelSection - Section within panel body
 */
interface SlidePanelSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

const SlidePanelSection = React.forwardRef<HTMLDivElement, SlidePanelSectionProps>(
  ({ className, title, description, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('py-4 border-b border-neutral-200 dark:border-neutral-700 last:border-0', className)}
      {...props}
    >
      {title && (
        <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-text-secondary mb-3">{description}</p>
      )}
      {children}
    </div>
  )
);

SlidePanelSection.displayName = 'SlidePanelSection';

export { SlidePanel, SlidePanelFooter, SlidePanelSection };
export type { SlidePanelProps };
