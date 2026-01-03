/**
 * TC-AUD Audit Trail Edge Cases
 * Generates data to test audit trail and immutability scenarios
 *
 * Tests cover:
 * - TC-AUD-001: User attribution
 * - TC-AUD-002: Reversal chains
 * - TC-AUD-003: Server timestamps
 * - TC-AUD-004: Idempotency keys
 * - TC-AUD-005: Voided entry preservation
 * - TC-AUD-006: Trace ID propagation
 * - TC-AUD-007: IP address logging
 * - TC-AUD-008: Before/after state capture
 * - TC-AUD-009: SSN/TIN access logs
 * - TC-AUD-010: Immutability enforcement
 */

import { uuid, journalEntryId, traceId, sagaId, idempotencyKey, userId } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import {
  isoTimestamp,
  daysAgo,
} from '../../utils/date-utils.mjs';
import { randomAmount } from '../../utils/decimal-utils.mjs';

/**
 * TC-AUD-001: User attribution
 * Every entry must have user ID
 */
export function generateTC_AUD_001() {
  const scenarios = [];

  const userTests = [
    { hasUserId: true, userType: 'employee', compliant: true, description: 'Employee user ID present' },
    { hasUserId: true, userType: 'system', compliant: true, description: 'System user ID present' },
    { hasUserId: true, userType: 'api', compliant: true, description: 'API user ID present' },
    { hasUserId: false, userType: null, compliant: false, description: 'NO USER ID - VIOLATION' },
    { hasUserId: true, userType: 'unknown', compliant: false, description: 'Unknown user type - SUSPICIOUS' },
  ];

  userTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-AUD-001-${String(index + 1).padStart(3, '0')}`,
      entry_id: journalEntryId(),
      has_user_id: tc.hasUserId,
      user_id: tc.hasUserId ? userId(tc.userType) : null,
      user_type: tc.userType,
      is_compliant: tc.compliant,
      audit_violation: !tc.compliant,
      description: tc.description,
      metadata: seedMetadata('TC-AUD-001', {
        seed_type: 'user_attribution',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-AUD-001',
    description: 'Every journal entry must have user attribution',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      violations: scenarios.filter(s => s.audit_violation).length,
    },
  };
}

/**
 * TC-AUD-002: Reversal chain integrity
 */
export function generateTC_AUD_002() {
  const scenarios = [];

  const originalEntryId = journalEntryId();
  const reversalEntryId = journalEntryId();

  const reversalTests = [
    {
      type: 'original',
      entryId: originalEntryId,
      reversesId: null,
      reversedById: reversalEntryId,
      chainIntact: true,
      description: 'Original entry with reversal reference'
    },
    {
      type: 'reversal',
      entryId: reversalEntryId,
      reversesId: originalEntryId,
      reversedById: null,
      chainIntact: true,
      description: 'Reversal entry with original reference'
    },
    {
      type: 'orphan_reversal',
      entryId: journalEntryId(),
      reversesId: 'non_existent_entry',
      reversedById: null,
      chainIntact: false,
      description: 'Reversal references non-existent entry - BROKEN CHAIN'
    },
    {
      type: 'double_reversal',
      entryId: journalEntryId(),
      reversesId: reversalEntryId,
      reversedById: null,
      chainIntact: false,
      description: 'Reversing a reversal - SHOULD NOT HAPPEN'
    },
  ];

  reversalTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-AUD-002-${String(index + 1).padStart(3, '0')}`,
      entry_id: tc.entryId,
      entry_type: tc.type,
      reverses_entry_id: tc.reversesId,
      reversed_by_entry_id: tc.reversedById,
      chain_intact: tc.chainIntact,
      is_compliant: tc.chainIntact,
      description: tc.description,
      metadata: seedMetadata('TC-AUD-002', {
        seed_type: 'reversal_chain',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-AUD-002',
    description: 'Reversal chains must maintain referential integrity',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      intactChains: scenarios.filter(s => s.chain_intact).length,
      brokenChains: scenarios.filter(s => !s.chain_intact).length,
    },
  };
}

/**
 * TC-AUD-003: Server timestamp validation
 */
export function generateTC_AUD_003() {
  const scenarios = [];

  const now = new Date();
  const serverNow = isoTimestamp();

  const timestampTests = [
    { clientTime: serverNow, serverTime: serverNow, drift: 0, valid: true, description: 'No drift' },
    { clientTime: daysAgo(0), serverTime: serverNow, drift: 5, valid: true, description: '5 second drift - acceptable' },
    { clientTime: daysAgo(1), serverTime: serverNow, drift: 86400, valid: false, description: '24 hour drift - MANIPULATION?' },
    { clientTime: new Date(now.getTime() + 86400000).toISOString(), serverTime: serverNow, drift: -86400, valid: false, description: 'Future timestamp - INVALID' },
  ];

  timestampTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-AUD-003-${String(index + 1).padStart(3, '0')}`,
      entry_id: journalEntryId(),
      client_timestamp: tc.clientTime,
      server_timestamp: tc.serverTime,
      drift_seconds: tc.drift,
      is_valid: tc.valid,
      timestamp_manipulation: !tc.valid && Math.abs(tc.drift) > 60,
      description: tc.description,
      metadata: seedMetadata('TC-AUD-003', {
        seed_type: 'timestamp_validation',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-AUD-003',
    description: 'Server timestamps must be authoritative, client timestamps validated',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      valid: scenarios.filter(s => s.is_valid).length,
      manipulations: scenarios.filter(s => s.timestamp_manipulation).length,
    },
  };
}

/**
 * TC-AUD-004: Idempotency key uniqueness
 */
export function generateTC_AUD_004() {
  const scenarios = [];
  const sharedKey = idempotencyKey('payment', 'lease_001', '2024-01-01');

  const idempotencyTests = [
    { key: idempotencyKey('payment', 'lease_001', '2024-01-01'), isFirst: true, isDuplicate: false, description: 'First use of key' },
    { key: sharedKey, isFirst: false, isDuplicate: true, description: 'Duplicate key - MUST REJECT' },
    { key: idempotencyKey('payment', 'lease_001', '2024-01-02'), isFirst: true, isDuplicate: false, description: 'Different date - new key' },
    { key: null, isFirst: true, isDuplicate: false, missing: true, description: 'Missing key - AUDIT GAP' },
  ];

  idempotencyTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-AUD-004-${String(index + 1).padStart(3, '0')}`,
      entry_id: journalEntryId(),
      idempotency_key: tc.key,
      is_first_use: tc.isFirst,
      is_duplicate: tc.isDuplicate,
      is_missing: tc.missing || false,
      should_reject: tc.isDuplicate,
      should_warn: tc.missing || false,
      description: tc.description,
      metadata: seedMetadata('TC-AUD-004', {
        seed_type: 'idempotency_key',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-AUD-004',
    description: 'Idempotency keys must be unique to prevent duplicate transactions',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      unique: scenarios.filter(s => !s.is_duplicate && !s.is_missing).length,
      duplicates: scenarios.filter(s => s.is_duplicate).length,
      missing: scenarios.filter(s => s.is_missing).length,
    },
  };
}

/**
 * TC-AUD-005: Voided entry preservation
 */
export function generateTC_AUD_005() {
  const scenarios = [];

  const voidTests = [
    { voided: true, preserved: true, hasReason: true, hasTimestamp: true, hasUser: true, compliant: true, description: 'Properly voided with all metadata' },
    { voided: true, preserved: true, hasReason: false, hasTimestamp: true, hasUser: true, compliant: false, description: 'Voided but no reason - INCOMPLETE' },
    { voided: true, preserved: true, hasReason: true, hasTimestamp: false, hasUser: true, compliant: false, description: 'Voided but no timestamp' },
    { voided: true, preserved: false, hasReason: true, hasTimestamp: true, hasUser: true, compliant: false, description: 'Voided entry DELETED - CRITICAL' },
    { voided: false, preserved: true, hasReason: false, hasTimestamp: false, hasUser: false, compliant: true, description: 'Not voided - no void metadata needed' },
  ];

  voidTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-AUD-005-${String(index + 1).padStart(3, '0')}`,
      entry_id: journalEntryId(),
      is_voided: tc.voided,
      is_preserved: tc.preserved,
      has_void_reason: tc.hasReason,
      void_reason: tc.hasReason ? 'Error correction' : null,
      has_void_timestamp: tc.hasTimestamp,
      voided_at: tc.hasTimestamp ? daysAgo(5) : null,
      has_void_user: tc.hasUser,
      voided_by: tc.hasUser ? userId('employee') : null,
      is_compliant: tc.compliant,
      description: tc.description,
      metadata: seedMetadata('TC-AUD-005', {
        seed_type: 'void_preservation',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-AUD-005',
    description: 'Voided entries must be preserved with reason, timestamp, and user',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      violations: scenarios.filter(s => !s.is_compliant).length,
    },
  };
}

/**
 * TC-AUD-006: Trace ID propagation
 */
export function generateTC_AUD_006() {
  const scenarios = [];
  const parentTraceId = traceId();

  const traceTests = [
    { hasTraceId: true, traceId: parentTraceId, propagated: true, description: 'Trace ID present and propagated' },
    { hasTraceId: true, traceId: traceId(), propagated: true, description: 'Unique trace ID for standalone request' },
    { hasTraceId: false, traceId: null, propagated: false, description: 'Missing trace ID - OBSERVABILITY GAP' },
    { hasTraceId: true, traceId: parentTraceId, sagaId: sagaId(), propagated: true, description: 'Trace + Saga IDs for workflow' },
  ];

  traceTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-AUD-006-${String(index + 1).padStart(3, '0')}`,
      entry_id: journalEntryId(),
      has_trace_id: tc.hasTraceId,
      trace_id: tc.traceId,
      saga_id: tc.sagaId || null,
      is_propagated: tc.propagated,
      observability_complete: tc.hasTraceId,
      description: tc.description,
      metadata: seedMetadata('TC-AUD-006', {
        seed_type: 'trace_propagation',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-AUD-006',
    description: 'Trace IDs must propagate for distributed tracing',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      traced: scenarios.filter(s => s.has_trace_id).length,
      untraced: scenarios.filter(s => !s.has_trace_id).length,
    },
  };
}

/**
 * TC-AUD-007: IP address logging
 */
export function generateTC_AUD_007() {
  const scenarios = [];

  const ipTests = [
    { hasIp: true, ip: '192.168.1.100', type: 'internal', logged: true, description: 'Internal IP logged' },
    { hasIp: true, ip: '203.0.113.50', type: 'external', logged: true, description: 'External IP logged' },
    { hasIp: true, ip: '10.0.0.1', type: 'vpn', logged: true, description: 'VPN IP logged' },
    { hasIp: false, ip: null, type: null, logged: false, description: 'No IP logged - SECURITY GAP' },
    { hasIp: true, ip: '0.0.0.0', type: 'invalid', logged: true, suspicious: true, description: 'Invalid IP - SUSPICIOUS' },
  ];

  ipTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-AUD-007-${String(index + 1).padStart(3, '0')}`,
      entry_id: journalEntryId(),
      has_ip_address: tc.hasIp,
      ip_address: tc.ip,
      ip_type: tc.type,
      is_logged: tc.logged,
      is_suspicious: tc.suspicious || false,
      security_complete: tc.hasIp && !tc.suspicious,
      description: tc.description,
      metadata: seedMetadata('TC-AUD-007', {
        seed_type: 'ip_logging',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-AUD-007',
    description: 'IP addresses must be logged for security audit',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      logged: scenarios.filter(s => s.has_ip_address).length,
      suspicious: scenarios.filter(s => s.is_suspicious).length,
    },
  };
}

/**
 * TC-AUD-008: Before/after state capture
 */
export function generateTC_AUD_008() {
  const scenarios = [];

  const stateTests = [
    { hasBefore: true, hasAfter: true, beforeValue: '0.00', afterValue: '1500.00', delta: '1500.00', complete: true, description: 'Full state capture' },
    { hasBefore: false, hasAfter: true, beforeValue: null, afterValue: '1500.00', delta: null, complete: false, description: 'Missing before state - INCOMPLETE' },
    { hasBefore: true, hasAfter: false, beforeValue: '1500.00', afterValue: null, delta: null, complete: false, description: 'Missing after state - INCOMPLETE' },
    { hasBefore: true, hasAfter: true, beforeValue: '1500.00', afterValue: '1500.00', delta: '0.00', complete: true, noChange: true, description: 'No change recorded' },
  ];

  stateTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-AUD-008-${String(index + 1).padStart(3, '0')}`,
      field: 'balance',
      has_before_state: tc.hasBefore,
      has_after_state: tc.hasAfter,
      before_value: tc.beforeValue,
      after_value: tc.afterValue,
      delta: tc.delta,
      state_capture_complete: tc.complete,
      is_no_op: tc.noChange || false,
      description: tc.description,
      metadata: seedMetadata('TC-AUD-008', {
        seed_type: 'state_capture',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-AUD-008',
    description: 'Changes must capture before and after state',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      complete: scenarios.filter(s => s.state_capture_complete).length,
      incomplete: scenarios.filter(s => !s.state_capture_complete).length,
    },
  };
}

/**
 * TC-AUD-009: Sensitive data access logging
 */
export function generateTC_AUD_009() {
  const scenarios = [];

  const accessTests = [
    { dataType: 'ssn', accessed: true, logged: true, authorized: true, masked: true, compliant: true, description: 'SSN access logged and masked' },
    { dataType: 'tin', accessed: true, logged: true, authorized: true, masked: true, compliant: true, description: 'TIN access logged and masked' },
    { dataType: 'ssn', accessed: true, logged: false, authorized: true, masked: true, compliant: false, description: 'SSN access NOT logged - VIOLATION' },
    { dataType: 'ssn', accessed: true, logged: true, authorized: false, masked: true, compliant: false, description: 'Unauthorized SSN access' },
    { dataType: 'ssn', accessed: true, logged: true, authorized: true, masked: false, compliant: false, description: 'SSN not masked in response - PII EXPOSURE' },
  ];

  accessTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-AUD-009-${String(index + 1).padStart(3, '0')}`,
      data_type: tc.dataType,
      was_accessed: tc.accessed,
      was_logged: tc.logged,
      was_authorized: tc.authorized,
      was_masked: tc.masked,
      is_compliant: tc.compliant,
      pii_exposure: !tc.masked && tc.accessed,
      description: tc.description,
      metadata: seedMetadata('TC-AUD-009', {
        seed_type: 'sensitive_access',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-AUD-009',
    description: 'SSN/TIN access must be logged and data masked',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      compliant: scenarios.filter(s => s.is_compliant).length,
      piiExposures: scenarios.filter(s => s.pii_exposure).length,
    },
  };
}

/**
 * TC-AUD-010: Immutability enforcement
 */
export function generateTC_AUD_010() {
  const scenarios = [];

  const immutabilityTests = [
    { action: 'CREATE', allowed: true, executed: true, description: 'Create new entry - allowed' },
    { action: 'READ', allowed: true, executed: true, description: 'Read entry - allowed' },
    { action: 'UPDATE', allowed: false, executed: false, blocked: true, description: 'Update attempt - BLOCKED' },
    { action: 'DELETE', allowed: false, executed: false, blocked: true, description: 'Delete attempt - BLOCKED' },
    { action: 'UPDATE', allowed: false, executed: true, blocked: false, description: 'Update succeeded - CRITICAL VIOLATION' },
    { action: 'VOID', allowed: true, executed: true, description: 'Void (soft delete) - allowed' },
  ];

  immutabilityTests.forEach((tc, index) => {
    scenarios.push({
      id: uuid(),
      test_case: `TC-AUD-010-${String(index + 1).padStart(3, '0')}`,
      entry_id: journalEntryId(),
      action: tc.action,
      action_allowed: tc.allowed,
      action_executed: tc.executed,
      was_blocked: tc.blocked || false,
      immutability_violation: !tc.allowed && tc.executed,
      description: tc.description,
      metadata: seedMetadata('TC-AUD-010', {
        seed_type: 'immutability',
        scenario: index + 1,
      }),
    });
  });

  return {
    testCaseId: 'TC-AUD-010',
    description: 'Posted journal entries must be immutable (no UPDATE/DELETE)',
    scenarios,
    verification: {
      totalScenarios: scenarios.length,
      properlyBlocked: scenarios.filter(s => s.was_blocked).length,
      violations: scenarios.filter(s => s.immutability_violation).length,
    },
  };
}

/**
 * Generate all TC-AUD test data
 */
export function generateAllTC_AUD_Data() {
  return {
    'TC-AUD-001': generateTC_AUD_001(),
    'TC-AUD-002': generateTC_AUD_002(),
    'TC-AUD-003': generateTC_AUD_003(),
    'TC-AUD-004': generateTC_AUD_004(),
    'TC-AUD-005': generateTC_AUD_005(),
    'TC-AUD-006': generateTC_AUD_006(),
    'TC-AUD-007': generateTC_AUD_007(),
    'TC-AUD-008': generateTC_AUD_008(),
    'TC-AUD-009': generateTC_AUD_009(),
    'TC-AUD-010': generateTC_AUD_010(),
  };
}

/**
 * Get TC-AUD summary
 */
export function getTC_AUD_Summary(testData) {
  const summary = {
    totalTestCases: Object.keys(testData).length,
    passed: 0,
    failed: 0,
    details: {},
  };

  Object.entries(testData).forEach(([testId, data]) => {
    const v = data.verification;
    const passed = (v.violations || v.brokenChains || v.manipulations || v.piiExposures || 0) === 0;

    if (passed) summary.passed++;
    else summary.failed++;

    summary.details[testId] = {
      description: data.description,
      passed,
      verification: v,
    };
  });

  return summary;
}

export default {
  generateTC_AUD_001,
  generateTC_AUD_002,
  generateTC_AUD_003,
  generateTC_AUD_004,
  generateTC_AUD_005,
  generateTC_AUD_006,
  generateTC_AUD_007,
  generateTC_AUD_008,
  generateTC_AUD_009,
  generateTC_AUD_010,
  generateAllTC_AUD_Data,
  getTC_AUD_Summary,
};
