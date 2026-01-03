/**
 * Unit Generator
 * Generates unit data for properties
 */

import { unitId, uuid } from '../../utils/id-generators.mjs';
import { seedMetadata } from '../../utils/markers.mjs';
import { isoTimestamp } from '../../utils/date-utils.mjs';
import { randomAmount } from '../../utils/decimal-utils.mjs';
import { UNIT_TYPES, UNIT_STATUSES } from '../../config/seed-config.mjs';

// Unit number formats
const UNIT_NUMBER_FORMATS = {
  single_family: () => 'Main',
  duplex: (index) => ['A', 'B'][index] || String(index + 1),
  triplex: (index) => ['A', 'B', 'C'][index] || String(index + 1),
  fourplex: (index) => ['A', 'B', 'C', 'D'][index] || String(index + 1),
  apartment: (index, floor) => `${floor}${String(index + 1).padStart(2, '0')}`,
  retail: (index) => `Suite ${100 + index}`,
  office: (index, floor) => `${floor}${String(index + 1).padStart(2, '0')}`,
};

// Amenities by unit type
const UNIT_AMENITIES = {
  studio: ['kitchenette', 'closet', 'bathroom'],
  '1br': ['kitchen', 'living_room', 'closet', 'bathroom'],
  '2br': ['kitchen', 'living_room', 'closets', 'bathroom', 'washer_dryer_hookup'],
  '3br': ['kitchen', 'living_room', 'closets', 'bathrooms', 'washer_dryer', 'garage'],
  '4br': ['kitchen', 'living_room', 'closets', 'bathrooms', 'washer_dryer', 'garage', 'yard'],
  commercial: ['reception', 'offices', 'conference_room', 'kitchen', 'restrooms'],
};

/**
 * Select a random unit type configuration
 * @param {string} propertyType - Property type
 * @param {string} propertySubtype - Property subtype
 * @returns {object} Unit type configuration
 */
function selectUnitType(propertyType, propertySubtype) {
  if (propertyType === 'commercial') {
    // Commercial units have different sizing
    return {
      bedrooms: 0,
      bathrooms: 2,
      sqftRange: [500, 5000],
      rentRange: [1500, 10000],
    };
  }

  // Residential - weighted towards 1-2 bedrooms
  const weights = [0.1, 0.35, 0.35, 0.15, 0.05]; // studio, 1br, 2br, 3br, 4br
  const random = Math.random();
  let cumulative = 0;

  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return UNIT_TYPES[i];
    }
  }

  return UNIT_TYPES[1]; // Default to 1BR
}

/**
 * Generate unit number
 * @param {string} subtype - Property subtype
 * @param {number} index - Unit index
 * @param {number} totalUnits - Total units in property
 * @returns {string} Unit number
 */
function generateUnitNumber(subtype, index, totalUnits) {
  const formatter = UNIT_NUMBER_FORMATS[subtype] || UNIT_NUMBER_FORMATS.apartment;

  if (subtype === 'apartment' || subtype === 'office') {
    // Multi-story buildings
    const unitsPerFloor = Math.ceil(totalUnits / Math.ceil(totalUnits / 8));
    const floor = Math.floor(index / unitsPerFloor) + 1;
    const unitOnFloor = index % unitsPerFloor;
    return formatter(unitOnFloor, floor);
  }

  return formatter(index);
}

/**
 * Determine unit status based on occupancy target
 * @param {number} index - Unit index
 * @param {number} occupiedTarget - Number of occupied units
 * @param {number} totalUnits - Total units
 * @returns {string} Unit status
 */
function determineStatus(index, occupiedTarget, totalUnits) {
  if (index < occupiedTarget) {
    return 'occupied';
  }

  const remaining = totalUnits - occupiedTarget;
  const randomVal = Math.random();

  // Of vacant units: 70% available, 20% reserved, 10% maintenance
  if (randomVal < 0.7) return 'available';
  if (randomVal < 0.9) return 'reserved';
  return 'maintenance';
}

/**
 * Generate a single unit
 * @param {object} options - Generation options
 * @returns {object} Unit record
 */
export function generateUnit(options = {}) {
  const {
    property,
    index = 0,
    status = null,
    testCaseId = null,
  } = options;

  const unitType = selectUnitType(property.type, property.subtype);
  const unitNumber = generateUnitNumber(property.subtype, index, property.total_units);

  // Calculate rent within range
  const [minRent, maxRent] = unitType.rentRange;
  const baseRent = minRent + Math.random() * (maxRent - minRent);
  const rent = Math.round(baseRent / 25) * 25; // Round to nearest $25

  // Calculate square feet within range
  const [minSqft, maxSqft] = unitType.sqftRange;
  const sqft = Math.floor(minSqft + Math.random() * (maxSqft - minSqft));

  // Determine status
  const unitStatus = status || determineStatus(index, property.occupied_units, property.total_units);

  // Amenities based on bedrooms
  const bedroomKey = unitType.bedrooms === 0 ? 'studio' : `${unitType.bedrooms}br`;
  const amenities = property.type === 'commercial'
    ? UNIT_AMENITIES.commercial
    : (UNIT_AMENITIES[bedroomKey] || UNIT_AMENITIES['1br']);

  return {
    id: unitId(property.id, unitNumber),
    property_id: property.id,

    // Unit details
    unit_number: unitNumber,
    bedrooms: unitType.bedrooms,
    bathrooms: unitType.bathrooms,
    square_feet: sqft,

    // Financials
    rent_amount: rent.toFixed(2),
    market_rent: (rent * (1 + Math.random() * 0.1)).toFixed(2), // Up to 10% higher
    deposit_amount: (rent * 1.5).toFixed(2), // 1.5 months typical

    // Status
    status: unitStatus,
    is_available: unitStatus === 'available',

    // Features
    floor: property.subtype === 'apartment' ? Math.floor(index / 8) + 1 : 1,
    amenities: JSON.stringify(amenities),
    features: JSON.stringify({
      heating: 'central',
      cooling: 'central_ac',
      parking: property.type === 'commercial' ? 'lot' : 'street',
      laundry: unitType.bedrooms >= 2 ? 'in_unit' : 'shared',
    }),

    // Timestamps
    created_at: property.created_at,
    updated_at: isoTimestamp(),

    // Seed metadata
    metadata: seedMetadata(testCaseId, {
      seed_type: 'unit',
      unit_type: `${unitType.bedrooms}br/${unitType.bathrooms}ba`,
      property_type: property.type,
    }),
  };
}

/**
 * Generate all units for a property
 * @param {object} property - Property record
 * @returns {object[]} Array of unit records
 */
export function generateUnitsForProperty(property) {
  const units = [];

  for (let i = 0; i < property.total_units; i++) {
    units.push(generateUnit({
      property,
      index: i,
    }));
  }

  return units;
}

/**
 * Generate all units for multiple properties
 * @param {object[]} properties - Array of properties
 * @returns {object[]} Array of all unit records
 */
export function generateAllUnits(properties) {
  const allUnits = [];

  for (const property of properties) {
    const units = generateUnitsForProperty(property);
    allUnits.push(...units);
  }

  return allUnits;
}

/**
 * Get unit distribution by status
 * @param {object[]} units - Array of units
 * @returns {object} Distribution by status
 */
export function getUnitDistribution(units) {
  const distribution = {
    occupied: 0,
    available: 0,
    reserved: 0,
    maintenance: 0,
    total: 0,
  };

  units.forEach(u => {
    if (distribution[u.status] !== undefined) {
      distribution[u.status]++;
    }
    distribution.total++;
  });

  distribution.occupancyRate = (distribution.occupied / distribution.total * 100).toFixed(1) + '%';

  return distribution;
}

/**
 * Get vacant units for a property
 * @param {object[]} units - Array of units
 * @param {string} propertyId - Property ID
 * @returns {object[]} Array of vacant units
 */
export function getVacantUnits(units, propertyId) {
  return units.filter(u =>
    u.property_id === propertyId &&
    ['available', 'reserved'].includes(u.status)
  );
}

/**
 * Get occupied units for a property
 * @param {object[]} units - Array of units
 * @param {string} propertyId - Property ID
 * @returns {object[]} Array of occupied units
 */
export function getOccupiedUnits(units, propertyId) {
  return units.filter(u =>
    u.property_id === propertyId &&
    u.status === 'occupied'
  );
}

export default {
  generateUnit,
  generateUnitsForProperty,
  generateAllUnits,
  getUnitDistribution,
  getVacantUnits,
  getOccupiedUnits,
};
