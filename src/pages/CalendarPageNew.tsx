import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  List,
  Grid,
  Search,
  Clock,
  MapPin,
  Building,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { createEvent, updateEvent, deleteEvent, completeEvent, cancelEvent } from '../services/calendarService';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string;
  property_id?: string;
  unit_id?: string;
  status: string;
  created_by: string;
  properties?: { name: string };
  units?: { unit_number: string };
}

export default function CalendarPageNew() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'maintenance',
    start_time: '',
    end_time: '',
    all_day: false,
    location: '',
    property_id: '',
    status: 'scheduled',
    created_by: 'admin'
  });

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  useEffect(() => {
    filterEvents();
  }, [events, filterType, searchQuery]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Load events for 3 months (previous, current, next) for better navigation
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*, properties(name), units(unit_number)')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time');

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error loading events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.event_type === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.location?.toLowerCase().includes(query)
      );
    }

    setFilteredEvents(filtered);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const eventData = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        property_id: formData.property_id || undefined
      };

      await createEvent(eventData as any);
      toast.success('Event created successfully');
      setShowCreateModal(false);
      resetForm();
      loadEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event');
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;
    try {
      const eventData = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
      };

      await updateEvent(selectedEvent.id, eventData);
      toast.success('Event updated successfully');
      setShowEventModal(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update event');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteEvent(id);
      toast.success('Event deleted successfully');
      setShowEventModal(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete event');
    }
  };

  const handleCompleteEvent = async (id: string) => {
    try {
      await completeEvent(id);
      toast.success('Event marked as completed');
      setShowEventModal(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete event');
    }
  };

  const handleCancelEvent = async (id: string) => {
    try {
      await cancelEvent(id);
      toast.success('Event cancelled');
      setShowEventModal(false);
      setSelectedEvent(null);
      loadEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel event');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'maintenance',
      start_time: '',
      end_time: '',
      all_day: false,
      location: '',
      property_id: '',
      status: 'scheduled',
      created_by: 'admin'
    });
  };

  const openCreateModal = (date?: Date) => {
    resetForm();
    if (date) {
      const dateStr = date.toISOString().slice(0, 16);
      setFormData(prev => ({
        ...prev,
        start_time: dateStr,
        end_time: dateStr
      }));
    }
    setShowCreateModal(true);
  };

  const openEventDetails = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      start_time: event.start_time.slice(0, 16),
      end_time: event.end_time.slice(0, 16),
      all_day: event.all_day,
      location: event.location || '',
      property_id: event.property_id || '',
      status: event.status,
      created_by: event.created_by
    });
    setShowEventModal(true);
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
    return filteredEvents.filter(event => event.start_time?.startsWith(dateStr));
  };

  const navigateToMonth = (year: number, month: number) => {
    setCurrentDate(new Date(year, month, 1));
    setShowYearMonthPicker(false);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      maintenance: 'bg-blue-100 text-blue-800 border-blue-200',
      inspection: 'bg-purple-100 text-purple-800 border-purple-200',
      showing: 'bg-green-100 text-green-800 border-green-200',
      meeting: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      deadline: 'bg-red-100 text-red-800 border-red-200',
      other: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type] || colors.other;
  };

  const stats = {
    total: filteredEvents.length,
    maintenance: filteredEvents.filter(e => e.event_type === 'maintenance').length,
    showings: filteredEvents.filter(e => e.event_type === 'showing').length,
    inspections: filteredEvents.filter(e => e.event_type === 'inspection').length,
    scheduled: filteredEvents.filter(e => e.status === 'scheduled').length,
  };

  const days = getDaysInMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
            <p className="text-sm text-gray-600 mt-1">Manage maintenance, showings, and inspections</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2"
            >
              {viewMode === 'calendar' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              <span>{viewMode === 'calendar' ? 'List View' : 'Calendar View'}</span>
            </button>
            <button
              onClick={() => openCreateModal()}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
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
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.scheduled}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-teal-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="px-8 pb-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Types</option>
                <option value="maintenance">Maintenance</option>
                <option value="inspection">Inspection</option>
                <option value="showing">Showing</option>
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar or List View */}
      {viewMode === 'calendar' ? (
        <>
          {/* Calendar Navigation */}
          <div className="px-8 py-4 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2
                  onClick={() => setShowYearMonthPicker(!showYearMonthPicker)}
                  className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-teal-600"
                >
                  {monthName}
                </h2>
                {showYearMonthPicker && (
                  <div className="absolute top-64 left-8 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10">
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 12 }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => navigateToMonth(currentYear, i)}
                          className={`px-3 py-2 rounded-md ${
                            i === currentMonth
                              ? 'bg-teal-600 text-white'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {new Date(2000, i).toLocaleDateString('en-US', { month: 'short' })}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <button
                        onClick={() => navigateToMonth(currentYear - 1, currentMonth)}
                        className="px-3 py-2 hover:bg-gray-100 rounded-md"
                      >
                        {currentYear - 1}
                      </button>
                      <span className="font-semibold">{currentYear}</span>
                      <button
                        onClick={() => navigateToMonth(currentYear + 1, currentMonth)}
                        className="px-3 py-2 hover:bg-gray-100 rounded-md"
                      >
                        {currentYear + 1}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={previousMonth}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                  title="Next Month"
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
                      onClick={() => date && openCreateModal(date)}
                      className={`bg-white p-3 min-h-32 cursor-pointer ${
                        date ? 'hover:bg-gray-50' : 'bg-gray-100'
                      } ${isToday ? 'ring-2 ring-teal-500 ring-inset' : ''}`}
                    >
                      {date && (
                        <>
                          <div className={`text-sm font-medium mb-2 ${
                            isToday ? 'text-teal-600 font-bold' : 'text-gray-900'
                          }`}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map(event => (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEventDetails(event);
                                }}
                                className={`text-xs px-2 py-1 rounded border cursor-pointer hover:shadow-md transition-shadow ${getEventColor(event.event_type)}`}
                              >
                                <div className="font-medium truncate">{event.title}</div>
                                <div className="text-xs opacity-75">
                                  {new Date(event.start_time).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-600 px-2">
                                +{dayEvents.length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* List View */
        <div className="px-8 py-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No events found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => openEventDetails(event)}
                    className="p-6 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEventColor(event.event_type)}`}>
                            {event.event_type}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            event.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                            event.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {event.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              {new Date(event.start_time).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {event.location && (
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.properties && (
                            <div className="flex items-center space-x-2">
                              <Building className="w-4 h-4" />
                              <span>{event.properties.name}</span>
                            </div>
                          )}
                        </div>
                        {event.description && (
                          <p className="mt-2 text-sm text-gray-600">{event.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Create New Event</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
                <select
                  required
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="inspection">Inspection</option>
                  <option value="showing">Property Showing</option>
                  <option value="meeting">Meeting</option>
                  <option value="deadline">Deadline</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={formData.all_day}
                  onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <label htmlFor="all_day" className="ml-2 text-sm text-gray-700">
                  All day event
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowEventModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Event Details</h2>
              <button onClick={() => setShowEventModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Event Info */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedEvent.title}</h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEventColor(selectedEvent.event_type)}`}>
                    {selectedEvent.event_type}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedEvent.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    selectedEvent.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedEvent.status}
                  </span>
                </div>
              </div>

              {selectedEvent.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                  <p className="text-gray-600">{selectedEvent.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Start Time</h4>
                  <p className="text-gray-900">
                    {new Date(selectedEvent.start_time).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">End Time</h4>
                  <p className="text-gray-900">
                    {new Date(selectedEvent.end_time).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
              </div>

              {selectedEvent.location && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Location</h4>
                  <p className="text-gray-900">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.properties && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Property</h4>
                  <p className="text-gray-900">{selectedEvent.properties.name}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedEvent.status === 'scheduled' && (
                  <>
                    <button
                      onClick={() => handleCompleteEvent(selectedEvent.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete</span>
                    </button>
                    <button
                      onClick={() => handleCancelEvent(selectedEvent.id)}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center justify-center space-x-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
