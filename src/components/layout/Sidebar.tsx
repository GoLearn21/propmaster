import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Home,
  FileText,
  Users,
  Wrench,
  DollarSign,
  MessageSquare,
  StickyNote,
  FolderOpen,
  BarChart3,
  Rocket,
  Settings,
  GitBranch,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sidebar Component - Titanium Precision Design System
 *
 * Features:
 * - Frosted glass vibrancy effect
 * - Active nav item with vertical indicator bar
 * - Smooth hover and active state transitions
 * - Collapsible with animation
 */

export interface SidebarNavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

// MasterKey navigation structure (13 items)
const navigationItems: SidebarNavItem[] = [
  { title: 'Overview', href: '/', icon: <LayoutDashboard className="h-5 w-5" /> },
  { title: 'Properties', href: '/properties', icon: <Building2 className="h-5 w-5" /> },
  { title: 'Calendar', href: '/calendar', icon: <Calendar className="h-5 w-5" /> },
  { title: 'Rentals', href: '/rentals', icon: <Home className="h-5 w-5" /> },
  { title: 'Leasing', href: '/leasing', icon: <FileText className="h-5 w-5" /> },
  { title: 'People', href: '/people', icon: <Users className="h-5 w-5" /> },
  { title: 'Tasks & Maintenance', href: '/tasks-maintenance', icon: <Wrench className="h-5 w-5" /> },
  { title: 'Accounting', href: '/accounting', icon: <DollarSign className="h-5 w-5" /> },
  { title: 'Comms', href: '/communications', icon: <MessageSquare className="h-5 w-5" /> },
  { title: 'Notes', href: '/notes', icon: <StickyNote className="h-5 w-5" /> },
  { title: 'Files & Agreements', href: '/files-agreements', icon: <FolderOpen className="h-5 w-5" /> },
  { title: 'Reports', href: '/reports', icon: <BarChart3 className="h-5 w-5" /> },
  { title: 'Workflows', href: '/workflows', icon: <GitBranch className="h-5 w-5" /> },
  { title: 'Get Started', href: '/get-started', icon: <Rocket className="h-5 w-5" /> },
  { title: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" /> },
];

export interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  className,
  collapsed = false,
  onToggleCollapse,
}) => {
  const location = useLocation();

  return (
    <aside
      className={cn(
        // Base styles
        'flex flex-col h-full fixed left-0 top-16 bottom-0',
        'transition-all duration-300 ease-smooth',
        // Vibrancy/frosted glass effect
        'bg-white/80 backdrop-blur-xl backdrop-saturate-[180%]',
        'border-r border-neutral-200/50',
        // Dark mode
        'dark:bg-neutral-900/80 dark:border-neutral-700/50',
        // Width
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      {/* Navigation Items */}
      <div className="flex flex-col flex-1 overflow-y-auto py-4 no-scrollbar">
        <nav className="flex-1 px-3 space-y-1">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  // Base styles
                  'group relative flex items-center rounded-lg transition-all duration-200',
                  'px-3 py-2.5 text-sm font-medium',
                  // Active state with indicator
                  isActive && [
                    'bg-primary/10 text-primary font-semibold',
                    // Vertical indicator bar
                    'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                    'before:w-1 before:h-6 before:bg-primary before:rounded-r',
                  ],
                  // Inactive state
                  !isActive && [
                    'text-text-secondary',
                    'hover:bg-neutral-100 hover:text-text-primary',
                    'dark:hover:bg-neutral-800',
                  ],
                  // Collapsed alignment
                  collapsed && 'justify-center px-2'
                )}
              >
                {/* Icon */}
                <span
                  className={cn(
                    'flex-shrink-0 transition-colors',
                    !collapsed && 'mr-3',
                    isActive ? 'text-primary' : 'text-text-tertiary group-hover:text-text-primary'
                  )}
                >
                  {item.icon}
                </span>

                {/* Label */}
                {!collapsed && (
                  <span className="flex-1 truncate">{item.title}</span>
                )}

                {/* Badge (if applicable) */}
                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      'ml-2 px-2 py-0.5 rounded-full text-xs font-medium',
                      'bg-status-error text-white'
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div
                    className={cn(
                      'absolute left-full ml-3 px-3 py-2',
                      'bg-neutral-900 text-white text-sm font-medium rounded-lg',
                      'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
                      'transition-all duration-200 z-50',
                      'whitespace-nowrap shadow-lg',
                      // Arrow
                      'before:absolute before:right-full before:top-1/2 before:-translate-y-1/2',
                      'before:border-8 before:border-transparent before:border-r-neutral-900'
                    )}
                  >
                    {item.title}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Collapse Toggle Button */}
      {onToggleCollapse && (
        <div className="p-3 border-t border-neutral-200/50 dark:border-neutral-700/50">
          <button
            onClick={onToggleCollapse}
            className={cn(
              'flex items-center justify-center w-full',
              'p-2 rounded-lg text-text-tertiary',
              'hover:bg-neutral-100 hover:text-text-primary',
              'dark:hover:bg-neutral-800',
              'transition-all duration-200'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
};

Sidebar.displayName = 'Sidebar';

/**
 * SidebarSection - Group navigation items with a header
 */
interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  collapsed?: boolean;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  children,
  collapsed,
}) => (
  <div className="mb-4">
    {title && !collapsed && (
      <h3 className="px-3 mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
        {title}
      </h3>
    )}
    <div className="space-y-1">{children}</div>
  </div>
);

SidebarSection.displayName = 'SidebarSection';

export { Sidebar, SidebarSection };
