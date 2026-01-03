/**
 * Owner and Vendor Portal Invite System
 * Enables invite-based AND self-registration signup for owners and vendors
 */

-- ============================================
-- OWNER INVITES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS owner_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    invite_code VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    property_ids UUID[], -- Array of property IDs the owner is associated with
    created_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    reminder_count INT NOT NULL DEFAULT 0,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id),
    revoke_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for owner_invites
CREATE INDEX IF NOT EXISTS idx_owner_invites_email ON owner_invites(email);
CREATE INDEX IF NOT EXISTS idx_owner_invites_status ON owner_invites(status);
CREATE INDEX IF NOT EXISTS idx_owner_invites_expires_at ON owner_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_owner_invites_invite_code ON owner_invites(invite_code);

-- ============================================
-- VENDOR INVITES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS vendor_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    invite_code VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    company_name VARCHAR(255),
    service_categories TEXT[], -- Array of service types
    created_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    reminder_sent_at TIMESTAMPTZ,
    reminder_count INT NOT NULL DEFAULT 0,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id),
    revoke_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for vendor_invites
CREATE INDEX IF NOT EXISTS idx_vendor_invites_email ON vendor_invites(email);
CREATE INDEX IF NOT EXISTS idx_vendor_invites_status ON vendor_invites(status);
CREATE INDEX IF NOT EXISTS idx_vendor_invites_expires_at ON vendor_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_vendor_invites_invite_code ON vendor_invites(invite_code);

-- ============================================
-- SELF-REGISTRATION REQUEST TABLES
-- ============================================

-- Owner self-registration requests (pending PM approval)
CREATE TABLE IF NOT EXISTS owner_registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    company_name VARCHAR(255),
    property_address TEXT, -- Address of property they claim to own
    additional_info TEXT, -- Any notes from the applicant
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owner_reg_requests_status ON owner_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_owner_reg_requests_email ON owner_registration_requests(email);

-- Vendor self-registration requests (pending PM approval)
CREATE TABLE IF NOT EXISTS vendor_registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    company_name VARCHAR(255) NOT NULL,
    service_categories TEXT[] NOT NULL, -- Types of services offered
    license_number VARCHAR(100),
    insurance_info TEXT,
    website_url VARCHAR(500),
    years_in_business INT,
    additional_info TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_reg_requests_status ON vendor_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_vendor_reg_requests_email ON vendor_registration_requests(email);

-- ============================================
-- OWNER INVITE VALIDATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION validate_owner_invite_code(p_invite_code VARCHAR)
RETURNS TABLE (
    valid BOOLEAN,
    error_code VARCHAR,
    owner_id UUID,
    email VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    phone VARCHAR,
    property_ids UUID[],
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN i.id IS NULL THEN FALSE
            WHEN i.status = 'revoked' THEN FALSE
            WHEN i.used_at IS NOT NULL THEN FALSE
            WHEN i.expires_at < NOW() THEN FALSE
            ELSE TRUE
        END as valid,
        CASE
            WHEN i.id IS NULL THEN 'INVALID_CODE'
            WHEN i.status = 'revoked' THEN 'REVOKED'
            WHEN i.used_at IS NOT NULL THEN 'ALREADY_USED'
            WHEN i.expires_at < NOW() THEN 'EXPIRED'
            ELSE NULL
        END as error_code,
        i.owner_id,
        i.email,
        i.first_name,
        i.last_name,
        i.phone,
        i.property_ids,
        i.expires_at
    FROM owner_invites i
    WHERE i.invite_code = p_invite_code
    LIMIT 1;

    -- If no rows returned, return invalid
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'INVALID_CODE'::VARCHAR, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::UUID[], NULL::TIMESTAMPTZ;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VENDOR INVITE VALIDATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION validate_vendor_invite_code(p_invite_code VARCHAR)
RETURNS TABLE (
    valid BOOLEAN,
    error_code VARCHAR,
    vendor_id UUID,
    email VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    phone VARCHAR,
    company_name VARCHAR,
    service_categories TEXT[],
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN i.id IS NULL THEN FALSE
            WHEN i.status = 'revoked' THEN FALSE
            WHEN i.used_at IS NOT NULL THEN FALSE
            WHEN i.expires_at < NOW() THEN FALSE
            ELSE TRUE
        END as valid,
        CASE
            WHEN i.id IS NULL THEN 'INVALID_CODE'
            WHEN i.status = 'revoked' THEN 'REVOKED'
            WHEN i.used_at IS NOT NULL THEN 'ALREADY_USED'
            WHEN i.expires_at < NOW() THEN 'EXPIRED'
            ELSE NULL
        END as error_code,
        i.vendor_id,
        i.email,
        i.first_name,
        i.last_name,
        i.phone,
        i.company_name,
        i.service_categories,
        i.expires_at
    FROM vendor_invites i
    WHERE i.invite_code = p_invite_code
    LIMIT 1;

    -- If no rows returned, return invalid
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'INVALID_CODE'::VARCHAR, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT[], NULL::TIMESTAMPTZ;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ACCEPT INVITE FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION accept_owner_invite(p_invite_code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_invite_id UUID;
BEGIN
    -- Find and update the invite
    UPDATE owner_invites
    SET status = 'accepted',
        accepted_at = NOW(),
        used_at = NOW(),
        updated_at = NOW()
    WHERE invite_code = p_invite_code
      AND status = 'pending'
      AND used_at IS NULL
      AND expires_at > NOW()
    RETURNING id INTO v_invite_id;

    RETURN v_invite_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION accept_vendor_invite(p_invite_code VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_invite_id UUID;
BEGIN
    -- Find and update the invite
    UPDATE vendor_invites
    SET status = 'accepted',
        accepted_at = NOW(),
        used_at = NOW(),
        updated_at = NOW()
    WHERE invite_code = p_invite_code
      AND status = 'pending'
      AND used_at IS NULL
      AND expires_at > NOW()
    RETURNING id INTO v_invite_id;

    RETURN v_invite_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADD user_id AND portal_access TO owners AND vendors IF NOT EXISTS
-- ============================================

DO $$
BEGIN
    -- Add user_id to owners if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owners' AND column_name = 'user_id') THEN
        ALTER TABLE owners ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;

    -- Add portal_access to owners if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owners' AND column_name = 'portal_access') THEN
        ALTER TABLE owners ADD COLUMN portal_access BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- Add portal_last_login to owners if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owners' AND column_name = 'portal_last_login') THEN
        ALTER TABLE owners ADD COLUMN portal_last_login TIMESTAMPTZ;
    END IF;

    -- Add user_id to vendors if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'user_id') THEN
        ALTER TABLE vendors ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;

    -- Add portal_access to vendors if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'portal_access') THEN
        ALTER TABLE vendors ADD COLUMN portal_access BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    -- Add portal_last_login to vendors if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'portal_last_login') THEN
        ALTER TABLE vendors ADD COLUMN portal_last_login TIMESTAMPTZ;
    END IF;
END $$;

-- Add comments
COMMENT ON TABLE owner_invites IS 'Invite-based registration for property owners';
COMMENT ON TABLE vendor_invites IS 'Invite-based registration for service vendors';
COMMENT ON TABLE owner_registration_requests IS 'Self-registration requests from owners pending PM approval';
COMMENT ON TABLE vendor_registration_requests IS 'Self-registration requests from vendors pending PM approval';
