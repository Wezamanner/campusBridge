/**
 * ThemeContext — FR-39
 *
 * Provides theme state ('dark' | 'light') to the entire component tree.
 *
 * Initialization priority (highest to lowest):
 *   1. campusbridge_theme in localStorage — fastest, no flicker on cold load.
 *   2. 'dark' — project default.
 *
 * Reactive sync after mount:
 *   AuthContext dispatches a 'campusbridge:themechange' CustomEvent on
 *   window whenever the authenticated user's stored preference arrives
 *   (login, session restore). ThemeContext listens for this event and
 *   calls setTheme immediately so the DOM class updates without a reload.
 *
 *   This avoids a circular context dependency: ThemeProvider wraps
 *   AuthProvider in App.jsx, so AuthContext cannot consume ThemeContext
 *   directly. The custom event bridges the gap without changing provider
 *   order or adding an intermediary component.
 *
 * Manual changes (ThemeToggle, profile save) call setTheme() directly
 * through the context value and continue to work unchanged.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

/** Validate that a value is a supported theme string. */
function isValidTheme(v) {
  return v === 'dark' || v === 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('campusbridge_theme');
    return isValidTheme(saved) ? saved : 'dark';
  });

  // Apply DOM class and persist to localStorage whenever theme changes.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('campusbridge_theme', theme);
  }, [theme]);

  // Listen for theme-change signals from AuthContext (login / session restore).
  // A CustomEvent is used because ThemeProvider is an ancestor of AuthProvider
  // and cannot consume AuthContext directly.
  useEffect(() => {
    const handleAuthThemeChange = (e) => {
      const incoming = e?.detail?.theme;
      if (isValidTheme(incoming) && incoming !== theme) {
        setThemeState(incoming);
      }
    };
    window.addEventListener('campusbridge:themechange', handleAuthThemeChange);
    return () => {
      window.removeEventListener('campusbridge:themechange', handleAuthThemeChange);
    };
    // theme is intentionally omitted from deps — we capture the latest value
    // via the event's detail, not via closure. The listener is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Public setter — called by ThemeToggle and profile pages. */
  const setTheme = (next) => {
    if (isValidTheme(next)) {
      setThemeState(next);
    }
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
