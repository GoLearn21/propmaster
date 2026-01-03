/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * TC-AUD: Audit Trail Torture Tests
 *
 * Complete forensic capability is MANDATORY for:
 * - Fraud investigation
 * - Regulatory compliance (SOX, GAAP)
 * - Legal discovery
 * - Insurance claims
 * - Tax audits
 *
 * Every financial transaction must have:
 * - Who (user attribution)
 * - What (before/after state)
 * - When (server timestamp)
 * - Where (IP address)
 * - Why (linked source document)
 *
 * Test IDs: TC-AUD-001 through TC-AUD-015
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Decimal from 'decimal.js';

// Configure Decimal for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============================================================================
// AUDIT TRAIL TYPES
// ============================================================================

interface AuditableEntity {
  id: string;
  createdAt: Date;
  createdBy: string;
  createdByIP?: string;
  updatedAt?: Date;
  updatedBy?: string;
  version: number;
}

interface JournalEntry extends AuditableEntity {
  entryDate: Date;
  description: string;
  postings: JournalPosting[];
  sourceDocumentId?: string;
  sourceDocumentType?: 'invoice' | 'payment' | 'adjustment' | 'deposit' | 'refund';
  reversedByEntryId?: string;
  reversesEntryId?: string;
  idempotencyKey: string;
  traceId: string;
  isVoided: boolean;
  voidedAt?: Date;
  voidedBy?: string;
  voidReason?: string;
}

interface JournalPosting extends AuditableEntity {
  entryId: string;
  accountId: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userIP: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'void' | 'access';
  entityType: string;
  entityId: string;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  sensitiveDataAccessed?: boolean;
  traceId: string;
}

interface SensitiveDataAccess {
  id: string;
  userId: string;
  dataType: 'SSN' | 'TIN' | 'bank_account' | 'credit_card';
  entityId: string;
  purpose: string;
  timestamp: Date;
  approved: boolean;
}

// ============================================================================
// AUDIT TRAIL SERVICE (Test Implementation)
// ============================================================================

class AuditTrailService {
  private journalEntries: JournalEntry[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private sensitiveAccess: SensitiveDataAccess[] = [];
  private accountBalances: Map<string, string> = new Map();
  private idempotencyKeys: Set<string> = new Set();

  /**
   * Create journal entry with full audit trail
   */
  createJournalEntry(params: {
    description: string;
    postings: { accountId: string; amount: string }[];
    userId: string;
    userIP: string;
    idempotencyKey: string;
    traceId: string;
    sourceDocumentId?: string;
    sourceDocumentType?: JournalEntry['sourceDocumentType'];
    clientTimestamp?: Date; // Will be IGNORED
  }): { success: boolean; entry?: JournalEntry; error?: string } {
    // Check idempotency
    if (this.idempotencyKeys.has(params.idempotencyKey)) {
      const existing = this.journalEntries.find((e) => e.idempotencyKey === params.idempotencyKey);
      if (existing) {
        return { success: true, entry: existing };
      }
      return { success: false, error: 'Idempotency key conflict' };
    }

    // Validate user attribution
    if (!params.userId) {
      return { success: false, error: 'User attribution required' };
    }

    // Use SERVER timestamp, ignore client timestamp
    const serverTimestamp = new Date();

    // Generate stable entry ID first
    const entryId = `je_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create postings with before/after state
    const postings: JournalPosting[] = params.postings.map((p, idx) => {
      const balanceBefore = this.accountBalances.get(p.accountId) || '0.0000';
      const balanceAfter = new Decimal(balanceBefore).plus(new Decimal(p.amount)).toFixed(4);

      // Update balance
      this.accountBalances.set(p.accountId, balanceAfter);

      return {
        id: `posting_${entryId}_${idx}`,
        entryId: entryId,
        accountId: p.accountId,
        amount: p.amount,
        balanceBefore,
        balanceAfter,
        createdAt: serverTimestamp,
        createdBy: params.userId,
        createdByIP: params.userIP,
        version: 1,
      };
    });

    const entry: JournalEntry = {
      id: entryId,
      entryDate: serverTimestamp,
      createdAt: serverTimestamp,
      createdBy: params.userId,
      createdByIP: params.userIP,
      description: params.description,
      postings,
      sourceDocumentId: params.sourceDocumentId,
      sourceDocumentType: params.sourceDocumentType,
      idempotencyKey: params.idempotencyKey,
      traceId: params.traceId,
      isVoided: false,
      version: 1,
    };

    // Mark idempotency key as used
    this.idempotencyKeys.add(params.idempotencyKey);

    // Store entry
    this.journalEntries.push(entry);

    // Create audit log
    this.auditLogs.push({
      id: `audit_${Date.now()}`,
      timestamp: serverTimestamp,
      userId: params.userId,
      userIP: params.userIP,
      action: 'create',
      entityType: 'journal_entry',
      entityId: entry.id,
      traceId: params.traceId,
    });

    return { success: true, entry };
  }

  /**
   * Create reversal entry with bidirectional links
   */
  createReversalEntry(params: {
    originalEntryId: string;
    reason: string;
    userId: string;
    userIP: string;
    traceId: string;
  }): { success: boolean; reversalEntry?: JournalEntry; error?: string } {
    const original = this.journalEntries.find((e) => e.id === params.originalEntryId);

    if (!original) {
      return { success: false, error: 'Original entry not found' };
    }

    if (original.reversedByEntryId) {
      return { success: false, error: 'Entry already reversed' };
    }

    if (original.isVoided) {
      return { success: false, error: 'Cannot reverse voided entry' };
    }

    // Create reversal with opposite amounts
    const reversalPostings = original.postings.map((p) => ({
      accountId: p.accountId,
      amount: new Decimal(p.amount).negated().toFixed(4),
    }));

    const reversalResult = this.createJournalEntry({
      description: `REVERSAL: ${original.description} - ${params.reason}`,
      postings: reversalPostings,
      userId: params.userId,
      userIP: params.userIP,
      idempotencyKey: `reversal_${params.originalEntryId}_${Date.now()}`,
      traceId: params.traceId,
      sourceDocumentId: params.originalEntryId,
      sourceDocumentType: 'adjustment',
    });

    if (!reversalResult.success || !reversalResult.entry) {
      return { success: false, error: reversalResult.error };
    }

    // Create bidirectional links
    const reversalEntry = reversalResult.entry;
    reversalEntry.reversesEntryId = params.originalEntryId;
    original.reversedByEntryId = reversalEntry.id;

    return { success: true, reversalEntry };
  }

  /**
   * Void an entry (soft delete with preservation)
   */
  voidEntry(params: {
    entryId: string;
    reason: string;
    userId: string;
    userIP: string;
  }): { success: boolean; error?: string } {
    const entry = this.journalEntries.find((e) => e.id === params.entryId);

    if (!entry) {
      return { success: false, error: 'Entry not found' };
    }

    if (entry.isVoided) {
      return { success: false, error: 'Entry already voided' };
    }

    // Mark as voided (DO NOT DELETE)
    entry.isVoided = true;
    entry.voidedAt = new Date();
    entry.voidedBy = params.userId;
    entry.voidReason = params.reason;
    entry.version += 1;

    // Create audit log
    this.auditLogs.push({
      id: `audit_void_${Date.now()}`,
      timestamp: new Date(),
      userId: params.userId,
      userIP: params.userIP,
      action: 'void',
      entityType: 'journal_entry',
      entityId: entry.id,
      changes: [
        { field: 'isVoided', oldValue: false, newValue: true },
        { field: 'voidReason', oldValue: null, newValue: params.reason },
      ],
      traceId: entry.traceId,
    });

    return { success: true };
  }

  /**
   * Log sensitive data access
   */
  logSensitiveDataAccess(params: {
    userId: string;
    dataType: SensitiveDataAccess['dataType'];
    entityId: string;
    purpose: string;
    approved: boolean;
  }): void {
    this.sensitiveAccess.push({
      id: `sensitive_${Date.now()}`,
      userId: params.userId,
      dataType: params.dataType,
      entityId: params.entityId,
      purpose: params.purpose,
      timestamp: new Date(),
      approved: params.approved,
    });
  }

  /**
   * Attempt UPDATE on journal entry (should fail)
   */
  attemptUpdateJournalEntry(
    entryId: string,
    updates: Partial<JournalEntry>
  ): { success: boolean; error?: string } {
    // IMMUTABILITY ENFORCEMENT
    // Journal entries can NEVER be updated (except for reversal marking)

    const allowedUpdates = ['reversedByEntryId'];
    const attemptedFields = Object.keys(updates);

    const forbiddenFields = attemptedFields.filter((f) => !allowedUpdates.includes(f));

    if (forbiddenFields.length > 0) {
      return {
        success: false,
        error: `IMMUTABILITY VIOLATION: Cannot update fields [${forbiddenFields.join(', ')}] on journal entry`,
      };
    }

    // Only allow reversal marking
    const entry = this.journalEntries.find((e) => e.id === entryId);
    if (entry && updates.reversedByEntryId) {
      entry.reversedByEntryId = updates.reversedByEntryId;
      return { success: true };
    }

    return { success: false, error: 'Entry not found' };
  }

  /**
   * Attempt DELETE on journal entry (should fail)
   */
  attemptDeleteJournalEntry(entryId: string): { success: boolean; error?: string } {
    // IMMUTABILITY ENFORCEMENT
    // Journal entries can NEVER be deleted
    return {
      success: false,
      error: 'IMMUTABILITY VIOLATION: Journal entries cannot be deleted. Use void or reversal instead.',
    };
  }

  /**
   * Query entries by trace ID (saga correlation)
   */
  getEntriesByTraceId(traceId: string): JournalEntry[] {
    return this.journalEntries.filter((e) => e.traceId === traceId);
  }

  /**
   * Query voided entries (for audit purposes)
   */
  getVoidedEntries(): JournalEntry[] {
    return this.journalEntries.filter((e) => e.isVoided);
  }

  /**
   * Query audit logs for entity
   */
  getAuditLogsForEntity(entityId: string): AuditLogEntry[] {
    return this.auditLogs.filter((l) => l.entityId === entityId);
  }

  /**
   * Query sensitive data access log
   */
  getSensitiveAccessLog(userId?: string): SensitiveDataAccess[] {
    return userId ? this.sensitiveAccess.filter((s) => s.userId === userId) : this.sensitiveAccess;
  }

  /**
   * Verify reversal chain integrity
   */
  verifyReversalChainIntegrity(entryId: string): {
    valid: boolean;
    originalEntry?: JournalEntry;
    reversalEntry?: JournalEntry;
    error?: string;
  } {
    const entry = this.journalEntries.find((e) => e.id === entryId);

    if (!entry) {
      return { valid: false, error: 'Entry not found' };
    }

    // If entry has been reversed
    if (entry.reversedByEntryId) {
      const reversal = this.journalEntries.find((e) => e.id === entry.reversedByEntryId);

      if (!reversal) {
        return { valid: false, error: 'Reversal entry missing' };
      }

      // Check bidirectional link
      if (reversal.reversesEntryId !== entry.id) {
        return { valid: false, error: 'Bidirectional link broken' };
      }

      return { valid: true, originalEntry: entry, reversalEntry: reversal };
    }

    // If entry is a reversal
    if (entry.reversesEntryId) {
      const original = this.journalEntries.find((e) => e.id === entry.reversesEntryId);

      if (!original) {
        return { valid: false, error: 'Original entry missing' };
      }

      // Check bidirectional link
      if (original.reversedByEntryId !== entry.id) {
        return { valid: false, error: 'Bidirectional link broken' };
      }

      return { valid: true, originalEntry: original, reversalEntry: entry };
    }

    // Not part of a reversal chain
    return { valid: true };
  }

  /**
   * Get balance history for account
   */
  getBalanceHistory(accountId: string): { timestamp: Date; balance: string; entryId: string }[] {
    const history: { timestamp: Date; balance: string; entryId: string }[] = [];

    for (const entry of this.journalEntries) {
      for (const posting of entry.postings) {
        if (posting.accountId === accountId) {
          history.push({
            timestamp: entry.createdAt,
            balance: posting.balanceAfter,
            entryId: entry.id,
          });
        }
      }
    }

    return history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Test helpers
  clear(): void {
    this.journalEntries = [];
    this.auditLogs = [];
    this.sensitiveAccess = [];
    this.accountBalances.clear();
    this.idempotencyKeys.clear();
  }

  getEntryById(id: string): JournalEntry | undefined {
    return this.journalEntries.find((e) => e.id === id);
  }
}

// ============================================================================
// TORTURE TESTS
// ============================================================================

describe('TC-AUD: Audit Trail Torture Tests', () => {
  let service: AuditTrailService;

  beforeEach(() => {
    service = new AuditTrailService();
  });

  // --------------------------------------------------------------------------
  // TC-AUD-001: User Attribution
  // --------------------------------------------------------------------------
  describe('TC-AUD-001: User Attribution', () => {
    it('should require user ID on every journal entry', () => {
      const result = service.createJournalEntry({
        description: 'Test entry',
        postings: [
          { accountId: 'cash', amount: '1000.0000' },
          { accountId: 'revenue', amount: '-1000.0000' },
        ],
        userId: '', // Empty user ID
        userIP: '192.168.1.1',
        idempotencyKey: 'test_001',
        traceId: 'trace_001',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('User attribution required');
    });

    it('should store user ID on created entry', () => {
      const result = service.createJournalEntry({
        description: 'Test entry',
        postings: [
          { accountId: 'cash', amount: '1000.0000' },
          { accountId: 'revenue', amount: '-1000.0000' },
        ],
        userId: 'user_12345',
        userIP: '192.168.1.1',
        idempotencyKey: 'test_002',
        traceId: 'trace_002',
      });

      expect(result.success).toBe(true);
      expect(result.entry?.createdBy).toBe('user_12345');
    });

    it('should create audit log with user attribution', () => {
      const result = service.createJournalEntry({
        description: 'Test entry',
        postings: [
          { accountId: 'cash', amount: '1000.0000' },
          { accountId: 'revenue', amount: '-1000.0000' },
        ],
        userId: 'user_audit_test',
        userIP: '10.0.0.1',
        idempotencyKey: 'test_003',
        traceId: 'trace_003',
      });

      const logs = service.getAuditLogsForEntity(result.entry!.id);

      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('user_audit_test');
      expect(logs[0].action).toBe('create');
    });
  });

  // --------------------------------------------------------------------------
  // TC-AUD-002: Reversal Chain Integrity
  // --------------------------------------------------------------------------
  describe('TC-AUD-002: Reversal Chain Integrity', () => {
    it('should create bidirectional links for reversals', () => {
      // Create original entry
      const original = service.createJournalEntry({
        description: 'Original payment',
        postings: [
          { accountId: 'cash', amount: '500.0000' },
          { accountId: 'ar', amount: '-500.0000' },
        ],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'original_001',
        traceId: 'trace_chain',
      });

      // Create reversal
      const reversal = service.createReversalEntry({
        originalEntryId: original.entry!.id,
        reason: 'NSF payment',
        userId: 'user_001',
        userIP: '192.168.1.1',
        traceId: 'trace_chain',
      });

      expect(reversal.success).toBe(true);

      // Verify chain integrity
      const chainCheck = service.verifyReversalChainIntegrity(original.entry!.id);

      expect(chainCheck.valid).toBe(true);
      expect(chainCheck.originalEntry?.id).toBe(original.entry!.id);
      expect(chainCheck.reversalEntry?.id).toBe(reversal.reversalEntry!.id);
    });

    it('should detect broken reversal chain', () => {
      // Create original entry
      const original = service.createJournalEntry({
        description: 'Original',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'broken_chain',
        traceId: 'trace_broken',
      });

      // Manually corrupt the chain (this simulates data corruption)
      const entry = service.getEntryById(original.entry!.id);
      if (entry) {
        entry.reversedByEntryId = 'nonexistent_reversal';
      }

      const chainCheck = service.verifyReversalChainIntegrity(original.entry!.id);

      expect(chainCheck.valid).toBe(false);
      expect(chainCheck.error).toContain('missing');
    });

    it('should prevent double reversal', () => {
      const original = service.createJournalEntry({
        description: 'Original',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'double_rev_001',
        traceId: 'trace_double',
      });

      // First reversal
      const reversal1 = service.createReversalEntry({
        originalEntryId: original.entry!.id,
        reason: 'First reversal',
        userId: 'user_001',
        userIP: '192.168.1.1',
        traceId: 'trace_double',
      });

      expect(reversal1.success).toBe(true);

      // Second reversal attempt
      const reversal2 = service.createReversalEntry({
        originalEntryId: original.entry!.id,
        reason: 'Second reversal',
        userId: 'user_001',
        userIP: '192.168.1.1',
        traceId: 'trace_double',
      });

      expect(reversal2.success).toBe(false);
      expect(reversal2.error).toContain('already reversed');
    });
  });

  // --------------------------------------------------------------------------
  // TC-AUD-003: Server Timestamp Enforcement
  // --------------------------------------------------------------------------
  describe('TC-AUD-003: Server Timestamp Enforcement', () => {
    it('should use server timestamp, not client timestamp', () => {
      const clientTime = new Date('2020-01-01T00:00:00Z'); // Old date
      const beforeCreate = new Date();

      const result = service.createJournalEntry({
        description: 'Test entry',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'timestamp_test',
        traceId: 'trace_time',
        clientTimestamp: clientTime, // Should be ignored
      });

      const afterCreate = new Date();

      expect(result.success).toBe(true);
      expect(result.entry?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(result.entry?.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(result.entry?.createdAt.getTime()).not.toBe(clientTime.getTime());
    });

    it('should record server timestamp in audit log', () => {
      const beforeCreate = Date.now();

      const result = service.createJournalEntry({
        description: 'Audit log time test',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'audit_time_test',
        traceId: 'trace_audit_time',
      });

      const logs = service.getAuditLogsForEntity(result.entry!.id);

      expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreate);
    });
  });

  // --------------------------------------------------------------------------
  // TC-AUD-004: Idempotency Key Duplicate Prevention
  // --------------------------------------------------------------------------
  describe('TC-AUD-004: Idempotency Key Enforcement', () => {
    it('should return same entry for duplicate idempotency key', () => {
      const result1 = service.createJournalEntry({
        description: 'First call',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'idem_001',
        traceId: 'trace_idem',
      });

      const result2 = service.createJournalEntry({
        description: 'Second call with same key',
        postings: [{ accountId: 'cash', amount: '200.0000' }], // Different amount!
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'idem_001', // Same key
        traceId: 'trace_idem_2',
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.entry?.id).toBe(result1.entry?.id); // Same entry returned
    });

    it('should create separate entries for different idempotency keys', () => {
      const result1 = service.createJournalEntry({
        description: 'Entry 1',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'idem_A',
        traceId: 'trace_A',
      });

      const result2 = service.createJournalEntry({
        description: 'Entry 2',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'idem_B', // Different key
        traceId: 'trace_B',
      });

      expect(result1.entry?.id).not.toBe(result2.entry?.id);
    });
  });

  // --------------------------------------------------------------------------
  // TC-AUD-005: Voided Entry Preservation
  // --------------------------------------------------------------------------
  describe('TC-AUD-005: Voided Entry Preservation', () => {
    it('should mark entry as voided, not delete', () => {
      const result = service.createJournalEntry({
        description: 'Entry to void',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'void_test',
        traceId: 'trace_void',
      });

      const voidResult = service.voidEntry({
        entryId: result.entry!.id,
        reason: 'Data entry error',
        userId: 'supervisor_001',
        userIP: '192.168.1.1',
      });

      expect(voidResult.success).toBe(true);

      // Entry still exists and is queryable
      const voidedEntry = service.getEntryById(result.entry!.id);
      expect(voidedEntry).toBeDefined();
      expect(voidedEntry?.isVoided).toBe(true);
      expect(voidedEntry?.voidedBy).toBe('supervisor_001');
      expect(voidedEntry?.voidReason).toBe('Data entry error');
    });

    it('should allow querying voided entries for audit', () => {
      // Create and void multiple entries
      const entry1 = service.createJournalEntry({
        description: 'Void me 1',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'void_query_1',
        traceId: 'trace_void_1',
      });

      const entry2 = service.createJournalEntry({
        description: 'Keep me',
        postings: [{ accountId: 'cash', amount: '200.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'void_query_2',
        traceId: 'trace_void_2',
      });

      const entry3 = service.createJournalEntry({
        description: 'Void me 2',
        postings: [{ accountId: 'cash', amount: '300.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'void_query_3',
        traceId: 'trace_void_3',
      });

      service.voidEntry({
        entryId: entry1.entry!.id,
        reason: 'Error 1',
        userId: 'admin',
        userIP: '192.168.1.1',
      });

      service.voidEntry({
        entryId: entry3.entry!.id,
        reason: 'Error 2',
        userId: 'admin',
        userIP: '192.168.1.1',
      });

      const voided = service.getVoidedEntries();

      expect(voided).toHaveLength(2);
      expect(voided.map((e) => e.description)).toContain('Void me 1');
      expect(voided.map((e) => e.description)).toContain('Void me 2');
      expect(voided.map((e) => e.description)).not.toContain('Keep me');
    });

    it('should create audit log for void action', () => {
      const entry = service.createJournalEntry({
        description: 'Void audit test',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'void_audit',
        traceId: 'trace_void_audit',
      });

      service.voidEntry({
        entryId: entry.entry!.id,
        reason: 'Test reason',
        userId: 'admin',
        userIP: '10.0.0.1',
      });

      const logs = service.getAuditLogsForEntity(entry.entry!.id);

      expect(logs.some((l) => l.action === 'void')).toBe(true);
      const voidLog = logs.find((l) => l.action === 'void')!;
      expect(voidLog.userId).toBe('admin');
      expect(voidLog.changes).toContainEqual({
        field: 'isVoided',
        oldValue: false,
        newValue: true,
      });
    });
  });

  // --------------------------------------------------------------------------
  // TC-AUD-006: Trace ID Propagation
  // --------------------------------------------------------------------------
  describe('TC-AUD-006: Trace ID Propagation', () => {
    it('should propagate trace ID through saga', () => {
      const sharedTraceId = 'saga_trace_12345';

      // Step 1: Create charge
      service.createJournalEntry({
        description: 'Rent charge',
        postings: [
          { accountId: 'ar', amount: '1500.0000' },
          { accountId: 'revenue', amount: '-1500.0000' },
        ],
        userId: 'system',
        userIP: '127.0.0.1',
        idempotencyKey: 'saga_step_1',
        traceId: sharedTraceId,
      });

      // Step 2: Record payment
      service.createJournalEntry({
        description: 'Rent payment received',
        postings: [
          { accountId: 'cash', amount: '1500.0000' },
          { accountId: 'ar', amount: '-1500.0000' },
        ],
        userId: 'system',
        userIP: '127.0.0.1',
        idempotencyKey: 'saga_step_2',
        traceId: sharedTraceId,
      });

      // Step 3: Bank deposit
      service.createJournalEntry({
        description: 'Bank deposit',
        postings: [
          { accountId: 'bank', amount: '1500.0000' },
          { accountId: 'cash', amount: '-1500.0000' },
        ],
        userId: 'system',
        userIP: '127.0.0.1',
        idempotencyKey: 'saga_step_3',
        traceId: sharedTraceId,
      });

      // Query all entries by trace ID
      const sagaEntries = service.getEntriesByTraceId(sharedTraceId);

      expect(sagaEntries).toHaveLength(3);
      expect(sagaEntries.every((e) => e.traceId === sharedTraceId)).toBe(true);
    });

    it('should include trace ID in audit logs', () => {
      const traceId = 'audit_trace_xyz';

      const entry = service.createJournalEntry({
        description: 'Trace in audit',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'trace_audit_test',
        traceId,
      });

      const logs = service.getAuditLogsForEntity(entry.entry!.id);

      expect(logs[0].traceId).toBe(traceId);
    });
  });

  // --------------------------------------------------------------------------
  // TC-AUD-007: IP Address Logging
  // --------------------------------------------------------------------------
  describe('TC-AUD-007: IP Address Logging', () => {
    it('should log IP address on journal entry creation', () => {
      const result = service.createJournalEntry({
        description: 'IP test',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '203.0.113.42',
        idempotencyKey: 'ip_test',
        traceId: 'trace_ip',
      });

      expect(result.entry?.createdByIP).toBe('203.0.113.42');
    });

    it('should log IP address in audit trail', () => {
      const entry = service.createJournalEntry({
        description: 'IP audit test',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '198.51.100.1',
        idempotencyKey: 'ip_audit_test',
        traceId: 'trace_ip_audit',
      });

      const logs = service.getAuditLogsForEntity(entry.entry!.id);

      expect(logs[0].userIP).toBe('198.51.100.1');
    });

    it('should log different IPs for different actions', () => {
      const entry = service.createJournalEntry({
        description: 'Multi IP test',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1', // First IP
        idempotencyKey: 'multi_ip',
        traceId: 'trace_multi_ip',
      });

      service.voidEntry({
        entryId: entry.entry!.id,
        reason: 'Test',
        userId: 'admin',
        userIP: '10.0.0.1', // Different IP
      });

      const logs = service.getAuditLogsForEntity(entry.entry!.id);

      expect(logs.find((l) => l.action === 'create')?.userIP).toBe('192.168.1.1');
      expect(logs.find((l) => l.action === 'void')?.userIP).toBe('10.0.0.1');
    });
  });

  // --------------------------------------------------------------------------
  // TC-AUD-008: Before/After State Capture
  // --------------------------------------------------------------------------
  describe('TC-AUD-008: Before/After State Capture', () => {
    it('should capture balance before and after each posting', () => {
      // First entry
      service.createJournalEntry({
        description: 'First entry',
        postings: [{ accountId: 'cash', amount: '1000.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'state_test_1',
        traceId: 'trace_state',
      });

      // Second entry
      const result2 = service.createJournalEntry({
        description: 'Second entry',
        postings: [{ accountId: 'cash', amount: '500.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'state_test_2',
        traceId: 'trace_state',
      });

      const posting = result2.entry?.postings[0];

      expect(posting?.balanceBefore).toBe('1000.0000');
      expect(posting?.balanceAfter).toBe('1500.0000');
    });

    it('should track complete balance history', () => {
      // Create multiple entries
      service.createJournalEntry({
        description: 'Entry 1',
        postings: [{ accountId: 'test_account', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'history_1',
        traceId: 'trace_history',
      });

      service.createJournalEntry({
        description: 'Entry 2',
        postings: [{ accountId: 'test_account', amount: '50.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'history_2',
        traceId: 'trace_history',
      });

      service.createJournalEntry({
        description: 'Entry 3',
        postings: [{ accountId: 'test_account', amount: '-30.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'history_3',
        traceId: 'trace_history',
      });

      const history = service.getBalanceHistory('test_account');

      expect(history).toHaveLength(3);
      expect(history[0].balance).toBe('100.0000');
      expect(history[1].balance).toBe('150.0000');
      expect(history[2].balance).toBe('120.0000');
    });

    it('should capture void action state changes', () => {
      const entry = service.createJournalEntry({
        description: 'Void state test',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'void_state',
        traceId: 'trace_void_state',
      });

      service.voidEntry({
        entryId: entry.entry!.id,
        reason: 'Test',
        userId: 'admin',
        userIP: '10.0.0.1',
      });

      const logs = service.getAuditLogsForEntity(entry.entry!.id);
      const voidLog = logs.find((l) => l.action === 'void');

      expect(voidLog?.changes).toContainEqual({
        field: 'isVoided',
        oldValue: false,
        newValue: true,
      });
    });
  });

  // --------------------------------------------------------------------------
  // TC-AUD-009: Sensitive Data Access Logging
  // --------------------------------------------------------------------------
  describe('TC-AUD-009: Sensitive Data Access Logging', () => {
    it('should log SSN access', () => {
      service.logSensitiveDataAccess({
        userId: 'user_001',
        dataType: 'SSN',
        entityId: 'tenant_12345',
        purpose: 'Background check',
        approved: true,
      });

      const logs = service.getSensitiveAccessLog('user_001');

      expect(logs).toHaveLength(1);
      expect(logs[0].dataType).toBe('SSN');
      expect(logs[0].purpose).toBe('Background check');
    });

    it('should log TIN access', () => {
      service.logSensitiveDataAccess({
        userId: 'accountant_001',
        dataType: 'TIN',
        entityId: 'vendor_98765',
        purpose: '1099 generation',
        approved: true,
      });

      const logs = service.getSensitiveAccessLog('accountant_001');

      expect(logs[0].dataType).toBe('TIN');
    });

    it('should log bank account access', () => {
      service.logSensitiveDataAccess({
        userId: 'admin_001',
        dataType: 'bank_account',
        entityId: 'owner_55555',
        purpose: 'ACH setup',
        approved: true,
      });

      const logs = service.getSensitiveAccessLog('admin_001');

      expect(logs[0].dataType).toBe('bank_account');
    });

    it('should track unapproved access attempts', () => {
      service.logSensitiveDataAccess({
        userId: 'suspicious_user',
        dataType: 'credit_card',
        entityId: 'tenant_99999',
        purpose: 'Unknown',
        approved: false,
      });

      const logs = service.getSensitiveAccessLog('suspicious_user');

      expect(logs[0].approved).toBe(false);
    });

    it('should allow querying all sensitive access', () => {
      service.logSensitiveDataAccess({
        userId: 'user_A',
        dataType: 'SSN',
        entityId: 'tenant_1',
        purpose: 'Test A',
        approved: true,
      });

      service.logSensitiveDataAccess({
        userId: 'user_B',
        dataType: 'TIN',
        entityId: 'vendor_1',
        purpose: 'Test B',
        approved: true,
      });

      const allLogs = service.getSensitiveAccessLog();

      expect(allLogs).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // TC-AUD-010: Immutability Enforcement
  // --------------------------------------------------------------------------
  describe('TC-AUD-010: Immutability Enforcement', () => {
    it('should reject UPDATE on journal entry amount', () => {
      const entry = service.createJournalEntry({
        description: 'Immutable test',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'immutable_1',
        traceId: 'trace_immutable',
      });

      const result = service.attemptUpdateJournalEntry(entry.entry!.id, {
        description: 'Changed description', // Forbidden!
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('IMMUTABILITY VIOLATION');
    });

    it('should reject UPDATE on journal entry postings', () => {
      const entry = service.createJournalEntry({
        description: 'Immutable postings',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'immutable_2',
        traceId: 'trace_immutable_2',
      });

      const result = service.attemptUpdateJournalEntry(entry.entry!.id, {
        postings: [{ accountId: 'cash', amount: '200.0000' }] as any, // Forbidden!
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('IMMUTABILITY VIOLATION');
    });

    it('should allow UPDATE only for reversedByEntryId', () => {
      const entry = service.createJournalEntry({
        description: 'Reversal link test',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'reversal_link',
        traceId: 'trace_reversal_link',
      });

      const result = service.attemptUpdateJournalEntry(entry.entry!.id, {
        reversedByEntryId: 'reversal_entry_xyz', // Allowed!
      });

      expect(result.success).toBe(true);
    });

    it('should reject DELETE on journal entry', () => {
      const entry = service.createJournalEntry({
        description: 'Cannot delete',
        postings: [{ accountId: 'cash', amount: '100.0000' }],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'no_delete',
        traceId: 'trace_no_delete',
      });

      const result = service.attemptDeleteJournalEntry(entry.entry!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be deleted');
    });
  });

  // --------------------------------------------------------------------------
  // BONUS: Complex Audit Scenarios
  // --------------------------------------------------------------------------
  describe('BONUS: Complex Audit Scenarios', () => {
    it('should handle full payment lifecycle audit trail', () => {
      const traceId = 'payment_lifecycle_trace';

      // 1. Create charge
      const charge = service.createJournalEntry({
        description: 'Monthly rent charge',
        postings: [
          { accountId: 'ar', amount: '1500.0000' },
          { accountId: 'revenue', amount: '-1500.0000' },
        ],
        userId: 'system',
        userIP: '127.0.0.1',
        idempotencyKey: 'lifecycle_charge',
        traceId,
        sourceDocumentType: 'invoice',
      });

      // 2. Payment received
      const payment = service.createJournalEntry({
        description: 'Payment received',
        postings: [
          { accountId: 'cash', amount: '1500.0000' },
          { accountId: 'ar', amount: '-1500.0000' },
        ],
        userId: 'tenant_portal',
        userIP: '203.0.113.50',
        idempotencyKey: 'lifecycle_payment',
        traceId,
        sourceDocumentType: 'payment',
      });

      // 3. NSF - Payment bounced
      const nsf = service.createReversalEntry({
        originalEntryId: payment.entry!.id,
        reason: 'NSF - Insufficient funds',
        userId: 'bank_feed',
        userIP: '10.0.0.1',
        traceId,
      });

      // 4. NSF Fee
      const nsfFee = service.createJournalEntry({
        description: 'NSF Fee',
        postings: [
          { accountId: 'ar', amount: '35.0000' },
          { accountId: 'nsf_fee_revenue', amount: '-35.0000' },
        ],
        userId: 'system',
        userIP: '127.0.0.1',
        idempotencyKey: 'lifecycle_nsf_fee',
        traceId,
      });

      // Verify complete saga is traceable
      const sagaEntries = service.getEntriesByTraceId(traceId);

      expect(sagaEntries).toHaveLength(4);

      // Verify reversal chain
      const chainCheck = service.verifyReversalChainIntegrity(payment.entry!.id);
      expect(chainCheck.valid).toBe(true);

      // Verify balance history
      const arHistory = service.getBalanceHistory('ar');
      expect(arHistory).toHaveLength(4); // charge, payment, reversal, fee
      expect(arHistory[arHistory.length - 1].balance).toBe('1535.0000'); // 1500 + 35 fee
    });

    it('should audit complete reversal and void scenario', () => {
      // Create entry
      const entry = service.createJournalEntry({
        description: 'Complex entry',
        postings: [
          { accountId: 'cash', amount: '500.0000' },
          { accountId: 'ar', amount: '-500.0000' },
        ],
        userId: 'user_001',
        userIP: '192.168.1.1',
        idempotencyKey: 'complex_1',
        traceId: 'trace_complex',
      });

      // Void the entry
      service.voidEntry({
        entryId: entry.entry!.id,
        reason: 'Posted to wrong tenant',
        userId: 'supervisor',
        userIP: '192.168.1.100',
      });

      // Verify audit logs
      const logs = service.getAuditLogsForEntity(entry.entry!.id);

      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.some((l) => l.action === 'create')).toBe(true);
      expect(logs.some((l) => l.action === 'void')).toBe(true);

      // Verify entry still exists and is marked voided
      const voidedEntry = service.getEntryById(entry.entry!.id);
      expect(voidedEntry?.isVoided).toBe(true);
      expect(voidedEntry?.voidedBy).toBe('supervisor');
    });
  });
});
