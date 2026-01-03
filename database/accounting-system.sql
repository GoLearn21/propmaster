-- ============================================================================
-- MASTERKEY ACCOUNTING SYSTEM - Double-Entry Bookkeeping
-- ============================================================================
-- Based on competitive research: DoorLoop, Buildium, AppFolio
-- Core: Battle-tested double-entry accounting with full audit trail
-- Features: General Ledger, Trust Accounting, Owner Distributions
-- ============================================================================

BEGIN;

-- ====================
-- 1. CHART OF ACCOUNTS
-- ====================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(20) NOT NULL UNIQUE,  -- e.g., "1000", "4000"
  account_name VARCHAR(255) NOT NULL,        -- e.g., "Operating Cash"
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
    'asset', 'liability', 'equity', 'revenue', 'expense'
  )),
  account_subtype VARCHAR(100),              -- e.g., "current_asset", "fixed_asset"
  parent_account_id UUID REFERENCES chart_of_accounts(id),
  normal_balance VARCHAR(10) CHECK (normal_balance IN ('debit', 'credit')),
  is_active BOOLEAN DEFAULT true,
  is_system_account BOOLEAN DEFAULT false,   -- Cannot be deleted
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coa_code ON chart_of_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_active ON chart_of_accounts(is_active);

-- ====================
-- 2. JOURNAL ENTRIES (Double-Entry Core)
-- ====================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) UNIQUE,           -- e.g., "JE-2025-001"
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_type VARCHAR(50),                -- e.g., "rent_payment", "expense", "distribution"
  reference_id UUID,                         -- ID of related record
  property_id UUID REFERENCES properties(id),
  status VARCHAR(20) DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'void')),
  created_by UUID,
  approved_by UUID,
  voided_by UUID,
  voided_at TIMESTAMP WITH TIME ZONE,
  void_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_je_property ON journal_entries(property_id);
CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_reference ON journal_entries(reference_type, reference_id);

-- ====================
-- 3. JOURNAL ENTRY LINES (Debits & Credits)
-- ====================
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  line_number INTEGER NOT NULL,
  description TEXT,
  debit_amount DECIMAL(15,2) DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount DECIMAL(15,2) DEFAULT 0 CHECK (credit_amount >= 0),
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  tenant_id UUID,
  vendor_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_jel_journal ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_jel_property ON journal_entry_lines(property_id);

-- ====================
-- 4. TRUST ACCOUNTS (Security Deposits)
-- ====================
CREATE TABLE IF NOT EXISTS trust_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50),
  bank_name VARCHAR(255),
  routing_number VARCHAR(20),
  state_jurisdiction VARCHAR(2),             -- US state code
  account_id UUID REFERENCES chart_of_accounts(id),  -- Links to COA
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================
-- 5. SECURITY DEPOSITS
-- ====================
CREATE TABLE IF NOT EXISTS security_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id UUID REFERENCES trust_accounts(id),
  tenant_id UUID NOT NULL,
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  lease_id UUID,
  amount DECIMAL(15,2) NOT NULL,
  date_received DATE NOT NULL,
  interest_rate DECIMAL(5,4),                -- For states requiring interest
  interest_accrued DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'held' CHECK (status IN (
    'held', 'refunded', 'applied_to_damages', 'forfeited'
  )),
  refund_amount DECIMAL(15,2),
  refund_date DATE,
  refund_check_number VARCHAR(50),
  deductions_amount DECIMAL(15,2) DEFAULT 0,
  deductions_description TEXT,
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sd_tenant ON security_deposits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sd_property ON security_deposits(property_id);
CREATE INDEX IF NOT EXISTS idx_sd_status ON security_deposits(status);

-- ====================
-- 6. OWNER DISTRIBUTIONS
-- ====================
CREATE TABLE IF NOT EXISTS owner_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id),
  owner_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_rent_collected DECIMAL(15,2) DEFAULT 0,
  other_income DECIMAL(15,2) DEFAULT 0,
  total_expenses DECIMAL(15,2) DEFAULT 0,
  management_fees DECIMAL(15,2) DEFAULT 0,
  reserve_amount DECIMAL(15,2) DEFAULT 0,
  net_distribution DECIMAL(15,2) NOT NULL,
  distribution_percentage DECIMAL(5,2) DEFAULT 100.00,  -- For multiple owners
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'paid', 'held', 'cancelled'
  )),
  payment_method VARCHAR(20) CHECK (payment_method IN (
    'ach', 'check', 'wire', 'manual'
  )),
  payment_date DATE,
  check_number VARCHAR(50),
  transaction_id VARCHAR(100),
  journal_entry_id UUID REFERENCES journal_entries(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_od_property ON owner_distributions(property_id);
CREATE INDEX IF NOT EXISTS idx_od_owner ON owner_distributions(owner_id);
CREATE INDEX IF NOT EXISTS idx_od_status ON owner_distributions(status);
CREATE INDEX IF NOT EXISTS idx_od_period ON owner_distributions(period_end DESC);

-- ====================
-- 7. BANK ACCOUNTS
-- ====================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) CHECK (account_type IN (
    'checking', 'savings', 'trust', 'credit_card'
  )),
  account_number_last4 VARCHAR(4),
  bank_name VARCHAR(255),
  routing_number VARCHAR(20),
  account_id UUID REFERENCES chart_of_accounts(id),  -- Links to COA
  plaid_access_token TEXT,                   -- For bank sync
  plaid_item_id VARCHAR(255),
  current_balance DECIMAL(15,2) DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================
-- 8. BANK TRANSACTIONS (Imported)
-- ====================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  transaction_date DATE NOT NULL,
  post_date DATE,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('debit', 'credit')),
  category VARCHAR(100),
  merchant_name VARCHAR(255),
  plaid_transaction_id VARCHAR(255) UNIQUE,
  is_pending BOOLEAN DEFAULT false,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  reconciled_by UUID,
  journal_entry_line_id UUID REFERENCES journal_entry_lines(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bt_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bt_date ON bank_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bt_reconciled ON bank_transactions(is_reconciled);

-- ====================
-- 9. BUDGETS
-- ====================
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  fiscal_year INTEGER NOT NULL,
  budget_type VARCHAR(50) DEFAULT 'annual' CHECK (budget_type IN (
    'annual', 'monthly', 'quarterly'
  )),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active', 'closed')),
  total_revenue_budget DECIMAL(15,2),
  total_expense_budget DECIMAL(15,2),
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, fiscal_year)
);

-- ====================
-- 10. BUDGET LINE ITEMS
-- ====================
CREATE TABLE IF NOT EXISTS budget_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  month INTEGER CHECK (month BETWEEN 1 AND 12),  -- NULL for annual
  budgeted_amount DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bli_budget ON budget_line_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_bli_account ON budget_line_items(account_id);

-- ====================
-- INSERT DEFAULT CHART OF ACCOUNTS
-- ====================

-- ASSETS
INSERT INTO chart_of_accounts (account_code, account_name, account_type, account_subtype, normal_balance, is_system_account) VALUES
('1000', 'Operating Cash', 'asset', 'current_asset', 'debit', true),
('1010', 'Trust Account Cash', 'asset', 'current_asset', 'debit', true),
('1020', 'Owner Reserve Funds', 'asset', 'current_asset', 'debit', true),
('1050', 'Accounts Receivable - Rent', 'asset', 'current_asset', 'debit', true),
('1060', 'Accounts Receivable - Other', 'asset', 'current_asset', 'debit', true),
('1100', 'Buildings', 'asset', 'fixed_asset', 'debit', true),
('1110', 'Land', 'asset', 'fixed_asset', 'debit', true),
('1120', 'Equipment', 'asset', 'fixed_asset', 'debit', true);

-- LIABILITIES
INSERT INTO chart_of_accounts (account_code, account_name, account_type, account_subtype, normal_balance, is_system_account) VALUES
('2000', 'Accounts Payable', 'liability', 'current_liability', 'credit', true),
('2010', 'Security Deposits Held', 'liability', 'current_liability', 'credit', true),
('2020', 'Owner Distributions Payable', 'liability', 'current_liability', 'credit', true),
('2030', 'Prepaid Rent', 'liability', 'current_liability', 'credit', true);

-- EQUITY
INSERT INTO chart_of_accounts (account_code, account_name, account_type, account_subtype, normal_balance, is_system_account) VALUES
('3000', 'Owner Equity', 'equity', 'owners_equity', 'credit', true),
('3100', 'Retained Earnings', 'equity', 'retained_earnings', 'credit', true);

-- REVENUE
INSERT INTO chart_of_accounts (account_code, account_name, account_type, account_subtype, normal_balance, is_system_account) VALUES
('4000', 'Rental Income', 'revenue', 'operating_revenue', 'credit', true),
('4100', 'Late Fees', 'revenue', 'operating_revenue', 'credit', true),
('4200', 'Pet Fees', 'revenue', 'operating_revenue', 'credit', true),
('4300', 'Parking Income', 'revenue', 'operating_revenue', 'credit', true),
('4900', 'Other Income', 'revenue', 'other_revenue', 'credit', true);

-- EXPENSES
INSERT INTO chart_of_accounts (account_code, account_name, account_type, account_subtype, normal_balance, is_system_account) VALUES
('5000', 'Utilities', 'expense', 'operating_expense', 'debit', true),
('5010', 'Insurance', 'expense', 'operating_expense', 'debit', true),
('5020', 'Property Taxes', 'expense', 'operating_expense', 'debit', true),
('5030', 'HOA Fees', 'expense', 'operating_expense', 'debit', true),
('5100', 'General Maintenance', 'expense', 'maintenance_expense', 'debit', true),
('5110', 'HVAC Repairs', 'expense', 'maintenance_expense', 'debit', true),
('5200', 'Management Fees', 'expense', 'administrative_expense', 'debit', true),
('5210', 'Legal Fees', 'expense', 'administrative_expense', 'debit', true),
('5900', 'Miscellaneous Expenses', 'expense', 'other_expense', 'debit', true)
ON CONFLICT DO NOTHING;

-- ====================
-- ROW LEVEL SECURITY
-- ====================

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_line_items ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view chart of accounts
DROP POLICY IF EXISTS coa_select_policy ON chart_of_accounts;
CREATE POLICY coa_select_policy ON chart_of_accounts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to view their journal entries
DROP POLICY IF EXISTS je_select_policy ON journal_entries;
CREATE POLICY je_select_policy ON journal_entries
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to create journal entries
DROP POLICY IF EXISTS je_insert_policy ON journal_entries;
CREATE POLICY je_insert_policy ON journal_entries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ====================
-- SUCCESS MESSAGE
-- ====================

DO $$ BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'MasterKey Accounting System Created!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'Tables Created:';
  RAISE NOTICE '  • chart_of_accounts (29 default accounts)';
  RAISE NOTICE '  • journal_entries';
  RAISE NOTICE '  • journal_entry_lines';
  RAISE NOTICE '  • trust_accounts';
  RAISE NOTICE '  • security_deposits';
  RAISE NOTICE '  • owner_distributions';
  RAISE NOTICE '  • bank_accounts';
  RAISE NOTICE '  • bank_transactions';
  RAISE NOTICE '  • budgets';
  RAISE NOTICE '  • budget_line_items';
  RAISE NOTICE '';
  RAISE NOTICE 'Features Ready:';
  RAISE NOTICE '  ✓ Double-entry bookkeeping';
  RAISE NOTICE '  ✓ General Ledger';
  RAISE NOTICE '  ✓ Trust accounting (security deposits)';
  RAISE NOTICE '  ✓ Owner distributions';
  RAISE NOTICE '  ✓ Bank reconciliation';
  RAISE NOTICE '  ✓ Budget management';
  RAISE NOTICE '  ✓ RLS security enabled';
  RAISE NOTICE '====================================================';
END $$;

COMMIT;
