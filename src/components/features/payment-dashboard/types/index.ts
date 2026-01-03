// Payment Dashboard Types
export interface PaymentMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  outstandingBalance: number;
  collectionRate: number;
  pendingPayments: number;
  overdueAmount: number;
  paidThisMonth: number;
}

export interface PaymentHistoryItem {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  amount: number;
  type: 'rent' | 'late_fee' | 'deposit' | 'utility' | 'other';
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partial';
  dueDate: string;
  paidDate?: string;
  method: 'ach' | 'credit_card' | 'check' | 'cash' | 'bank_transfer';
  description: string;
  referenceNumber?: string;
}

export interface OutstandingBalance {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  totalOutstanding: number;
  daysOverdue: number;
  status: 'current' | 'past_due' | 'severely_delinquent';
  items: {
    type: string;
    description: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
  }[];
  lastPayment?: {
    amount: number;
    date: string;
  };
}

export interface CollectionStatus {
  totalProperties: number;
  totalTenants: number;
  paymentStatus: {
    current: number;
    pastDue: number;
    severelyDelinquent: number;
  };
  collectionRate: number;
  averageDaysToPay: number;
  totalOutstanding: number;
}

export interface BillingConfiguration {
  id: string;
  propertyId: string;
  propertyName: string;
  automaticBilling: boolean;
  billingDay: number; // 1-28
  gracePeriodDays: number;
  lateFeeEnabled: boolean;
  lateFeeType: 'fixed' | 'percentage';
  lateFeeAmount: number;
  lateFeeGraceDays: number;
  reminderSettings: {
    initialReminder: number; // days before due
    secondReminder: number; // days after due
    finalNotice: number; // days after due
  };
}

export interface PaymentMethod {
  id: string;
  tenantId: string;
  type: 'ach' | 'credit_card';
  isDefault: boolean;
  isActive: boolean;
  // For ACH
  bankName?: string;
  accountType?: 'checking' | 'savings';
  accountNumber?: string; // last 4 digits
  routingNumber?: string; // masked
  
  // For Credit Card
  cardType?: 'visa' | 'mastercard' | 'amex' | 'discover';
  cardNumber?: string; // last 4 digits
  expiryMonth?: number;
  expiryYear?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDashboardFilters {
  dateRange: {
    start: string;
    end: string;
  };
  propertyIds: string[];
  status: string[];
  paymentType: string[];
  amountRange: {
    min: number;
    max: number;
  };
}

export interface PaymentChartData {
  month: string;
  revenue: number;
  outstanding: number;
  collectionRate: number;
}

export interface TenantPaymentSummary {
  tenantId: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  monthlyRent: number;
  currentBalance: number;
  paymentHistory: {
    month: string;
    amount: number;
    paidDate: string;
    status: 'paid' | 'late' | 'missed';
  }[];
  paymentMethods: PaymentMethod[];
}