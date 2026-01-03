/**
 * HTML Reporter
 * Generates developer-friendly HTML validation reports
 */

import fs from 'fs';
import path from 'path';

/**
 * HTML Reporter class
 */
export class HtmlReporter {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './reports';
    this.title = options.title || 'PropMaster Seed Data Validation Report';
  }

  /**
   * Generate severity badge HTML
   * @param {string} severity - Severity level
   * @returns {string} Badge HTML
   */
  severityBadge(severity) {
    const colors = {
      critical: 'bg-red-600 text-white',
      error: 'bg-red-500 text-white',
      warning: 'bg-yellow-500 text-black',
      info: 'bg-blue-500 text-white',
    };

    const color = colors[severity] || 'bg-gray-500 text-white';
    return `<span class="px-2 py-1 rounded text-xs font-bold ${color}">${severity.toUpperCase()}</span>`;
  }

  /**
   * Generate status indicator
   * @param {boolean} passed - Pass status
   * @returns {string} Status HTML
   */
  statusIndicator(passed) {
    if (passed) {
      return `<span class="text-green-600 font-bold">✓ PASSED</span>`;
    }
    return `<span class="text-red-600 font-bold">✗ FAILED</span>`;
  }

  /**
   * Generate summary cards HTML
   * @param {object} summary - Summary object
   * @returns {string} Cards HTML
   */
  generateSummaryCards(summary) {
    return `
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div class="bg-white rounded-lg shadow p-4 border-l-4 ${summary.critical > 0 ? 'border-red-600' : 'border-green-500'}">
          <div class="text-2xl font-bold ${summary.critical > 0 ? 'text-red-600' : 'text-green-600'}">${summary.critical}</div>
          <div class="text-gray-600 text-sm">Critical</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 ${summary.errors > 0 ? 'border-red-500' : 'border-green-500'}">
          <div class="text-2xl font-bold ${summary.errors > 0 ? 'text-red-500' : 'text-green-600'}">${summary.errors}</div>
          <div class="text-gray-600 text-sm">Errors</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 ${summary.warnings > 0 ? 'border-yellow-500' : 'border-green-500'}">
          <div class="text-2xl font-bold ${summary.warnings > 0 ? 'text-yellow-600' : 'text-green-600'}">${summary.warnings}</div>
          <div class="text-gray-600 text-sm">Warnings</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div class="text-2xl font-bold text-blue-600">${summary.info}</div>
          <div class="text-gray-600 text-sm">Info</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
          <div class="text-2xl font-bold text-gray-700">${summary.total}</div>
          <div class="text-gray-600 text-sm">Total Issues</div>
        </div>
      </div>
    `;
  }

  /**
   * Generate data summary table
   * @param {object} seedData - Seed data
   * @returns {string} Table HTML
   */
  generateDataSummaryTable(seedData) {
    const counts = [
      { name: 'Companies', count: seedData.companies?.length || 0 },
      { name: 'Properties', count: seedData.properties?.length || 0 },
      { name: 'Units', count: seedData.units?.length || 0 },
      { name: 'Tenants', count: seedData.tenants?.length || 0 },
      { name: 'Owners', count: seedData.owners?.length || 0 },
      { name: 'Vendors', count: seedData.vendors?.length || 0 },
      { name: 'Leases', count: seedData.leases?.length || 0 },
      { name: 'Payments', count: seedData.payments?.length || 0 },
      { name: 'Journal Entries', count: seedData.journalEntries?.length || 0 },
      { name: 'Journal Postings', count: seedData.journalPostings?.length || 0 },
      { name: 'Security Deposits', count: seedData.securityDeposits?.length || 0 },
      { name: 'Trust Accounts', count: seedData.trustAccounts?.length || 0 },
    ];

    const totalRecords = counts.reduce((sum, c) => sum + c.count, 0);

    return `
      <div class="bg-white rounded-lg shadow mb-8">
        <div class="px-4 py-3 border-b border-gray-200">
          <h3 class="text-lg font-semibold">Seed Data Summary</h3>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${counts.map(c => `
              <div class="text-center p-2 bg-gray-50 rounded">
                <div class="text-xl font-bold text-gray-800">${c.count.toLocaleString()}</div>
                <div class="text-sm text-gray-600">${c.name}</div>
              </div>
            `).join('')}
          </div>
          <div class="mt-4 pt-4 border-t border-gray-200 text-center">
            <span class="text-2xl font-bold text-indigo-600">${totalRecords.toLocaleString()}</span>
            <span class="text-gray-600 ml-2">Total Records</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate issues table
   * @param {object[]} issues - Issue list
   * @param {string} severity - Filter by severity
   * @returns {string} Table HTML
   */
  generateIssuesTable(issues, severity = null) {
    const filtered = severity ? issues.filter(i => i.severity === severity) : issues;

    if (filtered.length === 0) {
      return `<p class="text-gray-500 italic">No issues found.</p>`;
    }

    return `
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suggested Fix</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Test Case</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${filtered.map(issue => `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 whitespace-nowrap">${this.severityBadge(issue.severity)}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">${issue.table || 'N/A'}</div>
                  <div class="text-sm text-gray-500">${issue.field || ''}</div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-sm text-gray-900">${this.escapeHtml(issue.message)}</div>
                  ${issue.record ? `<div class="text-xs text-gray-500 mt-1">Record: ${issue.record}</div>` : ''}
                </td>
                <td class="px-4 py-3">
                  <div class="text-sm text-green-700">${issue.suggestedFix ? this.escapeHtml(issue.suggestedFix) : '-'}</div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap">
                  ${issue.testCaseId ? `<span class="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">${issue.testCaseId}</span>` : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Generate collapsible section
   * @param {string} title - Section title
   * @param {string} content - Section content
   * @param {boolean} open - Default open state
   * @returns {string} Section HTML
   */
  generateCollapsibleSection(title, content, open = false) {
    const id = `section-${Math.random().toString(36).slice(2, 9)}`;
    return `
      <div class="bg-white rounded-lg shadow mb-4">
        <button onclick="toggleSection('${id}')" class="w-full px-4 py-3 border-b border-gray-200 flex justify-between items-center hover:bg-gray-50">
          <h3 class="text-lg font-semibold">${title}</h3>
          <svg id="${id}-icon" class="w-5 h-5 transform ${open ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div id="${id}" class="p-4 ${open ? '' : 'hidden'}">
          ${content}
        </div>
      </div>
    `;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generate full HTML report
   * @param {object[]} validationResults - Validation results
   * @param {object} seedData - Seed data
   * @returns {string} Full HTML document
   */
  generateReport(validationResults, seedData = {}) {
    // Aggregate all issues
    const allIssues = validationResults.flatMap(r => r.issues);

    // Calculate summary
    const summary = {
      total: allIssues.length,
      critical: allIssues.filter(i => i.severity === 'critical').length,
      errors: allIssues.filter(i => i.severity === 'error').length,
      warnings: allIssues.filter(i => i.severity === 'warning').length,
      info: allIssues.filter(i => i.severity === 'info').length,
    };

    const passed = summary.critical === 0 && summary.errors === 0;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .gradient-bg {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
  </style>
</head>
<body class="bg-gray-100 min-h-screen">
  <!-- Header -->
  <header class="gradient-bg text-white py-6 shadow-lg">
    <div class="container mx-auto px-4">
      <h1 class="text-3xl font-bold">PropMaster Seed Data Validation</h1>
      <p class="text-indigo-200 mt-1">Generated: ${new Date().toISOString()}</p>
    </div>
  </header>

  <!-- Main Content -->
  <main class="container mx-auto px-4 py-8">
    <!-- Overall Status -->
    <div class="bg-white rounded-lg shadow p-6 mb-8 flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold">Validation Result</h2>
        <p class="text-gray-600">Zero-tolerance accounting compliance check</p>
      </div>
      <div class="text-right">
        ${this.statusIndicator(passed)}
        <p class="text-sm text-gray-500 mt-1">${passed ? 'Ready for seeding' : 'Fix issues before proceeding'}</p>
      </div>
    </div>

    <!-- Summary Cards -->
    ${this.generateSummaryCards(summary)}

    <!-- Data Summary -->
    ${this.generateDataSummaryTable(seedData)}

    <!-- Issues by Severity -->
    ${summary.critical > 0 ? this.generateCollapsibleSection(
      `Critical Issues (${summary.critical}) - MUST FIX`,
      this.generateIssuesTable(allIssues, 'critical'),
      true
    ) : ''}

    ${summary.errors > 0 ? this.generateCollapsibleSection(
      `Errors (${summary.errors})`,
      this.generateIssuesTable(allIssues, 'error'),
      summary.critical === 0
    ) : ''}

    ${summary.warnings > 0 ? this.generateCollapsibleSection(
      `Warnings (${summary.warnings})`,
      this.generateIssuesTable(allIssues, 'warning'),
      false
    ) : ''}

    ${summary.info > 0 ? this.generateCollapsibleSection(
      `Info (${summary.info})`,
      this.generateIssuesTable(allIssues, 'info'),
      false
    ) : ''}

    <!-- Validators Summary -->
    ${this.generateCollapsibleSection(
      'Validator Details',
      `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${validationResults.map(result => `
            <div class="p-4 bg-gray-50 rounded-lg">
              <h4 class="font-semibold text-gray-800">${result.validator}</h4>
              <div class="mt-2 text-sm">
                <span class="${result.summary.critical > 0 ? 'text-red-600' : 'text-green-600'}">
                  ${result.summary.critical} critical
                </span>
                <span class="mx-2">|</span>
                <span class="${result.summary.errors > 0 ? 'text-red-500' : 'text-green-600'}">
                  ${result.summary.errors} errors
                </span>
                <span class="mx-2">|</span>
                <span class="${result.summary.warnings > 0 ? 'text-yellow-600' : 'text-green-600'}">
                  ${result.summary.warnings} warnings
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      `,
      false
    )}

    <!-- Test Case Coverage -->
    ${this.generateCollapsibleSection(
      'Test Case Coverage',
      `
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          ${['TC-FLT', 'TC-CAL', 'TC-REC', 'TC-AUD', 'TC-HIS'].map(prefix => {
            const count = allIssues.filter(i => i.testCaseId?.startsWith(prefix)).length;
            return `
              <div class="text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-2xl font-bold ${count > 0 ? 'text-orange-600' : 'text-green-600'}">${count}</div>
                <div class="text-sm text-gray-600">${prefix} Issues</div>
              </div>
            `;
          }).join('')}
        </div>
      `,
      false
    )}
  </main>

  <!-- Footer -->
  <footer class="bg-gray-800 text-white py-4 mt-8">
    <div class="container mx-auto px-4 text-center text-sm">
      <p>PropMaster Seed Data Validation System</p>
      <p class="text-gray-400">Zero-Tolerance Accounting | 500+ Test Cases</p>
    </div>
  </footer>

  <script>
    function toggleSection(id) {
      const section = document.getElementById(id);
      const icon = document.getElementById(id + '-icon');
      section.classList.toggle('hidden');
      icon.classList.toggle('rotate-180');
    }
  </script>
</body>
</html>
    `;

    return html;
  }

  /**
   * Write report to file
   * @param {object[]} validationResults - Validation results
   * @param {object} seedData - Seed data
   * @param {string} filename - Output filename
   */
  async writeReport(validationResults, seedData, filename = 'validation-report.html') {
    const html = this.generateReport(validationResults, seedData);

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const outputPath = path.join(this.outputDir, filename);
    fs.writeFileSync(outputPath, html, 'utf8');

    console.log(`HTML report written to: ${outputPath}`);
    return outputPath;
  }
}

export default HtmlReporter;
