// Task Card Component - Individual Task Display
import React from 'react';
import { Calendar, MapPin, Tag, User, Repeat } from 'lucide-react';
import { type Task } from '../../services/taskService';
import { formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${
        isOverdue ? 'border-red-300 bg-red-50/30' : 'border-neutral-lighter'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title and Status */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-base font-semibold text-neutral-dark truncate">{task.title}</h3>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
              {getStatusLabel(task.status)}
            </span>
            {isOverdue && (
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 border border-red-200">
                Overdue
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-neutral-medium line-clamp-2 mb-3">{task.description}</p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-medium">
            {/* Priority */}
            <span className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium ${getPriorityColor(task.priority)}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>

            {/* Task Type */}
            <span className="flex items-center gap-1.5">
              <Tag className="w-4 h-4" />
              {task.task_type}
            </span>

            {/* Due Date */}
            {task.due_date && (
              <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Calendar className="w-4 h-4" />
                {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}

            {/* Frequency */}
            {task.frequency && (
              <span className="flex items-center gap-1.5 text-teal-600">
                <Repeat className="w-4 h-4" />
                {task.frequency}
              </span>
            )}

            {/* Assigned To */}
            {task.assigned_to && (
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {task.assigned_to}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
