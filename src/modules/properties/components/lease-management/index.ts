// Main lease management components
export { default as LeaseManagement } from './LeaseManagement';
export { default as LeaseList } from './LeaseList';
export { default as LeaseStatsCards } from './LeaseStatsCards';
export { default as CreateLeaseModal } from './CreateLeaseModal';
export { default as ExpiringLeasesModal } from './ExpiringLeasesModal';

// Enhanced components
export { default as LeaseAnalytics } from './LeaseAnalytics';
export { default as PaymentTracking } from './PaymentTracking';
export { default as DocumentManager } from './DocumentManager';
export { default as ESignatureIntegration } from './ESignatureIntegration';
export { default as LeaseNotifications } from './LeaseNotifications';
export { default as LeaseWizardEnhanced } from './LeaseWizardEnhanced';

// Wizard component (original)
export { default as LeaseWizard } from './LeaseWizard';

// Re-export all types
export type {
  Lease,
  LeaseStats,
  CreateLeaseInput,
  LeaseFilters,
  ExpiringLease,
  LeaseDocument,
  LeasePayment,
  LeaseRenewal,
  LeaseAnalytics as LeaseAnalyticsData,
  LeaseCompliance,
  LeaseTemplate,
  LeaseWorkflow,
  LeaseNotification,
  LeaseSearchFilters,
  LeaseSortOptions,
  LeaseComparison,
  LeaseExportOptions
} from '../../types/lease';

// Re-export services
export {
  getLeases,
  getPropertyLeases,
  getLease,
  createLease,
  updateLease,
  deleteLease,
  terminateLease,
  renewLease,
  getLeaseStats,
  getExpiringLeases,
  getLeaseAnalytics,
  getLeaseDocuments,
  uploadLeaseDocument,
  getLeasePayments,
  recordLeasePayment,
  getLeaseRenewals,
  createLeaseRenewal,
  respondToLeaseRenewal,
  getRentRoll,
  generateLeaseReport,
  sendExpirationReminders,
  bulkUpdateLeaseStatus,
  bulkExtendLeases,
  getLeaseComplianceReport
} from '../../services/leaseService';