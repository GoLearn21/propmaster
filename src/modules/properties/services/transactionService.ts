// Transaction Service Layer for Property Module
import { supabase } from '../../../lib/supabase';
import type { 
  Transaction, 
  CreateTransactionInput, 
  UpdateTransactionInput,
  TransactionFilters,
  TransactionStats,
  TransactionSummary,
  PaginatedTransactions,
  BankAccount,
  TransactionTemplate,
  ReconciliationTransaction,
  BankReconciliation,
  TransactionBatch
} from '../types/transaction';

// Get all transactions with filters and pagination
export async function getTransactions(
  filters?: TransactionFilters,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedTransactions> {
  let query = supabase
    .from('transactions')
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      lease:leases(id, lease_number),
      tenant:tenants(id, first_name, last_name, email),
      vendor:vendors(id, name, company),
      owner:owners(id, first_name, last_name, email),
      bank_account:bank_accounts(id, nickname, bank_name),
      parent_transaction:transactions(id, description),
      created_by_user:users(id, first_name, last_name)
    `, { count: 'exact' })
    .order('transaction_date', { ascending: false });

  // Apply filters
  if (filters) {
    if (filters.property_id) {
      query = query.eq('property_id', filters.property_id);
    }
    if (filters.unit_id) {
      query = query.eq('unit_id', filters.unit_id);
    }
    if (filters.lease_id) {
      query = query.eq('lease_id', filters.lease_id);
    }
    if (filters.tenant_id) {
      query = query.eq('tenant_id', filters.tenant_id);
    }
    if (filters.vendor_id) {
      query = query.eq('vendor_id', filters.vendor_id);
    }
    if (filters.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }
    if (filters.transaction_type) {
      query = query.eq('transaction_type', filters.transaction_type);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.payment_method) {
      query = query.eq('payment_method', filters.payment_method);
    }
    if (filters.start_date) {
      query = query.gte('transaction_date', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('transaction_date', filters.end_date);
    }
    if (filters.amount_min) {
      query = query.gte('amount', filters.amount_min);
    }
    if (filters.amount_max) {
      query = query.lte('amount', filters.amount_max);
    }
    if (filters.bank_account_id) {
      query = query.eq('bank_account_id', filters.bank_account_id);
    }
    if (filters.unreconciled_only) {
      query = query.eq('bank_reconciled', false);
    }
    if (filters.search) {
      query = query.or(`description.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%,memo.ilike.%${filters.search}%`);
    }
  }

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    transactions: data || [],
    total: count || 0,
    page,
    limit,
    has_more: data && count ? from + limit < count : false,
  };
}

// Get transactions for a specific property
export async function getPropertyTransactions(
  propertyId: string,
  filters?: Omit<TransactionFilters, 'property_id'>,
  page?: number,
  limit?: number
) {
  const allFilters = { ...filters, property_id: propertyId };
  return getTransactions(allFilters, page, limit);
}

// Get single transaction by ID
export async function getTransaction(id: string): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      lease:leases(id, lease_number),
      tenant:tenants(id, first_name, last_name, email, phone),
      vendor:vendors(id, name, company, email, phone),
      owner:owners(id, first_name, last_name, email, phone),
      bank_account:bank_accounts(id, nickname, bank_name, account_number),
      parent_transaction:transactions(id, description, amount),
      child_transactions:transactions(*),
      created_by_user:users(id, first_name, last_name),
      approved_by_user:users(id, first_name, last_name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Create new transaction
export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'draft',
      bank_reconciled: false,
      created_by: (await supabase.auth.getUser()).data.user?.id || 'system',
    }])
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      lease:leases(id, lease_number),
      tenant:tenants(id, first_name, last_name, email),
      vendor:vendors(id, name, company),
      owner:owners(id, first_name, last_name, email),
      bank_account:bank_accounts(id, nickname, bank_name)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Update transaction
export async function updateTransaction(input: UpdateTransactionInput): Promise<Transaction> {
  const { id, ...updates } = input;
  
  const { data, error } = await supabase
    .from('transactions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      lease:leases(id, lease_number),
      tenant:tenants(id, first_name, last_name, email),
      vendor:vendors(id, name, company),
      owner:owners(id, first_name, last_name, email),
      bank_account:bank_accounts(id, nickname, bank_name)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Delete transaction
export async function deleteTransaction(id: string): Promise<boolean> {
  // First check if transaction has child transactions
  const { data: children } = await supabase
    .from('transactions')
    .select('id')
    .eq('parent_transaction_id', id);

  if (children && children.length > 0) {
    throw new Error('Cannot delete transaction with related transactions');
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// Approve transaction
export async function approveTransaction(id: string): Promise<Transaction> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('transactions')
    .update({
      status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      lease:leases(id, lease_number),
      tenant:tenants(id, first_name, last_name, email),
      vendor:vendors(id, name, company),
      owner:owners(id, first_name, last_name, email),
      bank_account:bank_accounts(id, nickname, bank_name)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Void transaction
export async function voidTransaction(id: string, reason?: string): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update({
      status: 'void',
      memo: reason ? `Voided: ${reason}` : 'Voided',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      property:properties(id, name, address),
      unit:units(id, unit_number),
      lease:leases(id, lease_number),
      tenant:tenants(id, first_name, last_name, email),
      vendor:vendors(id, name, company),
      owner:owners(id, first_name, last_name, email),
      bank_account:bank_accounts(id, nickname, bank_name)
    `)
    .single();

  if (error) throw error;
  return data;
}

// Get transaction statistics
export async function getTransactionStats(filters?: TransactionFilters): Promise<TransactionStats> {
  let query = supabase
    .from('transactions')
    .select('amount, status, transaction_date, due_date, bank_reconciled');

  // Apply filters
  if (filters) {
    if (filters.property_id) query = query.eq('property_id', filters.property_id);
    if (filters.unit_id) query = query.eq('unit_id', filters.unit_id);
    if (filters.tenant_id) query = query.eq('tenant_id', filters.tenant_id);
    if (filters.vendor_id) query = query.eq('vendor_id', filters.vendor_id);
    if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);
    if (filters.start_date) query = query.gte('transaction_date', filters.start_date);
    if (filters.end_date) query = query.lte('transaction_date', filters.end_date);
    if (filters.bank_account_id) query = query.eq('bank_account_id', filters.bank_account_id);
  }

  const { data: transactions, error } = await query;
  if (error) throw error;

  const stats = {
    total_transactions: transactions?.length || 0,
    total_amount: transactions?.reduce((sum, t) => sum + t.amount, 0) || 0,
    pending_transactions: 0,
    pending_amount: 0,
    approved_transactions: 0,
    approved_amount: 0,
    overdue_transactions: 0,
    overdue_amount: 0,
    unreconciled_transactions: 0,
    unreconciled_amount: 0,
    income_transactions: 0,
    income_amount: 0,
    expense_transactions: 0,
    expense_amount: 0,
    net_amount: 0,
  };

  const today = new Date();
  const incomeCategories = ['rental_income', 'late_fees', 'pet_fees', 'parking_fees', 'other_income'];

  // Get additional data for categorization
  const { data: categorizedData } = await supabase
    .from('transactions')
    .select('amount, category')
    .order('transaction_date', { ascending: false });

  // Apply filters for categorized data
  let categoryQuery = supabase.from('transactions').select('amount, category, status, due_date, bank_reconciled');
  if (filters) {
    if (filters.property_id) categoryQuery = categoryQuery.eq('property_id', filters.property_id);
    if (filters.unit_id) categoryQuery = categoryQuery.eq('unit_id', filters.unit_id);
    if (filters.tenant_id) categoryQuery = categoryQuery.eq('tenant_id', filters.tenant_id);
    if (filters.vendor_id) categoryQuery = categoryQuery.eq('vendor_id', filters.vendor_id);
    if (filters.owner_id) categoryQuery = categoryQuery.eq('owner_id', filters.owner_id);
    if (filters.start_date) categoryQuery = categoryQuery.gte('transaction_date', filters.start_date);
    if (filters.end_date) categoryQuery = categoryQuery.lte('transaction_date', filters.end_date);
  }
  const { data: catData } = await categoryQuery;

  if (catData) {
    catData.forEach(transaction => {
      if (transaction.status === 'pending') {
        stats.pending_transactions++;
        stats.pending_amount += transaction.amount;
      }
      if (transaction.status === 'approved') {
        stats.approved_transactions++;
        stats.approved_amount += transaction.amount;
      }
      if (transaction.status === 'approved' && transaction.due_date && new Date(transaction.due_date) < today) {
        stats.overdue_transactions++;
        stats.overdue_amount += transaction.amount;
      }
      if (!transaction.bank_reconciled) {
        stats.unreconciled_transactions++;
        stats.unreconciled_amount += transaction.amount;
      }
      if (incomeCategories.includes(transaction.category)) {
        stats.income_transactions++;
        stats.income_amount += transaction.amount;
      } else {
        stats.expense_transactions++;
        stats.expense_amount += transaction.amount;
      }
    });
  }

  stats.net_amount = stats.income_amount - stats.expense_amount;
  return stats;
}

// Get transaction summary
export async function getTransactionSummary(filters?: TransactionFilters): Promise<TransactionSummary> {
  let query = supabase
    .from('transactions')
    .select('amount, category, transaction_date, payment_method, transaction_type');

  // Apply filters
  if (filters) {
    if (filters.property_id) query = query.eq('property_id', filters.property_id);
    if (filters.unit_id) query = query.eq('unit_id', filters.unit_id);
    if (filters.tenant_id) query = query.eq('tenant_id', filters.tenant_id);
    if (filters.vendor_id) query = query.eq('vendor_id', filters.vendor_id);
    if (filters.owner_id) query = query.eq('owner_id', filters.owner_id);
    if (filters.start_date) query = query.gte('transaction_date', filters.start_date);
    if (filters.end_date) query = query.lte('transaction_date', filters.end_date);
  }

  const { data: transactions, error } = await query;
  if (error) throw error;

  // Initialize structures
  const incomeByCategory: Record<string, number> = {};
  const expenseByCategory: Record<string, number> = {};
  const monthlyTotals: Record<string, { income: number; expense: number; net: number }> = {};
  const paymentMethodBreakdown: Record<string, number> = {};
  const transactionTypeSummary: Record<string, { count: number; total: number }> = {};

  const incomeCategories = ['rental_income', 'late_fees', 'pet_fees', 'parking_fees', 'other_income'];

  transactions?.forEach(transaction => {
    const month = transaction.transaction_date.substring(0, 7); // YYYY-MM
    const isIncome = incomeCategories.includes(transaction.category);

    // Category breakdown
    if (isIncome) {
      incomeByCategory[transaction.category] = (incomeByCategory[transaction.category] || 0) + transaction.amount;
    } else {
      expenseByCategory[transaction.category] = (expenseByCategory[transaction.category] || 0) + transaction.amount;
    }

    // Monthly totals
    if (!monthlyTotals[month]) {
      monthlyTotals[month] = { income: 0, expense: 0, net: 0 };
    }
    if (isIncome) {
      monthlyTotals[month].income += transaction.amount;
    } else {
      monthlyTotals[month].expense += transaction.amount;
    }
    monthlyTotals[month].net = monthlyTotals[month].income - monthlyTotals[month].expense;

    // Payment method breakdown
    if (transaction.payment_method) {
      paymentMethodBreakdown[transaction.payment_method] = (paymentMethodBreakdown[transaction.payment_method] || 0) + transaction.amount;
    }

    // Transaction type summary
    transactionTypeSummary[transaction.transaction_type] = {
      count: (transactionTypeSummary[transaction.transaction_type]?.count || 0) + 1,
      total: (transactionTypeSummary[transaction.transaction_type]?.total || 0) + transaction.amount,
    };
  });

  return {
    income_by_category: incomeByCategory as Record<string, number>,
    expense_by_category: expenseByCategory as Record<string, number>,
    monthly_totals: monthlyTotals as Record<string, { income: number; expense: number; net: number }>,
    payment_method_breakdown: paymentMethodBreakdown as Record<string, number>,
    transaction_type_summary: transactionTypeSummary as Record<string, { count: number; total: number }>,
  };
}

// Bank Account Management
export async function getBankAccounts() {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('is_active', true)
    .order('is_primary', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createBankAccount(account: Omit<BankAccount, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('bank_accounts')
    .insert([{
      ...account,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Transaction Templates
export async function getTransactionTemplates(propertyId?: string) {
  let query = supabase
    .from('transaction_templates')
    .select('*')
    .eq('is_active', true);

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  const { data, error } = await query.order('name');
  if (error) throw error;
  return data || [];
}

export async function createTransactionFromTemplate(templateId: string, date: string) {
  const { data: template, error: templateError } = await supabase
    .from('transaction_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;
  if (!template) throw new Error('Template not found');

  const transactionData: CreateTransactionInput = {
    property_id: template.property_id,
    unit_id: template.unit_id,
    transaction_type: template.transaction_type,
    category: template.category,
    amount: template.amount,
    transaction_date: date,
    tenant_id: template.tenant_id,
    vendor_id: template.vendor_id,
    owner_id: template.owner_id,
    description: template.name,
    memo: template.description,
  };

  return createTransaction(transactionData);
}

// Bulk Operations
export async function bulkApproveTransactions(transactionIds: string[]) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('transactions')
    .update({
      status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', transactionIds);

  if (error) throw error;
  return true;
}

export async function bulkDeleteTransactions(transactionIds: string[]) {
  // Check if any transactions have children
  const { data: children } = await supabase
    .from('transactions')
    .select('id')
    .in('parent_transaction_id', transactionIds);

  if (children && children.length > 0) {
    throw new Error('Cannot delete transactions with related transactions');
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .in('id', transactionIds);

  if (error) throw error;
  return true;
}

// Export transactions to CSV
export function exportTransactionsToCSV(transactions: Transaction[]): void {
  if (!transactions || transactions.length === 0) return;

  const headers = [
    'Date',
    'Type',
    'Category',
    'Description',
    'Amount',
    'Status',
    'Payment Method',
    'Property',
    'Unit',
    'Tenant',
    'Vendor',
    'Reference',
    'Due Date',
    'Paid Date'
  ];

  const csvContent = [
    headers.join(','),
    ...transactions.map(transaction => [
      transaction.transaction_date,
      transaction.transaction_type,
      transaction.category,
      `"${transaction.description.replace(/"/g, '""')}"`,
      transaction.amount.toString(),
      transaction.status,
      transaction.payment_method || '',
      transaction.property?.name || '',
      transaction.unit?.unit_number || '',
      transaction.tenant ? `${transaction.tenant.first_name} ${transaction.tenant.last_name}` : '',
      transaction.vendor?.name || transaction.vendor?.company || '',
      transaction.reference_number || '',
      transaction.due_date || '',
      transaction.paid_date || ''
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}