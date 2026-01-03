import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme, type Theme } from '@/contexts/ThemeContext';

/**
 * ThemeToggle Component - Titanium Precision Design System
 *
 * Features:
 * - Simple toggle between light/dark
 * - Optional system preference option
 * - Smooth icon transitions
 * - Multiple size variants
 */

interface ThemeToggleProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show as button group with all options */
  variant?: 'toggle' | 'buttons';
  /** Show labels */
  showLabel?: boolean;
  /** Additional class names */
  className?: string;
}

const sizeClasses = {
  sm: {
    button: 'p-1.5',
    icon: 'h-4 w-4',
  },
  md: {
    button: 'p-2',
    icon: 'h-5 w-5',
  },
  lg: {
    button: 'p-2.5',
    icon: 'h-6 w-6',
  },
};

/**
 * Simple toggle between light and dark
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  className,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const sizes = sizeClasses[size];

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'rounded-lg transition-all duration-200',
        'text-text-secondary hover:text-text-primary',
        'hover:bg-neutral-100 dark:hover:bg-neutral-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        sizes.button,
        className
      )}
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative">
        {/* Sun icon (visible in dark mode) */}
        <Sun
          className={cn(
            sizes.icon,
            'transition-all duration-300',
            resolvedTheme === 'dark'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 rotate-90 scale-0 absolute inset-0'
          )}
        />
        {/* Moon icon (visible in light mode) */}
        <Moon
          className={cn(
            sizes.icon,
            'transition-all duration-300',
            resolvedTheme === 'light'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-0 absolute inset-0'
          )}
        />
      </div>
    </button>
  );
};

/**
 * Button group with all theme options (light, dark, system)
 */
export const ThemeButtonGroup: React.FC<ThemeToggleProps> = ({
  size = 'md',
  showLabel = false,
  className,
}) => {
  const { theme, setTheme } = useTheme();
  const sizes = sizeClasses[size];

  const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className={sizes.icon} />, label: 'Light' },
    { value: 'dark', icon: <Moon className={sizes.icon} />, label: 'Dark' },
    { value: 'system', icon: <Monitor className={sizes.icon} />, label: 'System' },
  ];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-lg',
        'bg-neutral-100 dark:bg-neutral-800',
        className
      )}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={cn(
            'flex items-center gap-2 rounded-md transition-all duration-200',
            sizes.button,
            theme === option.value
              ? 'bg-white dark:bg-neutral-700 text-text-primary shadow-sm'
              : 'text-text-tertiary hover:text-text-primary'
          )}
          role="radio"
          aria-checked={theme === option.value}
          aria-label={option.label}
        >
          {option.icon}
          {showLabel && (
            <span className="text-sm font-medium">{option.label}</span>
          )}
        </button>
      ))}
    </div>
  );
};

/**
 * Dropdown menu for theme selection
 */
interface ThemeDropdownProps {
  trigger?: React.ReactNode;
  className?: string;
}

export const ThemeDropdown: React.FC<ThemeDropdownProps> = ({
  trigger,
  className,
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="h-4 w-4" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="h-4 w-4" />, label: 'Dark' },
    { value: 'system', icon: <Monitor className="h-4 w-4" />, label: 'System' },
  ];

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'p-2 rounded-lg transition-all duration-200',
          'text-text-secondary hover:text-text-primary',
          'hover:bg-neutral-100 dark:hover:bg-neutral-800',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Theme options"
      >
        {trigger || (
          resolvedTheme === 'dark' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute right-0 mt-2 w-36 py-1',
            'bg-white dark:bg-neutral-800',
            'rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700',
            'z-50 animate-scale-in origin-top-right'
          )}
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setTheme(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left',
                'transition-colors',
                theme === option.value
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700'
              )}
              role="option"
              aria-selected={theme === option.value}
            >
              {option.icon}
              <span className="text-sm font-medium">{option.label}</span>
              {theme === option.value && (
                <svg
                  className="h-4 w-4 ml-auto"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

ThemeToggle.displayName = 'ThemeToggle';
ThemeButtonGroup.displayName = 'ThemeButtonGroup';
ThemeDropdown.displayName = 'ThemeDropdown';
