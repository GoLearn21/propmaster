import { supabase } from '../lib/supabase';

export interface FileAttachment {
  id: string;
  entity_type: 'property' | 'unit' | 'tenant' | 'lease' | 'work_order' | 'general';
  entity_id?: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  category: 'lease' | 'photo' | 'document' | 'contract' | 'other';
  description?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// Get files with filters
export async function getFiles(filters?: {
  entityType?: string;
  entityId?: string;
  category?: string;
}) {
  let query = supabase
    .from('file_attachments')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }

  if (filters?.entityId) {
    query = query.eq('entity_id', filters.entityId);
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Get files by category
export async function getFilesByCategory(category: string) {
  return getFiles({ category });
}

// Upload file
export async function uploadFile(
  file: File,
  metadata: Omit<FileAttachment, 'id' | 'file_name' | 'file_type' | 'file_size' | 'file_url' | 'created_at' | 'updated_at'>
) {
  try {
    // Upload to Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Create file record
    const { data, error } = await supabase
      .from('file_attachments')
      .insert([{
        ...metadata,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: publicUrl
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// Update file metadata
export async function updateFile(id: string, updates: Partial<FileAttachment>) {
  const { data, error } = await supabase
    .from('file_attachments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete file
export async function deleteFile(id: string) {
  // Get file details first
  const { data: file } = await supabase
    .from('file_attachments')
    .select('file_url')
    .eq('id', id)
    .single();

  if (file?.file_url) {
    // Extract file path from URL and delete from storage
    const fileName = file.file_url.split('/').pop();
    if (fileName) {
      await supabase.storage
        .from('documents')
        .remove([fileName]);
    }
  }

  // Delete record
  const { error } = await supabase
    .from('file_attachments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Download file
export async function downloadFile(fileUrl: string, fileName: string) {
  try {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}
