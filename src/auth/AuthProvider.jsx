import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from './authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authService.getStoredUser());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Verify session with the backend on initial mount
  const checkSession = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const token = authService.getToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const freshUser = await authService.getMe();
      if (freshUser) {
        setUser(freshUser);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Session verification error:', err);
      // In case backend is offline, preserve stored user or reset
      setUser(authService.getStoredUser());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email, password, rememberMe = true) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await authService.login(email, password, rememberMe);
      setUser(res.user);
      return res;
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await authService.register(name, email, password, role);
      setUser(res.user);
      return res;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  const clearAuthError = () => setAuthError(null);

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    authError,
    clearAuthError,
    login,
    register,
    logout,
    checkSession
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
