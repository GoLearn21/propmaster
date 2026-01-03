-- =====================================================
-- TENANT PORTAL DATABASE SCHEMA
-- PropMaster Property Management System
-- Based on market research from Rentvine, DoorLoop, AppFolio, Buildium
-- =====================================================

-- =====================================================
-- 1. TENANT PAYMENT METHODS (Stripe integration)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('card', 'us_bank_account')),
  last4 VARCHAR(4) NOT NULL,
  brand VARCHAR(50),                    -- For cards: visa, mastercard, amex, discover
  bank_name VARCHAR(255),               -- For ACH bank accounts
  account_type VARCHAR(20),             -- checking, savings
  exp_month INTEGER,                    -- Card expiration month
  exp_year INTEGER,                     -- Card expiration year
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,    -- For ACH accounts (micro-deposits verified)
  plaid_account_id VARCHAR(255),        -- If linked via Plaid
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_stripe_payment_method UNIQUE (stripe_payment_method_id)
);

-- =====================================================
-- 2. TENANT NOTIFICATIONS (In-app real-time)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'payment_reminder',      -- Rent due soon
    'payment_received',      -- Payment confirmed
    'payment_failed',        -- Payment declined
    'payment_refunded',      -- Payment refunded
    'maintenance_created',   -- New request submitted
    'maintenance_assigned',  -- Vendor assigned
    'maintenance_scheduled', -- Appointment scheduled
    'maintenance_updated',   -- Status changed
    'maintenance_completed', -- Work finished
    'lease_renewal',         -- Renewal offer
    'lease_expiring',        -- Lease ending soon
    'document_uploaded',     -- New document available
    'announcement',          -- Property announcement
    'system'                 -- System notification
  )),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,                      -- Deep link to relevant page
  related_table VARCHAR(100),           -- e.g., 'payment_history', 'work_orders'
  related_id UUID,                      -- ID of related record
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. MAINTENANCE REQUEST IMAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS maintenance_request_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES tenants(id) ON DELETE SET NULL,
  uploaded_by_role VARCHAR(20) DEFAULT 'tenant' CHECK (uploaded_by_role IN ('tenant', 'vendor', 'manager')),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,                    -- Size in bytes
  mime_type VARCHAR(100),
  caption TEXT,
  image_order INTEGER DEFAULT 0,        -- For sorting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. MAINTENANCE STATUS HISTORY (Timeline tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS maintenance_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_role VARCHAR(50),          -- tenant, vendor, manager, system
  notes TEXT,
  metadata JSONB,                       -- Additional context (vendor name, scheduled time, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. TENANT DOCUMENTS (Insurance, IDs, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
    'insurance_certificate',    -- Renters insurance
    'pet_documentation',        -- Pet registration/vaccination
    'income_verification',      -- Pay stubs, tax returns
    'id_document',              -- Driver's license, passport
    'move_in_photos',           -- Move-in condition photos
    'move_out_photos',          -- Move-out condition photos
    'lease_addendum',           -- Lease modifications
    'other'
  )),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  expires_at DATE,                      -- For insurance certificates
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. PAYMENT RECEIPTS (Generated PDFs)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payment_history(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_number VARCHAR(50) NOT NULL,
  pdf_url TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_receipt_number UNIQUE (receipt_number),
  CONSTRAINT unique_payment_receipt UNIQUE (payment_id)
);

-- =====================================================
-- 7. TENANT INVITES (Invite-only registration)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invite_code VARCHAR(64) NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_invite_code UNIQUE (invite_code)
);

-- =====================================================
-- ENHANCE EXISTING TABLES
-- =====================================================

-- Enhanced work_orders for tenant portal
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS tenant_notes TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS tenant_preferred_time VARCHAR(100);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS entry_permission BOOLEAN DEFAULT true;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS entry_instructions TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS tenant_rating INTEGER CHECK (tenant_rating >= 1 AND tenant_rating <= 5);
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS tenant_feedback TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS scheduled_time_start TIME;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS scheduled_time_end TIME;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS vendor_arrival_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS vendor_completion_time TIMESTAMP WITH TIME ZONE;

-- Enhanced payment_history for tenant portal
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS processing_fee DECIMAL(10,2);
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS stripe_charge_id VARCHAR(255);
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2);
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS refund_date TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Payment methods
CREATE INDEX IF NOT EXISTS idx_tenant_payment_methods_tenant
  ON tenant_payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payment_methods_default
  ON tenant_payment_methods(tenant_id) WHERE is_default = true;

-- Notifications
CREATE INDEX IF NOT EXISTS idx_tenant_notifications_tenant
  ON tenant_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notifications_unread
  ON tenant_notifications(tenant_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_tenant_notifications_created
  ON tenant_notifications(created_at DESC);

-- Maintenance images
CREATE INDEX IF NOT EXISTS idx_maintenance_images_work_order
  ON maintenance_request_images(work_order_id);

-- Status history
CREATE INDEX IF NOT EXISTS idx_maintenance_status_work_order
  ON maintenance_status_history(work_order_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status_created
  ON maintenance_status_history(created_at DESC);

-- Tenant documents
CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenant
  ON tenant_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_type
  ON tenant_documents(tenant_id, document_type);

-- Invites
CREATE INDEX IF NOT EXISTS idx_tenant_invites_code
  ON tenant_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_email
  ON tenant_invites(email);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE tenant_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_request_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invites ENABLE ROW LEVEL SECURITY;

-- Payment Methods: Tenants can only see/manage their own payment methods
DROP POLICY IF EXISTS tenant_payment_methods_tenant_policy ON tenant_payment_methods;
CREATE POLICY tenant_payment_methods_tenant_policy ON tenant_payment_methods
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

-- Notifications: Tenants can only see their own notifications
DROP POLICY IF EXISTS tenant_notifications_tenant_policy ON tenant_notifications;
CREATE POLICY tenant_notifications_tenant_policy ON tenant_notifications
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

-- Maintenance Images: Tenants can see images for their work orders
DROP POLICY IF EXISTS maintenance_images_tenant_policy ON maintenance_request_images;
CREATE POLICY maintenance_images_tenant_policy ON maintenance_request_images
  FOR ALL USING (
    work_order_id IN (
      SELECT id FROM work_orders WHERE tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
      )
    )
  );

-- Status History: Tenants can see history for their work orders
DROP POLICY IF EXISTS maintenance_status_tenant_policy ON maintenance_status_history;
CREATE POLICY maintenance_status_tenant_policy ON maintenance_status_history
  FOR SELECT USING (
    work_order_id IN (
      SELECT id FROM work_orders WHERE tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
      )
    )
  );

-- Tenant Documents: Tenants can only see their own documents
DROP POLICY IF EXISTS tenant_documents_tenant_policy ON tenant_documents;
CREATE POLICY tenant_documents_tenant_policy ON tenant_documents
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

-- Payment Receipts: Tenants can only see their own receipts
DROP POLICY IF EXISTS payment_receipts_tenant_policy ON payment_receipts;
CREATE POLICY payment_receipts_tenant_policy ON payment_receipts
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

-- Invites: No direct tenant access (managed by property managers)
DROP POLICY IF EXISTS tenant_invites_policy ON tenant_invites;
CREATE POLICY tenant_invites_policy ON tenant_invites
  FOR SELECT USING (
    email = auth.email() AND used_at IS NULL AND expires_at > NOW()
  );

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tenant_payment_methods_updated_at ON tenant_payment_methods;
CREATE TRIGGER update_tenant_payment_methods_updated_at
  BEFORE UPDATE ON tenant_payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_documents_updated_at ON tenant_documents;
CREATE TRIGGER update_tenant_documents_updated_at
  BEFORE UPDATE ON tenant_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: Auto-create notification on maintenance status change
-- =====================================================
CREATE OR REPLACE FUNCTION notify_maintenance_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_title VARCHAR(255);
  v_message TEXT;
  v_type VARCHAR(50);
BEGIN
  -- Get tenant_id from work order
  SELECT tenant_id INTO v_tenant_id FROM work_orders WHERE id = NEW.work_order_id;

  IF v_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine notification type and message based on status
  CASE NEW.new_status
    WHEN 'assigned' THEN
      v_type := 'maintenance_assigned';
      v_title := 'Technician Assigned';
      v_message := 'A technician has been assigned to your maintenance request.';
    WHEN 'scheduled' THEN
      v_type := 'maintenance_scheduled';
      v_title := 'Appointment Scheduled';
      v_message := 'Your maintenance appointment has been scheduled.';
    WHEN 'in_progress' THEN
      v_type := 'maintenance_updated';
      v_title := 'Work in Progress';
      v_message := 'A technician is currently working on your maintenance request.';
    WHEN 'completed' THEN
      v_type := 'maintenance_completed';
      v_title := 'Maintenance Completed';
      v_message := 'Your maintenance request has been completed. Please rate your experience!';
    ELSE
      v_type := 'maintenance_updated';
      v_title := 'Status Updated';
      v_message := 'Your maintenance request status has been updated to: ' || NEW.new_status;
  END CASE;

  -- Insert notification
  INSERT INTO tenant_notifications (
    tenant_id, type, title, message, action_url, related_table, related_id, priority
  ) VALUES (
    v_tenant_id,
    v_type,
    v_title,
    v_message,
    '/tenant/maintenance/' || NEW.work_order_id,
    'work_orders',
    NEW.work_order_id,
    CASE WHEN NEW.new_status = 'completed' THEN 'high' ELSE 'normal' END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_maintenance_status ON maintenance_status_history;
CREATE TRIGGER trigger_notify_maintenance_status
  AFTER INSERT ON maintenance_status_history
  FOR EACH ROW EXECUTE FUNCTION notify_maintenance_status_change();

-- =====================================================
-- TRIGGER: Auto-record status history on work order update
-- =====================================================
CREATE OR REPLACE FUNCTION record_work_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO maintenance_status_history (
      work_order_id, old_status, new_status, changed_by_role, notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      'system',
      'Status changed automatically'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_record_work_order_status ON work_orders;
CREATE TRIGGER trigger_record_work_order_status
  AFTER UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION record_work_order_status_change();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Generate unique receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year VARCHAR(4);
  v_sequence INTEGER;
  v_receipt_number VARCHAR(50);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 6 FOR 6) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM payment_receipts
  WHERE receipt_number LIKE 'RCP-' || v_year || '%';

  v_receipt_number := 'RCP-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');

  RETURN v_receipt_number;
END;
$$ LANGUAGE plpgsql;

-- Generate invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA FOR TESTING (Optional)
-- =====================================================
-- Uncomment below to add test data

/*
-- Test notification types
INSERT INTO tenant_notifications (tenant_id, type, title, message, priority)
SELECT
  id,
  'payment_reminder',
  'Rent Due Soon',
  'Your rent payment of $1,500.00 is due in 3 days.',
  'high'
FROM tenants
WHERE portal_access = true
LIMIT 1;
*/
