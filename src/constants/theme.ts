import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  dark: {
    background: '#141A17',
    backgroundElement: '#1C231F',
    backgroundSelected: '#253028',
    text: '#F1F4F1',
    textSecondary: '#9DA89F',
    accent: '#3FBF7F',
    accentLight: '#5BD897',
    amber: '#F2B450',
    textOnAccent: '#04261A',
  },
  light: {
    background: '#F0F5F1',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#D8EFE3',
    text: '#0D1410',
    textSecondary: '#4A5550',
    accent: '#2EA865',
    accentLight: '#3FBF7F',
    amber: '#D9983A',
    textOnAccent: '#FFFFFF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.dark & keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
