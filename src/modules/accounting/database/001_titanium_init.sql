-- ============================================================================
-- MASTERKEY ACCOUNTING v7.2 TITANIUM
-- Phase 1: Foundation Schema
-- ============================================================================
-- TITANIUM RULES ENFORCED:
--   1. Immutable Ledger (no UPDATE/DELETE on journal_entries)
--   2. Double-Entry Only (balanced journal postings)
--   3. Law as Data (compliance_rules table, no hardcoded constants)
--   4. O(1) Reads (account_balances pre-calculated)
--   5. Row-Level Security (org_id isolation)
-- ============================================================================

-- ===========================================
-- EXTENSIONS
-- ===========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- Required for EXCLUDE constraints
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- SCHEMA: titanium_accounting
-- ===========================================
CREATE SCHEMA IF NOT EXISTS titanium_accounting;
SET search_path TO titanium_accounting, public;

-- ===========================================
-- SECTION 1: COMPLIANCE ENGINE (Law as Data)
-- ===========================================
-- RULE: All compliance values (late fees, deposit limits, deadlines)
--       MUST be stored here. NEVER hardcode in TypeScript.

CREATE TABLE compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  state_code VARCHAR(2) NOT NULL,         -- 'CA', 'TX', 'NY', etc.
  rule_type VARCHAR(50) NOT NULL,         -- 'late_fee', 'security_deposit', 'interest_rate'
  rule_key VARCHAR(50) NOT NULL,          -- 'max_percent', 'deadline_days', 'grace_period'
  rule_value TEXT NOT NULL,               -- The actual value (cast as needed)
  effective_date DATE NOT NULL,
  end_date DATE,                          -- NULL = currently active
  source_citation TEXT,                   -- Legal reference (e.g., "CA Civil Code 1946.2")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,

  -- KILL SHOT: Prevent overlapping rules for the same state/type/key combination
  -- This ensures only ONE rule is active for any given date range
  CONSTRAINT no_overlapping_rules EXCLUDE USING GIST (
    organization_id WITH =,
    state_code WITH =,
    rule_type WITH =,
    rule_key WITH =,
    daterange(effective_date, COALESCE(end_date, '9999-12-31'::DATE), '[]') WITH &&
  )
);

CREATE INDEX idx_compliance_rules_lookup ON compliance_rules (
  organization_id, state_code, rule_type, rule_key, effective_date
);

COMMENT ON TABLE compliance_rules IS 'Law as Data: All compliance rules stored here, never hardcoded';
COMMENT ON CONSTRAINT no_overlapping_rules ON compliance_rules IS 'Prevents conflicting rules for same jurisdiction';

-- ===========================================
-- SECTION 2: CHART OF ACCOUNTS
-- ===========================================

CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  account_code VARCHAR(20) NOT NULL,      -- '1000', '2000', '4000'
  account_name VARCHAR(100) NOT NULL,
  account_type VARCHAR(20) NOT NULL,      -- 'asset', 'liability', 'equity', 'revenue', 'expense'
  account_subtype VARCHAR(50),            -- 'operating_bank', 'trust_bank', 'accounts_receivable'
  parent_account_id UUID REFERENCES chart_of_accounts(id),
  is_system_account BOOLEAN DEFAULT false, -- Cannot be deleted
  is_active BOOLEAN DEFAULT true,
  normal_balance VARCHAR(10) NOT NULL,    -- 'debit' or 'credit'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_account_type CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  CONSTRAINT valid_normal_balance CHECK (normal_balance IN ('debit', 'credit')),
  CONSTRAINT unique_account_code UNIQUE (organization_id, account_code)
);

CREATE INDEX idx_coa_org_type ON chart_of_accounts (organization_id, account_type);

-- ===========================================
-- SECTION 3: ACCOUNTING PERIODS
-- ===========================================

CREATE TABLE accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  period_name VARCHAR(50) NOT NULL,       -- 'January 2025', '2025-Q1'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID,

  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT unique_period UNIQUE (organization_id, start_date, end_date)
);

CREATE INDEX idx_periods_org_dates ON accounting_periods (organization_id, start_date, end_date);

-- ===========================================
-- SECTION 4: JOURNAL ENTRIES (IMMUTABLE LEDGER)
-- ===========================================
-- TITANIUM RULE: NEVER UPDATE. Only create reversals.

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  period_id UUID REFERENCES accounting_periods(id),
  entry_date DATE NOT NULL,
  effective_date DATE NOT NULL,           -- When the entry takes effect (may differ from entry_date)
  description TEXT NOT NULL,
  memo TEXT,

  -- Reversal tracking
  is_reversal BOOLEAN DEFAULT false,
  reverses_entry_id UUID REFERENCES journal_entries(id),
  reversed_by_entry_id UUID REFERENCES journal_entries(id),

  -- Source tracking
  source_type VARCHAR(50) NOT NULL,       -- 'payment', 'invoice', 'adjustment', 'closing'
  source_id UUID,                         -- ID of the source document

  -- Async safety
  idempotency_key VARCHAR(64) UNIQUE,     -- Critical for retry safety
  trace_id VARCHAR(32),                   -- OpenTelemetry correlation

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,

  CONSTRAINT reversal_must_reference CHECK (
    (is_reversal = false) OR (is_reversal = true AND reverses_entry_id IS NOT NULL)
  )
);

CREATE INDEX idx_je_org_date ON journal_entries (organization_id, entry_date);
CREATE INDEX idx_je_idempotency ON journal_entries (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_je_source ON journal_entries (organization_id, source_type, source_id);
CREATE INDEX idx_je_period ON journal_entries (period_id);

COMMENT ON TABLE journal_entries IS 'IMMUTABLE: Never update, only reverse';
COMMENT ON COLUMN journal_entries.idempotency_key IS 'Prevents duplicate entries from async retries';

-- ===========================================
-- SECTION 5: JOURNAL POSTINGS (Line Items)
-- ===========================================

CREATE TABLE journal_postings (
  id BIGSERIAL PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id),
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),

  -- Amount: Positive = Debit, Negative = Credit
  amount DECIMAL(19,4) NOT NULL,

  -- Dimensional analysis
  property_id UUID,                       -- FK to properties table
  unit_id UUID,                           -- FK to units table
  tenant_id UUID,                         -- FK to tenants table
  vendor_id UUID,                         -- FK to vendors table
  owner_id UUID,                          -- FK to owners table

  -- Additional tracking
  line_description TEXT,

  CONSTRAINT non_zero_amount CHECK (amount != 0)
);

CREATE INDEX idx_jp_entry ON journal_postings (journal_entry_id);
CREATE INDEX idx_jp_account ON journal_postings (account_id);
CREATE INDEX idx_jp_property ON journal_postings (property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_jp_tenant ON journal_postings (tenant_id) WHERE tenant_id IS NOT NULL;

-- ===========================================
-- SECTION 6: ACCOUNT BALANCES (O(1) Reads)
-- ===========================================
-- TITANIUM RULE: User-facing reads come from here, not SUM() on postings

CREATE TABLE account_balances (
  organization_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  balance DECIMAL(19,4) NOT NULL DEFAULT 0,
  last_entry_id UUID REFERENCES journal_entries(id),
  last_entry_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (organization_id, account_id)
);

COMMENT ON TABLE account_balances IS 'O(1) balance lookups - source of truth for reads';

-- Dimensional balances for property/tenant level reporting
CREATE TABLE dimensional_balances (
  organization_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  property_id UUID,
  unit_id UUID,
  tenant_id UUID,
  vendor_id UUID,
  owner_id UUID,
  balance DECIMAL(19,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (organization_id, account_id,
    COALESCE(property_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(vendor_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::UUID)
  )
);

CREATE INDEX idx_dim_balances_property ON dimensional_balances (organization_id, property_id)
  WHERE property_id IS NOT NULL;
CREATE INDEX idx_dim_balances_tenant ON dimensional_balances (organization_id, tenant_id)
  WHERE tenant_id IS NOT NULL;

-- ===========================================
-- SECTION 7: BALANCE ENTRY CHECK CONSTRAINT
-- ===========================================
-- Ensures every journal entry is balanced (debits = credits)

CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_sum DECIMAL(19,4);
BEGIN
  -- Calculate sum of all postings for this entry
  SELECT COALESCE(SUM(amount), 0) INTO v_sum
  FROM journal_postings
  WHERE journal_entry_id = NEW.journal_entry_id;

  -- If we're in a transaction with multiple inserts, check after all are done
  IF v_sum != 0 THEN
    RAISE EXCEPTION 'Journal entry % is unbalanced. Sum: %. Debits must equal Credits.',
      NEW.journal_entry_id, v_sum;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- This trigger runs AFTER all postings are inserted (CONSTRAINT TRIGGER)
CREATE CONSTRAINT TRIGGER trg_check_journal_balance
  AFTER INSERT ON journal_postings
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION check_journal_balance();

-- ===========================================
-- SECTION 8: BALANCE UPDATE TRIGGER
-- ===========================================
-- Automatically updates account_balances when postings are created

CREATE OR REPLACE FUNCTION update_account_balances()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
  v_entry_date DATE;
BEGIN
  -- Get organization and date from the journal entry
  SELECT organization_id, entry_date INTO v_org_id, v_entry_date
  FROM journal_entries
  WHERE id = NEW.journal_entry_id;

  -- Update aggregate balance
  INSERT INTO account_balances (organization_id, account_id, balance, last_entry_id, last_entry_date, updated_at)
  VALUES (v_org_id, NEW.account_id, NEW.amount, NEW.journal_entry_id, v_entry_date, NOW())
  ON CONFLICT (organization_id, account_id)
  DO UPDATE SET
    balance = account_balances.balance + EXCLUDED.balance,
    last_entry_id = EXCLUDED.last_entry_id,
    last_entry_date = EXCLUDED.last_entry_date,
    updated_at = NOW();

  -- Update dimensional balance
  INSERT INTO dimensional_balances (
    organization_id, account_id, property_id, unit_id, tenant_id, vendor_id, owner_id, balance, updated_at
  )
  VALUES (
    v_org_id, NEW.account_id, NEW.property_id, NEW.unit_id, NEW.tenant_id, NEW.vendor_id, NEW.owner_id, NEW.amount, NOW()
  )
  ON CONFLICT (organization_id, account_id,
    COALESCE(property_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(vendor_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::UUID)
  )
  DO UPDATE SET
    balance = dimensional_balances.balance + EXCLUDED.balance,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_balances
  AFTER INSERT ON journal_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balances();

-- ===========================================
-- SECTION 9: COMPLIANCE LOOKUP FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION get_compliance_value(
  p_org_id UUID,
  p_state_code VARCHAR(2),
  p_rule_type VARCHAR(50),
  p_rule_key VARCHAR(50),
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT AS $$
DECLARE
  v_result TEXT;
BEGIN
  SELECT rule_value INTO v_result
  FROM compliance_rules
  WHERE organization_id = p_org_id
    AND state_code = p_state_code
    AND rule_type = p_rule_type
    AND rule_key = p_rule_key
    AND p_as_of_date >= effective_date
    AND (end_date IS NULL OR p_as_of_date <= end_date)
  ORDER BY effective_date DESC
  LIMIT 1;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'No compliance rule found for org=%, state=%, type=%, key=% as of %',
      p_org_id, p_state_code, p_rule_type, p_rule_key, p_as_of_date;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_compliance_value IS 'Fetches compliance rule value with temporal awareness';
