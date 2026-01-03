/**
 * Company Generator
 * Generates multi-tenant company data for seed
 */

import { companyId, uuid } from '../../utils/id-generators.mjs';
import { seedMetadata, seedEmail, seedPhone } from '../../utils/markers.mjs';
import { isoTimestamp } from '../../utils/date-utils.mjs';

// Company templates for realistic data
const COMPANY_TEMPLATES = [
  {
    name: 'Carolina Property Management',
    state: 'NC',
    city: 'Charlotte',
    type: 'property_management',
    size: 'large',
  },
  {
    name: 'Peach State Properties',
    state: 'GA',
    city: 'Atlanta',
    type: 'property_management',
    size: 'large',
  },
  {
    name: 'Palmetto Rentals',
    state: 'SC',
    city: 'Charleston',
    type: 'property_management',
    size: 'medium',
  },
  {
    name: 'Tri-State Realty Group',
    state: 'NC',
    city: 'Raleigh',
    type: 'real_estate',
    size: 'large',
  },
  {
    name: 'Coastal Living Management',
    state: 'SC',
    city: 'Myrtle Beach',
    type: 'vacation_rental',
    size: 'medium',
  },
];

// State data for address generation
const STATE_DATA = {
  NC: {
    name: 'North Carolina',
    cities: ['Charlotte', 'Raleigh', 'Durham', 'Greensboro', 'Winston-Salem', 'Fayetteville'],
    zipPrefixes: ['27', '28'],
  },
  SC: {
    name: 'South Carolina',
    cities: ['Charleston', 'Columbia', 'Greenville', 'Myrtle Beach', 'Rock Hill', 'Spartanburg'],
    zipPrefixes: ['29'],
  },
  GA: {
    name: 'Georgia',
    cities: ['Atlanta', 'Augusta', 'Savannah', 'Columbus', 'Athens', 'Macon'],
    zipPrefixes: ['30', '31'],
  },
};

/**
 * Generate a random ZIP code for a state
 * @param {string} state - State code
 * @returns {string} ZIP code
 */
function generateZip(state) {
  const prefixes = STATE_DATA[state]?.zipPrefixes || ['00'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${prefix}${suffix}`;
}

/**
 * Generate a random street address
 * @returns {string} Street address
 */
function generateStreetAddress() {
  const streetNumbers = Math.floor(Math.random() * 9999) + 100;
  const streetNames = [
    'Main Street', 'Oak Avenue', 'Maple Drive', 'Park Road', 'Cedar Lane',
    'Pine Street', 'Elm Avenue', 'Washington Boulevard', 'Commerce Drive',
    'Industrial Parkway', 'Corporate Center', 'Business Park Drive',
  ];
  return `${streetNumbers} ${streetNames[Math.floor(Math.random() * streetNames.length)]}`;
}

/**
 * Generate a single company
 * @param {object} template - Company template
 * @param {number} index - Company index
 * @returns {object} Company record
 */
export function generateCompany(template, index) {
  const id = companyId();
  const stateData = STATE_DATA[template.state];
  const city = template.city || stateData.cities[0];

  return {
    id,
    name: template.name,
    legal_name: `${template.name}, LLC`,
    type: template.type,
    size: template.size,

    // Contact info
    email: seedEmail(template.name.toLowerCase().replace(/\s+/g, '.')),
    phone: seedPhone(index + 1),
    website: `https://${template.name.toLowerCase().replace(/\s+/g, '')}.com`,

    // Address
    address: generateStreetAddress(),
    city,
    state: template.state,
    zip: generateZip(template.state),
    country: 'US',

    // Business info
    tax_id: `${String(Math.floor(Math.random() * 90) + 10)}-${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
    license_number: `PM-${template.state}-${String(index + 1).padStart(6, '0')}`,

    // Status
    status: 'active',
    is_active: true,

    // Timestamps
    created_at: isoTimestamp(),
    updated_at: isoTimestamp(),

    // Seed metadata
    metadata: seedMetadata(null, {
      seed_type: 'company',
      template_name: template.name,
      index,
    }),
  };
}

/**
 * Generate all companies
 * @param {number} count - Number of companies (default uses templates)
 * @returns {object[]} Array of company records
 */
export function generateCompanies(count = COMPANY_TEMPLATES.length) {
  const companies = [];

  for (let i = 0; i < count; i++) {
    const template = COMPANY_TEMPLATES[i % COMPANY_TEMPLATES.length];
    companies.push(generateCompany(template, i));
  }

  return companies;
}

/**
 * Get company distribution by state
 * @param {object[]} companies - Array of companies
 * @returns {object} Distribution by state
 */
export function getCompanyDistribution(companies) {
  const distribution = { NC: 0, SC: 0, GA: 0 };
  companies.forEach(c => {
    if (distribution[c.state] !== undefined) {
      distribution[c.state]++;
    }
  });
  return distribution;
}

/**
 * Get companies by state
 * @param {object[]} companies - Array of companies
 * @param {string} state - State code
 * @returns {object[]} Companies in state
 */
export function getCompaniesByState(companies, state) {
  return companies.filter(c => c.state === state);
}

export default {
  generateCompany,
  generateCompanies,
  getCompanyDistribution,
  getCompaniesByState,
  COMPANY_TEMPLATES,
  STATE_DATA,
};
