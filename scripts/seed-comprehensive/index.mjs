#!/usr/bin/env node

/**
 * PropMaster Comprehensive Seed Data System
 *
 * Master orchestrator for generating, validating, and inserting
 * seed data that covers all 500+ zero-tolerance accounting tests
 * and complete property manager workflow scenarios.
 *
 * Usage:
 *   node scripts/seed-comprehensive/index.mjs --validate --report=html
 *   node scripts/seed-comprehensive/index.mjs --dry-run --validate
 *   node scripts/seed-comprehensive/index.mjs --stress --units=10000
 *   node scripts/seed-comprehensive/index.mjs --clear --force
 */

import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

// Config imports
import { DATA_VOLUMES, VALIDATION_THRESHOLDS, STATE_COMPLIANCE } from './config/seed-config.mjs';
import { ALL_TEST_CASES, getTestCasesByCategory, getAllTestCaseIds } from './config/test-case-map.mjs';

// Create a SEED_CONFIG object for compatibility
const SEED_CONFIG = {
  version: '1.0.0',
  monthsOfHistory: DATA_VOLUMES.paymentHistoryMonths || 6,
};

// Volume targets (will be adjusted for quick mode)
let VOLUME_TARGETS = {
  companies: DATA_VOLUMES.companies,
  properties: DATA_VOLUMES.propertiesPerCompany * DATA_VOLUMES.companies,
  units: DATA_VOLUMES.unitsPerProperty,
  people: DATA_VOLUMES.tenantsPerProperty * DATA_VOLUMES.companies * DATA_VOLUMES.propertiesPerCompany,
};

// Quick mode volumes for faster testing
const QUICK_VOLUME_TARGETS = {
  companies: 2,
  properties: 10,
  units: 5,
  people: 50,
};

// Core generators
import { generateCompanies } from './generators/core/companies.mjs';
import { generateAllProperties } from './generators/core/properties.mjs';
import { generateAllUnits } from './generators/core/units.mjs';
import { generateTenantsForUnits, generateOwnersForCompany, generateVendorsForCompany } from './generators/core/people.mjs';

// Leasing generators
import { generateLeasesForTenants } from './generators/leasing/leases.mjs';
import { generateLeaseLifecycleScenarios } from './generators/leasing/lease-lifecycle.mjs';

// Payment generators
import { generateAllPaymentHistory } from './generators/payments/payment-history.mjs';
import { generatePaymentScenarios } from './generators/payments/payment-scenarios.mjs';

// Accounting generators
import { generateChartOfAccounts, ACCOUNT_CODES } from './generators/accounting/chart-of-accounts.mjs';
import { generateJournalEntriesFromPayments, generateUnbalancedEntriesForTesting } from './generators/accounting/journal-entries.mjs';
import { generateAllTrustAccounts, generateCommingledTrustAccount } from './generators/accounting/trust-accounts.mjs';
import { generateAllDistributions } from './generators/accounting/owner-distributions.mjs';

// Aliases for consistency
const generateJournalEntries = generateJournalEntriesFromPayments;
const generateLeases = generateLeasesForTenants;
const generateOwnerDistributions = generateAllDistributions;
const generatePaymentHistory = generateAllPaymentHistory;
const generateProperties = generateAllProperties;
const generateUnits = generateAllUnits;
const generateTrustAccounts = generateAllTrustAccounts;

// Create a wrapper for generatePeople that returns all people types
const generatePeople = (properties, units, count) => {
  const tenants = generateTenantsForUnits(units, properties);
  const companies = [...new Set(properties.map(p => ({ id: p.company_id, name: 'Company', state: p.state })))];
  const owners = companies.flatMap(c => generateOwnersForCompany(c, Math.ceil(20 / companies.length)));
  const vendors = companies.flatMap(c => generateVendorsForCompany(c, Math.ceil(30 / companies.length)));
  return { tenants, owners, vendors };
};

// Compliance generators
import {
  generateLateFeeScenarios,
  generateSecurityDepositScenarios,
  generateComplianceTestData,
  DETAILED_STATE_RULES
} from './generators/compliance/state-rules.mjs';

// Edge case generators
import { generateAllTC_FLT_Data } from './generators/edge-cases/TC-FLT-floating-point.mjs';
import { generateAllTC_CAL_Data } from './generators/edge-cases/TC-CAL-class-action.mjs';
import { generateAllTC_REC_Data } from './generators/edge-cases/TC-REC-reconciliation.mjs';
import { generateAllTC_AUD_Data } from './generators/edge-cases/TC-AUD-audit-trail.mjs';
import { generateAllTC_HIS_Data } from './generators/edge-cases/TC-HIS-fraud-patterns.mjs';

// Create wrapper functions for consistency
const generateFloatingPointTestData = (seedData) => generateAllTC_FLT_Data();
const generateClassActionTestData = (seedData) => generateAllTC_CAL_Data();
const generateReconciliationTestData = (seedData) => generateAllTC_REC_Data();
const generateAuditTrailTestData = (seedData) => generateAllTC_AUD_Data();
const generateFraudPatternTestData = (seedData) => generateAllTC_HIS_Data();

// Stress test generators
import { generateLargePortfolio, generateScaledPortfolio } from './generators/stress/large-portfolio.mjs';
import { generateHighVolumeDataset } from './generators/stress/high-volume-payments.mjs';

// Validators
import { ConstraintValidator } from './validators/constraint-validator.mjs';
import { IntegrityValidator } from './validators/integrity-validator.mjs';
import { BalanceValidator } from './validators/balance-validator.mjs';
import { AccountingValidator } from './validators/accounting-validator.mjs';
import { IndexValidator } from './validators/index-validator.mjs';

// Reporters
import { SummaryReporter } from './reporters/summary-reporter.mjs';
import { HtmlReporter } from './reporters/html-reporter.mjs';
import { JsonReporter } from './reporters/json-reporter.mjs';

// Utilities
import { seedMetadata, SEED_MARKER_PREFIX } from './utils/markers.mjs';
import { isoTimestamp } from './utils/date-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse command line arguments
 */
function parseCliArgs() {
  const options = {
    validate: { type: 'boolean', short: 'v', default: true },
    'dry-run': { type: 'boolean', short: 'd', default: false },
    stress: { type: 'boolean', short: 's', default: false },
    clear: { type: 'boolean', short: 'c', default: false },
    force: { type: 'boolean', short: 'f', default: false },
    report: { type: 'string', short: 'r', default: 'summary' },
    units: { type: 'string', default: '3000' },
    payments: { type: 'string', default: '50000' },
    scale: { type: 'string', default: 'medium' },
    output: { type: 'string', short: 'o', default: './reports' },
    help: { type: 'boolean', short: 'h', default: false },
    verbose: { type: 'boolean', default: false },
    'edge-cases-only': { type: 'boolean', default: false },
    'skip-edge-cases': { type: 'boolean', default: false },
    'quick': { type: 'boolean', default: false },
  };

  try {
    const { values } = parseArgs({ options, allowPositionals: true });
    return values;
  } catch (error) {
    console.error(`Error parsing arguments: ${error.message}`);
    printHelp();
    process.exit(1);
  }
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
PropMaster Comprehensive Seed Data System
==========================================

Usage: node scripts/seed-comprehensive/index.mjs [options]

Options:
  -v, --validate          Run validation (default: true)
  -d, --dry-run           Generate and validate without DB insertion
  -s, --stress            Generate stress test data (10,000+ units)
  -c, --clear             Clear existing seed data
  -f, --force             Force clear without confirmation
  -r, --report <type>     Report format: summary, html, json, all (default: summary)
  -o, --output <dir>      Output directory for reports (default: ./reports)
  --units <count>         Target unit count for stress test (default: 3000)
  --payments <count>      Target payment count (default: 50000)
  --scale <size>          Portfolio scale: small, medium, large, enterprise
  --edge-cases-only       Generate only edge case test data
  --skip-edge-cases       Skip edge case generation
  --quick                 Quick test mode (reduced data volumes)
  --verbose               Verbose output
  -h, --help              Show this help message

Examples:
  # Full seed with HTML report
  node scripts/seed-comprehensive/index.mjs --report=html

  # Dry run validation only
  node scripts/seed-comprehensive/index.mjs --dry-run --report=all

  # Stress test with 10,000 units
  node scripts/seed-comprehensive/index.mjs --stress --units=10000

  # Generate only edge cases for testing
  node scripts/seed-comprehensive/index.mjs --edge-cases-only --dry-run

  # Clear all seed data
  node scripts/seed-comprehensive/index.mjs --clear --force
`);
}

/**
 * Generate all seed data
 */
async function generateSeedData(args) {
  console.log('\n' + '='.repeat(80));
  console.log('                    PROPMASTER SEED DATA GENERATION');
  console.log('='.repeat(80) + '\n');

  const startTime = Date.now();
  const seedData = {
    metadata: {
      generated_at: isoTimestamp(),
      version: SEED_CONFIG.version,
      mode: args.stress ? 'stress' : args['edge-cases-only'] ? 'edge-cases' : 'standard',
    },
  };

  // Track generation stats
  const stats = {
    companies: 0,
    properties: 0,
    units: 0,
    tenants: 0,
    owners: 0,
    vendors: 0,
    leases: 0,
    payments: 0,
    journalEntries: 0,
    journalPostings: 0,
    accounts: 0,
    trustAccounts: 0,
    securityDeposits: 0,
    distributions: 0,
    edgeCases: 0,
  };

  try {
    // Edge cases only mode
    if (args['edge-cases-only']) {
      console.log('Generating edge case test data only...\n');

      // Generate minimal supporting data for edge cases
      seedData.companies = generateCompanies(1);
      seedData.properties = generateProperties(seedData.companies, 10);
      seedData.units = generateUnits(seedData.properties, 5);
      const people = generatePeople(seedData.properties, seedData.units, 50);
      seedData.tenants = people.tenants;
      seedData.owners = people.owners;
      seedData.vendors = people.vendors;
      seedData.leases = generateLeases(seedData.tenants, seedData.units, seedData.properties);

      // Generate all edge cases
      const edgeCases = await generateEdgeCases(seedData, args);
      Object.assign(seedData, edgeCases);

      return { seedData, stats };
    }

    // Stress test mode
    if (args.stress) {
      console.log(`Generating stress test data (scale: ${args.scale})...\n`);

      const portfolio = generateScaledPortfolio(args.scale);
      seedData.companies = [portfolio.company];
      seedData.properties = portfolio.properties;
      seedData.units = portfolio.units;
      seedData.tenants = portfolio.tenants;
      seedData.owners = [];
      seedData.vendors = [];
      seedData.leases = portfolio.leases;

      // Generate high-volume payments
      const monthsOfHistory = parseInt(args.payments) > 50000 ? 24 : 12;
      const paymentData = generateHighVolumeDataset(portfolio, monthsOfHistory);
      seedData.payments = paymentData.payments;
      seedData.journalEntries = paymentData.journalEntries;
      seedData.journalPostings = paymentData.journalPostings;

      stats.companies = seedData.companies.length;
      stats.properties = seedData.properties.length;
      stats.units = seedData.units.length;
      stats.tenants = seedData.tenants.length;
      stats.leases = seedData.leases.length;
      stats.payments = seedData.payments.length;
      stats.journalEntries = seedData.journalEntries.length;
      stats.journalPostings = seedData.journalPostings.length;

      console.log(`\nStress test summary:`);
      console.log(`  Properties: ${stats.properties}`);
      console.log(`  Units: ${stats.units}`);
      console.log(`  Tenants: ${stats.tenants}`);
      console.log(`  Payments: ${stats.payments}`);
      console.log(`  Journal Entries: ${stats.journalEntries}`);

      return { seedData, stats };
    }

    // Standard generation mode
    console.log('Phase 1: Generating core entities...');

    // Companies
    seedData.companies = generateCompanies(VOLUME_TARGETS.companies);
    stats.companies = seedData.companies.length;
    console.log(`  ✓ Companies: ${stats.companies}`);

    // Properties (distributed across companies and states)
    seedData.properties = generateProperties(seedData.companies, VOLUME_TARGETS.properties);
    stats.properties = seedData.properties.length;
    console.log(`  ✓ Properties: ${stats.properties}`);

    // Units
    seedData.units = generateUnits(seedData.properties, VOLUME_TARGETS.units);
    stats.units = seedData.units.length;
    console.log(`  ✓ Units: ${stats.units}`);

    // People (tenants, owners, vendors)
    console.log('\nPhase 2: Generating people...');
    const people = generatePeople(seedData.properties, seedData.units, VOLUME_TARGETS.people);
    seedData.tenants = people.tenants;
    seedData.owners = people.owners;
    seedData.vendors = people.vendors;
    stats.tenants = seedData.tenants.length;
    stats.owners = seedData.owners.length;
    stats.vendors = seedData.vendors.length;
    console.log(`  ✓ Tenants: ${stats.tenants}`);
    console.log(`  ✓ Owners: ${stats.owners}`);
    console.log(`  ✓ Vendors: ${stats.vendors}`);

    // Leases
    console.log('\nPhase 3: Generating leases...');
    seedData.leases = generateLeases(seedData.tenants, seedData.units, seedData.properties);
    stats.leases = seedData.leases.length;
    console.log(`  ✓ Leases: ${stats.leases}`);

    // Lease lifecycle scenarios
    const lifecycleData = generateLeaseLifecycleScenarios(seedData);
    seedData.leaseLifecycleEvents = lifecycleData.events;
    console.log(`  ✓ Lifecycle Events: ${lifecycleData.events.length}`);

    // Chart of Accounts
    console.log('\nPhase 4: Generating accounting data...');
    seedData.accounts = generateChartOfAccounts(seedData.companies);
    stats.accounts = seedData.accounts.length;
    console.log(`  ✓ Accounts: ${stats.accounts}`);

    // Payments
    seedData.payments = generatePaymentHistory(seedData.tenants, seedData.leases, seedData.properties, SEED_CONFIG.monthsOfHistory);

    // Add payment scenarios (edge cases)
    const paymentScenarios = generatePaymentScenarios(seedData);
    seedData.payments = [...seedData.payments, ...paymentScenarios.payments];
    stats.payments = seedData.payments.length;
    console.log(`  ✓ Payments: ${stats.payments}`);

    // Journal Entries
    const journalData = generateJournalEntries(seedData.payments, seedData.companies, seedData.properties, seedData.tenants);
    seedData.journalEntries = journalData.entries;
    seedData.journalPostings = journalData.postings;
    stats.journalEntries = seedData.journalEntries.length;
    stats.journalPostings = seedData.journalPostings.length;
    console.log(`  ✓ Journal Entries: ${stats.journalEntries}`);
    console.log(`  ✓ Journal Postings: ${stats.journalPostings}`);

    // First create simple trust accounts (one per property) without deposit data
    const baseTrustAccounts = seedData.properties.map((property, idx) => ({
      id: `trust_${property.state.toLowerCase()}_${String(idx + 1).padStart(4, '0')}`,
      property_id: property.id,
      company_id: property.company_id,
      account_name: `${property.name} Trust Account`,
      account_number: `TRUST-${property.state}-${String(idx + 1).padStart(6, '0')}`,
      bank_name: 'First National Trust Bank',
      balance: '0.0000',
      state: property.state,
      status: 'active',
      created_at: isoTimestamp(),
      updated_at: isoTimestamp(),
      metadata: seedMetadata('SEED-TRUST'),
    }));

    // Create trust account lookup map
    const trustAccountMap = new Map(baseTrustAccounts.map(t => [t.property_id, t]));

    // Security Deposits (now can reference trust accounts)
    seedData.securityDeposits = seedData.leases
      .filter(l => l.security_deposit && parseFloat(l.security_deposit) > 0)
      .map(lease => ({
        id: `dep_${lease.id.slice(4)}`,
        lease_id: lease.id,
        tenant_id: lease.tenant_id,
        property_id: lease.property_id,
        amount: lease.security_deposit,
        status: 'held',
        received_date: lease.start_date,
        trust_account_id: trustAccountMap.get(lease.property_id)?.id,
        created_at: lease.created_at,
        updated_at: isoTimestamp(),
        metadata: seedMetadata('SEED-DEP', { lease_number: lease.lease_number }),
      }));
    stats.securityDeposits = seedData.securityDeposits.length;
    console.log(`  ✓ Security Deposits: ${stats.securityDeposits}`);

    // Now generate full trust accounts with transactions using deposits
    const trustData = generateTrustAccounts(seedData.companies, seedData.properties, seedData.securityDeposits);
    seedData.trustAccounts = trustData.accounts || baseTrustAccounts;
    seedData.trustTransactions = trustData.transactions || [];
    stats.trustAccounts = seedData.trustAccounts.length;
    console.log(`  ✓ Trust Accounts: ${stats.trustAccounts}`);

    // Owner Distributions
    seedData.distributions = generateOwnerDistributions(seedData.properties, seedData.owners, 6);
    stats.distributions = seedData.distributions.length;
    console.log(`  ✓ Owner Distributions: ${stats.distributions}`);

    // Edge cases (unless skipped)
    if (!args['skip-edge-cases']) {
      console.log('\nPhase 5: Generating edge case test data...');
      const edgeCases = await generateEdgeCases(seedData, args);

      // Merge edge case data
      if (edgeCases.floatingPointTests) {
        seedData.floatingPointTests = edgeCases.floatingPointTests;
        stats.edgeCases += edgeCases.floatingPointTests.testCases?.length || 0;
      }
      if (edgeCases.classActionTests) {
        seedData.classActionTests = edgeCases.classActionTests;
        stats.edgeCases += edgeCases.classActionTests.testCases?.length || 0;
      }
      if (edgeCases.reconciliationTests) {
        seedData.reconciliationTests = edgeCases.reconciliationTests;
        stats.edgeCases += edgeCases.reconciliationTests.testCases?.length || 0;
      }
      if (edgeCases.auditTrailTests) {
        seedData.auditTrailTests = edgeCases.auditTrailTests;
        stats.edgeCases += edgeCases.auditTrailTests.testCases?.length || 0;
      }
      if (edgeCases.fraudPatternTests) {
        seedData.fraudPatternTests = edgeCases.fraudPatternTests;
        stats.edgeCases += edgeCases.fraudPatternTests.testCases?.length || 0;
      }

      console.log(`  ✓ Edge Case Test Scenarios: ${stats.edgeCases}`);
    }

    // Compliance test data
    console.log('\nPhase 6: Generating compliance test data...');
    seedData.complianceTests = generateComplianceTestData(seedData);
    console.log(`  ✓ Late Fee Scenarios: ${seedData.complianceTests.lateFeeScenarios.length}`);
    console.log(`  ✓ Deposit Scenarios: ${seedData.complianceTests.depositScenarios.length}`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✓ Generation completed in ${elapsed}s`);

    return { seedData, stats };

  } catch (error) {
    console.error(`\n✗ Generation failed: ${error.message}`);
    if (args.verbose) {
      console.error(error.stack);
    }
    throw error;
  }
}

/**
 * Generate all edge case test data
 */
async function generateEdgeCases(seedData, args) {
  const edgeCases = {};

  // TC-FLT: Floating Point Precision Tests
  console.log('  Generating TC-FLT (Floating Point) tests...');
  edgeCases.floatingPointTests = generateFloatingPointTestData(seedData);
  console.log(`    ✓ ${edgeCases.floatingPointTests.testCases?.length || 0} test cases`);

  // TC-CAL: Class Action Lawsuit Prevention Tests
  console.log('  Generating TC-CAL (Class Action) tests...');
  edgeCases.classActionTests = generateClassActionTestData(seedData);
  console.log(`    ✓ ${edgeCases.classActionTests.testCases?.length || 0} test cases`);

  // TC-REC: Reconciliation Tests
  console.log('  Generating TC-REC (Reconciliation) tests...');
  edgeCases.reconciliationTests = generateReconciliationTestData(seedData);
  console.log(`    ✓ ${edgeCases.reconciliationTests.testCases?.length || 0} test cases`);

  // TC-AUD: Audit Trail Tests
  console.log('  Generating TC-AUD (Audit Trail) tests...');
  edgeCases.auditTrailTests = generateAuditTrailTestData(seedData);
  console.log(`    ✓ ${edgeCases.auditTrailTests.testCases?.length || 0} test cases`);

  // TC-HIS: Fraud Pattern Detection Tests
  console.log('  Generating TC-HIS (Fraud Pattern) tests...');
  edgeCases.fraudPatternTests = generateFraudPatternTestData(seedData);
  console.log(`    ✓ ${edgeCases.fraudPatternTests.testCases?.length || 0} test cases`);

  return edgeCases;
}

/**
 * Run all validators
 */
async function runValidation(seedData, args) {
  console.log('\n' + '='.repeat(80));
  console.log('                         VALIDATION');
  console.log('='.repeat(80) + '\n');

  const results = [];
  const startTime = Date.now();

  // Constraint Validator
  console.log('Running Constraint Validator...');
  const constraintValidator = new ConstraintValidator();
  results.push(constraintValidator.validate(seedData));
  console.log(`  ✓ ${results[results.length - 1].issues.length} issues found`);

  // Integrity Validator
  console.log('Running Integrity Validator...');
  const integrityValidator = new IntegrityValidator();
  results.push(integrityValidator.validate(seedData));
  console.log(`  ✓ ${results[results.length - 1].issues.length} issues found`);

  // Balance Validator
  console.log('Running Balance Validator...');
  const balanceValidator = new BalanceValidator();
  results.push(balanceValidator.validate(seedData));
  console.log(`  ✓ ${results[results.length - 1].issues.length} issues found`);

  // Accounting Validator
  console.log('Running Accounting Validator...');
  const accountingValidator = new AccountingValidator();
  results.push(accountingValidator.validate(seedData));
  console.log(`  ✓ ${results[results.length - 1].issues.length} issues found`);

  // Index Validator (performance checks)
  console.log('Running Index Validator...');
  const indexValidator = new IndexValidator();
  results.push(indexValidator.validate(seedData));
  console.log(`  ✓ ${results[results.length - 1].issues.length} issues found`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✓ Validation completed in ${elapsed}s`);

  return results;
}

/**
 * Generate reports
 */
async function generateReports(validationResults, seedData, args) {
  console.log('\n' + '='.repeat(80));
  console.log('                         REPORTS');
  console.log('='.repeat(80) + '\n');

  const reportTypes = args.report === 'all'
    ? ['summary', 'html', 'json']
    : [args.report];

  const outputDir = args.output;

  for (const reportType of reportTypes) {
    switch (reportType) {
      case 'summary':
        console.log('Generating Summary Report...');
        const summaryReporter = new SummaryReporter();
        summaryReporter.generateReport(validationResults, seedData);
        break;

      case 'html':
        console.log('Generating HTML Report...');
        const htmlReporter = new HtmlReporter({ outputDir });
        await htmlReporter.writeReport(validationResults, seedData);
        break;

      case 'json':
        console.log('Generating JSON Report...');
        const jsonReporter = new JsonReporter({ outputDir });
        await jsonReporter.writeReport(validationResults, seedData);
        await jsonReporter.writeCIReport(validationResults);
        break;

      default:
        console.warn(`Unknown report type: ${reportType}`);
    }
  }
}

/**
 * Clear existing seed data from database
 */
async function clearSeedData(args) {
  console.log('\n' + '='.repeat(80));
  console.log('                    CLEAR SEED DATA');
  console.log('='.repeat(80) + '\n');

  if (!args.force) {
    console.log('This will delete all seed data from the database.');
    console.log('Use --force to confirm.');
    return false;
  }

  console.log('Clearing seed data...');

  // In a real implementation, this would connect to the database
  // and delete records with the seed marker prefix
  console.log(`  Looking for records with marker prefix: ${SEED_MARKER_PREFIX}`);
  console.log('  [Database connection would go here]');
  console.log('  ✓ Seed data cleared (dry run - no DB connection)');

  return true;
}

/**
 * Calculate validation result
 */
function calculateResult(validationResults) {
  const allIssues = validationResults.flatMap(r => r.issues);
  const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
  const errorCount = allIssues.filter(i => i.severity === 'error').length;
  const warningCount = allIssues.filter(i => i.severity === 'warning').length;
  const infoCount = allIssues.filter(i => i.severity === 'info').length;

  const passed = criticalCount === 0 && errorCount === 0;

  return {
    passed,
    exitCode: passed ? 0 : 1,
    summary: {
      total: allIssues.length,
      critical: criticalCount,
      errors: errorCount,
      warnings: warningCount,
      info: infoCount,
    },
  };
}

/**
 * Main entry point
 */
async function main() {
  const args = parseCliArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Apply quick mode volumes if specified
  if (args.quick) {
    VOLUME_TARGETS = QUICK_VOLUME_TARGETS;
    console.log('Running in quick mode with reduced data volumes...\n');
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║         ██████╗ ██████╗  ██████╗ ██████╗ ███╗   ███╗ █████╗ ███████╗         ║
║         ██╔══██╗██╔══██╗██╔═══██╗██╔══██╗████╗ ████║██╔══██╗██╔════╝         ║
║         ██████╔╝██████╔╝██║   ██║██████╔╝██╔████╔██║███████║███████╗         ║
║         ██╔═══╝ ██╔══██╗██║   ██║██╔═══╝ ██║╚██╔╝██║██╔══██║╚════██║         ║
║         ██║     ██║  ██║╚██████╔╝██║     ██║ ╚═╝ ██║██║  ██║███████║         ║
║         ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝         ║
║                                                                              ║
║                    Comprehensive Seed Data System                            ║
║                         Version ${SEED_CONFIG.version}                                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);

  const startTime = Date.now();
  let exitCode = 0;

  try {
    // Clear mode
    if (args.clear) {
      await clearSeedData(args);
      process.exit(0);
    }

    // Generate seed data
    const { seedData, stats } = await generateSeedData(args);

    // Run validation
    let validationResults = [];
    if (args.validate) {
      validationResults = await runValidation(seedData, args);
    }

    // Generate reports
    await generateReports(validationResults, seedData, args);

    // Calculate result
    const result = calculateResult(validationResults);
    exitCode = result.exitCode;

    // Print final summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '='.repeat(80));

    if (result.passed) {
      console.log('                    ✓ VALIDATION PASSED');
      console.log('='.repeat(80));
      console.log(`\nSeed data is ready for ${args['dry-run'] ? 'insertion' : 'use'}.`);
    } else {
      console.log('                    ✗ VALIDATION FAILED');
      console.log('='.repeat(80));
      console.log(`\n${result.summary.critical} critical, ${result.summary.errors} errors must be fixed.`);
    }

    console.log(`\nTotal time: ${elapsed}s`);

    // In non-dry-run mode, this is where DB insertion would happen
    if (!args['dry-run'] && result.passed) {
      console.log('\n[Database insertion would occur here]');
    }

  } catch (error) {
    console.error(`\n✗ Fatal error: ${error.message}`);
    if (args.verbose) {
      console.error(error.stack);
    }
    exitCode = 1;
  }

  process.exit(exitCode);
}

// Run main
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

export {
  generateSeedData,
  runValidation,
  generateReports,
  clearSeedData,
};
