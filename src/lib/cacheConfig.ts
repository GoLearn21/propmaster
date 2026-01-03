/**
 * TITANIUM CACHE CONFIGURATION
 * Centralized cache settings for React Query
 *
 * ZERO-TOLERANCE ACCOUNTING RULE:
 * Financial data must use SHORT staleTime (30s) to prevent
 * stale balances from causing user confusion and support tickets.
 *
 * CONSISTENCY REQUIREMENT:
 * All financial data (balances, payments, ledger entries) should
 * use the same cache settings to ensure users see consistent data.
 */

// Standard cache times (milliseconds)
export const CACHE_TIMES = {
  // For financial data requiring real-time accuracy
  FINANCIAL: {
    staleTime: 30 * 1000,      // 30 seconds
    gcTime: 2 * 60 * 1000,     // 2 minutes garbage collection
    refetchOnWindowFocus: true,
  },

  // For semi-static data (properties, settings)
  STANDARD: {
    staleTime: 2 * 60 * 1000,  // 2 minutes
    gcTime: 5 * 60 * 1000,     // 5 minutes garbage collection
    refetchOnWindowFocus: true,
  },

  // For rarely-changing data (compliance rules, chart of accounts)
  STATIC: {
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes garbage collection
    refetchOnWindowFocus: false,
  },
} as const;

// Pre-configured cache options for common use cases
export const CACHE_PRESETS = {
  /**
   * For tenant balances, payments, ledger entries
   * Uses SHORT staleTime to prevent stale balance display
   */
  balance: {
    staleTime: CACHE_TIMES.FINANCIAL.staleTime,
    gcTime: CACHE_TIMES.FINANCIAL.gcTime,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  },

  /**
   * For dashboard metrics, activity feeds
   * Uses STANDARD staleTime for good UX without too many requests
   */
  dashboard: {
    staleTime: CACHE_TIMES.FINANCIAL.staleTime, // Use financial for dashboards too
    gcTime: CACHE_TIMES.STANDARD.gcTime,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    retry: 1,
  },

  /**
   * For payment history, transaction logs
   */
  transactions: {
    staleTime: CACHE_TIMES.FINANCIAL.staleTime,
    gcTime: CACHE_TIMES.STANDARD.gcTime,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    retry: 1,
  },

  /**
   * For property lists, settings that change infrequently
   */
  settings: {
    staleTime: CACHE_TIMES.STATIC.staleTime,
    gcTime: CACHE_TIMES.STATIC.gcTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  },

  /**
   * For compliance rules, late fee structures
   */
  compliance: {
    staleTime: CACHE_TIMES.STATIC.staleTime,
    gcTime: CACHE_TIMES.STATIC.gcTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  },
} as const;

/**
 * Global default config for QueryClient
 * Uses STANDARD timing - individual queries can override
 */
export const GLOBAL_QUERY_DEFAULTS = {
  staleTime: CACHE_TIMES.FINANCIAL.staleTime, // 30 seconds for zero-tolerance
  gcTime: CACHE_TIMES.STANDARD.gcTime,
  refetchOnWindowFocus: true,
  retry: 1,
};

export default CACHE_PRESETS;
