-- =====================================================
-- PHASE 4: TENANT INVITES ENHANCEMENT
-- Adds status tracking, auto-reminders, and PM invite generation
-- Based on market research: Rentvine, DoorLoop, COHO
-- =====================================================

-- =====================================================
-- 1. ENHANCE TENANT_INVITES TABLE
-- Add status tracking and reminder fields
-- =====================================================

-- Add status column with CHECK constraint
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'));

-- Add accepted_at for tracking when invite was used (separate from used_at for clarity)
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;

-- Rename invited_by to created_by for consistency with plan (if exists)
-- Note: using DO block to check if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_invites' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE tenant_invites RENAME COLUMN invited_by TO created_by;
  ELSE
    -- Add if neither exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'tenant_invites' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE tenant_invites ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
  END IF;
END $$;

-- Add reminder tracking fields for auto-reminders (Rentvine pattern)
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Add tenant first/last name for pre-filling signup form
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add property/unit context for better UX
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES leases(id) ON DELETE SET NULL;

-- Add revocation tracking
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES auth.users(id);
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS revoke_reason TEXT;

-- =====================================================
-- 2. ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for status filtering (pending invites for reminder job)
CREATE INDEX IF NOT EXISTS idx_tenant_invites_status
  ON tenant_invites(status);

-- Index for finding pending invites that need reminders
CREATE INDEX IF NOT EXISTS idx_tenant_invites_pending_reminders
  ON tenant_invites(status, expires_at, reminder_sent_at)
  WHERE status = 'pending';

-- Index for email lookup during signup
CREATE INDEX IF NOT EXISTS idx_tenant_invites_email_status
  ON tenant_invites(email, status);

-- =====================================================
-- 3. UPDATE RLS POLICIES
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS tenant_invites_policy ON tenant_invites;

-- Tenants can view their own pending invite by email
CREATE POLICY tenant_invites_select_by_email ON tenant_invites
  FOR SELECT USING (
    email = COALESCE(auth.email(), '')
    AND status = 'pending'
    AND expires_at > NOW()
  );

-- Property managers can manage all invites
DROP POLICY IF EXISTS tenant_invites_manager_policy ON tenant_invites;
CREATE POLICY tenant_invites_manager_policy ON tenant_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('property_manager', 'admin', 'super_admin')
    )
  );

-- =====================================================
-- 4. FUNCTIONS FOR INVITE MANAGEMENT
-- =====================================================

-- Function to create a new tenant invite
CREATE OR REPLACE FUNCTION create_tenant_invite(
  p_tenant_id UUID,
  p_email VARCHAR(255),
  p_first_name VARCHAR(100) DEFAULT NULL,
  p_last_name VARCHAR(100) DEFAULT NULL,
  p_phone VARCHAR(20) DEFAULT NULL,
  p_property_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_lease_id UUID DEFAULT NULL,
  p_expiry_days INTEGER DEFAULT 7
)
RETURNS tenant_invites AS $$
DECLARE
  v_invite tenant_invites;
  v_invite_code VARCHAR(64);
BEGIN
  -- Generate secure invite code (64 chars, cryptographically secure)
  v_invite_code := encode(gen_random_bytes(32), 'hex');

  -- Insert invite record
  INSERT INTO tenant_invites (
    tenant_id,
    email,
    invite_code,
    first_name,
    last_name,
    phone,
    property_id,
    unit_id,
    lease_id,
    created_by,
    expires_at,
    status
  ) VALUES (
    p_tenant_id,
    LOWER(TRIM(p_email)),
    v_invite_code,
    p_first_name,
    p_last_name,
    p_phone,
    p_property_id,
    p_unit_id,
    p_lease_id,
    auth.uid(),
    NOW() + (p_expiry_days || ' days')::INTERVAL,
    'pending'
  )
  RETURNING * INTO v_invite;

  RETURN v_invite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate invite code
CREATE OR REPLACE FUNCTION validate_invite_code(p_invite_code VARCHAR(64))
RETURNS TABLE (
  valid BOOLEAN,
  error_code VARCHAR(50),
  tenant_id UUID,
  email VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  property_id UUID,
  unit_id UUID,
  lease_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_invite tenant_invites;
BEGIN
  -- Find invite by code
  SELECT * INTO v_invite
  FROM tenant_invites ti
  WHERE ti.invite_code = p_invite_code;

  -- Check if invite exists
  IF v_invite.id IS NULL THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      'INVALID_CODE'::VARCHAR(50),
      NULL::UUID,
      NULL::VARCHAR(255),
      NULL::VARCHAR(100),
      NULL::VARCHAR(100),
      NULL::VARCHAR(20),
      NULL::UUID,
      NULL::UUID,
      NULL::UUID,
      NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Check if already accepted
  IF v_invite.status = 'accepted' THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      'ALREADY_USED'::VARCHAR(50),
      NULL::UUID,
      NULL::VARCHAR(255),
      NULL::VARCHAR(100),
      NULL::VARCHAR(100),
      NULL::VARCHAR(20),
      NULL::UUID,
      NULL::UUID,
      NULL::UUID,
      NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Check if revoked
  IF v_invite.status = 'revoked' THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      'REVOKED'::VARCHAR(50),
      NULL::UUID,
      NULL::VARCHAR(255),
      NULL::VARCHAR(100),
      NULL::VARCHAR(100),
      NULL::VARCHAR(20),
      NULL::UUID,
      NULL::UUID,
      NULL::UUID,
      NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Check if expired
  IF v_invite.expires_at < NOW() THEN
    -- Update status to expired
    UPDATE tenant_invites SET status = 'expired' WHERE id = v_invite.id;

    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      'EXPIRED'::VARCHAR(50),
      NULL::UUID,
      NULL::VARCHAR(255),
      NULL::VARCHAR(100),
      NULL::VARCHAR(100),
      NULL::VARCHAR(20),
      NULL::UUID,
      NULL::UUID,
      NULL::UUID,
      NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Valid invite
  RETURN QUERY SELECT
    TRUE::BOOLEAN,
    NULL::VARCHAR(50),
    v_invite.tenant_id,
    v_invite.email,
    v_invite.first_name,
    v_invite.last_name,
    v_invite.phone,
    v_invite.property_id,
    v_invite.unit_id,
    v_invite.lease_id,
    v_invite.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invite (mark as used)
CREATE OR REPLACE FUNCTION accept_tenant_invite(p_invite_code VARCHAR(64))
RETURNS BOOLEAN AS $$
DECLARE
  v_invite_id UUID;
BEGIN
  UPDATE tenant_invites
  SET
    status = 'accepted',
    accepted_at = NOW(),
    used_at = NOW()
  WHERE invite_code = p_invite_code
    AND status = 'pending'
    AND expires_at > NOW()
  RETURNING id INTO v_invite_id;

  RETURN v_invite_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke invite
CREATE OR REPLACE FUNCTION revoke_tenant_invite(
  p_invite_code VARCHAR(64),
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_invite_id UUID;
BEGIN
  UPDATE tenant_invites
  SET
    status = 'revoked',
    revoked_at = NOW(),
    revoked_by = auth.uid(),
    revoke_reason = p_reason
  WHERE invite_code = p_invite_code
    AND status = 'pending'
  RETURNING id INTO v_invite_id;

  RETURN v_invite_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending invites needing reminders (for cron job)
CREATE OR REPLACE FUNCTION get_invites_for_reminder()
RETURNS SETOF tenant_invites AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tenant_invites
  WHERE status = 'pending'
    AND expires_at > NOW()
    AND reminder_count < 3  -- Max 3 reminders (like Rentvine)
    AND (
      reminder_sent_at IS NULL
      OR reminder_sent_at < NOW() - INTERVAL '1 day'  -- Daily reminders
    )
  ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark reminder sent
CREATE OR REPLACE FUNCTION mark_invite_reminder_sent(p_invite_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tenant_invites
  SET
    reminder_sent_at = NOW(),
    reminder_count = reminder_count + 1
  WHERE id = p_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. AUTO-EXPIRE INVITES (Scheduled function)
-- =====================================================

-- Function to auto-expire old pending invites
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE tenant_invites
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TENANT ONBOARDING STATUS TRACKING
-- =====================================================

-- Add onboarding fields to tenants table if not exists
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_onboarding_step INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_onboarding_started_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- 7. NOTIFICATION PREFERENCES TABLE (Email-only per user choice)
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Email notification preferences
  email_payment_reminders BOOLEAN DEFAULT true,
  email_payment_receipts BOOLEAN DEFAULT true,
  email_maintenance_updates BOOLEAN DEFAULT true,
  email_lease_notifications BOOLEAN DEFAULT true,
  email_announcements BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,

  -- Digest preferences
  email_digest_frequency VARCHAR(20) DEFAULT 'immediate'
    CHECK (email_digest_frequency IN ('immediate', 'daily', 'weekly', 'never')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_tenant_notification_prefs UNIQUE (tenant_id)
);

-- Index for tenant lookup
CREATE INDEX IF NOT EXISTS idx_tenant_notification_prefs_tenant
  ON tenant_notification_preferences(tenant_id);

-- RLS for notification preferences
ALTER TABLE tenant_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_notification_prefs_policy ON tenant_notification_preferences;
CREATE POLICY tenant_notification_prefs_policy ON tenant_notification_preferences
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_tenant_notification_prefs_updated_at ON tenant_notification_preferences;
CREATE TRIGGER update_tenant_notification_prefs_updated_at
  BEFORE UPDATE ON tenant_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create default notification preferences for new tenant
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tenant_notification_preferences (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_default_notification_prefs ON tenants;
CREATE TRIGGER trigger_create_default_notification_prefs
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_tenant_invite TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invite_code TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_tenant_invite TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_tenant_invite TO authenticated;
GRANT EXECUTE ON FUNCTION get_invites_for_reminder TO service_role;
GRANT EXECUTE ON FUNCTION mark_invite_reminder_sent TO service_role;
GRANT EXECUTE ON FUNCTION expire_old_invites TO service_role;
