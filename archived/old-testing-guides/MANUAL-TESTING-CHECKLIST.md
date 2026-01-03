# Manual Testing Checklist - PropMaster Platform

**Deployment URL**: https://mkc7ln20jsrc.space.minimax.io
**Test Date**: 2025-11-05
**Tester**: ________________

---

## 🎯 PRIORITY TESTS - Enhanced Database Integration

### Test 1: Background Checks Page
**URL**: `/background-checks`

- [ ] Page loads without errors
- [ ] **CRITICAL**: Check if applicant names are REAL (not "Applicant")
  - Expected: "John Doe", "Jane Smith", etc.
  - Failure: "Applicant", "Unknown Applicant"
- [ ] **CRITICAL**: Check if property names are REAL (not "Property")
  - Expected: "Sunset Apartments", "Riverside Complex", etc.
  - Failure: "Property", "Unknown Property"
- [ ] **CRITICAL**: Recommendations are calculated (not all "pending")
  - Expected: Mix of approve/approve-conditional/deny/pending
  - Failure: All showing "pending"
- [ ] Credit scores display correctly
- [ ] Status badges show correctly (pending/in-progress/completed/flagged)
- [ ] Search functionality works

**Status**: ⬜ PASS | ⬜ FAIL
**Notes**: _________________________________

---

### Test 2: Document Signing Page
**URL**: `/document-signing`

- [ ] Page loads without errors
- [ ] **CRITICAL**: Document titles are meaningful (not just "Document")
  - Expected: "Lease Agreement - Unit 101", actual file names
  - Failure: "Document", generic titles
- [ ] **CRITICAL**: Property/Unit names are REAL
  - Expected: Actual property and unit numbers
  - Failure: "Property", "Unit", "N/A"
- [ ] **CRITICAL**: Recipients list has data (not empty)
  - Expected: Tenant names and emails
  - Failure: Empty recipients array
- [ ] Document types auto-detected correctly (lease/addendum/notice)
- [ ] Signature status shows correctly (draft/sent/partially-signed/completed)
- [ ] Search and filtering work

**Status**: ⬜ PASS | ⬜ FAIL
**Notes**: _________________________________

---

### Test 3: Predictive Maintenance Page
**URL**: `/predictive-maintenance`

- [ ] Page loads without errors
- [ ] **CRITICAL**: Equipment names are descriptive
  - Expected: "Carrier HVAC Model XYZ", "Bosch Water Heater"
  - Failure: "Equipment", generic names
- [ ] **CRITICAL**: Property names are REAL
  - Expected: Actual property names
  - Failure: "Unknown Property"
- [ ] **CRITICAL**: Health scores are CALCULATED (not all 75%)
  - Expected: Varying scores (40-100%)
  - Failure: All showing 75%
- [ ] **CRITICAL**: Failure probabilities are CALCULATED (not all 50%)
  - Expected: Varying probabilities matching health scores
  - Failure: All showing 50%
- [ ] Priority badges reflect calculated risk (critical/high/medium/low)
- [ ] Charts render correctly

**Status**: ⬜ PASS | ⬜ FAIL
**Notes**: _________________________________

---

### Test 4: Lead CRM Page
**URL**: `/leads`

- [ ] Page loads without errors
- [ ] Leads display with real data (names, emails, phones)
- [ ] Metrics cards calculate correctly
- [ ] Search functionality works
- [ ] Filtering by status works
- [ ] Pipeline view toggles correctly
- [ ] Lead scores display

**Status**: ⬜ PASS | ⬜ FAIL
**Notes**: _________________________________

---

### Test 5: Market Intelligence Page
**URL**: `/market-intelligence`

- [ ] Page loads without errors
- [ ] Area selector works (Downtown/Riverside/Suburbs)
- [ ] Market data changes when area changes
- [ ] Charts render correctly
- [ ] Comparable properties table displays
- [ ] Metrics cards show data

**Status**: ⬜ PASS | ⬜ FAIL
**Notes**: _________________________________

---

## 📋 STANDARD FEATURE TESTS

### Core Features (Quick Verification)

#### Dashboard
- [ ] Loads without errors
- [ ] Charts display
- [ ] Metrics show data
- [ ] Recent activity visible

#### Calendar
- [ ] Loads without errors
- [ ] Calendar grid renders
- [ ] Events display

#### Rentals
- [ ] Loads without errors
- [ ] Properties list displays
- [ ] Units show correctly

#### Leasing
- [ ] Loads without errors
- [ ] Applications visible
- [ ] Tabs work

#### People (Tenants)
- [ ] Loads without errors
- [ ] Tenant list displays
- [ ] Search works

#### Tasks & Maintenance
- [ ] Loads without errors
- [ ] Task list displays
- [ ] Status filtering works

#### Accounting/Payments
- [ ] Loads without errors
- [ ] Payment records show
- [ ] Metrics display

#### Communications
- [ ] Loads without errors
- [ ] Message threads visible
- [ ] Tabs work

#### Notes
- [ ] Loads without errors
- [ ] Notes list displays
- [ ] Categorization works

#### Files & Agreements
- [ ] Loads without errors
- [ ] File list displays
- [ ] Tabs work

#### Reports
- [ ] Loads without errors
- [ ] Report categories show
- [ ] Search works

#### Get Started
- [ ] Loads without errors
- [ ] Wizard steps display
- [ ] Navigation works

#### Settings
- [ ] Loads without errors
- [ ] Tabs work
- [ ] Forms display

#### AI Assistant
- [ ] Loads without errors
- [ ] Chat interface visible
- [ ] Can send messages

---

## 🌐 CROSS-BROWSER TESTS

Test on at least 2 browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

**Issues found**: _________________________________

---

## 📱 RESPONSIVE DESIGN

Test on different screen sizes:

- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

**Issues found**: _________________________________

---

## 🔍 DATABASE CONNECTION VERIFICATION

### Critical Check: Are we seeing REAL data or FALLBACK mock data?

**How to verify:**
1. Open browser console (F12)
2. Navigate to each advanced feature page
3. Look for console messages:
   - ✅ GOOD: "Loaded X items from database"
   - ⚠️ FALLBACK: "Failed to load data, using fallback"

**Results:**
- Background Checks: ⬜ Real Data | ⬜ Fallback | ⬜ Error
- Document Signing: ⬜ Real Data | ⬜ Fallback | ⬜ Error
- Predictive Maintenance: ⬜ Real Data | ⬜ Fallback | ⬜ Error
- Lead CRM: ⬜ Real Data | ⬜ Fallback | ⬜ Error
- Market Intelligence: ⬜ Real Data | ⬜ Fallback | ⬜ Error

---

## 🚨 CRITICAL ISSUES FOUND

List any blockers or critical bugs:

1. _________________________________
2. _________________________________
3. _________________________________

---

## ✅ TESTING SUMMARY

**Date Completed**: _________________________________
**Total Tests**: 24 priority + 14 core = 38 tests
**Passed**: _____ / 38
**Failed**: _____ / 38
**Blocked**: _____ / 38

**Overall Status**: ⬜ PASS | ⬜ NEEDS FIXES | ⬜ BLOCKED

**Recommendation**:
- [ ] Ready for production
- [ ] Minor fixes needed
- [ ] Major fixes required
- [ ] Further investigation required

**Next Steps**: _________________________________

---

## 📝 NOTES

Additional observations, suggestions, or concerns:

_________________________________
_________________________________
_________________________________
