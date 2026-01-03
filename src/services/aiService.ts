// AI Assistant Service - Backend Integration
import { supabase } from '../lib/supabase';

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  structuredData?: TaskDetails | TaskTable;
}

export interface TaskDetails {
  frequency?: string;
  location?: string;
  type?: string;
  overview?: string;
}

export interface TaskTable {
  type: 'table';
  headers: string[];
  rows: Array<Record<string, string>>;
}

export interface MentionData {
  properties: Array<{ type: string; id: string; name: string; display: string }>;
  units: Array<{ type: string; id: string; name: string; display: string }>;
  tenants: Array<{ type: string; id: string; name: string; display: string }>;
}

/**
 * Send message to AI assistant and get response
 */
export async function sendAIMessage(
  message: string,
  conversationHistory: Message[] = []
): Promise<{message: string; structuredData?: any; taskDetails?: TaskDetails}> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message,
        conversationHistory: conversationHistory.map(m => ({
          type: m.type,
          content: m.content
        }))
      }
    });

    if (error) {
      console.error('AI chat error:', error);
      throw new Error(error.message || 'Failed to get AI response');
    }

    // Handle nested data structure from edge function
    const responseData = data?.data || data;
    
    return {
      message: responseData.message,
      structuredData: responseData.structuredData,
      taskDetails: responseData.taskDetails
    };
  } catch (error) {
    console.error('Failed to send AI message:', error);
    throw error;
  }
}

/**
 * Create task from AI assistant recommendation
 */
export async function createTask(taskData: {
  title: string;
  description?: string;
  propertyId?: string;
  taskType?: string;
  frequency?: string;
  dueDate?: string;
  priority?: string;
  isRecurring?: boolean;
  recurrenceCount?: number;
}) {
  try {
    const { data, error } = await supabase.functions.invoke('create-task', {
      body: taskData
    });

    if (error) {
      console.error('Task creation error:', error);
      throw new Error(error.message || 'Failed to create task');
    }

    // Handle nested data structure
    const responseData = data?.data || data;
    return responseData.tasks;
  } catch (error) {
    console.error('Failed to create task:', error);
    throw error;
  }
}

/**
 * Get mention data for autocomplete (@mentions)
 */
export async function getMentionData(searchTerm: string = ''): Promise<MentionData> {
  try {
    const { data, error } = await supabase.functions.invoke('get-mention-data', {
      body: { search: searchTerm }
    });

    if (error) {
      console.error('Mention data error:', error);
      // Return empty data on error
      return { properties: [], units: [], tenants: [] };
    }

    // Handle nested data structure
    const responseData = data?.data || data;
    return responseData;
  } catch (error) {
    console.error('Failed to get mention data:', error);
    // Return empty data on error
    return { properties: [], units: [], tenants: [] };
  }
}

/**
 * Get chat history for user
 */
export async function getChatHistory() {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Chat history error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get chat history:', error);
    return [];
  }
}

/**
 * Save chat conversation
 */
export async function saveChatConversation(
  title: string,
  lastMessage: string,
  conversationId?: string
) {
  try {
    if (conversationId) {
      // Update existing conversation
      const { error } = await supabase
        .from('chat_conversations')
        .update({ title, last_message: lastMessage, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) {
        console.error('Update conversation error:', error);
      }
    } else {
      // Create new conversation
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({ title, last_message: lastMessage })
        .select()
        .single();

      if (error) {
        console.error('Create conversation error:', error);
        return null;
      }

      return data;
    }
  } catch (error) {
    console.error('Failed to save conversation:', error);
    return null;
  }
}

/**
 * Get properties for dropdown/mentions
 */
export async function getProperties() {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, name, address')
      .limit(50);

    if (error) {
      console.error('Properties error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get properties:', error);
    return [];
  }
}

/**
 * Get tenants with balance due
 */
export async function getTenantsWithBalance() {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .gt('balance_due', 0)
      .order('balance_due', { ascending: false });

    if (error) {
      console.error('Tenants error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get tenants:', error);
    return [];
  }
}

/**
 * Get upcoming tasks
 */
export async function getUpcomingTasks() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .gte('due_date', today)
      .lte('due_date', nextWeek)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Tasks error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get tasks:', error);
    return [];
  }
}
