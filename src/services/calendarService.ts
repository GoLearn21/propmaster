import { supabase } from '../lib/supabase';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  event_type: 'maintenance' | 'inspection' | 'showing' | 'meeting' | 'deadline' | 'other';
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string;
  property_id?: string;
  unit_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  attendees?: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Get events with filters
export async function getEvents(filters?: {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  propertyId?: string;
  status?: string;
}) {
  let query = supabase
    .from('calendar_events')
    .select(`
      *,
      properties (name, address),
      units (unit_number)
    `)
    .order('start_time');

  if (filters?.startDate) {
    query = query.gte('start_time', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('start_time', filters.endDate);
  }

  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }

  if (filters?.propertyId) {
    query = query.eq('property_id', filters.propertyId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Get events for a specific month
export async function getMonthEvents(year: number, month: number) {
  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  return getEvents({ startDate, endDate });
}

// Get upcoming events
export async function getUpcomingEvents(limit: number = 10) {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      properties (name, address),
      units (unit_number)
    `)
    .gte('start_time', now)
    .eq('status', 'scheduled')
    .order('start_time')
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// Create event
export async function createEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert([event])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update event
export async function updateEvent(id: string, updates: Partial<CalendarEvent>) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete event
export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Cancel event
export async function cancelEvent(id: string) {
  return updateEvent(id, { status: 'cancelled' });
}

// Complete event
export async function completeEvent(id: string) {
  return updateEvent(id, { status: 'completed' });
}

// Reschedule event
export async function rescheduleEvent(id: string, startTime: string, endTime: string) {
  return updateEvent(id, { start_time: startTime, end_time: endTime });
}
