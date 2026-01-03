import { supabase } from '../lib/supabase';

/**
 * Intelligent Work Order Routing Service
 * Automatically assigns vendors based on category, availability, performance, and proximity
 * Phase 2: Automation & Workflows
 */

export interface VendorScore {
  vendor_id: string;
  vendor_name: string;
  score: number;
  availability: boolean;
  active_jobs: number;
  avg_rating: number;
  completion_rate: number;
  avg_response_time: number; // hours
  proximity_score: number; // 0-100
  specialty_match: boolean;
  reasons: string[];
}

export interface WorkOrderRoutingResult {
  work_order_id: string;
  assigned_vendor_id?: string;
  vendor_name?: string;
  auto_assigned: boolean;
  confidence_score: number;
  alternative_vendors: VendorScore[];
  reason?: string;
}

/**
 * Auto-assign vendor to work order based on intelligent routing
 */
export async function autoAssignVendor(workOrderId: string): Promise<WorkOrderRoutingResult> {
  try {
    // Get work order details
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .select(`
        *,
        properties:property_id(id, name, address, city, state, zip_code),
        units:unit_id(id, unit_number)
      `)
      .eq('id', workOrderId)
      .single();

    if (woError || !workOrder) {
      return {
        work_order_id: workOrderId,
        auto_assigned: false,
        confidence_score: 0,
        alternative_vendors: [],
        reason: 'Work order not found'
      };
    }

    // Find best vendor for this work order
    const vendorScores = await scoreVendorsForWorkOrder(workOrder);

    if (vendorScores.length === 0) {
      return {
        work_order_id: workOrderId,
        auto_assigned: false,
        confidence_score: 0,
        alternative_vendors: [],
        reason: 'No qualified vendors available'
      };
    }

    // Sort by score descending
    vendorScores.sort((a, b) => b.score - a.score);
    const bestVendor = vendorScores[0];
    const alternatives = vendorScores.slice(1, 4); // Top 3 alternatives

    // Auto-assign if confidence is high enough (score > 70)
    const autoAssign = bestVendor.score >= 70 && bestVendor.availability;

    if (autoAssign) {
      // Assign vendor to work order
      const { error: updateError } = await supabase
        .from('work_orders')
        .update({
          vendor_id: bestVendor.vendor_id,
          assigned_to: bestVendor.vendor_id,
          status: 'scheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', workOrderId);

      if (updateError) {
        console.error('Failed to assign vendor:', updateError);
        return {
          work_order_id: workOrderId,
          auto_assigned: false,
          confidence_score: bestVendor.score,
          alternative_vendors: alternatives,
          reason: 'Failed to update work order'
        };
      }

      // TODO: Send notification to vendor about new job

      console.log(`Auto-assigned vendor ${bestVendor.vendor_name} to work order ${workOrderId} (score: ${bestVendor.score})`);
    }

    return {
      work_order_id: workOrderId,
      assigned_vendor_id: autoAssign ? bestVendor.vendor_id : undefined,
      vendor_name: autoAssign ? bestVendor.vendor_name : undefined,
      auto_assigned: autoAssign,
      confidence_score: bestVendor.score,
      alternative_vendors: alternatives,
      reason: autoAssign
        ? `Auto-assigned based on: ${bestVendor.reasons.join(', ')}`
        : 'Score too low for auto-assignment - manual review needed'
    };

  } catch (error) {
    console.error('Auto-assign vendor error:', error);
    return {
      work_order_id: workOrderId,
      auto_assigned: false,
      confidence_score: 0,
      alternative_vendors: [],
      reason: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Score all vendors for a work order
 */
async function scoreVendorsForWorkOrder(workOrder: any): Promise<VendorScore[]> {
  try {
    // Get all active vendors
    const { data: vendors, error } = await supabase
      .from('people')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        vendor_specialties,
        vendor_service_area,
        vendor_hourly_rate,
        vendor_is_active
      `)
      .eq('type', 'vendor')
      .eq('vendor_is_active', true);

    if (error || !vendors) {
      console.error('Failed to fetch vendors:', error);
      return [];
    }

    console.log(`Scoring ${vendors.length} vendors for work order ${workOrder.id}`);

    const vendorScores: VendorScore[] = [];

    for (const vendor of vendors) {
      const score = await scoreVendor(vendor, workOrder);
      if (score.score > 0) { // Only include vendors with some relevance
        vendorScores.push(score);
      }
    }

    return vendorScores;

  } catch (error) {
    console.error('Score vendors error:', error);
    return [];
  }
}

/**
 * Score a single vendor for a work order
 */
async function scoreVendor(vendor: any, workOrder: any): Promise<VendorScore> {
  let score = 0;
  const reasons: string[] = [];

  // Base score
  let baseScore = 50;

  // 1. Specialty Match (0-30 points)
  const specialtyMatch = checkSpecialtyMatch(vendor, workOrder.category);
  if (specialtyMatch) {
    score += 30;
    reasons.push('specialty match');
  } else {
    score += 10; // General contractor can handle most things
  }

  // 2. Availability (0-20 points)
  const availability = await checkVendorAvailability(vendor.id);
  if (availability.available) {
    score += 20;
    reasons.push('available');
  } else if (availability.activeJobs < 5) {
    score += 10;
    reasons.push('light workload');
  }

  // 3. Performance History (0-25 points)
  const performance = await getVendorPerformance(vendor.id);
  const performanceScore = Math.round(performance.score * 25);
  score += performanceScore;
  if (performance.rating >= 4.5) {
    reasons.push('excellent rating');
  } else if (performance.rating >= 4.0) {
    reasons.push('good rating');
  }

  // 4. Response Time (0-15 points)
  if (performance.avgResponseTime <= 24) {
    score += 15;
    reasons.push('fast response');
  } else if (performance.avgResponseTime <= 48) {
    score += 10;
  } else if (performance.avgResponseTime <= 72) {
    score += 5;
  }

  // 5. Proximity/Service Area (0-10 points)
  const proximityScore = calculateProximityScore(vendor, workOrder.properties);
  score += proximityScore;
  if (proximityScore >= 8) {
    reasons.push('local vendor');
  }

  return {
    vendor_id: vendor.id,
    vendor_name: `${vendor.first_name} ${vendor.last_name}`,
    score: Math.min(score, 100), // Cap at 100
    availability: availability.available,
    active_jobs: availability.activeJobs,
    avg_rating: performance.rating,
    completion_rate: performance.completionRate,
    avg_response_time: performance.avgResponseTime,
    proximity_score: proximityScore,
    specialty_match: specialtyMatch,
    reasons
  };
}

/**
 * Check if vendor specializes in the work order category
 */
function checkSpecialtyMatch(vendor: any, category: string): boolean {
  if (!vendor.vendor_specialties) return false;

  // vendor_specialties is a JSONB array
  const specialties = vendor.vendor_specialties as string[];
  return specialties.includes(category);
}

/**
 * Check vendor availability based on active work orders
 */
async function checkVendorAvailability(vendorId: string): Promise<{
  available: boolean;
  activeJobs: number;
}> {
  try {
    const { data: activeJobs, error } = await supabase
      .from('work_orders')
      .select('id', { count: 'exact' })
      .eq('vendor_id', vendorId)
      .in('status', ['pending', 'scheduled', 'in_progress']);

    if (error) {
      console.error('Failed to check vendor availability:', error);
      return { available: true, activeJobs: 0 };
    }

    const jobCount = activeJobs?.length || 0;

    return {
      available: jobCount < 3, // Available if less than 3 active jobs
      activeJobs: jobCount
    };

  } catch (error) {
    return { available: true, activeJobs: 0 };
  }
}

/**
 * Get vendor performance metrics
 */
async function getVendorPerformance(vendorId: string): Promise<{
  score: number; // 0-1
  rating: number; // 0-5
  completionRate: number; // 0-100
  avgResponseTime: number; // hours
}> {
  try {
    // Get completed work orders for this vendor
    const { data: workOrders, error } = await supabase
      .from('work_orders')
      .select('id, status, created_at, started_date, completed_date')
      .eq('vendor_id', vendorId)
      .in('status', ['completed', 'cancelled']);

    if (error || !workOrders || workOrders.length === 0) {
      // New vendor - give benefit of the doubt
      return {
        score: 0.7,
        rating: 4.0,
        completionRate: 100,
        avgResponseTime: 48
      };
    }

    // Calculate completion rate
    const completed = workOrders.filter(wo => wo.status === 'completed').length;
    const completionRate = (completed / workOrders.length) * 100;

    // Calculate average response time
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    workOrders.forEach(wo => {
      if (wo.started_date && wo.created_at) {
        const created = new Date(wo.created_at);
        const started = new Date(wo.started_date);
        const responseTime = (started.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
        totalResponseTime += responseTime;
        responseTimeCount++;
      }
    });

    const avgResponseTime = responseTimeCount > 0
      ? totalResponseTime / responseTimeCount
      : 48; // Default 48 hours

    // TODO: Get actual ratings from a ratings table
    // For now, calculate based on completion rate
    const rating = 3.5 + (completionRate / 100) * 1.5; // 3.5-5.0 range

    // Overall performance score
    const score = (completionRate / 100) * 0.7 + (Math.min(rating / 5, 1)) * 0.3;

    return {
      score,
      rating,
      completionRate,
      avgResponseTime
    };

  } catch (error) {
    console.error('Get vendor performance error:', error);
    return {
      score: 0.7,
      rating: 4.0,
      completionRate: 100,
      avgResponseTime: 48
    };
  }
}

/**
 * Calculate proximity score based on service area and property location
 */
function calculateProximityScore(vendor: any, property: any): number {
  // TODO: Implement actual geolocation-based proximity scoring
  // For now, simple city/state match

  if (!vendor.vendor_service_area || !property) {
    return 5; // Neutral score
  }

  const serviceAreas = vendor.vendor_service_area as string[];

  // Check if property city is in service area
  if (serviceAreas.includes(property.city)) {
    return 10; // Perfect match
  }

  // Check if property state is in service area
  if (serviceAreas.includes(property.state)) {
    return 6; // Same state
  }

  return 2; // Out of area
}

/**
 * Process all unassigned work orders and attempt auto-assignment
 */
export async function processUnassignedWorkOrders(): Promise<{
  processed: number;
  assigned: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    assigned: 0,
    errors: [] as string[]
  };

  try {
    // Get all pending work orders without vendor assignment
    const { data: workOrders, error } = await supabase
      .from('work_orders')
      .select('id, title, priority')
      .eq('status', 'pending')
      .is('vendor_id', null)
      .order('priority', { ascending: false }) // High priority first
      .order('created_at', { ascending: true }); // Oldest first

    if (error) {
      results.errors.push(error.message);
      return results;
    }

    if (!workOrders || workOrders.length === 0) {
      console.log('No unassigned work orders');
      return results;
    }

    console.log(`Processing ${workOrders.length} unassigned work orders...`);

    for (const wo of workOrders) {
      results.processed++;

      try {
        const result = await autoAssignVendor(wo.id);
        if (result.auto_assigned) {
          results.assigned++;
        }
      } catch (err) {
        results.errors.push(`Failed to process work order ${wo.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    console.log(`Auto-assignment complete: ${results.assigned} of ${results.processed} assigned`);
    return results;

  } catch (error) {
    console.error('Process unassigned work orders error:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
}

/**
 * Get vendor recommendations for a work order
 */
export async function getVendorRecommendations(workOrderId: string): Promise<VendorScore[]> {
  try {
    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .select(`
        *,
        properties:property_id(*)
      `)
      .eq('id', workOrderId)
      .single();

    if (error || !workOrder) {
      return [];
    }

    const vendorScores = await scoreVendorsForWorkOrder(workOrder);
    return vendorScores.sort((a, b) => b.score - a.score).slice(0, 5); // Top 5

  } catch (error) {
    console.error('Get vendor recommendations error:', error);
    return [];
  }
}

/**
 * Manually assign vendor with approval workflow
 */
export async function assignVendorWithApproval(
  workOrderId: string,
  vendorId: string,
  approverId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get work order to check estimated cost
    const { data: workOrder, error: woError } = await supabase
      .from('work_orders')
      .select('estimated_cost')
      .eq('id', workOrderId)
      .single();

    if (woError || !workOrder) {
      return { success: false, error: 'Work order not found' };
    }

    // Check if approval is required (cost > $500)
    const requiresApproval = (workOrder.estimated_cost || 0) > 500;

    if (requiresApproval) {
      // TODO: Create approval request
      console.log(`Approval required for work order ${workOrderId} (cost: $${workOrder.estimated_cost})`);
      // In production, this would create an approval workflow
    }

    // Assign vendor
    const { error: updateError } = await supabase
      .from('work_orders')
      .update({
        vendor_id: vendorId,
        assigned_to: vendorId,
        status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', workOrderId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    console.log(`Vendor ${vendorId} assigned to work order ${workOrderId}`);
    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
