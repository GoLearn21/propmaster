/**
 * Property Generator
 * Generates property data with state-specific compliance
 */

import { propertyId, uuid, bankAccountId } from '../../utils/id-generators.mjs';
import { seedMetadata, seedEmail } from '../../utils/markers.mjs';
import { isoTimestamp, monthsAgo, randomDateInRange } from '../../utils/date-utils.mjs';
import { randomAmount } from '../../utils/decimal-utils.mjs';
import { PROPERTY_TYPES, STATE_COMPLIANCE } from '../../config/seed-config.mjs';

// Street name pools for realistic addresses
const STREET_NAMES = {
  residential: [
    'Oak Lane', 'Maple Drive', 'Pine Street', 'Cedar Avenue', 'Willow Way',
    'Birch Road', 'Elm Court', 'Magnolia Boulevard', 'Dogwood Circle', 'Hickory Path',
  ],
  commercial: [
    'Commerce Drive', 'Business Park Way', 'Corporate Boulevard', 'Industrial Avenue',
    'Enterprise Road', 'Trade Center Drive', 'Office Park Lane',
  ],
};

// City data with neighborhoods
const CITY_DATA = {
  NC: {
    Charlotte: ['Uptown', 'South End', 'NoDa', 'Plaza Midwood', 'Dilworth', 'Myers Park'],
    Raleigh: ['Downtown', 'North Hills', 'Cameron Village', 'Five Points', 'Glenwood South'],
    Durham: ['Downtown', 'Ninth Street', 'Brightleaf', 'Trinity Park', 'Walltown'],
  },
  SC: {
    Charleston: ['Downtown', 'Mount Pleasant', 'West Ashley', 'James Island', 'Folly Beach'],
    Columbia: ['Downtown', 'Five Points', 'The Vista', 'Forest Acres', 'Shandon'],
    Greenville: ['Downtown', 'Augusta Road', 'North Main', 'West End', 'Pleasantburg'],
  },
  GA: {
    Atlanta: ['Midtown', 'Buckhead', 'Virginia Highland', 'Inman Park', 'Old Fourth Ward'],
    Savannah: ['Historic District', 'Victorian District', 'Midtown', 'Starland', 'Thomas Square'],
    Augusta: ['Downtown', 'Summerville', 'The Hill', 'Forest Hills', 'Martinez'],
  },
};

/**
 * Generate a random street address
 * @param {string} propertyType - Property type (residential/commercial)
 * @returns {string} Street address
 */
function generateAddress(propertyType) {
  const number = Math.floor(Math.random() * 9900) + 100;
  const streets = propertyType.includes('commercial')
    ? STREET_NAMES.commercial
    : STREET_NAMES.residential;
  const street = streets[Math.floor(Math.random() * streets.length)];
  return `${number} ${street}`;
}

/**
 * Generate a random city and neighborhood
 * @param {string} state - State code
 * @returns {object} City and neighborhood
 */
function getRandomLocation(state) {
  const cities = Object.keys(CITY_DATA[state] || {});
  if (cities.length === 0) {
    return { city: 'Unknown', neighborhood: null };
  }
  const city = cities[Math.floor(Math.random() * cities.length)];
  const neighborhoods = CITY_DATA[state][city];
  const neighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
  return { city, neighborhood };
}

/**
 * Generate a ZIP code based on state
 * @param {string} state - State code
 * @returns {string} ZIP code
 */
function generateZip(state) {
  const prefixes = { NC: ['27', '28'], SC: ['29'], GA: ['30', '31'] };
  const prefix = prefixes[state]?.[Math.floor(Math.random() * prefixes[state].length)] || '00';
  return `${prefix}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
}

/**
 * Select a random property type
 * @param {string} category - Category filter (residential, commercial, all)
 * @returns {object} Property type configuration
 */
function selectPropertyType(category = 'all') {
  let types = PROPERTY_TYPES;
  if (category === 'residential') {
    types = types.filter(t => ['single_family', 'multi_family'].includes(t.type));
  } else if (category === 'commercial') {
    types = types.filter(t => t.type === 'commercial');
  }
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Generate a single property
 * @param {object} options - Generation options
 * @returns {object} Property record
 */
export function generateProperty(options = {}) {
  const {
    companyId = null,
    state = ['NC', 'SC', 'GA'][Math.floor(Math.random() * 3)],
    category = 'all',
    status = 'active',
    testCaseId = null,
    index = 0,
  } = options;

  const id = propertyId(state);
  const propType = selectPropertyType(category);
  const location = getRandomLocation(state);
  const unitCount = propType.minUnits === propType.maxUnits
    ? propType.minUnits
    : Math.floor(Math.random() * (propType.maxUnits - propType.minUnits + 1)) + propType.minUnits;

  // Calculate occupancy (random 70-100%)
  const occupancyRate = 0.7 + Math.random() * 0.3;
  const occupiedUnits = Math.round(unitCount * occupancyRate);

  // Property value based on units
  const baseValue = propType.type === 'commercial' ? 500000 : 150000;
  const propertyValue = baseValue + (unitCount * 75000) + Math.floor(Math.random() * 100000);

  return {
    id,
    company_id: companyId,

    // Property details
    name: `${location.neighborhood || location.city} ${propType.subtype.charAt(0).toUpperCase() + propType.subtype.slice(1)}`,
    type: propType.type,
    subtype: propType.subtype,

    // Address
    address: generateAddress(propType.type),
    city: location.city,
    state,
    zip: generateZip(state),
    country: 'US',
    neighborhood: location.neighborhood,

    // Unit info
    total_units: unitCount,
    occupied_units: occupiedUnits,

    // Financials
    property_value: propertyValue.toString(),
    year_built: 1970 + Math.floor(Math.random() * 54),
    square_feet: unitCount * (propType.type === 'commercial' ? 2000 : 1000) + Math.floor(Math.random() * 5000),

    // Status
    status,
    is_active: status === 'active',

    // Compliance (state-specific)
    state_compliance: STATE_COMPLIANCE[state],

    // Timestamps
    created_at: randomDateInRange(monthsAgo(24), monthsAgo(1)),
    updated_at: isoTimestamp(),

    // Seed metadata
    metadata: seedMetadata(testCaseId, {
      seed_type: 'property',
      property_type: propType.type,
      state,
      index,
    }),
  };
}

/**
 * Generate properties for a company
 * @param {string} companyId - Company ID
 * @param {string} companyState - Company's primary state
 * @param {number} count - Number of properties
 * @returns {object[]} Array of property records
 */
export function generatePropertiesForCompany(companyId, companyState, count) {
  const properties = [];

  // 70% in primary state, 30% in neighboring states
  const stateDistribution = {
    [companyState]: Math.ceil(count * 0.7),
  };

  // Add neighboring states
  const neighboringStates = ['NC', 'SC', 'GA'].filter(s => s !== companyState);
  const remainingCount = count - stateDistribution[companyState];
  neighboringStates.forEach((s, i) => {
    stateDistribution[s] = Math.floor(remainingCount / neighboringStates.length);
    if (i === 0) {
      stateDistribution[s] += remainingCount % neighboringStates.length;
    }
  });

  let index = 0;
  for (const [state, stateCount] of Object.entries(stateDistribution)) {
    for (let i = 0; i < stateCount; i++) {
      properties.push(generateProperty({
        companyId,
        state,
        index: index++,
      }));
    }
  }

  return properties;
}

/**
 * Generate all properties for multiple companies
 * @param {object[]} companies - Array of companies
 * @param {number} propertiesPerCompany - Properties per company
 * @returns {object[]} Array of all property records
 */
export function generateAllProperties(companies, propertiesPerCompany = 60) {
  const allProperties = [];

  for (const company of companies) {
    const properties = generatePropertiesForCompany(
      company.id,
      company.state,
      propertiesPerCompany
    );
    allProperties.push(...properties);
  }

  return allProperties;
}

/**
 * Generate bank accounts for a property
 * @param {object} property - Property record
 * @returns {object[]} Array of bank account records
 */
export function generatePropertyBankAccounts(property) {
  const accounts = [];

  // Operating account
  accounts.push({
    id: bankAccountId('checking'),
    property_id: property.id,
    account_name: `${property.name} Operating`,
    bank_name: 'First National Bank',
    account_type: 'checking',
    routing_number: '053000196',
    account_number_last4: String(Math.floor(Math.random() * 9000) + 1000),
    current_balance: randomAmount(10000, 100000),
    is_primary: true,
    is_active: true,
    created_at: property.created_at,
    updated_at: isoTimestamp(),
    metadata: seedMetadata(null, { seed_type: 'bank_account', account_type: 'operating' }),
  });

  // Trust account (for security deposits)
  accounts.push({
    id: bankAccountId('trust'),
    property_id: property.id,
    account_name: `${property.name} Trust`,
    bank_name: 'First National Bank',
    account_type: 'trust',
    routing_number: '053000196',
    account_number_last4: String(Math.floor(Math.random() * 9000) + 1000),
    current_balance: randomAmount(5000, 50000),
    is_primary: false,
    is_active: true,
    created_at: property.created_at,
    updated_at: isoTimestamp(),
    metadata: seedMetadata(null, { seed_type: 'bank_account', account_type: 'trust' }),
  });

  return accounts;
}

/**
 * Get property distribution by state
 * @param {object[]} properties - Array of properties
 * @returns {object} Distribution by state
 */
export function getPropertyDistribution(properties) {
  const distribution = { NC: 0, SC: 0, GA: 0, total: 0 };
  properties.forEach(p => {
    if (distribution[p.state] !== undefined) {
      distribution[p.state]++;
    }
    distribution.total++;
  });
  return distribution;
}

export default {
  generateProperty,
  generatePropertiesForCompany,
  generateAllProperties,
  generatePropertyBankAccounts,
  getPropertyDistribution,
};
