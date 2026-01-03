import React from 'react';
import {
  FileText,
  Users,
  Building2,
  Home,
  Wrench,
  DollarSign,
  Search,
  Inbox,
  CalendarX,
  FolderOpen,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/Button';

/**
 * EmptyState Component - Titanium Precision Design System
 *
 * Features:
 * - Friendly, non-alarming empty state messages
 * - Contextual icons and illustrations
 * - Call-to-action buttons
 * - Multiple layout variants
 */

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Preset type for common empty states */
  preset?: keyof typeof presets;
  /** Custom icon */
  icon?: React.ReactNode;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  /** Secondary action link */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const presets = {
  // Properties
  properties: {
    icon: <Building2 className="h-12 w-12" />,
    title: 'No properties yet',
    description: 'Add your first property to start managing your portfolio.',
    actionLabel: 'Add Property',
    actionIcon: <Plus className="h-4 w-4" />,
  },
  // Units/Rentals
  rentals: {
    icon: <Home className="h-12 w-12" />,
    title: 'No units found',
    description: 'Create units within your properties to track rentals.',
    actionLabel: 'Add Unit',
    actionIcon: <Plus className="h-4 w-4" />,
  },
  // Tenants
  tenants: {
    icon: <Users className="h-12 w-12" />,
    title: 'No tenants yet',
    description: 'Add tenants to your properties to manage leases and communications.',
    actionLabel: 'Add Tenant',
    actionIcon: <Plus className="h-4 w-4" />,
  },
  // Leases
  leases: {
    icon: <FileText className="h-12 w-12" />,
    title: 'No leases found',
    description: 'Create a lease to document rental agreements with your tenants.',
    actionLabel: 'Create Lease',
    actionIcon: <Plus className="h-4 w-4" />,
  },
  // Maintenance
  maintenance: {
    icon: <Wrench className="h-12 w-12" />,
    title: 'No maintenance requests',
    description: 'All caught up! No pending maintenance tasks at the moment.',
    actionLabel: 'Create Work Order',
    actionIcon: <Plus className="h-4 w-4" />,
  },
  // Payments
  payments: {
    icon: <DollarSign className="h-12 w-12" />,
    title: 'No payments recorded',
    description: 'Payment history will appear here once tenants make payments.',
    actionLabel: 'Record Payment',
    actionIcon: <Plus className="h-4 w-4" />,
  },
  // Search
  search: {
    icon: <Search className="h-12 w-12" />,
    title: 'No results found',
    description: 'Try adjusting your search or filters to find what you\'re looking for.',
    actionLabel: 'Clear Filters',
  },
  // Inbox
  inbox: {
    icon: <Inbox className="h-12 w-12" />,
    title: 'Inbox is empty',
    description: 'You\'re all caught up! No new messages or notifications.',
  },
  // Calendar
  calendar: {
    icon: <CalendarX className="h-12 w-12" />,
    title: 'No events scheduled',
    description: 'Your calendar is clear for this period.',
    actionLabel: 'Schedule Event',
    actionIcon: <Plus className="h-4 w-4" />,
  },
  // Documents
  documents: {
    icon: <FolderOpen className="h-12 w-12" />,
    title: 'No documents',
    description: 'Upload documents to keep important files organized.',
    actionLabel: 'Upload Document',
    actionIcon: <Plus className="h-4 w-4" />,
  },
  // Communications
  communications: {
    icon: <MessageSquare className="h-12 w-12" />,
    title: 'No messages yet',
    description: 'Start a conversation with tenants, vendors, or owners.',
    actionLabel: 'Send Message',
    actionIcon: <Plus className="h-4 w-4" />,
  },
};

const sizeClasses = {
  sm: {
    container: 'py-8',
    icon: 'h-10 w-10',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-12',
    icon: 'h-12 w-12',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'h-16 w-16',
    title: 'text-xl',
    description: 'text-base',
  },
};

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      preset,
      icon,
      title,
      description,
      action,
      secondaryAction,
      size = 'md',
      ...props
    },
    ref
  ) => {
    // Use preset values if provided
    const presetConfig = preset ? presets[preset] : null;
    const finalIcon = icon || presetConfig?.icon;
    const finalTitle = title || presetConfig?.title;
    const finalDescription = description || presetConfig?.description;
    const finalAction = action || (presetConfig?.actionLabel ? {
      label: presetConfig.actionLabel,
      onClick: () => {},
      icon: presetConfig.actionIcon,
    } : undefined);

    const sizes = sizeClasses[size];

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center',
          sizes.container,
          className
        )}
        {...props}
      >
        {/* Icon */}
        {finalIcon && (
          <div className="mb-4 text-text-muted">
            {React.isValidElement(finalIcon)
              ? React.cloneElement(finalIcon as React.ReactElement<{ className?: string }>, {
                  className: cn(sizes.icon, (finalIcon as React.ReactElement<{ className?: string }>).props.className),
                })
              : finalIcon}
          </div>
        )}

        {/* Title */}
        {finalTitle && (
          <h3
            className={cn(
              'font-semibold text-text-primary mb-2',
              sizes.title
            )}
          >
            {finalTitle}
          </h3>
        )}

        {/* Description */}
        {finalDescription && (
          <p
            className={cn(
              'text-text-secondary max-w-sm',
              sizes.description
            )}
          >
            {finalDescription}
          </p>
        )}

        {/* Actions */}
        {(finalAction || secondaryAction) && (
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            {finalAction && (
              <Button
                variant="primary"
                onClick={finalAction.onClick}
                leftIcon={finalAction.icon}
              >
                {finalAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="ghost" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

/**
 * TableEmptyState - Empty state optimized for table views
 */
interface TableEmptyStateProps extends EmptyStateProps {
  colSpan?: number;
}

const TableEmptyState: React.FC<TableEmptyStateProps> = ({
  colSpan = 1,
  ...props
}) => (
  <tr>
    <td colSpan={colSpan}>
      <EmptyState size="sm" {...props} />
    </td>
  </tr>
);

TableEmptyState.displayName = 'TableEmptyState';

/**
 * CardEmptyState - Empty state for card containers
 */
const CardEmptyState: React.FC<EmptyStateProps> = (props) => (
  <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-8">
    <EmptyState size="sm" {...props} />
  </div>
);

CardEmptyState.displayName = 'CardEmptyState';

export { EmptyState, TableEmptyState, CardEmptyState };
export type { EmptyStateProps };
