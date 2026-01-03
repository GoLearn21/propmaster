-- MASTERKEY ACCOUNTING v7.2 TITANIUM
-- Extended Tables for Phase 5+ Implementation
--
-- This migration adds tables for:
-- - Payment Processing
-- - Owner Distributions
-- - Sweep Operations
-- - Bill Pay / Vendor Payments
-- - Security Deposits
-- - Bank Integration
-- - Tenant Ledger
-- - Tax Compliance (1099)

-- =============================================
-- PAYMENT PROCESSING
-- =============================================

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    charge_id UUID NOT NULL REFERENCES tenant_charges(id),
    amount_applied DECIMAL(14,4) NOT NULL,
    applied_date DATE NOT NULL,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_charge ON payment_allocations(charge_id);

CREATE TABLE IF NOT EXISTS tenant_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    property_id UUID NOT NULL REFERENCES properties(id),
    amount DECIMAL(14,4) NOT NULL,
    credit_date DATE NOT NULL,
    source_payment_id UUID,
    description TEXT,
    applied_date DATE,
    applied_to_charge_id UUID REFERENCES tenant_charges(id),
    status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_credits_tenant ON tenant_credits(tenant_id);
CREATE INDEX idx_tenant_credits_property ON tenant_credits(property_id);

-- =============================================
-- OWNER DISTRIBUTIONS
-- =============================================

CREATE TABLE IF NOT EXISTS owner_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    owner_id UUID NOT NULL REFERENCES owners(id),
    property_id UUID NOT NULL REFERENCES properties(id),
    distribution_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    amount DECIMAL(14,4) NOT NULL,
    journal_entry_id UUID REFERENCES journal_entries(id),
    payment_method VARCHAR(20) DEFAULT 'ach',
    status VARCHAR(20) DEFAULT 'pending',
    bank_confirmation VARCHAR(100),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_owner_distributions_owner ON owner_distributions(owner_id);
CREATE INDEX idx_owner_distributions_date ON owner_distributions(distribution_date);
CREATE INDEX idx_owner_distributions_status ON owner_distributions(status);

CREATE TABLE IF NOT EXISTS nacha_files (
    id VARCHAR(100) PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    distribution_id UUID,
    file_content TEXT NOT NULL,
    batch_count INTEGER NOT NULL,
    entry_count INTEGER NOT NULL,
    total_debit DECIMAL(14,4) NOT NULL DEFAULT 0,
    total_credit DECIMAL(14,4) NOT NULL,
    effective_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'generated',
    bank_submission_id VARCHAR(100),
    bank_confirmation VARCHAR(100),
    submitted_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nacha_files_org ON nacha_files(organization_id);
CREATE INDEX idx_nacha_files_status ON nacha_files(status);

-- =============================================
-- SWEEP OPERATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS sweep_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    sweep_type VARCHAR(30) NOT NULL,
    sweep_date DATE NOT NULL,
    total_amount DECIMAL(14,4) NOT NULL,
    item_count INTEGER NOT NULL,
    journal_entry_ids UUID[],
    bank_transfer_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    reconciliation_result JSONB,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sweep_history_org ON sweep_history(organization_id);
CREATE INDEX idx_sweep_history_type ON sweep_history(sweep_type);
CREATE INDEX idx_sweep_history_date ON sweep_history(sweep_date);

CREATE TABLE IF NOT EXISTS sweep_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    sweep_type VARCHAR(30) NOT NULL,
    max_amount DECIMAL(14,4) NOT NULL,
    authorized_by UUID,
    authorized_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active',
    notes TEXT
);

CREATE INDEX idx_sweep_auth_org ON sweep_authorizations(organization_id);

-- =============================================
-- VENDOR PAYMENTS / BILL PAY
-- =============================================

CREATE TABLE IF NOT EXISTS vendor_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    invoice_number VARCHAR(100),
    invoice_date DATE NOT NULL,
    due_date DATE,
    amount DECIMAL(14,4) NOT NULL,
    amount_due DECIMAL(14,4) NOT NULL,
    amount_paid DECIMAL(14,4) DEFAULT 0,
    description TEXT,
    property_id UUID REFERENCES properties(id),
    expense_account_id UUID REFERENCES chart_of_accounts(id),
    status VARCHAR(20) DEFAULT 'unpaid',
    paid_date DATE,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_bills_vendor ON vendor_bills(vendor_id);
CREATE INDEX idx_vendor_bills_status ON vendor_bills(status);
CREATE INDEX idx_vendor_bills_due ON vendor_bills(due_date);

CREATE TABLE IF NOT EXISTS vendor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    bill_id UUID REFERENCES vendor_bills(id),
    payment_date DATE NOT NULL,
    amount DECIMAL(14,4) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    check_number VARCHAR(50),
    ach_trace_number VARCHAR(100),
    invoice_number VARCHAR(100),
    journal_entry_id UUID REFERENCES journal_entries(id),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vendor_payments_vendor ON vendor_payments(vendor_id);
CREATE INDEX idx_vendor_payments_date ON vendor_payments(payment_date);
CREATE UNIQUE INDEX idx_vendor_payments_invoice ON vendor_payments(vendor_id, invoice_number)
    WHERE invoice_number IS NOT NULL AND status != 'voided';

CREATE TABLE IF NOT EXISTS vendor_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    check_number VARCHAR(50) NOT NULL,
    amount DECIMAL(14,4) NOT NULL,
    check_date DATE NOT NULL,
    memo TEXT,
    journal_entry_id UUID REFERENCES journal_entries(id),
    status VARCHAR(20) DEFAULT 'printed',
    cleared_date DATE,
    voided_date DATE,
    voided_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_vendor_checks_number ON vendor_checks(organization_id, check_number);

-- =============================================
-- SECURITY DEPOSITS
-- =============================================

CREATE TABLE IF NOT EXISTS security_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    property_id UUID NOT NULL REFERENCES properties(id),
    lease_id UUID REFERENCES leases(id),
    amount DECIMAL(14,4) NOT NULL,
    collected_date DATE NOT NULL,
    state_code VARCHAR(2),
    interest_rate DECIMAL(6,4) DEFAULT 0,
    requires_separate_account BOOLEAN DEFAULT FALSE,
    journal_entry_id UUID REFERENCES journal_entries(id),
    status VARCHAR(20) DEFAULT 'held',
    returned_date DATE,
    interest_paid DECIMAL(14,4),
    deductions_total DECIMAL(14,4),
    refund_amount DECIMAL(14,4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_deposits_tenant ON security_deposits(tenant_id);
CREATE INDEX idx_security_deposits_property ON security_deposits(property_id);
CREATE INDEX idx_security_deposits_status ON security_deposits(status);

CREATE TABLE IF NOT EXISTS move_out_damages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    property_id UUID NOT NULL REFERENCES properties(id),
    damage_type VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(14,4) NOT NULL,
    invoice_id UUID,
    photo_urls TEXT[],
    status VARCHAR(20) DEFAULT 'pending',
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_damages_tenant ON move_out_damages(tenant_id);

CREATE TABLE IF NOT EXISTS security_deposit_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deposit_id UUID NOT NULL REFERENCES security_deposits(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    property_id UUID NOT NULL REFERENCES properties(id),
    statement_html TEXT,
    generated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_deposit_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deposit_id UUID NOT NULL REFERENCES security_deposits(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    amount DECIMAL(14,4) NOT NULL,
    check_number VARCHAR(50),
    issue_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'issued',
    cleared_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BANK INTEGRATION
-- =============================================

CREATE TABLE IF NOT EXISTS organization_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    account_type VARCHAR(20) NOT NULL,
    bank_name VARCHAR(100),
    routing_number VARCHAR(9),
    account_number VARCHAR(17),
    bank_id VARCHAR(100),
    plaid_access_token TEXT,
    plaid_item_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_bank_accounts ON organization_bank_accounts(organization_id);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    bank_account_id UUID NOT NULL REFERENCES organization_bank_accounts(id),
    plaid_transaction_id VARCHAR(100),
    transaction_date DATE NOT NULL,
    amount DECIMAL(14,4) NOT NULL,
    description TEXT,
    merchant_name VARCHAR(200),
    category VARCHAR(100),
    pending BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    status VARCHAR(20) DEFAULT 'unmatched',
    journal_entry_id UUID REFERENCES journal_entries(id),
    matched_at TIMESTAMPTZ,
    match_rule_id UUID,
    match_confidence DECIMAL(5,4),
    reconciled_at TIMESTAMPTZ,
    reconciliation_session_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_txn_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_txn_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_txn_status ON bank_transactions(status);
CREATE UNIQUE INDEX idx_bank_txn_plaid ON bank_transactions(plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS bank_matching_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 100,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    account_id UUID REFERENCES chart_of_accounts(id),
    property_id UUID REFERENCES properties(id),
    is_active BOOLEAN DEFAULT TRUE,
    match_count INTEGER DEFAULT 0,
    last_matched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matching_rules_org ON bank_matching_rules(organization_id);
CREATE INDEX idx_matching_rules_active ON bank_matching_rules(is_active, priority);

CREATE TABLE IF NOT EXISTS reconciliation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    bank_account_id UUID NOT NULL REFERENCES organization_bank_accounts(id),
    statement_date DATE NOT NULL,
    statement_balance DECIMAL(14,4) NOT NULL,
    book_balance DECIMAL(14,4) NOT NULL,
    status VARCHAR(20) DEFAULT 'in_progress',
    variance DECIMAL(14,4),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_recon_sessions_account ON reconciliation_sessions(bank_account_id);

-- =============================================
-- TENANT LEDGER
-- =============================================

CREATE TABLE IF NOT EXISTS tenant_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    property_id UUID NOT NULL REFERENCES properties(id),
    statement_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    opening_balance DECIMAL(14,4) NOT NULL,
    closing_balance DECIMAL(14,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_statements ON tenant_statements(tenant_id, statement_date);

CREATE TABLE IF NOT EXISTS payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    property_id UUID REFERENCES properties(id),
    total_amount DECIMAL(14,4) NOT NULL,
    number_of_payments INTEGER NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    schedule JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_plans_tenant ON payment_plans(tenant_id);
CREATE INDEX idx_payment_plans_status ON payment_plans(status);

-- =============================================
-- TAX COMPLIANCE (1099)
-- =============================================

CREATE TABLE IF NOT EXISTS vendor_1099_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    tax_year INTEGER NOT NULL,
    ytd_amount DECIMAL(14,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, vendor_id, tax_year)
);

CREATE INDEX idx_1099_tracking_year ON vendor_1099_tracking(tax_year);
CREATE INDEX idx_1099_tracking_vendor ON vendor_1099_tracking(vendor_id);

CREATE TABLE IF NOT EXISTS form_1099_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    tax_year INTEGER NOT NULL,
    form_type VARCHAR(20) NOT NULL,
    recipient_type VARCHAR(20) NOT NULL,
    form_count INTEGER NOT NULL,
    error_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'generated',
    fire_file_id VARCHAR(100),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

CREATE INDEX idx_1099_batches_year ON form_1099_batches(tax_year);

CREATE TABLE IF NOT EXISTS form_1099_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES form_1099_batches(id),
    form_type VARCHAR(20) NOT NULL,
    tax_year INTEGER NOT NULL,
    recipient_tin VARCHAR(11) NOT NULL,
    recipient_name VARCHAR(200) NOT NULL,
    amount DECIMAL(14,4) NOT NULL,
    form_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_1099_records_batch ON form_1099_records(batch_id);

CREATE TABLE IF NOT EXISTS fire_files (
    id VARCHAR(100) PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES form_1099_batches(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    tax_year INTEGER NOT NULL,
    file_content TEXT NOT NULL,
    record_count INTEGER NOT NULL,
    payee_count INTEGER NOT NULL,
    total_amount DECIMAL(14,4) NOT NULL,
    status VARCHAR(20) DEFAULT 'generated',
    submitted_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejection_reason TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get next check number
CREATE OR REPLACE FUNCTION get_next_check_number(p_org_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(check_number AS INTEGER)), 1000) + 1
    INTO v_next_number
    FROM vendor_checks
    WHERE organization_id = p_org_id
    AND check_number ~ '^[0-9]+$';

    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

-- Calculate tenant aging
CREATE OR REPLACE FUNCTION get_tenant_aging(p_tenant_id UUID)
RETURNS TABLE (
    current_due DECIMAL,
    days_30 DECIMAL,
    days_60 DECIMAL,
    days_90 DECIMAL,
    over_90 DECIMAL,
    total_due DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN balance_due ELSE 0 END), 0) as current_due,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30 THEN balance_due ELSE 0 END), 0) as days_30,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60 THEN balance_due ELSE 0 END), 0) as days_60,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 60 AND due_date >= CURRENT_DATE - 90 THEN balance_due ELSE 0 END), 0) as days_90,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE - 90 THEN balance_due ELSE 0 END), 0) as over_90,
        COALESCE(SUM(balance_due), 0) as total_due
    FROM tenant_charges
    WHERE tenant_id = p_tenant_id
    AND balance_due > 0;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on new tables
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nacha_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE sweep_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_matching_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_1099_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_1099_batches ENABLE ROW LEVEL SECURITY;

-- Policies follow the same pattern as existing tables
-- (organization-scoped access)

COMMENT ON TABLE payment_allocations IS 'TITANIUM: Payment allocation to charges';
COMMENT ON TABLE owner_distributions IS 'TITANIUM: Owner payout records with NACHA tracking';
COMMENT ON TABLE sweep_history IS 'TITANIUM: Trust account sweep audit trail';
COMMENT ON TABLE security_deposits IS 'TITANIUM: Security deposit lifecycle with state compliance';
COMMENT ON TABLE bank_transactions IS 'TITANIUM: Bank feed transactions from Plaid';
COMMENT ON TABLE vendor_1099_tracking IS 'TITANIUM: YTD 1099 tracking per vendor';
