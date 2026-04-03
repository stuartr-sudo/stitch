import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'stitch-theme';

/**
 * Dark mode is scoped to pages that opt in (e.g. /educate).
 * Pages that call `useTheme()` and enable dark mode get it applied;
 * all other pages stay in light mode by default.
 *
 * `activateTheme()` applies the stored preference to the document.
 * `deactivateTheme()` forces light mode (removes `dark` class).
 * The LearnPage calls activate on mount and deactivate on unmount.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'light';
    } catch {
      return 'light';
    }
  });

  // Track whether a dark-mode-capable page is active
  const [active, setActive] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (active && theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme, active]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  /** Call on mount from pages that support dark mode */
  const activateTheme = () => setActive(true);

  /** Call on unmount to revert to light mode for other pages */
  const deactivateTheme = () => setActive(false);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, activateTheme, deactivateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
