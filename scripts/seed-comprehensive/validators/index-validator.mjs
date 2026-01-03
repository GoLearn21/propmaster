/**
 * Index Validator
 * Validates that data patterns support efficient query performance
 */

/**
 * Index Validator class
 */
export class IndexValidator {
  constructor() {
    this.name = 'Index Validator';
    this.issues = [];
    this.performanceThresholds = {
      warnThreshold: 50,    // 50ms
      errorThreshold: 200,  // 200ms
      criticalThreshold: 1000, // 1000ms
    };
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
   * Validate that data has proper indexable fields
   * @param {object[]} records - Records to validate
   * @param {string} tableName - Table name
   * @param {string[]} expectedIndexes - Expected indexed fields
   */
  validateIndexableFields(records, tableName, expectedIndexes) {
    if (records.length === 0) return;

    const sampleRecord = records[0];

    expectedIndexes.forEach(field => {
      // Check field exists
      if (!(field in sampleRecord)) {
        this.addIssue({
          severity: 'warning',
          table: tableName,
          field,
          message: `Expected index field '${field}' is missing from ${tableName}`,
          suggestedFix: `Add '${field}' column to ${tableName} table`,
        });
        return;
      }

      // Check for null values in indexed field
      const nullCount = records.filter(r => r[field] === null || r[field] === undefined).length;
      const nullPercentage = (nullCount / records.length) * 100;

      if (nullPercentage > 10) {
        this.addIssue({
          severity: 'info',
          table: tableName,
          field,
          message: `${nullPercentage.toFixed(1)}% of ${tableName}.${field} values are NULL`,
          suggestedFix: 'Consider partial index or NOT NULL constraint',
          nullCount,
          totalRecords: records.length,
        });
      }
    });
  }

  /**
   * Validate foreign key patterns for join performance
   * @param {object[]} childRecords - Child table records
   * @param {string} childTable - Child table name
   * @param {string} fkField - Foreign key field
   * @param {object[]} parentRecords - Parent table records
   * @param {string} parentTable - Parent table name
   */
  validateJoinPerformance(childRecords, childTable, fkField, parentRecords, parentTable) {
    if (childRecords.length === 0 || parentRecords.length === 0) return;

    // Check cardinality
    const uniqueFKs = new Set(childRecords.map(r => r[fkField]).filter(v => v));
    const parentCount = parentRecords.length;
    const cardinalityRatio = childRecords.length / parentCount;

    // High cardinality might need different indexing strategy
    if (cardinalityRatio > 100) {
      this.addIssue({
        severity: 'info',
        table: childTable,
        field: fkField,
        message: `High cardinality: ${cardinalityRatio.toFixed(1)} ${childTable} per ${parentTable}`,
        suggestedFix: 'Consider composite index or partitioning for large joins',
        cardinalityRatio,
      });
    }

    // Check for orphaned FK values (already covered by integrity validator, but performance impact noted)
    const parentIds = new Set(parentRecords.map(p => p.id));
    const orphanedFKs = childRecords.filter(r => r[fkField] && !parentIds.has(r[fkField]));

    if (orphanedFKs.length > 0) {
      this.addIssue({
        severity: 'warning',
        table: childTable,
        field: fkField,
        message: `${orphanedFKs.length} orphaned FK values will cause index misses`,
        suggestedFix: 'Fix referential integrity to improve join performance',
        orphanCount: orphanedFKs.length,
      });
    }
  }

  /**
   * Validate date range query patterns
   * @param {object[]} records - Records with date fields
   * @param {string} tableName - Table name
   * @param {string} dateField - Date field name
   */
  validateDateRangePatterns(records, tableName, dateField) {
    if (records.length === 0) return;

    const dates = records
      .map(r => new Date(r[dateField]))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a - b);

    if (dates.length === 0) return;

    const earliestDate = dates[0];
    const latestDate = dates[dates.length - 1];
    const spanDays = (latestDate - earliestDate) / (1000 * 60 * 60 * 24);
    const spanMonths = spanDays / 30;

    // Very wide date ranges might need partitioning
    if (spanMonths > 24) {
      this.addIssue({
        severity: 'info',
        table: tableName,
        field: dateField,
        message: `Date range spans ${spanMonths.toFixed(0)} months - consider range partitioning`,
        suggestedFix: 'Implement date-based partitioning for large date ranges',
        earliestDate: earliestDate.toISOString(),
        latestDate: latestDate.toISOString(),
        spanMonths: spanMonths.toFixed(1),
      });
    }

    // Check for date clustering (many records on same date)
    const dateGroups = {};
    records.forEach(r => {
      const dateKey = r[dateField]?.split('T')[0];
      if (dateKey) {
        dateGroups[dateKey] = (dateGroups[dateKey] || 0) + 1;
      }
    });

    const maxRecordsPerDay = Math.max(...Object.values(dateGroups));
    const avgRecordsPerDay = records.length / Object.keys(dateGroups).length;

    if (maxRecordsPerDay > avgRecordsPerDay * 10) {
      this.addIssue({
        severity: 'info',
        table: tableName,
        field: dateField,
        message: `Date clustering detected: max ${maxRecordsPerDay} records/day vs avg ${avgRecordsPerDay.toFixed(1)}`,
        suggestedFix: 'Consider composite index with additional discriminating column',
        maxRecordsPerDay,
        avgRecordsPerDay: avgRecordsPerDay.toFixed(1),
      });
    }
  }

  /**
   * Validate ID distribution for balanced tree indexes
   * @param {object[]} records - Records to validate
   * @param {string} tableName - Table name
   */
  validateIdDistribution(records, tableName) {
    if (records.length < 100) return; // Need sufficient data

    // Check ID prefix distribution (for UUID-like IDs)
    const prefixCounts = {};
    records.forEach(r => {
      if (r.id && typeof r.id === 'string') {
        const prefix = r.id.slice(0, 4);
        prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
      }
    });

    const uniquePrefixes = Object.keys(prefixCounts).length;
    const expectedPrefixes = Math.min(records.length / 10, 100);

    if (uniquePrefixes < expectedPrefixes * 0.5) {
      this.addIssue({
        severity: 'info',
        table: tableName,
        field: 'id',
        message: `Low ID prefix diversity: ${uniquePrefixes} unique prefixes for ${records.length} records`,
        suggestedFix: 'Consider using UUIDs with version 4 (random) for better index distribution',
        uniquePrefixes,
        totalRecords: records.length,
      });
    }
  }

  /**
   * Validate text search patterns
   * @param {object[]} records - Records to validate
   * @param {string} tableName - Table name
   * @param {string[]} textFields - Text fields that might be searched
   */
  validateTextSearchPatterns(records, tableName, textFields) {
    if (records.length === 0) return;

    textFields.forEach(field => {
      const values = records.map(r => r[field]).filter(v => v && typeof v === 'string');

      if (values.length === 0) return;

      // Check for very long text values
      const maxLength = Math.max(...values.map(v => v.length));
      const avgLength = values.reduce((sum, v) => sum + v.length, 0) / values.length;

      if (maxLength > 1000) {
        this.addIssue({
          severity: 'info',
          table: tableName,
          field,
          message: `Long text values (max ${maxLength} chars) - consider full-text search index`,
          suggestedFix: 'Add GIN index for full-text search on long text fields',
          maxLength,
          avgLength: avgLength.toFixed(1),
        });
      }

      // Check for low cardinality (same values repeated)
      const uniqueValues = new Set(values);
      const cardinalityRatio = uniqueValues.size / values.length;

      if (cardinalityRatio < 0.1 && values.length > 100) {
        this.addIssue({
          severity: 'info',
          table: tableName,
          field,
          message: `Low cardinality text field (${(cardinalityRatio * 100).toFixed(1)}% unique) - index may have poor selectivity`,
          suggestedFix: 'Consider composite index or ENUM type for low-cardinality fields',
          uniqueValues: uniqueValues.size,
          totalValues: values.length,
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
      companies = [],
      properties = [],
      units = [],
      tenants = [],
      leases = [],
      payments = [],
      journalEntries = [],
      journalPostings = [],
    } = seedData;

    // Validate indexable fields for each table
    this.validateIndexableFields(properties, 'properties', ['id', 'company_id', 'state', 'status']);
    this.validateIndexableFields(units, 'units', ['id', 'property_id', 'status', 'unit_number']);
    this.validateIndexableFields(tenants, 'tenants', ['id', 'property_id', 'unit_id', 'email', 'status']);
    this.validateIndexableFields(leases, 'leases', ['id', 'property_id', 'unit_id', 'tenant_id', 'status', 'start_date', 'end_date']);
    this.validateIndexableFields(payments, 'payments', ['id', 'tenant_id', 'lease_id', 'property_id', 'payment_date', 'due_date', 'status']);
    this.validateIndexableFields(journalEntries, 'journal_entries', ['id', 'property_id', 'entry_date', 'status', 'idempotency_key']);
    this.validateIndexableFields(journalPostings, 'journal_postings', ['id', 'journal_entry_id', 'account_code']);

    // Validate join performance
    if (units.length > 0 && properties.length > 0) {
      this.validateJoinPerformance(units, 'units', 'property_id', properties, 'properties');
    }
    if (tenants.length > 0 && units.length > 0) {
      this.validateJoinPerformance(tenants, 'tenants', 'unit_id', units, 'units');
    }
    if (payments.length > 0 && tenants.length > 0) {
      this.validateJoinPerformance(payments, 'payments', 'tenant_id', tenants, 'tenants');
    }
    if (journalPostings.length > 0 && journalEntries.length > 0) {
      this.validateJoinPerformance(journalPostings, 'journal_postings', 'journal_entry_id', journalEntries, 'journal_entries');
    }

    // Validate date range patterns
    if (payments.length > 0) {
      this.validateDateRangePatterns(payments, 'payments', 'payment_date');
    }
    if (journalEntries.length > 0) {
      this.validateDateRangePatterns(journalEntries, 'journal_entries', 'entry_date');
    }
    if (leases.length > 0) {
      this.validateDateRangePatterns(leases, 'leases', 'start_date');
    }

    // Validate ID distribution
    if (payments.length > 100) {
      this.validateIdDistribution(payments, 'payments');
    }
    if (journalEntries.length > 100) {
      this.validateIdDistribution(journalEntries, 'journal_entries');
    }

    // Validate text search patterns
    if (tenants.length > 0) {
      this.validateTextSearchPatterns(tenants, 'tenants', ['first_name', 'last_name', 'email']);
    }
    if (properties.length > 0) {
      this.validateTextSearchPatterns(properties, 'properties', ['name', 'address']);
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

export default IndexValidator;
