/**
 * Tenant Screening Provider Interface
 * Supports multiple vendors: TransUnion SmartMove, Checkr, etc.
 */

export interface TenantScreeningReport {
  id: string;
  applicantId: string;
  status: 'pending' | 'completed' | 'failed';
  creditScore?: number;
  criminalRecords?: Array<{
    type: string;
    date: string;
    description: string;
  }>;
  evictionRecords?: Array<{
    date: string;
    court: string;
    status: string;
  }>;
  incomeVerification?: {
    verified: boolean;
    monthlyIncome?: number;
  };
  createdAt: Date;
  completedAt?: Date;
}

export interface TenantScreeningRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ssn?: string;
  dateOfBirth: string;
  currentAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  reportTypes: Array<'credit' | 'criminal' | 'eviction' | 'income'>;
}

export interface ITenantScreeningProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Initialize screening for a tenant
   */
  requestScreening(request: TenantScreeningRequest): Promise<{ requestId: string }>;

  /**
   * Get screening report status and results
   */
  getReport(requestId: string): Promise<TenantScreeningReport>;

  /**
   * Cancel a pending screening request
   */
  cancelScreening(requestId: string): Promise<boolean>;

  /**
   * Get pricing for screening package
   */
  getPricing(reportTypes: string[]): Promise<{ amount: number; currency: string }>;
}
