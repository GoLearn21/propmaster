/**
 * Date Utilities for Seed Data Generation
 * Handles date manipulation, ranges, and business day calculations
 */

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 * @returns {string} Today's date
 */
export function today() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get date N days ago
 * @param {number} days - Number of days
 * @returns {string} Date in ISO format
 */
export function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Get date N days from now
 * @param {number} days - Number of days
 * @returns {string} Date in ISO format
 */
export function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Get date N months ago
 * @param {number} months - Number of months
 * @returns {string} Date in ISO format
 */
export function monthsAgo(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().split('T')[0];
}

/**
 * Get date N months from now
 * @param {number} months - Number of months
 * @returns {string} Date in ISO format
 */
export function monthsFromNow(months) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}

/**
 * Get first day of month
 * @param {Date|string} date - Date or date string
 * @returns {string} First day of month
 */
export function firstOfMonth(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

/**
 * Get last day of month
 * @param {Date|string} date - Date or date string
 * @returns {string} Last day of month
 */
export function lastOfMonth(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
}

// Alias for lastOfMonth
export const getMonthEnd = lastOfMonth;

// Alias for firstOfMonth
export const getMonthStart = firstOfMonth;

/**
 * Get number of days in a month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {number} Number of days
 */
export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Check if date is a business day (Monday-Friday)
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if business day
 */
export function isBusinessDay(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

/**
 * Get next business day
 * @param {Date|string} date - Starting date
 * @returns {string} Next business day
 */
export function nextBusinessDay(date) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  do {
    d.setDate(d.getDate() + 1);
  } while (!isBusinessDay(d));
  return d.toISOString().split('T')[0];
}

/**
 * Add business days to a date
 * @param {Date|string} date - Starting date
 * @param {number} days - Number of business days to add
 * @returns {string} Resulting date
 */
export function addBusinessDays(date, days) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (isBusinessDay(d)) remaining--;
  }
  return d.toISOString().split('T')[0];
}

/**
 * Generate array of dates for a month (payment due dates)
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {number} dueDay - Day of month rent is due (default 1)
 * @returns {string} Due date for that month
 */
export function rentDueDate(year, month, dueDay = 1) {
  const maxDay = daysInMonth(year, month);
  const day = Math.min(dueDay, maxDay);
  return new Date(year, month - 1, day).toISOString().split('T')[0];
}

/**
 * Get array of monthly due dates for a period
 * @param {string} startDate - Start date
 * @param {number} months - Number of months
 * @param {number} dueDay - Day of month (default 1)
 * @returns {string[]} Array of due dates
 */
export function getMonthlyDueDates(startDate, months, dueDay = 1) {
  const dates = [];
  const start = new Date(startDate);

  for (let i = 0; i < months; i++) {
    const year = start.getFullYear();
    const month = start.getMonth() + 1 + i;
    const adjustedYear = year + Math.floor((month - 1) / 12);
    const adjustedMonth = ((month - 1) % 12) + 1;
    dates.push(rentDueDate(adjustedYear, adjustedMonth, dueDay));
  }

  return dates;
}

/**
 * Calculate days between two dates
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {number} Number of days
 */
export function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/**
 * Generate random date within range
 * @param {string} startDate - Start of range
 * @param {string} endDate - End of range
 * @returns {string} Random date
 */
export function randomDateInRange(startDate, endDate) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const random = start + Math.random() * (end - start);
  return new Date(random).toISOString().split('T')[0];
}

/**
 * Get the Nth day of month (e.g., 2nd Tuesday)
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {number} dayOfWeek - Day of week (0=Sunday, 1=Monday, etc.)
 * @param {number} n - Which occurrence (1=first, 2=second, etc.)
 * @returns {string} Date
 */
export function nthDayOfMonth(year, month, dayOfWeek, n) {
  const first = new Date(year, month - 1, 1);
  const firstDayOfWeek = first.getDay();
  let day = 1 + ((dayOfWeek - firstDayOfWeek + 7) % 7) + (n - 1) * 7;
  return new Date(year, month - 1, day).toISOString().split('T')[0];
}

/**
 * Format date for display
 * @param {string} date - Date in ISO format
 * @returns {string} Formatted date (MM/DD/YYYY)
 */
export function formatDate(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Get ISO timestamp
 * @returns {string} ISO timestamp
 */
export function isoTimestamp() {
  return new Date().toISOString();
}

/**
 * Check if date is past grace period
 * @param {string} dueDate - Due date
 * @param {number} gracePeriodDays - Grace period in days
 * @returns {boolean} True if past grace period
 */
export function isPastGracePeriod(dueDate, gracePeriodDays) {
  const due = new Date(dueDate);
  const graceEnd = new Date(due);
  graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);
  return new Date() > graceEnd;
}

/**
 * Get lease term dates (common durations)
 * @param {string} startDate - Lease start date
 * @param {number} termMonths - Term in months (default 12)
 * @returns {{ startDate: string, endDate: string }}
 */
export function getLeaseTerm(startDate, termMonths = 12) {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + termMonths);
  end.setDate(end.getDate() - 1); // End day before anniversary

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default {
  today,
  daysAgo,
  daysFromNow,
  monthsAgo,
  monthsFromNow,
  firstOfMonth,
  lastOfMonth,
  getMonthStart,
  getMonthEnd,
  daysInMonth,
  isBusinessDay,
  nextBusinessDay,
  addBusinessDays,
  rentDueDate,
  getMonthlyDueDates,
  daysBetween,
  randomDateInRange,
  nthDayOfMonth,
  formatDate,
  isoTimestamp,
  isPastGracePeriod,
  getLeaseTerm,
};
