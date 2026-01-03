/**
 * Chart of Accounts Generator
 * Generates standard property management chart of accounts
 */

import { accountId, uuid } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import { isoTimestamp, monthsAgo } from '../../utils/date-utils.mjs';
import { CHART_OF_ACCOUNTS } from '../../config/seed-config.mjs';

/**
 * Account type hierarchy
 */
const ACCOUNT_TYPES = {
  asset: { normalBalance: 'debit', order: 1 },
  liability: { normalBalance: 'credit', order: 2 },
  equity: { normalBalance: 'credit', order: 3 },
  revenue: { normalBalance: 'credit', order: 4 },
  expense: { normalBalance: 'debit', order: 5 },
};

/**
 * Standard property management chart of accounts
 * Following GAAP structure with PM-specific accounts
 */
const STANDARD_COA = [
  // ASSETS (1xxx)
  { code: '1000', name: 'Cash and Cash Equivalents', type: 'asset', category: 'current_asset', is_header: true },
  { code: '1010', name: 'Operating Cash', type: 'asset', category: 'current_asset', parent: '1000' },
  { code: '1020', name: 'Trust Account - Security Deposits', type: 'asset', category: 'current_asset', parent: '1000', is_trust: true },
  { code: '1025', name: 'Trust Account - Prepaid Rent', type: 'asset', category: 'current_asset', parent: '1000', is_trust: true },
  { code: '1030', name: 'Petty Cash', type: 'asset', category: 'current_asset', parent: '1000' },
  { code: '1040', name: 'Undeposited Funds', type: 'asset', category: 'current_asset', parent: '1000' },

  { code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'current_asset', is_header: true },
  { code: '1110', name: 'Tenant Receivables', type: 'asset', category: 'current_asset', parent: '1100' },
  { code: '1115', name: 'Late Fee Receivables', type: 'asset', category: 'current_asset', parent: '1100' },
  { code: '1120', name: 'NSF Check Receivables', type: 'asset', category: 'current_asset', parent: '1100' },
  { code: '1130', name: 'Owner Receivables', type: 'asset', category: 'current_asset', parent: '1100' },
  { code: '1140', name: 'Other Receivables', type: 'asset', category: 'current_asset', parent: '1100' },
  { code: '1199', name: 'Allowance for Doubtful Accounts', type: 'asset', category: 'current_asset', parent: '1100', is_contra: true },

  { code: '1200', name: 'Prepaid Expenses', type: 'asset', category: 'current_asset', is_header: true },
  { code: '1210', name: 'Prepaid Insurance', type: 'asset', category: 'current_asset', parent: '1200' },
  { code: '1220', name: 'Prepaid Taxes', type: 'asset', category: 'current_asset', parent: '1200' },

  { code: '1500', name: 'Fixed Assets', type: 'asset', category: 'fixed_asset', is_header: true },
  { code: '1510', name: 'Land', type: 'asset', category: 'fixed_asset', parent: '1500' },
  { code: '1520', name: 'Buildings', type: 'asset', category: 'fixed_asset', parent: '1500' },
  { code: '1525', name: 'Accumulated Depreciation - Buildings', type: 'asset', category: 'fixed_asset', parent: '1500', is_contra: true },
  { code: '1530', name: 'Improvements', type: 'asset', category: 'fixed_asset', parent: '1500' },
  { code: '1535', name: 'Accumulated Depreciation - Improvements', type: 'asset', category: 'fixed_asset', parent: '1500', is_contra: true },
  { code: '1540', name: 'Equipment', type: 'asset', category: 'fixed_asset', parent: '1500' },
  { code: '1545', name: 'Accumulated Depreciation - Equipment', type: 'asset', category: 'fixed_asset', parent: '1500', is_contra: true },

  // LIABILITIES (2xxx)
  { code: '2000', name: 'Accounts Payable', type: 'liability', category: 'current_liability', is_header: true },
  { code: '2010', name: 'Trade Payables', type: 'liability', category: 'current_liability', parent: '2000' },
  { code: '2020', name: 'Vendor Payables', type: 'liability', category: 'current_liability', parent: '2000' },
  { code: '2030', name: 'Accrued Expenses', type: 'liability', category: 'current_liability', parent: '2000' },

  { code: '2100', name: 'Trust Liabilities', type: 'liability', category: 'current_liability', is_header: true, is_trust: true },
  { code: '2110', name: 'Security Deposits Held', type: 'liability', category: 'current_liability', parent: '2100', is_trust: true },
  { code: '2120', name: 'Prepaid Rent Held', type: 'liability', category: 'current_liability', parent: '2100', is_trust: true },
  { code: '2130', name: 'Owner Funds Held', type: 'liability', category: 'current_liability', parent: '2100', is_trust: true },

  { code: '2200', name: 'Payroll Liabilities', type: 'liability', category: 'current_liability', is_header: true },
  { code: '2210', name: 'Wages Payable', type: 'liability', category: 'current_liability', parent: '2200' },
  { code: '2220', name: 'Payroll Taxes Payable', type: 'liability', category: 'current_liability', parent: '2200' },
  { code: '2230', name: 'Benefits Payable', type: 'liability', category: 'current_liability', parent: '2200' },

  { code: '2300', name: 'Other Current Liabilities', type: 'liability', category: 'current_liability', is_header: true },
  { code: '2310', name: 'Sales Tax Payable', type: 'liability', category: 'current_liability', parent: '2300' },
  { code: '2320', name: 'Deferred Revenue', type: 'liability', category: 'current_liability', parent: '2300' },

  { code: '2500', name: 'Long-Term Liabilities', type: 'liability', category: 'long_term_liability', is_header: true },
  { code: '2510', name: 'Mortgage Payable', type: 'liability', category: 'long_term_liability', parent: '2500' },
  { code: '2520', name: 'Notes Payable', type: 'liability', category: 'long_term_liability', parent: '2500' },

  // EQUITY (3xxx)
  { code: '3000', name: 'Owner\'s Equity', type: 'equity', category: 'equity', is_header: true },
  { code: '3010', name: 'Owner\'s Capital', type: 'equity', category: 'equity', parent: '3000' },
  { code: '3020', name: 'Owner\'s Draws', type: 'equity', category: 'equity', parent: '3000', is_contra: true },
  { code: '3030', name: 'Retained Earnings', type: 'equity', category: 'equity', parent: '3000' },
  { code: '3040', name: 'Current Year Earnings', type: 'equity', category: 'equity', parent: '3000' },

  // REVENUE (4xxx)
  { code: '4000', name: 'Rental Income', type: 'revenue', category: 'operating_revenue', is_header: true },
  { code: '4010', name: 'Residential Rent', type: 'revenue', category: 'operating_revenue', parent: '4000' },
  { code: '4020', name: 'Commercial Rent', type: 'revenue', category: 'operating_revenue', parent: '4000' },
  { code: '4030', name: 'Parking Income', type: 'revenue', category: 'operating_revenue', parent: '4000' },
  { code: '4040', name: 'Storage Income', type: 'revenue', category: 'operating_revenue', parent: '4000' },
  { code: '4050', name: 'Pet Rent', type: 'revenue', category: 'operating_revenue', parent: '4000' },

  { code: '4100', name: 'Fee Income', type: 'revenue', category: 'operating_revenue', is_header: true },
  { code: '4110', name: 'Late Fees', type: 'revenue', category: 'operating_revenue', parent: '4100' },
  { code: '4120', name: 'NSF Fees', type: 'revenue', category: 'operating_revenue', parent: '4100' },
  { code: '4130', name: 'Application Fees', type: 'revenue', category: 'operating_revenue', parent: '4100' },
  { code: '4140', name: 'Lease Termination Fees', type: 'revenue', category: 'operating_revenue', parent: '4100' },
  { code: '4150', name: 'Month-to-Month Fees', type: 'revenue', category: 'operating_revenue', parent: '4100' },

  { code: '4200', name: 'Management Fees', type: 'revenue', category: 'operating_revenue', is_header: true },
  { code: '4210', name: 'Property Management Fees', type: 'revenue', category: 'operating_revenue', parent: '4200' },
  { code: '4220', name: 'Leasing Fees', type: 'revenue', category: 'operating_revenue', parent: '4200' },
  { code: '4230', name: 'Maintenance Markup', type: 'revenue', category: 'operating_revenue', parent: '4200' },

  { code: '4300', name: 'Other Income', type: 'revenue', category: 'other_revenue', is_header: true },
  { code: '4310', name: 'Interest Income', type: 'revenue', category: 'other_revenue', parent: '4300' },
  { code: '4320', name: 'Deposit Forfeiture', type: 'revenue', category: 'other_revenue', parent: '4300' },
  { code: '4330', name: 'Damage Recoveries', type: 'revenue', category: 'other_revenue', parent: '4300' },
  { code: '4340', name: 'Miscellaneous Income', type: 'revenue', category: 'other_revenue', parent: '4300' },

  // EXPENSES (5xxx - Operating)
  { code: '5000', name: 'Property Operating Expenses', type: 'expense', category: 'operating_expense', is_header: true },
  { code: '5010', name: 'Repairs and Maintenance', type: 'expense', category: 'operating_expense', parent: '5000' },
  { code: '5020', name: 'Landscaping', type: 'expense', category: 'operating_expense', parent: '5000' },
  { code: '5030', name: 'Cleaning and Janitorial', type: 'expense', category: 'operating_expense', parent: '5000' },
  { code: '5040', name: 'Pest Control', type: 'expense', category: 'operating_expense', parent: '5000' },
  { code: '5050', name: 'Snow Removal', type: 'expense', category: 'operating_expense', parent: '5000' },
  { code: '5060', name: 'Pool and Spa Maintenance', type: 'expense', category: 'operating_expense', parent: '5000' },
  { code: '5070', name: 'Security', type: 'expense', category: 'operating_expense', parent: '5000' },

  { code: '5100', name: 'Utilities', type: 'expense', category: 'operating_expense', is_header: true },
  { code: '5110', name: 'Electric', type: 'expense', category: 'operating_expense', parent: '5100' },
  { code: '5120', name: 'Gas', type: 'expense', category: 'operating_expense', parent: '5100' },
  { code: '5130', name: 'Water and Sewer', type: 'expense', category: 'operating_expense', parent: '5100' },
  { code: '5140', name: 'Trash Removal', type: 'expense', category: 'operating_expense', parent: '5100' },
  { code: '5150', name: 'Internet and Cable', type: 'expense', category: 'operating_expense', parent: '5100' },

  { code: '5200', name: 'Insurance', type: 'expense', category: 'operating_expense', is_header: true },
  { code: '5210', name: 'Property Insurance', type: 'expense', category: 'operating_expense', parent: '5200' },
  { code: '5220', name: 'Liability Insurance', type: 'expense', category: 'operating_expense', parent: '5200' },
  { code: '5230', name: 'Workers Compensation', type: 'expense', category: 'operating_expense', parent: '5200' },

  { code: '5300', name: 'Property Taxes', type: 'expense', category: 'operating_expense', is_header: true },
  { code: '5310', name: 'Real Estate Taxes', type: 'expense', category: 'operating_expense', parent: '5300' },
  { code: '5320', name: 'Personal Property Taxes', type: 'expense', category: 'operating_expense', parent: '5300' },

  // EXPENSES (6xxx - Administrative)
  { code: '6000', name: 'Administrative Expenses', type: 'expense', category: 'admin_expense', is_header: true },
  { code: '6010', name: 'Office Supplies', type: 'expense', category: 'admin_expense', parent: '6000' },
  { code: '6020', name: 'Postage and Shipping', type: 'expense', category: 'admin_expense', parent: '6000' },
  { code: '6030', name: 'Telephone', type: 'expense', category: 'admin_expense', parent: '6000' },
  { code: '6040', name: 'Software and Technology', type: 'expense', category: 'admin_expense', parent: '6000' },
  { code: '6050', name: 'Bank Charges', type: 'expense', category: 'admin_expense', parent: '6000' },
  { code: '6060', name: 'Credit Card Processing Fees', type: 'expense', category: 'admin_expense', parent: '6000' },

  { code: '6100', name: 'Professional Fees', type: 'expense', category: 'admin_expense', is_header: true },
  { code: '6110', name: 'Legal Fees', type: 'expense', category: 'admin_expense', parent: '6100' },
  { code: '6120', name: 'Accounting Fees', type: 'expense', category: 'admin_expense', parent: '6100' },
  { code: '6130', name: 'Consulting Fees', type: 'expense', category: 'admin_expense', parent: '6100' },

  { code: '6200', name: 'Marketing and Advertising', type: 'expense', category: 'admin_expense', is_header: true },
  { code: '6210', name: 'Listing Services', type: 'expense', category: 'admin_expense', parent: '6200' },
  { code: '6220', name: 'Signage', type: 'expense', category: 'admin_expense', parent: '6200' },
  { code: '6230', name: 'Promotional Materials', type: 'expense', category: 'admin_expense', parent: '6200' },

  { code: '6300', name: 'Payroll Expenses', type: 'expense', category: 'admin_expense', is_header: true },
  { code: '6310', name: 'Salaries and Wages', type: 'expense', category: 'admin_expense', parent: '6300' },
  { code: '6320', name: 'Payroll Taxes', type: 'expense', category: 'admin_expense', parent: '6300' },
  { code: '6330', name: 'Employee Benefits', type: 'expense', category: 'admin_expense', parent: '6300' },

  // EXPENSES (7xxx - Non-Operating)
  { code: '7000', name: 'Non-Operating Expenses', type: 'expense', category: 'non_operating', is_header: true },
  { code: '7010', name: 'Interest Expense', type: 'expense', category: 'non_operating', parent: '7000' },
  { code: '7020', name: 'Depreciation Expense', type: 'expense', category: 'non_operating', parent: '7000' },
  { code: '7030', name: 'Amortization Expense', type: 'expense', category: 'non_operating', parent: '7000' },
  { code: '7040', name: 'Bad Debt Expense', type: 'expense', category: 'non_operating', parent: '7000' },
  { code: '7050', name: 'Loss on Disposal', type: 'expense', category: 'non_operating', parent: '7000' },
];

/**
 * Generate a single account record
 * @param {object} accountDef - Account definition
 * @param {object} company - Company record
 * @param {number} index - Account index
 * @returns {object} Account record
 */
export function generateAccount(accountDef, company, index) {
  const id = accountId();
  const typeInfo = ACCOUNT_TYPES[accountDef.type];

  return {
    id,
    company_id: company?.id || null,

    // Account identifiers
    account_code: accountDef.code,
    account_name: accountDef.name,

    // Classification
    account_type: accountDef.type,
    category: accountDef.category,
    normal_balance: typeInfo.normalBalance,

    // Hierarchy
    parent_account_code: accountDef.parent || null,
    is_header: accountDef.is_header || false,
    is_detail: !accountDef.is_header,
    level: accountDef.parent ? 2 : 1,
    sort_order: index,

    // Special flags
    is_trust_account: accountDef.is_trust || false,
    is_contra: accountDef.is_contra || false,
    is_system: true, // Standard COA accounts
    is_active: true,

    // Balance tracking
    current_balance: '0.0000',
    ytd_debits: '0.0000',
    ytd_credits: '0.0000',

    // Tax mapping
    tax_line: null,

    // Description
    description: null,

    // Timestamps
    created_at: monthsAgo(12),
    updated_at: isoTimestamp(),

    // Seed metadata
    metadata: seedMetadata(null, {
      seed_type: 'account',
      standard_coa: true,
      account_type: accountDef.type,
    }),
  };
}

/**
 * Generate full chart of accounts for a company
 * @param {object} company - Company record
 * @returns {object[]} Array of account records
 */
export function generateChartOfAccounts(company) {
  return STANDARD_COA.map((accountDef, index) =>
    generateAccount(accountDef, company, index)
  );
}

/**
 * Generate chart of accounts for all companies
 * @param {object[]} companies - Company records
 * @returns {object[]} All account records
 */
export function generateAllChartOfAccounts(companies) {
  const allAccounts = [];

  companies.forEach(company => {
    const companyAccounts = generateChartOfAccounts(company);
    allAccounts.push(...companyAccounts);
  });

  return allAccounts;
}

/**
 * Get account by code
 * @param {object[]} accounts - All accounts
 * @param {string} code - Account code
 * @param {string} companyId - Company ID
 * @returns {object|null} Account or null
 */
export function getAccountByCode(accounts, code, companyId) {
  return accounts.find(a =>
    a.account_code === code && a.company_id === companyId
  ) || null;
}

/**
 * Get all detail accounts (for posting)
 * @param {object[]} accounts - All accounts
 * @param {string} companyId - Company ID
 * @returns {object[]} Detail accounts
 */
export function getDetailAccounts(accounts, companyId) {
  return accounts.filter(a =>
    a.is_detail && a.company_id === companyId
  );
}

/**
 * Get trust-related accounts
 * @param {object[]} accounts - All accounts
 * @param {string} companyId - Company ID
 * @returns {object[]} Trust accounts
 */
export function getTrustAccounts(accounts, companyId) {
  return accounts.filter(a =>
    a.is_trust_account && a.company_id === companyId
  );
}

/**
 * Account code constants for easy reference
 */
export const ACCOUNT_CODES = {
  // Assets
  OPERATING_CASH: '1010',
  TRUST_SECURITY_DEPOSITS: '1020',
  TRUST_PREPAID_RENT: '1025',
  UNDEPOSITED_FUNDS: '1040',
  TENANT_RECEIVABLES: '1110',
  LATE_FEE_RECEIVABLES: '1115',
  NSF_RECEIVABLES: '1120',
  ALLOWANCE_DOUBTFUL: '1199',

  // Liabilities
  TRADE_PAYABLES: '2010',
  VENDOR_PAYABLES: '2020',
  SECURITY_DEPOSITS_HELD: '2110',
  PREPAID_RENT_HELD: '2120',
  OWNER_FUNDS_HELD: '2130',

  // Equity
  RETAINED_EARNINGS: '3030',
  CURRENT_YEAR_EARNINGS: '3040',

  // Revenue
  RESIDENTIAL_RENT: '4010',
  LATE_FEES: '4110',
  NSF_FEES: '4120',
  APPLICATION_FEES: '4130',
  MANAGEMENT_FEES: '4210',
  LEASING_FEES: '4220',
  INTEREST_INCOME: '4310',
  DEPOSIT_FORFEITURE: '4320',
  DAMAGE_RECOVERIES: '4330',

  // Expenses
  REPAIRS_MAINTENANCE: '5010',
  BANK_CHARGES: '6050',
  CC_PROCESSING_FEES: '6060',
  LEGAL_FEES: '6110',
  BAD_DEBT: '7040',
};

export default {
  generateAccount,
  generateChartOfAccounts,
  generateAllChartOfAccounts,
  getAccountByCode,
  getDetailAccounts,
  getTrustAccounts,
  ACCOUNT_CODES,
  STANDARD_COA,
};
