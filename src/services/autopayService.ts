import { supabase } from '../lib/supabase';

/**
 * Autopay Service
 * Handles automatic payment processing, retry logic, and payment reminders
 * Phase 2: Automation & Workflows
 */

export interface PaymentTemplate {
  id: string;
  tenant_id: string;
  lease_id: string;
  payment_method_id: string;
  payment_method_type: 'card' | 'ach' | 'bank_account';
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  day_of_month: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  last_processed_date?: string;
  next_due_date?: string;
  auto_process: boolean;
  send_reminder: boolean;
  reminder_days: number;
  retry_on_failure: boolean;
  max_retry_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentResult {
  success: boolean;
  payment_id?: string;
  transaction_id?: string;
  error?: string;
  retry_scheduled?: boolean;
}

/**
 * Process all due autopay payments
 * This should be called by a cron job daily
 */
export async function processAutopayPayments(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const today = new Date().toISOString().split('T')[0];
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    // Get all active payment templates that are due today
    const { data: templates, error } = await supabase
      .from('payment_templates')
      .select('*')
      .eq('is_active', true)
      .eq('auto_process', true)
      .lte('next_due_date', today);

    if (error) {
      console.error('Failed to fetch payment templates:', error);
      results.errors.push(error.message);
      return results;
    }

    if (!templates || templates.length === 0) {
      console.log('No autopay payments due today');
      return results;
    }

    console.log(`Processing ${templates.length} autopay payments...`);

    // Process each payment template
    for (const template of templates) {
      results.processed++;

      try {
        const result = await processPayment(template);

        if (result.success) {
          results.succeeded++;
          // Update template with next due date
          await updateNextDueDate(template);
        } else {
          results.failed++;
          results.errors.push(`Payment failed for tenant ${template.tenant_id}: ${result.error}`);

          // Handle retry logic if enabled
          if (template.retry_on_failure) {
            await schedulePaymentRetry(template, result.error || 'Unknown error');
          }
        }
      } catch (err) {
        results.failed++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Error processing payment for tenant ${template.tenant_id}: ${errorMsg}`);
      }
    }

    console.log(`Autopay processing complete: ${results.succeeded} succeeded, ${results.failed} failed`);
    return results;

  } catch (error) {
    console.error('Autopay processing error:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
}

/**
 * Process a single payment
 * In production, this would integrate with Stripe/payment processor
 */
async function processPayment(template: PaymentTemplate): Promise<PaymentResult> {
  try {
    // TODO: Integrate with actual payment processor (Stripe, etc.)
    // For now, we'll simulate the payment processing

    console.log(`Processing payment: $${template.amount} for tenant ${template.tenant_id}`);

    // Simulate payment processing with 90% success rate
    const paymentSucceeds = Math.random() > 0.1;

    if (paymentSucceeds) {
      // Record successful payment in payment_history
      const { data: payment, error } = await supabase
        .from('payment_history')
        .insert({
          tenant_id: template.tenant_id,
          lease_id: template.lease_id,
          payment_template_id: template.id,
          amount: template.amount,
          payment_method: template.payment_method_type,
          payment_method_id: template.payment_method_id,
          transaction_id: `TXN-${Date.now()}`,
          status: 'succeeded',
          payment_date: new Date().toISOString().split('T')[0],
          due_date: template.next_due_date,
          late_fee: 0,
          processed_at: new Date().toISOString(),
          notes: 'Autopay - Processed automatically',
          metadata: { autopay: true, template_id: template.id }
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to record payment: ${error.message}`);
      }

      return {
        success: true,
        payment_id: payment.id,
        transaction_id: payment.transaction_id
      };
    } else {
      // Simulate payment failure
      const failureReasons = [
        'Insufficient funds',
        'Card declined',
        'Bank account closed',
        'Payment processor error'
      ];
      const failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];

      // Record failed payment attempt
      await supabase
        .from('payment_history')
        .insert({
          tenant_id: template.tenant_id,
          lease_id: template.lease_id,
          payment_template_id: template.id,
          amount: template.amount,
          payment_method: template.payment_method_type,
          payment_method_id: template.payment_method_id,
          status: 'failed',
          failure_reason: failureReason,
          payment_date: null,
          due_date: template.next_due_date,
          late_fee: 0,
          processed_at: new Date().toISOString(),
          notes: 'Autopay - Failed automatically',
          metadata: { autopay: true, template_id: template.id }
        });

      return {
        success: false,
        error: failureReason,
        retry_scheduled: template.retry_on_failure
      };
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update payment template with next due date based on frequency
 */
async function updateNextDueDate(template: PaymentTemplate): Promise<void> {
  try {
    const currentDueDate = new Date(template.next_due_date || new Date());
    let nextDueDate: Date;

    switch (template.frequency) {
      case 'weekly':
        nextDueDate = new Date(currentDueDate.setDate(currentDueDate.getDate() + 7));
        break;
      case 'biweekly':
        nextDueDate = new Date(currentDueDate.setDate(currentDueDate.getDate() + 14));
        break;
      case 'monthly':
        nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 1));
        break;
      case 'quarterly':
        nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 3));
        break;
      default:
        nextDueDate = new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 1));
    }

    await supabase
      .from('payment_templates')
      .update({
        last_processed_date: new Date().toISOString().split('T')[0],
        next_due_date: nextDueDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', template.id);

    console.log(`Updated next due date for template ${template.id}: ${nextDueDate.toISOString().split('T')[0]}`);
  } catch (error) {
    console.error('Failed to update next due date:', error);
  }
}

/**
 * Schedule payment retry for failed payments
 * Implements exponential backoff: 1 day, 3 days, 7 days
 */
async function schedulePaymentRetry(template: PaymentTemplate, failureReason: string): Promise<void> {
  try {
    // Get count of recent failed attempts
    const { data: failedAttempts } = await supabase
      .from('payment_history')
      .select('id')
      .eq('payment_template_id', template.id)
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('created_at', { ascending: false });

    const attemptCount = failedAttempts?.length || 0;

    if (attemptCount >= template.max_retry_attempts) {
      console.log(`Max retry attempts reached for template ${template.id}. Disabling autopay.`);

      // Disable autopay after max retries
      await supabase
        .from('payment_templates')
        .update({
          auto_process: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id);

      // TODO: Send notification to tenant and property manager about disabled autopay

      return;
    }

    // Calculate retry delay with exponential backoff
    const retryDelays = [1, 3, 7]; // days
    const retryDelay = retryDelays[Math.min(attemptCount, retryDelays.length - 1)];
    const retryDate = new Date();
    retryDate.setDate(retryDate.getDate() + retryDelay);

    console.log(`Scheduling retry #${attemptCount + 1} for template ${template.id} in ${retryDelay} days`);

    // TODO: In production, schedule actual retry job
    // For now, we'll log the scheduled retry
    console.log(`Retry scheduled for ${retryDate.toISOString().split('T')[0]}`);

  } catch (error) {
    console.error('Failed to schedule payment retry:', error);
  }
}

/**
 * Send payment reminders for upcoming due dates
 * Should be called daily by cron job
 */
export async function sendPaymentReminders(): Promise<{
  sent: number;
  errors: string[];
}> {
  const results = {
    sent: 0,
    errors: [] as string[]
  };

  try {
    const today = new Date();

    // Get all active templates with reminders enabled
    const { data: templates, error } = await supabase
      .from('payment_templates')
      .select(`
        *,
        tenants:tenant_id(first_name, last_name, email),
        leases:lease_id(property_id, unit_id)
      `)
      .eq('is_active', true)
      .eq('send_reminder', true);

    if (error) {
      results.errors.push(error.message);
      return results;
    }

    if (!templates) return results;

    for (const template of templates) {
      try {
        if (!template.next_due_date) continue;

        const dueDate = new Date(template.next_due_date);
        const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Send reminder if due date is within reminder window
        if (daysUntilDue === template.reminder_days) {
          await sendReminderEmail(template);
          results.sent++;
        }
      } catch (err) {
        results.errors.push(`Failed to send reminder for template ${template.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    console.log(`Sent ${results.sent} payment reminders`);
    return results;

  } catch (error) {
    console.error('Payment reminder error:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
}

/**
 * Send payment reminder email to tenant
 */
async function sendReminderEmail(template: any): Promise<void> {
  // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
  console.log(`Sending payment reminder to tenant ${template.tenant_id}`);
  console.log(`Amount: $${template.amount}, Due: ${template.next_due_date}`);

  // For now, just log the reminder
  // In production, this would send an actual email
}

/**
 * Get autopay status for a tenant
 */
export async function getAutopayStatus(tenantId: string): Promise<PaymentTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('payment_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Failed to get autopay status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get autopay status error:', error);
    return null;
  }
}

/**
 * Enable autopay for a tenant
 */
export async function enableAutopay(
  tenantId: string,
  leaseId: string,
  paymentMethodId: string,
  paymentMethodType: 'card' | 'ach' | 'bank_account',
  amount: number,
  dayOfMonth: number = 1
): Promise<{ success: boolean; error?: string; template?: PaymentTemplate }> {
  try {
    // Calculate first due date
    const today = new Date();
    const nextDueDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
    if (nextDueDate < today) {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    const { data: template, error } = await supabase
      .from('payment_templates')
      .insert({
        tenant_id: tenantId,
        lease_id: leaseId,
        payment_method_id: paymentMethodId,
        payment_method_type: paymentMethodType,
        amount,
        frequency: 'monthly',
        day_of_month: dayOfMonth,
        start_date: new Date().toISOString().split('T')[0],
        next_due_date: nextDueDate.toISOString().split('T')[0],
        is_active: true,
        auto_process: true,
        send_reminder: true,
        reminder_days: 3,
        retry_on_failure: true,
        max_retry_attempts: 3
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    console.log(`Autopay enabled for tenant ${tenantId}`);
    return { success: true, template };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Disable autopay for a tenant
 */
export async function disableAutopay(tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('payment_templates')
      .update({
        is_active: false,
        auto_process: false,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) {
      return { success: false, error: error.message };
    }

    console.log(`Autopay disabled for tenant ${tenantId}`);
    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
