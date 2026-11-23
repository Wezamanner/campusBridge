/**
 * AuthContext — authentication state for all roles.
 *
 * FR-39 theme sync:
 *   After login and session restore this context dispatches a
 *   'campusbridge:themechange' CustomEvent on window so that the
 *   already-mounted ThemeContext can update its React state immediately.
 *   Writing to localStorage alone does not re-trigger ThemeContext's
 *   useState initializer, which only runs once on mount.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

/**
 * Dispatch a theme-change event that ThemeContext listens for.
 * Also writes to localStorage so the value persists across page loads.
 * Does nothing for null/undefined/invalid values.
 */
function applyServerTheme(theme) {
  if (theme !== 'dark' && theme !== 'light') return;
  localStorage.setItem('campusbridge_theme', theme);
  window.dispatchEvent(
    new CustomEvent('campusbridge:themechange', { detail: { theme } })
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('campusbridge_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(
    () => localStorage.getItem('campusbridge_token') || null
  );
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // ── Session restore on mount ───────────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('campusbridge_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me');
        if (response.success && response.data) {
          setUser(response.data);
          localStorage.setItem('campusbridge_user', JSON.stringify(response.data));
          // FR-39: apply server theme reactively (event + localStorage)
          applyServerTheme(response.data?.preferences?.theme);
        }
      } catch (err) {
        console.warn('Session restoration failed:', err.message);
        setUser(null);
        setToken(null);
        localStorage.removeItem('campusbridge_token');
        localStorage.removeItem('campusbridge_user');
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.success && res.data) {
        const { user: userData, token: jwtToken } = res.data;
        setUser(userData);
        setToken(jwtToken);
        localStorage.setItem('campusbridge_token', jwtToken);
        localStorage.setItem('campusbridge_user', JSON.stringify(userData));
        // FR-39: apply server theme reactively (event + localStorage)
        applyServerTheme(userData?.preferences?.theme);
        return userData;
      }
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async (formData) => {
    setAuthError(null);
    try {
      const res = await api.post('/auth/register', formData);
      if (res.success && res.data) {
        const { user: userData, token: jwtToken } = res.data;
        setUser(userData);
        setToken(jwtToken);
        localStorage.setItem('campusbridge_token', jwtToken);
        localStorage.setItem('campusbridge_user', JSON.stringify(userData));
        // New accounts default to 'dark'; apply it reactively.
        applyServerTheme(userData?.preferences?.theme);
        return userData;
      }
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      setAuthError(null);
      localStorage.removeItem('campusbridge_token');
      localStorage.removeItem('campusbridge_user');
    }
  };

  // ── Partial user update (name etc. from profile save) ─────────────────────
  const updateCurrentUser = (partialUser) => {
    setUser((prev) => {
      const updated = { ...prev, ...partialUser };
      try {
        localStorage.setItem('campusbridge_user', JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  };

  const value = {
    user,
    token,
    loading,
    authError,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    updateCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
