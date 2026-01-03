import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Building2,
  Home,
  FileText,
  Users,
  Wrench,
  DollarSign,
  MessageSquare,
  Settings,
  Plus,
  UserPlus,
  CreditCard,
  Calendar,
  FolderOpen,
  BarChart3,
  ArrowRight,
  Command,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CommandPalette Component - Titanium Precision Design System
 *
 * Features:
 * - Cmd+K / Ctrl+K keyboard shortcut
 * - Instant fuzzy search across all actions
 * - Recent actions memory (localStorage)
 * - Keyboard navigation (up/down/enter/escape)
 * - Grouped actions by category
 */

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'create' | 'action' | 'settings';
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Load recent commands from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('command-palette-recent');
    if (stored) {
      try {
        setRecentIds(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // All available commands
  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        icon: <LayoutDashboard className="h-4 w-4" />,
        action: () => navigate('/'),
        category: 'navigation',
        keywords: ['home', 'overview'],
      },
      {
        id: 'nav-properties',
        label: 'Go to Properties',
        icon: <Building2 className="h-4 w-4" />,
        action: () => navigate('/properties'),
        category: 'navigation',
      },
      {
        id: 'nav-rentals',
        label: 'Go to Rentals',
        icon: <Home className="h-4 w-4" />,
        action: () => navigate('/rentals'),
        category: 'navigation',
        keywords: ['units'],
      },
      {
        id: 'nav-leasing',
        label: 'Go to Leasing',
        icon: <FileText className="h-4 w-4" />,
        action: () => navigate('/leasing'),
        category: 'navigation',
        keywords: ['leases', 'contracts'],
      },
      {
        id: 'nav-people',
        label: 'Go to People',
        icon: <Users className="h-4 w-4" />,
        action: () => navigate('/people'),
        category: 'navigation',
        keywords: ['tenants', 'vendors', 'owners'],
      },
      {
        id: 'nav-maintenance',
        label: 'Go to Tasks & Maintenance',
        icon: <Wrench className="h-4 w-4" />,
        action: () => navigate('/tasks-maintenance'),
        category: 'navigation',
        keywords: ['work orders', 'repairs'],
      },
      {
        id: 'nav-accounting',
        label: 'Go to Accounting',
        icon: <DollarSign className="h-4 w-4" />,
        action: () => navigate('/accounting'),
        category: 'navigation',
        keywords: ['finance', 'payments', 'invoices'],
      },
      {
        id: 'nav-communications',
        label: 'Go to Communications',
        icon: <MessageSquare className="h-4 w-4" />,
        action: () => navigate('/communications'),
        category: 'navigation',
        keywords: ['messages', 'emails'],
      },
      {
        id: 'nav-calendar',
        label: 'Go to Calendar',
        icon: <Calendar className="h-4 w-4" />,
        action: () => navigate('/calendar'),
        category: 'navigation',
        keywords: ['schedule', 'events'],
      },
      {
        id: 'nav-files',
        label: 'Go to Files & Agreements',
        icon: <FolderOpen className="h-4 w-4" />,
        action: () => navigate('/files-agreements'),
        category: 'navigation',
        keywords: ['documents'],
      },
      {
        id: 'nav-reports',
        label: 'Go to Reports',
        icon: <BarChart3 className="h-4 w-4" />,
        action: () => navigate('/reports'),
        category: 'navigation',
        keywords: ['analytics'],
      },

      // Create actions
      {
        id: 'create-lease',
        label: 'Create Lease',
        description: 'Draft a new lease agreement',
        icon: <FileText className="h-4 w-4" />,
        shortcut: 'L',
        action: () => navigate('/leasing/new'),
        category: 'create',
      },
      {
        id: 'create-tenant',
        label: 'Add Tenant',
        description: 'Register a new tenant',
        icon: <UserPlus className="h-4 w-4" />,
        shortcut: 'T',
        action: () => navigate('/people/tenants/new'),
        category: 'create',
      },
      {
        id: 'create-property',
        label: 'Add Property',
        description: 'Add a new property to portfolio',
        icon: <Building2 className="h-4 w-4" />,
        shortcut: 'P',
        action: () => navigate('/properties/new'),
        category: 'create',
      },
      {
        id: 'create-maintenance',
        label: 'Create Work Order',
        description: 'Submit a maintenance request',
        icon: <Wrench className="h-4 w-4" />,
        shortcut: 'M',
        action: () => navigate('/tasks-maintenance/new'),
        category: 'create',
        keywords: ['repair', 'fix'],
      },
      {
        id: 'create-payment',
        label: 'Record Payment',
        description: 'Log a rent or other payment',
        icon: <CreditCard className="h-4 w-4" />,
        shortcut: 'R',
        action: () => navigate('/accounting/payments/new'),
        category: 'create',
      },

      // Settings
      {
        id: 'settings-general',
        label: 'Settings',
        description: 'Manage account settings',
        icon: <Settings className="h-4 w-4" />,
        action: () => navigate('/settings'),
        category: 'settings',
      },
    ],
    [navigate]
  );

  // Fuzzy search filter
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent commands first, then all others
      const recent = recentIds
        .map((id) => commands.find((c) => c.id === id))
        .filter(Boolean) as CommandItem[];
      const others = commands.filter((c) => !recentIds.includes(c.id));
      return [...recent.slice(0, 3), ...others];
    }

    const searchTerm = query.toLowerCase();
    return commands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(searchTerm);
      const descMatch = cmd.description?.toLowerCase().includes(searchTerm);
      const keywordMatch = cmd.keywords?.some((k) =>
        k.toLowerCase().includes(searchTerm)
      );
      return labelMatch || descMatch || keywordMatch;
    });
  }, [query, commands, recentIds]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      recent: [],
      navigation: [],
      create: [],
      action: [],
      settings: [],
    };

    // If no query, show recent first
    if (!query.trim() && recentIds.length > 0) {
      const recentItems = recentIds
        .slice(0, 3)
        .map((id) => commands.find((c) => c.id === id))
        .filter(Boolean) as CommandItem[];
      groups.recent = recentItems;
    }

    filteredCommands.forEach((cmd) => {
      if (!groups.recent.find((r) => r.id === cmd.id)) {
        groups[cmd.category].push(cmd);
      }
    });

    return groups;
  }, [filteredCommands, query, recentIds, commands]);

  // Execute selected command
  const executeCommand = useCallback(
    (command: CommandItem) => {
      // Save to recent
      const newRecent = [command.id, ...recentIds.filter((id) => id !== command.id)].slice(0, 5);
      setRecentIds(newRecent);
      localStorage.setItem('command-palette-recent', JSON.stringify(newRecent));

      // Execute action
      command.action();
      onClose();
    },
    [recentIds, onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const allItems = Object.values(groupedCommands).flat();

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (allItems[selectedIndex]) {
            executeCommand(allItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, groupedCommands, executeCommand, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector('[data-selected="true"]');
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const allItems = Object.values(groupedCommands).flat();
  const categoryLabels: Record<string, string> = {
    recent: 'Recent',
    navigation: 'Navigation',
    create: 'Create',
    action: 'Actions',
    settings: 'Settings',
  };

  let itemIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
        <div
          className={cn(
            'w-full max-w-xl',
            'bg-white/95 dark:bg-neutral-900/95',
            'backdrop-blur-2xl',
            'rounded-2xl shadow-2xl',
            'border border-neutral-200/50 dark:border-neutral-700/50',
            'overflow-hidden',
            'animate-scale-in'
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          {/* Search Input */}
          <div className="flex items-center px-4 border-b border-neutral-200/50 dark:border-neutral-700/50">
            <Search className="h-5 w-5 text-text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className={cn(
                'flex-1 h-14 px-4',
                'bg-transparent',
                'text-text-primary placeholder:text-text-muted',
                'focus:outline-none',
                'text-base'
              )}
            />
            <button
              onClick={onClose}
              className={cn(
                'p-1.5 rounded-lg',
                'text-text-muted hover:text-text-primary',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'transition-colors'
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[50vh] overflow-y-auto py-2"
            role="listbox"
          >
            {allItems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-text-muted">No results found</p>
                <p className="text-sm text-text-tertiary mt-1">
                  Try a different search term
                </p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, items]) => {
                if (items.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="px-4 py-2">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                        {categoryLabels[category]}
                      </span>
                    </div>
                    {items.map((item) => {
                      const currentIndex = itemIndex++;
                      const isSelected = currentIndex === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          data-selected={isSelected}
                          onClick={() => executeCommand(item)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5',
                            'text-left transition-colors',
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          )}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <span
                            className={cn(
                              'shrink-0 p-2 rounded-lg',
                              isSelected
                                ? 'bg-primary/20 text-primary'
                                : 'bg-neutral-100 text-text-tertiary dark:bg-neutral-800'
                            )}
                          >
                            {item.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.label}</div>
                            {item.description && (
                              <div className="text-sm text-text-tertiary truncate">
                                {item.description}
                              </div>
                            )}
                          </div>
                          {item.shortcut && (
                            <kbd
                              className={cn(
                                'shrink-0 px-2 py-1 text-xs font-medium rounded',
                                'bg-neutral-100 text-text-muted border border-neutral-200',
                                'dark:bg-neutral-800 dark:border-neutral-700'
                              )}
                            >
                              {item.shortcut}
                            </kbd>
                          )}
                          <ArrowRight
                            className={cn(
                              'h-4 w-4 shrink-0 transition-opacity',
                              isSelected ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-neutral-200/50 dark:border-neutral-700/50 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-200/50 dark:bg-neutral-700/50">
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-200/50 dark:bg-neutral-700/50">
                    ↵
                  </kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-200/50 dark:bg-neutral-700/50">
                    Esc
                  </kbd>
                  Close
                </span>
              </div>
              <span className="flex items-center gap-1">
                <Command className="h-3 w-3" />K to open
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

CommandPalette.displayName = 'CommandPalette';

export { CommandPalette };
export type { CommandItem, CommandPaletteProps };
