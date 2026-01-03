/**
 * Tenant Maintenance Service
 * Handles maintenance request CRUD operations for tenants
 * Includes real-time subscriptions for status updates
 */

import { supabase } from '../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Maintenance request category
 */
export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliances'
  | 'carpentry'
  | 'painting'
  | 'flooring'
  | 'roofing'
  | 'landscaping'
  | 'cleaning'
  | 'other';

/**
 * Maintenance request priority
 */
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'emergency';

/**
 * Maintenance request status
 */
export type MaintenanceStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'on_hold';

/**
 * Maintenance request interface
 */
export interface MaintenanceRequest {
  id: string;
  property_id: string;
  unit_id?: string;
  tenant_id: string;
  vendor_id?: string;
  title: string;
  description?: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  estimated_cost?: number;
  actual_cost?: number;
  scheduled_date?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
  completed_date?: string;
  tenant_notes?: string;
  tenant_preferred_time?: string;
  entry_permission: boolean;
  entry_instructions?: string;
  tenant_rating?: number;
  tenant_feedback?: string;
  vendor_arrival_time?: string;
  vendor_completion_time?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  property?: {
    id: string;
    name: string;
    address: string;
  };
  unit?: {
    id: string;
    unit_number: string;
  };
  vendor?: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string;
    company_name?: string;
  };
  images?: MaintenanceImage[];
  status_history?: MaintenanceStatusHistory[];
}

/**
 * Maintenance request image
 */
export interface MaintenanceImage {
  id: string;
  work_order_id: string;
  uploaded_by?: string;
  uploaded_by_role: 'tenant' | 'vendor' | 'manager';
  image_url: string;
  thumbnail_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  caption?: string;
  image_order: number;
  created_at: string;
}

/**
 * Maintenance status history entry
 */
export interface MaintenanceStatusHistory {
  id: string;
  work_order_id: string;
  old_status?: MaintenanceStatus;
  new_status: MaintenanceStatus;
  changed_by?: string;
  changed_by_role?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Create maintenance request input
 */
export interface CreateMaintenanceRequestInput {
  title: string;
  description?: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  tenant_notes?: string;
  tenant_preferred_time?: string;
  entry_permission?: boolean;
  entry_instructions?: string;
  images?: File[];
}

/**
 * Category display info
 */
export const MAINTENANCE_CATEGORIES: Record<MaintenanceCategory, { label: string; icon: string; description: string }> = {
  plumbing: {
    label: 'Plumbing',
    icon: 'droplet',
    description: 'Leaks, clogs, water heater, faucets, toilets',
  },
  electrical: {
    label: 'Electrical',
    icon: 'zap',
    description: 'Outlets, switches, lighting, breakers',
  },
  hvac: {
    label: 'HVAC',
    icon: 'thermometer',
    description: 'Heating, cooling, ventilation, air quality',
  },
  appliances: {
    label: 'Appliances',
    icon: 'refrigerator',
    description: 'Refrigerator, stove, dishwasher, washer/dryer',
  },
  carpentry: {
    label: 'Carpentry',
    icon: 'hammer',
    description: 'Doors, cabinets, trim, structural repairs',
  },
  painting: {
    label: 'Painting',
    icon: 'paintbrush',
    description: 'Interior/exterior paint, touch-ups, wallpaper',
  },
  flooring: {
    label: 'Flooring',
    icon: 'grid',
    description: 'Carpet, tile, hardwood, vinyl repairs',
  },
  roofing: {
    label: 'Roofing',
    icon: 'home',
    description: 'Leaks, shingles, gutters, skylights',
  },
  landscaping: {
    label: 'Landscaping',
    icon: 'leaf',
    description: 'Lawn, trees, irrigation, outdoor maintenance',
  },
  cleaning: {
    label: 'Cleaning',
    icon: 'sparkles',
    description: 'Deep cleaning, pest control, mold remediation',
  },
  other: {
    label: 'Other',
    icon: 'help-circle',
    description: 'General repairs and miscellaneous requests',
  },
};

/**
 * Priority display info
 */
export const MAINTENANCE_PRIORITIES: Record<MaintenancePriority, { label: string; color: string; description: string }> = {
  low: {
    label: 'Low',
    color: 'neutral',
    description: 'Non-urgent, can be scheduled at convenience',
  },
  medium: {
    label: 'Medium',
    color: 'warning',
    description: 'Should be addressed within a few days',
  },
  high: {
    label: 'High',
    color: 'error',
    description: 'Needs attention within 24-48 hours',
  },
  emergency: {
    label: 'Emergency',
    color: 'error',
    description: 'Immediate safety concern, after-hours if needed',
  },
};

/**
 * Status display info
 */
export const MAINTENANCE_STATUSES: Record<MaintenanceStatus, { label: string; color: string; description: string }> = {
  open: {
    label: 'Open',
    color: 'primary',
    description: 'Request submitted, awaiting review',
  },
  assigned: {
    label: 'Assigned',
    color: 'secondary',
    description: 'Technician assigned to the request',
  },
  in_progress: {
    label: 'In Progress',
    color: 'warning',
    description: 'Work is currently being performed',
  },
  completed: {
    label: 'Completed',
    color: 'success',
    description: 'Work has been finished',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'neutral',
    description: 'Request was cancelled',
  },
  on_hold: {
    label: 'On Hold',
    color: 'neutral',
    description: 'Waiting for parts or scheduling',
  },
};

/**
 * Get all maintenance requests for a tenant
 */
export async function getMaintenanceRequests(
  tenantId: string,
  filters?: {
    status?: MaintenanceStatus[];
    category?: MaintenanceCategory[];
    priority?: MaintenancePriority[];
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<MaintenanceRequest[]> {
  try {
    let query = supabase
      .from('work_orders')
      .select(`
        *,
        property:properties(id, name, address),
        unit:units(id, unit_number),
        vendor:people!work_orders_vendor_id_fkey(id, first_name, last_name, phone, company_name)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters?.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }
    if (filters?.priority && filters.priority.length > 0) {
      query = query.in('priority', filters.priority);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching maintenance requests:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    return [];
  }
}

/**
 * Get a single maintenance request by ID
 */
export async function getMaintenanceRequest(
  requestId: string,
  tenantId: string
): Promise<MaintenanceRequest | null> {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        property:properties(id, name, address),
        unit:units(id, unit_number),
        vendor:people!work_orders_vendor_id_fkey(id, first_name, last_name, phone, company_name)
      `)
      .eq('id', requestId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('Error fetching maintenance request:', error);
      return null;
    }

    // Fetch images
    const { data: images } = await supabase
      .from('maintenance_request_images')
      .select('*')
      .eq('work_order_id', requestId)
      .order('image_order', { ascending: true });

    // Fetch status history
    const { data: statusHistory } = await supabase
      .from('maintenance_status_history')
      .select('*')
      .eq('work_order_id', requestId)
      .order('created_at', { ascending: true });

    return {
      ...data,
      images: images || [],
      status_history: statusHistory || [],
    };
  } catch (error) {
    console.error('Error fetching maintenance request:', error);
    return null;
  }
}

/**
 * Create a new maintenance request
 */
export async function createMaintenanceRequest(
  tenantId: string,
  leaseId: string,
  input: CreateMaintenanceRequestInput
): Promise<{ success: boolean; request?: MaintenanceRequest; error?: string }> {
  try {
    // Get property and unit from lease
    const { data: lease, error: leaseError } = await supabase
      .from('leases')
      .select('property_id, unit_id')
      .eq('id', leaseId)
      .single();

    if (leaseError || !lease) {
      return {
        success: false,
        error: 'Could not find your lease information',
      };
    }

    // Create the work order
    const { data: workOrder, error: createError } = await supabase
      .from('work_orders')
      .insert({
        property_id: lease.property_id,
        unit_id: lease.unit_id,
        tenant_id: tenantId,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        status: 'open',
        tenant_notes: input.tenant_notes,
        tenant_preferred_time: input.tenant_preferred_time,
        entry_permission: input.entry_permission ?? true,
        entry_instructions: input.entry_instructions,
      })
      .select()
      .single();

    if (createError || !workOrder) {
      console.error('Error creating maintenance request:', createError);
      return {
        success: false,
        error: 'Failed to create maintenance request',
      };
    }

    // Record initial status in history
    await supabase.from('maintenance_status_history').insert({
      work_order_id: workOrder.id,
      old_status: null,
      new_status: 'open',
      changed_by_role: 'tenant',
      notes: 'Request submitted by tenant',
    });

    // Upload images if provided
    if (input.images && input.images.length > 0) {
      await uploadMaintenanceImages(workOrder.id, tenantId, input.images);
    }

    // Fetch the complete request
    const request = await getMaintenanceRequest(workOrder.id, tenantId);

    return {
      success: true,
      request: request || workOrder,
    };
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    return {
      success: false,
      error: 'Failed to create maintenance request',
    };
  }
}

/**
 * Update a maintenance request (tenant can only update certain fields)
 */
export async function updateMaintenanceRequest(
  requestId: string,
  tenantId: string,
  updates: {
    tenant_notes?: string;
    tenant_preferred_time?: string;
    entry_permission?: boolean;
    entry_instructions?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('work_orders')
      .update(updates)
      .eq('id', requestId)
      .eq('tenant_id', tenantId)
      .in('status', ['open', 'assigned']); // Only allow updates before work starts

    if (error) {
      console.error('Error updating maintenance request:', error);
      return {
        success: false,
        error: 'Failed to update maintenance request',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating maintenance request:', error);
    return {
      success: false,
      error: 'Failed to update maintenance request',
    };
  }
}

/**
 * Cancel a maintenance request
 */
export async function cancelMaintenanceRequest(
  requestId: string,
  tenantId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check current status
    const { data: currentRequest } = await supabase
      .from('work_orders')
      .select('status')
      .eq('id', requestId)
      .eq('tenant_id', tenantId)
      .single();

    if (!currentRequest) {
      return {
        success: false,
        error: 'Maintenance request not found',
      };
    }

    // Only allow cancellation of open or assigned requests
    if (!['open', 'assigned'].includes(currentRequest.status)) {
      return {
        success: false,
        error: 'Cannot cancel a request that is already in progress or completed',
      };
    }

    // Update status
    const { error } = await supabase
      .from('work_orders')
      .update({ status: 'cancelled' })
      .eq('id', requestId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error cancelling maintenance request:', error);
      return {
        success: false,
        error: 'Failed to cancel maintenance request',
      };
    }

    // Record in status history
    await supabase.from('maintenance_status_history').insert({
      work_order_id: requestId,
      old_status: currentRequest.status,
      new_status: 'cancelled',
      changed_by_role: 'tenant',
      notes: reason || 'Cancelled by tenant',
    });

    return { success: true };
  } catch (error) {
    console.error('Error cancelling maintenance request:', error);
    return {
      success: false,
      error: 'Failed to cancel maintenance request',
    };
  }
}

/**
 * Submit feedback/rating for a completed request
 */
export async function submitMaintenanceFeedback(
  requestId: string,
  tenantId: string,
  rating: number,
  feedback?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate rating
    if (rating < 1 || rating > 5) {
      return {
        success: false,
        error: 'Rating must be between 1 and 5',
      };
    }

    // Check if request is completed
    const { data: request } = await supabase
      .from('work_orders')
      .select('status')
      .eq('id', requestId)
      .eq('tenant_id', tenantId)
      .single();

    if (!request || request.status !== 'completed') {
      return {
        success: false,
        error: 'Can only rate completed maintenance requests',
      };
    }

    // Update with feedback
    const { error } = await supabase
      .from('work_orders')
      .update({
        tenant_rating: rating,
        tenant_feedback: feedback,
      })
      .eq('id', requestId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error submitting feedback:', error);
      return {
        success: false,
        error: 'Failed to submit feedback',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return {
      success: false,
      error: 'Failed to submit feedback',
    };
  }
}

/**
 * Upload images for a maintenance request
 */
export async function uploadMaintenanceImages(
  requestId: string,
  tenantId: string,
  files: File[]
): Promise<{ success: boolean; images?: MaintenanceImage[]; error?: string }> {
  try {
    const uploadedImages: MaintenanceImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${requestId}/${Date.now()}-${i}.${fileExt}`;
      const filePath = `maintenance-images/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('tenant-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tenant-uploads')
        .getPublicUrl(filePath);

      // Save image record
      const { data: imageRecord, error: insertError } = await supabase
        .from('maintenance_request_images')
        .insert({
          work_order_id: requestId,
          uploaded_by: tenantId,
          uploaded_by_role: 'tenant',
          image_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          image_order: i,
        })
        .select()
        .single();

      if (!insertError && imageRecord) {
        uploadedImages.push(imageRecord);
      }
    }

    return {
      success: true,
      images: uploadedImages,
    };
  } catch (error) {
    console.error('Error uploading images:', error);
    return {
      success: false,
      error: 'Failed to upload images',
    };
  }
}

/**
 * Delete an image from a maintenance request
 */
export async function deleteMaintenanceImage(
  imageId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify ownership and get image info
    const { data: image } = await supabase
      .from('maintenance_request_images')
      .select('*, work_order:work_orders!inner(tenant_id, status)')
      .eq('id', imageId)
      .single();

    if (!image || image.work_order.tenant_id !== tenantId) {
      return {
        success: false,
        error: 'Image not found',
      };
    }

    // Only allow deletion before work starts
    if (!['open', 'assigned'].includes(image.work_order.status)) {
      return {
        success: false,
        error: 'Cannot delete images after work has started',
      };
    }

    // Delete from storage
    const urlParts = image.image_url.split('/');
    const storagePath = urlParts.slice(-2).join('/');
    await supabase.storage.from('tenant-uploads').remove([`maintenance-images/${storagePath}`]);

    // Delete record
    const { error } = await supabase
      .from('maintenance_request_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      console.error('Error deleting image:', error);
      return {
        success: false,
        error: 'Failed to delete image',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting image:', error);
    return {
      success: false,
      error: 'Failed to delete image',
    };
  }
}

/**
 * Get maintenance request counts by status
 */
export async function getMaintenanceRequestCounts(
  tenantId: string
): Promise<Record<MaintenanceStatus, number>> {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('status')
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error fetching request counts:', error);
      return {
        open: 0,
        assigned: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
        on_hold: 0,
      };
    }

    const counts: Record<MaintenanceStatus, number> = {
      open: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      on_hold: 0,
    };

    data?.forEach((item) => {
      if (item.status in counts) {
        counts[item.status as MaintenanceStatus]++;
      }
    });

    return counts;
  } catch (error) {
    console.error('Error fetching request counts:', error);
    return {
      open: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      on_hold: 0,
    };
  }
}

/**
 * Subscribe to real-time updates for a specific maintenance request
 */
export function subscribeToMaintenanceRequest(
  requestId: string,
  onUpdate: (request: MaintenanceRequest) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`work_order_${requestId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'work_orders',
        filter: `id=eq.${requestId}`,
      },
      async (payload) => {
        if (payload.new) {
          // Fetch complete request with relations
          const { data } = await supabase
            .from('work_orders')
            .select(`
              *,
              property:properties(id, name, address),
              unit:units(id, unit_number),
              vendor:people!work_orders_vendor_id_fkey(id, first_name, last_name, phone, company_name)
            `)
            .eq('id', requestId)
            .single();

          if (data) {
            onUpdate(data);
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'maintenance_status_history',
        filter: `work_order_id=eq.${requestId}`,
      },
      async () => {
        // Refetch when status history changes
        const { data } = await supabase
          .from('work_orders')
          .select(`
            *,
            property:properties(id, name, address),
            unit:units(id, unit_number),
            vendor:people!work_orders_vendor_id_fkey(id, first_name, last_name, phone, company_name)
          `)
          .eq('id', requestId)
          .single();

        if (data) {
          onUpdate(data);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to all maintenance requests for a tenant
 */
export function subscribeToAllMaintenanceRequests(
  tenantId: string,
  onUpdate: () => void
): RealtimeChannel {
  const channel = supabase
    .channel(`tenant_work_orders_${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'work_orders',
        filter: `tenant_id=eq.${tenantId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return channel;
}

/**
 * Get emergency contact information
 */
export function getEmergencyInfo(): {
  phone: string;
  hours: string;
  examples: string[];
} {
  return {
    phone: '1-800-EMERGENCY', // TODO: Make configurable per property
    hours: '24/7',
    examples: [
      'Gas leak or smell',
      'Fire or smoke',
      'Flooding or major water leak',
      'No heat in freezing weather',
      'No power (after checking breakers)',
      'Security concerns (break-in, broken locks)',
    ],
  };
}
