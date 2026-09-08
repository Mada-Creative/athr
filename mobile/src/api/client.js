import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In dev (Expo Go / a dev client) with no real apiBaseUrl configured yet,
// derive the API host from the same host:port that's already serving the
// JS bundle — `hostUri` — instead of a hardcoded LAN IP in app.json that
// goes stale every time the computer's router hands out a new address.
// The backend runs on a different port (4000) on that same machine, so
// only the port changes. Once app.json points at a real deployed API,
// that value always wins — see below.
function devApiBaseUrl() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0];
  if (!host) return null;
  return `http://${host}:4000/api`;
}

// An explicit apiBaseUrl in app.json (a real deployed API host) always wins
// — that's a deliberate choice, not a placeholder to work around. The
// LAN-IP auto-derivation is a dev-only convenience for when apiBaseUrl is
// still the localhost default, i.e. no one has pointed it anywhere real yet.
const configuredApiBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl || Constants.manifest?.extra?.apiBaseUrl;
const isLocalPlaceholder = !configuredApiBaseUrl || /^https?:\/\/(localhost|127\.0\.0\.1)/.test(configuredApiBaseUrl);

const BASE_URL =
  (!isLocalPlaceholder && configuredApiBaseUrl) ||
  (__DEV__ && devApiBaseUrl()) ||
  configuredApiBaseUrl ||
  'http://localhost:4000/api';

const TOKEN_KEY = 'athr_token';

async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function setToken(token) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

// A cold Heroku eco dyno can take a good while to wake up on the first
// request after being idle — generous, but still bounded, so a request
// that's genuinely stuck (not just slow) fails into the same offline/cached
// fallback as a real network error, instead of hanging forever.
const REQUEST_TIMEOUT_MS = 25000;

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (networkError) {
    const err = new Error('تعذر الاتصال بالخادم. تحقق من الإنترنت أو عنوان الخادم.');
    err.isNetworkError = true;
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const err = new Error(data?.message || 'حدث خطأ غير متوقع');
    err.status = response.status;
    throw err;
  }

  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export { getToken, setToken, BASE_URL };
