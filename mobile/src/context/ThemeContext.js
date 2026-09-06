import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, dark } from '../theme/palettes';

const STORAGE_KEY = 'athr_theme_preference';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  // 'light' | 'dark' | 'system' — what the user picked in Settings.
  const [preference, setPreferenceState] = useState('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      } catch (err) {
        // fall back to 'system'
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setPreference = (next) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const scheme = preference === 'system' ? systemScheme || 'light' : preference;
  const colors = scheme === 'dark' ? dark : light;

  const value = useMemo(
    () => ({ colors, scheme, preference, setPreference, loaded }),
    [colors, scheme, preference, loaded]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
