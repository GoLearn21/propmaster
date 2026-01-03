/**
 * Large Portfolio Generator
 * Generates stress test data for large property portfolios
 */

import { propertyId, unitId, tenantId, leaseId, companyId } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import {
  isoTimestamp,
  monthsAgo,
  daysAgo,
  randomDateInRange,
} from '../../utils/date-utils.mjs';
import { randomAmount, decimalAdd, decimalSum } from '../../utils/decimal-utils.mjs';

/**
 * Generate properties in batch
 * @param {number} count - Number of properties
 * @param {object} company - Company record
 * @returns {object[]} Properties
 */
function generatePropertiesBatch(count, company) {
  const properties = [];
  const states = ['NC', 'SC', 'GA'];
  const types = ['apartment', 'condo', 'sfh', 'townhouse', 'mixed'];

  for (let i = 0; i < count; i++) {
    const state = states[i % states.length];
    const type = types[i % types.length];
    const unitCount = type === 'sfh' ? 1 : 10 + Math.floor(Math.random() * 90);

    properties.push({
      id: propertyId(),
      company_id: company.id,
      name: `Stress Property ${i + 1}`,
      property_type: type,
      state,
      address: `${1000 + i} Stress Test Blvd`,
      city: state === 'NC' ? 'Raleigh' : state === 'SC' ? 'Charleston' : 'Atlanta',
      zip_code: `${27600 + i}`,
      total_units: unitCount,
      occupied_units: Math.floor(unitCount * 0.85),
      vacancy_rate: '15.00',
      total_monthly_rent: randomAmount(unitCount * 800, unitCount * 1500),
      status: 'active',
      created_at: monthsAgo(24),
      updated_at: isoTimestamp(),
      metadata: seedMetadata('STRESS-001', {
        seed_type: 'stress_property',
        batch_index: i,
      }),
    });
  }

  return properties;
}

/**
 * Generate units for properties in batch
 * @param {object[]} properties - Properties
 * @returns {object[]} Units
 */
function generateUnitsBatch(properties) {
  const units = [];

  properties.forEach(property => {
    for (let i = 0; i < property.total_units; i++) {
      const isOccupied = i < property.occupied_units;

      units.push({
        id: unitId(),
        property_id: property.id,
        unit_number: String(100 + i),
        bedrooms: 1 + Math.floor(Math.random() * 3),
        bathrooms: 1 + Math.floor(Math.random() * 2),
        sqft: 600 + Math.floor(Math.random() * 800),
        rent_amount: randomAmount(900, 2000),
        status: isOccupied ? 'occupied' : 'available',
        created_at: property.created_at,
        updated_at: isoTimestamp(),
        metadata: seedMetadata('STRESS-001', {
          seed_type: 'stress_unit',
        }),
      });
    }
  });

  return units;
}

/**
 * Generate tenants for occupied units
 * @param {object[]} units - Units
 * @param {object[]} properties - Properties
 * @returns {object[]} Tenants
 */
function generateTenantsBatch(units, properties) {
  const tenants = [];
  const propertyMap = new Map(properties.map(p => [p.id, p]));

  const occupiedUnits = units.filter(u => u.status === 'occupied');

  occupiedUnits.forEach((unit, i) => {
    const property = propertyMap.get(unit.property_id);

    tenants.push({
      id: tenantId(),
      property_id: unit.property_id,
      unit_id: unit.id,
      first_name: `Stress`,
      last_name: `Tenant${i + 1}`,
      email: `stress.tenant${i + 1}@test.local`,
      phone: `555-${String(1000 + i).padStart(4, '0')}`,
      status: 'active',
      balance_due: '0.00',
      payment_behavior: i % 10 === 0 ? 'LATE_PAYER' : 'PERFECT_PAYER',
      created_at: daysAgo(Math.floor(Math.random() * 365)),
      updated_at: isoTimestamp(),
      metadata: seedMetadata('STRESS-001', {
        seed_type: 'stress_tenant',
      }),
    });
  });

  return tenants;
}

/**
 * Generate leases for tenants
 * @param {object[]} tenants - Tenants
 * @param {object[]} units - Units
 * @param {object[]} properties - Properties
 * @returns {object[]} Leases
 */
function generateLeasesBatch(tenants, units, properties) {
  const leases = [];
  const unitMap = new Map(units.map(u => [u.id, u]));
  const propertyMap = new Map(properties.map(p => [p.id, p]));

  tenants.forEach((tenant, i) => {
    const unit = unitMap.get(tenant.unit_id);
    const property = propertyMap.get(tenant.property_id);

    leases.push({
      id: leaseId(),
      lease_number: `STRESS-${String(i + 1).padStart(6, '0')}`,
      property_id: tenant.property_id,
      unit_id: tenant.unit_id,
      tenant_id: tenant.id,
      start_date: monthsAgo(Math.floor(Math.random() * 11) + 1),
      end_date: randomDateInRange(isoTimestamp(), monthsAgo(-12)),
      monthly_rent: unit?.rent_amount || '1200.00',
      security_deposit: decimalAdd(unit?.rent_amount || '1200.00', unit?.rent_amount || '1200.00'),
      status: 'active',
      term_months: 12,
      grace_period_days: 5,
      late_fee_percentage: 5,
      late_fee_flat: 15,
      created_at: tenant.created_at,
      updated_at: isoTimestamp(),
      metadata: seedMetadata('STRESS-001', {
        seed_type: 'stress_lease',
      }),
    });
  });

  return leases;
}

/**
 * Generate large portfolio dataset
 * @param {object} options - Generation options
 * @returns {object} Generated data
 */
export function generateLargePortfolio(options = {}) {
  const {
    propertyCount = 100,
    unitsPerProperty = 20,
    occupancyRate = 0.85,
  } = options;

  console.log(`Generating stress test data: ${propertyCount} properties...`);

  // Create company
  const company = {
    id: companyId(),
    name: 'Stress Test Property Management',
    state: 'NC',
    status: 'active',
    created_at: monthsAgo(36),
    updated_at: isoTimestamp(),
    metadata: seedMetadata('STRESS-001', {
      seed_type: 'stress_company',
    }),
  };

  // Generate data
  const properties = generatePropertiesBatch(propertyCount, company);
  console.log(`  Generated ${properties.length} properties`);

  const units = generateUnitsBatch(properties);
  console.log(`  Generated ${units.length} units`);

  const tenants = generateTenantsBatch(units, properties);
  console.log(`  Generated ${tenants.length} tenants`);

  const leases = generateLeasesBatch(tenants, units, properties);
  console.log(`  Generated ${leases.length} leases`);

  // Calculate totals
  const totalRent = decimalSum(leases.map(l => l.monthly_rent));
  const avgOccupancy = tenants.length / units.length * 100;

  return {
    company,
    properties,
    units,
    tenants,
    leases,
    summary: {
      propertyCount: properties.length,
      unitCount: units.length,
      tenantCount: tenants.length,
      leaseCount: leases.length,
      totalMonthlyRent: totalRent,
      occupancyRate: avgOccupancy.toFixed(2) + '%',
    },
  };
}

/**
 * Generate scaled portfolio based on target
 * @param {string} scale - 'small' | 'medium' | 'large' | 'enterprise'
 * @returns {object} Generated data
 */
export function generateScaledPortfolio(scale = 'medium') {
  const scales = {
    small: { propertyCount: 10, unitsPerProperty: 10 },
    medium: { propertyCount: 50, unitsPerProperty: 20 },
    large: { propertyCount: 200, unitsPerProperty: 30 },
    enterprise: { propertyCount: 500, unitsPerProperty: 50 },
  };

  const config = scales[scale] || scales.medium;
  return generateLargePortfolio(config);
}

export default {
  generateLargePortfolio,
  generateScaledPortfolio,
};
