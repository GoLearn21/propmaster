// Tasks Page - Main page with List and Calendar Views
import React, { useState } from 'react';
import { List, Calendar } from 'lucide-react';
import { TasksList } from '../components/tasks/TasksList';
import { TasksCalendar } from '../components/tasks/TasksCalendar';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { TaskDetailsPanel } from '../components/tasks/TaskDetailsPanel';
import { type Task } from '../services/taskService';

type ViewMode = 'list' | 'calendar';

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTaskCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleTaskUpdated = () => {
    setRefreshTrigger((prev) => prev + 1);
    setSelectedTask(null);
  };

  const handleTaskDeleted = () => {
    setRefreshTrigger((prev) => prev + 1);
    setSelectedTask(null);
  };

  return (
    <div className="h-full flex flex-col bg-neutral-lighter">
      {/* View Toggle */}
      <div className="bg-white border-b border-neutral-lighter px-6 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-teal text-white'
                : 'text-neutral-dark hover:bg-neutral-lighter'
            }`}
          >
            <List className="w-5 h-5" />
            List View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'calendar'
                ? 'bg-teal text-white'
                : 'text-neutral-dark hover:bg-neutral-lighter'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Calendar View
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <TasksList
            onCreateClick={() => setIsCreateModalOpen(true)}
            onTaskClick={setSelectedTask}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <TasksCalendar onTaskClick={setSelectedTask} />
        )}
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      <TaskDetailsPanel
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />
    </div>
  );
}
