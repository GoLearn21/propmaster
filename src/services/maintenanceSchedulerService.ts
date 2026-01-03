import { supabase } from '../lib/supabase';

/**
 * Preventive Maintenance Scheduler Service
 * Automates recurring maintenance tasks and seasonal reminders
 * Phase 2: Automation & Workflows
 */

export interface MaintenanceSchedule {
  id: string;
  property_id: string;
  unit_id?: string;
  title: string;
  description: string;
  category: string;
  frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'seasonal';
  next_due_date: string;
  last_completed_date?: string;
  auto_create_work_order: boolean;
  assign_to_vendor_id?: string;
  estimated_cost?: number;
  priority: 'low' | 'medium' | 'high';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeasonalTask {
  task: string;
  category: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  priority: 'low' | 'medium' | 'high';
}

// Predefined seasonal maintenance tasks
const SEASONAL_TASKS: SeasonalTask[] = [
  // Spring tasks
  { task: 'HVAC system inspection and filter replacement', category: 'hvac', season: 'spring', priority: 'high' },
  { task: 'Inspect roof for winter damage', category: 'roofing', season: 'spring', priority: 'high' },
  { task: 'Clean gutters and downspouts', category: 'other', season: 'spring', priority: 'medium' },
  { task: 'Test and service air conditioning', category: 'hvac', season: 'spring', priority: 'high' },
  { task: 'Inspect exterior paint and siding', category: 'painting', season: 'spring', priority: 'low' },
  { task: 'Check irrigation system', category: 'landscaping', season: 'spring', priority: 'medium' },

  // Summer tasks
  { task: 'Lawn and landscaping maintenance', category: 'landscaping', season: 'summer', priority: 'medium' },
  { task: 'Inspect and clean AC condensers', category: 'hvac', season: 'summer', priority: 'high' },
  { task: 'Check window and door seals', category: 'other', season: 'summer', priority: 'low' },
  { task: 'Pressure wash exterior surfaces', category: 'cleaning', season: 'summer', priority: 'low' },

  // Fall tasks
  { task: 'HVAC system inspection and filter replacement', category: 'hvac', season: 'fall', priority: 'high' },
  { task: 'Test heating system before winter', category: 'hvac', season: 'fall', priority: 'high' },
  { task: 'Clean gutters of fall leaves', category: 'other', season: 'fall', priority: 'high' },
  { task: 'Inspect and seal windows/doors for winter', category: 'other', season: 'fall', priority: 'medium' },
  { task: 'Drain and winterize irrigation systems', category: 'landscaping', season: 'fall', priority: 'high' },
  { task: 'Inspect chimney and fireplace', category: 'other', season: 'fall', priority: 'medium' },

  // Winter tasks
  { task: 'Check for ice dams and roof snow load', category: 'roofing', season: 'winter', priority: 'high' },
  { task: 'Inspect and service heating system', category: 'hvac', season: 'winter', priority: 'high' },
  { task: 'Test smoke and CO detectors', category: 'other', season: 'winter', priority: 'high' },
  { task: 'Inspect attic insulation', category: 'other', season: 'winter', priority: 'medium' },
  { task: 'Check for frozen pipes risk areas', category: 'plumbing', season: 'winter', priority: 'high' }
];

// Recurring maintenance tasks by frequency
const RECURRING_TASKS = {
  monthly: [
    { task: 'HVAC filter replacement', category: 'hvac', priority: 'high' as const, cost: 50 },
    { task: 'Test smoke and CO detectors', category: 'other', priority: 'high' as const, cost: 0 },
    { task: 'Inspect common area lighting', category: 'electrical', priority: 'medium' as const, cost: 0 }
  ],
  quarterly: [
    { task: 'Deep clean common areas', category: 'cleaning', priority: 'medium' as const, cost: 300 },
    { task: 'Inspect fire extinguishers', category: 'other', priority: 'high' as const, cost: 100 },
    { task: 'Test emergency lighting', category: 'electrical', priority: 'high' as const, cost: 0 },
    { task: 'Pest control service', category: 'other', priority: 'medium' as const, cost: 150 }
  ],
  semiAnnual: [
    { task: 'HVAC professional service', category: 'hvac', priority: 'high' as const, cost: 300 },
    { task: 'Gutter cleaning', category: 'other', priority: 'high' as const, cost: 200 },
    { task: 'Water heater flush and inspection', category: 'plumbing', priority: 'medium' as const, cost: 150 }
  ],
  annual: [
    { task: 'Roof inspection', category: 'roofing', priority: 'high' as const, cost: 400 },
    { task: 'Septic tank pumping', category: 'plumbing', priority: 'high' as const, cost: 500 },
    { task: 'Termite inspection', category: 'other', priority: 'medium' as const, cost: 200 },
    { task: 'Carpet deep cleaning', category: 'cleaning', priority: 'low' as const, cost: 400 },
    { task: 'Pressure wash building exterior', category: 'cleaning', priority: 'low' as const, cost: 500 }
  ]
};

/**
 * Process preventive maintenance schedules - should be called daily by cron
 */
export async function processMaintenanceSchedules(): Promise<{
  work_orders_created: number;
  reminders_sent: number;
  errors: string[];
}> {
  const results = {
    work_orders_created: 0,
    reminders_sent: 0,
    errors: [] as string[]
  };

  try {
    const today = new Date().toISOString().split('T')[0];

    // Get all active maintenance schedules due today or past due
    const { data: schedules, error } = await supabase
      .from('maintenance_schedules')
      .select(`
        *,
        properties:property_id(id, name, address),
        units:unit_id(id, unit_number)
      `)
      .eq('is_active', true)
      .lte('next_due_date', today);

    if (error) {
      results.errors.push(error.message);
      return results;
    }

    if (!schedules || schedules.length === 0) {
      console.log('No maintenance schedules due today');
      return results;
    }

    console.log(`Processing ${schedules.length} maintenance schedules...`);

    for (const schedule of schedules) {
      try {
        if (schedule.auto_create_work_order) {
          // Automatically create work order
          const created = await createMaintenanceWorkOrder(schedule);
          if (created) {
            results.work_orders_created++;
          }
        } else {
          // Send reminder to property manager
          await sendMaintenanceReminder(schedule);
          results.reminders_sent++;
        }

        // Update next due date
        await updateNextMaintenanceDate(schedule);

      } catch (err) {
        results.errors.push(`Failed to process schedule ${schedule.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    console.log(`Maintenance processing complete: ${results.work_orders_created} work orders, ${results.reminders_sent} reminders`);
    return results;

  } catch (error) {
    console.error('Process maintenance schedules error:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
}

/**
 * Create work order from maintenance schedule
 */
async function createMaintenanceWorkOrder(schedule: MaintenanceSchedule): Promise<boolean> {
  try {
    const { data: workOrder, error } = await supabase
      .from('work_orders')
      .insert({
        property_id: schedule.property_id,
        unit_id: schedule.unit_id,
        vendor_id: schedule.assign_to_vendor_id,
        title: schedule.title,
        description: `${schedule.description}\n\n(Auto-generated from preventive maintenance schedule)`,
        category: schedule.category,
        priority: schedule.priority,
        status: schedule.assign_to_vendor_id ? 'scheduled' : 'pending',
        estimated_cost: schedule.estimated_cost,
        scheduled_date: new Date().toISOString(),
        notes: `Maintenance Schedule ID: ${schedule.id}`
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create maintenance work order:', error);
      return false;
    }

    console.log(`Created maintenance work order ${workOrder.id} from schedule ${schedule.id}`);
    return true;

  } catch (error) {
    console.error('Create maintenance work order error:', error);
    return false;
  }
}

/**
 * Send maintenance reminder to property manager
 */
async function sendMaintenanceReminder(schedule: any): Promise<void> {
  // TODO: Integrate with email service
  console.log(`Sending maintenance reminder for: ${schedule.title}`);
  console.log(`Property: ${schedule.properties?.name}, Due: ${schedule.next_due_date}`);
}

/**
 * Update next maintenance due date based on frequency
 */
async function updateNextMaintenanceDate(schedule: MaintenanceSchedule): Promise<void> {
  try {
    const currentDueDate = new Date(schedule.next_due_date);
    let nextDueDate: Date;

    switch (schedule.frequency) {
      case 'monthly':
        nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 1));
        break;
      case 'quarterly':
        nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 3));
        break;
      case 'semi-annual':
        nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 6));
        break;
      case 'annual':
        nextDueDate = new Date(currentDueDate.setFullYear(currentDueDate.getFullYear() + 1));
        break;
      case 'seasonal':
        // For seasonal tasks, advance to next season (3 months)
        nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 3));
        break;
      default:
        nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 1));
    }

    await supabase
      .from('maintenance_schedules')
      .update({
        last_completed_date: new Date().toISOString().split('T')[0],
        next_due_date: nextDueDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', schedule.id);

    console.log(`Updated next maintenance date for schedule ${schedule.id}: ${nextDueDate.toISOString().split('T')[0]}`);

  } catch (error) {
    console.error('Update next maintenance date error:', error);
  }
}

/**
 * Initialize preventive maintenance schedules for a property
 */
export async function initializePropertyMaintenance(
  propertyId: string,
  propertyType: string,
  includeRecurring: boolean = true,
  includeSeasonal: boolean = true
): Promise<{ created: number; errors: string[] }> {
  const results = { created: 0, errors: [] as string[] };

  try {
    console.log(`Initializing maintenance schedules for property ${propertyId}`);

    const schedulesToCreate: any[] = [];

    // Add recurring maintenance schedules
    if (includeRecurring) {
      // Monthly tasks
      RECURRING_TASKS.monthly.forEach(task => {
        const nextDueDate = new Date();
        nextDueDate.setDate(1); // First of next month
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);

        schedulesToCreate.push({
          property_id: propertyId,
          title: task.task,
          description: `Monthly preventive maintenance: ${task.task}`,
          category: task.category,
          frequency: 'monthly',
          next_due_date: nextDueDate.toISOString().split('T')[0],
          auto_create_work_order: true,
          estimated_cost: task.cost,
          priority: task.priority,
          is_active: true
        });
      });

      // Quarterly tasks
      RECURRING_TASKS.quarterly.forEach(task => {
        const nextDueDate = new Date();
        nextDueDate.setMonth(nextDueDate.getMonth() + 3);

        schedulesToCreate.push({
          property_id: propertyId,
          title: task.task,
          description: `Quarterly preventive maintenance: ${task.task}`,
          category: task.category,
          frequency: 'quarterly',
          next_due_date: nextDueDate.toISOString().split('T')[0],
          auto_create_work_order: true,
          estimated_cost: task.cost,
          priority: task.priority,
          is_active: true
        });
      });

      // Semi-annual tasks
      RECURRING_TASKS.semiAnnual.forEach(task => {
        const nextDueDate = new Date();
        nextDueDate.setMonth(nextDueDate.getMonth() + 6);

        schedulesToCreate.push({
          property_id: propertyId,
          title: task.task,
          description: `Semi-annual preventive maintenance: ${task.task}`,
          category: task.category,
          frequency: 'semi-annual',
          next_due_date: nextDueDate.toISOString().split('T')[0],
          auto_create_work_order: true,
          estimated_cost: task.cost,
          priority: task.priority,
          is_active: true
        });
      });

      // Annual tasks
      RECURRING_TASKS.annual.forEach(task => {
        const nextDueDate = new Date();
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

        schedulesToCreate.push({
          property_id: propertyId,
          title: task.task,
          description: `Annual preventive maintenance: ${task.task}`,
          category: task.category,
          frequency: 'annual',
          next_due_date: nextDueDate.toISOString().split('T')[0],
          auto_create_work_order: false, // Requires manager approval for annual tasks
          estimated_cost: task.cost,
          priority: task.priority,
          is_active: true
        });
      });
    }

    // Add seasonal tasks
    if (includeSeasonal) {
      SEASONAL_TASKS.forEach(task => {
        // Calculate next occurrence of this season
        const nextDueDate = getNextSeasonalDate(task.season);

        schedulesToCreate.push({
          property_id: propertyId,
          title: task.task,
          description: `Seasonal maintenance (${task.season}): ${task.task}`,
          category: task.category,
          frequency: 'seasonal',
          next_due_date: nextDueDate.toISOString().split('T')[0],
          auto_create_work_order: false, // Seasonal tasks need review
          priority: task.priority,
          is_active: true
        });
      });
    }

    // Insert all schedules
    if (schedulesToCreate.length > 0) {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .insert(schedulesToCreate)
        .select();

      if (error) {
        results.errors.push(error.message);
      } else {
        results.created = data?.length || 0;
        console.log(`Created ${results.created} maintenance schedules for property ${propertyId}`);
      }
    }

    return results;

  } catch (error) {
    console.error('Initialize property maintenance error:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
}

/**
 * Calculate next occurrence of a seasonal task
 */
function getNextSeasonalDate(season: 'spring' | 'summer' | 'fall' | 'winter'): Date {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Season start months (0-indexed)
  const seasonMonths = {
    spring: 2,  // March
    summer: 5,  // June
    fall: 8,    // September
    winter: 11  // December
  };

  const targetMonth = seasonMonths[season];
  let targetDate = new Date(currentYear, targetMonth, 1);

  // If we've passed this season, move to next year
  if (currentMonth >= targetMonth) {
    targetDate = new Date(currentYear + 1, targetMonth, 1);
  }

  return targetDate;
}

/**
 * Get upcoming maintenance for a property
 */
export async function getUpcomingMaintenance(
  propertyId: string,
  days: number = 30
): Promise<MaintenanceSchedule[]> {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await supabase
      .from('maintenance_schedules')
      .select('*')
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .gte('next_due_date', today.toISOString().split('T')[0])
      .lte('next_due_date', futureDate.toISOString().split('T')[0])
      .order('next_due_date', { ascending: true });

    if (error) {
      console.error('Failed to get upcoming maintenance:', error);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('Get upcoming maintenance error:', error);
    return [];
  }
}
