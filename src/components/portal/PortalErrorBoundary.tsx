/**
 * Portal Error Boundary
 * Catches and handles errors in portal components gracefully
 * Provides recovery options and logs errors for debugging
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { tenantLogger, vendorLogger, ownerLogger, exportLogs } from '../../services/portalLogger';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  portal: 'tenant' | 'vendor' | 'owner';
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

const PORTAL_CONFIG = {
  tenant: {
    logger: tenantLogger,
    homeRoute: '/tenant/dashboard',
    loginRoute: '/tenant/login',
    color: 'emerald',
    name: 'Tenant Portal',
  },
  vendor: {
    logger: vendorLogger,
    homeRoute: '/vendor/dashboard',
    loginRoute: '/vendor/login',
    color: 'blue',
    name: 'Vendor Portal',
  },
  owner: {
    logger: ownerLogger,
    homeRoute: '/owner/dashboard',
    loginRoute: '/owner/login',
    color: 'purple',
    name: 'Owner Portal',
  },
};

export class PortalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const config = PORTAL_CONFIG[this.props.portal];

    // Log the error
    config.logger.critical(
      'COMPONENT_CRASH',
      `Critical error in ${config.name}`,
      error,
      {
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
      }
    );

    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRefresh = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    const config = PORTAL_CONFIG[this.props.portal];
    window.location.href = config.homeRoute;
  };

  handleCopyLogs = async (): Promise<void> => {
    try {
      const logs = exportLogs();
      const errorDetails = {
        error: this.state.error?.message,
        stack: this.state.error?.stack,
        componentStack: this.state.errorInfo?.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        recentLogs: JSON.parse(logs).slice(-50),
      };

      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error('Failed to copy logs:', err);
    }
  };

  handleClearAndRetry = (): void => {
    // Clear demo sessions if they might be corrupted
    localStorage.removeItem('demo_tenant_session');
    localStorage.removeItem('demo_vendor_session');
    localStorage.removeItem('demo_owner_session');

    // Clear error state and refresh
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const config = PORTAL_CONFIG[this.props.portal];

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className={`bg-red-500 px-6 py-8 text-center`}>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">
                  Something went wrong
                </h1>
                <p className="text-red-100 mt-2 text-sm">
                  {config.name} encountered an unexpected error
                </p>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-4">
                {/* Error Message */}
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error Details
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1 font-mono break-all">
                    {this.state.error?.message || 'Unknown error'}
                  </p>
                </div>

                {/* Recovery Options */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Try one of these options:
                  </p>

                  <button
                    onClick={this.handleRefresh}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Page
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    Go to Dashboard
                  </button>

                  <button
                    onClick={this.handleClearAndRetry}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <Bug className="h-4 w-4" />
                    Clear Cache & Retry
                  </button>
                </div>

                {/* Developer Tools */}
                {import.meta.env.DEV && (
                  <div className="pt-4 border-t border-gray-200 dark:border-neutral-700">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Developer Tools
                    </p>
                    <button
                      onClick={this.handleCopyLogs}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {this.state.copied ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Error Details & Logs
                        </>
                      )}
                    </button>

                    {/* Stack trace */}
                    <details className="mt-3">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View Stack Trace
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 dark:bg-neutral-900 rounded text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-40 font-mono">
                        {this.state.error?.stack}
                      </pre>
                    </details>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-900 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  If this problem persists, please contact support.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PortalErrorBoundary;
