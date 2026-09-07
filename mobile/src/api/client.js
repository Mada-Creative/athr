import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In dev (Expo Go / a dev client), derive the API host from the same
// host:port that's already serving the JS bundle — `hostUri` — instead of
// a hardcoded LAN IP in app.json that goes stale every time the computer's
// router hands out a new address. The backend runs on a different port
// (4000) on that same machine, so only the port changes.
function devApiBaseUrl() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoClient?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0];
  if (!host) return null;
  return `http://${host}:4000/api`;
}

const BASE_URL =
  (__DEV__ && devApiBaseUrl()) ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  Constants.manifest?.extra?.apiBaseUrl ||
  'http://localhost:4000/api';

const TOKEN_KEY = 'athr_token';

async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function setToken(token) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    const err = new Error('تعذر الاتصال بالخادم. تحقق من الإنترنت أو عنوان الخادم.');
    err.isNetworkError = true;
    throw err;
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
