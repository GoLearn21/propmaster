/**
 * WorkflowsPage Component
 * Main page for selecting and managing workflows
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import {
  Play,
  Clock,
  CheckCircle,
  Users,
  FileText,
  Wrench,
  DollarSign,
  Building,
  Shield,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  UserPlus,
  LogOut,
  Calculator,
  Filter
} from 'lucide-react';
import { WorkflowPipeline } from './WorkflowPipeline';
import { WORKFLOW_TEMPLATES, getWorkflowById } from './workflowTemplates';
import { Workflow, WorkflowStepStatus, WorkflowCategory, WORKFLOW_CATEGORIES } from './types';

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  UserPlus,
  DollarSign,
  LogOut,
  Wrench,
  RefreshCw,
  Building,
  Calculator,
  Users,
  FileText,
  Shield
};

interface ActiveWorkflow {
  workflowId: string;
  entityName?: string;
  stepStatuses: Record<string, WorkflowStepStatus>;
  startedAt: string;
}

export const WorkflowsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<WorkflowCategory | 'all'>('all');
  const [activeWorkflow, setActiveWorkflow] = useState<ActiveWorkflow | null>(null);
  const [savedWorkflows, setSavedWorkflows] = useState<ActiveWorkflow[]>([]);

  // Load saved workflows from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('propmaster_workflows');
    if (saved) {
      setSavedWorkflows(JSON.parse(saved));
    }
  }, []);

  // Save workflows to localStorage
  const saveWorkflows = (workflows: ActiveWorkflow[]) => {
    localStorage.setItem('propmaster_workflows', JSON.stringify(workflows));
    setSavedWorkflows(workflows);
  };

  // Start a new workflow
  const startWorkflow = (workflow: Workflow, entityName?: string) => {
    const newActive: ActiveWorkflow = {
      workflowId: workflow.id,
      entityName,
      stepStatuses: {},
      startedAt: new Date().toISOString()
    };
    setActiveWorkflow(newActive);
  };

  // Resume a saved workflow
  const resumeWorkflow = (saved: ActiveWorkflow) => {
    setActiveWorkflow(saved);
  };

  // Save and exit current workflow
  const saveAndExit = () => {
    if (activeWorkflow) {
      const existing = savedWorkflows.findIndex((w) => w.workflowId === activeWorkflow.workflowId);
      let updated: ActiveWorkflow[];
      if (existing >= 0) {
        updated = [...savedWorkflows];
        updated[existing] = activeWorkflow;
      } else {
        updated = [...savedWorkflows, activeWorkflow];
      }
      saveWorkflows(updated);
    }
    setActiveWorkflow(null);
  };

  // Update step status
  const handleStepStatusChange = (stepId: string, status: WorkflowStepStatus) => {
    if (activeWorkflow) {
      setActiveWorkflow({
        ...activeWorkflow,
        stepStatuses: {
          ...activeWorkflow.stepStatuses,
          [stepId]: status
        }
      });
    }
  };

  // Update checklist item
  const handleChecklistToggle = (stepId: string, itemId: string, completed: boolean) => {
    // In a real app, this would update the workflow instance in the database
    console.log('Checklist toggle:', stepId, itemId, completed);
  };

  // Filter workflows by category
  const filteredWorkflows =
    selectedCategory === 'all'
      ? WORKFLOW_TEMPLATES
      : WORKFLOW_TEMPLATES.filter((w) => w.category === selectedCategory);

  // Get icon component
  const getIcon = (iconName: string): React.ElementType => {
    return ICON_MAP[iconName] || FileText;
  };

  // If workflow is active, show pipeline
  if (activeWorkflow) {
    const workflow = getWorkflowById(activeWorkflow.workflowId);
    if (!workflow) return null;

    return (
      <div className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={saveAndExit} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Save & Return to Workflows
        </Button>

        {activeWorkflow.entityName && (
          <div className="mb-4 text-neutral-medium">
            Working with: <span className="font-medium text-neutral-black">{activeWorkflow.entityName}</span>
          </div>
        )}

        <WorkflowPipeline
          workflow={workflow}
          stepStatuses={activeWorkflow.stepStatuses}
          onStepStatusChange={handleStepStatusChange}
          onChecklistItemToggle={handleChecklistToggle}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-lighter">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-12 px-6">
        <div className="container mx-auto">
          <h1 className="text-h1 font-bold mb-2">Guided Workflows</h1>
          <p className="text-white/80 text-lg">
            Step-by-step guidance for common property management tasks
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* In Progress Workflows */}
        {savedWorkflows.length > 0 && (
          <div className="mb-8">
            <h2 className="text-h3 font-semibold mb-4">Continue Where You Left Off</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedWorkflows.map((saved) => {
                const workflow = getWorkflowById(saved.workflowId);
                if (!workflow) return null;
                const completedCount = Object.values(saved.stepStatuses).filter(
                  (s) => s === 'completed' || s === 'skipped'
                ).length;
                const progress = Math.round((completedCount / workflow.steps.length) * 100);
                const IconComponent = getIcon(workflow.icon);

                return (
                  <Card
                    key={saved.workflowId}
                    className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => resumeWorkflow(saved)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${workflow.color} bg-opacity-20`}>
                        <IconComponent className={`h-6 w-6 text-primary`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-neutral-black">{workflow.title}</h3>
                        {saved.entityName && (
                          <p className="text-sm text-neutral-medium">{saved.entityName}</p>
                        )}
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-neutral-medium mb-1">
                            <span>{progress}% complete</span>
                            <span>
                              {completedCount}/{workflow.steps.length} steps
                            </span>
                          </div>
                          <div className="w-full bg-neutral-light rounded-full h-2">
                            <div
                              className="bg-accent-green h-2 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-neutral-medium" />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All Workflows
            </Button>
            {Object.entries(WORKFLOW_CATEGORIES).map(([key, { label, icon }]) => {
              const IconComponent = ICON_MAP[icon] || FileText;
              return (
                <Button
                  key={key}
                  variant={selectedCategory === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(key as WorkflowCategory)}
                >
                  <IconComponent className="h-4 w-4 mr-1" />
                  {label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Workflow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow) => {
            const IconComponent = getIcon(workflow.icon);
            const categoryInfo = WORKFLOW_CATEGORIES[workflow.category];

            return (
              <Card
                key={workflow.id}
                className="overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Card Header */}
                <div className={`${workflow.color} p-4 text-white`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{workflow.title}</h3>
                      <span className="text-xs text-white/80">{categoryInfo.label}</span>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <p className="text-sm text-neutral-medium mb-4">{workflow.description}</p>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-neutral-medium mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      ~{workflow.estimatedTotalMinutes} min
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      {workflow.steps.length} steps
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {workflow.frequency}
                    </Badge>
                  </div>

                  {/* Steps Preview */}
                  <div className="space-y-2 mb-4">
                    {workflow.steps.slice(0, 3).map((step, idx) => (
                      <div key={step.id} className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 rounded-full bg-neutral-light flex items-center justify-center text-xs font-medium">
                          {idx + 1}
                        </div>
                        <span className="text-neutral-medium truncate">{step.title}</span>
                      </div>
                    ))}
                    {workflow.steps.length > 3 && (
                      <div className="text-xs text-neutral-medium pl-7">
                        +{workflow.steps.length - 3} more steps
                      </div>
                    )}
                  </div>

                  {/* State Compliance */}
                  {workflow.stateVariations && (
                    <div className="flex items-center gap-1 mb-4">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-xs text-neutral-medium">
                        Compliant with:{' '}
                        {workflow.stateVariations.map((v) => v.state).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Start Button */}
                  <Button
                    className="w-full bg-primary hover:bg-primary-dark group-hover:shadow-md"
                    onClick={() => startWorkflow(workflow)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Workflow
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredWorkflows.length === 0 && (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 text-neutral-light mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-medium">No workflows in this category</h3>
            <p className="text-neutral-medium">Try selecting a different category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowsPage;
