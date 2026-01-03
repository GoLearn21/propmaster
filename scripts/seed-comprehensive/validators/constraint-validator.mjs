/**
 * Constraint Validator
 * Validates database constraints (NOT NULL, CHECK, UNIQUE)
 */

import { VALIDATION_THRESHOLDS } from '../config/seed-config.mjs';

/**
 * Validation issue structure
 * @typedef {object} ValidationIssue
 * @property {string} severity - 'critical' | 'error' | 'warning' | 'info'
 * @property {string} table - Table name
 * @property {string} field - Field name
 * @property {string} record - Record ID
 * @property {string} message - Issue description
 * @property {string} suggestedFix - Suggested fix
 */

/**
 * Constraint Validator class
 */
export class ConstraintValidator {
  constructor() {
    this.name = 'Constraint Validator';
    this.issues = [];
  }

  /**
   * Reset issues for a new validation run
   */
  reset() {
    this.issues = [];
  }

  /**
   * Add an issue to the collection
   * @param {ValidationIssue} issue - Issue to add
   */
  addIssue(issue) {
    this.issues.push({
      validator: this.name,
      timestamp: new Date().toISOString(),
      ...issue,
    });
  }

  /**
   * Validate NOT NULL constraints
   * @param {object[]} records - Records to validate
   * @param {string} tableName - Table name
   * @param {string[]} requiredFields - Required field names
   */
  validateNotNull(records, tableName, requiredFields) {
    records.forEach((record, index) => {
      requiredFields.forEach(field => {
        if (record[field] === null || record[field] === undefined) {
          this.addIssue({
            severity: 'error',
            table: tableName,
            field,
            record: record.id || `index_${index}`,
            message: `${field} is NULL but required (NOT NULL constraint)`,
            suggestedFix: `Ensure ${field} has a valid value before inserting`,
          });
        }
      });
    });
  }

  /**
   * Validate UNIQUE constraints
   * @param {object[]} records - Records to validate
   * @param {string} tableName - Table name
   * @param {string[]} uniqueFields - Unique field names
   */
  validateUnique(records, tableName, uniqueFields) {
    uniqueFields.forEach(field => {
      const values = records.map(r => r[field]).filter(v => v !== null && v !== undefined);
      const duplicates = values.filter((v, i, arr) => arr.indexOf(v) !== i);

      if (duplicates.length > 0) {
        const uniqueDuplicates = [...new Set(duplicates)];
        uniqueDuplicates.forEach(dupValue => {
          const dupRecords = records.filter(r => r[field] === dupValue);
          this.addIssue({
            severity: 'error',
            table: tableName,
            field,
            record: dupRecords.map(r => r.id).join(', '),
            message: `Duplicate value "${dupValue}" found in ${field} (UNIQUE constraint violation)`,
            suggestedFix: `Ensure all ${field} values are unique`,
          });
        });
      }
    });
  }

  /**
   * Validate CHECK constraints (enum values)
   * @param {object[]} records - Records to validate
   * @param {string} tableName - Table name
   * @param {string} field - Field to check
   * @param {string[]} allowedValues - Allowed values
   */
  validateEnum(records, tableName, field, allowedValues) {
    records.forEach((record, index) => {
      const value = record[field];
      if (value !== null && value !== undefined && !allowedValues.includes(value)) {
        this.addIssue({
          severity: 'error',
          table: tableName,
          field,
          record: record.id || `index_${index}`,
          message: `Invalid value "${value}" for ${field}. Allowed: [${allowedValues.join(', ')}]`,
          suggestedFix: `Use one of the allowed values: ${allowedValues.join(', ')}`,
        });
      }
    });
  }

  /**
   * Validate numeric range
   * @param {object[]} records - Records to validate
   * @param {string} tableName - Table name
   * @param {string} field - Field to check
   * @param {object} range - { min, max }
   */
  validateRange(records, tableName, field, range) {
    records.forEach((record, index) => {
      const value = parseFloat(record[field]);
      if (isNaN(value)) return;

      if (range.min !== undefined && value < range.min) {
        this.addIssue({
          severity: 'error',
          table: tableName,
          field,
          record: record.id || `index_${index}`,
          message: `Value ${value} is below minimum ${range.min}`,
          suggestedFix: `Ensure ${field} >= ${range.min}`,
        });
      }

      if (range.max !== undefined && value > range.max) {
        this.addIssue({
          severity: 'error',
          table: tableName,
          field,
          record: record.id || `index_${index}`,
          message: `Value ${value} exceeds maximum ${range.max}`,
          suggestedFix: `Ensure ${field} <= ${range.max}`,
        });
      }
    });
  }

  /**
   * Validate properties
   * @param {object[]} properties - Property records
   */
  validateProperties(properties) {
    // NOT NULL constraints
    this.validateNotNull(properties, 'properties', [
      'id', 'name', 'type', 'address', 'city', 'state', 'zip',
    ]);

    // UNIQUE constraints
    this.validateUnique(properties, 'properties', ['id']);

    // CHECK constraints
    this.validateEnum(properties, 'properties', 'type', [
      'single_family', 'multi_family', 'commercial',
    ]);
    this.validateEnum(properties, 'properties', 'status', [
      'active', 'inactive', 'pending',
    ]);
    this.validateEnum(properties, 'properties', 'state', [
      'NC', 'SC', 'GA', 'FL', 'VA', 'TN',
    ]);

    // Range constraints
    this.validateRange(properties, 'properties', 'total_units', { min: 1 });
    this.validateRange(properties, 'properties', 'occupied_units', { min: 0 });
  }

  /**
   * Validate units
   * @param {object[]} units - Unit records
   */
  validateUnits(units) {
    // NOT NULL constraints
    this.validateNotNull(units, 'units', [
      'id', 'property_id', 'unit_number', 'rent_amount',
    ]);

    // UNIQUE constraints (composite: property_id + unit_number)
    const compositeKeys = units.map(u => `${u.property_id}|${u.unit_number}`);
    const duplicates = compositeKeys.filter((k, i, arr) => arr.indexOf(k) !== i);
    if (duplicates.length > 0) {
      const uniqueDups = [...new Set(duplicates)];
      uniqueDups.forEach(dupKey => {
        this.addIssue({
          severity: 'error',
          table: 'units',
          field: 'property_id,unit_number',
          record: dupKey,
          message: `Duplicate unit number in property: ${dupKey}`,
          suggestedFix: 'Ensure each unit number is unique within its property',
        });
      });
    }

    // CHECK constraints
    this.validateEnum(units, 'units', 'status', [
      'available', 'occupied', 'maintenance', 'reserved',
    ]);

    // Range constraints
    this.validateRange(units, 'units', 'bedrooms', { min: 0, max: 10 });
    this.validateRange(units, 'units', 'bathrooms', { min: 0, max: 10 });
    this.validateRange(units, 'units', 'square_feet', { min: 100, max: 50000 });
    this.validateRange(units, 'units', 'rent_amount', { min: 0 });
  }

  /**
   * Validate tenants
   * @param {object[]} tenants - Tenant records
   */
  validateTenants(tenants) {
    // NOT NULL constraints
    this.validateNotNull(tenants, 'tenants', [
      'id', 'first_name', 'last_name', 'email',
    ]);

    // UNIQUE constraints
    this.validateUnique(tenants, 'tenants', ['id', 'email']);

    // Range constraints
    this.validateRange(tenants, 'tenants', 'balance_due', { min: -100000, max: 1000000 });
  }

  /**
   * Validate leases
   * @param {object[]} leases - Lease records
   */
  validateLeases(leases) {
    // NOT NULL constraints
    this.validateNotNull(leases, 'leases', [
      'id', 'property_id', 'unit_id', 'start_date', 'monthly_rent',
    ]);

    // UNIQUE constraints
    this.validateUnique(leases, 'leases', ['id', 'lease_number']);

    // CHECK constraints
    this.validateEnum(leases, 'leases', 'status', [
      'draft', 'active', 'expired', 'terminated', 'renewed',
    ]);
    this.validateEnum(leases, 'leases', 'lease_type', [
      'fixed_term', 'month_to_month',
    ]);

    // Range constraints
    this.validateRange(leases, 'leases', 'monthly_rent', { min: 0 });
    this.validateRange(leases, 'leases', 'security_deposit', { min: 0 });

    // Date validation
    leases.forEach((lease, index) => {
      if (lease.start_date && lease.end_date) {
        const start = new Date(lease.start_date);
        const end = new Date(lease.end_date);
        if (end < start) {
          this.addIssue({
            severity: 'error',
            table: 'leases',
            field: 'end_date',
            record: lease.id || `index_${index}`,
            message: `Lease end date (${lease.end_date}) is before start date (${lease.start_date})`,
            suggestedFix: 'Ensure end_date >= start_date',
          });
        }
      }
    });
  }

  /**
   * Validate payments
   * @param {object[]} payments - Payment records
   */
  validatePayments(payments) {
    // NOT NULL constraints
    this.validateNotNull(payments, 'payments', [
      'id', 'amount', 'payment_date',
    ]);

    // UNIQUE constraints
    this.validateUnique(payments, 'payments', ['id']);

    // CHECK constraints
    this.validateEnum(payments, 'payments', 'status', [
      'pending', 'completed', 'failed', 'refunded',
    ]);
    this.validateEnum(payments, 'payments', 'payment_method', [
      'ach', 'credit_card', 'check', 'cash', 'online',
    ]);

    // Range constraints
    this.validateRange(payments, 'payments', 'amount', { min: 0.01 });
  }

  /**
   * Validate journal entries
   * @param {object[]} entries - Journal entry records
   */
  validateJournalEntries(entries) {
    // NOT NULL constraints
    this.validateNotNull(entries, 'journal_entries', [
      'id', 'entry_number', 'entry_date', 'description',
    ]);

    // UNIQUE constraints
    this.validateUnique(entries, 'journal_entries', ['id', 'entry_number']);

    // CHECK constraints
    this.validateEnum(entries, 'journal_entries', 'status', [
      'draft', 'posted', 'void',
    ]);
  }

  /**
   * Run all validations
   * @param {object} seedData - All seed data
   * @returns {object} Validation result
   */
  validate(seedData) {
    this.reset();

    if (seedData.properties) this.validateProperties(seedData.properties);
    if (seedData.units) this.validateUnits(seedData.units);
    if (seedData.tenants) this.validateTenants(seedData.tenants);
    if (seedData.leases) this.validateLeases(seedData.leases);
    if (seedData.payments) this.validatePayments(seedData.payments);
    if (seedData.journalEntries) this.validateJournalEntries(seedData.journalEntries);

    return {
      validator: this.name,
      issues: this.issues,
      summary: {
        total: this.issues.length,
        critical: this.issues.filter(i => i.severity === 'critical').length,
        errors: this.issues.filter(i => i.severity === 'error').length,
        warnings: this.issues.filter(i => i.severity === 'warning').length,
        info: this.issues.filter(i => i.severity === 'info').length,
      },
    };
  }
}

export default ConstraintValidator;
