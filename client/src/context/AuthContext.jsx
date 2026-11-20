import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('campusbridge_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('campusbridge_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Restore authenticated session on initial mount
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
          // FR-39: propagate server-stored theme preference so ThemeContext picks it up
          const serverTheme = response.data?.preferences?.theme;
          if (serverTheme === 'dark' || serverTheme === 'light') {
            localStorage.setItem('campusbridge_theme', serverTheme);
          }
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
        // FR-39: sync server-stored theme preference on login
        const loginTheme = userData?.preferences?.theme;
        if (loginTheme === 'dark' || loginTheme === 'light') {
          localStorage.setItem('campusbridge_theme', loginTheme);
        }
        return userData;
      }
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

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
        return userData;
      }
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

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
