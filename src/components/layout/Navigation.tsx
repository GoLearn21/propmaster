import React, { useState } from 'react';
import { Search, HelpCircle, Plus, Bell, Command } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
import CreateNewModal from '../modals/CreateNewModal';
import { ThemeToggle } from '../ThemeToggle';

/**
 * Navigation Component - Titanium Precision Design System
 *
 * Features:
 * - Frosted glass vibrancy header
 * - Command palette hint (Cmd+K)
 * - Notification bell with indicator
 * - Improved search bar styling
 */

export interface NavigationProps {
  className?: string;
  onOpenCommandPalette?: () => void;
  notificationCount?: number;
}

const Navigation: React.FC<NavigationProps> = ({
  className,
  onOpenCommandPalette,
  notificationCount = 0,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Handle keyboard shortcut for command palette
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenCommandPalette?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCommandPalette]);

  return (
    <>
      <nav
        className={cn(
          // Base styles
          'h-16 flex items-center justify-between px-6',
          'fixed top-0 left-0 right-0 z-50',
          // Vibrancy/frosted glass effect
          'bg-white/80 backdrop-blur-xl backdrop-saturate-[180%]',
          'border-b border-neutral-200/50',
          // Dark mode
          'dark:bg-neutral-900/80 dark:border-neutral-700/50',
          className
        )}
      >
        {/* Left section - MasterKey Logo */}
        <div className="flex items-center">
          <div className="flex items-center space-x-2">
            {/* Logo icon */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            {/* Logo text */}
            <span className="text-text-primary font-bold text-xl tracking-tight">
              MasterKey
            </span>
          </div>
        </div>

        {/* Center section - Global Search Bar */}
        <div className="flex-1 max-w-xl mx-auto px-8">
          <button
            onClick={onOpenCommandPalette}
            className={cn(
              'w-full h-10 flex items-center px-4 rounded-lg',
              'bg-neutral-100/80 hover:bg-neutral-100',
              'border border-neutral-200/50 hover:border-neutral-300',
              'transition-all duration-200',
              'dark:bg-neutral-800/50 dark:border-neutral-700/50',
              'dark:hover:bg-neutral-800 dark:hover:border-neutral-600',
              'group cursor-pointer'
            )}
          >
            <Search className="h-4 w-4 text-text-muted mr-3" />
            <span className="text-sm text-text-muted flex-1 text-left">
              Search anything...
            </span>
            {/* Keyboard shortcut hint */}
            <div className="flex items-center gap-1">
              <kbd
                className={cn(
                  'hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5',
                  'text-[10px] font-medium text-text-muted',
                  'bg-neutral-200/50 rounded border border-neutral-300/50',
                  'dark:bg-neutral-700/50 dark:border-neutral-600/50'
                )}
              >
                <Command className="h-3 w-3" />K
              </kbd>
            </div>
          </button>
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center space-x-2">
          {/* Help & Training */}
          <button
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg',
              'text-sm font-medium text-text-secondary',
              'hover:bg-neutral-100 hover:text-text-primary',
              'transition-all duration-200',
              'dark:hover:bg-neutral-800'
            )}
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden md:inline">Help</span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle size="md" />

          {/* Notifications */}
          <button
            className={cn(
              'relative p-2 rounded-lg',
              'text-text-secondary hover:text-text-primary',
              'hover:bg-neutral-100',
              'transition-all duration-200',
              'dark:hover:bg-neutral-800'
            )}
            aria-label={`${notificationCount} notifications`}
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5',
                  'min-w-[18px] h-[18px] flex items-center justify-center',
                  'px-1 rounded-full',
                  'text-[10px] font-bold text-white',
                  'bg-status-error',
                  'ring-2 ring-white dark:ring-neutral-900'
                )}
              >
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {/* Create New Button */}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
            className="ml-2"
          >
            <span className="hidden sm:inline">Create new</span>
          </Button>
        </div>
      </nav>

      {/* Create New Modal */}
      <CreateNewModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  );
};

Navigation.displayName = 'Navigation';

export { Navigation };
