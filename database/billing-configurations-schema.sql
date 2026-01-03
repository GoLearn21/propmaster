-- ============================================================================
-- BILLING CONFIGURATIONS TABLE - State-Compliant Property Billing Settings
-- ============================================================================
-- Supports NC, SC, GA state compliance rules
-- Tracks late fee settings, billing cycles, and pending actions per property
-- ============================================================================

BEGIN;

-- ====================
-- 1. BILLING CONFIGURATIONS
-- ====================
CREATE TABLE IF NOT EXISTS billing_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- State Compliance
  state VARCHAR(2) NOT NULL CHECK (state IN ('NC', 'SC', 'GA')),

  -- Late Fee Settings (State-Specific)
  late_fee_type VARCHAR(20) DEFAULT 'percentage' CHECK (late_fee_type IN ('percentage', 'flat', 'daily')),
  late_fee_amount DECIMAL(10,2) DEFAULT 5.00,
  grace_period_days INTEGER DEFAULT 5,
  max_late_fee_amount DECIMAL(10,2),  -- NC caps at greater of $15 or 5%

  -- Billing Cycle
  billing_day INTEGER DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28),
  prorate_partial_months BOOLEAN DEFAULT true,
  auto_generate_invoices BOOLEAN DEFAULT true,

  -- Payment Settings
  accept_partial_payments BOOLEAN DEFAULT true,
  payment_methods JSONB DEFAULT '["ach", "credit_card", "check"]'::jsonb,

  -- Reminders
  reminder_days_before_due INTEGER DEFAULT 5,
  reminder_days_after_due INTEGER DEFAULT 1,
  send_reminder_emails BOOLEAN DEFAULT true,
  send_reminder_sms BOOLEAN DEFAULT false,

  -- Compliance Status
  compliance_status VARCHAR(20) DEFAULT 'compliant' CHECK (compliance_status IN ('compliant', 'warning', 'non_compliant')),
  last_compliance_check TIMESTAMP WITH TIME ZONE,
  compliance_notes TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,

  -- Ensure one config per property
  CONSTRAINT unique_property_billing_config UNIQUE (property_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_config_property ON billing_configurations(property_id);
CREATE INDEX IF NOT EXISTS idx_billing_config_state ON billing_configurations(state);
CREATE INDEX IF NOT EXISTS idx_billing_config_compliance ON billing_configurations(compliance_status);
CREATE INDEX IF NOT EXISTS idx_billing_config_active ON billing_configurations(is_active);

-- ====================
-- 2. PENDING BILLING ACTIONS
-- ====================
CREATE TABLE IF NOT EXISTS billing_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_configuration_id UUID NOT NULL REFERENCES billing_configurations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'late_fee_review',
    'billing_day_change',
    'compliance_update',
    'reminder_config',
    'approval_needed',
    'rate_adjustment',
    'payment_method_update'
  )),

  description TEXT NOT NULL,
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  due_date DATE,

  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
  assigned_to UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_actions_config ON billing_pending_actions(billing_configuration_id);
CREATE INDEX IF NOT EXISTS idx_billing_actions_property ON billing_pending_actions(property_id);
CREATE INDEX IF NOT EXISTS idx_billing_actions_status ON billing_pending_actions(status);
CREATE INDEX IF NOT EXISTS idx_billing_actions_priority ON billing_pending_actions(priority);

-- ====================
-- 3. BILLING HISTORY (Audit Trail)
-- ====================
CREATE TABLE IF NOT EXISTS billing_configuration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_configuration_id UUID NOT NULL REFERENCES billing_configurations(id) ON DELETE CASCADE,

  change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
    'created', 'updated', 'compliance_check', 'late_fee_change', 'billing_cycle_change'
  )),

  previous_values JSONB,
  new_values JSONB,
  change_reason TEXT,

  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_history_config ON billing_configuration_history(billing_configuration_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_date ON billing_configuration_history(changed_at DESC);

-- ====================
-- 4. STATE COMPLIANCE RULES (Reference Table)
-- ====================
CREATE TABLE IF NOT EXISTS state_compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(2) NOT NULL UNIQUE CHECK (state IN ('NC', 'SC', 'GA')),
  state_name VARCHAR(100) NOT NULL,

  -- Late Fee Rules
  max_late_fee_percent DECIMAL(5,2),
  min_late_fee_amount DECIMAL(10,2),
  grace_period_required INTEGER,

  -- Security Deposit Rules
  max_security_deposit_months DECIMAL(3,1),
  return_deadline_days INTEGER,
  interest_required BOOLEAN DEFAULT false,

  -- Statute References
  late_fee_citation TEXT,
  security_deposit_citation TEXT,

  description TEXT,
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert state compliance rules
INSERT INTO state_compliance_rules (state, state_name, max_late_fee_percent, min_late_fee_amount, grace_period_required, max_security_deposit_months, return_deadline_days, interest_required, late_fee_citation, security_deposit_citation, description) VALUES
('NC', 'North Carolina', 5.00, 15.00, 5, 2.0, 30, false, 'NC Gen. Stat. § 42-46', 'NC Gen. Stat. § 42-51, 42-52', 'Late fee capped at greater of $15 or 5% of rent. 5-day grace period required. Security deposit max 2 months, return within 30 days.'),
('SC', 'South Carolina', NULL, NULL, 5, NULL, 30, false, 'SC Code § 27-40-310', 'SC Code § 27-40-410', 'Late fee must be reasonable and stated in lease. 5-day grace period customary. Security deposit return within 30 days.'),
('GA', 'Georgia', NULL, NULL, 0, NULL, 30, false, 'GA Code § 44-7-2', 'GA Code § 44-7-30 to 44-7-37', 'No statutory limit on late fees. No grace period required. Security deposit return within 30 days.')
ON CONFLICT (state) DO NOTHING;

-- ====================
-- 5. ROW LEVEL SECURITY
-- ====================

ALTER TABLE billing_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_pending_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_configuration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_compliance_rules ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view billing configurations
DROP POLICY IF EXISTS billing_config_select_policy ON billing_configurations;
CREATE POLICY billing_config_select_policy ON billing_configurations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert/update billing configurations
DROP POLICY IF EXISTS billing_config_insert_policy ON billing_configurations;
CREATE POLICY billing_config_insert_policy ON billing_configurations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS billing_config_update_policy ON billing_configurations;
CREATE POLICY billing_config_update_policy ON billing_configurations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to view pending actions
DROP POLICY IF EXISTS billing_actions_select_policy ON billing_pending_actions;
CREATE POLICY billing_actions_select_policy ON billing_pending_actions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to view history
DROP POLICY IF EXISTS billing_history_select_policy ON billing_configuration_history;
CREATE POLICY billing_history_select_policy ON billing_configuration_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow all authenticated users to view state compliance rules
DROP POLICY IF EXISTS state_rules_select_policy ON state_compliance_rules;
CREATE POLICY state_rules_select_policy ON state_compliance_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ====================
-- 6. HELPER FUNCTIONS
-- ====================

-- Function to validate billing configuration against state rules
CREATE OR REPLACE FUNCTION validate_billing_compliance()
RETURNS TRIGGER AS $$
DECLARE
  state_rules state_compliance_rules%ROWTYPE;
BEGIN
  -- Get state compliance rules
  SELECT * INTO state_rules FROM state_compliance_rules WHERE state = NEW.state;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown state: %', NEW.state;
  END IF;

  -- Validate grace period for NC and SC
  IF NEW.state IN ('NC', 'SC') AND NEW.grace_period_days < COALESCE(state_rules.grace_period_required, 0) THEN
    NEW.compliance_status := 'non_compliant';
    NEW.compliance_notes := format('Grace period must be at least %s days for %s',
      state_rules.grace_period_required, state_rules.state_name);
  END IF;

  -- Validate late fee percentage for NC
  IF NEW.state = 'NC' AND NEW.late_fee_type = 'percentage'
    AND NEW.late_fee_amount > COALESCE(state_rules.max_late_fee_percent, 100) THEN
    NEW.compliance_status := 'non_compliant';
    NEW.compliance_notes := format('Late fee cannot exceed %s%% in North Carolina',
      state_rules.max_late_fee_percent);
  END IF;

  -- Set last compliance check
  NEW.last_compliance_check := NOW();
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for compliance validation
DROP TRIGGER IF EXISTS trg_validate_billing_compliance ON billing_configurations;
CREATE TRIGGER trg_validate_billing_compliance
  BEFORE INSERT OR UPDATE ON billing_configurations
  FOR EACH ROW
  EXECUTE FUNCTION validate_billing_compliance();

-- ====================
-- SUCCESS MESSAGE
-- ====================

DO $$ BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Billing Configurations Schema Created!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  - billing_configurations (per-property settings)';
  RAISE NOTICE '  - billing_pending_actions (action items)';
  RAISE NOTICE '  - billing_configuration_history (audit trail)';
  RAISE NOTICE '  - state_compliance_rules (NC, SC, GA rules)';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - State-specific late fee validation';
  RAISE NOTICE '  - Grace period enforcement';
  RAISE NOTICE '  - Compliance status tracking';
  RAISE NOTICE '  - Pending action management';
  RAISE NOTICE '  - Full audit history';
  RAISE NOTICE '====================================================';
END $$;

COMMIT;
