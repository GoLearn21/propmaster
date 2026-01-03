/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * ComplianceService - Law as Data Implementation
 *
 * TITANIUM RULE: All compliance values come from the database.
 * NEVER hardcode rates, percentages, or deadlines in code.
 *
 * Example of FORBIDDEN code:
 *   const CA_LATE_FEE = 0.10;  // NEVER DO THIS
 *
 * Correct approach:
 *   const lateFee = await complianceService.getLateFeePercent('CA');
 */

import { supabase } from '@/lib/supabase';
import { Decimal as DecimalJS } from 'decimal.js';
import type {
  ComplianceQuery,
  ComplianceRule,
  Decimal,
  ISODate,
  IComplianceService,
} from '../types';

export class ComplianceService implements IComplianceService {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * Core compliance value lookup
   * Uses the get_compliance_value database function for temporal correctness
   */
  async getComplianceValue(query: ComplianceQuery): Promise<string> {
    const asOfDate = query.asOfDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_compliance_value', {
      p_org_id: this.organizationId,
      p_state_code: query.stateCode,
      p_rule_type: query.ruleType,
      p_rule_key: query.ruleKey,
      p_as_of_date: asOfDate,
    });

    if (error) {
      throw new ComplianceError(
        `No compliance rule found: ${query.stateCode}/${query.ruleType}/${query.ruleKey}`,
        'COMPLIANCE_RULE_NOT_FOUND',
        { query, asOfDate }
      );
    }

    return data;
  }

  /**
   * Get late fee percentage for a state
   * @returns Decimal percentage (e.g., "0.05" for 5%)
   */
  async getLateFeePercent(stateCode: string, asOfDate?: ISODate): Promise<string> {
    const value = await this.getComplianceValue({
      stateCode,
      ruleType: 'late_fee',
      ruleKey: 'max_percent',
      asOfDate,
    });

    // Return as Decimal string for precise calculations downstream
    return new DecimalJS(value).toFixed(4);
  }

  /**
   * Get maximum late fee amount (some states have caps)
   * @returns Maximum dollar amount or null if no cap
   */
  async getLateFeeMaxAmount(stateCode: string, asOfDate?: ISODate): Promise<Decimal | null> {
    try {
      const value = await this.getComplianceValue({
        stateCode,
        ruleType: 'late_fee',
        ruleKey: 'max_amount',
        asOfDate,
      });
      return value;
    } catch (error) {
      if (error instanceof ComplianceError && error.code === 'COMPLIANCE_RULE_NOT_FOUND') {
        return null; // No max amount cap for this state
      }
      throw error;
    }
  }

  /**
   * Calculate maximum security deposit based on state law
   * Most states limit deposits to X months' rent
   */
  async getSecurityDepositMax(
    stateCode: string,
    monthlyRent: Decimal,
    asOfDate?: ISODate
  ): Promise<Decimal> {
    const maxMonths = await this.getComplianceValue({
      stateCode,
      ruleType: 'security_deposit',
      ruleKey: 'max_months_rent',
      asOfDate,
    });

    // Use Decimal.js for penny-perfect precision
    const multiplier = new DecimalJS(maxMonths);
    const rent = new DecimalJS(monthlyRent);
    const maxDeposit = rent.times(multiplier);

    return maxDeposit.toFixed(2);
  }

  /**
   * Get grace period before late fees can be assessed
   */
  async getGracePeriodDays(stateCode: string, asOfDate?: ISODate): Promise<number> {
    const value = await this.getComplianceValue({
      stateCode,
      ruleType: 'grace_period',
      ruleKey: 'grace_period_days',
      asOfDate,
    });

    return parseInt(value, 10);
  }

  /**
   * Get interest rate cap for security deposit interest (where applicable)
   */
  async getSecurityDepositInterestRate(stateCode: string, asOfDate?: ISODate): Promise<string | null> {
    try {
      const value = await this.getComplianceValue({
        stateCode,
        ruleType: 'security_deposit',
        ruleKey: 'interest_rate',
        asOfDate,
      });
      // Return as Decimal string for precise calculations
      return new DecimalJS(value).toFixed(4);
    } catch (error) {
      if (error instanceof ComplianceError && error.code === 'COMPLIANCE_RULE_NOT_FOUND') {
        return null; // State doesn't require interest
      }
      throw error;
    }
  }

  /**
   * Get notice period required for lease termination
   */
  async getNoticePeriodDays(stateCode: string, asOfDate?: ISODate): Promise<number> {
    const value = await this.getComplianceValue({
      stateCode,
      ruleType: 'notice_period',
      ruleKey: 'deadline_days',
      asOfDate,
    });

    return parseInt(value, 10);
  }

  /**
   * Calculate late fee amount based on state rules
   * Applies percentage cap AND max amount cap (if exists)
   */
  async calculateLateFee(
    stateCode: string,
    rentAmount: Decimal,
    asOfDate?: ISODate
  ): Promise<Decimal> {
    const [percentCap, maxAmount] = await Promise.all([
      this.getLateFeePercent(stateCode, asOfDate),
      this.getLateFeeMaxAmount(stateCode, asOfDate),
    ]);

    // Use Decimal.js for penny-perfect precision
    const rent = new DecimalJS(rentAmount);
    let lateFee = rent.times(new DecimalJS(percentCap));

    // Apply max amount cap if exists
    if (maxAmount !== null) {
      const maxAmountDecimal = new DecimalJS(maxAmount);
      lateFee = DecimalJS.min(lateFee, maxAmountDecimal);
    }

    return lateFee.toFixed(2);
  }

  /**
   * Check if a late fee can be assessed given the due date
   * Accounts for grace period
   */
  async canAssessLateFee(stateCode: string, dueDate: ISODate, asOfDate?: ISODate): Promise<boolean> {
    const gracePeriod = await this.getGracePeriodDays(stateCode, asOfDate);
    const today = asOfDate ? new Date(asOfDate) : new Date();
    const due = new Date(dueDate);
    const daysPastDue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

    return daysPastDue > gracePeriod;
  }

  /**
   * Get all active compliance rules for a state
   * Useful for admin UI and reporting
   */
  async getStateRules(stateCode: string): Promise<ComplianceRule[]> {
    const { data, error } = await supabase
      .from('compliance_rules')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('state_code', stateCode)
      .is('end_date', null)
      .order('rule_type', { ascending: true })
      .order('rule_key', { ascending: true });

    if (error) {
      throw new ComplianceError(
        `Failed to fetch compliance rules for state ${stateCode}`,
        'COMPLIANCE_FETCH_ERROR',
        { stateCode, error: error.message }
      );
    }

    return (data || []).map(this.mapDbToComplianceRule);
  }

  /**
   * Upsert a compliance rule (creates or updates)
   * Used for admin configuration
   */
  async setComplianceRule(rule: Omit<ComplianceRule, 'id' | 'createdAt'>): Promise<ComplianceRule> {
    // End any existing rule for this combination
    const { error: updateError } = await supabase
      .from('compliance_rules')
      .update({ end_date: rule.effectiveDate })
      .eq('organization_id', this.organizationId)
      .eq('state_code', rule.stateCode)
      .eq('rule_type', rule.ruleType)
      .eq('rule_key', rule.ruleKey)
      .is('end_date', null);

    if (updateError) {
      throw new ComplianceError(
        'Failed to end existing rule',
        'COMPLIANCE_UPDATE_ERROR',
        { rule, error: updateError.message }
      );
    }

    // Insert new rule
    const { data, error } = await supabase
      .from('compliance_rules')
      .insert({
        organization_id: rule.organizationId,
        state_code: rule.stateCode,
        rule_type: rule.ruleType,
        rule_key: rule.ruleKey,
        rule_value: rule.ruleValue,
        effective_date: rule.effectiveDate,
        end_date: rule.endDate,
        source_citation: rule.sourceCitation,
      })
      .select()
      .single();

    if (error) {
      throw new ComplianceError(
        'Failed to create compliance rule',
        'COMPLIANCE_INSERT_ERROR',
        { rule, error: error.message }
      );
    }

    return this.mapDbToComplianceRule(data);
  }

  private mapDbToComplianceRule(row: Record<string, unknown>): ComplianceRule {
    return {
      id: row.id as string,
      organizationId: row.organization_id as string,
      stateCode: row.state_code as string,
      ruleType: row.rule_type as ComplianceRule['ruleType'],
      ruleKey: row.rule_key as ComplianceRule['ruleKey'],
      ruleValue: row.rule_value as string,
      effectiveDate: row.effective_date as string,
      endDate: row.end_date as string | null,
      sourceCitation: row.source_citation as string | undefined,
      createdAt: row.created_at as string,
    };
  }
}

/**
 * Custom error class for compliance-related errors
 */
export class ComplianceError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ComplianceError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Factory function for creating ComplianceService with organization context
 */
export function createComplianceService(organizationId: string): IComplianceService {
  return new ComplianceService(organizationId);
}
