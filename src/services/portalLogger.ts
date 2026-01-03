/**
 * Portal Logger Service
 * Comprehensive logging for tenant and vendor portals
 * Provides debugging info, audit trails, and troubleshooting support
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  portal: 'tenant' | 'vendor' | 'owner' | 'system';
  action: string;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  component?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// In-memory log buffer for recent logs (circular buffer)
const LOG_BUFFER_SIZE = 500;
const logBuffer: LogEntry[] = [];
let sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Color codes for console output
const COLORS = {
  DEBUG: '\x1b[36m',   // Cyan
  INFO: '\x1b[32m',    // Green
  WARN: '\x1b[33m',    // Yellow
  ERROR: '\x1b[31m',   // Red
  CRITICAL: '\x1b[35m', // Magenta
  RESET: '\x1b[0m',
};

// Browser console styles
const BROWSER_STYLES = {
  DEBUG: 'color: #0891b2; font-weight: normal;',
  INFO: 'color: #059669; font-weight: normal;',
  WARN: 'color: #d97706; font-weight: bold;',
  ERROR: 'color: #dc2626; font-weight: bold;',
  CRITICAL: 'color: #9333ea; font-weight: bold; background: #fef3c7;',
};

/**
 * Get current session ID
 */
export function getSessionId(): string {
  return sessionId;
}

/**
 * Reset session ID (call on login)
 */
export function resetSessionId(): void {
  sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  portal: LogEntry['portal'],
  action: string,
  message: string,
  data?: Record<string, unknown>,
  error?: Error,
  component?: string
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    portal,
    action,
    message,
    sessionId,
    component,
  };

  if (data) {
    // Sanitize sensitive data
    entry.data = sanitizeData(data);
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return entry;
}

/**
 * Sanitize sensitive data from logs
 */
function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'ssn', 'creditCard', 'cvv', 'pin'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Add entry to buffer
 */
function addToBuffer(entry: LogEntry): void {
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

/**
 * Output log to console
 */
function outputLog(entry: LogEntry): void {
  const prefix = `[${entry.portal.toUpperCase()}:${entry.action}]`;
  const style = BROWSER_STYLES[entry.level];

  const logArgs: unknown[] = [
    `%c${entry.level} ${prefix} ${entry.message}`,
    style,
  ];

  if (entry.data) {
    logArgs.push(entry.data);
  }

  if (entry.error) {
    logArgs.push(entry.error);
  }

  switch (entry.level) {
    case 'DEBUG':
      console.debug(...logArgs);
      break;
    case 'INFO':
      console.info(...logArgs);
      break;
    case 'WARN':
      console.warn(...logArgs);
      break;
    case 'ERROR':
    case 'CRITICAL':
      console.error(...logArgs);
      break;
  }
}

/**
 * Log function
 */
function log(
  level: LogLevel,
  portal: LogEntry['portal'],
  action: string,
  message: string,
  data?: Record<string, unknown>,
  error?: Error,
  component?: string
): void {
  const entry = createLogEntry(level, portal, action, message, data, error, component);
  addToBuffer(entry);

  // Only output DEBUG in development
  if (level === 'DEBUG' && import.meta.env.PROD) {
    return;
  }

  outputLog(entry);
}

/**
 * Portal-specific logger factory
 */
function createPortalLogger(portal: LogEntry['portal']) {
  return {
    debug: (action: string, message: string, data?: Record<string, unknown>, component?: string) =>
      log('DEBUG', portal, action, message, data, undefined, component),

    info: (action: string, message: string, data?: Record<string, unknown>, component?: string) =>
      log('INFO', portal, action, message, data, undefined, component),

    warn: (action: string, message: string, data?: Record<string, unknown>, component?: string) =>
      log('WARN', portal, action, message, data, undefined, component),

    error: (action: string, message: string, error?: Error, data?: Record<string, unknown>, component?: string) =>
      log('ERROR', portal, action, message, data, error, component),

    critical: (action: string, message: string, error?: Error, data?: Record<string, unknown>, component?: string) =>
      log('CRITICAL', portal, action, message, data, error, component),

    // Auth-specific logging
    auth: {
      loginAttempt: (email: string) =>
        log('INFO', portal, 'AUTH_LOGIN_ATTEMPT', `Login attempt for ${email}`, { email }),

      loginSuccess: (userId: string, email: string) => {
        resetSessionId();
        log('INFO', portal, 'AUTH_LOGIN_SUCCESS', `Login successful for ${email}`, { userId, email });
      },

      loginFailure: (email: string, reason: string, error?: Error) =>
        log('WARN', portal, 'AUTH_LOGIN_FAILURE', `Login failed for ${email}: ${reason}`, { email, reason }, error),

      logout: (userId?: string) =>
        log('INFO', portal, 'AUTH_LOGOUT', 'User logged out', { userId }),

      sessionRestored: (userId: string) =>
        log('INFO', portal, 'AUTH_SESSION_RESTORED', 'Session restored from storage', { userId }),

      sessionExpired: () =>
        log('WARN', portal, 'AUTH_SESSION_EXPIRED', 'Session expired'),

      unauthorized: (route: string) =>
        log('WARN', portal, 'AUTH_UNAUTHORIZED', `Unauthorized access attempt to ${route}`, { route }),
    },

    // Navigation logging
    nav: {
      pageView: (route: string, params?: Record<string, unknown>) =>
        log('DEBUG', portal, 'NAV_PAGE_VIEW', `Page view: ${route}`, { route, params }),

      redirect: (from: string, to: string, reason: string) =>
        log('INFO', portal, 'NAV_REDIRECT', `Redirect from ${from} to ${to}: ${reason}`, { from, to, reason }),
    },

    // Data operations logging
    data: {
      fetchStart: (resource: string, params?: Record<string, unknown>) =>
        log('DEBUG', portal, 'DATA_FETCH_START', `Fetching ${resource}`, { resource, params }),

      fetchSuccess: (resource: string, count?: number) =>
        log('DEBUG', portal, 'DATA_FETCH_SUCCESS', `Fetched ${resource}${count !== undefined ? ` (${count} items)` : ''}`, { resource, count }),

      fetchError: (resource: string, error: Error) =>
        log('ERROR', portal, 'DATA_FETCH_ERROR', `Failed to fetch ${resource}`, { resource }, error),

      mutationStart: (action: string, resource: string) =>
        log('DEBUG', portal, 'DATA_MUTATION_START', `${action} ${resource}`, { action, resource }),

      mutationSuccess: (action: string, resource: string, id?: string) =>
        log('INFO', portal, 'DATA_MUTATION_SUCCESS', `${action} ${resource} successful`, { action, resource, id }),

      mutationError: (action: string, resource: string, error: Error) =>
        log('ERROR', portal, 'DATA_MUTATION_ERROR', `${action} ${resource} failed`, { action, resource }, error),
    },

    // Financial operations logging (audit trail)
    financial: {
      paymentInitiated: (amount: number, type: string, referenceId: string) =>
        log('INFO', portal, 'FIN_PAYMENT_INITIATED', `Payment initiated: $${amount} (${type})`, { amount, type, referenceId }),

      paymentCompleted: (amount: number, type: string, referenceId: string, transactionId: string) =>
        log('INFO', portal, 'FIN_PAYMENT_COMPLETED', `Payment completed: $${amount}`, { amount, type, referenceId, transactionId }),

      paymentFailed: (amount: number, type: string, referenceId: string, reason: string, error?: Error) =>
        log('ERROR', portal, 'FIN_PAYMENT_FAILED', `Payment failed: $${amount} - ${reason}`, { amount, type, referenceId, reason }, error),

      balanceUpdated: (previousBalance: number, newBalance: number, reason: string) =>
        log('INFO', portal, 'FIN_BALANCE_UPDATED', `Balance updated: $${previousBalance} -> $${newBalance}`, { previousBalance, newBalance, reason }),
    },

    // UI/UX logging
    ui: {
      componentMounted: (component: string) =>
        log('DEBUG', portal, 'UI_MOUNTED', `Component mounted: ${component}`, { component }),

      componentError: (component: string, error: Error) =>
        log('ERROR', portal, 'UI_ERROR', `Component error: ${component}`, { component }, error),

      userAction: (action: string, target: string, data?: Record<string, unknown>) =>
        log('DEBUG', portal, 'UI_ACTION', `User action: ${action} on ${target}`, { action, target, ...data }),
    },

    // Performance logging
    perf: {
      measureStart: (operation: string) => {
        if (typeof performance !== 'undefined') {
          performance.mark(`${portal}_${operation}_start`);
        }
        log('DEBUG', portal, 'PERF_START', `Started: ${operation}`, { operation });
      },

      measureEnd: (operation: string) => {
        let duration: number | undefined;
        if (typeof performance !== 'undefined') {
          performance.mark(`${portal}_${operation}_end`);
          try {
            const measure = performance.measure(
              `${portal}_${operation}`,
              `${portal}_${operation}_start`,
              `${portal}_${operation}_end`
            );
            duration = measure.duration;
          } catch {
            // Marks may not exist
          }
        }
        log('DEBUG', portal, 'PERF_END', `Completed: ${operation}${duration ? ` (${duration.toFixed(2)}ms)` : ''}`, { operation, duration });
      },
    },
  };
}

// Export portal-specific loggers
export const tenantLogger = createPortalLogger('tenant');
export const vendorLogger = createPortalLogger('vendor');
export const ownerLogger = createPortalLogger('owner');
export const systemLogger = createPortalLogger('system');

/**
 * Get all recent logs (for debugging)
 */
export function getRecentLogs(count?: number): LogEntry[] {
  const n = count || LOG_BUFFER_SIZE;
  return logBuffer.slice(-n);
}

/**
 * Get logs filtered by level
 */
export function getLogsByLevel(level: LogLevel): LogEntry[] {
  return logBuffer.filter(entry => entry.level === level);
}

/**
 * Get logs filtered by portal
 */
export function getLogsByPortal(portal: LogEntry['portal']): LogEntry[] {
  return logBuffer.filter(entry => entry.portal === portal);
}

/**
 * Export logs as JSON (for debugging)
 */
export function exportLogs(): string {
  return JSON.stringify(logBuffer, null, 2);
}

/**
 * Clear log buffer
 */
export function clearLogs(): void {
  logBuffer.length = 0;
}

// Add to window for debugging in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).__portalLogs = {
    getAll: getRecentLogs,
    getByLevel: getLogsByLevel,
    getByPortal: getLogsByPortal,
    export: exportLogs,
    clear: clearLogs,
    tenant: tenantLogger,
    vendor: vendorLogger,
    owner: ownerLogger,
    system: systemLogger,
  };
}
