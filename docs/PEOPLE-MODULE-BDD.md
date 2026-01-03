# People Module - Behavior-Driven Development (BDD) Specifications

## Overview
This document contains comprehensive BDD scenarios for the People Module using Gherkin syntax. These scenarios serve as both specification and automated test cases.

---

## Feature: People Module Navigation

### Scenario: Navigate between entity types
```gherkin
Feature: People Module Tab Navigation
  As a property manager
  I want to switch between different entity types
  So that I can manage tenants, owners, vendors, and prospects efficiently

Scenario: Switch to Tenants tab
  Given I am on the People page
  When I click on the "Tenants" tab
  Then the Tenants tab should be active
  And the tab should be highlighted with teal color
  And the Tenants data table should be visible
  And the URL should update to "/people?tab=tenants"

Scenario: Navigate to Owners tab
  Given I am viewing the Tenants tab
  When I click on the "Owners" tab
  Then the Owners tab should be active
  And the Tenants tab should no longer be highlighted
  And the Owners data table should be displayed
  And the page should load owners data

Scenario: Tab state persistence
  Given I am viewing the "Vendors" tab
  When I refresh the page
  Then the "Vendors" tab should still be active
  And the vendors data should be displayed
```

---

## Feature: Tenants Management

### Scenario: View Tenant Statistics
```gherkin
Feature: Tenant Statistics Display
  As a property manager
  I want to see key tenant metrics at a glance
  So that I can quickly assess the status of my tenant portfolio

Scenario: Display tenant statistics cards
  Given I have 50 tenants in the system
  And 5 tenants have outstanding balances totaling $5,000
  And 3 tenants are missing contact information
  And 8 tenants signed up this month
  When I navigate to the Tenants tab
  Then I should see a "Balance Due" card displaying "$5,000.00"
  And I should see a "Missing Contact Info" card displaying "3 issues"
  And I should see a "Sign-ups This Period" card displaying "8 tenants"
  And I should see a "Tenant Records" card displaying "50 tenants"

Scenario: Statistics update in real-time
  Given I am viewing the Tenants statistics
  When a new tenant is created
  Then the "Tenant Records" count should increment by 1
  And the "Sign-ups This Period" count should increment by 1
```

### Scenario: Create New Tenant
```gherkin
Feature: Tenant Creation
  As a property manager
  I want to add new tenants to the system
  So that I can track their information and lease details

Scenario: Successfully create a tenant with all required fields
  Given I am on the Tenants tab
  When I click the "+ New tenant" button
  Then a "Create Tenant" modal should open
  When I fill in the following fields:
    | Field          | Value                    |
    | First Name     | John                     |
    | Last Name      | Smith                    |
    | Email          | john.smith@email.com     |
    | Mobile Phone   | (555) 123-4567          |
  And I click the "Save" button
  Then the modal should close
  And a success toast should display "Tenant created successfully"
  And the new tenant should appear in the table
  And the tenant should have a "Current" status badge

Scenario: Validation - Missing required fields
  Given I am on the "Create Tenant" modal
  When I leave the "First Name" field empty
  And I leave the "Email" field empty
  And I click the "Save" button
  Then I should see an error message "First name is required"
  And I should see an error message "Email is required"
  And the modal should remain open
  And no tenant should be created

Scenario: Validation - Invalid email format
  Given I am on the "Create Tenant" modal
  When I enter "invalid-email" in the "Email" field
  And I click the "Save" button
  Then I should see an error message "Please enter a valid email address"

Scenario: Create tenant with optional fields
  Given I am on the "Create Tenant" modal
  When I fill in required fields plus:
    | Field              | Value                |
    | Middle Initial     | A                    |
    | Date of Birth      | 01/15/1990          |
    | Social Security    | 123-45-6789         |
    | Company            | Tech Corp           |
    | Job Title          | Engineer            |
  And I upload a profile photo
  And I click "Save"
  Then the tenant should be created with all fields saved
  And the profile photo should be displayed

Scenario: Auto-save draft
  Given I am filling out the "Create Tenant" form
  When I enter "Jane" in the "First Name" field
  And I wait 30 seconds
  Then the form data should be auto-saved to local storage
  When I accidentally close the modal
  And I reopen the "Create Tenant" modal
  Then the "First Name" field should still contain "Jane"
```

### Scenario: Search Tenants
```gherkin
Feature: Tenant Search
  As a property manager
  I want to search for tenants by various criteria
  So that I can quickly find specific tenant information

Scenario: Search by name
  Given the following tenants exist:
    | Name          | Email                |
    | John Smith    | john@email.com       |
    | Jane Doe      | jane@email.com       |
    | Bob Johnson   | bob@email.com        |
  When I enter "John" in the search bar
  Then I should see "John Smith" in the results
  And I should not see "Jane Doe" in the results
  And I should not see "Bob Johnson" in the results

Scenario: Search by email
  Given the tenant "John Smith" with email "john.smith@email.com" exists
  When I enter "john.smith" in the search bar
  Then I should see "John Smith" in the results

Scenario: Search by phone number
  Given the tenant "Jane Doe" with phone "(555) 123-4567" exists
  When I enter "555 123" in the search bar
  Then I should see "Jane Doe" in the results

Scenario: Real-time search filtering
  Given I am viewing all tenants
  When I type "J" in the search bar
  Then the results should update immediately
  And only tenants with names starting with "J" should be visible
  When I type "o" (making it "Jo")
  Then the results should filter further
  And the update should occur in less than 500ms

Scenario: Minimum character requirement
  Given I am on the Tenants tab
  When I type "J" (1 character) in the search bar
  Then no search should be triggered
  When I type "o" (making it "Jo")
  Then the search should be triggered
```

### Scenario: Filter Tenants
```gherkin
Feature: Tenant Filtering
  As a property manager
  I want to filter tenants by various criteria
  So that I can focus on specific tenant segments

Scenario: Filter by status
  Given the following tenants exist:
    | Name       | Status   |
    | John Smith | Current  |
    | Jane Doe   | Past     |
    | Bob Lee    | Current  |
  When I click the "Filter" button
  And I select "Current" from the status filter
  And I click "Apply Filters"
  Then I should see "John Smith" in the results
  And I should see "Bob Lee" in the results
  And I should not see "Jane Doe" in the results

Scenario: Filter by balance
  Given the following tenants exist:
    | Name       | Balance |
    | John Smith | $500    |
    | Jane Doe   | $0      |
    | Bob Lee    | -$200   |
  When I apply the "Has balance" filter
  Then I should see "John Smith" (positive balance)
  And I should see "Bob Lee" (negative balance)
  And I should not see "Jane Doe" (no balance)

Scenario: Multiple filters combined
  Given I have tenants with various statuses and balances
  When I filter by "Current" status
  And I filter by "Has balance"
  Then only current tenants with outstanding balances should be displayed

Scenario: Clear filters
  Given I have applied multiple filters
  When I click "Clear All Filters"
  Then all filters should be reset
  And all tenants should be displayed
```

### Scenario: Edit Tenant
```gherkin
Feature: Tenant Editing
  As a property manager
  I want to update tenant information
  So that I can keep records accurate and current

Scenario: Successfully edit tenant details
  Given a tenant "John Smith" with email "john@old.com" exists
  When I click the edit icon for "John Smith"
  Then the "Edit Tenant" modal should open
  And all fields should be pre-filled with current data
  When I change the email to "john@new.com"
  And I click "Save"
  Then the modal should close
  And a success toast should display "Tenant updated successfully"
  And the tenant's email should now be "john@new.com"

Scenario: Track modification history
  Given I edit a tenant's information
  When I view the tenant's activity log
  Then I should see a record of the change
  And the record should show who made the change
  And the record should show when the change was made
  And the record should show what was changed

Scenario: Cancel editing
  Given I am editing a tenant
  When I make changes to the form
  And I click "Cancel"
  Then a confirmation dialog should appear
  When I confirm cancellation
  Then the modal should close
  And no changes should be saved
```

### Scenario: Delete/Archive Tenant
```gherkin
Feature: Tenant Archival
  As a property manager
  I want to archive past tenants
  So that I can keep my active tenant list clean while retaining historical data

Scenario: Successfully archive a tenant
  Given a tenant "John Smith" with status "Past" and zero balance exists
  When I click the delete icon for "John Smith"
  Then a confirmation dialog should appear with the message "Are you sure you want to archive this tenant?"
  When I select "Moved out" as the reason
  And I click "Confirm"
  Then the tenant should be archived
  And a success toast should display "Tenant archived successfully"
  And the tenant should no longer appear in the active list

Scenario: Cannot delete tenant with active lease
  Given a tenant "Jane Doe" with an active lease exists
  When I attempt to archive the tenant
  Then I should see an error message "Cannot archive tenant with active lease"
  And the archive action should be blocked

Scenario: Cannot delete tenant with outstanding balance
  Given a tenant "Bob Lee" with a balance of $500 exists
  When I attempt to archive the tenant
  Then I should see an error message "Cannot archive tenant with outstanding balance"
  And the archive action should be blocked

Scenario: View archived tenants
  Given I have archived 10 tenants
  When I apply the "Archived" filter
  Then I should see all 10 archived tenants
  And they should be visually distinct (grayed out or marked)
```

### Scenario: Bulk Operations
```gherkin
Feature: Bulk Tenant Operations
  As a property manager
  I want to perform actions on multiple tenants at once
  So that I can save time on repetitive tasks

Scenario: Select multiple tenants
  Given I am viewing the tenants list
  When I check the checkbox for "John Smith"
  And I check the checkbox for "Jane Doe"
  Then the bulk action toolbar should appear
  And it should show "2 selected"

Scenario: Bulk send message
  Given I have selected 5 tenants
  When I click "Send Message" from the bulk actions
  Then a message composition modal should open
  And the "To" field should list all 5 tenant names
  When I compose and send a message
  Then all 5 tenants should receive the message

Scenario: Bulk export
  Given I have selected 3 tenants
  When I click "Export" from the bulk actions
  And I select "CSV" format
  Then a CSV file should download
  And it should contain data for the 3 selected tenants only

Scenario: Select all tenants
  Given I am viewing 50 tenants (current page)
  When I check the "Select All" checkbox in the header
  Then all 50 tenants on the current page should be selected
  And the bulk action toolbar should show "50 selected"
```

---

## Feature: Owners Management

### Scenario: View Owner Statistics
```gherkin
Feature: Owner Statistics Display
  As a property manager
  I want to see key owner metrics
  So that I can manage owner relationships effectively

Scenario: Display owner statistics
  Given I have 10 owners in the system
  And they collectively own 25 properties
  And monthly distributions total $50,000
  And there are 3 pending maintenance items
  When I navigate to the Owners tab
  Then I should see "Total Properties Owned: 25"
  And I should see "Monthly Distribution: $50,000.00"
  And I should see "Pending Maintenance: 3 items"
  And I should see "Active Leases: 22"
```

### Scenario: Create Owner with Financial Details
```gherkin
Feature: Owner Creation with Financial Info
  As a property manager
  I want to create owner profiles with financial details
  So that I can manage distributions and tax reporting

Scenario: Create owner with tax information
  Given I am on the Owners tab
  When I click "+ New owner"
  And I fill in the required fields:
    | Field          | Value                |
    | First Name     | Robert               |
    | Last Name      | Wilson               |
    | Email          | robert@email.com     |
  And I fill in financial fields:
    | Field                  | Value              |
    | Tax ID                 | 12-3456789         |
    | Payment Method         | Direct Deposit     |
    | Distribution Day       | 5                  |
  And I click "Save"
  Then the owner should be created
  And the tax ID should be stored securely

Scenario: Link owner to properties
  Given an owner "Robert Wilson" exists
  And properties "123 Main St" and "456 Oak Ave" exist
  When I edit the owner
  And I add property "123 Main St" with ownership percentage 100%
  And I add property "456 Oak Ave" with ownership percentage 50%
  And I save the changes
  Then the owner should be linked to both properties
  And ownership percentages should be saved
```

### Scenario: Owner Financial Dashboard
```gherkin
Feature: Owner Financial Reporting
  As an owner
  I want to view my financial performance
  So that I can track my investment returns

Scenario: View monthly distribution summary
  Given I am viewing owner "Robert Wilson"
  When I navigate to the "Financials" tab
  Then I should see:
    | Metric             | Value      |
    | Total Revenue      | $8,500     |
    | Total Expenses     | $2,300     |
    | Net Income         | $6,200     |
    | Management Fee     | $850       |
    | Distribution       | $5,350     |

Scenario: Year-to-date report
  Given I am viewing an owner's financial dashboard
  When I select "Year to Date" as the time range
  Then I should see cumulative revenue for the year
  And I should see cumulative expenses for the year
  And I should see total distributions made
```

---

## Feature: Vendors Management

### Scenario: View Vendor Statistics
```gherkin
Feature: Vendor Statistics Display
  As a property manager
  I want to see vendor metrics
  So that I can manage service providers effectively

Scenario: Display vendor statistics
  Given I have 20 vendors in the system
  And 5 vendors have active jobs
  And pending payments to vendors total $3,500
  And average response time is 4.5 hours
  When I navigate to the Vendors tab
  Then I should see "Total Vendors: 20"
  And I should see "Active Jobs: 5"
  And I should see "Pending Payments: $3,500.00"
  And I should see "Avg Response Time: 4.5 hrs"
```

### Scenario: Create Vendor with Service Details
```gherkin
Feature: Vendor Creation
  As a property manager
  I want to create vendor profiles
  So that I can track service providers and their specialties

Scenario: Create vendor with license and insurance
  Given I am on the Vendors tab
  When I click "+ New vendor"
  And I fill in:
    | Field              | Value                          |
    | Business Name      | ABC Plumbing Services         |
    | Contact Person     | Mike Johnson                   |
    | Email              | mike@abcplumbing.com          |
    | Phone              | (555) 987-6543                |
    | License Number     | PL-12345                       |
    | Insurance Provider | State Farm                     |
    | Policy Number      | INS-987654                     |
    | Expiration Date    | 12/31/2025                    |
  And I select service categories: "Plumbing", "HVAC"
  And I set hourly rate to "$85.00"
  And I click "Save"
  Then the vendor should be created
  And all service details should be saved

Scenario: Insurance expiration warning
  Given a vendor has insurance expiring in 30 days
  When I view the Vendors list
  Then I should see a warning icon next to that vendor
  And hovering should show "Insurance expires soon: 12/31/2025"
```

### Scenario: Vendor Performance Tracking
```gherkin
Feature: Vendor Performance Metrics
  As a property manager
  I want to track vendor performance
  So that I can make informed decisions about which vendors to use

Scenario: View vendor work order history
  Given vendor "ABC Plumbing" has completed 15 work orders
  When I view the vendor's profile
  And I navigate to the "Work Orders" tab
  Then I should see all 15 completed work orders
  And I should see performance metrics:
    | Metric                  | Value    |
    | Completion Rate         | 93%      |
    | Average Completion Time | 2.3 days |
    | Average Rating          | 4.7/5    |

Scenario: Rate vendor after job completion
  Given a work order assigned to "ABC Plumbing" is marked complete
  When I rate the vendor with 5 stars
  And I add a review "Excellent work, on time"
  Then the rating should be saved
  And the vendor's average rating should update
```

---

## Feature: Prospects Management

### Scenario: View Prospect Statistics
```gherkin
Feature: Prospect Statistics Display
  As a leasing agent
  I want to see prospect metrics
  So that I can manage the leasing pipeline effectively

Scenario: Display prospect statistics
  Given I have 30 prospects in the system
  And 5 prospects were contacted this week
  And 3 tours are scheduled
  And 2 applications were submitted
  When I navigate to the Prospects tab
  Then I should see "Total Prospects: 30"
  And I should see "Contacted This Week: 5"
  And I should see "Tours Scheduled: 3"
  And I should see "Applications Submitted: 2"
```

### Scenario: Create Prospect (as shown in screenshot)
```gherkin
Feature: Prospect Creation
  As a leasing agent
  I want to capture prospect information
  So that I can follow up and convert them to tenants

Scenario: Create new prospect with required fields
  Given I am on the Prospects tab
  When I click "+ New prospect"
  Then the "New Prospect" modal should open
  When I upload a profile photo
  And I fill in:
    | Field          | Value                    |
    | First Name     | Sarah                    |
    | M.I.           | M                        |
    | Last Name      | Johnson                  |
    | Primary Email  | sarah.j@email.com        |
    | Mobile Phone   | (555) 234-5678          |
  And I fill in optional fields:
    | Field          | Value                    |
    | Date of Birth  | 03/20/1992              |
    | Company        | Marketing Inc           |
    | Job Title      | Marketing Manager       |
  And I add notes "Interested in 2BR, needs parking"
  And I click "Save"
  Then the prospect should be created
  And a success toast should display
  And the prospect should appear in the list

Scenario: Contact information required warning
  Given I am on the "Create Prospect" modal
  When I leave both email and phone fields empty
  Then I should see a warning message "These details are required for rent reminders, tenant communications and portal access"
  And the warning should have a yellow background
  And an information icon should be displayed
```

### Scenario: Prospect Lead Source Tracking
```gherkin
Feature: Prospect Lead Source Tracking
  As a leasing agent
  I want to track where prospects come from
  So that I can optimize marketing efforts

Scenario: Assign lead source to prospect
  Given I am creating a new prospect
  When I select "Zillow" as the lead source
  And I save the prospect
  Then the lead source should be recorded
  When I view the Prospects dashboard
  Then I should see lead source distribution:
    | Source         | Count |
    | Website        | 12    |
    | Zillow         | 8     |
    | Referral       | 5     |
    | Walk-in        | 3     |
```

### Scenario: Prospect Pipeline Management
```gherkin
Feature: Prospect Pipeline
  As a leasing agent
  I want to track prospects through the leasing process
  So that I can manage conversions effectively

Scenario: Move prospect through pipeline stages
  Given a prospect "Sarah Johnson" with status "New" exists
  When I change the status to "Contacted"
  Then the status should update
  And the "contacted_date" should be set to today
  When I change the status to "Tour Scheduled"
  Then I should be prompted to enter a tour date
  When I change the status to "Application Submitted"
  Then I should be prompted to upload the application

Scenario: View pipeline in Kanban board
  Given I have 20 prospects at various stages
  When I switch to "Pipeline View"
  Then I should see a Kanban board with columns:
    | Column              | Count |
    | New                 | 8     |
    | Contacted           | 5     |
    | Tour Scheduled      | 3     |
    | Application Submit  | 2     |
    | Approved            | 2     |
  And I should be able to drag prospects between columns

Scenario: Track days in stage
  Given a prospect has been in "Contacted" stage for 5 days
  When I view the prospect in the pipeline
  Then I should see "5 days in stage"
  And if > 7 days, the card should be highlighted in yellow (warning)
```

### Scenario: Convert Prospect to Tenant
```gherkin
Feature: Prospect Conversion
  As a leasing agent
  I want to convert approved prospects to tenants
  So that I can transition them into the rental process

Scenario: Successful conversion
  Given a prospect "Sarah Johnson" with status "Approved" exists
  And all required information is complete
  When I click "Convert to Tenant"
  Then a confirmation dialog should appear
  When I confirm the conversion
  Then a new tenant record should be created
  And all prospect data should be transferred
  And the prospect record should be marked as "Converted"
  And the conversion_date should be set to today
  And I should be redirected to create a lease for the new tenant

Scenario: Conversion validation
  Given a prospect is missing required tenant information
  When I attempt to convert to tenant
  Then I should see a validation error listing missing fields
  And the conversion should be blocked
```

---

## Feature: Cross-Module Functionality

### Scenario: Export Data
```gherkin
Feature: Data Export
  As a property manager
  I want to export people data
  So that I can use it in external systems or reports

Scenario: Export tenants to CSV
  Given I am viewing the Tenants tab
  When I click the "Export" button
  And I select "CSV" format
  And I select columns to export:
    | Column          |
    | Name            |
    | Email           |
    | Phone           |
    | Status          |
    | Balance         |
  And I click "Export"
  Then a CSV file should download
  And the file should contain all selected columns
  And the data should match what's displayed in the table

Scenario: Export with current filters applied
  Given I have filtered tenants by "Current" status
  When I export to CSV
  Then only the filtered tenants should be exported
  And a confirmation should show "Exporting 15 filtered records"
```

### Scenario: Import Data
```gherkin
Feature: Data Import
  As a property manager
  I want to bulk import people data
  So that I can migrate from another system efficiently

Scenario: Successful import
  Given I have a CSV file with 50 tenant records
  When I navigate to Tenants tab
  And I click "Import"
  And I upload the CSV file
  Then I should see a field mapping interface
  When I map CSV columns to system fields:
    | CSV Column      | System Field  |
    | Full Name       | Name          |
    | Email Address   | Email         |
    | Phone Number    | Phone         |
  And I click "Import"
  Then I should see a progress bar
  And upon completion, I should see "50 records imported successfully"
  And all 50 tenants should appear in the system

Scenario: Import validation errors
  Given I have a CSV with invalid data
  When I attempt to import
  Then validation should run on each row
  And I should see an error report showing:
    | Row | Error                     |
    | 3   | Invalid email format      |
    | 7   | Missing required field    |
    | 12  | Duplicate email address   |
  And I should have options to:
    - Fix and retry
    - Skip invalid rows and import valid ones
    - Cancel import
```

### Scenario: Photo Management
```gherkin
Feature: Profile Photo Upload
  As a property manager
  I want to upload profile photos
  So that I can visually identify people in the system

Scenario: Upload valid photo
  Given I am creating/editing a person record
  When I click "Upload Photo"
  And I select a JPEG file (2MB)
  Then the photo should upload to Supabase Storage
  And a preview should be displayed
  And the photo_url should be saved to the database

Scenario: Photo validation
  Given I am uploading a photo
  When I select a file larger than 5MB
  Then I should see an error "File size must be under 5MB"
  When I select a PDF file
  Then I should see an error "Only JPG and PNG files are allowed"

Scenario: Photo auto-resize
  Given I upload a 4000x3000px photo
  Then the system should automatically resize it to 200x200px
  And the aspect ratio should be maintained (cropped to square)
  And the file size should be optimized

Scenario: Fallback avatar
  Given a person has no profile photo
  When their record is displayed
  Then an avatar with their initials should be shown
  And the background color should be based on their name (consistent)
```

### Scenario: Communication Tools
```gherkin
Feature: Direct Communication
  As a property manager
  I want to communicate with people directly from the system
  So that I can keep all interactions logged

Scenario: Send email to tenant
  Given I am viewing tenant "John Smith"
  When I click the "Send Email" icon
  Then an email composition modal should open
  And the "To" field should be pre-filled with "john.smith@email.com"
  When I enter subject "Rent Reminder"
  And I enter message body "Your rent is due on the 1st"
  And I click "Send"
  Then the email should be sent
  And the communication should be logged in the tenant's history

Scenario: Communication history
  Given I have sent 3 emails to "Jane Doe"
  When I view her profile
  And I navigate to the "Communications" tab
  Then I should see all 3 emails listed
  And each should show: date, subject, preview, status (sent/read)
```

### Scenario: Tagging System
```gherkin
Feature: People Tagging
  As a property manager
  I want to tag people with custom labels
  So that I can organize and filter them by custom categories

Scenario: Create and apply tag
  Given I am viewing a tenant
  When I click "Add Tag"
  And I type "VIP"
  And I press Enter
  Then a new tag "VIP" should be created
  And the tag should be applied to the tenant
  And the tag should appear with a colored background

Scenario: Filter by tags
  Given 10 tenants are tagged with "VIP"
  When I apply the "VIP" tag filter
  Then I should see only those 10 tenants

Scenario: Tag management
  Given I have created tags "VIP", "Priority", "Issue"
  When I navigate to "Manage Tags"
  Then I should see all tags listed
  And I should be able to rename tags
  And I should be able to delete unused tags
  And I should be able to change tag colors
```

---

## Feature: Performance & UX

### Scenario: Loading States
```gherkin
Feature: Loading Indicators
  As a user
  I want to see loading indicators
  So that I know the system is processing my request

Scenario: Table loading state
  Given I am navigating to the Tenants tab
  When the data is being fetched
  Then I should see skeleton loaders in the table rows
  And the skeleton should match the layout of actual rows

Scenario: Form submission loading
  Given I am creating a new tenant
  When I click "Save"
  Then the button should show a spinner
  And the button text should change to "Saving..."
  And the button should be disabled during save
```

### Scenario: Error Handling
```gherkin
Feature: Error Handling
  As a user
  I want clear error messages
  So that I can understand and fix problems

Scenario: Network error
  Given I lose internet connection
  When I attempt to create a tenant
  Then I should see an error toast "Unable to save. Please check your connection."
  And the form data should be preserved
  And I should be able to retry

Scenario: Validation errors displayed inline
  Given I am filling out a form
  When I enter an invalid email
  And I move to the next field
  Then I should see an error message below the email field
  And the field should be highlighted in red
```

### Scenario: Accessibility
```gherkin
Feature: Keyboard Navigation
  As a user with accessibility needs
  I want to navigate using keyboard only
  So that I can use the system without a mouse

Scenario: Tab navigation
  Given I am on the People page
  When I press Tab repeatedly
  Then focus should move through all interactive elements in order:
    - Search bar
    - Filter button
    - New button
    - Table rows
    - Pagination controls

Scenario: Keyboard shortcuts
  Given I am on the People page
  When I press "Ctrl+F" or "Cmd+F"
  Then focus should move to the search bar
  When I press "Escape"
  Then any open modal should close
```

---

## Acceptance Test Summary

### Critical Path Tests (Must Pass)
1. ✅ Create tenant with required fields only
2. ✅ Create tenant with all fields including photo
3. ✅ Search tenant by name
4. ✅ Filter tenants by status
5. ✅ Edit tenant and save changes
6. ✅ Delete/Archive tenant (validation prevents if has balance/lease)
7. ✅ View statistics (all 4 cards display correct data)
8. ✅ Export tenants to CSV
9. ✅ All 4 tabs (Tenants, Owners, Vendors, Prospects) load and display data
10. ✅ Convert prospect to tenant

### Regression Tests (Should Not Break)
1. ✅ Existing tenants remain visible after creating new tenant
2. ✅ Filter persists after page refresh
3. ✅ Search results clear when search term is removed
4. ✅ Modal closes without saving when Cancel is clicked
5. ✅ No duplicate tenants created with same email

### Performance Tests
1. ✅ Page loads in < 2 seconds with 1000 records
2. ✅ Search returns results in < 500ms
3. ✅ Table scrolling is smooth (60fps)
4. ✅ Photo upload completes in < 5 seconds

### Security Tests
1. ✅ RLS policies prevent unauthorized access
2. ✅ SSN is encrypted in database
3. ✅ User can only see data for properties they manage
4. ✅ Audit log records all changes

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-04  
**Author**: MiniMax Agent  
**Status**: Ready for Test Implementation
