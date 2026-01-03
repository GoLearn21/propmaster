/**
 * Phase 3B: Tenant Payment History Page
 * Displays payment history with filtering and receipt download
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequireTenantAuth } from '../contexts/TenantAuthContext';
import {
  getPaymentHistory,
  getYearEndStatement,
  downloadReceipt,
  PaymentRecord
} from '../services/tenantPaymentService';
import { Download, Calendar, Filter, FileText, ChevronDown } from 'lucide-react';

export default function TenantPaymentHistoryPage() {
  const { tenant } = useRequireTenantAuth();
  const navigate = useNavigate();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadPaymentHistory();
  }, [tenant]);

  useEffect(() => {
    applyFilters();
  }, [payments, statusFilter, dateFilter]);

  async function loadPaymentHistory() {
    if (!tenant) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getPaymentHistory(tenant.id);
      setPayments(data);
    } catch (err) {
      console.error('Error loading payment history:', err);
      setError('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...payments];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case '30days':
          filterDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          filterDate.setDate(now.getDate() - 90);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      filtered = filtered.filter(p => new Date(p.payment_date) >= filterDate);
    }

    setFilteredPayments(filtered);
  }

  async function handleDownloadReceipt(paymentId: string) {
    try {
      const blob = await downloadReceipt(paymentId);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${paymentId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('Receipt generation coming soon!');
      }
    } catch (err) {
      console.error('Error downloading receipt:', err);
      alert('Failed to download receipt');
    }
  }

  async function handleDownloadYearEnd() {
    if (!tenant) return;

    try {
      const currentYear = new Date().getFullYear();
      const statement = await getYearEndStatement(tenant.id, currentYear);

      // In production, this would generate a PDF
      // For now, show alert with summary
      alert(
        `Year-End Statement ${currentYear}\n\n` +
        `Total Rent Paid: $${statement.total_rent_paid.toFixed(2)}\n` +
        `Number of Payments: ${statement.payment_count}\n\n` +
        `PDF generation coming soon!`
      );
    } catch (err) {
      console.error('Error generating year-end statement:', err);
      alert('Failed to generate year-end statement');
    }
  }

  function getStatusBadge(status: string) {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  function getPaymentMethodIcon(method: string) {
    if (method === 'credit_card') return '💳';
    if (method === 'ach') return '🏦';
    if (method === 'bank_transfer') return '💰';
    if (method === 'check') return '📝';
    return '💵';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment history...</p>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalPaid = filteredPayments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/tenant/payments')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Payments
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
              <p className="mt-2 text-gray-600">View all your rent payment transactions</p>
            </div>
            <button
              onClick={handleDownloadYearEnd}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FileText className="h-5 w-5 mr-2" />
              Year-End Statement
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Total Payments</p>
            <p className="text-3xl font-bold text-gray-900">{filteredPayments.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Total Amount Paid</p>
            <p className="text-3xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Successful Payments</p>
            <p className="text-3xl font-bold text-gray-900">
              {filteredPayments.filter(p => p.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-gray-600 mr-2" />
              <span className="font-medium text-gray-900">Filters</span>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-600 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="all">All Time</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="90days">Last 90 Days</option>
                  <option value="year">Last Year</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Payment History Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No payment history found</p>
              <p className="text-sm text-gray-500 mt-2">
                {statusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Your payments will appear here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${payment.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="flex items-center">
                          <span className="mr-2">{getPaymentMethodIcon(payment.payment_method)}</span>
                          {payment.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {payment.status === 'completed' && (
                          <button
                            onClick={() => handleDownloadReceipt(payment.id)}
                            className="flex items-center text-blue-600 hover:text-blue-800"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
