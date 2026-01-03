// Tasks Calendar View - Monthly Calendar with Task Events
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTasks, type Task } from '../../services/taskService';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

interface TasksCalendarProps {
  onTaskClick: (task: Task) => void;
}

export function TasksCalendar({ onTaskClick }: TasksCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get tasks for a specific day
  const getTasksForDay = (date: Date) => {
    return tasks.filter((task) => task.due_date && isSameDay(new Date(task.due_date), date));
  };

  // Get the day of week for the first day (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = monthStart.getDay();
  
  // Create array of empty cells for padding before first day
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-700';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-700';
      case 'low':
        return 'bg-blue-100 border-blue-300 text-blue-700';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-700';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-neutral-lighter">
        <h2 className="text-xl font-semibold text-neutral-dark">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 text-neutral-medium hover:text-neutral-dark hover:bg-neutral-lighter rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 text-sm text-neutral-dark hover:bg-neutral-lighter rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 text-neutral-medium hover:text-neutral-dark hover:bg-neutral-lighter rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal"></div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-px mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-neutral-medium py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="flex-1 grid grid-cols-7 gap-px bg-neutral-lighter border border-neutral-lighter rounded-lg overflow-hidden">
              {/* Padding days */}
              {paddingDays.map((_, index) => (
                <div key={`padding-${index}`} className="bg-neutral-lighter/50"></div>
              ))}
              
              {/* Actual days */}
              {daysInMonth.map((date) => {
                const dayTasks = getTasksForDay(date);
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`bg-white p-2 min-h-[120px] ${
                      !isSameMonth(date, currentMonth) ? 'opacity-50' : ''
                    }`}
                  >
                    <div className={`text-sm font-medium mb-2 ${
                      isToday 
                        ? 'bg-teal text-white w-7 h-7 flex items-center justify-center rounded-full' 
                        : 'text-neutral-dark'
                    }`}>
                      {format(date, 'd')}
                    </div>
                    
                    {/* Tasks for this day */}
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <button
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className={`w-full text-left px-2 py-1 text-xs border rounded truncate hover:shadow-sm transition-all ${getPriorityColor(task.priority)}`}
                          title={task.title}
                        >
                          {task.title}
                        </button>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-neutral-medium px-2">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
