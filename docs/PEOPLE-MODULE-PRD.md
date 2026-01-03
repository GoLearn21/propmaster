# People Module - Product Requirements Document (PRD)

## Overview
The People Module is the central hub for managing all stakeholders in the property management system, including Tenants, Owners, Vendors, and Prospects. This module provides comprehensive CRUD operations, advanced filtering, search capabilities, and relationship management.

## Business Objectives
1. Centralize all stakeholder information in one accessible location
2. Enable efficient communication and contact management
3. Track financial relationships and obligations
4. Support the complete lifecycle from prospect to tenant/owner/vendor
5. Provide data-driven insights through statistics and reports

## User Personas
1. **Property Manager**: Primary user managing all relationships
2. **Leasing Agent**: Focuses on prospects and tenant onboarding
3. **Accountant**: Reviews financial data and balances
4. **Owner**: Limited access to view tenant information

## Functional Requirements

### 1. Navigation & Layout (FR-NAV)
**FR-NAV-001**: Left sidebar navigation with 4 tabs
- Tenants
- Owners
- Vendors
- Prospects

**FR-NAV-002**: Persistent selection state across page refreshes
**FR-NAV-003**: Active tab highlighted with teal accent color (#20B2AA)

### 2. Tenants Module (FR-TEN)

#### 2.1 Data Display
**FR-TEN-001**: Statistics Cards (Top of page)
- Balance Due: Total outstanding rent/fees across all tenants
- Missing Contact Info: Count of tenants with incomplete contact details
- Dates Sign-Ups This Period: New tenant count for selected time range
- Tenant Records: Total active tenant count

**FR-TEN-002**: Data Table Columns
- Checkbox: Multi-select for bulk actions
- Profile Picture: Avatar with fallback to initials
- Name: Full name with status badge (Current, Past, Future, Evicted)
- Contact Info: Primary email and phone (display icon if missing)
- Balance: Outstanding amount (color-coded: red for overdue, green for paid)
- Actions: Quick action buttons (edit, message, view lease, etc.)

**FR-TEN-003**: Status Badge Colors
- Current: Green background (#E8F5F3)
- Past: Gray background (#E5E7EB)
- Future: Blue background (#DBEAFE)
- Evicted: Red background (#FEE2E2)

#### 2.2 Search & Filtering
**FR-TEN-004**: Global search bar
- Search by: Name, Email, Phone, Property Address, Unit Number
- Real-time filtering as user types
- Minimum 2 characters to trigger search

**FR-TEN-005**: Advanced Filters
- Status: Current, Past, Future, Evicted (multi-select)
- Property: Filter by property assignment
- Balance: Has balance, No balance, Overdue
- Lease Status: Active, Expiring soon, Expired
- Move-in Date: Date range picker

**FR-TEN-006**: Sort functionality
- Sort by: Name (A-Z), Balance (High-Low), Move-in Date, Lease End Date
- Toggle ascending/descending

#### 2.3 CRUD Operations
**FR-TEN-007**: Create Tenant
- Modal form with sections:
  - Personal Info: First Name, M.I., Last Name, DOB, SSN, Photo
  - Contact Info: Primary Email*, Mobile Phone*, Work Phone, Alt Email
  - Current Address: Street, City, State, ZIP
  - Emergency Contact: Name, Relationship, Phone
  - Employment: Employer, Job Title, Annual Income
  - References: Previous landlord info
- Required fields marked with asterisk
- Form validation with inline error messages
- Auto-save to draft every 30 seconds

**FR-TEN-008**: Edit Tenant
- Same form as create with pre-filled data
- Track modification history
- Show "Last updated" timestamp

**FR-TEN-009**: View Tenant Details
- Comprehensive profile page with tabs:
  - Overview: Personal info, contact details, status
  - Leases: Current and past lease history
  - Payments: Payment history, outstanding balances
  - Work Orders: Associated maintenance requests
  - Documents: Uploaded files (ID, lease, etc.)
  - Notes: Internal notes and communications log
  - Activity: Audit trail of all changes

**FR-TEN-010**: Delete/Archive Tenant
- Soft delete (archive) instead of hard delete
- Confirmation dialog with reason selection
- Archived tenants accessible via filter
- Cannot delete tenant with active lease or outstanding balance

#### 2.4 Bulk Operations
**FR-TEN-011**: Bulk actions
- Send message to selected tenants
- Export selected to CSV/Excel
- Change status (bulk status update)
- Assign to property/unit
- Add to group/tag

### 3. Owners Module (FR-OWN)

**FR-OWN-001**: Similar structure to Tenants with owner-specific fields
- Statistics: Total Properties Owned, Monthly Distribution Amount, Pending Maintenance, Active Leases
- Additional fields: Tax ID, Ownership Percentage, Payment Preferences, Bank Account Info
- Payout History tab showing monthly distributions

**FR-OWN-002**: Property Assignment
- Link owner to one or multiple properties
- Show ownership percentage per property
- Auto-calculate distribution amounts based on percentages

**FR-OWN-003**: Financial Dashboard per Owner
- Revenue summary (rent collected)
- Expense summary (maintenance, management fees)
- Net income calculation
- Year-to-date reports

### 4. Vendors Module (FR-VEN)

**FR-VEN-001**: Vendor-specific statistics
- Total Vendors, Active Jobs, Pending Payments, Average Response Time

**FR-VEN-002**: Vendor Categories
- Maintenance (Plumbing, Electrical, HVAC, General)
- Landscaping
- Cleaning
- Legal
- Accounting
- Insurance
- Other

**FR-VEN-003**: Vendor-specific fields
- Business Name*, Contact Person*, License Number
- Insurance Info: Provider, Policy Number, Expiration Date
- Service Categories (multi-select)
- Hourly Rate, Availability, Service Area
- Rating and Reviews

**FR-VEN-004**: Work Order Integration
- Show all associated work orders
- Performance metrics: Completion rate, Average time, Customer satisfaction

### 5. Prospects Module (FR-PRO)

**FR-PRO-001**: Lead tracking statistics
- Total Prospects, Contacted This Week, Tours Scheduled, Applications Submitted

**FR-PRO-002**: Lead Source tracking
- Website, Referral, Zillow, Apartments.com, Social Media, Walk-in, Other

**FR-PRO-003**: Lead Status Pipeline
- New → Contacted → Tour Scheduled → Application Submitted → Approved → Lease Signed
- Drag-and-drop kanban board view option
- Days in each stage tracking

**FR-PRO-004**: Prospect-specific fields (as seen in screenshot)
- Personal Info: First Name*, M.I., Last Name*, DOB, SSN, Photo, Company, Job Title
- Contact Info: Primary Email*, Mobile Phone* (required for communications)
- Desired Move-in Date
- Preferred Property/Unit Type
- Budget Range
- Notes

**FR-PRO-005**: Conversion to Tenant
- One-click conversion preserving all entered data
- Prompt to create lease immediately
- Mark conversion date and source

**FR-PRO-006**: Communication Log
- Track all emails, calls, texts, tours
- Schedule follow-ups with reminders
- Automated email sequences

### 6. Cross-Module Features (FR-CROSS)

**FR-CROSS-001**: Export Functionality
- Export to CSV, Excel, PDF
- Select columns to export
- Apply current filters to export

**FR-CROSS-002**: Import Functionality
- Bulk import from CSV/Excel
- Field mapping interface
- Validation and error reporting
- Preview before commit

**FR-CROSS-003**: Photo Management
- Upload profile photos (max 5MB, jpg/png)
- Auto-resize to 200x200px
- Store in Supabase Storage
- Fallback to initials avatar

**FR-CROSS-004**: Communication Tools
- Send email directly from the interface
- SMS integration (requires Twilio)
- In-app messaging
- Communication history preserved

**FR-CROSS-005**: Tagging System
- Create custom tags
- Apply multiple tags per person
- Filter by tags
- Tag management interface

**FR-CROSS-006**: Accessibility
- WCAG AA compliant
- Keyboard navigation support
- Screen reader compatible
- High contrast mode

## Non-Functional Requirements

### Performance (NFR-PERF)
- **NFR-PERF-001**: Page load time < 2 seconds
- **NFR-PERF-002**: Search results appear < 500ms
- **NFR-PERF-003**: Support 10,000+ records without performance degradation
- **NFR-PERF-004**: Infinite scroll or pagination for large datasets

### Security (NFR-SEC)
- **NFR-SEC-001**: Row Level Security (RLS) enforced on all tables
- **NFR-SEC-002**: SSN and sensitive data encrypted at rest
- **NFR-SEC-003**: Audit log for all data modifications
- **NFR-SEC-004**: Role-based access control (RBAC)

### Data Integrity (NFR-DATA)
- **NFR-DATA-001**: Foreign key constraints enforced
- **NFR-DATA-002**: Cascade deletes handled properly
- **NFR-DATA-003**: Data validation on both frontend and backend
- **NFR-DATA-004**: Duplicate detection (same email/phone)

### Scalability (NFR-SCALE)
- **NFR-SCALE-001**: Horizontal scaling via Supabase
- **NFR-SCALE-002**: Efficient database indexes
- **NFR-SCALE-003**: Query optimization for large datasets
- **NFR-SCALE-004**: Caching strategy for frequently accessed data

## Technical Architecture

### Database Schema
```
people (base table)
├── id (uuid, primary key)
├── type (enum: tenant, owner, vendor, prospect)
├── first_name (text, required)
├── middle_initial (text, optional)
├── last_name (text, required)
├── email (text, unique, required)
├── phone (text)
├── photo_url (text)
├── date_of_birth (date)
├── ssn_encrypted (text, encrypted)
├── company (text)
├── job_title (text)
├── notes (text)
├── status (enum: varies by type)
├── created_at (timestamp)
├── updated_at (timestamp)
├── created_by (uuid, foreign key to users)

tenants (extends people)
├── person_id (uuid, foreign key)
├── lease_id (uuid, foreign key to leases)
├── move_in_date (date)
├── move_out_date (date)
├── balance_due (decimal)
├── emergency_contact_name (text)
├── emergency_contact_phone (text)
├── employer (text)
├── annual_income (decimal)

owners (extends people)
├── person_id (uuid, foreign key)
├── tax_id (text)
├── payment_method (text)
├── bank_account_info_encrypted (text)
├── distribution_day (integer)

vendors (extends people)
├── person_id (uuid, foreign key)
├── business_name (text, required)
├── license_number (text)
├── insurance_provider (text)
├── insurance_policy (text)
├── insurance_expiry (date)
├── service_categories (text[])
├── hourly_rate (decimal)
├── rating (decimal)

prospects (extends people)
├── person_id (uuid, foreign key)
├── lead_source (text)
├── lead_status (enum)
├── desired_move_in_date (date)
├── budget_min (decimal)
├── budget_max (decimal)
├── converted_to_tenant_id (uuid, nullable)
├── conversion_date (date, nullable)

property_assignments
├── id (uuid, primary key)
├── person_id (uuid, foreign key)
├── property_id (uuid, foreign key)
├── unit_id (uuid, foreign key, nullable)
├── ownership_percentage (decimal, for owners)
├── assigned_at (timestamp)
```

### API Endpoints (Edge Functions)

**Tenants**
- `POST /people-management/tenants` - Create tenant
- `GET /people-management/tenants` - List tenants (with filters)
- `GET /people-management/tenants/:id` - Get tenant details
- `PATCH /people-management/tenants/:id` - Update tenant
- `DELETE /people-management/tenants/:id` - Archive tenant
- `POST /people-management/tenants/bulk-action` - Bulk operations

**Owners** (same pattern)
- `POST /people-management/owners`
- `GET /people-management/owners`
- `GET /people-management/owners/:id`
- `PATCH /people-management/owners/:id`
- `DELETE /people-management/owners/:id`

**Vendors** (same pattern)
**Prospects** (same pattern)

**Cross-functional**
- `GET /people-management/statistics` - Get statistics for all types
- `POST /people-management/export` - Export data
- `POST /people-management/import` - Import data
- `POST /people-management/upload-photo` - Upload profile photo

### Frontend Components Structure
```
src/pages/
  PeoplePage.tsx                 (Main container with tab navigation)

src/features/people/
  components/
    PeopleTabs.tsx               (Tab navigation component)
    StatisticsCards.tsx          (Reusable stats display)
    PeopleTable.tsx              (Generic table for all types)
    PeopleTableRow.tsx           (Row component)
    SearchBar.tsx                (Search input)
    FilterPanel.tsx              (Advanced filters)
    
  tenants/
    TenantsList.tsx              (Tenants view)
    TenantDetailsPanel.tsx       (Side panel)
    CreateTenantModal.tsx        (Create/Edit form)
    TenantStatsCards.tsx         (Tenant-specific stats)
    
  owners/
    OwnersList.tsx
    OwnerDetailsPanel.tsx
    CreateOwnerModal.tsx
    OwnerStatsCards.tsx
    
  vendors/
    VendorsList.tsx
    VendorDetailsPanel.tsx
    CreateVendorModal.tsx
    VendorStatsCards.tsx
    
  prospects/
    ProspectsList.tsx
    ProspectDetailsPanel.tsx
    CreateProspectModal.tsx
    ProspectStatsCards.tsx
    ProspectKanbanBoard.tsx      (Pipeline view)
    
  services/
    peopleService.ts             (API calls)
    tenantsService.ts
    ownersService.ts
    vendorsService.ts
    prospectsService.ts
    
  types/
    people.types.ts              (TypeScript interfaces)
```

## Success Metrics
1. **Adoption Rate**: 90% of property managers use the module daily
2. **Data Completeness**: 95% of records have complete contact information
3. **Time Savings**: 50% reduction in time spent on contact management
4. **User Satisfaction**: NPS score > 8.0
5. **Error Rate**: < 1% of transactions result in errors

## Future Enhancements (Out of Scope for v1)
1. Advanced analytics and predictive insights
2. AI-powered duplicate detection
3. Integration with background check services
4. Automated lease renewal workflows
5. Mobile app for tenant self-service
6. Multi-language support
7. Custom field builder for additional data
8. Integration with accounting software (QuickBooks, Xero)

## Acceptance Criteria Summary
- All 4 entity types (Tenants, Owners, Vendors, Prospects) fully functional
- Create, Read, Update, Delete operations working for all types
- Search and filtering operational with < 500ms response time
- Statistics cards display accurate real-time data
- All forms validate properly with clear error messages
- Data persists to Supabase with RLS policies enforced
- Export functionality works for CSV and Excel
- UI matches DoorLoop design system (teal color scheme, proper spacing)
- Responsive design works on desktop (1920px) and laptop (1366px)
- All interactions provide user feedback (loading states, success/error toasts)

## Dependencies
- Supabase (Database, Auth, Storage)
- React Query for data fetching
- React Hook Form for form management
- Zod for validation
- Tailwind CSS for styling
- Lucide React for icons
- Recharts for any data visualizations

## Timeline Estimate
- Database Schema: 2 hours
- Backend Edge Functions: 4 hours
- Frontend Components (all 4 types): 8 hours
- Testing & Bug Fixes: 2 hours
- **Total: 16 hours**

## Risks & Mitigations
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data migration from existing system | High | Medium | Provide robust import tools with validation |
| Performance with large datasets | High | Medium | Implement pagination, indexes, and caching |
| Complex RLS policies | Medium | High | Thorough testing with different user roles |
| SSN encryption complexity | High | Low | Use Supabase Vault or application-level encryption |

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-04  
**Author**: MiniMax Agent  
**Status**: Approved for Implementation
