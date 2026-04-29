import type { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import { STORAGE_KEYS } from '@/constants/config';

export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  header: string;
  tabBar: string;
  input: string;
  overlay: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  border: string;
  avatarBackground: string;
  avatarText: string;
  badgeText: string;
};

const LIGHT_COLORS: ThemeColors = {
  background: '#efe7d8',
  surface: '#f8f3ea',
  surfaceRaised: '#fffdfa',
  header: '#f3ecdf',
  tabBar: '#f4ede0',
  input: '#fffdf8',
  overlay: 'rgba(21, 31, 39, 0.48)',
  text: '#17212b',
  textMuted: '#66727d',
  textOnPrimary: '#f9fbfd',
  primary: '#2d5f7c',
  primarySoft: '#dbe8ef',
  accent: '#c18a45',
  accentSoft: '#efe0c8',
  success: '#4d8d74',
  successSoft: '#dbece4',
  danger: '#a04d40',
  dangerSoft: '#f1ddd8',
  border: '#d7cdbb',
  avatarBackground: '#d7e4ed',
  avatarText: '#2d5f7c',
  badgeText: '#fffaf7',
};

const DARK_COLORS: ThemeColors = {
  background: '#11171d',
  surface: '#192129',
  surfaceRaised: '#222d38',
  header: '#182028',
  tabBar: '#141c24',
  input: '#131a21',
  overlay: 'rgba(3, 8, 12, 0.72)',
  text: '#edf2f6',
  textMuted: '#9ba9b4',
  textOnPrimary: '#0c141a',
  primary: '#7fb1cf',
  primarySoft: '#233847',
  accent: '#d3a15b',
  accentSoft: '#403423',
  success: '#74b79c',
  successSoft: '#1f3c34',
  danger: '#d18379',
  dangerSoft: '#482a26',
  border: '#31404d',
  avatarBackground: '#253645',
  avatarText: '#8ec0dd',
  badgeText: '#fff7f5',
};

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  setMode: (nextMode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEYS.themeMode);
        if (stored === 'dark' || stored === 'light') {
          setModeState(stored);
        }
      } finally {
        setReady(true);
      }
    }

    void loadTheme();
  }, []);

  async function setMode(nextMode: ThemeMode) {
    setModeState(nextMode);
    await SecureStore.setItemAsync(STORAGE_KEYS.themeMode, nextMode);
  }

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    colors: mode === 'dark' ? DARK_COLORS : LIGHT_COLORS,
    isDark: mode === 'dark',
    setMode,
  }), [mode]);

  if (!ready) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('Theme context is unavailable');
  }
  return context;
}

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function useThemedStyles<T extends NamedStyles<T>>(factory: (colors: ThemeColors) => T) {
  const { colors } = useAppTheme();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
}
