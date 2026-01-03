/**
 * Summary Reporter
 * Generates console-based validation reports
 */

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

/**
 * Summary Reporter class
 */
export class SummaryReporter {
  constructor(options = {}) {
    this.useColors = options.useColors !== false;
    this.verbose = options.verbose || false;
  }

  /**
   * Apply color to text
   * @param {string} text - Text to color
   * @param {string} color - Color name
   * @returns {string} Colored text
   */
  color(text, color) {
    if (!this.useColors) return text;
    return `${COLORS[color] || ''}${text}${COLORS.reset}`;
  }

  /**
   * Get severity color
   * @param {string} severity - Severity level
   * @returns {string} Color name
   */
  getSeverityColor(severity) {
    switch (severity) {
      case 'critical': return 'bgRed';
      case 'error': return 'red';
      case 'warning': return 'yellow';
      case 'info': return 'cyan';
      default: return 'white';
    }
  }

  /**
   * Format a number with padding
   * @param {number} num - Number to format
   * @param {number} width - Width
   * @returns {string} Padded number
   */
  pad(num, width = 5) {
    return String(num).padStart(width);
  }

  /**
   * Print separator line
   * @param {string} char - Character to use
   * @param {number} length - Line length
   */
  printSeparator(char = '=', length = 80) {
    console.log(char.repeat(length));
  }

  /**
   * Print centered text
   * @param {string} text - Text to center
   * @param {number} width - Total width
   */
  printCentered(text, width = 80) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    console.log(' '.repeat(padding) + text);
  }

  /**
   * Print header
   * @param {string} title - Header title
   */
  printHeader(title) {
    console.log('');
    this.printSeparator();
    this.printCentered(this.color(title, 'bright'));
    this.printSeparator();
    console.log(`${this.color('Generated:', 'dim')} ${new Date().toISOString()}`);
    console.log('');
  }

  /**
   * Print summary statistics
   * @param {object} summary - Summary object
   */
  printSummary(summary) {
    console.log(this.color('SUMMARY', 'bright'));
    console.log(this.color('-------', 'dim'));

    const criticalLabel = summary.critical > 0
      ? this.color(`${this.pad(summary.critical)} ***BLOCKING***`, 'bgRed')
      : this.color(this.pad(summary.critical), 'green');

    const errorLabel = summary.errors > 0
      ? this.color(this.pad(summary.errors), 'red')
      : this.color(this.pad(summary.errors), 'green');

    const warningLabel = summary.warnings > 0
      ? this.color(this.pad(summary.warnings), 'yellow')
      : this.color(this.pad(summary.warnings), 'green');

    console.log(`  Critical: ${criticalLabel}`);
    console.log(`  Errors:   ${errorLabel}`);
    console.log(`  Warnings: ${warningLabel}`);
    console.log(`  Info:     ${this.color(this.pad(summary.info), 'cyan')}`);
    console.log(`  ${this.color('-'.repeat(20), 'dim')}`);
    console.log(`  Total:    ${this.pad(summary.total)}`);
    console.log('');
  }

  /**
   * Print issues by severity
   * @param {object[]} issues - Array of issues
   * @param {string} severity - Severity to filter
   * @param {string} title - Section title
   */
  printIssuesBySeveity(issues, severity, title) {
    const filtered = issues.filter(i => i.severity === severity);
    if (filtered.length === 0) return;

    const color = this.getSeverityColor(severity);
    console.log(this.color(title, color));
    console.log(this.color('-'.repeat(title.length), 'dim'));

    filtered.forEach(issue => {
      const location = `[${issue.validator}] ${issue.table}.${issue.field}`;
      console.log(`  ${this.color(location, 'dim')}`);
      console.log(`    ${issue.message}`);
      if (issue.suggestedFix && this.verbose) {
        console.log(`    ${this.color('FIX:', 'green')} ${issue.suggestedFix}`);
      }
      if (issue.record) {
        console.log(`    ${this.color('Record:', 'dim')} ${issue.record}`);
      }
      console.log('');
    });
  }

  /**
   * Print data summary
   * @param {object} seedData - Seed data object
   */
  printDataSummary(seedData) {
    console.log(this.color('SEED DATA SUMMARY', 'bright'));
    console.log(this.color('-----------------', 'dim'));

    const counts = {
      companies: seedData.companies?.length || 0,
      properties: seedData.properties?.length || 0,
      units: seedData.units?.length || 0,
      tenants: seedData.tenants?.length || 0,
      owners: seedData.owners?.length || 0,
      vendors: seedData.vendors?.length || 0,
      leases: seedData.leases?.length || 0,
      payments: seedData.payments?.length || 0,
      journalEntries: seedData.journalEntries?.length || 0,
      journalPostings: seedData.journalPostings?.length || 0,
    };

    console.log(`  Companies:       ${this.pad(counts.companies)}`);
    console.log(`  Properties:      ${this.pad(counts.properties)}`);
    console.log(`  Units:           ${this.pad(counts.units)}`);
    console.log(`  Tenants:         ${this.pad(counts.tenants)}`);
    console.log(`  Owners:          ${this.pad(counts.owners)}`);
    console.log(`  Vendors:         ${this.pad(counts.vendors)}`);
    console.log(`  Leases:          ${this.pad(counts.leases)}`);
    console.log(`  Payments:        ${this.pad(counts.payments)}`);
    console.log(`  Journal Entries: ${this.pad(counts.journalEntries)}`);
    console.log(`  Journal Postings:${this.pad(counts.journalPostings)}`);

    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`  ${this.color('-'.repeat(25), 'dim')}`);
    console.log(`  Total Records:   ${this.color(this.pad(totalRecords), 'bright')}`);
    console.log('');
  }

  /**
   * Print pass/fail result
   * @param {boolean} passed - Whether validation passed
   */
  printResult(passed) {
    this.printSeparator();
    if (passed) {
      this.printCentered(this.color('VALIDATION PASSED', 'green'));
      this.printCentered('Seed data is ready for insertion');
    } else {
      this.printCentered(this.color('VALIDATION FAILED', 'red'));
      this.printCentered('Fix critical issues and errors before running seed script');
    }
    this.printSeparator();
    console.log('');
  }

  /**
   * Generate full report
   * @param {object[]} validationResults - Array of validator results
   * @param {object} seedData - Seed data object
   */
  generateReport(validationResults, seedData = {}) {
    // Aggregate all issues
    const allIssues = validationResults.flatMap(r => r.issues);

    // Calculate combined summary
    const summary = {
      total: allIssues.length,
      critical: allIssues.filter(i => i.severity === 'critical').length,
      errors: allIssues.filter(i => i.severity === 'error').length,
      warnings: allIssues.filter(i => i.severity === 'warning').length,
      info: allIssues.filter(i => i.severity === 'info').length,
    };

    // Print report
    this.printHeader('PROPMASTER SEED DATA VALIDATION REPORT');
    this.printDataSummary(seedData);
    this.printSummary(summary);

    // Print issues by severity (only critical and errors by default)
    if (summary.critical > 0) {
      this.printIssuesBySeveity(allIssues, 'critical', 'CRITICAL ISSUES (MUST FIX BEFORE SEEDING)');
    }

    if (summary.errors > 0) {
      this.printIssuesBySeveity(allIssues, 'error', 'ERRORS');
    }

    if (this.verbose && summary.warnings > 0) {
      this.printIssuesBySeveity(allIssues, 'warning', 'WARNINGS');
    }

    if (this.verbose && summary.info > 0) {
      this.printIssuesBySeveity(allIssues, 'info', 'INFO');
    }

    // Print result
    const passed = summary.critical === 0 && summary.errors === 0;
    this.printResult(passed);

    return {
      passed,
      summary,
      issues: allIssues,
    };
  }

  /**
   * Print progress update
   * @param {string} message - Progress message
   * @param {number} current - Current count
   * @param {number} total - Total count
   */
  printProgress(message, current, total) {
    const percentage = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
    process.stdout.write(`\r${message} [${bar}] ${percentage}% (${current}/${total})`);
    if (current === total) console.log('');
  }

  /**
   * Print step completion
   * @param {string} step - Step name
   * @param {boolean} success - Whether successful
   * @param {string} details - Additional details
   */
  printStep(step, success, details = '') {
    const icon = success ? this.color('✓', 'green') : this.color('✗', 'red');
    const detailText = details ? this.color(` (${details})`, 'dim') : '';
    console.log(`  ${icon} ${step}${detailText}`);
  }
}

export default SummaryReporter;
