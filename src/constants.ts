import { Platform } from 'react-native';

export const APP_NAME = 'CA PERFORMANCE CLUB';
export const APP_TAGLINE = 'Metot. Disiplin. Performans.';

export type ThemeMode = 'dark' | 'light';

export const themePalettes = {
  dark: {
    ink: '#F3F6F2', inkSoft: '#96A19B', primary: '#45D5A2', primaryLight: '#132B24',
    accent: '#D7FF45', accentDark: '#A6CA2E', cream: '#080B0A', surface: '#111614',
    surfaceMuted: '#19201D', surfaceElevated: '#202824', border: '#2A342F', danger: '#FF6B71',
    dangerSoft: '#341B1E', warning: '#F5B95A', warningSoft: '#342918', success: '#55D6A8',
    successSoft: '#173329', info: '#82A9F7', infoSoft: '#1A273D', graphite: '#0C100E',
    metal: '#C6CDC9', overlay: 'rgba(0, 0, 0, 0.72)',
  },
  light: {
    ink: '#152019', inkSoft: '#627069', primary: '#168C68', primaryLight: '#DDF4EC',
    accent: '#B9DF2D', accentDark: '#789618', cream: '#F3F6F1', surface: '#FFFFFF',
    surfaceMuted: '#E8EEE9', surfaceElevated: '#DCE5DE', border: '#CDD8D0', danger: '#C83F48',
    dangerSoft: '#FBE7E9', warning: '#A96B09', warningSoft: '#FFF1D6', success: '#16845F',
    successSoft: '#DDF4EA', info: '#376FC1', infoSoft: '#E3ECFA', graphite: '#152019',
    metal: '#536159', overlay: 'rgba(17, 27, 21, 0.45)',
  },
} as const;

const themedColor = (name: keyof typeof themePalettes.dark) =>
  Platform.OS === 'web' ? `var(--ca-${name}, ${themePalettes.dark[name]})` : themePalettes.dark[name];

export const colors = {
  ink: themedColor('ink'),
  inkSoft: themedColor('inkSoft'),
  primary: themedColor('primary'),
  primaryLight: themedColor('primaryLight'),
  accent: themedColor('accent'),
  accentDark: themedColor('accentDark'),
  cream: themedColor('cream'),
  surface: themedColor('surface'),
  surfaceMuted: themedColor('surfaceMuted'),
  surfaceElevated: themedColor('surfaceElevated'),
  border: themedColor('border'),
  danger: themedColor('danger'),
  dangerSoft: themedColor('dangerSoft'),
  warning: themedColor('warning'),
  warningSoft: themedColor('warningSoft'),
  success: themedColor('success'),
  successSoft: themedColor('successSoft'),
  info: themedColor('info'),
  infoSoft: themedColor('infoSoft'),
  graphite: themedColor('graphite'),
  metal: themedColor('metal'),
  white: '#FFFFFF',
  black: '#000000',
  overlay: themedColor('overlay'),
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 40, lineHeight: 43, fontWeight: '900' as const, letterSpacing: -1.6 },
  h1: { fontSize: 27, lineHeight: 33, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 21, lineHeight: 27, fontWeight: '700' as const },
  h3: { fontSize: 17, lineHeight: 23, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '500' as const },
  label: { fontSize: 11, lineHeight: 15, fontWeight: '700' as const, letterSpacing: 0.5 },
} as const;

export const shadow = {
  shadowColor: colors.black,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.34,
  shadowRadius: 24,
  elevation: 7,
};
