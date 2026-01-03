-- ============================================================================
-- MASTERKEY ACCOUNTING v7.2 TITANIUM
-- Phase 2: Event Engine Schema
-- ============================================================================
-- TITANIUM RULES ENFORCED:
--   - Hybrid Async: Writes via Transactional Outbox
--   - Saga Orchestrator for multi-step workflows
--   - Zombie Resurrection for crashed workers
-- ============================================================================

SET search_path TO titanium_accounting, public;

-- ===========================================
-- SECTION 1: TRANSACTIONAL OUTBOX
-- ===========================================
-- RULE: No "Dual Writes". Business data + outbox in SAME transaction.
-- This guarantees at-least-once delivery.

CREATE TABLE event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,

  -- Event identification
  event_type VARCHAR(100) NOT NULL,       -- 'payment.received', 'lease.renewed', 'invoice.created'
  aggregate_type VARCHAR(50) NOT NULL,    -- 'payment', 'lease', 'invoice'
  aggregate_id UUID NOT NULL,             -- ID of the affected entity

  -- Payload
  payload JSONB NOT NULL,                 -- Event data

  -- Processing state
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'processed', 'failed', 'dead_letter'
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  last_error TEXT,

  -- Correlation
  trace_id VARCHAR(32) NOT NULL,          -- OpenTelemetry trace ID
  saga_id UUID,                           -- If part of a saga
  correlation_id UUID,                    -- For request-response patterns
  causation_id UUID,                      -- ID of event that caused this one

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- For delayed events
  processed_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,               -- Pessimistic locking for workers
  locked_by VARCHAR(100),                 -- Worker identifier

  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'dead_letter'))
);

-- Indexes for efficient polling
CREATE INDEX idx_outbox_pending ON event_outbox (organization_id, status, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX idx_outbox_processing ON event_outbox (locked_until)
  WHERE status = 'processing';
CREATE INDEX idx_outbox_saga ON event_outbox (saga_id)
  WHERE saga_id IS NOT NULL;
CREATE INDEX idx_outbox_aggregate ON event_outbox (aggregate_type, aggregate_id);

COMMENT ON TABLE event_outbox IS 'Transactional Outbox: Guarantees at-least-once event delivery';
COMMENT ON COLUMN event_outbox.locked_until IS 'Pessimistic lock - prevents duplicate processing';

-- ===========================================
-- SECTION 2: DEAD LETTER QUEUE
-- ===========================================
-- Events that exhausted retries go here for manual inspection

CREATE TABLE event_dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_event_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL,
  error_history JSONB NOT NULL,           -- Array of {attempt, error, timestamp}
  trace_id VARCHAR(32) NOT NULL,
  saga_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  original_created_at TIMESTAMPTZ NOT NULL,
  reprocessed_at TIMESTAMPTZ,
  reprocessed_as UUID                     -- New event ID if reprocessed
);

CREATE INDEX idx_dlq_org_type ON event_dead_letter (organization_id, event_type);
CREATE INDEX idx_dlq_unprocessed ON event_dead_letter (organization_id)
  WHERE reprocessed_at IS NULL;

-- ===========================================
-- SECTION 3: SAGA STATE MACHINE
-- ===========================================
-- Persistent state for multi-step workflows (NSF handling, distributions, etc.)

CREATE TABLE saga_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,

  -- Saga identification
  saga_name VARCHAR(50) NOT NULL,         -- 'nsf_handling', 'owner_distribution', 'lease_renewal'
  saga_version INT NOT NULL DEFAULT 1,    -- For handling saga definition changes

  -- State machine
  current_step VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'running',  -- 'running', 'completed', 'failed', 'compensating', 'compensated'
  steps_completed JSONB NOT NULL DEFAULT '[]',    -- Array of completed step names
  compensation_steps JSONB NOT NULL DEFAULT '[]', -- Steps to undo on failure

  -- Payload
  payload JSONB NOT NULL,                 -- Saga context/data
  result JSONB,                           -- Final result on completion

  -- Error handling
  error_message TEXT,
  error_step VARCHAR(50),
  retry_count INT NOT NULL DEFAULT 0,

  -- Timing and health
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  timeout_at TIMESTAMPTZ,                 -- When saga should be considered zombie
  completed_at TIMESTAMPTZ,

  -- Correlation
  trace_id VARCHAR(32) NOT NULL,
  initiated_by UUID,                      -- User or system that started the saga

  CONSTRAINT valid_saga_status CHECK (status IN ('running', 'completed', 'failed', 'compensating', 'compensated'))
);

CREATE INDEX idx_saga_running ON saga_state (organization_id, saga_name, status)
  WHERE status = 'running';
CREATE INDEX idx_saga_zombies ON saga_state (last_heartbeat)
  WHERE status = 'running';
CREATE INDEX idx_saga_compensating ON saga_state (organization_id, status)
  WHERE status = 'compensating';

COMMENT ON TABLE saga_state IS 'Persistent saga state machine for multi-step workflows';
COMMENT ON COLUMN saga_state.last_heartbeat IS 'Updated by workers - used for zombie detection';

-- ===========================================
-- SECTION 4: SAGA STEP AUDIT LOG
-- ===========================================
-- Immutable record of every step transition

CREATE TABLE saga_step_log (
  id BIGSERIAL PRIMARY KEY,
  saga_id UUID NOT NULL REFERENCES saga_state(id),
  step_name VARCHAR(50) NOT NULL,
  step_type VARCHAR(20) NOT NULL,         -- 'forward', 'compensation'
  status VARCHAR(20) NOT NULL,            -- 'started', 'completed', 'failed'
  input_payload JSONB,
  output_payload JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT
);

CREATE INDEX idx_saga_log_saga ON saga_step_log (saga_id);

-- ===========================================
-- SECTION 5: IDEMPOTENCY REGISTRY
-- ===========================================
-- Tracks processed idempotency keys to prevent duplicate processing

CREATE TABLE idempotency_registry (
  idempotency_key VARCHAR(64) PRIMARY KEY,
  organization_id UUID NOT NULL,
  operation_type VARCHAR(50) NOT NULL,    -- 'payment', 'journal_entry', etc.
  result_id UUID,                         -- ID of created entity
  result_payload JSONB,                   -- Cached response
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL         -- Auto-cleanup after expiry
);

CREATE INDEX idx_idempotency_expires ON idempotency_registry (expires_at);
CREATE INDEX idx_idempotency_org ON idempotency_registry (organization_id, operation_type);

-- ===========================================
-- SECTION 6: OUTBOX POLLING FUNCTION
-- ===========================================
-- Atomic claim of pending events with pessimistic locking

CREATE OR REPLACE FUNCTION claim_pending_events(
  p_worker_id VARCHAR(100),
  p_batch_size INT DEFAULT 10,
  p_lock_duration INTERVAL DEFAULT '5 minutes'
)
RETURNS SETOF event_outbox AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT id
    FROM event_outbox
    WHERE status = 'pending'
      AND scheduled_for <= NOW()
      AND (locked_until IS NULL OR locked_until < NOW())
    ORDER BY scheduled_for
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE event_outbox o
  SET
    status = 'processing',
    locked_until = NOW() + p_lock_duration,
    locked_by = p_worker_id,
    attempts = attempts + 1
  FROM claimed c
  WHERE o.id = c.id
  RETURNING o.*;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- SECTION 7: EVENT COMPLETION FUNCTIONS
-- ===========================================

CREATE OR REPLACE FUNCTION mark_event_processed(
  p_event_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE event_outbox
  SET
    status = 'processed',
    processed_at = NOW(),
    locked_until = NULL,
    locked_by = NULL
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_event_failed(
  p_event_id UUID,
  p_error TEXT
)
RETURNS VOID AS $$
DECLARE
  v_event event_outbox%ROWTYPE;
BEGIN
  SELECT * INTO v_event FROM event_outbox WHERE id = p_event_id;

  IF v_event.attempts >= v_event.max_attempts THEN
    -- Move to dead letter queue
    INSERT INTO event_dead_letter (
      original_event_id, organization_id, event_type, aggregate_type,
      aggregate_id, payload, error_history, trace_id, saga_id, original_created_at
    )
    SELECT
      id, organization_id, event_type, aggregate_type,
      aggregate_id, payload,
      jsonb_build_array(jsonb_build_object(
        'attempt', attempts,
        'error', p_error,
        'timestamp', NOW()
      )),
      trace_id, saga_id, created_at
    FROM event_outbox
    WHERE id = p_event_id;

    UPDATE event_outbox
    SET status = 'dead_letter', last_error = p_error
    WHERE id = p_event_id;
  ELSE
    -- Schedule retry with exponential backoff
    UPDATE event_outbox
    SET
      status = 'pending',
      last_error = p_error,
      locked_until = NULL,
      locked_by = NULL,
      scheduled_for = NOW() + (POWER(2, attempts) * INTERVAL '1 second')
    WHERE id = p_event_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- SECTION 8: ZOMBIE SAGA DETECTION
-- ===========================================

CREATE OR REPLACE FUNCTION find_zombie_sagas(
  p_stale_threshold INTERVAL DEFAULT '5 minutes'
)
RETURNS SETOF saga_state AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM saga_state
  WHERE status = 'running'
    AND last_heartbeat < NOW() - p_stale_threshold;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- SECTION 9: SAGA HEARTBEAT UPDATE
-- ===========================================

CREATE OR REPLACE FUNCTION update_saga_heartbeat(
  p_saga_id UUID,
  p_current_step VARCHAR(50) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE saga_state
  SET
    last_heartbeat = NOW(),
    updated_at = NOW(),
    current_step = COALESCE(p_current_step, current_step)
  WHERE id = p_saga_id;
END;
$$ LANGUAGE plpgsql;
