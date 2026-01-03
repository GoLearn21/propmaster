# MasterKey Property Management - Accounting System Design

**Date**: November 2025
**Status**: Design Phase - Ready for Implementation
**Version**: 1.0

---

## 🎯 Executive Summary

Based on comprehensive competitor analysis (DoorLoop, Buildium, AppFolio) and industry best practices, this document outlines a battle-tested, double-entry bookkeeping accounting system designed to address the top pain points in property management accounting while providing superior features at lower cost.

### Key Differentiators

| Feature | MasterKey | DoorLoop | Buildium | AppFolio |
|---------|-----------|----------|----------|----------|
| **Double-Entry System** | ✅ Built-in | ❌ Simplified | ✅ Full GL | ❌ Not specified |
| **Trust Accounting** | ✅ Automated | ✅ Manual | ✅ Manual | ✅ Basic |
| **Owner Distributions** | ✅ Auto-calculated | ✅ Manual | ✅ Manual | ✅ Manual |
| **Bank Reconciliation** | ✅ AI-powered | ✅ Basic | ✅ Basic | ✅ Basic |
| **Real-time Reporting** | ✅ Instant | ⚠️ Delayed | ⚠️ Delayed | ✅ Real-time |
| **Audit Trail** | ✅ Complete | ⚠️ Basic | ✅ Good | ✅ Good |
| **Open Source Core** | ✅ Medici | ❌ Proprietary | ❌ Proprietary | ❌ Proprietary |

---

## 📊 Competitive Analysis Summary

### Pain Points Identified Across All Competitors

#### 1. **Trust Accounting Compliance** (Critical)
- **Problem**: 22% of managers reported fraud concerns in 2023
- **Issue**: Manual tracking of security deposits across jurisdictions
- **Complexity**: Different state regulations, monthly reconciliation requirements
- **Cost**: Regulatory fines, legal issues, reputation damage

#### 2. **Owner Distribution Errors** (High Priority)
- **Problem**: Manual calculations lead to inaccurate or late payments
- **Impact**: Damages trust relationship with owners
- **Challenge**: Tracking collected rent minus expenses across multiple properties

#### 3. **Manual Processes** (Major Pain)
- **Issue**: Spreadsheets prone to errors
- **Problem**: Missed payments, data entry errors
- **Time Waste**: Hours spent on manual reconciliation

#### 4. **Limited Real-time Reporting**
- **Problem**: Month-end close takes days
- **Issue**: Can't make real-time financial decisions
- **Impact**: Slow response to cash flow issues

---

## 🏗️ System Architecture

### Core Technology Stack

#### **Double-Entry Bookkeeping Engine**
- **Library**: [Medici](https://github.com/flash-oss/medici) (MIT License)
- **Why**: Battle-tested, TypeScript support, MongoDB integration
- **Features**:
  - ACID transactions support
  - 10-1000x faster balance queries
  - Mongoose v5/v6 compatible
  - Active maintenance (2025)

#### **Database Design**
- **Primary**: PostgreSQL (Supabase) for main tables
- **Optional**: MongoDB for journal entries (if using Medici directly)
- **Hybrid Approach**: Store summaries in PostgreSQL, detailed journal in separate system

---

## 💼 Core Accounting Features

### 1. **Chart of Accounts (COA)**

```
ASSETS (1000-1999)
├── 1000-1099: Current Assets
│   ├── 1000: Operating Cash
│   ├── 1010: Trust Account Cash (Security Deposits)
│   ├── 1020: Owner Reserve Funds
│   ├── 1050: Accounts Receivable - Rent
│   └── 1060: Accounts Receivable - Other
├── 1100-1199: Fixed Assets
│   ├── 1100: Buildings
│   ├── 1110: Land
│   └── 1120: Equipment
└── 1200-1299: Other Assets
    └── 1200: Prepaid Expenses

LIABILITIES (2000-2999)
├── 2000-2099: Current Liabilities
│   ├── 2000: Accounts Payable
│   ├── 2010: Security Deposits Held (Trust)
│   ├── 2020: Owner Distributions Payable
│   └── 2030: Prepaid Rent
├── 2100-2199: Long-term Liabilities
│   └── 2100: Mortgages Payable

EQUITY (3000-3999)
├── 3000: Owner Equity
├── 3100: Retained Earnings
└── 3200: Current Year Earnings

REVENUE (4000-4999)
├── 4000: Rental Income
├── 4100: Late Fees
├── 4200: Pet Fees
├── 4300: Parking Income
├── 4400: Laundry Income
└── 4900: Other Income

EXPENSES (5000-5999)
├── 5000-5099: Property Operating Expenses
│   ├── 5000: Utilities
│   ├── 5010: Insurance
│   ├── 5020: Property Taxes
│   ├── 5030: HOA Fees
│   └── 5040: Landscaping
├── 5100-5199: Maintenance & Repairs
│   ├── 5100: General Maintenance
│   ├── 5110: HVAC Repairs
│   ├── 5120: Plumbing
│   └── 5130: Electrical
├── 5200-5299: Administrative
│   ├── 5200: Management Fees
│   ├── 5210: Legal Fees
│   └── 5220: Accounting Fees
└── 5900-5999: Other Expenses
    └── 5900: Miscellaneous
```

### 2. **General Ledger (GL)**

**Double-Entry Requirements**:
- Every transaction creates equal debits and credits
- Maintains accounting equation: Assets = Liabilities + Equity
- Immutable audit trail (no deleted transactions, only reversals)

**Transaction Types**:
1. **Rent Collection**:
   ```
   DR: Operating Cash (1000)        $1,500
   CR: Rental Income (4000)                  $1,500
   ```

2. **Security Deposit Received**:
   ```
   DR: Trust Account Cash (1010)    $1,500
   CR: Security Deposits Held (2010)         $1,500
   ```

3. **Owner Distribution**:
   ```
   DR: Owner Distributions Payable (2020)  $1,200
   CR: Operating Cash (1000)                        $1,200
   ```

### 3. **Trust Accounting** (Compliance-Critical)

**Key Requirements**:
- Separate trust accounts for security deposits
- Never mix operating and trust funds
- Monthly reconciliation
- State-specific compliance (varies by jurisdiction)

**Features**:
- ✅ Automated trust account reconciliation
- ✅ Security deposit tracking by tenant/property
- ✅ Interest calculation (where required)
- ✅ Move-out refund workflows
- ✅ Compliance reports by state

**Implementation**:
```typescript
interface TrustAccount {
  id: string;
  account_number: string;
  bank_name: string;
  balance: number;
  state_jurisdiction: string;
  deposits: SecurityDeposit[];
  reconciliation_history: Reconciliation[];
}

interface SecurityDeposit {
  id: string;
  tenant_id: string;
  property_id: string;
  amount: number;
  date_received: Date;
  interest_accrued: number;
  status: 'held' | 'refunded' | 'applied';
}
```

### 4. **Owner Distributions** (Auto-calculated)

**Calculation Logic**:
```
Owner Distribution =
  Collected Rent
  - Property Expenses
  - Management Fees
  - Reserve Fund Allocation
  + Other Income
```

**Features**:
- ✅ Automatic calculation on rent collection
- ✅ Custom distribution schedules (monthly, quarterly, etc.)
- ✅ Multiple owner split support (percentage-based)
- ✅ Hold distributions for unpaid expenses
- ✅ Owner statement generation

**Workflow**:
1. Tenant pays rent → System records collection
2. System calculates net income for property
3. System creates distribution transaction
4. Owner receives notification
5. ACH payment processed (or manual check)
6. Transaction recorded in GL

### 5. **Bank Reconciliation** (AI-Powered)

**Traditional Problems**:
- Manual matching is time-consuming
- Easy to miss transactions
- Month-end close takes days

**MasterKey Solution**:
- ✅ **Automatic Import**: Connect bank accounts via Plaid
- ✅ **AI Matching**: Machine learning matches transactions
- ✅ **Smart Categorization**: Learns from historical patterns
- ✅ **One-Click Reconciliation**: Review and approve in minutes
- ✅ **Exception Handling**: Flags unmatched transactions

**Process**:
```
1. Bank transactions imported daily (Plaid API)
2. AI matches against pending transactions
3. System suggests GL account categorization
4. User reviews and approves
5. GL automatically updated
6. Reconciliation report generated
```

### 6. **Financial Reporting**

**Standard Reports** (60+ built-in):

#### **Income Statement (P&L)**
- By property, portfolio, or consolidated
- Actual vs. Budget comparison
- Year-over-year comparison
- Monthly, quarterly, annual views

#### **Balance Sheet**
- Assets, Liabilities, Equity
- By property or consolidated
- Point-in-time snapshots

#### **Cash Flow Statement**
- Operating, Investing, Financing activities
- Cash position forecasting

#### **Owner Statements**
- Property-specific income/expenses
- Distribution history
- Year-to-date performance
- Custom branding

#### **Tax Reports**
- Schedule E preparation
- 1099 generation (vendors)
- Depreciation schedules

**Real-Time Features**:
- Live dashboard updates
- Drill-down to transaction detail
- Export to Excel, PDF, CSV
- Email scheduling

### 7. **Budget Management**

**Features**:
- ✅ Annual budget creation by property
- ✅ Monthly budget vs. actual tracking
- ✅ Variance analysis
- ✅ Budget alerts (overspending)
- ✅ Rolling forecasts

**Budget Categories**:
```typescript
interface Budget {
  property_id: string;
  fiscal_year: number;
  monthly_rent_target: number;
  expense_budgets: {
    maintenance: number;
    utilities: number;
    insurance: number;
    taxes: number;
    management_fees: number;
  };
  reserves: number;
}
```

---

## 🔒 Compliance & Security

### Audit Trail
- **Immutable Logs**: Every transaction permanently recorded
- **User Tracking**: Who created/modified each entry
- **Timestamp**: When transaction occurred
- **IP Address**: Where transaction originated
- **Change History**: Before/after values for edits

### Tax Compliance
- **1099 Generation**: Automatic vendor 1099-MISC/NEC
- **Schedule E Support**: Export for tax preparation
- **Depreciation Tracking**: Asset depreciation schedules
- **State-specific**: Compliance with local regulations

### Data Security
- **Encryption**: At-rest and in-transit
- **Role-Based Access**: Permissions by user role
- **Two-Factor Auth**: Required for financial operations
- **Backup**: Daily automated backups
- **Disaster Recovery**: Point-in-time restoration

---

## 📱 User Experience Features

### Dashboard
- **Cash Position**: Current available cash
- **Outstanding AR**: Rent due/overdue
- **Upcoming Distributions**: Owner payments due
- **Recent Transactions**: Last 10 entries
- **Alerts**: Overdue payments, reconciliation needed

### Quick Actions
- Record rent payment
- Enter expense
- Create invoice
- Run reconciliation
- Generate report

### Mobile App
- View financial dashboards
- Approve expenses on-the-go
- Mobile check deposit (bank integration)
- Receipt capture (photo → expense)

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Chart of Accounts
- [ ] Implement GL structure
- [ ] Create transaction recording system
- [ ] Basic double-entry validation

### Phase 2: Core Features (Week 3-4)
- [ ] Rent collection workflows
- [ ] Expense tracking
- [ ] Basic reporting (P&L, Balance Sheet)
- [ ] Bank account integration (Plaid)

### Phase 3: Advanced Features (Week 5-6)
- [ ] Trust accounting
- [ ] Owner distributions
- [ ] Bank reconciliation
- [ ] Budget management

### Phase 4: Automation (Week 7-8)
- [ ] Recurring transactions
- [ ] Auto-categorization (AI)
- [ ] Scheduled reports
- [ ] Payment reminders

### Phase 5: Compliance (Week 9-10)
- [ ] 1099 generation
- [ ] Tax reports
- [ ] Audit trails
- [ ] Compliance dashboards

---

## 💰 Cost Comparison

### Per-Property Monthly Cost

| Feature | MasterKey | DoorLoop | Buildium | AppFolio |
|---------|-----------|----------|----------|----------|
| **Base Cost** | $5 | $40 | $50 | $280 |
| **Transaction Fees** | 1.5% | 2.9% | 2.9% | 2.75% |
| **ACH Cost** | $0.50 | $1.00 | $0.50 | $0.50 |
| **QuickBooks Sync** | FREE | $20 | FREE | $50 |
| **1099 Filing** | FREE | $2.95/form | $2.95/form | $5/form |

**Annual Savings (10 properties)**:
- vs. DoorLoop: $4,200
- vs. Buildium: $5,400
- vs. AppFolio: $33,000

---

## 🛠️ Technology Stack

### Core Libraries
- **Accounting Engine**: Medici (MIT License)
- **Bank Integration**: Plaid API
- **Payment Processing**: Stripe
- **PDF Generation**: jsPDF
- **Excel Export**: ExcelJS
- **Chart Library**: Chart.js

### Database Schema
- **PostgreSQL Tables**: accounts, transactions, journal_entries
- **Indexes**: Optimized for reporting queries
- **Partitioning**: By fiscal year for performance

### API Design
- **REST API**: Standard CRUD operations
- **GraphQL**: Complex reporting queries
- **Webhooks**: Bank sync, payment notifications
- **Rate Limiting**: Prevent abuse

---

## 📈 Success Metrics

### Performance KPIs
- **Month-End Close Time**: <30 minutes (vs. 2-3 days industry average)
- **Reconciliation Time**: <10 minutes (vs. 2-3 hours)
- **Owner Statement Generation**: Instant (vs. manual)
- **Report Load Time**: <2 seconds
- **Transaction Processing**: <100ms

### Business KPIs
- **User Adoption**: 95% of properties use accounting features
- **Customer Satisfaction**: 4.8/5.0 rating
- **Support Tickets**: <2% of transactions require support
- **Accuracy**: 99.99% transaction accuracy
- **Compliance**: 100% tax report generation success

---

## 🎯 Competitive Advantages

1. **Open Source Core**: Built on battle-tested Medici library
2. **Real-time Everything**: No delays, instant updates
3. **AI-Powered**: Smart categorization and matching
4. **Lower Cost**: 50-90% cheaper than competitors
5. **Better UX**: Modern, intuitive interface
6. **Complete Audit Trail**: Immutable history
7. **Trust Accounting**: Automated compliance
8. **Owner Distributions**: Auto-calculated and scheduled
9. **Comprehensive Reporting**: 60+ built-in reports
10. **Developer-Friendly**: API-first design

---

## 📋 Next Steps

1. **Execute Database Schema**: Run SQL to create accounting tables
2. **Integrate Medici**: Set up double-entry bookkeeping engine
3. **Build Chart of Accounts UI**: Allow customization
4. **Implement Transaction Recording**: Core CRUD operations
5. **Create Financial Reports**: P&L, Balance Sheet, Cash Flow
6. **Add Bank Integration**: Plaid API for bank sync
7. **Build Reconciliation Tool**: AI-powered matching
8. **Implement Trust Accounting**: Compliance workflows
9. **Add Owner Distributions**: Auto-calculation logic
10. **Create Dashboards**: Real-time financial overview

---

**Status**: Ready to implement! All research complete, architecture designed, and roadmap defined.
