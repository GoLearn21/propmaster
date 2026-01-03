/**
 * Workflow Cards Component
 *
 * Performance optimizations:
 * - Uses React Query for caching
 * - Memoized workflow calculations
 * - Optimized re-renders with useMemo
 */

import React, { useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  Circle,
  DollarSign,
  Wrench,
  ArrowRight,
  RefreshCw,
  Building2,
  Users,
} from 'lucide-react';
import { useWorkflowCounts } from '../../hooks/useDashboardData';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  link: string;
  actionLabel: string;
}

interface Workflow {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  steps: WorkflowStep[];
  progress: number;
}

const calculateProgress = (steps: boolean[]) => {
  const completed = steps.filter(Boolean).length;
  return Math.round((completed / steps.length) * 100);
};

// Memoized workflow card to prevent unnecessary re-renders
const WorkflowCard = memo<{
  workflow: Workflow;
  isExpanded: boolean;
  onToggle: () => void;
}>(({ workflow, isExpanded, onToggle }) => {
  const Icon = workflow.icon;

  return (
    <div
      className={`rounded-lg border ${
        workflow.progress < 100 ? 'border-gray-200 dark:border-neutral-700' : 'border-green-200 dark:border-green-800'
      } overflow-hidden transition-all duration-200`}
    >
      {/* Card Header */}
      <div
        className={`${workflow.bgColor} dark:bg-opacity-20 px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icon className={`w-5 h-5 ${workflow.color}`} />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-neutral-100">{workflow.title}</h4>
              <p className="text-xs text-gray-600 dark:text-neutral-400">{workflow.description}</p>
            </div>
          </div>
          {workflow.progress === 100 ? (
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <span className="text-sm font-medium text-gray-700 dark:text-neutral-300">
              {workflow.progress}%
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              workflow.progress === 100 ? 'bg-green-500' : 'bg-teal-500'
            }`}
            style={{ width: `${workflow.progress}%` }}
          />
        </div>
      </div>

      {/* Expanded Steps */}
      {isExpanded && (
        <div className="px-4 py-3 bg-white dark:bg-neutral-800 border-t border-gray-100 dark:border-neutral-700">
          <div className="space-y-3">
            {workflow.steps.map((step) => (
              <div key={step.id} className="flex items-start space-x-3">
                {step.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 dark:text-neutral-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-medium ${
                        step.completed ? 'text-gray-500 dark:text-neutral-500 line-through' : 'text-gray-900 dark:text-neutral-100'
                      }`}
                    >
                      {step.title}
                    </p>
                    {!step.completed && (
                      <Link
                        to={step.link}
                        className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-medium flex items-center"
                      >
                        {step.actionLabel}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

WorkflowCard.displayName = 'WorkflowCard';

// Loading skeleton
const WorkflowSkeleton = memo(() => (
  <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-6">
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-gray-200 dark:bg-neutral-700 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 dark:bg-neutral-700 rounded-lg"></div>
        ))}
      </div>
    </div>
  </div>
));

WorkflowSkeleton.displayName = 'WorkflowSkeleton';

export function WorkflowCards() {
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const { data, isLoading } = useWorkflowCounts();

  // Memoize workflow calculations to prevent recalculation on every render
  const workflows = useMemo<Workflow[]>(() => {
    if (!data) return [];

    const hasProperties = data.propertyCount > 0;
    const hasUnits = data.unitCount > 0;
    const hasTenants = data.tenantCount > 0;
    const hasLeases = data.leaseCount > 0;
    const hasExpiringLeases = data.expiringLeaseCount > 0;
    const hasPendingTasks = data.taskCount > 0;

    return [
      {
        id: 'onboarding',
        title: 'Property Setup',
        description: 'Get started by setting up your first property',
        icon: Building2,
        color: 'text-teal-600',
        bgColor: 'bg-teal-50',
        progress: calculateProgress([hasProperties, hasUnits]),
        steps: [
          {
            id: 'add-property',
            title: 'Add a Property',
            description: 'Create your first property in the system',
            completed: hasProperties,
            link: '/rentals',
            actionLabel: 'Add Property',
          },
          {
            id: 'add-units',
            title: 'Add Units',
            description: 'Create units for your property',
            completed: hasUnits,
            link: '/rentals',
            actionLabel: 'Add Units',
          },
        ],
      },
      {
        id: 'tenant-onboarding',
        title: 'Tenant Onboarding',
        description: 'Add tenants and create leases',
        icon: Users,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        progress: calculateProgress([hasTenants, hasLeases]),
        steps: [
          {
            id: 'add-tenant',
            title: 'Add a Tenant',
            description: 'Create a new tenant profile',
            completed: hasTenants,
            link: '/people',
            actionLabel: 'Add Tenant',
          },
          {
            id: 'create-lease',
            title: 'Create a Lease',
            description: 'Generate a lease agreement',
            completed: hasLeases,
            link: '/leasing',
            actionLabel: 'Create Lease',
          },
        ],
      },
      {
        id: 'rent-collection',
        title: 'Rent Collection',
        description: 'Manage rent payments and accounting',
        icon: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        progress: hasLeases ? 100 : 0,
        steps: [
          {
            id: 'setup-payments',
            title: 'Setup Payment Processing',
            description: 'Configure payment methods and schedules',
            completed: hasLeases,
            link: '/accounting',
            actionLabel: 'View Accounting',
          },
          {
            id: 'record-payment',
            title: 'Record Payments',
            description: 'Record incoming rent payments',
            completed: hasLeases,
            link: '/accounting',
            actionLabel: 'Record Payment',
          },
        ],
      },
      {
        id: 'lease-renewals',
        title: 'Lease Renewals',
        description: hasExpiringLeases
          ? `${data.expiringLeaseCount} leases expiring soon`
          : 'Monitor and renew leases',
        icon: RefreshCw,
        color: hasExpiringLeases ? 'text-orange-600' : 'text-blue-600',
        bgColor: hasExpiringLeases ? 'bg-orange-50' : 'bg-blue-50',
        progress: hasExpiringLeases ? 0 : 100,
        steps: [
          {
            id: 'review-expiring',
            title: 'Review Expiring Leases',
            description: hasExpiringLeases
              ? `${data.expiringLeaseCount} leases expire within 60 days`
              : 'No leases expiring soon',
            completed: !hasExpiringLeases,
            link: '/leasing',
            actionLabel: 'View Renewals',
          },
          {
            id: 'send-renewals',
            title: 'Send Renewal Offers',
            description: 'Generate and send renewal offers to tenants',
            completed: !hasExpiringLeases,
            link: '/leasing',
            actionLabel: 'Send Offers',
          },
        ],
      },
      {
        id: 'maintenance',
        title: 'Maintenance Tasks',
        description: hasPendingTasks ? `${data.taskCount} pending tasks` : 'Manage property maintenance',
        icon: Wrench,
        color: hasPendingTasks ? 'text-yellow-600' : 'text-gray-600',
        bgColor: hasPendingTasks ? 'bg-yellow-50' : 'bg-gray-50',
        progress: hasPendingTasks ? 50 : 100,
        steps: [
          {
            id: 'review-tasks',
            title: 'Review Tasks',
            description: hasPendingTasks
              ? `${data.taskCount} tasks need attention`
              : 'All tasks completed',
            completed: !hasPendingTasks,
            link: '/tasks-maintenance',
            actionLabel: 'View Tasks',
          },
          {
            id: 'schedule-maintenance',
            title: 'Schedule Maintenance',
            description: 'Plan upcoming maintenance work',
            completed: false,
            link: '/calendar',
            actionLabel: 'View Calendar',
          },
        ],
      },
    ];
  }, [data]);

  if (isLoading) {
    return <WorkflowSkeleton />;
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Workflow Cards</h3>
        <p className="text-sm text-gray-600 dark:text-neutral-400 mt-1">
          Track your progress through common property management workflows
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              isExpanded={expandedWorkflow === workflow.id}
              onToggle={() =>
                setExpandedWorkflow(
                  expandedWorkflow === workflow.id ? null : workflow.id
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default WorkflowCards;
