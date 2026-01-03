/**
 * Workflow System Types
 * Provides guided step-by-step processes for property managers
 */

export type WorkflowCategory =
  | 'tenant'
  | 'lease'
  | 'maintenance'
  | 'financial'
  | 'property'
  | 'compliance';

export type WorkflowStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: WorkflowStepStatus;
  /** Route to navigate when clicking this step */
  navigateTo?: string;
  /** Query params to pass to the route */
  queryParams?: Record<string, string>;
  /** Action button label */
  actionLabel?: string;
  /** Estimated time to complete */
  estimatedMinutes?: number;
  /** Required for workflow completion */
  required: boolean;
  /** Tips for completing this step */
  tips?: string[];
  /** Checklist items within this step */
  checklist?: {
    id: string;
    label: string;
    completed: boolean;
  }[];
  /** Dependencies - step IDs that must be completed first */
  dependsOn?: string[];
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  category: WorkflowCategory;
  icon: string;
  color: string;
  steps: WorkflowStep[];
  /** Estimated total time in minutes */
  estimatedTotalMinutes: number;
  /** Frequency of this workflow */
  frequency: 'one-time' | 'monthly' | 'as-needed' | 'annual';
  /** Compliance requirements this workflow helps with */
  complianceNotes?: string[];
  /** State-specific variations */
  stateVariations?: {
    state: 'NC' | 'SC' | 'GA';
    notes: string[];
  }[];
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  /** Reference to related entity (tenant, property, lease, etc.) */
  entityType: 'tenant' | 'property' | 'lease' | 'unit' | 'maintenance';
  entityId: string;
  entityName: string;
  startedAt: string;
  completedAt?: string;
  currentStepId: string;
  stepStatuses: Record<string, WorkflowStepStatus>;
  stepCompletedAt: Record<string, string>;
  notes?: string;
}

export interface WorkflowProgress {
  totalSteps: number;
  completedSteps: number;
  percentage: number;
  currentStep: WorkflowStep | null;
  nextStep: WorkflowStep | null;
  estimatedRemainingMinutes: number;
}

// Category metadata
export const WORKFLOW_CATEGORIES: Record<WorkflowCategory, { label: string; color: string; icon: string }> = {
  tenant: { label: 'Tenant Management', color: 'bg-blue-500', icon: 'Users' },
  lease: { label: 'Lease Operations', color: 'bg-purple-500', icon: 'FileText' },
  maintenance: { label: 'Maintenance', color: 'bg-orange-500', icon: 'Wrench' },
  financial: { label: 'Financial', color: 'bg-green-500', icon: 'DollarSign' },
  property: { label: 'Property Setup', color: 'bg-teal-500', icon: 'Building' },
  compliance: { label: 'Compliance', color: 'bg-red-500', icon: 'Shield' }
};
