/**
 * WorkflowPipeline Component
 * Visual pipeline showing workflow progress with clickable steps
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import {
  Check,
  Circle,
  Clock,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Lightbulb,
  ExternalLink,
  SkipForward
} from 'lucide-react';
import { Workflow, WorkflowStep, WorkflowStepStatus, WorkflowProgress } from './types';

interface WorkflowPipelineProps {
  workflow: Workflow;
  stepStatuses: Record<string, WorkflowStepStatus>;
  onStepStatusChange: (stepId: string, status: WorkflowStepStatus) => void;
  onChecklistItemToggle: (stepId: string, checklistItemId: string, completed: boolean) => void;
}

export const WorkflowPipeline: React.FC<WorkflowPipelineProps> = ({
  workflow,
  stepStatuses,
  onStepStatusChange,
  onChecklistItemToggle
}) => {
  const navigate = useNavigate();
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Calculate progress
  const progress = calculateProgress(workflow, stepStatuses);

  // Get step status with fallback
  const getStepStatus = (step: WorkflowStep): WorkflowStepStatus => {
    return stepStatuses[step.id] || step.status;
  };

  // Check if step is accessible (dependencies met)
  const isStepAccessible = (step: WorkflowStep): boolean => {
    if (!step.dependsOn || step.dependsOn.length === 0) return true;
    return step.dependsOn.every(depId => {
      const depStatus = stepStatuses[depId];
      return depStatus === 'completed' || depStatus === 'skipped';
    });
  };

  // Toggle step expansion
  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  // Handle navigation
  const handleNavigate = (step: WorkflowStep) => {
    if (step.navigateTo) {
      const url = step.queryParams
        ? `${step.navigateTo}?${new URLSearchParams(step.queryParams).toString()}`
        : step.navigateTo;
      navigate(url);
    }
  };

  // Get status icon
  const getStatusIcon = (status: WorkflowStepStatus, accessible: boolean) => {
    if (!accessible) {
      return <Circle className="h-6 w-6 text-neutral-light" />;
    }
    switch (status) {
      case 'completed':
        return <Check className="h-6 w-6 text-white" />;
      case 'in_progress':
        return <Clock className="h-6 w-6 text-white animate-pulse" />;
      case 'skipped':
        return <SkipForward className="h-6 w-6 text-white" />;
      default:
        return <Circle className="h-6 w-6 text-neutral-medium" />;
    }
  };

  // Get status color
  const getStatusColor = (status: WorkflowStepStatus, accessible: boolean): string => {
    if (!accessible) return 'bg-neutral-light';
    switch (status) {
      case 'completed':
        return 'bg-accent-green';
      case 'in_progress':
        return 'bg-primary';
      case 'skipped':
        return 'bg-neutral-medium';
      default:
        return 'bg-white border-2 border-neutral-light';
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="p-6 bg-gradient-to-r from-primary to-primary-dark text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-h3 font-bold">{workflow.title}</h2>
            <p className="text-white/80">{workflow.description}</p>
          </div>
          <div className="text-right">
            <div className="text-h2 font-bold">{progress.percentage}%</div>
            <div className="text-sm text-white/80">
              {progress.completedSteps} of {progress.totalSteps} steps
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-3">
          <div
            className="bg-accent-green h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Current & Next Step */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          {progress.currentStep && (
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-white/60 uppercase">Current Step</div>
              <div className="font-medium">{progress.currentStep.title}</div>
            </div>
          )}
          {progress.nextStep && (
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-white/60 uppercase">Next Step</div>
              <div className="font-medium">{progress.nextStep.title}</div>
            </div>
          )}
        </div>

        {progress.estimatedRemainingMinutes > 0 && (
          <div className="mt-4 text-sm text-white/80">
            <Clock className="h-4 w-4 inline mr-1" />
            Estimated time remaining: {progress.estimatedRemainingMinutes} minutes
          </div>
        )}
      </Card>

      {/* Pipeline Steps */}
      <div className="relative">
        {workflow.steps.map((step, index) => {
          const status = getStepStatus(step);
          const accessible = isStepAccessible(step);
          const isExpanded = expandedSteps.has(step.id);
          const isLast = index === workflow.steps.length - 1;

          return (
            <div key={step.id} className="relative">
              {/* Connector Line */}
              {!isLast && (
                <div
                  className={`absolute left-6 top-14 w-0.5 h-full -mb-6 ${
                    status === 'completed' ? 'bg-accent-green' : 'bg-neutral-light'
                  }`}
                />
              )}

              <Card
                className={`p-4 mb-4 transition-all ${
                  !accessible ? 'opacity-50' : 'hover:shadow-md cursor-pointer'
                } ${status === 'in_progress' ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Status Circle */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getStatusColor(
                      status,
                      accessible
                    )}`}
                  >
                    {getStatusIcon(status, accessible)}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => accessible && toggleStep(step.id)}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-neutral-black">
                            {index + 1}. {step.title}
                          </h3>
                          {step.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {step.estimatedMinutes && (
                            <span className="text-xs text-neutral-medium">
                              ~{step.estimatedMinutes} min
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-medium mt-1">{step.description}</p>
                      </div>
                      {accessible && (
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-neutral-medium" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-neutral-medium" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && accessible && (
                      <div className="mt-4 space-y-4">
                        {/* Tips */}
                        {step.tips && step.tips.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                              <Lightbulb className="h-4 w-4" />
                              Tips
                            </div>
                            <ul className="text-sm text-amber-800 space-y-1">
                              {step.tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-amber-500">-</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Checklist */}
                        {step.checklist && step.checklist.length > 0 && (
                          <div className="bg-neutral-lighter rounded-lg p-3">
                            <div className="font-medium mb-2">Checklist</div>
                            <div className="space-y-2">
                              {step.checklist.map((item) => (
                                <label
                                  key={item.id}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={item.completed}
                                    onChange={(e) =>
                                      onChecklistItemToggle(step.id, item.id, e.target.checked)
                                    }
                                    className="w-4 h-4 rounded border-neutral-medium text-primary focus:ring-primary"
                                  />
                                  <span
                                    className={`text-sm ${
                                      item.completed ? 'line-through text-neutral-medium' : ''
                                    }`}
                                  >
                                    {item.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                          {step.navigateTo && (
                            <Button
                              onClick={() => handleNavigate(step)}
                              className="bg-primary hover:bg-primary-dark"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              {step.actionLabel || 'Go to Page'}
                            </Button>
                          )}

                          {status === 'pending' && (
                            <Button
                              variant="outline"
                              onClick={() => onStepStatusChange(step.id, 'in_progress')}
                            >
                              Start Step
                            </Button>
                          )}

                          {status === 'in_progress' && (
                            <Button
                              className="bg-accent-green hover:bg-accent-green-hover"
                              onClick={() => onStepStatusChange(step.id, 'completed')}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Mark Complete
                            </Button>
                          )}

                          {!step.required && status !== 'completed' && status !== 'skipped' && (
                            <Button
                              variant="ghost"
                              onClick={() => onStepStatusChange(step.id, 'skipped')}
                              className="text-neutral-medium"
                            >
                              <SkipForward className="h-4 w-4 mr-2" />
                              Skip
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Compliance Notes */}
      {workflow.complianceNotes && workflow.complianceNotes.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
            <AlertCircle className="h-5 w-5" />
            Compliance Notes
          </div>
          <ul className="text-sm text-blue-800 space-y-1">
            {workflow.complianceNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-500">-</span>
                {note}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* State Variations */}
      {workflow.stateVariations && workflow.stateVariations.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-3">State-Specific Requirements</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workflow.stateVariations.map((variation) => (
              <div key={variation.state} className="bg-neutral-lighter rounded-lg p-3">
                <div className="font-medium text-primary mb-2">{variation.state}</div>
                <ul className="text-sm text-neutral-medium space-y-1">
                  {variation.notes.map((note, i) => (
                    <li key={i}>- {note}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// Calculate workflow progress
function calculateProgress(
  workflow: Workflow,
  stepStatuses: Record<string, WorkflowStepStatus>
): WorkflowProgress {
  const totalSteps = workflow.steps.length;
  const completedSteps = workflow.steps.filter(
    (s) => stepStatuses[s.id] === 'completed' || stepStatuses[s.id] === 'skipped'
  ).length;
  const percentage = Math.round((completedSteps / totalSteps) * 100);

  const currentStep = workflow.steps.find((s) => stepStatuses[s.id] === 'in_progress') || null;
  const nextStep =
    workflow.steps.find(
      (s) => stepStatuses[s.id] !== 'completed' && stepStatuses[s.id] !== 'skipped'
    ) || null;

  const estimatedRemainingMinutes = workflow.steps
    .filter((s) => stepStatuses[s.id] !== 'completed' && stepStatuses[s.id] !== 'skipped')
    .reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);

  return {
    totalSteps,
    completedSteps,
    percentage,
    currentStep,
    nextStep,
    estimatedRemainingMinutes
  };
}

export default WorkflowPipeline;
