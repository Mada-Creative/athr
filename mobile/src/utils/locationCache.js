import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'athr_last_location';

// The last successfully-acquired location (coords + label + calculation
// method) — reused whenever a fresh fix isn't available (no permission, no
// GPS signal, airplane mode, ...) so prayer times keep working off
// wherever the phone last knew it was, instead of jumping to a generic
// Makkah placeholder every time.
export async function getLastLocation() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export async function setLastLocation(location) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(location));
  } catch (err) {
    // best-effort only
  }
}
