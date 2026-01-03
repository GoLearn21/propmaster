import React from 'react';
import { PaymentDashboard } from '../components/features/payment-dashboard/PaymentDashboard';

/**
 * PaymentsPage / AccountingPage
 *
 * Comprehensive accounting dashboard with:
 * - AR Aging Reports (30/60/90/90+ days)
 * - Tenant Ledger with statements
 * - Charge Posting (rent, fees, utilities)
 * - Late Fee Management (NC/SC/GA state rules)
 * - Payment Plans
 * - Security Deposit Tracking
 * - State Compliance (NC/SC/GA regulations)
 * - Payment History
 * - Billing Configuration
 * - Payment Methods
 */
export function PaymentsPage() {
  return <PaymentDashboard />;
}