# Phase 3: Tenant Portal - Implementation Plan

## Overview

The Tenant Portal provides tenants with self-service access to manage rent payments, submit maintenance requests, view lease documents, and communicate with property managers.

## Architecture

### User Flow
```
Tenant Login → Dashboard → Features:
├── Pay Rent (Autopay from Phase 2)
├── Maintenance Requests (Work Orders from Phase 2)
├── Lease Documents & Renewals (Lease Renewal from Phase 2)
├── Payment History
├── Notifications
└── Profile Management
```

### Technical Stack
- **Frontend**: React 18.3.1 + TypeScript
- **Routing**: React Router v6
- **State Management**: React Query + Context API
- **UI Components**: Existing UI component library
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (Supabase)

## Features Implementation

### 1. Tenant Authentication
**Route**: `/tenant/login`, `/tenant/dashboard`

**Components**:
- `TenantLoginPage.tsx` - Login interface
- `TenantAuthProvider.tsx` - Auth context provider
- `ProtectedTenantRoute.tsx` - Route guard

**Database Changes**:
```sql
ALTER TABLE tenants ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE tenants ADD COLUMN portal_access BOOLEAN DEFAULT false;
```

### 2. Tenant Dashboard
**Route**: `/tenant/dashboard`

**Features**:
- Current balance display
- Upcoming rent due date with countdown
- Recent maintenance requests status
- Active lease information
- Notifications center
- Quick action buttons

**Components**:
- `TenantDashboard.tsx` - Main dashboard
- `RentSummaryCard.tsx` - Balance and due date
- `MaintenanceStatusCard.tsx` - Recent requests
- `LeaseInfoCard.tsx` - Current lease details
- `NotificationsWidget.tsx` - Recent notifications

### 3. Online Rent Payment
**Route**: `/tenant/payments`

**Features**:
- Pay rent now (one-time payment)
- Enable/disable autopay (integrates with Phase 2 autopayService)
- Payment method management (credit card, ACH, bank account)
- Payment history with receipts
- Scheduled payments view

**Components**:
- `TenantPaymentPage.tsx` - Payment interface
- `AutopayManagement.tsx` - Enable/disable autopay
- `PaymentMethodSelector.tsx` - Payment method picker
- `PaymentHistoryTable.tsx` - Historical payments
- `PaymentReceipt.tsx` - PDF receipt generation

**Integration with Phase 2**:
```typescript
import { enableAutopay, disableAutopay, getAutopayStatus } from '@/services/autopayService';
```

### 4. Maintenance Requests
**Route**: `/tenant/maintenance`

**Features**:
- Submit new maintenance request with photos
- Track request status (pending → assigned → in_progress → completed)
- View vendor information (when assigned)
- Add comments and updates
- Rate completed work

**Components**:
- `MaintenanceRequestPage.tsx` - Requests dashboard
- `CreateMaintenanceRequest.tsx` - New request form
- `MaintenanceRequestCard.tsx` - Request status card
- `MaintenanceRequestDetails.tsx` - Detailed view with timeline
- `PhotoUploader.tsx` - Image upload for issues

**Integration with Phase 2**:
```typescript
// Creates work_order record
// Triggers workOrderRoutingService for auto-vendor assignment
```

### 5. Lease Documents & Renewals
**Route**: `/tenant/lease`

**Features**:
- View current lease document (PDF viewer)
- Download lease agreement
- View lease renewal offers (from Phase 2 leaseRenewalService)
- Accept/decline/counter renewal offers
- View lease amendments history

**Components**:
- `TenantLeasePage.tsx` - Lease management
- `LeaseDocumentViewer.tsx` - PDF viewer
- `RenewalOfferCard.tsx` - Renewal offer display
- `RenewalResponseForm.tsx` - Accept/counter form
- `LeaseAmendmentsList.tsx` - Historical amendments

**Integration with Phase 2**:
```typescript
import { processRenewalResponse, getRenewalStatus } from '@/services/leaseRenewalService';
```

### 6. Payment History & Receipts
**Route**: `/tenant/payments/history`

**Features**:
- Comprehensive payment history table
- Filter by date range, status, payment method
- Download receipts as PDF
- Export to CSV
- Year-end tax statement

**Components**:
- `PaymentHistoryPage.tsx` - History dashboard
- `PaymentHistoryTable.tsx` - Filterable table
- `ReceiptDownloader.tsx` - PDF generation
- `YearEndStatement.tsx` - Tax statement

### 7. Notifications Center
**Route**: `/tenant/notifications`

**Features**:
- View all notifications (payment reminders, maintenance updates, lease renewals)
- Mark as read/unread
- Delete notifications
- Email/SMS preference settings

**Components**:
- `NotificationsPage.tsx` - Notifications list
- `NotificationCard.tsx` - Individual notification
- `NotificationSettings.tsx` - Preferences

**Integration with Phase 2**:
```typescript
// Reads from notifications table (Phase 2)
```

### 8. Profile Management
**Route**: `/tenant/profile`

**Features**:
- Update contact information (email, phone)
- Emergency contact management
- Password change
- Communication preferences
- Vehicle information (if applicable)

**Components**:
- `TenantProfilePage.tsx` - Profile editor
- `ContactInfoForm.tsx` - Contact details
- `EmergencyContactForm.tsx` - Emergency contacts
- `PasswordChangeForm.tsx` - Security settings

## Database Schema Extensions

### New Tables

#### tenant_portal_sessions
```sql
CREATE TABLE IF NOT EXISTS tenant_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_time TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_portal_sessions_tenant ON tenant_portal_sessions(tenant_id);
CREATE INDEX idx_portal_sessions_user ON tenant_portal_sessions(user_id);
```

#### tenant_emergency_contacts
```sql
CREATE TABLE IF NOT EXISTS tenant_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_emergency_contacts_tenant ON tenant_emergency_contacts(tenant_id);
```

#### tenant_vehicles
```sql
CREATE TABLE IF NOT EXISTS tenant_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  color VARCHAR(50),
  license_plate VARCHAR(20),
  state VARCHAR(2),
  parking_spot VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vehicles_tenant ON tenant_vehicles(tenant_id);
CREATE INDEX idx_vehicles_license ON tenant_vehicles(license_plate);
```

### Table Modifications

#### tenants table
```sql
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": false}';

CREATE INDEX idx_tenants_user_id ON tenants(user_id);
CREATE INDEX idx_tenants_portal_access ON tenants(portal_access);
```

## API Endpoints

### Authentication
- `POST /api/tenant/login` - Tenant login
- `POST /api/tenant/logout` - Tenant logout
- `GET /api/tenant/me` - Get current tenant info
- `POST /api/tenant/password-reset` - Request password reset

### Payments
- `GET /api/tenant/balance` - Get current balance
- `GET /api/tenant/payments` - Get payment history
- `POST /api/tenant/payments/pay` - Make one-time payment
- `POST /api/tenant/payments/autopay/enable` - Enable autopay
- `POST /api/tenant/payments/autopay/disable` - Disable autopay
- `GET /api/tenant/payments/autopay/status` - Get autopay status
- `GET /api/tenant/payments/:id/receipt` - Download receipt PDF

### Maintenance
- `GET /api/tenant/maintenance` - List maintenance requests
- `POST /api/tenant/maintenance` - Create new request
- `GET /api/tenant/maintenance/:id` - Get request details
- `POST /api/tenant/maintenance/:id/comment` - Add comment
- `POST /api/tenant/maintenance/:id/rate` - Rate completed work

### Lease
- `GET /api/tenant/lease` - Get current lease
- `GET /api/tenant/lease/document` - Download lease PDF
- `GET /api/tenant/lease/renewals` - Get renewal offers
- `POST /api/tenant/lease/renewals/:id/respond` - Respond to renewal offer

### Profile
- `GET /api/tenant/profile` - Get profile
- `PUT /api/tenant/profile` - Update profile
- `POST /api/tenant/emergency-contacts` - Add emergency contact
- `PUT /api/tenant/emergency-contacts/:id` - Update emergency contact
- `DELETE /api/tenant/emergency-contacts/:id` - Delete emergency contact
- `POST /api/tenant/vehicles` - Add vehicle
- `PUT /api/tenant/vehicles/:id` - Update vehicle
- `DELETE /api/tenant/vehicles/:id` - Delete vehicle

### Notifications
- `GET /api/tenant/notifications` - Get notifications
- `PUT /api/tenant/notifications/:id/read` - Mark as read
- `DELETE /api/tenant/notifications/:id` - Delete notification

## Services Implementation

### tenantAuthService.ts
```typescript
/**
 * Phase 3: Tenant Authentication Service
 * Handles tenant login, session management, and authorization
 */

export async function loginTenant(email: string, password: string): Promise<LoginResult>;
export async function logoutTenant(): Promise<void>;
export async function getCurrentTenant(): Promise<Tenant | null>;
export async function resetPassword(email: string): Promise<void>;
```

### tenantPaymentService.ts
```typescript
/**
 * Phase 3: Tenant Payment Service
 * Integrates with Phase 2 autopayService for tenant-facing payment operations
 */

export async function getTenantBalance(tenantId: string): Promise<Balance>;
export async function getPaymentHistory(tenantId: string): Promise<Payment[]>;
export async function makePayment(tenantId: string, amount: number, paymentMethodId: string): Promise<PaymentResult>;
export async function downloadReceipt(paymentId: string): Promise<Blob>;
```

### tenantMaintenanceService.ts
```typescript
/**
 * Phase 3: Tenant Maintenance Service
 * Creates work orders and tracks status for tenants
 */

export async function createMaintenanceRequest(request: MaintenanceRequestInput): Promise<WorkOrder>;
export async function getMaintenanceRequests(tenantId: string): Promise<WorkOrder[]>;
export async function addMaintenanceComment(workOrderId: string, comment: string): Promise<void>;
export async function rateMaintenanceWork(workOrderId: string, rating: number, feedback: string): Promise<void>;
```

### tenantLeaseService.ts
```typescript
/**
 * Phase 3: Tenant Lease Service
 * Integrates with Phase 2 leaseRenewalService for tenant lease operations
 */

export async function getCurrentLease(tenantId: string): Promise<Lease>;
export async function getLeaseDocument(leaseId: string): Promise<Blob>;
export async function getRenewalOffers(tenantId: string): Promise<RenewalOffer[]>;
export async function respondToRenewalOffer(offerId: string, response: RenewalResponse): Promise<void>;
```

## UI/UX Design Principles

### Mobile-First Responsive Design
- All components must work on mobile (320px+)
- Touch-friendly buttons (min 44px tap targets)
- Progressive enhancement for larger screens

### Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

### Performance
- Lazy loading for routes
- Image optimization
- Debounced search inputs
- Optimistic UI updates

### Branding
- Consistent with property manager portal
- Tenant-specific color scheme (lighter, friendlier)
- Clear visual hierarchy

## Security Considerations

### Authentication
- Email verification required before portal access
- Secure password requirements (min 12 chars, mixed case, numbers, symbols)
- MFA optional (SMS or authenticator app)
- Session timeout after 30 minutes of inactivity

### Authorization
- Row-level security (RLS) in Supabase
- Tenants can only access their own data
- Prevent unauthorized lease/payment access

### Data Privacy
- PII encryption at rest
- HTTPS only (TLS 1.3+)
- Audit log for all sensitive operations

### Payment Security
- PCI DSS compliance (Stripe handles card data)
- No storage of full card numbers
- Tokenized payment methods only

## Testing Strategy

### Unit Tests
- All services (100% coverage target)
- Component logic
- Utility functions

### Integration Tests
- API endpoint flows
- Database operations
- Authentication flows

### E2E Tests (Playwright)
- Complete user journeys:
  - Login → Dashboard → Pay Rent
  - Login → Dashboard → Submit Maintenance Request
  - Login → Dashboard → Respond to Renewal Offer

### Performance Tests
- Page load times < 2s
- API response times < 500ms
- Database query optimization

## Deployment Checklist

- [ ] Database schema executed in Supabase
- [ ] All 8 tenant portal pages implemented
- [ ] All 5 services implemented
- [ ] Authentication and authorization working
- [ ] Integration with Phase 2 automation services tested
- [ ] Mobile responsive design verified
- [ ] Accessibility audit passed
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] E2E tests passing (100%)
- [ ] User acceptance testing completed

## Success Metrics

### Adoption
- **Target**: 70% of tenants activate portal within 90 days
- **Measurement**: Track portal_access = true in tenants table

### Engagement
- **Target**: 50% of tenants use portal for rent payment
- **Measurement**: Payment method = 'portal' in payment_history table

### Support Reduction
- **Target**: 30% reduction in support calls/emails
- **Measurement**: Track support tickets before/after launch

### Maintenance Response
- **Target**: 2x faster maintenance request submission
- **Measurement**: Time from issue to work order creation

### Tenant Satisfaction
- **Target**: 4.5+ stars average rating
- **Measurement**: Post-interaction surveys

## Timeline

**Phase 3A: Foundation (Week 1)**
- Authentication system
- Tenant dashboard
- Database schema updates

**Phase 3B: Core Features (Week 2)**
- Online rent payment
- Maintenance requests
- Lease documents viewer

**Phase 3C: Enhanced Features (Week 3)**
- Payment history
- Notifications center
- Profile management

**Phase 3D: Testing & Polish (Week 4)**
- E2E testing
- Mobile optimization
- Security audit
- Performance optimization

**Total Estimated Time**: 4 weeks

---

*Phase 3 Tenant Portal Plan*
*Created: 2025-11-08*
*Ready for Implementation*
