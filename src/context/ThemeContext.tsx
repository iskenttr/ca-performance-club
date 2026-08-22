import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { ThemeMode, themePalettes } from '../constants';

const STORAGE_KEY = '@ca-performance/theme';

interface ThemeValue {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

const applyWebTheme = (mode: ThemeMode) => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const root = document.documentElement;
  Object.entries(themePalettes[mode]).forEach(([name, value]) => root.style.setProperty(`--ca-${name}`, value));
  root.style.colorScheme = mode;
  root.dataset.caTheme = mode;
};

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') setMode(saved);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    applyWebTheme(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => undefined);
  }, [mode]);

  const value = useMemo(() => ({
    mode,
    toggle: () => setMode((current) => current === 'dark' ? 'light' : 'dark'),
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
};
