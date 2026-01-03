-- Phase 2: Automation & Workflows - Additional Database Tables
-- Execute this SQL in Supabase SQL Editor after phase1-missing-tables.sql

-- ============================================================================
-- LEASE RENEWAL OFFERS TABLE
-- Tracks automated lease renewal offers and tenant responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS lease_renewal_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES people(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  current_rent DECIMAL(10,2) NOT NULL,
  proposed_rent DECIMAL(10,2) NOT NULL,
  rent_increase_percentage DECIMAL(5,2) NOT NULL,
  current_end_date DATE NOT NULL,
  proposed_start_date DATE NOT NULL,
  proposed_end_date DATE NOT NULL,
  offer_sent_date DATE NOT NULL,
  offer_expiration_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'countered')),
  tenant_response_date DATE,
  counter_offer_rent DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lease renewal offers
CREATE INDEX IF NOT EXISTS idx_lease_renewal_offers_lease_id ON lease_renewal_offers(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_renewal_offers_tenant_id ON lease_renewal_offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lease_renewal_offers_status ON lease_renewal_offers(status);
CREATE INDEX IF NOT EXISTS idx_lease_renewal_offers_expiration ON lease_renewal_offers(offer_expiration_date)
  WHERE status = 'pending';

-- ============================================================================
-- MAINTENANCE SCHEDULES TABLE
-- Preventive maintenance scheduling and recurring tasks
-- ============================================================================
CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) CHECK (category IN (
    'plumbing', 'electrical', 'hvac', 'appliances', 'carpentry',
    'painting', 'flooring', 'roofing', 'landscaping', 'cleaning', 'other'
  )),
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'semi-annual', 'annual', 'seasonal')),
  next_due_date DATE NOT NULL,
  last_completed_date DATE,
  auto_create_work_order BOOLEAN DEFAULT true,
  assign_to_vendor_id UUID REFERENCES people(id) ON DELETE SET NULL,
  estimated_cost DECIMAL(10,2),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for maintenance schedules
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_property_id ON maintenance_schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_next_due ON maintenance_schedules(next_due_date)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_frequency ON maintenance_schedules(frequency)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_vendor ON maintenance_schedules(assign_to_vendor_id);

-- ============================================================================
-- APPROVAL REQUESTS TABLE
-- Budget and expense approval workflow management
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('work_order', 'expense', 'lease', 'payment')),
  entity_id UUID NOT NULL,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('budget_approval', 'expense_approval', 'contract_approval')),
  amount DECIMAL(10,2) NOT NULL,
  requester_id UUID REFERENCES people(id) ON DELETE SET NULL,
  approver_id UUID REFERENCES people(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  reason TEXT NOT NULL,
  notes TEXT,
  approval_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for approval requests
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approver ON approval_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_pending ON approval_requests(status, priority, requested_at)
  WHERE status = 'pending';

-- ============================================================================
-- APPROVAL THRESHOLDS TABLE
-- Configurable approval thresholds by category and property
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  threshold_amount DECIMAL(10,2) NOT NULL,
  requires_approval BOOLEAN DEFAULT true,
  auto_approve_below DECIMAL(10,2) DEFAULT 0,
  requires_multiple_approvers BOOLEAN DEFAULT false,
  approver_count INTEGER DEFAULT 1 CHECK (approver_count > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, category)
);

-- Indexes for approval thresholds
CREATE INDEX IF NOT EXISTS idx_approval_thresholds_property ON approval_thresholds(property_id);
CREATE INDEX IF NOT EXISTS idx_approval_thresholds_category ON approval_thresholds(category);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- System notifications for automated workflows
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES people(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL CHECK (type IN (
    'payment_reminder', 'payment_failed', 'lease_expiring', 'renewal_offer',
    'work_order_assigned', 'approval_required', 'maintenance_due', 'task_overdue'
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);

-- ============================================================================
-- AUTOMATED JOBS LOG TABLE
-- Track execution of automated background jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS automated_jobs_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  job_type VARCHAR(50) NOT NULL CHECK (job_type IN (
    'autopay_processing', 'lease_renewal', 'maintenance_scheduling',
    'work_order_routing', 'payment_reminders', 'approval_expiration'
  )),
  status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for automated jobs log
CREATE INDEX IF NOT EXISTS idx_automated_jobs_log_job_type ON automated_jobs_log(job_type);
CREATE INDEX IF NOT EXISTS idx_automated_jobs_log_status ON automated_jobs_log(status);
CREATE INDEX IF NOT EXISTS idx_automated_jobs_log_started ON automated_jobs_log(started_at DESC);

-- ============================================================================
-- VENDOR PERFORMANCE METRICS TABLE
-- Track vendor performance for intelligent routing
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES people(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_jobs INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  cancelled_jobs INTEGER DEFAULT 0,
  avg_response_time_hours DECIMAL(10,2), -- Hours to accept/start job
  avg_completion_time_hours DECIMAL(10,2), -- Hours to complete job
  avg_rating DECIMAL(3,2), -- 0-5 rating
  total_revenue DECIMAL(10,2) DEFAULT 0,
  on_time_completion_rate DECIMAL(5,2), -- Percentage
  customer_satisfaction_score DECIMAL(3,2), -- 0-5
  repeat_work_rate DECIMAL(5,2), -- Percentage of jobs requiring rework
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vendor_id, period_start, period_end)
);

-- Indexes for vendor performance metrics
CREATE INDEX IF NOT EXISTS idx_vendor_performance_vendor ON vendor_performance_metrics(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_performance_period ON vendor_performance_metrics(period_start, period_end);

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample approval thresholds
INSERT INTO approval_thresholds (property_id, category, threshold_amount, auto_approve_below, requires_multiple_approvers, approver_count)
VALUES
  (NULL, 'maintenance', 500, 200, false, 1),
  (NULL, 'repairs', 1000, 300, false, 1),
  (NULL, 'capital_improvement', 2000, 0, true, 2),
  (NULL, 'emergency', 5000, 500, false, 1)
ON CONFLICT (property_id, category) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Phase 2 automation tables created successfully!';
  RAISE NOTICE 'Created tables: lease_renewal_offers, maintenance_schedules, approval_requests, approval_thresholds, notifications, automated_jobs_log, vendor_performance_metrics';
  RAISE NOTICE 'Total new tables: 7';
END $$;
