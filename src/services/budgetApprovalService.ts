import { supabase } from '../lib/supabase';

/**
 * Budget Approval Workflow Service
 * Manages approval workflows for expenses above threshold amounts
 * Phase 2: Automation & Workflows
 */

export interface ApprovalRequest {
  id: string;
  entity_type: 'work_order' | 'expense' | 'lease' | 'payment';
  entity_id: string;
  request_type: 'budget_approval' | 'expense_approval' | 'contract_approval';
  amount: number;
  requester_id: string;
  approver_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  notes?: string;
  approval_notes?: string;
  requested_at: string;
  responded_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalThreshold {
  property_id?: string; // null = organization-wide
  category: string;
  threshold_amount: number;
  requires_approval: boolean;
  auto_approve_below: number;
  requires_multiple_approvers: boolean;
  approver_count: number;
}

// Default approval thresholds
const DEFAULT_THRESHOLDS: Partial<ApprovalThreshold>[] = [
  { category: 'maintenance', threshold_amount: 500, auto_approve_below: 200, requires_multiple_approvers: false, approver_count: 1 },
  { category: 'repairs', threshold_amount: 1000, auto_approve_below: 300, requires_multiple_approvers: false, approver_count: 1 },
  { category: 'capital_improvement', threshold_amount: 2000, auto_approve_below: 0, requires_multiple_approvers: true, approver_count: 2 },
  { category: 'emergency', threshold_amount: 5000, auto_approve_below: 500, requires_multiple_approvers: false, approver_count: 1 },
  { category: 'legal', threshold_amount: 1000, auto_approve_below: 0, requires_multiple_approvers: true, approver_count: 2 },
  { category: 'insurance', threshold_amount: 2000, auto_approve_below: 0, requires_multiple_approvers: false, approver_count: 1 }
];

/**
 * Check if expense requires approval and create approval request if needed
 */
export async function checkAndRequestApproval(
  entityType: 'work_order' | 'expense',
  entityId: string,
  amount: number,
  category: string,
  propertyId: string,
  requesterId: string
): Promise<{
  requires_approval: boolean;
  auto_approved: boolean;
  approval_request_id?: string;
  reason?: string;
}> {
  try {
    // Get approval threshold for this category and property
    const threshold = await getApprovalThreshold(propertyId, category);

    if (!threshold || !threshold.requires_approval) {
      // No approval required
      return {
        requires_approval: false,
        auto_approved: true,
        reason: 'Below threshold or no approval policy'
      };
    }

    // Check if amount is below auto-approval threshold
    if (amount <= threshold.auto_approve_below) {
      return {
        requires_approval: false,
        auto_approved: true,
        reason: `Amount $${amount} below auto-approval threshold $${threshold.auto_approve_below}`
      };
    }

    // Check if amount requires approval
    if (amount <= threshold.threshold_amount) {
      // Below threshold - auto approve
      return {
        requires_approval: false,
        auto_approved: true,
        reason: `Amount $${amount} below approval threshold $${threshold.threshold_amount}`
      };
    }

    // Amount exceeds threshold - create approval request
    const approvalRequest = await createApprovalRequest({
      entity_type: entityType,
      entity_id: entityId,
      request_type: 'expense_approval',
      amount,
      requester_id: requesterId,
      priority: amount > 5000 ? 'high' : amount > 2000 ? 'medium' : 'low',
      reason: `${category} expense of $${amount} requires approval (threshold: $${threshold.threshold_amount})`
    });

    if (!approvalRequest) {
      return {
        requires_approval: true,
        auto_approved: false,
        reason: 'Failed to create approval request'
      };
    }

    console.log(`Approval request created for ${entityType} ${entityId}: $${amount}`);

    return {
      requires_approval: true,
      auto_approved: false,
      approval_request_id: approvalRequest.id,
      reason: `Approval required for amount $${amount} (threshold: $${threshold.threshold_amount})`
    };

  } catch (error) {
    console.error('Check and request approval error:', error);
    return {
      requires_approval: false,
      auto_approved: true,
      reason: 'Error checking approval - defaulting to auto-approve'
    };
  }
}

/**
 * Get approval threshold for property and category
 */
async function getApprovalThreshold(
  propertyId: string,
  category: string
): Promise<ApprovalThreshold | null> {
  try {
    // First, check for property-specific threshold
    const { data: propertyThreshold } = await supabase
      .from('approval_thresholds')
      .select('*')
      .eq('property_id', propertyId)
      .eq('category', category)
      .single();

    if (propertyThreshold) {
      return propertyThreshold;
    }

    // Fall back to organization-wide threshold
    const { data: orgThreshold } = await supabase
      .from('approval_thresholds')
      .select('*')
      .is('property_id', null)
      .eq('category', category)
      .single();

    if (orgThreshold) {
      return orgThreshold;
    }

    // Fall back to default threshold
    const defaultThreshold = DEFAULT_THRESHOLDS.find(t => t.category === category);
    if (defaultThreshold) {
      return {
        property_id: propertyId,
        category,
        threshold_amount: defaultThreshold.threshold_amount!,
        requires_approval: true,
        auto_approve_below: defaultThreshold.auto_approve_below!,
        requires_multiple_approvers: defaultThreshold.requires_multiple_approvers!,
        approver_count: defaultThreshold.approver_count!
      };
    }

    return null;

  } catch (error) {
    console.error('Get approval threshold error:', error);
    return null;
  }
}

/**
 * Create an approval request
 */
async function createApprovalRequest(data: {
  entity_type: string;
  entity_id: string;
  request_type: string;
  amount: number;
  requester_id: string;
  priority: string;
  reason: string;
}): Promise<ApprovalRequest | null> {
  try {
    // Find appropriate approver
    // TODO: Implement approver selection logic based on property hierarchy
    // For now, we'll leave approver_id as null - property manager will be notified

    // Set expiration date (7 days from now for normal, 2 days for urgent)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.priority === 'urgent' ? 2 : 7));

    const { data: approvalRequest, error } = await supabase
      .from('approval_requests')
      .insert({
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        request_type: data.request_type,
        amount: data.amount,
        requester_id: data.requester_id,
        approver_id: null, // Will be assigned by system
        status: 'pending',
        priority: data.priority,
        reason: data.reason,
        requested_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create approval request:', error);
      return null;
    }

    // TODO: Send notification to approver
    console.log(`Approval request created: ${approvalRequest.id}`);

    return approvalRequest;

  } catch (error) {
    console.error('Create approval request error:', error);
    return null;
  }
}

/**
 * Approve or reject an approval request
 */
export async function processApprovalRequest(
  requestId: string,
  approverId: string,
  action: 'approve' | 'reject',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get approval request
    const { data: request, error: fetchError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'Approval request not found' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: 'Request has already been processed' };
    }

    // Check if expired
    if (request.expires_at && new Date(request.expires_at) < new Date()) {
      // Auto-reject expired requests
      await supabase
        .from('approval_requests')
        .update({
          status: 'rejected',
          approval_notes: 'Request expired',
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      return { success: false, error: 'Request has expired' };
    }

    // Update approval request
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const { error: updateError } = await supabase
      .from('approval_requests')
      .update({
        approver_id: approverId,
        status: newStatus,
        approval_notes: notes,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Update the related entity based on approval/rejection
    if (action === 'approve') {
      await handleApprovalApproved(request);
    } else {
      await handleApprovalRejected(request);
    }

    console.log(`Approval request ${requestId} ${action}d by ${approverId}`);
    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Handle approved request - update entity status
 */
async function handleApprovalApproved(request: ApprovalRequest): Promise<void> {
  try {
    switch (request.entity_type) {
      case 'work_order':
        // Approve work order - allow it to proceed
        await supabase
          .from('work_orders')
          .update({
            status: 'scheduled',
            notes: `Budget approved: $${request.amount}\n${request.approval_notes || ''}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', request.entity_id);

        // TODO: Notify requester and vendor
        break;

      case 'expense':
        // Approve expense - mark as approved
        await supabase
          .from('expenses')
          .update({
            notes: `Budget approved: $${request.amount}\n${request.approval_notes || ''}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', request.entity_id);

        // TODO: Notify requester
        break;

      default:
        console.log(`No handler for entity type: ${request.entity_type}`);
    }
  } catch (error) {
    console.error('Handle approval approved error:', error);
  }
}

/**
 * Handle rejected request - update entity status
 */
async function handleApprovalRejected(request: ApprovalRequest): Promise<void> {
  try {
    switch (request.entity_type) {
      case 'work_order':
        // Reject work order - put on hold or cancel
        await supabase
          .from('work_orders')
          .update({
            status: 'on_hold',
            notes: `Budget approval rejected: $${request.amount}\nReason: ${request.approval_notes || 'Not specified'}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', request.entity_id);

        // TODO: Notify requester
        break;

      case 'expense':
        // Mark expense as not approved
        await supabase
          .from('expenses')
          .update({
            paid: false,
            notes: `Budget approval rejected: $${request.amount}\nReason: ${request.approval_notes || 'Not specified'}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', request.entity_id);

        // TODO: Notify requester
        break;

      default:
        console.log(`No handler for entity type: ${request.entity_type}`);
    }
  } catch (error) {
    console.error('Handle approval rejected error:', error);
  }
}

/**
 * Get pending approval requests for an approver
 */
export async function getPendingApprovals(approverId?: string): Promise<ApprovalRequest[]> {
  try {
    let query = supabase
      .from('approval_requests')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('requested_at', { ascending: true });

    if (approverId) {
      query = query.eq('approver_id', approverId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get pending approvals:', error);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('Get pending approvals error:', error);
    return [];
  }
}

/**
 * Check for expired approval requests and auto-reject them
 */
export async function processExpiredApprovals(): Promise<{
  expired: number;
  errors: string[];
}> {
  const results = { expired: 0, errors: [] as string[] };

  try {
    const now = new Date().toISOString();

    const { data: expiredRequests, error } = await supabase
      .from('approval_requests')
      .select('id')
      .eq('status', 'pending')
      .lt('expires_at', now);

    if (error) {
      results.errors.push(error.message);
      return results;
    }

    if (expiredRequests && expiredRequests.length > 0) {
      // Update expired requests
      await supabase
        .from('approval_requests')
        .update({
          status: 'rejected',
          approval_notes: 'Automatically rejected - request expired',
          responded_at: now,
          updated_at: now
        })
        .eq('status', 'pending')
        .lt('expires_at', now);

      results.expired = expiredRequests.length;
      console.log(`Auto-rejected ${results.expired} expired approval requests`);
    }

    return results;

  } catch (error) {
    console.error('Process expired approvals error:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
}

/**
 * Initialize approval thresholds for an organization
 */
export async function initializeApprovalThresholds(
  organizationId?: string
): Promise<{ created: number; errors: string[] }> {
  const results = { created: 0, errors: [] as string[] };

  try {
    const thresholdsToCreate = DEFAULT_THRESHOLDS.map(threshold => ({
      property_id: null, // Organization-wide
      category: threshold.category!,
      threshold_amount: threshold.threshold_amount!,
      requires_approval: true,
      auto_approve_below: threshold.auto_approve_below!,
      requires_multiple_approvers: threshold.requires_multiple_approvers!,
      approver_count: threshold.approver_count!
    }));

    const { data, error } = await supabase
      .from('approval_thresholds')
      .insert(thresholdsToCreate)
      .select();

    if (error) {
      results.errors.push(error.message);
    } else {
      results.created = data?.length || 0;
      console.log(`Created ${results.created} default approval thresholds`);
    }

    return results;

  } catch (error) {
    console.error('Initialize approval thresholds error:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
}
