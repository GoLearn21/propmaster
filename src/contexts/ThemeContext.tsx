import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * ThemeContext - Titanium Precision Design System
 *
 * Features:
 * - System preference detection
 * - Manual light/dark/system toggle
 * - Persistent preference in localStorage
 * - Smooth transitions between themes
 */

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** Current theme setting (light, dark, or system) */
  theme: Theme;
  /** Actual resolved theme (light or dark) */
  resolvedTheme: ResolvedTheme;
  /** Set theme preference */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark */
  toggleTheme: () => void;
  /** Whether system preference is for dark mode */
  systemPrefersDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'propmaster-theme';

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme if none is stored */
  defaultTheme?: Theme;
  /** Storage key for persistence */
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = STORAGE_KEY,
}) => {
  // Get initial theme from storage or default
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;

    const stored = localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return defaultTheme;
  });

  // Track system preference
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Resolve actual theme
  const resolvedTheme: ResolvedTheme =
    theme === 'system'
      ? (systemPrefersDark ? 'dark' : 'light')
      : theme;

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove both classes first
    root.classList.remove('light', 'dark');

    // Add the resolved theme class
    root.classList.add(resolvedTheme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#0F0F11' : '#FAFAFA'
      );
    }
  }, [resolvedTheme]);

  // Set theme with persistence
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(storageKey, newTheme);
  }, [storageKey]);

  // Toggle between light and dark (skips system)
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme, setTheme]);

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    systemPrefersDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useTheme hook - Access theme context
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

/**
 * useResolvedTheme hook - Just get the resolved theme
 */
export const useResolvedTheme = (): ResolvedTheme => {
  const { resolvedTheme } = useTheme();
  return resolvedTheme;
};

/**
 * useIsDarkMode hook - Boolean check for dark mode
 */
export const useIsDarkMode = (): boolean => {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark';
};

export { ThemeContext };
export type { Theme, ResolvedTheme, ThemeContextValue };
