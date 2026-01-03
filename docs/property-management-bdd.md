# Property Management System - Behavior-Driven Development (BDD) Specifications

## Table of Contents
1. [Properties List View](#properties-list-view)
2. [Property Overview Dashboard](#property-overview-dashboard)
3. [Property Settings Dashboard](#property-settings-dashboard)
4. [Create New Modal](#create-new-modal)
5. [New Property Wizard](#new-property-wizard)

---

## Properties List View

### Feature: Property List Display and Management

**Scenario: Display properties list with basic information**
```
Given I am logged into the property management system
When I navigate to the Properties section
Then I should see a list of all properties with:
  - Property image thumbnails
  - Property addresses (street, city, state, zip)
  - Property type with icons
  - Number of active units
  - Property status indicators
```

**Scenario: Search for properties by address**
```
Given I am viewing the properties list
When I type "Burda Street" in the search box
Then the list should filter to show only properties containing "Burda Street"
And the search results count should be displayed
And the search term should remain visible in the search field
```

**Scenario: Filter properties by type**
```
Given I am viewing the properties list
When I click the "Filter" button
And I select "Multi-Family" from the property type dropdown
Then the list should show only Multi-Family properties
And the filter indicator should show the active filter
And I should be able to clear the filter
```

**Scenario: Sort properties by active units**
```
Given I am viewing the properties list
When I click the "Active Units" column header
Then the properties should be sorted by active units count
And the sort indicator should show ascending order
When I click the "Active Units" header again
Then the sort should reverse to descending order
```

**Scenario: Create new property**
```
Given I am viewing the properties list
When I click the "New Property" button
Then I should be redirected to the New Property Wizard
And the wizard should start at Step 1 (Type Selection)
```

**Scenario: Navigate to property details**
```
Given I am viewing the properties list
When I click on a property row
Then I should be redirected to the Property Overview Dashboard
And the correct property should be loaded
And the Overview tab should be active
```

**Scenario: Property row actions menu**
```
Given I am viewing the properties list
When I hover over a property row and click the three-dot menu
Then a dropdown menu should appear with options:
  - Edit Property
  - Delete Property
  - Archive Property
  - Duplicate Property
  - View Units
```

**Scenario: Handle empty properties list**
```
Given there are no properties in the system
When I navigate to the Properties section
Then I should see a "No properties found" message
And the "New Property" button should be prominently displayed
And there should be guidance on how to add the first property
```

**Scenario: Handle search with no results**
```
Given I am viewing the properties list
When I search for "Nonexistent Property"
Then I should see a "No properties found" message
And the search term should remain in the search field
And there should be suggestions to try different search terms
```

**Scenario: Mobile responsive property list**
```
Given I am on a mobile device
When I navigate to the Properties section
Then the property list should display as cards instead of a table
And each card should show the same information as table rows
And the cards should be touch-friendly with appropriate sizing
```

---

## Property Overview Dashboard

### Feature: Property Detail View and Navigation

**Scenario: Display property overview**
```
Given I am viewing a specific property's overview
Then I should see:
  - Property address as the page title
  - Property status indicator
  - Quick Actions section with context-aware buttons
  - Property Summary cards (Type, Active Units, Status)
  - Description section with editable text
  - Photos section with gallery
```

**Scenario: Navigate to property overview from list**
```
Given I am in the properties list
When I click on "09213 Burda Street" property
Then I should be redirected to /properties/09213-burda-street
And the Overview tab should be active by default
```

**Scenario: Quick actions functionality**
```
Given I am viewing a property overview
When I click "View rental applications" in Quick Actions
Then I should be taken to the Rental Applications tab
And the applications list should be filtered for this property

When I click "New lease" in Quick Actions
Then I should be taken to a new lease creation form
And the property should be pre-selected

When I click "New unit" in Quick Actions
Then I should be taken to a new unit creation form
And the property should be pre-selected

When I click "View settings" in Quick Actions
Then I should be taken to the Settings tab
```

**Scenario: Property summary cards display**
```
Given I am viewing a property overview
Then I should see summary cards showing:
  - Property Type: "Multi-Family" with building icon
  - Active Units: "2" with unit icon
  - Status: "Active" with green status indicator
```

**Scenario: Tab navigation within property**
```
Given I am viewing a property overview
When I click the "Units" tab
Then the Units tab should be highlighted
And the Units content should load
And the URL should update to include /units

When I click the "Leases" tab
Then the Leases tab should be highlighted
And the Leases content should load
And the URL should update to include /leases
```

**Scenario: Edit property description**
```
Given I am viewing a property overview
When I click on the description text
Then it should become editable
And I should be able to modify the text
And save/cancel buttons should appear
And the changes should be saved when I click save
```

**Scenario: Property photos management**
```
Given I am viewing a property overview
When I click "Add Photos" in the Photos section
Then a file upload dialog should appear
And I should be able to select multiple images
And the images should be uploaded and displayed
And the photo gallery should update
```

**Scenario: Property settings access**
```
Given I am viewing a property overview
When I click the three-dot menu in the header
Then a dropdown should appear with:
  - Edit Property
  - Delete Property
  - Archive Property
  - Export Property Data
  - Print Property Summary

When I select "Print Property Summary"
Then a print-friendly view should open
```

**Scenario: Back navigation**
```
Given I am viewing a property overview
When I click the back arrow button
Then I should return to the Properties list
And the previously applied filters should be preserved
```

**Scenario: Property not found**
```
Given I navigate to a property that doesn't exist
When the property ID is invalid
Then I should see a "Property not found" message
And there should be a link to return to the Properties list
```

---

## Property Settings Dashboard

### Feature: Property Configuration Management

**Scenario: Display settings dashboard**
```
Given I am on the Settings tab of a property
Then I should see a grid of setting cards including:
  - General Information
  - Photos & Media
  - Property Type
  - Amenities & Features
  - Pet Policy
  - Owners
  - Bank Accounts
  - Reserve Funds
  - Tenant Portal
  - Rent & Payment Notifications
  - Payment Instructions
  - Tenant Requests
  - Rental Applications
  - Payment Allocation
  - Fees Settings
  - Custom Allocations
```

**Scenario: Navigate to General Information settings**
```
Given I am on the Settings dashboard
When I click the "General Information" card
Then I should see a configuration form with:
  - Property name field
  - Address fields
  - Property type dropdown
  - Description textarea
  - Year built field
  - Lot size field
  - Contact information fields
```

**Scenario: Configure Pet Policy**
```
Given I am configuring Pet Policy settings
When I set "Allow pets" to true
Then additional fields should appear:
  - Pet fee amount
  - Pet deposit amount
  - Breed restrictions
  - Weight limits
  - Maximum number of pets

When I set "Allow pets" to false
Then only a pet policy description field should be shown
```

**Scenario: Set up Bank Accounts**
```
Given I am configuring Bank Accounts settings
When I click "Add Bank Account"
Then a form should appear with:
  - Account nickname field
  - Bank name dropdown
  - Account type selection
  - Account number field (masked)
  - Routing number field
  - Primary account checkbox
  - Auto-transfer rules
```

**Scenario: Configure Tenant Portal**
```
Given I am configuring Tenant Portal settings
When I toggle "Enable tenant portal"
Then additional configuration options should appear:
  - Portal features selection
  - Mobile app settings
  - User interface customization
  - Access control settings
```

**Scenario: Validate required fields**
```
Given I am filling out a settings form
When I try to save without filling required fields
Then I should see validation errors for:
  - Required fields should be highlighted
  - Error messages should appear below each field
  - Save button should be disabled
  - I should not be able to navigate away without confirmation
```

**Scenario: Save settings changes**
```
Given I have made changes to settings
When I click the "Save" button
Then I should see:
  - A loading indicator
  - Success confirmation message
  - Changes saved timestamp
  - Visual indication of saved state
```

**Scenario: Settings audit trail**
```
Given I have modified property settings
When I view the settings history
Then I should see:
  - Date and time of each change
  - User who made the change
  - What was changed
  - Previous and new values
  - Ability to revert changes (if permissions allow)
```

**Scenario: Search settings**
```
Given I am on the Settings dashboard
When I type "pet" in the settings search
Then I should see only relevant setting cards:
  - Pet Policy
  - Any settings containing "pet" in the title or description
```

**Scenario: Recently modified settings**
```
Given I have recently modified some settings
When I return to the Settings dashboard
Then I should see a "Recently Modified" section at the top showing:
  - Up to 5 most recently changed settings
  - Timestamp of last modification
  - Quick access to modify them again
```

---

## Create New Modal

### Feature: Centralized Entity Creation Hub

**Scenario: Open Create New Modal**
```
Given I am on any screen in the application
When I click the global "Create New" button (plus icon)
Then a modal overlay should appear with:
  - "CREATE NEW" header with accent line
  - Categorized menu of creation options
  - Close button (X) in top right
  - Background should be dimmed
```

**Scenario: Modal keyboard navigation**
```
Given the Create New Modal is open
When I press the Escape key
Then the modal should close
And focus should return to the element that opened it

When I press the Tab key
Then I should be able to navigate through all interactive elements
And focus should cycle through the menu items
```

**Scenario: Create new Property from modal**
```
Given the Create New Modal is open
When I click "Property" in the Rentals category
Then the modal should close
And I should be redirected to the New Property Wizard
And the wizard should start at Step 1
```

**Scenario: Create new Person from modal**
```
Given the Create New Modal is open
When I click "Prospect" in the People category
Then the modal should close
And I should be redirected to the prospect creation form

When I click "Owner" in the People category
Then the modal should close
And I should be redirected to the owner creation form
```

**Scenario: Create new Task from modal**
```
Given the Create New Modal is open
When I click "Task" in the Tasks & Maintenance category
Then the modal should close
And I should be redirected to the task creation form
And any relevant context should be passed to the form
```

**Scenario: Modal categories and options**
```
Given the Create New Modal is open
Then I should see the following categories with options:

People:
  - Prospect
  - Owner  
  - Vendor
  - User

Tasks & Maintenance:
  - Task
  - Work Order
  - Owner Request
  - Tenant Request

Rentals:
  - Property (featured/highlighted)
  - Unit

Leasing:
  - Lease
  - Rental Applications

Tenant Transactions:
  - Post Charge
  - Receive Payment
  - Issue Credit
  - Give Refund
  - Withhold Deposit

Vendor Transactions:
  - Create Bill
  - Pay Bills
  - Add Credit
  - Management Fees

Owner Transactions:
  - Owner Contribution
  - Owner Distribution

Other Transactions:
  - Journal Entry
  - Bank Transfer
  - Bank Deposit
  - Expense
  - Check

Communications:
  - Announcements
  - Signature Request
```

**Scenario: Modal responsive design**
```
Given I am on a mobile device
When I open the Create New Modal
Then the modal should:
  - Take up full screen or nearly full screen
  - Have appropriate touch target sizes
  - Allow scrolling through categories
  - Show fewer columns to fit the screen
```

**Scenario: Close modal by clicking outside**
```
Given the Create New Modal is open
When I click anywhere on the dimmed background
Then the modal should close
And focus should return to the triggering element
```

**Scenario: Modal accessibility**
```
Given the Create New Modal is open
When I use a screen reader
Then I should hear:
  - Modal title announced
  - Number of options available
  - Current category being navigated
  - Selection confirmation when I choose an option
```

---

## New Property Wizard

### Feature: Multi-Step Property Creation Process

**Scenario: Start New Property Wizard**
```
Given I am in the Properties section
When I click "New Property"
Then I should see a wizard with:
  - Progress indicator showing 5 steps: Type, Address, Unit Details, Bank Accounts, Ownership
  - Current step "Type" should be highlighted
  - Step 1 content should be displayed
  - Cancel and Next buttons should be visible
```

**Scenario: Select Residential property type**
```
Given I am on Step 1 (Type) of the New Property Wizard
When I click "Residential"
Then the Residential card should be highlighted with:
  - Pink border
  - Light pink background
  - Checkmark icon

And the secondary selection options should appear:
  - Single-Family
  - Multi-Family
  - Condo
  - Townhome
  - Other
```

**Scenario: Select Commercial property type**
```
Given I am on Step 1 (Type) of the New Property Wizard
When I click "Commercial"
Then the Commercial card should be highlighted

And the secondary selection options should appear:
  - Office
  - Retail
  - Shopping Center
  - Storage
  - Parking
  - Other
```

**Scenario: Select specific property type**
```
Given I have selected "Residential"
When I click "Single-Family" in the secondary selection
Then the Single-Family option should be selected
And I should see a description: "Standalone residential structure, Intended for one family"
And the Next button should become enabled
```

**Scenario: Select "Other" property type**
```
Given I have selected either Residential or Commercial
When I click "Other" in the secondary selection
Then a text input field should appear
And I should be able to enter a custom property type
And the Next button should remain disabled until I enter text
```

**Scenario: Navigate to Address step**
```
Given I have selected a property type
When I click "Next"
Then I should proceed to Step 2 (Address)
And the progress indicator should show Step 2 as active
And the form should contain fields for:
  - Street Address (required)
  - Unit/Apt/Suite (optional)
  - City (required)
  - State/Province (required)
  - ZIP/Postal Code (required)
  - Country (defaulted to US)
```

**Scenario: Validate required address fields**
```
Given I am on Step 2 (Address)
When I click "Next" without filling required fields
Then I should see validation errors for:
  - Street Address (required)
  - City (required)
  - State/Province (required)
  - ZIP/Postal Code (required)
And the Next button should be disabled
```

**Scenario: Navigate to Unit Details step**
```
Given I have filled in the address information
When I click "Next"
Then I should proceed to Step 3 (Unit Details)
And the form should adapt based on property type:

For Residential:
  - Total number of units
  - Unit types and counts
  - Unit sizes
  - Rent ranges

For Commercial:
  - Total square footage
  - Number of floors
  - Suite availability
  - Lease types
```

**Scenario: Add unit configuration**
```
Given I am on Step 3 (Unit Details) for a Multi-Family property
When I click "Add Unit Type"
Then I should be able to configure:
  - Unit type name
  - Number of units of this type
  - Square footage
  - Number of bedrooms
  - Number of bathrooms
  - Monthly rent range
  - Amenities
```

**Scenario: Navigate to Bank Accounts step**
```
Given I have configured unit details
When I click "Next"
Then I should proceed to Step 4 (Bank Accounts)
And I should see a form to add bank account information:
  - Account nickname
  - Bank name
  - Account type (Checking/Savings)
  - Account number (masked)
  - Routing number
  - Primary account indicator
```

**Scenario: Navigate to Ownership step**
```
Given I have configured bank accounts
When I click "Next"
Then I should proceed to Step 5 (Ownership)
And I should see a form to add owner information:
  - Owner type selection
  - Legal name
  - Contact information
  - Ownership percentage
  - Management agreement details
  - Tax ID (if business owner)
```

**Scenario: Validate ownership percentages**
```
Given I am on Step 5 (Ownership)
When I enter ownership percentages that don't sum to 100%
Then I should see a validation error
And the error message should indicate the remaining percentage needed
And the Next button should be disabled
```

**Scenario: Complete property creation**
```
Given I have filled in all required information for all steps
When I click "Create Property" (or "Finish")
Then I should see:
  - A loading indicator
  - Success confirmation message
  - Redirect to the new property's overview page
  - The property should appear in the properties list
```

**Scenario: Navigate back to previous steps**
```
Given I am on Step 3 (Unit Details)
When I click the "Back" button
Then I should return to Step 2 (Address)
And all previously entered data should be preserved
And I should be able to modify the address and proceed forward again
```

**Scenario: Click step indicator to navigate**
```
Given I have completed Steps 1 and 2
When I am on Step 3 and click Step 1 in the progress indicator
Then I should return to Step 1
And all data should be preserved
And I should be able to modify the selection and proceed forward
```

**Scenario: Save draft and return later**
```
Given I am in the middle of creating a property
When I click "Save Draft"
Then the wizard should:
  - Save all current progress
  - Show a confirmation message
  - Return me to the properties list
  - Show a "Resume Property Creation" option when I return
```

**Scenario: Cancel wizard with confirmation**
```
Given I am in the wizard and have entered some data
When I click "Cancel"
Then I should see a confirmation dialog:
  - "Are you sure you want to cancel?"
  - "All entered data will be lost"
  - Confirm and Cancel buttons

When I click "Confirm"
Then the wizard should close and return to properties list
And no property should be created
```

**Scenario: Handle duplicate property address**
```
Given I am entering an address that already exists
When I proceed to the next step or try to create
Then I should see a warning:
  - "A property with this address already exists"
  - Options to: Proceed anyway, Edit address, or View existing property
```

**Scenario: Wizard accessibility**
```
Given I am using the wizard with a screen reader
Then I should hear:
  - Current step announcement
  - Progress indicator status
  - Form field labels and requirements
  - Validation errors
  - Step completion confirmation
```

**Scenario: Wizard responsive design**
```
Given I am on a mobile device
When I use the New Property Wizard
Then the wizard should:
  - Display steps in a vertical progress indicator
  - Have appropriate form field sizes for touch
  - Show step content optimized for mobile
  - Maintain the same functionality as desktop
```

---

## Integration Scenarios

### Feature: Cross-Module Integration

**Scenario: Create property from People context**
```
Given I am viewing a person's profile
When I want to add a property they own
Then I should be able to access the property creation wizard
And the owner information should be pre-populated
And the ownership percentage should default to 100%
```

**Scenario: Property creation triggers notifications**
```
Given I create a new property
Then the system should:
  - Send notification to property managers
  - Create audit log entry
  - Update analytics dashboard
  - Trigger any configured webhooks
  - Generate initial tasks (if configured)
```

**Scenario: Seamless navigation between property screens**
```
Given I am creating a property through the wizard
When I need to reference existing properties
Then I should be able to:
  - Search for existing properties
  - View property details in a modal
  - Copy configuration from existing properties
  - Navigate to properties list and return
```

**Scenario: Error handling across modules**
```
Given there is a network error during property creation
Then the system should:
  - Show appropriate error message
  - Preserve all entered data
  - Allow retry of the failed operation
  - Log the error for debugging
  - Provide clear recovery options
```

---

## Performance and Reliability Scenarios

### Feature: System Performance and Reliability

**Scenario: Large property list performance**
```
Given there are 1000+ properties in the system
When I load the properties list
Then the system should:
  - Load the first 50 properties immediately
  - Show loading indicator for additional items
  - Implement pagination or infinite scroll
  - Maintain search and filter performance
```

**Scenario: Offline capability**
```
Given I have previously loaded property data
When I lose internet connection
Then I should still be able to:
  - View cached properties
  - Search within cached data
  - Make offline edits (with sync on reconnection)
  - See appropriate offline indicators
```

**Scenario: Real-time updates**
```
Given I am viewing a property list
When another user creates/updates/deletes a property
Then I should see:
  - Real-time update without page refresh
  - Visual indicators of changes
  - Conflict resolution if I have unsaved changes
```

**Scenario: Concurrent editing**
```
Given I am editing a property's settings
When another user tries to edit the same property
Then the system should:
  - Show notification of concurrent editing
  - Provide option to take over editing
  - Show last edit timestamp
  - Handle potential conflicts gracefully
```

These BDD specifications provide comprehensive testable behaviors for all aspects of the property management system, ensuring that the implementation meets user requirements and functions correctly across all scenarios.