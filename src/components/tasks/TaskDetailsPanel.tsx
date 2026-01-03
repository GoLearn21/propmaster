// Task Details Panel - View and Edit Task Details
import React, { useState } from 'react';
import { X, Calendar, MapPin, Tag, User, Repeat, AlertCircle, Edit2, Save, Trash2 } from 'lucide-react';
import { updateTask, deleteTask, type Task } from '../../services/taskService';
import toast from 'react-hot-toast';

interface TaskDetailsPanelProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
  onTaskDeleted?: () => void;
}

const TASK_TYPES = [
  'Preventative Maintenance',
  'Repair',
  'Inspection',
  'Cleaning',
  'Emergency',
  'General',
  'Landscaping',
  'Pest Control',
];

const FREQUENCIES = [
  { value: '', label: 'One-time' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Bi-weekly', label: 'Bi-weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Every 6 months', label: 'Every 6 months' },
  { value: 'Annually', label: 'Annually' },
];

const PRIORITIES: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
const STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

export function TaskDetailsPanel({ task, isOpen, onClose, onTaskUpdated, onTaskDeleted }: TaskDetailsPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Task> | null>(null);

  React.useEffect(() => {
    if (task) {
      setFormData(task);
    }
  }, [task]);

  if (!isOpen || !task || !formData) return null;

  const handleSave = async () => {
    if (!task) return;

    setLoading(true);
    try {
      await updateTask(task.id, {
        title: formData.title || '',
        description: formData.description || '',
        task_type: formData.task_type || 'General',
        priority: formData.priority as 'low' | 'medium' | 'high',
        status: formData.status,
        due_date: formData.due_date || undefined,
        assigned_to: formData.assigned_to || undefined,
        frequency: formData.frequency || undefined,
      });
      toast.success('Task updated successfully');
      setIsEditing(false);
      onTaskUpdated?.();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await deleteTask(task.id);
      toast.success('Task deleted successfully');
      onTaskDeleted?.();
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <div className="bg-white rounded-t-lg md:rounded-lg shadow-xl w-full md:w-[600px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-lighter">
          <h2 className="text-xl font-semibold text-neutral-dark">Task Details</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-neutral-medium hover:text-teal transition-colors"
                  title="Edit task"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-neutral-medium hover:text-red-600 transition-colors"
                  title="Delete task"
                  disabled={loading}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData(task);
                onClose();
              }}
              className="p-2 text-neutral-medium hover:text-neutral-dark transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-neutral-medium mb-2">Title</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              />
            ) : (
              <p className="text-lg font-semibold text-neutral-dark">{task.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-medium mb-2">Description</label>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent resize-none"
              />
            ) : (
              <p className="text-neutral-dark whitespace-pre-wrap">{task.description || 'No description provided'}</p>
            )}
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-medium mb-2">
                <AlertCircle className="w-4 h-4 inline mr-1.5" />
                Status
              </label>
              {isEditing ? (
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={`inline-block px-3 py-1.5 text-sm font-medium rounded ${getStatusColor(task.status)}`}>
                  {task.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-medium mb-2">
                <AlertCircle className="w-4 h-4 inline mr-1.5" />
                Priority
              </label>
              {isEditing ? (
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={`text-base font-semibold ${getPriorityColor(task.priority)}`}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </span>
              )}
            </div>
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-medium mb-2">
              <Tag className="w-4 h-4 inline mr-1.5" />
              Task Type
            </label>
            {isEditing ? (
              <select
                value={formData.task_type}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                {TASK_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            ) : (
              <p className="text-neutral-dark">{task.task_type}</p>
            )}
          </div>

          {/* Due Date and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-medium mb-2">
                <Calendar className="w-4 h-4 inline mr-1.5" />
                Due Date
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                />
              ) : (
                <p className="text-neutral-dark">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-medium mb-2">
                <Repeat className="w-4 h-4 inline mr-1.5" />
                Frequency
              </label>
              {isEditing ? (
                <select
                  value={formData.frequency || ''}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value || null })}
                  className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                >
                  {FREQUENCIES.map((freq) => (
                    <option key={freq.value} value={freq.value}>{freq.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-neutral-dark">{task.frequency || 'One-time'}</p>
              )}
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-neutral-medium mb-2">
              <User className="w-4 h-4 inline mr-1.5" />
              Assigned To
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.assigned_to || ''}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                placeholder="Not assigned"
              />
            ) : (
              <p className="text-neutral-dark">{task.assigned_to || 'Not assigned'}</p>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-neutral-lighter">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-neutral-medium">Created</p>
                <p className="text-neutral-dark font-medium mt-1">
                  {new Date(task.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-neutral-medium">Last Updated</p>
                <p className="text-neutral-dark font-medium mt-1">
                  {new Date(task.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-lighter">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData(task);
                }}
                className="px-6 py-2.5 text-neutral-dark hover:bg-neutral-lighter rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
