import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api/client';
import getOrCreateDeviceId from '../utils/deviceId';

const AuthContext = createContext(null);

// Silently stands up (or restores) a guest account from the on-device id —
// this is the fallback the app always lands on, never a screen anyone sees.
async function establishGuestSession() {
  const deviceId = await getOrCreateDeviceId();
  const data = await api.post('/auth/device', { deviceId }, { auth: false });
  await setToken(data.token);
  return data.user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isBooting, setIsBooting] = useState(true);
  const [authError, setAuthError] = useState(null);
  // True only if boot finished with no session at all (e.g. no network on
  // first launch) — every screen renders fine either way, but every
  // authenticated request would silently 401 forever without a way back.
  // A visible retry banner (see RootNavigator) is what actually recovers it.
  const [sessionFailed, setSessionFailed] = useState(false);

  const bootstrapSession = useCallback(async () => {
    setIsBooting(true);
    setSessionFailed(false);
    try {
      const token = await getToken();
      if (token) {
        const data = await api.get('/auth/me');
        setUser(data.user);
        return;
      }
      setUser(await establishGuestSession());
    } catch (err) {
      // Stored token was invalid/expired, or the very first /auth/me
      // failed — either way, fall back to a fresh guest session rather
      // than ever stopping at a blank/broken screen.
      try {
        await setToken(null);
        setUser(await establishGuestSession());
      } catch (guestErr) {
        // No network at all — nothing to show yet. Surface it instead of
        // leaving every screen looking fine while silently failing.
        setSessionFailed(true);
      }
    } finally {
      setIsBooting(false);
    }
  }, []);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

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

  // Keeps this same account (and everything already tracked under it) —
  // just adds real credentials so it can be signed into elsewhere.
  const upgradeAccount = useCallback(async (name, email, password) => {
    setAuthError(null);
    const data = await api.put('/auth/upgrade', { name, email, password });
    setUser(data.user);
    return data.user;
  }, []);

  // Signing out of a real account never leaves the app unusable — it drops
  // straight back into a guest session on the same device.
  const logout = useCallback(async () => {
    await setToken(null);
    setUser(await establishGuestSession());
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  const isGuest = user?.authProvider === 'device';

  const value = useMemo(
    () => ({
      user,
      isGuest,
      isBooting,
      authError,
      setAuthError,
      sessionFailed,
      retrySession: bootstrapSession,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      upgradeAccount,
      logout,
      updateUser,
      refreshUser,
    }),
    [
      user,
      isGuest,
      isBooting,
      authError,
      sessionFailed,
      bootstrapSession,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      upgradeAccount,
      logout,
      updateUser,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
