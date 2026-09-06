import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isBooting, setIsBooting] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const data = await api.get('/auth/me');
          setUser(data.user);
        }
      } catch (err) {
        await setToken(null);
      } finally {
        setIsBooting(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    const data = await api.post('/auth/login', { email, password }, { auth: false });
    await setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    setAuthError(null);
    const data = await api.post('/auth/register', { name, email, password }, { auth: false });
    await setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (idToken) => {
    setAuthError(null);
    const data = await api.post('/auth/google', { idToken }, { auth: false });
    await setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const loginWithApple = useCallback(async (identityToken, name) => {
    setAuthError(null);
    const data = await api.post('/auth/apple', { identityToken, name }, { auth: false });
    await setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isBooting,
      authError,
      setAuthError,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      logout,
      updateUser,
      refreshUser,
    }),
    [user, isBooting, authError, login, register, loginWithGoogle, loginWithApple, logout, updateUser, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
