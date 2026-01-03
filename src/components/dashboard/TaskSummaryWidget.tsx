import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../ui';
import { CheckCircle2, Clock, AlertCircle, ListTodo } from 'lucide-react';
import { TaskSummary as TaskSummaryType } from '../../services/dashboardService';

interface TaskSummaryWidgetProps {
  summary: TaskSummaryType;
  loading?: boolean;
}

export const TaskSummaryWidget: React.FC<TaskSummaryWidgetProps> = ({ summary, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Summary</CardTitle>
          <CardDescription>Current task status overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = summary.pending + summary.inProgress + summary.completed;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Summary</CardTitle>
        <CardDescription>Overview of all tasks and their current status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-status-warning/5 rounded-lg border border-status-warning/20">
              <div className="h-10 w-10 bg-status-warning/10 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-status-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-black">{summary.pending}</p>
                <p className="text-xs text-neutral-medium">Pending</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-status-info/5 rounded-lg border border-status-info/20">
              <div className="h-10 w-10 bg-status-info/10 rounded-lg flex items-center justify-center">
                <ListTodo className="h-5 w-5 text-status-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-black">{summary.inProgress}</p>
                <p className="text-xs text-neutral-medium">In Progress</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-status-success/5 rounded-lg border border-status-success/20">
              <div className="h-10 w-10 bg-status-success/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-status-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-black">{summary.completed}</p>
                <p className="text-xs text-neutral-medium">Completed</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-status-error/5 rounded-lg border border-status-error/20">
              <div className="h-10 w-10 bg-status-error/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-status-error" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-black">{summary.overdue}</p>
                <p className="text-xs text-neutral-medium">Overdue</p>
              </div>
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="pt-4 border-t border-neutral-light">
            <p className="text-sm font-medium text-neutral-dark mb-3">Priority Distribution</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-medium">High Priority</span>
                  <Badge variant="error" size="sm">{summary.byPriority.high}</Badge>
                </div>
                <div className="h-2 bg-neutral-lighter rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-status-error rounded-full transition-all duration-300"
                    style={{ width: `${total > 0 ? (summary.byPriority.high / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-medium">Medium Priority</span>
                  <Badge variant="warning" size="sm">{summary.byPriority.medium}</Badge>
                </div>
                <div className="h-2 bg-neutral-lighter rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-status-warning rounded-full transition-all duration-300"
                    style={{ width: `${total > 0 ? (summary.byPriority.medium / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-medium">Low Priority</span>
                  <Badge variant="info" size="sm">{summary.byPriority.low}</Badge>
                </div>
                <div className="h-2 bg-neutral-lighter rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-status-info rounded-full transition-all duration-300"
                    style={{ width: `${total > 0 ? (summary.byPriority.low / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="pt-4 border-t border-neutral-light">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-dark">Completion Rate</span>
              <span className="text-sm font-bold text-primary">
                {total > 0 ? Math.round((summary.completed / total) * 100) : 0}%
              </span>
            </div>
            <div className="h-3 bg-neutral-lighter rounded-full overflow-hidden mt-2">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent-green rounded-full transition-all duration-300"
                style={{ width: `${total > 0 ? (summary.completed / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
