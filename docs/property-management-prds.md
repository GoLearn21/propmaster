# Property Management System - Product Requirements Documents

## Table of Contents
1. [Properties List View](#properties-list-view)
2. [Property Overview Dashboard](#property-overview-dashboard)
3. [Property Settings Dashboard](#property-settings-dashboard)
4. [Create New Modal](#create-new-modal)
5. [New Property Wizard](#new-property-wizard)

---

## Properties List View

### Overview
The Properties List View is the main entry point for property management, providing a comprehensive list of all properties with advanced filtering, sorting, and search capabilities.

### User Stories
- As a property manager, I want to see all my properties in a list view so I can quickly scan and identify properties
- As a property manager, I want to search for specific properties by address or name
- As a property manager, I want to filter properties by type, status, or number of active units
- As a property manager, I want to sort properties by different criteria (address, type, units)
- As a property manager, I want to quickly add a new property

### Functional Requirements

#### Data Display
- Display properties in a clean table/list format with the following columns:
  - Property Image (thumbnail)
  - Property Address (street, city, state, zip)
  - Property Type (with icon)
  - Active Units (count with icon)
- Show property status indicator (Active, Inactive, Under Maintenance)
- Display property photo thumbnail for visual identification

#### Search & Filtering
- Global search bar that filters properties by:
  - Property address
  - Property name
  - City, state, zip code
- Advanced filter dropdown with options:
  - Property Type (Multi-Family, Single-Family, Condo, Townhome, Office, Retail, etc.)
  - Status (Active, Inactive, Under Maintenance)
  - Active Units (0, 1-5, 6-20, 21+)
- Clear filters button to reset all filters
- Search results count display

#### Sorting
- Sortable columns with ascending/descending indicators:
  - Property (alphabetically by address)
  - Type (alphabetically by property type)
  - Active Units (numerically)

#### Actions
- "New Property" button (primary CTA) - opens New Property Wizard
- Click on property row to navigate to Property Overview Dashboard
- Three-dot menu on each row with actions:
  - Edit Property
  - Delete Property
  - Archive Property
  - Duplicate Property
  - View Units
- Bulk actions for selected properties (if multi-select implemented)

#### Responsive Design
- Mobile-responsive layout with cards instead of table on small screens
- Touch-friendly interface elements
- Collapsible sidebar on mobile

### Technical Requirements

#### Performance
- Lazy loading for property images
- Pagination or infinite scroll for large property lists
- Optimistic UI updates for filter/sort operations
- Cached property data with smart refetching

#### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus indicators on interactive elements

#### Data Management
- Real-time updates when properties are created/updated/deleted
- Offline capability for viewing cached properties
- Proper error handling for network failures

---

## Property Overview Dashboard

### Overview
The Property Overview Dashboard provides a comprehensive view of a specific property with key metrics, quick actions, and navigation to detailed sections.

### User Stories
- As a property manager, I want to see key property information at a glance
- As a property manager, I want quick access to common property tasks
- As a property manager, I want to navigate to different aspects of the property
- As a property manager, I want to see property photos and description

### Functional Requirements

#### Page Header
- Back button to return to Properties List
- Property address as main title
- Property status indicator (Active, Inactive, Under Maintenance)
- Three-dot menu with actions:
  - Edit Property
  - Delete Property
  - Archive Property
  - Export Property Data
  - Print Property Summary

#### Tab Navigation
- Overview (default active)
- Reports
- Units
- Leases
- Tenants
- Rental Applications
- Signature Requests
- Tasks
- Notes
- Files
- Settings

#### Quick Actions Section
- "View rental applications" button
- "New lease" button
- "New unit" button
- "View settings" button
- Context-aware quick actions based on property type

#### Property Summary Cards
- Property Type card with icon
- Active Units card with count and trend indicator
- Status card with color-coded status
- Occupancy Rate card (if applicable)
- Monthly Revenue card (if applicable)

#### Description Section
- Editable property description
- Rich text formatting support
- Character count indicator
- Last updated timestamp

#### Photos Section
- Property photo gallery
- Upload new photos functionality
- Photo captions and descriptions
- Drag-and-drop reorder capability
- Photo compression and optimization

#### Activity Feed (Optional)
- Recent activities related to the property
- Real-time updates
- Filterable by activity type

### Technical Requirements

#### State Management
- Property data caching
- Tab state persistence
- Optimistic UI updates
- Background data synchronization

#### Performance
- Lazy loading for photos
- Efficient re-rendering
- Image optimization and CDN integration
- Progressive loading of tab content

#### Integration
- Real-time updates via WebSocket
- Push notifications for property changes
- Export functionality (PDF, Excel)
- Print-friendly layout

---

## Property Settings Dashboard

### Overview
The Property Settings Dashboard provides centralized configuration for all aspects of a property, organized in an intuitive card-based interface.

### User Stories
- As a property manager, I want to configure all property settings in one place
- As a property manager, I want to easily find and modify specific configuration options
- As a property manager, I want to see descriptions of what each setting controls
- As a property manager, I want to organize settings logically

### Functional Requirements

#### Settings Navigation
- Settings tab within property overview
- Grid layout of setting cards (3 columns on desktop, 1 on mobile)
- Search/filter settings functionality
- Recently modified settings section

#### Setting Categories & Cards

##### Core Property Settings
1. **General Information**
   - Property name and address
   - Property type and description
   - Year built and lot size
   - Contact information

2. **Photos & Media**
   - Property photo gallery management
   - Floor plans upload
   - Virtual tour links
   - Video content

3. **Property Type**
   - Property classification
   - Subtype selection
   - Zoning information
   - Usage restrictions

4. **Amenities & Features**
   - List of property amenities
   - Facility management
   - Utility information
   - Parking details

5. **Pet Policy**
   - Pet allowance settings
   - Breed restrictions
   - Pet fees and deposits
   - Weight limits

##### Ownership & Finance Settings
6. **Owners**
   - Owner information and contacts
   - Ownership percentages
   - Management agreement details
   - Owner portal access

7. **Bank Accounts**
   - Property bank account setup
   - Account management
   - Deposit account configuration
   - Payment processing setup

8. **Reserve Funds**
   - Reserve fund requirements
   - Maintenance reserve setup
   - Capital expenditure reserves
   - Fund transfer rules

##### Tenant & Portal Settings
9. **Tenant Portal**
   - Portal access settings
   - Feature enablement
   - User interface customization
   - Mobile app settings

10. **Rent & Payment Notifications**
    - Payment reminder settings
    - Late fee notifications
    - Receipt confirmation
    - Payment method options

11. **Payment Instructions**
    - Payment method details
    - Payment address information
    - Online payment setup
    - Check payment instructions

12. **Tenant Requests**
    - Maintenance request workflow
    - Request routing rules
    - SLA settings
    - Notification preferences

##### Application & Leasing Settings
13. **Rental Applications**
    - Application form customization
    - Required documentation
    - Screening criteria
    - Fee structure

14. **Payment Allocation**
    - Payment distribution rules
    - Priority allocation setup
    - Partial payment handling
    - Overpayment distribution

15. **Fees Settings**
    - Fee type configuration
    - Amount and percentage settings
    - Fee calculation rules
    - Fee application timing

16. **Custom Allocations**
    - Custom charge types
    - Credit allocation rules
    - Proration settings
    - Adjustment templates

#### Card Behavior
- Click to open detailed configuration interface
- Visual indicators for modified settings
- Status badges for active/inactive settings
- Quick action shortcuts on each card
- Drag-and-drop reordering (if enabled)

#### Configuration Interface
- Form-based configuration with validation
- Real-time preview of changes
- Bulk update capabilities
- Configuration templates
- Rollback functionality

### Technical Requirements

#### Configuration Management
- Version control for setting changes
- Configuration validation
- Dependency checking between settings
- Backup and restore functionality
- Configuration audit trail

#### Performance
- Lazy loading of setting categories
- Optimistic updates
- Efficient form rendering
- Smart caching of setting values

#### Security
- Role-based access to sensitive settings
- Audit logging for configuration changes
- Data validation and sanitization
- Secure storage of sensitive information

---

## Create New Modal

### Overview
The Create New Modal serves as a centralized hub for initiating the creation of various entities across the property management system, organized in a logical, categorized interface.

### User Stories
- As a property manager, I want to quickly create new entities from any screen
- As a property manager, I want to easily find the creation option I need
- As a property manager, I want to see all available creation options in one place
- As a property manager, I want clear visual organization of different entity types

### Functional Requirements

#### Modal Structure
- Overlay modal with dimmed background
- "CREATE NEW" header with accent line
- Close button (X) in top right
- Keyboard escape support
- Click outside to close

#### Content Organization
Categorized menu with the following structure:

##### People Category
- **Prospect** - Icon: Person silhouette
- **Owner** - Icon: Two person silhouettes
- **Vendor** - Icon: Three person silhouettes
- **User** - Icon: Person with gear

##### Tasks & Maintenance Category
- **Task** - Icon: Clipboard
- **Work Order** - Icon: Toolbox
- **Owner Request** - Icon: Document with person
- **Tenant Request** - Icon: Document with person

##### Rentals Category
- **Property** - Icon: Building complex (highlighted/featured)
- **Unit** - Icon: House with sections

##### Leasing Category
- **Lease** - Icon: Document with lines
- **Rental Applications** - Icon: Document with magnifying glass

##### Tenant Transactions Category
- **Post Charge** - Icon: Box with dollar sign
- **Receive Payment** - Icon: Hand with dollar sign
- **Issue Credit** - Icon: Document with checkmark and dollar sign
- **Give Refund** - Icon: Dollar sign with circular arrows
- **Withhold Deposit** - Icon: Padlock with dollar sign

##### Vendor Transactions Category
- **Create Bill** - Icon: Dollar sign in square
- **Pay Bills** - Icon: Hand with dollar sign
- **Add Credit** - Icon: Document with checkmark and dollar sign
- **Management Fees** - Icon: Dollar sign with wavy lines

##### Owner Transactions Category
- **Owner Contribution** - Icon: Dollar sign in square
- **Owner Distribution** - Icon: Circular arrow with dollar sign

##### Other Transactions Category
- **Journal Entry** - Icon: Document with lines
- **Bank Transfer** - Icon: Horizontal arrows
- **Bank Deposit** - Icon: Box with target
- **Expense** - Icon: Dollar sign in square
- **Check** - Icon: Check document

##### Communications Category
- **Announcements** - Icon: Megaphone
- **Signature Request** - Icon: Document with pen

#### Visual Design
- Grid layout with multiple columns (4-5 columns depending on screen size)
- Consistent iconography for all items
- Category headers in bold text
- Hover effects and visual feedback
- Keyboard navigation support
- Visual hierarchy with proper spacing

#### Interactions
- Click any item to navigate to creation form/wizard
- Keyboard navigation (arrow keys, Enter, Escape)
- Mouse hover effects
- Touch-friendly on mobile devices
- Search functionality within modal (optional enhancement)

#### Global Integration
- Accessible from any screen via global "Create New" button
- Context-aware recommendations (highlight commonly used items)
- Recent items section (if previously implemented)
- Keyboard shortcut support (Ctrl/Cmd + N)

### Technical Requirements

#### Performance
- Modal preloading for instant display
- Lazy loading of category content
- Smooth animations and transitions
- Efficient event handling

#### Accessibility
- ARIA labels for screen readers
- Keyboard navigation
- Focus management
- High contrast mode support
- Screen reader announcements

#### Integration
- Consistent with existing design system
- Responsive across all device sizes
- Integration with routing system
- Analytics tracking for usage patterns

---

## New Property Wizard

### Overview
The New Property Wizard is a multi-step guided process for adding new properties to the system, ensuring all required information is collected in a logical, user-friendly flow.

### User Stories
- As a property manager, I want to add a new property through a guided step-by-step process
- As a property manager, I want to see my progress through the wizard
- As a property manager, I want to be able to go back and modify previous steps
- As a property manager, I want clear instructions for each step
- As a property manager, I want validation of my inputs before proceeding

### Functional Requirements

#### Wizard Structure
- 5-step wizard with progress indicator:
  1. **Type** - Property type selection
  2. **Address** - Property address and location details
  3. **Unit Details** - Unit information and configuration
  4. **Bank Accounts** - Financial account setup
  5. **Ownership** - Owner information and agreements

#### Step 1: Type Selection
**UI Elements:**
- Progress indicator showing current step
- Main instruction: "Set up your property"
- Sub-instruction: "Choose the type of property you are managing"

**Primary Selection:**
- Two main options: "Residential" and "Commercial"
- Large selection cards with house/building icons
- Visual feedback on selection (border, background, checkmark)

**Secondary Selection (depends on primary):**
- **Residential Options:**
  - Single-Family (Standalone residential structure, Intended for one family)
  - Multi-Family (Multiple residential units, Shared building structure)
  - Condo (Individual ownership, Shared community amenities)
  - Townhome (Attached residential units, Individual lots)
  - Other (Custom property type with text input)

- **Commercial Options:**
  - Office (Commercial office space, Business use)
  - Retail (Retail storefront, Customer-facing business)
  - Shopping Center (Multiple retail spaces, Shared commercial complex)
  - Industrial (Manufacturing/warehouse, Industrial use)
  - Storage (Self-storage facility, Storage units)
  - Parking (Parking structure/lots, Vehicle parking)
  - Other (Custom property type with text input)

**Validation:**
- Selection required before proceeding
- "Other" selection shows additional text input field
- Save selection to wizard state

#### Step 2: Address
**UI Elements:**
- Address form with validation
- Map integration (optional)
- Address autocomplete suggestions

**Fields:**
- Street Address (required)
- Unit/Apt/Suite (optional)
- City (required)
- State/Province (required)
- ZIP/Postal Code (required)
- Country (required, default to US)
- Latitude/Longitude (auto-populated, editable)
- Timezone (auto-detected, editable)

**Validation:**
- All required fields validation
- ZIP code format validation
- Address format validation
- Duplicate address checking

#### Step 3: Unit Details
**UI Elements:**
- Dynamic form based on property type
- Add/remove unit functionality
- Unit template suggestions

**Fields (vary by property type):**
- **For Residential Properties:**
  - Total number of units
  - Unit types and counts
  - Unit sizes (square footage)
  - Bedrooms/bathrooms per unit type
  - Rent ranges per unit type
  - Amenities list
  - Parking details

- **For Commercial Properties:**
  - Total square footage
  - Number of floors
  - Suite/unit availability
  - Lease types
  - CAM charges
  - Parking ratios
  - Zoning information

**Validation:**
- Numerical field validation
- Required field validation
- Logical consistency checking (e.g., total units = sum of unit types)

#### Step 4: Bank Accounts
**UI Elements:**
- Bank account list with add/remove functionality
- Account type selection
- Integration with payment processors

**Fields:**
- Account nickname (required)
- Bank name (required)
- Account type (Checking, Savings)
- Account number (masked, last 4 digits)
- Routing number (required)
- Primary account indicator
- Auto-transfer rules
- Deposit instructions

**Validation:**
- Account number format validation
- Routing number validation (ABA number check)
- Duplicate account checking
- Secure data handling

#### Step 5: Ownership
**UI Elements:**
- Owner information form
- Ownership percentage allocation
- Document upload capability
- Management agreement setup

**Fields:**
- Owner information:
  - Owner type (Individual, Company, LLC, etc.)
  - Legal name
  - Contact information
  - Tax ID (if business)
  - Address information
  - Ownership percentage
  - Management agreement details
  - Owner portal access settings

**Validation:**
- Ownership percentages sum to 100%
- Required field validation
- Contact information format validation

#### Navigation & Controls
- **Back button** - Navigate to previous step (enabled from step 2)
- **Next button** - Proceed to next step (enabled when validation passes)
- **Cancel button** - Abort wizard with confirmation
- **Step indicators** - Clickable to navigate to completed steps
- **Save draft** - Save progress and return later
- **Progress bar** - Visual indicator of completion percentage

#### Data Persistence
- Auto-save progress between steps
- Session storage for draft preservation
- Resume wizard capability
- Data validation at each step
- Error handling and recovery

### Technical Requirements

#### Form Management
- React Hook Form or similar for form handling
- Field-level validation
- Dynamic form generation
- Conditional field rendering
- Error message display

#### State Management
- Wizard state persistence
- Step validation state
- Form data management
- Navigation state
- Error state management

#### Performance
- Lazy loading of step components
- Optimistic UI updates
- Efficient re-rendering
- Progressive data loading
- Optimized bundle size

#### Integration
- API integration for property creation
- Map/geocoding service integration
- Bank account verification service
- Document upload handling
- Analytics tracking

#### Security
- Input sanitization
- Data encryption for sensitive fields
- Secure file uploads
- API authentication
- Audit logging

#### Accessibility
- Keyboard navigation throughout wizard
- Screen reader compatibility
- Focus management
- Error announcement
- High contrast support

---

## Cross-Cutting Requirements

### Design System
- Consistent with existing PropMaster design
- Responsive design for all screen sizes
- Dark mode support (if applicable)
- High contrast accessibility
- Touch-friendly mobile interface

### Data Management
- Real-time synchronization
- Offline capability for critical functions
- Data caching and invalidation
- Optimistic UI updates
- Error handling and recovery

### Integration
- Seamless integration with existing People system
- API-first architecture
- Webhook support for external integrations
- Export/import capabilities
- Third-party service integration

### Performance
- Code splitting for optimal loading
- Image optimization and CDN usage
- Efficient state management
- Lazy loading of non-critical components
- Progressive loading strategies

### Security
- Role-based access control
- Data encryption at rest and in transit
- Input validation and sanitization
- Audit logging for sensitive operations
- Secure file upload handling

### Analytics
- User interaction tracking
- Performance monitoring
- Error reporting and tracking
- Usage analytics for feature optimization
- A/B testing capability for UI improvements