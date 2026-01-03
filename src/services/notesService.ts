import { supabase } from '../lib/supabase';

export interface Note {
  id: string;
  entity_type: 'property' | 'unit' | 'tenant' | 'task' | 'lease' | 'general';
  entity_id?: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Get notes with filters
export async function getNotes(filters?: {
  entityType?: string;
  entityId?: string;
  category?: string;
  isPinned?: boolean;
}) {
  let query = supabase
    .from('notes')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }

  if (filters?.entityId) {
    query = query.eq('entity_id', filters.entityId);
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.isPinned !== undefined) {
    query = query.eq('is_pinned', filters.isPinned);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Get notes by type
export async function getNotesByType(entityType: string) {
  return getNotes({ entityType });
}

// Create note
export async function createNote(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('notes')
    .insert([note])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update note
export async function updateNote(id: string, updates: Partial<Note>) {
  const { data, error } = await supabase
    .from('notes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Toggle pin status
export async function togglePin(id: string, isPinned: boolean) {
  return updateNote(id, { is_pinned: isPinned });
}

// Delete note
export async function deleteNote(id: string) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Search notes
export async function searchNotes(query: string) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
