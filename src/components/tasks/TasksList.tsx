// Tasks List Component - List View with Filtering and Sorting
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { getTasks, type Task } from '../../services/taskService';
import { TaskCard } from './TaskCard';
import toast from 'react-hot-toast';

interface TasksListProps {
  onCreateClick: () => void;
  onTaskClick: (task: Task) => void;
  refreshTrigger?: number;
}

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed';
type FilterPriority = 'all' | 'low' | 'medium' | 'high';
type SortBy = 'due_date' | 'priority' | 'created_at' | 'title';

export function TasksList({ onCreateClick, onTaskClick, refreshTrigger }: TasksListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [sortBy, setSortBy] = useState<SortBy>('due_date');

  useEffect(() => {
    loadTasks();
  }, [refreshTrigger]);

  useEffect(() => {
    filterAndSortTasks();
  }, [tasks, searchQuery, filterStatus, filterPriority, sortBy]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTasks = () => {
    let filtered = [...tasks];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.task_type.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((task) => task.status === filterStatus);
    }

    // Apply priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter((task) => task.priority === filterPriority);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredTasks(filtered);
  };

  const getTaskStats = () => {
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    ).length;

    return { pending, inProgress, completed, overdue };
  };

  const stats = getTaskStats();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-neutral-lighter p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-dark">Tasks & Maintenance</h1>
            <p className="text-neutral-medium mt-1">Manage and track all property maintenance tasks</p>
          </div>
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Task
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-neutral-medium">Pending</p>
                <p className="text-2xl font-semibold text-neutral-dark">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-neutral-medium">In Progress</p>
                <p className="text-2xl font-semibold text-neutral-dark">{stats.inProgress}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-neutral-medium">Completed</p>
                <p className="text-2xl font-semibold text-neutral-dark">{stats.completed}</p>
              </div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-neutral-medium">Overdue</p>
                <p className="text-2xl font-semibold text-neutral-dark">{stats.overdue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mt-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-medium" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
            className="px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-4 py-2.5 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          >
            <option value="due_date">Due Date</option>
            <option value="priority">Priority</option>
            <option value="created_at">Created Date</option>
            <option value="title">Title</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-neutral-light mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-dark mb-2">
              {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                ? 'No tasks found'
                : 'No tasks yet'}
            </h3>
            <p className="text-neutral-medium mb-6">
              {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first task to get started'}
            </p>
            {!searchQuery && filterStatus === 'all' && filterPriority === 'all' && (
              <button
                onClick={onCreateClick}
                className="px-6 py-2.5 bg-teal text-white rounded-lg hover:bg-teal-600 transition-colors"
              >
                Create Task
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
