import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const STORAGE_KEY = 'athr_device_id';

// A stable, random identifier generated once per install and kept in
// AsyncStorage — the backend uses it to silently stand up a guest account,
// so nobody has to sign in before the app is usable.
async function getOrCreateDeviceId() {
  const existing = await AsyncStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(STORAGE_KEY, id);
  return id;
}

export default getOrCreateDeviceId;
