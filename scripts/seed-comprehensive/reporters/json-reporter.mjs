/**
 * JSON Reporter
 * Generates machine-readable validation reports for CI/CD integration
 */

import fs from 'fs';
import path from 'path';

/**
 * JSON Reporter class
 */
export class JsonReporter {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './reports';
    this.includeIssueDetails = options.includeIssueDetails !== false;
    this.includeTestCaseMapping = options.includeTestCaseMapping !== false;
  }

  /**
   * Generate report metadata
   * @returns {object} Report metadata
   */
  generateMetadata() {
    return {
      generator: 'PropMaster Seed Data Validator',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version,
    };
  }

  /**
   * Calculate summary statistics
   * @param {object[]} issues - All issues
   * @returns {object} Summary statistics
   */
  calculateSummary(issues) {
    const summary = {
      total: issues.length,
      by_severity: {
        critical: issues.filter(i => i.severity === 'critical').length,
        error: issues.filter(i => i.severity === 'error').length,
        warning: issues.filter(i => i.severity === 'warning').length,
        info: issues.filter(i => i.severity === 'info').length,
      },
      by_validator: {},
      by_table: {},
      by_test_case: {},
      blocking: 0,
      non_blocking: 0,
    };

    issues.forEach(issue => {
      // By validator
      const validator = issue.validator || 'Unknown';
      summary.by_validator[validator] = (summary.by_validator[validator] || 0) + 1;

      // By table
      const table = issue.table || 'Unknown';
      summary.by_table[table] = (summary.by_table[table] || 0) + 1;

      // By test case
      if (issue.testCaseId) {
        summary.by_test_case[issue.testCaseId] = (summary.by_test_case[issue.testCaseId] || 0) + 1;
      }

      // Blocking vs non-blocking
      if (issue.severity === 'critical' || issue.severity === 'error') {
        summary.blocking++;
      } else {
        summary.non_blocking++;
      }
    });

    return summary;
  }

  /**
   * Calculate data statistics
   * @param {object} seedData - Seed data object
   * @returns {object} Data statistics
   */
  calculateDataStats(seedData) {
    const stats = {
      record_counts: {},
      total_records: 0,
    };

    const tables = [
      'companies', 'properties', 'units', 'tenants', 'owners', 'vendors',
      'leases', 'payments', 'securityDeposits', 'trustAccounts',
      'journalEntries', 'journalPostings', 'accounts', 'distributions',
    ];

    tables.forEach(table => {
      const count = seedData[table]?.length || 0;
      stats.record_counts[table] = count;
      stats.total_records += count;
    });

    return stats;
  }

  /**
   * Format issue for JSON output
   * @param {object} issue - Issue object
   * @param {number} index - Issue index
   * @returns {object} Formatted issue
   */
  formatIssue(issue, index) {
    return {
      id: `issue_${String(index + 1).padStart(5, '0')}`,
      severity: issue.severity,
      validator: issue.validator,
      location: {
        table: issue.table,
        field: issue.field,
        record: issue.record,
      },
      message: issue.message,
      suggested_fix: issue.suggestedFix || null,
      test_case_id: issue.testCaseId || null,
      timestamp: issue.timestamp,
      flags: {
        double_entry_violation: issue.doubleEntryViolation || false,
        compliance_violation: issue.complianceViolation || false,
        trust_integrity_violation: issue.trustIntegrityViolation || false,
      },
      additional_data: this.extractAdditionalData(issue),
    };
  }

  /**
   * Extract additional data from issue
   * @param {object} issue - Issue object
   * @returns {object|null} Additional data
   */
  extractAdditionalData(issue) {
    const additionalFields = [
      'relatedTable', 'missingId', 'state', 'imbalance',
      'debitTotal', 'creditTotal', 'duplicateOfEntry',
    ];

    const additional = {};
    let hasData = false;

    additionalFields.forEach(field => {
      if (issue[field] !== undefined) {
        additional[field] = issue[field];
        hasData = true;
      }
    });

    return hasData ? additional : null;
  }

  /**
   * Generate test case coverage report
   * @param {object[]} issues - All issues
   * @returns {object} Test case coverage
   */
  generateTestCaseCoverage(issues) {
    const coverage = {
      'TC-FLT': { total: 0, issues: 0, test_ids: [] },
      'TC-CAL': { total: 0, issues: 0, test_ids: [] },
      'TC-REC': { total: 0, issues: 0, test_ids: [] },
      'TC-AUD': { total: 0, issues: 0, test_ids: [] },
      'TC-HIS': { total: 0, issues: 0, test_ids: [] },
    };

    // Expected test count per category
    const expectedCounts = {
      'TC-FLT': 10,
      'TC-CAL': 10,
      'TC-REC': 10,
      'TC-AUD': 10,
      'TC-HIS': 10,
    };

    Object.keys(coverage).forEach(prefix => {
      coverage[prefix].total = expectedCounts[prefix];
    });

    issues.forEach(issue => {
      if (!issue.testCaseId) return;

      const prefix = issue.testCaseId.split('-').slice(0, 2).join('-');
      if (coverage[prefix]) {
        coverage[prefix].issues++;
        if (!coverage[prefix].test_ids.includes(issue.testCaseId)) {
          coverage[prefix].test_ids.push(issue.testCaseId);
        }
      }
    });

    return coverage;
  }

  /**
   * Generate full JSON report
   * @param {object[]} validationResults - Validation results from all validators
   * @param {object} seedData - Seed data object
   * @returns {object} Full JSON report
   */
  generateReport(validationResults, seedData = {}) {
    // Aggregate all issues
    const allIssues = validationResults.flatMap(r => r.issues);

    // Calculate pass/fail
    const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
    const errorCount = allIssues.filter(i => i.severity === 'error').length;
    const passed = criticalCount === 0 && errorCount === 0;

    const report = {
      metadata: this.generateMetadata(),

      result: {
        passed,
        exit_code: passed ? 0 : 1,
        message: passed
          ? 'Validation passed - seed data is ready for insertion'
          : `Validation failed - ${criticalCount} critical, ${errorCount} errors must be fixed`,
      },

      summary: this.calculateSummary(allIssues),

      data_stats: this.calculateDataStats(seedData),

      validators: validationResults.map(result => ({
        name: result.validator,
        issue_count: result.issues.length,
        summary: result.summary,
      })),
    };

    // Include test case coverage
    if (this.includeTestCaseMapping) {
      report.test_case_coverage = this.generateTestCaseCoverage(allIssues);
    }

    // Include issue details
    if (this.includeIssueDetails) {
      report.issues = allIssues.map((issue, index) => this.formatIssue(issue, index));
    }

    return report;
  }

  /**
   * Generate minimal report for CI/CD
   * @param {object[]} validationResults - Validation results
   * @returns {object} Minimal CI report
   */
  generateCIReport(validationResults) {
    const allIssues = validationResults.flatMap(r => r.issues);

    const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
    const errorCount = allIssues.filter(i => i.severity === 'error').length;
    const warningCount = allIssues.filter(i => i.severity === 'warning').length;
    const passed = criticalCount === 0 && errorCount === 0;

    return {
      passed,
      exit_code: passed ? 0 : 1,
      critical: criticalCount,
      errors: errorCount,
      warnings: warningCount,
      total_issues: allIssues.length,
      timestamp: new Date().toISOString(),
      blocking_issues: allIssues
        .filter(i => i.severity === 'critical' || i.severity === 'error')
        .slice(0, 10) // First 10 blocking issues
        .map(i => ({
          severity: i.severity,
          table: i.table,
          message: i.message,
          test_case: i.testCaseId,
        })),
    };
  }

  /**
   * Generate GitHub Actions compatible output
   * @param {object[]} validationResults - Validation results
   * @returns {string} GitHub Actions output format
   */
  generateGitHubActionsOutput(validationResults) {
    const allIssues = validationResults.flatMap(r => r.issues);
    const lines = [];

    // Output annotations
    allIssues
      .filter(i => i.severity === 'critical' || i.severity === 'error')
      .forEach(issue => {
        const level = issue.severity === 'critical' ? 'error' : 'warning';
        const file = issue.table ? `${issue.table}.mjs` : 'unknown';
        const message = issue.message.replace(/\n/g, '%0A');
        lines.push(`::${level} file=${file}::${message}`);
      });

    // Output summary
    const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
    const errorCount = allIssues.filter(i => i.severity === 'error').length;

    if (criticalCount > 0 || errorCount > 0) {
      lines.push(`::error::Validation failed: ${criticalCount} critical, ${errorCount} errors`);
    } else {
      lines.push('::notice::Validation passed - seed data is ready');
    }

    return lines.join('\n');
  }

  /**
   * Write report to file
   * @param {object[]} validationResults - Validation results
   * @param {object} seedData - Seed data
   * @param {string} filename - Output filename
   */
  async writeReport(validationResults, seedData, filename = 'validation-report.json') {
    const report = this.generateReport(validationResults, seedData);

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const outputPath = path.join(this.outputDir, filename);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`JSON report written to: ${outputPath}`);
    return outputPath;
  }

  /**
   * Write CI report to file
   * @param {object[]} validationResults - Validation results
   * @param {string} filename - Output filename
   */
  async writeCIReport(validationResults, filename = 'ci-report.json') {
    const report = this.generateCIReport(validationResults);

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const outputPath = path.join(this.outputDir, filename);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`CI report written to: ${outputPath}`);
    return outputPath;
  }
}

export default JsonReporter;
