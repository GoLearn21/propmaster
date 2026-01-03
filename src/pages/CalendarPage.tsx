import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CreateEventModal from '../components/modals/CreateEventModal';
import toast from 'react-hot-toast';

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*, properties(name), units(unit_number)')
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
        .order('start_time');

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.start_time?.startsWith(dateStr));
  };

  const stats = {
    total: events.length,
    maintenance: events.filter(e => e.event_type === 'maintenance').length,
    showings: events.filter(e => e.event_type === 'showing').length,
    inspections: events.filter(e => e.event_type === 'inspection').length,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
    </div>;
  }

  const days = getDaysInMonth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
            <p className="text-sm text-gray-600 mt-1">Manage maintenance, showings, and inspections</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedDate(undefined);
        }}
        onSuccess={loadEvents}
        selectedDate={selectedDate}
      />

      {/* Stats */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Maintenance</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.maintenance}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Showings</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.showings}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inspections</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.inspections}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="px-8 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={previousMonth}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-gray-50 p-3 text-center text-sm font-semibold text-gray-700">
                {day}
              </div>
            ))}
            {days.map((date, index) => {
              const dayEvents = date ? getEventsForDate(date) : [];
              const isToday = date && date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  className={`bg-white p-3 min-h-24 ${
                    date ? 'hover:bg-gray-50' : 'bg-gray-100'
                  } ${isToday ? 'ring-2 ring-teal-500' : ''}`}
                >
                  {date && (
                    <>
                      <div className={`text-sm font-medium ${
                        isToday ? 'text-teal-600' : 'text-gray-900'
                      }`}>
                        {date.getDate()}
                      </div>
                      <div className="mt-1 space-y-1">
                        {dayEvents.map(event => (
                          <div
                            key={event.id}
                            className={`text-xs px-2 py-1 rounded truncate ${
                              event.event_type === 'maintenance' ? 'bg-blue-100 text-blue-800' :
                              event.event_type === 'showing' ? 'bg-green-100 text-green-800' :
                              event.event_type === 'inspection' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
