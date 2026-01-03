import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { GLOBAL_QUERY_DEFAULTS } from './lib/cacheConfig';

// Theme Provider
import { ThemeProvider } from './contexts/ThemeContext';

// Auth Providers
import { TenantAuthProvider } from './contexts/TenantAuthContext';
import { VendorAuthProvider } from './contexts/VendorAuthContext';
import { OwnerAuthProvider } from './contexts/OwnerAuthContext';

// Property Manager Layout (conditionally renders for non-portal routes)
import { PMLayout } from './layouts/PMLayout';

// Tenant Portal Pages
import TenantLoginPage from './pages/TenantLoginPage';
import TenantDashboardPage from './pages/TenantDashboardPage';
import TenantPaymentsPage from './pages/TenantPaymentsPage';
import TenantPaymentHistoryPage from './pages/TenantPaymentHistoryPage';
import TenantPaymentMethodsPage from './pages/tenant/TenantPaymentMethodsPage';
import TenantMaintenancePage from './pages/tenant/TenantMaintenancePage';
import TenantMaintenanceNewPage from './pages/tenant/TenantMaintenanceNewPage';
import TenantMaintenanceDetailPage from './pages/tenant/TenantMaintenanceDetailPage';
import TenantDocumentsPage from './pages/tenant/TenantDocumentsPage';
import TenantLeaseViewPage from './pages/tenant/TenantLeaseViewPage';
import TenantLeaseSignPage from './pages/tenant/TenantLeaseSignPage';
import TenantNotificationsPage from './pages/tenant/TenantNotificationsPage';
import TenantSignupPage from './pages/tenant/TenantSignupPage';
import TenantOnboardingPage from './pages/tenant/TenantOnboardingPage';
import TenantProfilePage from './pages/tenant/TenantProfilePage';
import TenantSettingsPage from './pages/tenant/TenantSettingsPage';
import TenantForgotPasswordPage from './pages/tenant/TenantForgotPasswordPage';
import TenantResetPasswordPage from './pages/tenant/TenantResetPasswordPage';

// Tenant Notification Context
import { TenantNotificationProvider } from './contexts/TenantNotificationContext';

// Tenant Portal Layout
import TenantLayout from './layouts/TenantLayout';

// Vendor Portal Pages
import VendorLoginPage from './pages/VendorLoginPage';
import VendorSignupPage from './pages/vendor/VendorSignupPage';
import VendorDashboardPage from './pages/VendorDashboardPage';
import VendorJobsPage from './pages/VendorJobsPage';

// Owner Portal Pages
import OwnerLoginPage from './pages/OwnerLoginPage';
import OwnerSignupPage from './pages/owner/OwnerSignupPage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import OwnerPortalPage from './pages/OwnerPortalPage';

// Shared Components
import { UnderDevelopment } from './components/UnderDevelopment';

import './index.css';

// Create a client instance for React Query
// Uses centralized cache config for consistent stale times across the app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      ...GLOBAL_QUERY_DEFAULTS,
    },
  },
});

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <Router>
          <div>
          <Routes>
            {/* ============================================
                TENANT PORTAL ROUTES (Isolated)
                ============================================ */}
            <Route
              path="/tenant/*"
              element={
                <TenantAuthProvider>
                  <Routes>
                    {/* Public auth pages (no layout) */}
                    <Route path="login" element={<TenantLoginPage />} />
                    <Route path="signup/:inviteCode" element={<TenantSignupPage />} />
                    <Route path="signup" element={<TenantSignupPage />} />
                    <Route path="forgot-password" element={<TenantForgotPasswordPage />} />
                    <Route path="reset-password" element={<TenantResetPasswordPage />} />
                    <Route path="onboarding" element={<TenantOnboardingPage />} />

                    {/* Protected pages with TenantLayout + Notifications */}
                    <Route
                      path="*"
                      element={
                        <TenantNotificationProvider>
                          <TenantLayout>
                            <Routes>
                              <Route path="dashboard" element={<TenantDashboardPage />} />
                              <Route path="payments" element={<TenantPaymentsPage />} />
                              <Route path="payments/history" element={<TenantPaymentHistoryPage />} />
                              <Route path="payments/methods" element={<TenantPaymentMethodsPage />} />
                              <Route path="maintenance" element={<TenantMaintenancePage />} />
                              <Route path="maintenance/new" element={<TenantMaintenanceNewPage />} />
                              <Route path="maintenance/:requestId" element={<TenantMaintenanceDetailPage />} />
                              <Route path="documents" element={<TenantDocumentsPage />} />
                              <Route path="documents/:id" element={<TenantLeaseViewPage />} />
                              <Route path="documents/:id/sign" element={<TenantLeaseSignPage />} />
                              <Route path="notifications" element={<TenantNotificationsPage />} />
                              <Route path="profile" element={<TenantProfilePage />} />
                              <Route path="settings" element={<TenantSettingsPage />} />
                            </Routes>
                          </TenantLayout>
                        </TenantNotificationProvider>
                      }
                    />
                  </Routes>
                </TenantAuthProvider>
              }
            />

            {/* ============================================
                VENDOR PORTAL ROUTES (Isolated)
                ============================================ */}
            <Route
              path="/vendor/*"
              element={
                <VendorAuthProvider>
                  <Routes>
                    <Route path="login" element={<VendorLoginPage />} />
                    <Route path="signup/:inviteCode" element={<VendorSignupPage />} />
                    <Route path="signup" element={<VendorSignupPage />} />
                    <Route path="dashboard" element={<VendorDashboardPage />} />
                    <Route path="jobs" element={<VendorJobsPage />} />
                    <Route path="jobs/:jobId" element={<VendorJobsPage />} />
                    <Route path="work-orders" element={<VendorJobsPage />} />
                    <Route path="payments" element={<UnderDevelopment title="Vendor Payments" description="Payment tracking and invoicing for vendors is under development." backPath="/vendor/dashboard" backLabel="Back to Dashboard" />} />
                    <Route path="documents" element={<UnderDevelopment title="Vendor Documents" description="Document management for vendors is under development." backPath="/vendor/dashboard" backLabel="Back to Dashboard" />} />
                    <Route path="profile" element={<UnderDevelopment title="Vendor Profile" description="Profile management is under development." backPath="/vendor/dashboard" backLabel="Back to Dashboard" />} />
                    <Route path="settings" element={<UnderDevelopment title="Vendor Settings" description="Settings configuration is under development." backPath="/vendor/dashboard" backLabel="Back to Dashboard" />} />
                  </Routes>
                </VendorAuthProvider>
              }
            />

            {/* ============================================
                OWNER PORTAL ROUTES (Isolated)
                ============================================ */}
            <Route
              path="/owner/*"
              element={
                <OwnerAuthProvider>
                  <Routes>
                    <Route path="login" element={<OwnerLoginPage />} />
                    <Route path="signup/:inviteCode" element={<OwnerSignupPage />} />
                    <Route path="signup" element={<OwnerSignupPage />} />
                    <Route path="dashboard" element={<OwnerDashboardPage />} />
                    <Route path="properties" element={<UnderDevelopment title="Owner Properties" description="Property overview for owners is under development." backPath="/owner/dashboard" backLabel="Back to Dashboard" />} />
                    <Route path="financial-reports" element={<OwnerPortalPage />} />
                    <Route path="income-expenses" element={<UnderDevelopment title="Income & Expenses" description="Income and expense tracking is under development." backPath="/owner/dashboard" backLabel="Back to Dashboard" />} />
                    <Route path="performance" element={<UnderDevelopment title="Property Performance" description="Performance analytics is under development." backPath="/owner/dashboard" backLabel="Back to Dashboard" />} />
                    <Route path="tenants" element={<UnderDevelopment title="Owner Tenants View" description="Tenant overview for owners is under development." backPath="/owner/dashboard" backLabel="Back to Dashboard" />} />
                    <Route path="documents" element={<UnderDevelopment title="Owner Documents" description="Document management for owners is under development." backPath="/owner/dashboard" backLabel="Back to Dashboard" />} />
                    <Route path="tax-reports" element={<UnderDevelopment title="Tax Reports" description="Tax reporting and 1099 generation is under development." backPath="/owner/dashboard" backLabel="Back to Dashboard" />} />
                    <Route path="settings" element={<UnderDevelopment title="Owner Settings" description="Settings configuration is under development." backPath="/owner/dashboard" backLabel="Back to Dashboard" />} />
                  </Routes>
                </OwnerAuthProvider>
              }
            />

            {/* ============================================
                PROPERTY MANAGER PORTAL (Default)
                Conditionally renders - won't show for portal routes
                ============================================ */}
            <Route
              path="/*"
              element={<PMLayout sidebarCollapsed={sidebarCollapsed} />}
            />
          </Routes>
          <Toaster position="top-right" />
          </div>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
