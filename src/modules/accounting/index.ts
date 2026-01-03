/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Main Module Export
 *
 * This is the entry point for the Titanium Accounting system.
 *
 * TITANIUM RULES:
 * 1. Immutable Ledger - Never UPDATE, only reversals
 * 2. Double-Entry Only - Balanced journal entries
 * 3. Law as Data - Compliance from database
 * 4. O(1) Reads - Pre-calculated balances
 * 5. Row-Level Security - PostgreSQL RLS
 * 6. Hybrid Async - Sync reads, async writes
 */

// ===========================================
// TYPES
// ===========================================
export * from './types';

// ===========================================
// PHASE 1: FOUNDATION SERVICES
// ===========================================
export { ComplianceService, ComplianceError, createComplianceService } from './services/ComplianceService';
export { LedgerService, LedgerError, createLedgerService } from './services/LedgerService';

// ===========================================
// PHASE 2: EVENT ENGINE
// ===========================================
export { EventService, EventError, createEventService } from './events/EventService';
export { SagaOrchestrator, SagaError, createSagaOrchestrator } from './sagas/SagaOrchestrator';
export { EventWorker, createEventWorker, type EventWorkerOptions } from './workers/EventWorker';
export {
  SagaMonitor,
  createSagaMonitor,
  runZombieCheck,
  type SagaMonitorOptions,
  type ZombieResurrectionResult,
} from './workers/SagaMonitor';

// ===========================================
// PHASE 3: CORE FINANCE
// ===========================================
export { PeriodService, PeriodError, createPeriodService, type CreatePeriodInput } from './services/PeriodService';
export {
  CorrectionService,
  CorrectionError,
  createCorrectionService,
  type VoidEntryInput,
  type ReclassExpenseInput,
  type ReclassAccountInput,
  type WriteOffInput,
  type AdjustmentInput,
  type VoidAndReplaceInput,
  type VoidAndReplaceResult,
} from './services/CorrectionService';
export {
  PeriodCloseSaga,
  PeriodCloseError,
  createPeriodCloseSaga,
  PERIOD_CLOSE_STEPS,
  type PeriodCloseSagaPayload,
} from './sagas/PeriodCloseSaga';
export { createNSFHandlingSaga, NSF_SAGA_STEPS, type NSFSagaPayload } from './sagas/NSFHandlingSaga';

// ===========================================
// PHASE 4: REPORTING & TIME TRAVEL
// ===========================================
export {
  TimeTravelService,
  TimeTravelError,
  createTimeTravelService,
  type TrialBalanceEntry,
  type BalanceComparison,
  type AccountActivity,
} from './services/TimeTravelService';
export {
  ReportingService,
  ReportingError,
  createReportingService,
  type BalanceSheet,
  type BalanceSheetLine,
  type IncomeStatement,
  type IncomeStatementLine,
  type TrialBalanceReport,
  type PropertyPnL,
  type OwnerStatement,
} from './services/ReportingService';
export {
  DiagnosticsService,
  createDiagnosticsService,
  type TrustIntegrityResult,
  type TrialBalanceCheckResult,
  type OrphanCheckResult,
  type BalanceConsistencyResult,
  type FullDiagnosticsResult,
} from './services/DiagnosticsService';

// ===========================================
// PHASE 5: MIGRATION & VALIDATION
// ===========================================
export {
  MigrationValidator,
  createMigrationValidator,
  type ImportedTransaction,
  type ImportedPosting,
  type OpeningBalance,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type MigrationValidationResult,
} from './services/MigrationValidator';

// ===========================================
// PHASE 6: PAYMENT PROCESSING SAGAS
// ===========================================
export {
  PaymentProcessingSaga,
  PaymentSagaError,
  createPaymentProcessingSaga,
  PAYMENT_SAGA_STEPS,
  type PaymentSagaStep,
  type PaymentSagaPayload,
  type AppliedCharge,
} from './sagas/PaymentProcessingSaga';

export {
  DistributionSaga,
  DistributionSagaError,
  createDistributionSaga,
  DISTRIBUTION_SAGA_STEPS,
  type DistributionSagaStep,
  type DistributionSagaPayload,
  type OwnerDistribution,
  type NACHAFile,
} from './sagas/DistributionSaga';

export {
  SweepSaga,
  SweepSagaError,
  createSweepSaga,
  SWEEP_SAGA_STEPS,
  type SweepSagaStep,
  type SweepType,
  type SweepSagaPayload,
  type SweepItem,
  type ReconciliationResult,
} from './sagas/SweepSaga';

export {
  BillPaySaga,
  BillPaySagaError,
  createBillPaySaga,
  BILL_PAY_SAGA_STEPS,
  type BillPaySagaStep,
  type PaymentType,
  type PaymentMethod,
  type BillPaySagaPayload,
  type ExpenseAllocation,
  type VendorPaymentRecord,
} from './sagas/BillPaySaga';

export {
  SecurityDepositSaga,
  SecurityDepositSagaError,
  createSecurityDepositSaga,
  COLLECT_SAGA_STEPS,
  RETURN_SAGA_STEPS,
  type CollectSagaStep,
  type ReturnSagaStep,
  type SecurityDepositSagaPayload,
  type DepositDeduction,
  type DepositInterestCalculation,
} from './sagas/SecurityDepositSaga';

// ===========================================
// PHASE 7: EXTENDED SERVICES
// ===========================================
export {
  BankIntegrationService,
  BankIntegrationError,
  createBankIntegrationService,
  type BankTransaction,
  type PlaidTransaction,
  type MatchingRule,
  type MatchingRuleInput,
  type RuleCondition,
  type RuleAction,
  type MatchResult,
  type ReconciliationSession,
  type ReconciliationAdjustment,
} from './services/BankIntegrationService';

export {
  TenantLedgerService,
  TenantLedgerError,
  createTenantLedgerService,
  type TenantBalance,
  type LedgerEntry,
  type TenantLedgerResponse,
  type PostChargeInput,
  type OutstandingCharge,
  type AgingBuckets,
  type AgingChargeDetail,
  type AgingReport,
  type TenantAgingSummary,
  type PortfolioAgingSummary,
  type TenantStatement,
  type PaymentPlanInput,
  type PaymentPlanInstallment,
  type PaymentPlan,
} from './services/TenantLedgerService';

export {
  TaxComplianceService,
  TaxComplianceError,
  createTaxComplianceService,
  type Vendor1099Summary,
  type Vendor1099Detail,
  type Owner1099Summary,
  type Form1099NEC,
  type Form1099MISC,
  type Form1099Error,
  type Generated1099Batch,
  type FIREFile,
} from './services/TaxComplianceService';

// ===========================================
// PHASE 8: OBSERVABILITY
// ===========================================
export {
  ObservabilityService,
  createObservabilityService,
  createNoOpObservabilityService,
  Span,
  Counter,
  Histogram,
  type SpanContext,
  type SpanStatus,
  type SpanStatusCode,
  type SpanEvent,
  type SpanOptions,
  type AttributeValue,
  type MetricLabels,
  type CounterOptions,
  type HistogramOptions,
  type ObservabilityOptions,
  type SagaStepContext,
  type LedgerOperationContext,
  type HealthStatus,
  type AccountingMetrics,
} from './observability/ObservabilityService';

// ===========================================
// FACTORY FUNCTIONS
// ===========================================

import { createPaymentProcessingSaga } from './sagas/PaymentProcessingSaga';
import { createDistributionSaga } from './sagas/DistributionSaga';
import { createSweepSaga } from './sagas/SweepSaga';
import { createBillPaySaga } from './sagas/BillPaySaga';
import { createSecurityDepositSaga } from './sagas/SecurityDepositSaga';
import { createBankIntegrationService } from './services/BankIntegrationService';
import { createTenantLedgerService } from './services/TenantLedgerService';
import { createTaxComplianceService } from './services/TaxComplianceService';
import { createObservabilityService } from './observability/ObservabilityService';

/**
 * Initialize the full Titanium Accounting module for an organization
 */
export function initializeTitaniumAccounting(organizationId: string, traceId?: string) {
  return {
    // Phase 1: Foundation
    compliance: createComplianceService(organizationId),
    ledger: createLedgerService(organizationId, traceId),

    // Phase 2: Event Engine
    events: createEventService(organizationId),
    sagas: createSagaOrchestrator(organizationId),

    // Phase 3: Core Finance
    periods: createPeriodService(organizationId),
    corrections: createCorrectionService(organizationId, traceId),

    // Phase 4: Reporting
    timeTravel: createTimeTravelService(organizationId),
    reporting: createReportingService(organizationId),
    diagnostics: createDiagnosticsService(organizationId),

    // Phase 5: Migration
    migration: createMigrationValidator(organizationId),

    // Phase 6: Extended Services
    bankIntegration: createBankIntegrationService(organizationId),
    tenantLedger: createTenantLedgerService(organizationId),
    taxCompliance: createTaxComplianceService(organizationId),

    // Phase 7: Observability
    observability: createObservabilityService(organizationId),
  };
}

/**
 * Initialize workers for background processing
 */
export function initializeTitaniumWorkers(options?: {
  eventWorkerOptions?: EventWorkerOptions;
  sagaMonitorOptions?: SagaMonitorOptions;
}) {
  return {
    eventWorker: createEventWorker(options?.eventWorkerOptions),
    sagaMonitor: createSagaMonitor(options?.sagaMonitorOptions),
  };
}

/**
 * Initialize all sagas for specific workflows
 */
export function initializeTitaniumSagas(organizationId: string) {
  return {
    // Core Sagas
    periodClose: createPeriodCloseSaga(organizationId),
    nsfHandling: createNSFHandlingSaga(organizationId),

    // Payment Sagas
    paymentProcessing: createPaymentProcessingSaga(organizationId),
    distribution: createDistributionSaga(organizationId),
    billPay: createBillPaySaga(organizationId),

    // Trust Account Sagas
    sweep: createSweepSaga(organizationId),
    securityDeposit: createSecurityDepositSaga(organizationId),
  };
}

/**
 * Initialize Titanium for a specific use case
 */
export function initializeTitaniumForPayments(organizationId: string) {
  return {
    ledger: createLedgerService(organizationId),
    compliance: createComplianceService(organizationId),
    events: createEventService(organizationId),
    paymentProcessing: createPaymentProcessingSaga(organizationId),
    tenantLedger: createTenantLedgerService(organizationId),
  };
}

export function initializeTitaniumForOwners(organizationId: string) {
  return {
    ledger: createLedgerService(organizationId),
    compliance: createComplianceService(organizationId),
    events: createEventService(organizationId),
    distribution: createDistributionSaga(organizationId),
    sweep: createSweepSaga(organizationId),
    reporting: createReportingService(organizationId),
  };
}

export function initializeTitaniumForVendors(organizationId: string) {
  return {
    ledger: createLedgerService(organizationId),
    compliance: createComplianceService(organizationId),
    events: createEventService(organizationId),
    billPay: createBillPaySaga(organizationId),
    taxCompliance: createTaxComplianceService(organizationId),
  };
}

export function initializeTitaniumForBanking(organizationId: string) {
  return {
    ledger: createLedgerService(organizationId),
    events: createEventService(organizationId),
    bankIntegration: createBankIntegrationService(organizationId),
    sweep: createSweepSaga(organizationId),
  };
}
