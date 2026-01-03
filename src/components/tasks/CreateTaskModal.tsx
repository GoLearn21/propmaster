// Create Task Modal - Manual and AI-Assisted Task Creation
import React, { useState } from 'react';
import { X, Sparkles, Calendar, MapPin, Tag, AlertCircle } from 'lucide-react';
import { createTask, type CreateTaskInput } from '../../services/taskService';
import { getMentionData, type MentionData } from '../../services/aiService';
import toast from 'react-hot-toast';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
  aiSuggestion?: {
    title: string;
    description: string;
    taskType?: string;
    frequency?: string;
    location?: string;
  };
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

export function CreateTaskModal({ isOpen, onClose, onTaskCreated, aiSuggestion }: CreateTaskModalProps) {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [loading, setLoading] = useState(false);
  const [mentionData, setMentionData] = useState<MentionData | null>(null);
  
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: aiSuggestion?.title || '',
    description: aiSuggestion?.description || '',
    task_type: aiSuggestion?.taskType || 'General',
    priority: 'medium',
    frequency: aiSuggestion?.frequency || '',
  });

  React.useEffect(() => {
    if (isOpen && !mentionData) {
      loadMentionData();
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (aiSuggestion) {
      setFormData({
        title: aiSuggestion.title,
        description: aiSuggestion.description,
        task_type: aiSuggestion.taskType || 'General',
        priority: 'medium',
        frequency: aiSuggestion.frequency || '',
      });
      setMode('ai');
    }
  }, [aiSuggestion]);

  const loadMentionData = async () => {
    try {
      const data = await getMentionData();
      setMentionData(data);
    } catch (error) {
      console.error('Error loading mention data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    setLoading(true);

    try {
      await createTask(formData);
      toast.success('Task created successfully');
      onTaskCreated?.();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      task_type: 'General',
      priority: 'medium',
      frequency: '',
    });
    setMode('manual');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-lighter">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-neutral-dark">Create New Task</h2>
            {mode === 'ai' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-100 text-teal-700 text-sm font-medium rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                AI Assisted
              </span>
            )}
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="text-neutral-medium hover:text-neutral-dark transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              placeholder="e.g., HVAC Inspection"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent resize-none"
              placeholder="Provide details about the task..."
            />
          </div>

          {/* Task Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                <Tag className="w-4 h-4 inline mr-1.5" />
                Task Type
              </label>
              <select
                value={formData.task_type}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                {TASK_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                <AlertCircle className="w-4 h-4 inline mr-1.5" />
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                <Calendar className="w-4 h-4 inline mr-1.5" />
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date || ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                Frequency
              </label>
              <select
                value={formData.frequency || ''}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value || undefined })}
                className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                {FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Property Selection */}
          {mentionData && mentionData.properties.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-neutral-dark mb-2">
                <MapPin className="w-4 h-4 inline mr-1.5" />
                Property
              </label>
              <select
                value={formData.property_id || ''}
                onChange={(e) => setFormData({ ...formData, property_id: e.target.value || undefined })}
                className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              >
                <option value="">Select a property (optional)</option>
                {mentionData.properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.display}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-2">
              Assign To
            </label>
            <input
              type="text"
              value={formData.assigned_to || ''}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="w-full px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
              placeholder="e.g., John Smith or Maintenance Team"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-lighter">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-6 py-2.5 text-neutral-dark hover:bg-neutral-lighter rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-teal text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
