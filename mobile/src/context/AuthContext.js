import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api/client';
import getOrCreateDeviceId from '../utils/deviceId';
import { cacheUser, getCachedUser } from '../utils/userCache';

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
  // True only if boot finished with no session at all — no stored token,
  // no cached user, and the network is unreachable, so there's genuinely
  // nothing to show. A visible retry banner (see RootNavigator) is what
  // actually recovers this.
  const [sessionFailed, setSessionFailed] = useState(false);
  // True when the current session is a cached/last-known one because the
  // last attempt to reach the server failed for network reasons — the app
  // stays fully usable on it, this just means "not confirmed fresh yet".
  const [isOffline, setIsOffline] = useState(false);

  const applyUser = useCallback((next, { offline = false } = {}) => {
    setUser(next);
    setIsOffline(offline);
    if (!offline) cacheUser(next);
  }, []);

  const bootstrapSession = useCallback(async () => {
    setIsBooting(true);
    setSessionFailed(false);
    try {
      const token = await getToken();
      if (token) {
        try {
          const data = await api.get('/auth/me');
          applyUser(data.user);
          return;
        } catch (err) {
          if (err.isNetworkError) {
            // The token itself is presumably still fine — we just can't
            // reach the server right now. Never treat "offline" the same
            // as "logged out": fall back to whoever we last confirmed.
            const cached = await getCachedUser();
            if (cached) {
              applyUser(cached, { offline: true });
              return;
            }
            // No cache yet either (e.g. first launch had no network at
            // the exact moment /auth/me ran) — nothing to hydrate from,
            // fall through and try a guest session below.
          } else {
            throw err; // a real 401 — the token is genuinely invalid
          }
        }
      }
      applyUser(await establishGuestSession());
    } catch (err) {
      // Stored token was invalid/expired, or there was no token and the
      // guest exchange itself failed — try a clean guest session.
      try {
        await setToken(null);
        applyUser(await establishGuestSession());
      } catch (guestErr) {
        // Truly no network on a device that has used the app before —
        // still don't leave it logged out, run on the last cached user.
        const cached = await getCachedUser();
        if (cached) {
          applyUser(cached, { offline: true });
        } else {
          setSessionFailed(true);
        }
      }
    } finally {
      setIsBooting(false);
    }
  }, [applyUser]);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    const data = await api.post('/auth/login', { email, password }, { auth: false });
    await setToken(data.token);
    applyUser(data.user);
    return data.user;
  }, [applyUser]);

  const register = useCallback(async (name, email, password) => {
    setAuthError(null);
    const data = await api.post('/auth/register', { name, email, password }, { auth: false });
    await setToken(data.token);
    applyUser(data.user);
    return data.user;
  }, [applyUser]);

  const loginWithGoogle = useCallback(async (idToken) => {
    setAuthError(null);
    const data = await api.post('/auth/google', { idToken }, { auth: false });
    await setToken(data.token);
    applyUser(data.user);
    return data.user;
  }, [applyUser]);

  const loginWithApple = useCallback(async (identityToken, name) => {
    setAuthError(null);
    const data = await api.post('/auth/apple', { identityToken, name }, { auth: false });
    await setToken(data.token);
    applyUser(data.user);
    return data.user;
  }, [applyUser]);

  // Keeps this same account (and everything already tracked under it) —
  // just adds real credentials so it can be signed into elsewhere.
  const upgradeAccount = useCallback(async (name, email, password) => {
    setAuthError(null);
    const data = await api.put('/auth/upgrade', { name, email, password });
    applyUser(data.user);
    return data.user;
  }, [applyUser]);

  // Signing out of a real account never leaves the app unusable — it drops
  // straight back into a guest session on the same device.
  const logout = useCallback(async () => {
    await setToken(null);
    applyUser(await establishGuestSession());
  }, [applyUser]);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...patch } : prev;
      if (next) cacheUser(next);
      return next;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await api.get('/auth/me');
    applyUser(data.user);
    return data.user;
  }, [applyUser]);

  const isGuest = user?.authProvider === 'device';

  const value = useMemo(
    () => ({
      user,
      isGuest,
      isBooting,
      isOffline,
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
      isOffline,
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
