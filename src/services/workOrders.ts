// Work Orders service
import { supabase } from '../lib/supabase';
import type { WorkOrder, CreateWorkOrderInput, WorkOrderFile, WorkOrderNote } from '../types';

export const workOrdersService = {
  // Fetch all work orders
  async getAll(): Promise<WorkOrder[]> {
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        property:properties(*),
        unit:units(*),
        tenant:tenants(*),
        vendor:vendors(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as WorkOrder[];
  },

  // Fetch work order by ID
  async getById(id: string): Promise<WorkOrder> {
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        property:properties(*),
        unit:units(*),
        tenant:tenants(*),
        vendor:vendors(*),
        files:work_order_files(*),
        notes:work_order_notes(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as WorkOrder;
  },

  // Create new work order
  async create(input: CreateWorkOrderInput): Promise<WorkOrder> {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('work_orders')
      .insert({
        ...input,
        status: 'new',
        created_by: userData?.user?.id || 'system',
      })
      .select()
      .single();

    if (error) throw error;
    return data as WorkOrder;
  },

  // Update work order
  async update(id: string, updates: Partial<WorkOrder>): Promise<WorkOrder> {
    const { data, error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as WorkOrder;
  },

  // Delete work order
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Assign vendor to work order
  async assignVendor(workOrderId: string, vendorId: string): Promise<WorkOrder> {
    return this.update(workOrderId, {
      assigned_vendor_id: vendorId,
      status: 'in_progress',
    });
  },

  // Update work order status
  async updateStatus(id: string, status: WorkOrder['status']): Promise<WorkOrder> {
    const updates: Partial<WorkOrder> = { status };
    
    if (status === 'completed') {
      updates.completed_date = new Date().toISOString();
    }
    
    return this.update(id, updates);
  },

  // Upload file to work order
  async uploadFile(workOrderId: string, file: File): Promise<WorkOrderFile> {
    const { data: userData } = await supabase.auth.getUser();
    const fileExt = file.name.split('.').pop();
    const fileName = `${workOrderId}/${Date.now()}.${fileExt}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('work-order-files')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('work-order-files')
      .getPublicUrl(fileName);

    // Save file record
    const { data, error } = await supabase
      .from('work_order_files')
      .insert({
        work_order_id: workOrderId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: userData?.user?.id || 'system',
      })
      .select()
      .single();

    if (error) throw error;
    return data as WorkOrderFile;
  },

  // Add note to work order
  async addNote(workOrderId: string, note: string): Promise<WorkOrderNote> {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('work_order_notes')
      .insert({
        work_order_id: workOrderId,
        note,
        created_by: userData?.user?.id || 'system',
      })
      .select()
      .single();

    if (error) throw error;
    return data as WorkOrderNote;
  },
};
