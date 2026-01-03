/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Type Definitions
 *
 * TITANIUM RULES:
 * - All financial amounts use Decimal (never float)
 * - All IDs are UUIDs
 * - All timestamps are ISO 8601
 */

// ===========================================
// CORE PRIMITIVES
// ===========================================

export type UUID = string;
export type Decimal = string; // Stored as string to preserve precision
export type ISODate = string; // YYYY-MM-DD
export type ISOTimestamp = string; // Full ISO 8601

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type NormalBalance = 'debit' | 'credit';

// ===========================================
// COMPLIANCE (Law as Data)
// ===========================================

export type ComplianceRuleType =
  | 'late_fee'
  | 'security_deposit'
  | 'interest_rate'
  | 'grace_period'
  | 'notice_period';

export type ComplianceRuleKey =
  | 'max_percent'
  | 'max_amount'
  | 'deadline_days'
  | 'grace_period_days'
  | 'interest_rate_cap'
  | 'max_months_rent';

export interface ComplianceRule {
  id: UUID;
  organizationId: UUID;
  stateCode: string;
  ruleType: ComplianceRuleType;
  ruleKey: ComplianceRuleKey;
  ruleValue: string;
  effectiveDate: ISODate;
  endDate: ISODate | null;
  sourceCitation?: string;
  createdAt: ISOTimestamp;
}

export interface ComplianceQuery {
  stateCode: string;
  ruleType: ComplianceRuleType;
  ruleKey: ComplianceRuleKey;
  asOfDate?: ISODate;
}

// ===========================================
// CHART OF ACCOUNTS
// ===========================================

export interface ChartOfAccount {
  id: UUID;
  organizationId: UUID;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountSubtype?: string;
  parentAccountId?: UUID;
  isSystemAccount: boolean;
  isActive: boolean;
  normalBalance: NormalBalance;
  createdAt: ISOTimestamp;
}

// ===========================================
// ACCOUNTING PERIODS
// ===========================================

export interface AccountingPeriod {
  id: UUID;
  organizationId: UUID;
  periodName: string;
  startDate: ISODate;
  endDate: ISODate;
  isClosed: boolean;
  closedAt?: ISOTimestamp;
  closedBy?: UUID;
}

// ===========================================
// JOURNAL ENTRIES (IMMUTABLE)
// ===========================================

export type JournalEntrySource =
  | 'payment'
  | 'invoice'
  | 'adjustment'
  | 'closing'
  | 'reversal'
  | 'distribution'
  | 'charge'
  | 'refund';

export interface JournalEntry {
  id: UUID;
  organizationId: UUID;
  periodId?: UUID;
  entryDate: ISODate;
  effectiveDate: ISODate;
  description: string;
  memo?: string;
  isReversal: boolean;
  reversesEntryId?: UUID;
  reversedByEntryId?: UUID;
  sourceType: JournalEntrySource;
  sourceId?: UUID;
  idempotencyKey?: string;
  traceId?: string;
  createdAt: ISOTimestamp;
  createdBy?: UUID;
}

export interface JournalPosting {
  id: number;
  journalEntryId: UUID;
  accountId: UUID;
  amount: Decimal; // Positive = Debit, Negative = Credit
  propertyId?: UUID;
  unitId?: UUID;
  tenantId?: UUID;
  vendorId?: UUID;
  ownerId?: UUID;
  lineDescription?: string;
}

export interface CreateJournalEntryInput {
  periodId?: UUID;
  entryDate: ISODate;
  effectiveDate?: ISODate;
  description: string;
  memo?: string;
  sourceType: JournalEntrySource;
  sourceId?: UUID;
  idempotencyKey: string;
  postings: CreateJournalPostingInput[];
}

export interface CreateJournalPostingInput {
  accountId: UUID;
  amount: Decimal;
  propertyId?: UUID;
  unitId?: UUID;
  tenantId?: UUID;
  vendorId?: UUID;
  ownerId?: UUID;
  lineDescription?: string;
}

// ===========================================
// ACCOUNT BALANCES (O(1) Reads)
// ===========================================

export interface AccountBalance {
  organizationId: UUID;
  accountId: UUID;
  balance: Decimal;
  lastEntryId?: UUID;
  lastEntryDate?: ISODate;
  updatedAt: ISOTimestamp;
}

export interface DimensionalBalance {
  organizationId: UUID;
  accountId: UUID;
  propertyId?: UUID;
  unitId?: UUID;
  tenantId?: UUID;
  vendorId?: UUID;
  ownerId?: UUID;
  balance: Decimal;
  updatedAt: ISOTimestamp;
}

// ===========================================
// EVENT OUTBOX (Async Engine)
// ===========================================

export type EventStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'dead_letter';

export type EventType =
  | 'payment.received'
  | 'payment.failed'
  | 'payment.nsf'
  | 'invoice.created'
  | 'invoice.paid'
  | 'lease.renewed'
  | 'lease.terminated'
  | 'distribution.scheduled'
  | 'distribution.completed'
  | 'late_fee.assessed'
  | 'journal.posted'
  | 'period.closed';

export interface OutboxEvent<T = unknown> {
  id: UUID;
  organizationId: UUID;
  eventType: EventType;
  aggregateType: string;
  aggregateId: UUID;
  payload: T;
  status: EventStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  traceId: string;
  sagaId?: UUID;
  correlationId?: UUID;
  causationId?: UUID;
  createdAt: ISOTimestamp;
  scheduledFor: ISOTimestamp;
  processedAt?: ISOTimestamp;
  lockedUntil?: ISOTimestamp;
  lockedBy?: string;
}

export interface CreateEventInput<T = unknown> {
  eventType: EventType;
  aggregateType: string;
  aggregateId: UUID;
  payload: T;
  traceId: string;
  sagaId?: UUID;
  correlationId?: UUID;
  causationId?: UUID;
  scheduledFor?: ISOTimestamp;
}

// ===========================================
// SAGA ORCHESTRATOR
// ===========================================

export type SagaStatus = 'running' | 'completed' | 'failed' | 'compensating' | 'compensated';

export type SagaName =
  | 'nsf_handling'
  | 'owner_distribution'
  | 'lease_renewal'
  | 'late_fee_assessment'
  | 'tenant_move_out'
  | 'period_closing';

export interface SagaState<T = unknown> {
  id: UUID;
  organizationId: UUID;
  sagaName: SagaName;
  sagaVersion: number;
  currentStep: string;
  status: SagaStatus;
  stepsCompleted: string[];
  compensationSteps: string[];
  payload: T;
  result?: unknown;
  errorMessage?: string;
  errorStep?: string;
  retryCount: number;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  lastHeartbeat: ISOTimestamp;
  timeoutAt?: ISOTimestamp;
  completedAt?: ISOTimestamp;
  traceId: string;
  initiatedBy?: UUID;
}

export interface CreateSagaInput<T = unknown> {
  sagaName: SagaName;
  initialStep: string;
  payload: T;
  traceId: string;
  timeoutMinutes?: number;
  initiatedBy?: UUID;
}

export interface SagaStepLog {
  id: number;
  sagaId: UUID;
  stepName: string;
  stepType: 'forward' | 'compensation';
  status: 'started' | 'completed' | 'failed';
  inputPayload?: unknown;
  outputPayload?: unknown;
  errorMessage?: string;
  startedAt: ISOTimestamp;
  completedAt?: ISOTimestamp;
  durationMs?: number;
}

// ===========================================
// IDEMPOTENCY
// ===========================================

export interface IdempotencyRecord {
  idempotencyKey: string;
  organizationId: UUID;
  operationType: string;
  resultId?: UUID;
  resultPayload?: unknown;
  createdAt: ISOTimestamp;
  expiresAt: ISOTimestamp;
}

// ===========================================
// API RESPONSE TYPES (Hybrid Async)
// ===========================================

// Sync Read Response (200 OK)
export interface SyncResponse<T> {
  success: true;
  data: T;
  timestamp: ISOTimestamp;
}

// Async Write Response (202 Accepted)
export interface AsyncResponse {
  success: true;
  accepted: true;
  eventId: UUID;
  traceId: string;
  message: string;
  timestamp: ISOTimestamp;
}

// Error Response
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: ISOTimestamp;
}

export type ApiResponse<T> = SyncResponse<T> | AsyncResponse | ErrorResponse;

// ===========================================
// SERVICE INTERFACES
// ===========================================

export interface IComplianceService {
  getComplianceValue(query: ComplianceQuery): Promise<string>;
  getLateFeePercent(stateCode: string, asOfDate?: ISODate): Promise<number>;
  getSecurityDepositMax(stateCode: string, monthlyRent: Decimal, asOfDate?: ISODate): Promise<Decimal>;
  getGracePeriodDays(stateCode: string, asOfDate?: ISODate): Promise<number>;
}

export interface ILedgerService {
  createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry>;
  reverseJournalEntry(entryId: UUID, reason: string, idempotencyKey: string): Promise<JournalEntry>;
  getAccountBalance(accountId: UUID): Promise<AccountBalance>;
  getTenantBalance(tenantId: UUID, accountId?: UUID): Promise<Decimal>;
  getPropertyBalance(propertyId: UUID, accountId?: UUID): Promise<Decimal>;
  validateDoubleEntry(postings: CreateJournalPostingInput[]): boolean;
}

export interface IEventService {
  emit<T>(event: CreateEventInput<T>): Promise<UUID>;
  emitInTransaction<T>(event: CreateEventInput<T>): CreateEventInput<T>;
}

export interface ISagaOrchestrator {
  startSaga<T>(input: CreateSagaInput<T>): Promise<SagaState<T>>;
  advanceSaga(sagaId: UUID, nextStep: string, output?: unknown): Promise<SagaState>;
  failSaga(sagaId: UUID, error: string): Promise<SagaState>;
  completeSaga(sagaId: UUID, result?: unknown): Promise<SagaState>;
  startCompensation(sagaId: UUID): Promise<SagaState>;
  heartbeat(sagaId: UUID): Promise<void>;
}
