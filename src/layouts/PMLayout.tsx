/**
 * Property Manager Layout
 * Only renders PM layout (Navigation, Sidebar) for non-portal routes
 */

import React from 'react';
import { useLocation, Routes, Route } from 'react-router-dom';
import { Navigation } from '../components/layout/Navigation';
import { Sidebar } from '../components/layout/Sidebar';
import { FloatingAIButton } from '../components/FloatingAIButton';

// Property Manager Pages
import DashboardPage from '../pages/DashboardPage';
import ComponentShowcase from '../pages/ComponentShowcase';
import WorkOrdersPage from '../pages/WorkOrdersPage';
import TasksPage from '../pages/TasksPage';
import TenantsPage from '../pages/TenantsPage';
import PeoplePage from '../pages/PeoplePage';
import { PaymentsPage } from '../pages/PaymentsPage';
import AIAssistantPage from '../pages/AIAssistantPage';
import ReportsPage from '../pages/ReportsPage';
import RentalsPage from '../pages/RentalsPage';
import CommunicationsPage from '../pages/CommunicationsPage';
import NotesPage from '../pages/NotesPage';
import FilesAgreementsPage from '../pages/FilesAgreementsPage';
import CalendarPageNew from '../pages/CalendarPageNew';
import GetStartedPage from '../pages/GetStartedPage';
import SettingsPage from '../pages/SettingsPage';
import LeadsPage from '../pages/LeadsPage';
import BackgroundChecksPage from '../pages/BackgroundChecksPage';
import DocumentSigningPage from '../pages/DocumentSigningPage';
import MarketIntelligencePage from '../pages/MarketIntelligencePage';
import PredictiveMaintenancePage from '../pages/PredictiveMaintenancePage';
import { WorkflowsPage } from '../components/features/workflows';
import LeasingPage from '../pages/LeasingPage';
import LeaseDetailPage from '../pages/LeaseDetailPage';

// Property Module Pages
import {
  PropertyOverviewPage,
  PropertySettingsPage,
  LeaseManagementPage,
  LeaseCreationPage,
  TransactionManagementPage,
  TransactionCreationPage,
  PropertiesListPage
} from '../modules/properties';
import PropertyWizardPage from '../modules/properties/pages/PropertyWizardPage';

interface PMLayoutProps {
  sidebarCollapsed: boolean;
}

export function PMLayout({ sidebarCollapsed }: PMLayoutProps) {
  const location = useLocation();

  // Don't render PM layout for portal routes
  const isPortalRoute =
    location.pathname.startsWith('/tenant') ||
    location.pathname.startsWith('/vendor') ||
    location.pathname.startsWith('/owner');

  // Return null for portal routes - they have their own layout
  if (isPortalRoute) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-surface-primary dark:bg-dark-surface-primary">
      <Navigation />
      <div className="flex flex-1 overflow-hidden pt-16">
        <Sidebar collapsed={sidebarCollapsed} />
        <main className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
          <Routes>
            {/* Overview/Dashboard */}
            <Route path="/" element={<DashboardPage />} />

            {/* Property Management */}
            <Route path="/properties" element={<PropertiesListPage />} />
            <Route path="/properties/new" element={<PropertyWizardPage />} />
            <Route path="/properties/:propertyId" element={<PropertyOverviewPage />} />
            <Route path="/properties/:propertyId/settings" element={<PropertySettingsPage />} />

            {/* Lease Management */}
            <Route path="/leasing" element={<LeasingPage />} />
            <Route path="/leasing/create" element={<LeaseCreationPage />} />
            <Route path="/leasing/:propertyId" element={<LeasingPage />} />
            <Route path="/leases/:leaseId" element={<LeaseDetailPage />} />

            {/* Transaction Management */}
            <Route path="/transactions" element={<TransactionManagementPage />} />
            <Route path="/transactions/create" element={<TransactionCreationPage />} />

            {/* MasterKey Navigation Items */}
            <Route path="/calendar" element={<CalendarPageNew />} />
            <Route path="/rentals" element={<RentalsPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/tasks-maintenance" element={<TasksPage />} />
            <Route path="/accounting" element={<PaymentsPage />} />
            <Route path="/communications" element={<CommunicationsPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/files-agreements" element={<FilesAgreementsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/get-started" element={<GetStartedPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Advanced Features */}
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/background-checks" element={<BackgroundChecksPage />} />
            <Route path="/document-signing" element={<DocumentSigningPage />} />
            <Route path="/market-intelligence" element={<MarketIntelligencePage />} />
            <Route path="/predictive-maintenance" element={<PredictiveMaintenancePage />} />

            {/* Legacy Routes */}
            <Route path="/showcase" element={<ComponentShowcase />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/work-orders" element={<WorkOrdersPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
          </Routes>
        </main>
      </div>
      <FloatingAIButton />
    </div>
  );
}

export default PMLayout;
