import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'athr_cached_user';

// The last user object we successfully got from the server — lets the app
// boot straight into a usable session when there's no connectivity yet
// (a real network failure, not an invalid/expired token) instead of ever
// treating "offline" the same as "logged out".
export async function cacheUser(user) {
  try {
    if (user) await AsyncStorage.setItem(KEY, JSON.stringify(user));
  } catch (err) {
    // best-effort only
  }
}

export async function getCachedUser() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}
