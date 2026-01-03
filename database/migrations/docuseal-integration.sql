-- =====================================================
-- DOCUSEAL E-SIGNATURE INTEGRATION SCHEMA
-- PropMaster Property Management System
-- Enables DocuSign-quality lease signing experience
-- =====================================================

-- =====================================================
-- 1. ADD DOCUSEAL FIELDS TO SIGNING REQUESTS
-- =====================================================
-- If signing_requests table exists, add DocuSeal tracking fields
DO $$
BEGIN
  -- Add docuseal_submission_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'signing_requests' AND column_name = 'docuseal_submission_id'
  ) THEN
    ALTER TABLE signing_requests ADD COLUMN docuseal_submission_id VARCHAR(255);
  END IF;

  -- Add docuseal_slug for embeddable signing URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'signing_requests' AND column_name = 'docuseal_slug'
  ) THEN
    ALTER TABLE signing_requests ADD COLUMN docuseal_slug VARCHAR(255);
  END IF;

  -- Add template_id reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'signing_requests' AND column_name = 'docuseal_template_id'
  ) THEN
    ALTER TABLE signing_requests ADD COLUMN docuseal_template_id VARCHAR(255);
  END IF;

  -- Add signed_document_url for completed documents
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'signing_requests' AND column_name = 'signed_document_url'
  ) THEN
    ALTER TABLE signing_requests ADD COLUMN signed_document_url TEXT;
  END IF;
END $$;

-- =====================================================
-- 2. SIGNING REQUEST SIGNERS (Individual signer tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS signing_request_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signing_request_id UUID NOT NULL REFERENCES signing_requests(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'tenant' CHECK (role IN ('tenant', 'co_tenant', 'guarantor', 'property_manager', 'owner')),
  signing_order INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'signed', 'declined', 'expired')),
  docuseal_signer_id VARCHAR(255),
  signature_url TEXT,                        -- Embed URL for this signer
  ip_address INET,                           -- IP when signed (audit trail)
  user_agent TEXT,                           -- Browser info (audit trail)
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  decline_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. SIGNING REQUEST FIELDS (Field completion tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS signing_request_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signing_request_id UUID NOT NULL REFERENCES signing_requests(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES signing_request_signers(id) ON DELETE CASCADE,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('signature', 'initials', 'date', 'text', 'checkbox')),
  field_name VARCHAR(255),
  field_label VARCHAR(255),
  page_number INTEGER,
  x_position INTEGER,
  y_position INTEGER,
  width INTEGER,
  height INTEGER,
  required BOOLEAN DEFAULT true,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. LEASE SIGNING TEMPLATES
-- =====================================================
CREATE TABLE IF NOT EXISTS lease_signing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  docuseal_template_id VARCHAR(255) NOT NULL,
  document_type VARCHAR(50) DEFAULT 'lease' CHECK (document_type IN ('lease', 'addendum', 'renewal', 'notice', 'disclosure', 'other')),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  field_mappings JSONB,                      -- Map form fields to tenant/property data
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. SIGNING AUDIT LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS signing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signing_request_id UUID NOT NULL REFERENCES signing_requests(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES signing_request_signers(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN (
    'created', 'sent', 'viewed', 'opened', 'field_completed', 'signed',
    'declined', 'cancelled', 'expired', 'voided', 'downloaded'
  )),
  action_by_role VARCHAR(50),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. ADD ADDITIONAL NOTIFICATION TYPES
-- =====================================================
-- Add new notification types for lease signing
DO $$
BEGIN
  -- Update the check constraint to include new types
  ALTER TABLE tenant_notifications DROP CONSTRAINT IF EXISTS tenant_notifications_type_check;
  ALTER TABLE tenant_notifications ADD CONSTRAINT tenant_notifications_type_check CHECK (type IN (
    'payment_reminder',
    'payment_received',
    'payment_failed',
    'payment_refunded',
    'maintenance_created',
    'maintenance_assigned',
    'maintenance_scheduled',
    'maintenance_updated',
    'maintenance_completed',
    'lease_renewal',
    'lease_expiring',
    'lease_ready',           -- NEW: Lease ready for signing
    'lease_signed',          -- NEW: Lease fully signed
    'lease_viewed',          -- NEW: Tenant viewed lease
    'document_uploaded',
    'document_shared',       -- NEW: Document shared with tenant
    'announcement',
    'system'
  ));
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_signing_request_signers_request_id ON signing_request_signers(signing_request_id);
CREATE INDEX IF NOT EXISTS idx_signing_request_signers_tenant_id ON signing_request_signers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_signing_request_signers_status ON signing_request_signers(status);
CREATE INDEX IF NOT EXISTS idx_signing_request_signers_email ON signing_request_signers(email);

CREATE INDEX IF NOT EXISTS idx_signing_request_fields_request_id ON signing_request_fields(signing_request_id);
CREATE INDEX IF NOT EXISTS idx_signing_request_fields_signer_id ON signing_request_fields(signer_id);

CREATE INDEX IF NOT EXISTS idx_signing_audit_log_request_id ON signing_audit_log(signing_request_id);
CREATE INDEX IF NOT EXISTS idx_signing_audit_log_created_at ON signing_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_lease_signing_templates_docuseal_id ON lease_signing_templates(docuseal_template_id);

-- =====================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- =====================================================
-- Enable RLS on new tables
ALTER TABLE signing_request_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_request_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_signing_templates ENABLE ROW LEVEL SECURITY;

-- Signers: Tenants can only see their own signer records
CREATE POLICY IF NOT EXISTS "Tenants can view their own signer records"
  ON signing_request_signers
  FOR SELECT
  USING (tenant_id = auth.uid());

-- Fields: Tenants can view fields for signing requests they're part of
CREATE POLICY IF NOT EXISTS "Tenants can view fields for their signing requests"
  ON signing_request_fields
  FOR SELECT
  USING (
    signing_request_id IN (
      SELECT signing_request_id FROM signing_request_signers WHERE tenant_id = auth.uid()
    )
  );

-- Audit log: Tenants can view audit entries for their signing requests
CREATE POLICY IF NOT EXISTS "Tenants can view audit log for their signing requests"
  ON signing_audit_log
  FOR SELECT
  USING (
    signing_request_id IN (
      SELECT signing_request_id FROM signing_request_signers WHERE tenant_id = auth.uid()
    )
  );

-- Templates: Read-only for authenticated users
CREATE POLICY IF NOT EXISTS "Authenticated users can view active templates"
  ON lease_signing_templates
  FOR SELECT
  USING (is_active = true);

-- =====================================================
-- 9. FUNCTIONS FOR SIGNING PROGRESS
-- =====================================================

-- Function to calculate signing progress for a request
CREATE OR REPLACE FUNCTION get_signing_progress(p_signing_request_id UUID)
RETURNS TABLE (
  total_fields INTEGER,
  completed_fields INTEGER,
  progress_percent NUMERIC,
  total_signers INTEGER,
  signed_signers INTEGER,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((SELECT COUNT(*)::INTEGER FROM signing_request_fields WHERE signing_request_id = p_signing_request_id AND required = true), 0) as total_fields,
    COALESCE((SELECT COUNT(*)::INTEGER FROM signing_request_fields WHERE signing_request_id = p_signing_request_id AND required = true AND completed = true), 0) as completed_fields,
    CASE
      WHEN (SELECT COUNT(*) FROM signing_request_fields WHERE signing_request_id = p_signing_request_id AND required = true) = 0 THEN 0
      ELSE ROUND(
        (SELECT COUNT(*)::NUMERIC FROM signing_request_fields WHERE signing_request_id = p_signing_request_id AND required = true AND completed = true) /
        (SELECT COUNT(*)::NUMERIC FROM signing_request_fields WHERE signing_request_id = p_signing_request_id AND required = true) * 100,
        0
      )
    END as progress_percent,
    COALESCE((SELECT COUNT(*)::INTEGER FROM signing_request_signers WHERE signing_request_id = p_signing_request_id), 0) as total_signers,
    COALESCE((SELECT COUNT(*)::INTEGER FROM signing_request_signers WHERE signing_request_id = p_signing_request_id AND status = 'signed'), 0) as signed_signers,
    CASE
      WHEN (SELECT COUNT(*) FROM signing_request_signers WHERE signing_request_id = p_signing_request_id AND status = 'declined') > 0 THEN 'declined'::VARCHAR
      WHEN (SELECT COUNT(*) FROM signing_request_signers WHERE signing_request_id = p_signing_request_id AND status = 'signed') =
           (SELECT COUNT(*) FROM signing_request_signers WHERE signing_request_id = p_signing_request_id)
           AND (SELECT COUNT(*) FROM signing_request_signers WHERE signing_request_id = p_signing_request_id) > 0 THEN 'completed'::VARCHAR
      WHEN (SELECT COUNT(*) FROM signing_request_signers WHERE signing_request_id = p_signing_request_id AND status IN ('signed', 'opened')) > 0 THEN 'in_progress'::VARCHAR
      WHEN (SELECT COUNT(*) FROM signing_request_signers WHERE signing_request_id = p_signing_request_id AND status = 'sent') > 0 THEN 'sent'::VARCHAR
      ELSE 'draft'::VARCHAR
    END as status;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 10. TRIGGER FOR AUTOMATIC AUDIT LOGGING
-- =====================================================
CREATE OR REPLACE FUNCTION log_signer_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO signing_audit_log (
      signing_request_id,
      signer_id,
      action,
      action_by_role,
      details,
      ip_address
    ) VALUES (
      NEW.signing_request_id,
      NEW.id,
      CASE NEW.status
        WHEN 'sent' THEN 'sent'
        WHEN 'opened' THEN 'opened'
        WHEN 'signed' THEN 'signed'
        WHEN 'declined' THEN 'declined'
        ELSE 'viewed'
      END,
      NEW.role,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'email', NEW.email
      ),
      NEW.ip_address
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_signer_status ON signing_request_signers;
CREATE TRIGGER trigger_log_signer_status
  AFTER UPDATE ON signing_request_signers
  FOR EACH ROW
  EXECUTE FUNCTION log_signer_status_change();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
COMMENT ON TABLE signing_request_signers IS 'Tracks individual signers for each signing request with DocuSeal integration';
COMMENT ON TABLE signing_request_fields IS 'Tracks completion of signature/initial fields for progress tracking';
COMMENT ON TABLE signing_audit_log IS 'Comprehensive audit trail for compliance and legal requirements';
COMMENT ON TABLE lease_signing_templates IS 'DocuSeal templates for different document types';
