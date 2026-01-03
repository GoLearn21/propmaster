import { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  XCircle,
  Filter,
  Search,
  Download,
  Plus,
  CreditCard,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

import type { Lease } from '../types/lease';

interface Payment {
  id: string;
  lease_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  payment_method?: string;
  late_fee?: number;
  notes?: string;
}

interface PaymentTrackingProps {
  leases: Lease[];
  propertyId?: string;
  onUpdate?: () => void;
}

export default function PaymentTracking({ leases, propertyId, onUpdate }: PaymentTrackingProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Mock payment data - in real app, this would come from API
  const payments: Payment[] = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    return leases
      .filter(lease => lease.status === 'active')
      .flatMap((lease, index) => {
        // Generate payments for current and previous months
        const months = [
          { year: currentYear, month: currentMonth },
          { year: currentYear, month: currentMonth - 1 },
          { year: currentYear, month: currentMonth - 2 }
        ];
        
        return months.map((date, monthIndex) => {
          const dueDate = new Date(date.year, date.month, 1);
          dueDate.setMonth(dueDate.getMonth() + 1); // Due on 1st of next month
          
          // Mock payment status based on lease characteristics
          let status: Payment['status'] = 'pending';
          if (monthIndex === 2) status = 'paid'; // 3 months ago - paid
          else if (monthIndex === 1) status = Math.random() > 0.2 ? 'paid' : 'overdue'; // 2 months ago
          else status = Math.random() > 0.4 ? 'paid' : 'pending'; // Current month
          
          return {
            id: `payment-${lease.id}-${monthIndex}`,
            lease_id: lease.id,
            amount: lease.monthly_rent || 0,
            due_date: dueDate.toISOString(),
            paid_date: status === 'paid' ? new Date(dueDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            status,
            payment_method: status === 'paid' ? ['credit_card', 'bank_transfer', 'check'][Math.floor(Math.random() * 3)] : undefined,
            late_fee: status === 'overdue' ? (lease.monthly_rent || 0) * 0.05 : 0,
            notes: status === 'overdue' ? 'Payment reminder sent' : undefined
          };
        });
      });
  }, [leases]);

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const lease = leases.find(l => l.id === payment.lease_id);
      if (!lease) return false;
      
      // Month filter
      const paymentMonth = payment.due_date.slice(0, 7);
      if (paymentMonth !== selectedMonth) return false;
      
      // Status filter
      if (statusFilter !== 'all' && payment.status !== statusFilter) return false;
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          lease.lease_number?.toLowerCase().includes(searchLower) ||
          lease.tenant?.first_name?.toLowerCase().includes(searchLower) ||
          lease.tenant?.last_name?.toLowerCase().includes(searchLower) ||
          lease.property?.name?.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [payments, leases, selectedMonth, statusFilter, searchTerm]);

  const paymentStats = useMemo(() => {
    const totalDue = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = filteredPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const totalOverdue = filteredPayments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.amount, 0);
    const totalLateFees = filteredPayments.reduce((sum, p) => sum + (p.late_fee || 0), 0);
    const collectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
    
    return {
      totalDue,
      totalPaid,
      totalOverdue,
      totalLateFees,
      collectionRate,
      paidCount: filteredPayments.filter(p => p.status === 'paid').length,
      overdueCount: filteredPayments.filter(p => p.status === 'overdue').length,
      pendingCount: filteredPayments.filter(p => p.status === 'pending').length
    };
  }, [filteredPayments]);

  const rentRoll = useMemo(() => {
    const monthlyRent = leases
      .filter(lease => lease.status === 'active')
      .reduce((sum, lease) => sum + (lease.monthly_rent || 0), 0);
    
    const occupiedUnits = leases.filter(lease => lease.status === 'active').length;
    const totalUnits = leases.length; // This would be actual unit count in real app
    
    return {
      monthlyRent,
      occupiedUnits,
      totalUnits,
      occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
    };
  }, [leases]);

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      case 'partial':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      case 'partial':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const exportPayments = () => {
    const csvContent = [
      ['Lease Number', 'Tenant', 'Property', 'Unit', 'Due Date', 'Amount', 'Status', 'Paid Date', 'Late Fee'],
      ...filteredPayments.map(payment => {
        const lease = leases.find(l => l.id === payment.lease_id);
        return [
          lease?.lease_number || '',
          lease?.tenant ? `${lease.tenant.first_name} ${lease.tenant.last_name}` : '',
          lease?.property?.name || '',
          lease?.unit?.unit_number || '',
          payment.due_date,
          payment.amount.toString(),
          payment.status,
          payment.paid_date || '',
          (payment.late_fee || 0).toString()
        ];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${selectedMonth}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Tracking</h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor rent collections and payment status
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="w-4 h-4" />
            Record Payment
          </button>
          <button
            onClick={exportPayments}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Due</p>
              <p className="text-2xl font-bold text-gray-900">${paymentStats.totalDue.toLocaleString()}</p>
              <p className="text-xs text-gray-500">for {selectedMonth}</p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Collected</p>
              <p className="text-2xl font-bold text-gray-900">${paymentStats.totalPaid.toLocaleString()}</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {paymentStats.collectionRate.toFixed(1)}% collection rate
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-900">${paymentStats.totalOverdue.toLocaleString()}</p>
              <p className="text-xs text-red-600">{paymentStats.overdueCount} payments</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Late Fees</p>
              <p className="text-2xl font-bold text-orange-900">${paymentStats.totalLateFees.toLocaleString()}</p>
              <p className="text-xs text-orange-600">this month</p>
            </div>
            <XCircle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Rent Roll */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Rent Roll</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Monthly Rental Income</p>
            <p className="text-2xl font-bold text-gray-900">${rentRoll.monthlyRent.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Occupied Units</p>
            <p className="text-2xl font-bold text-gray-900">{rentRoll.occupiedUnits}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Units</p>
            <p className="text-2xl font-bold text-gray-900">{rentRoll.totalUnits}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Occupancy Rate</p>
            <p className="text-2xl font-bold text-gray-900">{rentRoll.occupancyRate.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by lease, tenant, or property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Lease Details</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Tenant</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Due Date</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Amount</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Paid Date</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Late Fee</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.map((payment) => {
                const lease = leases.find(l => l.id === payment.lease_id);
                if (!lease) return null;
                
                return (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{lease.lease_number}</div>
                        <div className="text-sm text-gray-600">{lease.property?.name} - Unit {lease.unit?.unit_number}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">
                        {lease.tenant ? `${lease.tenant.first_name} ${lease.tenant.last_name}` : 'No tenant'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">
                        {new Date(payment.due_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-gray-900">
                        ${payment.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">
                        {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900">
                        {payment.late_fee ? `$${payment.late_fee.toLocaleString()}` : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        {payment.status !== 'paid' && (
                          <button className="text-teal-600 hover:text-teal-700 text-sm">
                            Record Payment
                          </button>
                        )}
                        <button className="text-blue-600 hover:text-blue-700 text-sm">
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Collection Status</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Paid ({paymentStats.paidCount})</span>
                <span className="text-sm font-medium">${paymentStats.totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pending ({paymentStats.pendingCount})</span>
                <span className="text-sm font-medium text-gray-900">
                  ${(paymentStats.totalDue - paymentStats.totalPaid - paymentStats.totalOverdue).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Overdue ({paymentStats.overdueCount})</span>
                <span className="text-sm font-medium text-red-600">${paymentStats.totalOverdue.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Collection Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Collection Rate</span>
                <span className="text-sm font-medium">{paymentStats.collectionRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average Days to Pay</span>
                <span className="text-sm font-medium">3.2 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Late Payment Rate</span>
                <span className="text-sm font-medium">12.5%</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Collections Actions</h4>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                Send Payment Reminders
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                Generate Late Notices
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded">
                Update Payment Plans
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}