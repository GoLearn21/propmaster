/**
 * Integrity Validator
 * Validates referential integrity (FK references, orphans)
 */

/**
 * Integrity Validator class
 */
export class IntegrityValidator {
  constructor() {
    this.name = 'Integrity Validator';
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
   * @param {object} issue - Issue to add
   */
  addIssue(issue) {
    this.issues.push({
      validator: this.name,
      timestamp: new Date().toISOString(),
      ...issue,
    });
  }

  /**
   * Validate foreign key references
   * @param {object[]} childRecords - Records with FK
   * @param {string} childTable - Child table name
   * @param {string} fkField - Foreign key field name
   * @param {object[]} parentRecords - Parent records
   * @param {string} parentTable - Parent table name
   */
  validateForeignKey(childRecords, childTable, fkField, parentRecords, parentTable) {
    const parentIds = new Set(parentRecords.map(p => p.id));

    childRecords.forEach((record, index) => {
      const fkValue = record[fkField];

      // Skip if FK is null (might be nullable)
      if (fkValue === null || fkValue === undefined) return;

      if (!parentIds.has(fkValue)) {
        this.addIssue({
          severity: 'error',
          table: childTable,
          field: fkField,
          record: record.id || `index_${index}`,
          message: `${childTable}.${fkField} references non-existent ${parentTable}: ${fkValue}`,
          suggestedFix: `Ensure ${parentTable} with id "${fkValue}" exists before inserting ${childTable}`,
          relatedTable: parentTable,
          missingId: fkValue,
        });
      }
    });
  }

  /**
   * Check for orphaned records (records that should have parents but don't)
   * @param {object[]} records - Records to check
   * @param {string} tableName - Table name
   * @param {string[]} requiredFKs - Required foreign key fields
   */
  checkOrphans(records, tableName, requiredFKs) {
    records.forEach((record, index) => {
      requiredFKs.forEach(fkField => {
        const fkValue = record[fkField];
        if (fkValue === null || fkValue === undefined) {
          this.addIssue({
            severity: 'warning',
            table: tableName,
            field: fkField,
            record: record.id || `index_${index}`,
            message: `Orphaned record: ${tableName} has null ${fkField}`,
            suggestedFix: `Ensure ${fkField} is set for all ${tableName} records`,
          });
        }
      });
    });
  }

  /**
   * Validate unit → property relationship
   * @param {object[]} units - Unit records
   * @param {object[]} properties - Property records
   */
  validateUnitToProperty(units, properties) {
    this.validateForeignKey(units, 'units', 'property_id', properties, 'properties');

    // Additional check: occupied_units count matches actual occupied units
    const occupiedByProperty = {};
    units.forEach(unit => {
      if (unit.status === 'occupied') {
        occupiedByProperty[unit.property_id] = (occupiedByProperty[unit.property_id] || 0) + 1;
      }
    });

    properties.forEach(property => {
      const actualOccupied = occupiedByProperty[property.id] || 0;
      const recordedOccupied = property.occupied_units;

      if (actualOccupied !== recordedOccupied) {
        this.addIssue({
          severity: 'warning',
          table: 'properties',
          field: 'occupied_units',
          record: property.id,
          message: `Occupancy mismatch: property reports ${recordedOccupied} occupied, but ${actualOccupied} units have status 'occupied'`,
          suggestedFix: `Update property.occupied_units to ${actualOccupied}`,
        });
      }
    });
  }

  /**
   * Validate tenant → unit relationship
   * @param {object[]} tenants - Tenant records
   * @param {object[]} units - Unit records
   */
  validateTenantToUnit(tenants, units) {
    this.validateForeignKey(tenants, 'tenants', 'unit_id', units, 'units');

    // Check: tenant should only be assigned to occupied units
    const occupiedUnitIds = new Set(units.filter(u => u.status === 'occupied').map(u => u.id));

    tenants.forEach(tenant => {
      if (tenant.unit_id && !occupiedUnitIds.has(tenant.unit_id)) {
        const unit = units.find(u => u.id === tenant.unit_id);
        this.addIssue({
          severity: 'warning',
          table: 'tenants',
          field: 'unit_id',
          record: tenant.id,
          message: `Tenant assigned to non-occupied unit (status: ${unit?.status || 'unknown'})`,
          suggestedFix: `Update unit status to 'occupied' or remove tenant assignment`,
        });
      }
    });

    // Check: each occupied unit should have exactly one tenant (for now, single-tenant)
    const tenantsPerUnit = {};
    tenants.forEach(tenant => {
      if (tenant.unit_id) {
        tenantsPerUnit[tenant.unit_id] = (tenantsPerUnit[tenant.unit_id] || 0) + 1;
      }
    });

    for (const [unitId, count] of Object.entries(tenantsPerUnit)) {
      if (count > 1) {
        this.addIssue({
          severity: 'info',
          table: 'units',
          field: 'id',
          record: unitId,
          message: `Unit has ${count} tenants (multiple roommates)`,
          suggestedFix: 'If unintentional, ensure only one tenant per unit',
        });
      }
    }
  }

  /**
   * Validate tenant → property relationship
   * @param {object[]} tenants - Tenant records
   * @param {object[]} properties - Property records
   */
  validateTenantToProperty(tenants, properties) {
    this.validateForeignKey(tenants, 'tenants', 'property_id', properties, 'properties');
  }

  /**
   * Validate lease relationships
   * @param {object[]} leases - Lease records
   * @param {object[]} tenants - Tenant records
   * @param {object[]} units - Unit records
   * @param {object[]} properties - Property records
   */
  validateLeaseRelationships(leases, tenants, units, properties) {
    this.validateForeignKey(leases, 'leases', 'property_id', properties, 'properties');
    this.validateForeignKey(leases, 'leases', 'unit_id', units, 'units');
    this.validateForeignKey(leases, 'leases', 'tenant_id', tenants, 'tenants');

    // Check: lease unit should belong to lease property
    const unitPropertyMap = new Map(units.map(u => [u.id, u.property_id]));

    leases.forEach(lease => {
      if (lease.unit_id && lease.property_id) {
        const unitPropertyId = unitPropertyMap.get(lease.unit_id);
        if (unitPropertyId && unitPropertyId !== lease.property_id) {
          this.addIssue({
            severity: 'error',
            table: 'leases',
            field: 'unit_id',
            record: lease.id,
            message: `Lease unit belongs to different property. Lease property: ${lease.property_id}, Unit's property: ${unitPropertyId}`,
            suggestedFix: 'Ensure lease unit_id matches a unit in lease property_id',
          });
        }
      }
    });

    // Check: no overlapping active leases for same unit
    const activeLeases = leases.filter(l => l.status === 'active');
    const leasesByUnit = {};

    activeLeases.forEach(lease => {
      if (!leasesByUnit[lease.unit_id]) {
        leasesByUnit[lease.unit_id] = [];
      }
      leasesByUnit[lease.unit_id].push(lease);
    });

    for (const [unitId, unitLeases] of Object.entries(leasesByUnit)) {
      if (unitLeases.length > 1) {
        this.addIssue({
          severity: 'error',
          table: 'leases',
          field: 'unit_id',
          record: unitLeases.map(l => l.id).join(', '),
          message: `Multiple active leases for unit ${unitId}`,
          suggestedFix: 'Ensure only one active lease per unit',
        });
      }
    }
  }

  /**
   * Validate payment relationships
   * @param {object[]} payments - Payment records
   * @param {object[]} tenants - Tenant records
   * @param {object[]} leases - Lease records
   */
  validatePaymentRelationships(payments, tenants, leases) {
    this.validateForeignKey(payments, 'payments', 'tenant_id', tenants, 'tenants');
    this.validateForeignKey(payments, 'payments', 'lease_id', leases, 'leases');

    // Check: payment tenant should match lease tenant
    const leaseTenantMap = new Map(leases.map(l => [l.id, l.tenant_id]));

    payments.forEach(payment => {
      if (payment.lease_id && payment.tenant_id) {
        const leaseTenantId = leaseTenantMap.get(payment.lease_id);
        if (leaseTenantId && leaseTenantId !== payment.tenant_id) {
          this.addIssue({
            severity: 'warning',
            table: 'payments',
            field: 'tenant_id',
            record: payment.id,
            message: `Payment tenant doesn't match lease tenant. Payment tenant: ${payment.tenant_id}, Lease tenant: ${leaseTenantId}`,
            suggestedFix: 'Ensure payment tenant_id matches the tenant on the lease',
          });
        }
      }
    });
  }

  /**
   * Validate journal entry postings balance
   * @param {object[]} entries - Journal entries
   * @param {object[]} postings - Journal postings
   */
  validateJournalEntryBalance(entries, postings) {
    if (!postings || postings.length === 0) return;

    // Group postings by entry
    const postingsByEntry = {};
    postings.forEach(posting => {
      const entryId = posting.journal_entry_id;
      if (!postingsByEntry[entryId]) {
        postingsByEntry[entryId] = [];
      }
      postingsByEntry[entryId].push(posting);
    });

    // Validate each entry balances
    for (const [entryId, entryPostings] of Object.entries(postingsByEntry)) {
      let totalDebits = 0;
      let totalCredits = 0;

      entryPostings.forEach(posting => {
        totalDebits += parseFloat(posting.debit_amount || 0);
        totalCredits += parseFloat(posting.credit_amount || 0);
      });

      const diff = Math.abs(totalDebits - totalCredits);
      if (diff > 0.0001) {
        this.addIssue({
          severity: 'critical',
          table: 'journal_entries',
          field: 'postings',
          record: entryId,
          message: `Journal entry is UNBALANCED. Debits: $${totalDebits.toFixed(4)}, Credits: $${totalCredits.toFixed(4)}, Difference: $${diff.toFixed(4)}`,
          suggestedFix: 'Ensure sum of debits equals sum of credits',
          doubleEntryViolation: true,
        });
      }
    }

    // Check that all postings reference valid entries
    const entryIds = new Set(entries.map(e => e.id));
    postings.forEach(posting => {
      if (!entryIds.has(posting.journal_entry_id)) {
        this.addIssue({
          severity: 'error',
          table: 'journal_postings',
          field: 'journal_entry_id',
          record: posting.id,
          message: `Orphaned posting references non-existent journal entry: ${posting.journal_entry_id}`,
          suggestedFix: 'Delete orphaned posting or create missing journal entry',
        });
      }
    });
  }

  /**
   * Run all validations
   * @param {object} seedData - All seed data
   * @returns {object} Validation result
   */
  validate(seedData) {
    this.reset();

    const {
      properties = [],
      units = [],
      tenants = [],
      leases = [],
      payments = [],
      journalEntries = [],
      journalPostings = [],
    } = seedData;

    // Validate relationships
    if (units.length > 0 && properties.length > 0) {
      this.validateUnitToProperty(units, properties);
    }

    if (tenants.length > 0) {
      if (units.length > 0) this.validateTenantToUnit(tenants, units);
      if (properties.length > 0) this.validateTenantToProperty(tenants, properties);
    }

    if (leases.length > 0) {
      this.validateLeaseRelationships(leases, tenants, units, properties);
    }

    if (payments.length > 0) {
      this.validatePaymentRelationships(payments, tenants, leases);
    }

    if (journalEntries.length > 0) {
      this.validateJournalEntryBalance(journalEntries, journalPostings);
    }

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

export default IntegrityValidator;
