// Task Management Service Layer
import { supabase } from '../lib/supabase';

export interface Task {
  id: string;
  title: string;
  description: string;
  property_id: string | null;
  task_type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  assigned_to: string | null;
  frequency: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  property_id?: string;
  task_type: string;
  status?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  assigned_to?: string;
  frequency?: string;
}

/**
 * Fetch all tasks
 */
export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get a single task by ID
 */
export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching task:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description,
      property_id: input.property_id || null,
      task_type: input.task_type,
      status: input.status || 'pending',
      priority: input.priority,
      due_date: input.due_date || null,
      assigned_to: input.assigned_to || null,
      frequency: input.frequency || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Update an existing task
 */
export async function updateTask(id: string, updates: Partial<CreateTaskInput>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    throw new Error(error.message);
  }
}

/**
 * Filter tasks by status
 */
export async function getTasksByStatus(status: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', status)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching tasks by status:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Filter tasks by priority
 */
export async function getTasksByPriority(priority: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('priority', priority)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching tasks by priority:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get tasks for a specific property
 */
export async function getTasksByProperty(propertyId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('property_id', propertyId)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching tasks by property:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get upcoming tasks (due within next 7 days)
 */
export async function getUpcomingTasks(): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .gte('due_date', today)
    .lte('due_date', nextWeek)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming tasks:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .lt('due_date', today)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Error fetching overdue tasks:', error);
    throw new Error(error.message);
  }

  return data || [];
}
