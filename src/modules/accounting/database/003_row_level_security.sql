-- ============================================================================
-- MASTERKEY ACCOUNTING v7.2 TITANIUM
-- Phase 1: Row Level Security Policies
-- ============================================================================
-- TITANIUM RULE: Security is enforced at the DATABASE level.
-- PostgreSQL RLS is the FIRST line of defense.
-- The API is the SECOND layer (defense in depth).
-- ============================================================================

SET search_path TO titanium_accounting, public;

-- ===========================================
-- SECTION 1: ENABLE RLS ON ALL TABLES
-- ===========================================

-- Core Ledger Tables
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE dimensional_balances ENABLE ROW LEVEL SECURITY;

-- Compliance
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;

-- Event Engine
ALTER TABLE event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dead_letter ENABLE ROW LEVEL SECURITY;
ALTER TABLE saga_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE saga_step_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_registry ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- SECTION 2: ORGANIZATION ISOLATION POLICIES
-- ===========================================
-- All policies use: current_setting('app.org_id')::uuid
-- This must be set by the API layer before any query

-- Chart of Accounts
CREATE POLICY org_isolation ON chart_of_accounts
  FOR ALL
  USING (organization_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.org_id', true)::uuid);

-- Accounting Periods
CREATE POLICY org_isolation ON accounting_periods
  FOR ALL
  USING (organization_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.org_id', true)::uuid);

-- Journal Entries
CREATE POLICY org_isolation ON journal_entries
  FOR ALL
  USING (organization_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.org_id', true)::uuid);

-- Journal Postings (via join to journal_entries)
CREATE POLICY org_isolation ON journal_postings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_postings.journal_entry_id
        AND je.organization_id = current_setting('app.org_id', true)::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.id = journal_postings.journal_entry_id
        AND je.organization_id = current_setting('app.org_id', true)::uuid
    )
  );

-- Account Balances
CREATE POLICY org_isolation ON account_balances
  FOR ALL
  USING (organization_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.org_id', true)::uuid);

-- Dimensional Balances
CREATE POLICY org_isolation ON dimensional_balances
  FOR ALL
  USING (organization_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.org_id', true)::uuid);

-- Compliance Rules
CREATE POLICY org_isolation ON compliance_rules
  FOR ALL
  USING (organization_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.org_id', true)::uuid);

-- Event Outbox
CREATE POLICY org_isolation ON event_outbox
  FOR ALL
  USING (organization_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.org_id', true)::uuid);

-- Dead Letter Queue
CREATE POLICY org_isolation ON event_dead_letter
  FOR ALL
  USING (organization_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.org_id', true)::uuid);

-- Saga State
CREATE POLICY org_isolation ON saga_state
  FOR ALL
  USING (organization_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.org_id', true)::uuid);

-- Saga Step Log (via join to saga_state)
CREATE POLICY org_isolation ON saga_step_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM saga_state ss
      WHERE ss.id = saga_step_log.saga_id
        AND ss.organization_id = current_setting('app.org_id', true)::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM saga_state ss
      WHERE ss.id = saga_step_log.saga_id
        AND ss.organization_id = current_setting('app.org_id', true)::uuid
    )
  );

-- Idempotency Registry
CREATE POLICY org_isolation ON idempotency_registry
  FOR ALL
  USING (organization_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.org_id', true)::uuid);

-- ===========================================
-- SECTION 3: IMMUTABILITY POLICIES
-- ===========================================
-- TITANIUM RULE: Journal entries can NEVER be updated or deleted

-- Prevent UPDATE on journal_entries
CREATE POLICY no_update_journal ON journal_entries
  FOR UPDATE
  USING (false);  -- Always fails

-- Prevent DELETE on journal_entries
CREATE POLICY no_delete_journal ON journal_entries
  FOR DELETE
  USING (false);  -- Always fails

-- Prevent UPDATE on journal_postings
CREATE POLICY no_update_postings ON journal_postings
  FOR UPDATE
  USING (false);

-- Prevent DELETE on journal_postings
CREATE POLICY no_delete_postings ON journal_postings
  FOR DELETE
  USING (false);

-- ===========================================
-- SECTION 4: CLOSED PERIOD PROTECTION
-- ===========================================
-- Prevent entries in closed accounting periods

CREATE OR REPLACE FUNCTION check_period_open()
RETURNS TRIGGER AS $$
DECLARE
  v_is_closed BOOLEAN;
BEGIN
  IF NEW.period_id IS NOT NULL THEN
    SELECT is_closed INTO v_is_closed
    FROM accounting_periods
    WHERE id = NEW.period_id;

    IF v_is_closed = true THEN
      RAISE EXCEPTION 'Cannot create journal entry in closed period %', NEW.period_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_period_open
  BEFORE INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION check_period_open();

-- ===========================================
-- SECTION 5: SYSTEM/SERVICE ACCOUNT BYPASS
-- ===========================================
-- For background workers and system processes

-- Create a service role that bypasses RLS
-- This should be used ONLY by trusted backend workers
CREATE ROLE titanium_service_role;
ALTER TABLE chart_of_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods FORCE ROW LEVEL SECURITY;
ALTER TABLE journal_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE journal_postings FORCE ROW LEVEL SECURITY;
ALTER TABLE account_balances FORCE ROW LEVEL SECURITY;
ALTER TABLE dimensional_balances FORCE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE event_outbox FORCE ROW LEVEL SECURITY;
ALTER TABLE saga_state FORCE ROW LEVEL SECURITY;

-- Service role policy for workers (requires explicit org_id in query)
CREATE POLICY service_access ON event_outbox
  FOR ALL
  TO titanium_service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY service_access ON saga_state
  FOR ALL
  TO titanium_service_role
  USING (true)
  WITH CHECK (true);

-- ===========================================
-- SECTION 6: HELPER FUNCTION FOR API LAYER
-- ===========================================
-- Sets the organization context for RLS

CREATE OR REPLACE FUNCTION set_org_context(p_org_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.org_id', p_org_id::text, true);  -- true = local to transaction
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_org_context IS 'Must be called by API before any query';
