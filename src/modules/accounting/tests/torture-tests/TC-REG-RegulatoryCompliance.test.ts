/**
 * MASTERKEY ACCOUNTING v7.2 TITANIUM
 * Torture Test Protocol - Category 17: Regulatory Compliance
 *
 * Goal: Ensure compliance with rent control, data retention, disclosures, fair housing
 * Critical for: Legal compliance, audit readiness, avoiding fines/lawsuits
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Regulatory categories
interface RentControlRule {
  jurisdiction: string;
  maxAnnualIncrease: number;
  bankedIncreasesAllowed: boolean;
  justCauseEvictionRequired: boolean;
  relocationAssistanceRequired: boolean;
  petitionProcess: boolean;
}

interface DataRetentionPolicy {
  documentType: string;
  retentionYears: number;
  startEvent: 'creation' | 'lease_end' | 'transaction_date' | 'tax_year_end';
  secureDestruction: boolean;
  auditHoldOverride: boolean;
}

interface DisclosureRequirement {
  disclosureType: string;
  timing: 'before_signing' | 'at_signing' | 'within_days' | 'annual';
  daysRequired?: number;
  stateRequired: string[];
  federalRequired: boolean;
  signatureRequired: boolean;
}

// Rent Control Manager
class RentControlManager {
  private rules: Record<string, RentControlRule> = {
    'San Francisco, CA': {
      jurisdiction: 'San Francisco',
      maxAnnualIncrease: 5.3,
      bankedIncreasesAllowed: true,
      justCauseEvictionRequired: true,
      relocationAssistanceRequired: true,
      petitionProcess: true,
    },
    'Los Angeles, CA': {
      jurisdiction: 'Los Angeles',
      maxAnnualIncrease: 4.0,
      bankedIncreasesAllowed: true,
      justCauseEvictionRequired: true,
      relocationAssistanceRequired: true,
      petitionProcess: true,
    },
    'New York City, NY': {
      jurisdiction: 'New York City',
      maxAnnualIncrease: 3.25,
      bankedIncreasesAllowed: false,
      justCauseEvictionRequired: true,
      relocationAssistanceRequired: false,
      petitionProcess: true,
    },
    'Portland, OR': {
      jurisdiction: 'Portland',
      maxAnnualIncrease: 10.0,
      bankedIncreasesAllowed: false,
      justCauseEvictionRequired: true,
      relocationAssistanceRequired: true,
      petitionProcess: false,
    },
  };

  checkCompliance(
    jurisdiction: string,
    currentRent: number,
    proposedRent: number,
    lastIncreaseDate: Date
  ): {
    compliant: boolean;
    maxAllowed: number;
    proposedPercent: number;
    bankedAmount: number;
    issues: string[];
  } {
    const rule = this.rules[jurisdiction];
    const issues: string[] = [];

    if (!rule) {
      return {
        compliant: true,
        maxAllowed: Infinity,
        proposedPercent: 0,
        bankedAmount: 0,
        issues: ['Jurisdiction not rent-controlled'],
      };
    }

    const proposedPercent = ((proposedRent - currentRent) / currentRent) * 100;
    const maxAllowed = currentRent * (1 + rule.maxAnnualIncrease / 100);

    // Check if increase timing is valid (annual)
    const daysSinceLastIncrease = Math.floor(
      (Date.now() - lastIncreaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastIncrease < 365) {
      issues.push(`Must wait ${365 - daysSinceLastIncrease} more days for annual increase`);
    }

    if (proposedRent > maxAllowed) {
      issues.push(`Proposed increase of ${proposedPercent.toFixed(2)}% exceeds maximum of ${rule.maxAnnualIncrease}%`);
    }

    // Calculate banked increases if allowed
    let bankedAmount = 0;
    if (rule.bankedIncreasesAllowed) {
      const yearsSinceIncrease = daysSinceLastIncrease / 365;
      if (yearsSinceIncrease > 1) {
        bankedAmount = currentRent * (rule.maxAnnualIncrease / 100) * (yearsSinceIncrease - 1);
      }
    }

    return {
      compliant: issues.length === 0,
      maxAllowed,
      proposedPercent: Math.round(proposedPercent * 100) / 100,
      bankedAmount: Math.round(bankedAmount * 100) / 100,
      issues,
    };
  }

  checkEvictionCause(
    jurisdiction: string,
    evictionReason: string
  ): { allowed: boolean; relocationRequired: boolean; amount?: number } {
    const rule = this.rules[jurisdiction];

    if (!rule || !rule.justCauseEvictionRequired) {
      return { allowed: true, relocationRequired: false };
    }

    const justCauses = [
      'nonpayment',
      'breach_of_lease',
      'nuisance',
      'illegal_activity',
      'owner_move_in',
      'capital_improvement',
      'demolition',
      'ellis_act',
    ];

    const allowed = justCauses.includes(evictionReason.toLowerCase());
    const relocationRequired = rule.relocationAssistanceRequired &&
      ['owner_move_in', 'capital_improvement', 'demolition', 'ellis_act'].includes(evictionReason.toLowerCase());

    return {
      allowed,
      relocationRequired,
      amount: relocationRequired ? 7500 : undefined, // Example relocation amount
    };
  }
}

// Data Retention Manager
class DataRetentionManager {
  private policies: DataRetentionPolicy[] = [
    { documentType: 'lease_agreement', retentionYears: 7, startEvent: 'lease_end', secureDestruction: true, auditHoldOverride: true },
    { documentType: 'tenant_application', retentionYears: 4, startEvent: 'creation', secureDestruction: true, auditHoldOverride: true },
    { documentType: 'financial_records', retentionYears: 7, startEvent: 'tax_year_end', secureDestruction: true, auditHoldOverride: true },
    { documentType: 'bank_statements', retentionYears: 7, startEvent: 'transaction_date', secureDestruction: true, auditHoldOverride: true },
    { documentType: '1099_forms', retentionYears: 7, startEvent: 'tax_year_end', secureDestruction: true, auditHoldOverride: true },
    { documentType: 'repair_invoices', retentionYears: 7, startEvent: 'transaction_date', secureDestruction: false, auditHoldOverride: true },
    { documentType: 'security_deposit_records', retentionYears: 4, startEvent: 'lease_end', secureDestruction: true, auditHoldOverride: true },
    { documentType: 'eviction_records', retentionYears: 10, startEvent: 'creation', secureDestruction: true, auditHoldOverride: true },
    { documentType: 'lead_disclosure', retentionYears: 3, startEvent: 'lease_end', secureDestruction: false, auditHoldOverride: false },
    { documentType: 'fair_housing_training', retentionYears: 3, startEvent: 'creation', secureDestruction: false, auditHoldOverride: false },
  ];

  checkRetention(
    documentType: string,
    documentDate: Date,
    referenceDate: Date
  ): {
    mustRetain: boolean;
    expirationDate: Date;
    daysRemaining: number;
    requiresSecureDestruction: boolean;
  } {
    const policy = this.policies.find(p => p.documentType === documentType);

    if (!policy) {
      // Default to 7 years if no policy
      const expiration = new Date(documentDate);
      expiration.setFullYear(expiration.getFullYear() + 7);
      return {
        mustRetain: new Date() < expiration,
        expirationDate: expiration,
        daysRemaining: Math.floor((expiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        requiresSecureDestruction: true,
      };
    }

    const expirationDate = new Date(referenceDate);
    expirationDate.setFullYear(expirationDate.getFullYear() + policy.retentionYears);

    const daysRemaining = Math.floor((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return {
      mustRetain: daysRemaining > 0,
      expirationDate,
      daysRemaining: Math.max(0, daysRemaining),
      requiresSecureDestruction: policy.secureDestruction,
    };
  }

  applyLitHold(documentTypes: string[]): {
    documentsHeld: string[];
    message: string;
  } {
    // When litigation is pending, all relevant documents must be preserved
    const heldDocuments = this.policies
      .filter(p => p.auditHoldOverride && documentTypes.includes(p.documentType))
      .map(p => p.documentType);

    return {
      documentsHeld: heldDocuments,
      message: `Litigation hold applied to ${heldDocuments.length} document types. Do not destroy.`,
    };
  }
}

// Disclosure Manager
class DisclosureManager {
  private requirements: DisclosureRequirement[] = [
    { disclosureType: 'lead_paint', timing: 'before_signing', stateRequired: [], federalRequired: true, signatureRequired: true },
    { disclosureType: 'mold', timing: 'before_signing', stateRequired: ['CA', 'TX', 'FL'], federalRequired: false, signatureRequired: true },
    { disclosureType: 'bed_bugs', timing: 'before_signing', stateRequired: ['AZ', 'ME', 'NY'], federalRequired: false, signatureRequired: true },
    { disclosureType: 'flood_zone', timing: 'before_signing', stateRequired: ['TX', 'FL', 'LA'], federalRequired: false, signatureRequired: true },
    { disclosureType: 'sex_offender_registry', timing: 'at_signing', stateRequired: ['CA'], federalRequired: false, signatureRequired: false },
    { disclosureType: 'security_deposit', timing: 'at_signing', stateRequired: ['CA', 'FL', 'NY', 'IL'], federalRequired: false, signatureRequired: true },
    { disclosureType: 'move_in_checklist', timing: 'within_days', daysRequired: 3, stateRequired: ['WA', 'OR'], federalRequired: false, signatureRequired: true },
    { disclosureType: 'rent_control_notice', timing: 'at_signing', stateRequired: ['CA', 'NY', 'OR'], federalRequired: false, signatureRequired: true },
    { disclosureType: 'asbestos', timing: 'before_signing', stateRequired: ['CA'], federalRequired: false, signatureRequired: true },
  ];

  getRequiredDisclosures(state: string, propertyYear: number): DisclosureRequirement[] {
    const required: DisclosureRequirement[] = [];

    for (const req of this.requirements) {
      if (req.federalRequired || req.stateRequired.includes(state)) {
        // Lead paint only for pre-1978
        if (req.disclosureType === 'lead_paint' && propertyYear >= 1978) {
          continue;
        }
        required.push(req);
      }
    }

    return required;
  }

  validateDisclosures(
    completedDisclosures: Array<{ type: string; signedDate?: Date }>,
    requiredDisclosures: DisclosureRequirement[],
    leaseSignDate: Date
  ): { compliant: boolean; missing: string[]; unsigned: string[] } {
    const missing: string[] = [];
    const unsigned: string[] = [];

    for (const req of requiredDisclosures) {
      const completed = completedDisclosures.find(d => d.type === req.disclosureType);

      if (!completed) {
        missing.push(req.disclosureType);
        continue;
      }

      if (req.signatureRequired && !completed.signedDate) {
        unsigned.push(req.disclosureType);
      }

      if (req.timing === 'before_signing' && completed.signedDate && completed.signedDate >= leaseSignDate) {
        missing.push(`${req.disclosureType} (must be signed before lease)`);
      }
    }

    return {
      compliant: missing.length === 0 && unsigned.length === 0,
      missing,
      unsigned,
    };
  }
}

// GDPR/CCPA Compliance Manager
class PrivacyComplianceManager {
  handleDataDeletionRequest(
    requestType: 'GDPR' | 'CCPA',
    tenantId: string,
    dataCategories: string[]
  ): {
    deletable: string[];
    retained: Array<{ category: string; reason: string }>;
    responseDeadlineDays: number;
  } {
    const deletable: string[] = [];
    const retained: Array<{ category: string; reason: string }> = [];

    // Determine deadline (GDPR: 30 days, CCPA: 45 days)
    const responseDeadlineDays = requestType === 'GDPR' ? 30 : 45;

    for (const category of dataCategories) {
      switch (category) {
        case 'marketing_preferences':
        case 'browsing_history':
        case 'application_denials': // After 25 months in CA)
          deletable.push(category);
          break;
        case 'payment_history':
        case 'lease_documents':
        case 'security_deposit_records':
          retained.push({
            category,
            reason: 'Required for legal/financial record retention',
          });
          break;
        case 'eviction_records':
          retained.push({
            category,
            reason: 'Required for legal compliance',
          });
          break;
        case 'identity_verification':
          retained.push({
            category,
            reason: 'Required for Fair Housing compliance (3 years)',
          });
          break;
        default:
          deletable.push(category);
      }
    }

    return { deletable, retained, responseDeadlineDays };
  }

  generatePrivacyReport(tenantId: string): {
    dataCollected: string[];
    thirdPartySharing: Array<{ party: string; dataTypes: string[]; purpose: string }>;
    retentionPeriods: Array<{ dataType: string; period: string }>;
  } {
    return {
      dataCollected: [
        'Name and contact information',
        'Social Security Number',
        'Employment and income verification',
        'Rental history',
        'Payment history',
        'Maintenance requests',
      ],
      thirdPartySharing: [
        { party: 'Credit bureaus', dataTypes: ['SSN', 'Payment history'], purpose: 'Credit screening' },
        { party: 'Background check service', dataTypes: ['Name', 'SSN'], purpose: 'Background verification' },
        { party: 'Insurance provider', dataTypes: ['Name', 'Unit info'], purpose: 'Renters insurance' },
      ],
      retentionPeriods: [
        { dataType: 'Lease documents', period: '7 years after lease end' },
        { dataType: 'Payment records', period: '7 years' },
        { dataType: 'Application data', period: '4 years' },
      ],
    };
  }
}

describe('TC-REG: Regulatory Compliance Tests', () => {
  describe('TC-REG-233: Rent Control Compliance - Within Limit', () => {
    it('should approve rent increase within allowed percentage', () => {
      const manager = new RentControlManager();

      const result = manager.checkCompliance(
        'San Francisco, CA',
        2000,
        2100, // 5% increase
        new Date(Date.now() - 400 * 24 * 60 * 60 * 1000) // Last increase 400 days ago
      );

      expect(result.compliant).toBe(true);
      expect(result.proposedPercent).toBe(5);
    });
  });

  describe('TC-REG-234: Rent Control Compliance - Exceeds Limit', () => {
    it('should reject rent increase exceeding allowed percentage', () => {
      const manager = new RentControlManager();

      const result = manager.checkCompliance(
        'Los Angeles, CA',
        2000,
        2200, // 10% increase
        new Date(Date.now() - 400 * 24 * 60 * 60 * 1000)
      );

      expect(result.compliant).toBe(false);
      expect(result.issues.some(i => i.includes('exceeds maximum'))).toBe(true);
    });
  });

  describe('TC-REG-235: Rent Control - Banked Increases', () => {
    it('should calculate banked rent increases in SF', () => {
      const manager = new RentControlManager();

      const result = manager.checkCompliance(
        'San Francisco, CA',
        2000,
        2200,
        new Date(Date.now() - 800 * 24 * 60 * 60 * 1000) // 2+ years since increase
      );

      expect(result.bankedAmount).toBeGreaterThan(0);
    });
  });

  describe('TC-REG-236: Just Cause Eviction Check', () => {
    it('should require relocation assistance for owner move-in', () => {
      const manager = new RentControlManager();

      const result = manager.checkEvictionCause('San Francisco, CA', 'owner_move_in');

      expect(result.allowed).toBe(true);
      expect(result.relocationRequired).toBe(true);
      expect(result.amount).toBeGreaterThan(0);
    });
  });

  describe('TC-REG-237: Just Cause Eviction - Invalid Reason', () => {
    it('should reject eviction without just cause', () => {
      const manager = new RentControlManager();

      const result = manager.checkEvictionCause('Los Angeles, CA', 'want_higher_rent');

      expect(result.allowed).toBe(false);
    });
  });

  describe('TC-REG-238: Data Retention - Must Retain', () => {
    it('should require retention of recent financial records', () => {
      const manager = new DataRetentionManager();

      const result = manager.checkRetention(
        'financial_records',
        new Date('2022-01-01'),
        new Date('2022-12-31')
      );

      expect(result.mustRetain).toBe(true);
      expect(result.daysRemaining).toBeGreaterThan(0);
    });
  });

  describe('TC-REG-239: Data Retention - Safe to Destroy', () => {
    it('should allow destruction of old tenant applications', () => {
      const manager = new DataRetentionManager();

      const result = manager.checkRetention(
        'tenant_application',
        new Date('2018-01-01'),
        new Date('2018-01-01')
      );

      expect(result.mustRetain).toBe(false);
      expect(result.requiresSecureDestruction).toBe(true);
    });
  });

  describe('TC-REG-240: Litigation Hold', () => {
    it('should prevent destruction when lit hold applied', () => {
      const manager = new DataRetentionManager();

      const result = manager.applyLitHold([
        'lease_agreement',
        'security_deposit_records',
        'repair_invoices',
      ]);

      expect(result.documentsHeld.length).toBe(3);
      expect(result.message).toContain('Do not destroy');
    });
  });

  describe('TC-REG-241: Lead Paint Disclosure Required', () => {
    it('should require lead paint disclosure for pre-1978 property', () => {
      const manager = new DisclosureManager();

      const required = manager.getRequiredDisclosures('TX', 1965);

      expect(required.some(r => r.disclosureType === 'lead_paint')).toBe(true);
    });
  });

  describe('TC-REG-242: Lead Paint Disclosure Not Required', () => {
    it('should not require lead paint disclosure for post-1978 property', () => {
      const manager = new DisclosureManager();

      const required = manager.getRequiredDisclosures('TX', 1985);

      expect(required.some(r => r.disclosureType === 'lead_paint')).toBe(false);
    });
  });

  describe('TC-REG-243: State-Specific Disclosure', () => {
    it('should require mold disclosure in California', () => {
      const manager = new DisclosureManager();

      const required = manager.getRequiredDisclosures('CA', 2000);

      expect(required.some(r => r.disclosureType === 'mold')).toBe(true);
    });
  });

  describe('TC-REG-244: Disclosure Validation - Missing', () => {
    it('should identify missing required disclosures', () => {
      const manager = new DisclosureManager();
      const required = manager.getRequiredDisclosures('CA', 1960);

      const completed = [
        { type: 'mold', signedDate: new Date('2024-06-01') },
      ];

      const result = manager.validateDisclosures(
        completed,
        required,
        new Date('2024-06-15')
      );

      expect(result.compliant).toBe(false);
      expect(result.missing.some(m => m.includes('lead_paint'))).toBe(true);
    });
  });

  describe('TC-REG-245: CCPA Data Deletion Request', () => {
    it('should identify deletable vs retained data under CCPA', () => {
      const manager = new PrivacyComplianceManager();

      const result = manager.handleDataDeletionRequest(
        'CCPA',
        'tenant-123',
        ['marketing_preferences', 'payment_history', 'lease_documents', 'browsing_history']
      );

      expect(result.deletable).toContain('marketing_preferences');
      expect(result.deletable).toContain('browsing_history');
      expect(result.retained.some(r => r.category === 'payment_history')).toBe(true);
      expect(result.responseDeadlineDays).toBe(45);
    });
  });

  describe('TC-REG-246: GDPR Data Deletion Request', () => {
    it('should use 30-day response deadline for GDPR', () => {
      const manager = new PrivacyComplianceManager();

      const result = manager.handleDataDeletionRequest(
        'GDPR',
        'tenant-123',
        ['marketing_preferences']
      );

      expect(result.responseDeadlineDays).toBe(30);
    });
  });

  describe('TC-REG-247: Privacy Report Generation', () => {
    it('should generate comprehensive privacy report', () => {
      const manager = new PrivacyComplianceManager();

      const report = manager.generatePrivacyReport('tenant-123');

      expect(report.dataCollected.length).toBeGreaterThan(0);
      expect(report.thirdPartySharing.length).toBeGreaterThan(0);
      expect(report.retentionPeriods.length).toBeGreaterThan(0);
    });
  });

  describe('TC-REG-248: Fair Housing Advertising Compliance', () => {
    it('should flag discriminatory language in listings', () => {
      const prohibitedTerms = [
        'no children',
        'adults only',
        'perfect for singles',
        'christian',
        'no wheelchairs',
        'english speakers',
        'no section 8',
      ];

      const checkListingCompliance = (description: string): {
        compliant: boolean;
        flaggedTerms: string[];
      } => {
        const flagged = prohibitedTerms.filter(term =>
          description.toLowerCase().includes(term)
        );

        return {
          compliant: flagged.length === 0,
          flaggedTerms: flagged,
        };
      };

      const result = checkListingCompliance(
        'Beautiful 2BR apartment, perfect for singles or couples. Adults only, no children please.'
      );

      expect(result.compliant).toBe(false);
      expect(result.flaggedTerms).toContain('adults only');
      expect(result.flaggedTerms).toContain('no children');
    });
  });

  describe('TC-REG-249: ADA Accommodation Request', () => {
    it('should track reasonable accommodation requests', () => {
      interface AccommodationRequest {
        tenantId: string;
        requestType: 'service_animal' | 'parking' | 'unit_modification' | 'policy_exception';
        requestDate: Date;
        description: string;
        verificationReceived: boolean;
        approved?: boolean;
        responseDate?: Date;
      }

      const processAccommodation = (request: AccommodationRequest): {
        status: 'pending_verification' | 'approved' | 'denied' | 'interactive_process';
        responseDeadline: Date;
        interactiveProcessRequired: boolean;
      } => {
        const responseDeadline = new Date(request.requestDate);
        responseDeadline.setDate(responseDeadline.getDate() + 10); // Respond within 10 days

        if (!request.verificationReceived) {
          return {
            status: 'pending_verification',
            responseDeadline,
            interactiveProcessRequired: false,
          };
        }

        if (request.requestType === 'unit_modification') {
          return {
            status: 'interactive_process',
            responseDeadline,
            interactiveProcessRequired: true,
          };
        }

        return {
          status: 'approved',
          responseDeadline,
          interactiveProcessRequired: false,
        };
      };

      const result = processAccommodation({
        tenantId: 'tenant-1',
        requestType: 'service_animal',
        requestDate: new Date(),
        description: 'Emotional support animal',
        verificationReceived: true,
      });

      expect(result.status).toBe('approved');
    });
  });

  describe('TC-REG-250: Environmental Disclosure Tracking', () => {
    it('should track all environmental disclosures', () => {
      interface EnvironmentalDisclosure {
        propertyId: string;
        disclosureType: 'lead' | 'asbestos' | 'mold' | 'radon' | 'flood_zone' | 'earthquake_zone';
        lastInspectionDate?: Date;
        result: 'positive' | 'negative' | 'not_tested';
        disclosed: boolean;
        disclosureDate?: Date;
      }

      const validateEnvironmentalCompliance = (
        disclosures: EnvironmentalDisclosure[],
        propertyYear: number,
        state: string
      ): { compliant: boolean; missingDisclosures: string[] } => {
        const missing: string[] = [];

        // Lead required for pre-1978
        if (propertyYear < 1978) {
          const leadDisclosure = disclosures.find(d => d.disclosureType === 'lead');
          if (!leadDisclosure?.disclosed) {
            missing.push('lead');
          }
        }

        // State-specific requirements
        if (state === 'CA') {
          const asbestos = disclosures.find(d => d.disclosureType === 'asbestos');
          if (!asbestos?.disclosed) {
            missing.push('asbestos');
          }
        }

        return {
          compliant: missing.length === 0,
          missingDisclosures: missing,
        };
      };

      const disclosures: EnvironmentalDisclosure[] = [
        { propertyId: 'prop-1', disclosureType: 'lead', result: 'negative', disclosed: true, disclosureDate: new Date() },
      ];

      const result = validateEnvironmentalCompliance(disclosures, 1965, 'CA');

      expect(result.compliant).toBe(false); // Missing asbestos for CA
      expect(result.missingDisclosures).toContain('asbestos');
    });
  });
});
