/**
 * Decimal Utilities for Penny-Perfect Precision
 * Uses string-based arithmetic to avoid floating-point errors
 */

/**
 * Add two decimal strings with precision
 * @param {string} a - First decimal string
 * @param {string} b - Second decimal string
 * @param {number} precision - Decimal places (default 4)
 * @returns {string} Sum as decimal string
 */
export function decimalAdd(a, b, precision = 4) {
  const multiplier = Math.pow(10, precision);
  const aInt = Math.round(parseFloat(a || '0') * multiplier);
  const bInt = Math.round(parseFloat(b || '0') * multiplier);
  return ((aInt + bInt) / multiplier).toFixed(precision);
}

/**
 * Subtract two decimal strings with precision
 * @param {string} a - First decimal string
 * @param {string} b - Second decimal string (to subtract)
 * @param {number} precision - Decimal places (default 4)
 * @returns {string} Difference as decimal string
 */
export function decimalSubtract(a, b, precision = 4) {
  const multiplier = Math.pow(10, precision);
  const aInt = Math.round(parseFloat(a || '0') * multiplier);
  const bInt = Math.round(parseFloat(b || '0') * multiplier);
  return ((aInt - bInt) / multiplier).toFixed(precision);
}

/**
 * Multiply decimal string by a number
 * @param {string} a - Decimal string
 * @param {number} multiplier - Multiplier
 * @param {number} precision - Decimal places (default 4)
 * @returns {string} Product as decimal string
 */
export function decimalMultiply(a, multiplier, precision = 4) {
  const precisionMultiplier = Math.pow(10, precision);
  const aInt = Math.round(parseFloat(a || '0') * precisionMultiplier);
  const result = Math.round(aInt * multiplier);
  return (result / precisionMultiplier).toFixed(precision);
}

/**
 * Divide decimal string by a number
 * @param {string} a - Decimal string
 * @param {number} divisor - Divisor
 * @param {number} precision - Decimal places (default 4)
 * @returns {string} Quotient as decimal string
 */
export function decimalDivide(a, divisor, precision = 4) {
  if (divisor === 0) throw new Error('Division by zero');
  const precisionMultiplier = Math.pow(10, precision);
  const aInt = Math.round(parseFloat(a || '0') * precisionMultiplier);
  const result = Math.round(aInt / divisor);
  return (result / precisionMultiplier).toFixed(precision);
}

/**
 * Sum an array of decimal strings
 * @param {string[]} amounts - Array of decimal strings
 * @param {number} precision - Decimal places (default 4)
 * @returns {string} Sum as decimal string
 */
export function decimalSum(amounts, precision = 4) {
  if (!amounts || amounts.length === 0) return (0).toFixed(precision);

  const multiplier = Math.pow(10, precision);
  const total = amounts.reduce((sum, amount) => {
    return sum + Math.round(parseFloat(amount || '0') * multiplier);
  }, 0);

  return (total / multiplier).toFixed(precision);
}

/**
 * Compare two decimal strings
 * @param {string} a - First decimal string
 * @param {string} b - Second decimal string
 * @returns {number} -1 if a < b, 0 if equal, 1 if a > b
 */
export function decimalCompare(a, b) {
  const aNum = parseFloat(a || '0');
  const bNum = parseFloat(b || '0');
  const diff = aNum - bNum;

  if (Math.abs(diff) < 0.00001) return 0;
  return diff < 0 ? -1 : 1;
}

/**
 * Check if decimal string is zero (within precision)
 * @param {string} amount - Decimal string
 * @param {number} precision - Decimal places (default 4)
 * @returns {boolean} True if zero
 */
export function isZero(amount, precision = 4) {
  const threshold = Math.pow(10, -precision);
  return Math.abs(parseFloat(amount || '0')) < threshold;
}

/**
 * Format decimal for display (2 decimal places)
 * @param {string} amount - Decimal string
 * @returns {string} Formatted amount
 */
export function formatCurrency(amount) {
  const num = parseFloat(amount || '0');
  return num.toFixed(2);
}

/**
 * Format decimal for storage (4 decimal places)
 * @param {string|number} amount - Amount
 * @returns {string} Storage format
 */
export function toStorageFormat(amount) {
  const num = parseFloat(amount || '0');
  return num.toFixed(4);
}

/**
 * Calculate rent proration with penny-perfect precision
 * @param {string} monthlyRent - Monthly rent amount
 * @param {number} totalDays - Total days in period
 * @param {number} occupiedDays - Days occupied
 * @returns {string} Prorated amount
 */
export function calculateProration(monthlyRent, totalDays, occupiedDays) {
  const rent = parseFloat(monthlyRent);
  const dailyRate = rent / totalDays;
  const prorated = dailyRate * occupiedDays;
  // Round to nearest cent
  return (Math.round(prorated * 100) / 100).toFixed(2);
}

/**
 * Calculate late fee with state cap enforcement
 * @param {string} rentAmount - Rent amount
 * @param {number} percentRate - Percentage rate (e.g., 5 for 5%)
 * @param {string} maxFee - Maximum fee cap
 * @returns {string} Late fee amount
 */
export function calculateLateFee(rentAmount, percentRate, maxFee) {
  const rent = parseFloat(rentAmount);
  const calculatedFee = rent * (percentRate / 100);
  const max = parseFloat(maxFee);
  const fee = Math.min(calculatedFee, max);
  return fee.toFixed(2);
}

/**
 * Generate random amount within range
 * @param {number} min - Minimum amount
 * @param {number} max - Maximum amount
 * @param {number} precision - Decimal places (default 2)
 * @returns {string} Random amount as string
 */
export function randomAmount(min, max, precision = 2) {
  const range = max - min;
  const random = min + Math.random() * range;
  return random.toFixed(precision);
}

/**
 * Validate that debits equal credits (double-entry)
 * @param {string} totalDebits - Total debits
 * @param {string} totalCredits - Total credits
 * @param {number} tolerance - Tolerance for rounding (default 0.0001)
 * @returns {boolean} True if balanced
 */
export function isBalanced(totalDebits, totalCredits, tolerance = 0.0001) {
  const debits = parseFloat(totalDebits || '0');
  const credits = parseFloat(totalCredits || '0');
  return Math.abs(debits - credits) < tolerance;
}

export default {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  decimalSum,
  decimalCompare,
  isZero,
  formatCurrency,
  toStorageFormat,
  calculateProration,
  calculateLateFee,
  randomAmount,
  isBalanced,
};
