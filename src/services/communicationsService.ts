import { supabase } from '../lib/supabase';

export interface Communication {
  id: string;
  thread_id?: string;
  sender_type: 'manager' | 'tenant' | 'owner' | 'vendor' | 'system';
  sender_id: string;
  recipient_type?: 'manager' | 'tenant' | 'owner' | 'vendor' | 'broadcast';
  recipient_ids?: string[];
  subject?: string;
  body: string;
  channel: 'email' | 'sms' | 'portal' | 'push' | 'voice';
  status: 'draft' | 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduled_for?: string;
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  failed_reason?: string;
  metadata?: any;
  cost?: number;
  is_broadcast?: boolean;
  is_automated?: boolean;
  template_id?: string;
  property_id?: string;
  unit_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationThread {
  id: string;
  participants: string[];
  property_id?: string;
  unit_id?: string;
  subject?: string;
  last_message_at: string;
  last_message_preview?: string;
  is_archived: boolean;
  is_muted: boolean;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  subject?: string;
  body: string;
  merge_fields?: string[];
  tone: 'formal' | 'neutral' | 'casual' | 'friendly';
  language: string;
  is_system_template: boolean;
  usage_count: number;
  average_rating?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Get conversation threads
export async function getThreads(filters?: {
  archived?: boolean;
  muted?: boolean;
}) {
  let query = supabase
    .from('conversation_threads')
    .select('*')
    .order('last_message_at', { ascending: false });

  if (filters?.archived !== undefined) {
    query = query.eq('is_archived', filters.archived);
  }

  if (filters?.muted !== undefined) {
    query = query.eq('is_muted', filters.muted);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Get messages in a thread
export async function getThreadMessages(threadId: string) {
  const { data, error } = await supabase
    .from('communications_new')
    .select('*')
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get communications with filters
export async function getCommunications(filters?: {
  channel?: string;
  status?: string;
  recipientType?: string;
  senderId?: string;
}) {
  let query = supabase
    .from('communications_new')
    .select('*')
    .order('sent_at', { ascending: false });

  if (filters?.channel) {
    query = query.eq('channel', filters.channel);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.recipientType) {
    query = query.eq('recipient_type', filters.recipientType);
  }

  if (filters?.senderId) {
    query = query.eq('sender_id', filters.senderId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Get message templates
export async function getTemplates(category?: string) {
  let query = supabase
    .from('message_templates')
    .select('*')
    .order('usage_count', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Send message (creates communication + thread if needed)
export async function sendMessage(message: {
  recipient_ids: string[];
  recipient_type: string;
  subject?: string;
  body: string;
  channel?: string;
  template_id?: string;
  property_id?: string;
  unit_id?: string;
}) {
  // Create or get thread
  let threadId: string;

  // For now, create a new thread (in production, check for existing threads)
  const { data: thread, error: threadError } = await supabase
    .from('conversation_threads')
    .insert([{
      participants: ['current-user-id', ...message.recipient_ids],
      subject: message.subject,
      property_id: message.property_id,
      unit_id: message.unit_id,
      last_message_at: new Date().toISOString(),
      last_message_preview: message.body.substring(0, 100)
    }])
    .select()
    .single();

  if (threadError) throw threadError;
  threadId = thread.id;

  // Create message
  const { data, error } = await supabase
    .from('communications_new')
    .insert([{
      thread_id: threadId,
      sender_type: 'manager',
      sender_id: 'current-user-id',
      recipient_type: message.recipient_type,
      recipient_ids: message.recipient_ids,
      subject: message.subject,
      body: message.body,
      channel: message.channel || 'portal',
      status: 'sent',
      sent_at: new Date().toISOString(),
      template_id: message.template_id,
      property_id: message.property_id,
      unit_id: message.unit_id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update communication
export async function updateCommunication(id: string, updates: Partial<Communication>) {
  const { data, error } = await supabase
    .from('communications_new')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Mark as read
export async function markAsRead(id: string) {
  return updateCommunication(id, {
    status: 'read',
    read_at: new Date().toISOString()
  });
}

// Delete communication
export async function deleteCommunication(id: string) {
  const { error } = await supabase
    .from('communications_new')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Mark thread as read
export async function markThreadAsRead(threadId: string) {
  // Update thread unread count
  const { error: threadError } = await supabase
    .from('conversation_threads')
    .update({ unread_count: 0 })
    .eq('id', threadId);

  if (threadError) throw threadError;

  // Mark all messages as read
  const { error: messagesError } = await supabase
    .from('communications_new')
    .update({
      status: 'read',
      read_at: new Date().toISOString()
    })
    .eq('thread_id', threadId)
    .neq('status', 'read');

  if (messagesError) throw messagesError;
}

// Archive thread
export async function archiveThread(threadId: string, archived: boolean = true) {
  const { error } = await supabase
    .from('conversation_threads')
    .update({ is_archived: archived })
    .eq('id', threadId);

  if (error) throw error;
}
