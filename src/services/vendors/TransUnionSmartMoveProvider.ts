/**
 * TransUnion SmartMove Tenant Screening Provider
 * Official TransUnion SmartMove API integration for comprehensive tenant screening
 * Uses the new swappable architecture with comprehensive tenant screening provider
 */

import { 
  ITenantScreeningProvider, 
  TenantScreeningRequest, 
  TenantScreeningReport 
} from './ITenantScreeningProvider';

// Import the comprehensive tenant screening architecture
import { tenantScreeningProviderFactory } from '../../../../tenant-screening/factory/TenantScreeningProviderFactory';
import type { TenantScreeningProvider } from '../../../../tenant-screening/interfaces/TenantScreeningProvider';

export interface TransUnionConfig {
  apiKey: string;
  clientId: string;
  environment: 'production' | 'sandbox';
  baseUrl?: string;
}

export class TransUnionSmartMoveProvider implements ITenantScreeningProvider {
  private config: TransUnionConfig;
  private baseUrl: string;
  private comprehensiveProvider: TenantScreeningProvider;

  constructor(config: TransUnionConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 
      (config.environment === 'production' 
        ? 'https://api.transunion.com/smartmove' 
        : 'https://sandbox-api.transunion.com/smartmove');

    // Initialize the comprehensive tenant screening provider
    this.comprehensiveProvider = tenantScreeningProviderFactory.createProvider({
      provider: 'transunion',
      config: {
        apiKey: config.apiKey,
        clientId: config.clientId,
        environment: config.environment,
        timeout: 30000,
        retries: 3,
        rateLimit: {
          requests_per_minute: 60,
          requests_per_day: 1000
        }
      }
    });
  }

  getName(): string {
    return 'TransUnion SmartMove';
  }

  async requestScreening(request: TenantScreeningRequest): Promise<{ requestId: string }> {
    try {
      console.log('TransUnion: Requesting comprehensive screening for', request.email);

      // Transform the request to use the comprehensive tenant screening provider
      const screeningRequest = {
        tenant_id: `tenant_${Date.now()}`, // Generate a unique tenant ID
        organization_id: 'default_org', // Default organization - should be passed in real implementation
        screening_type: this.mapReportTypesToScreeningType(request.reportTypes),
        applicant_info: {
          first_name: request.firstName,
          last_name: request.lastName,
          email: request.email,
          phone: request.phone,
          date_of_birth: request.dateOfBirth,
          ssn_last4: request.ssn?.slice(-4),
          address: {
            street: request.currentAddress.street,
            city: request.currentAddress.city,
            state: request.currentAddress.state,
            zip_code: request.currentAddress.zip
          }
        },
        employment_info: request.reportTypes.includes('income') ? {
          employer_name: 'Unknown Employer', // Would need to be collected separately
          position: 'Unknown Position',
          annual_salary: 0,
          employment_duration_months: 0
        } : undefined,
        consent: true // Assume consent is obtained in this interface
      };

      // Use the comprehensive provider
      const response = await this.comprehensiveProvider.submitScreening(screeningRequest);
      
      console.log('TransUnion: Comprehensive screening request created:', response.screening_id);

      return { requestId: response.screening_id };
    } catch (error) {
      console.error('TransUnion SmartMove screening request failed:', error);
      throw new Error(`TransUnion screening request failed: ${error.message}`);
    }
  }

  async getReport(requestId: string): Promise<TenantScreeningReport> {
    try {
      console.log('TransUnion: Fetching comprehensive report for request:', requestId);

      // Use the comprehensive provider to get results
      const results = await this.comprehensiveProvider.getScreeningResults(requestId);
      
      console.log('TransUnion: Comprehensive report fetched successfully:', results.overall_score);

      // Transform the comprehensive results to our standard format
      return this.transformComprehensiveReport(requestId, results);
    } catch (error) {
      console.error('TransUnion SmartMove report fetch failed:', error);
      throw new Error(`TransUnion report fetch failed: ${error.message}`);
    }
  }

  async cancelScreening(requestId: string): Promise<boolean> {
    try {
      console.log('TransUnion: Cancelling comprehensive screening request:', requestId);

      // Use the comprehensive provider to cancel
      const result = await this.comprehensiveProvider.cancelScreening(requestId);

      console.log('TransUnion: Screening request cancelled successfully');
      return result.success;
    } catch (error) {
      console.error('TransUnion SmartMove cancellation failed:', error);
      return false;
    }
  }

  async getPricing(reportTypes: string[]): Promise<{ amount: number; currency: string }> {
    try {
      console.log('TransUnion: Getting pricing for report types:', reportTypes);

      // Get pricing from the comprehensive provider
      const providerInfo = this.comprehensiveProvider.getProviderInfo();
      const pricing = providerInfo.pricing_info;

      if (!pricing) {
        throw new Error('Pricing information not available from comprehensive provider');
      }

      const screeningType = this.mapReportTypesToScreeningType(reportTypes);
      let amount = 0;
      
      switch (screeningType) {
        case 'credit_check':
          amount = pricing.credit_check;
          break;
        case 'background_check':
          amount = pricing.background_check;
          break;
        case 'employment_verification':
          amount = pricing.employment_verification;
          break;
        case 'rental_history':
          amount = pricing.rental_history;
          break;
        case 'comprehensive':
          amount = pricing.comprehensive;
          break;
        default:
          amount = pricing.credit_check; // Default to credit check price
      }

      return {
        amount,
        currency: 'USD',
      };
    } catch (error) {
      console.error('TransUnion SmartMove pricing failed:', error);
      throw new Error(`TransUnion pricing failed: ${error.message}`);
    }
  }

  // Helper method to map report types to comprehensive screening types
  private mapReportTypesToScreeningType(reportTypes: string[]): 'credit_check' | 'background_check' | 'employment_verification' | 'rental_history' | 'comprehensive' {
    const types = new Set(reportTypes);
    
    if (types.has('credit') && types.has('criminal') && types.has('eviction') && types.has('income')) {
      return 'comprehensive';
    } else if (types.has('criminal') || types.has('eviction')) {
      return 'background_check';
    } else if (types.has('income')) {
      return 'employment_verification';
    } else if (types.has('credit')) {
      return 'credit_check';
    } else {
      return 'comprehensive'; // Default
    }
  }

  private transformComprehensiveReport(requestId: string, results: any): TenantScreeningReport {
    const report: TenantScreeningReport = {
      id: requestId,
      applicantId: results.applicant_info.email || requestId,
      status: 'completed', // If we can get results, screening is completed
      createdAt: new Date(),
      completedAt: new Date(),
    };

    // Transform credit report from comprehensive results
    if (results.credit_report) {
      report.creditScore = results.credit_report.score;
    }

    // Transform criminal records from comprehensive results
    if (results.background_check?.criminal_records) {
      report.criminalRecords = results.background_check.criminal_records.map((record: any) => ({
        type: record.severity || 'unknown',
        date: record.date,
        description: `${record.offense} - ${record.disposition}`,
      }));
    }

    // Transform eviction records from comprehensive results
    if (results.background_check?.eviction_records) {
      report.evictionRecords = results.background_check.eviction_records.map((record: any) => ({
        date: record.date,
        court: record.court,
        status: record.status,
      }));
    }

    // Transform income verification from comprehensive results
    if (results.employment_verification) {
      report.incomeVerification = {
        verified: results.employment_verification.verified === true,
        monthlyIncome: results.employment_verification.annual_income 
          ? Math.round(results.employment_verification.annual_income / 12)
          : undefined,
      };
    }

    return report;
  }

  // Utility method for adverse action notices (FCRA compliance)
  async generateAdverseActionNotice(requestId: string, reason: string): Promise<{ noticeUrl: string }> {
    try {
      console.log('TransUnion: Generating adverse action notice for:', requestId);

      // Use the comprehensive provider for adverse action notice generation
      const result = await this.comprehensiveProvider.generateAdverseActionNotice(
        requestId,
        'denied', // Default to denied - could be parameterized
        reason
      );

      return { noticeUrl: result.notice_url };
    } catch (error) {
      console.error('TransUnion adverse action notice generation failed:', error);
      throw new Error(`Adverse action notice generation failed: ${error.message}`);
    }
  }

  // Webhook signature validation for TransUnion callbacks
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      // TransUnion uses HMAC-SHA256 for webhook signatures
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('TransUnion webhook signature validation failed:', error);
      return false;
    }
  }
}