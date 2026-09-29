import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemeMode } from '../domain/settings';

/** Charte graphique de l'application. */
export const BRAND = {
  primary: '#26428B',
  primaryDark: '#1C1A17',
  secondary: '#2A9D9F',
  accent: '#C9A227',
  accentWarm: '#E8A317',
  backgroundLight: '#F4EBD9',
  backgroundDark: '#14213D',
  success: '#2F6B4F',
  error: '#B5623B',
  neutral: '#8A7F6D',
} as const;

/** Couleurs proposées pour les projets. */
export const PROJECT_COLORS = [
  { key: 'kermes', hex: '#A3303F' },
  { key: 'cornaline', hex: '#E07B39' },
  { key: 'orpiment', hex: '#EBD27A' },
  { key: 'olive', hex: '#7A8F3A' },
  { key: 'turquoise', hex: '#2A9D9F' },
  { key: 'ciel', hex: '#5B8FC7' },
  { key: 'lapis', hex: '#26428B' },
  { key: 'indigo', hex: '#4B3F8F' },
  { key: 'pourpre', hex: '#7A3E8E' },
  { key: 'rose-damas', hex: '#C9708A' },
  { key: 'henne', hex: '#6B4A33' },
  { key: 'pierre', hex: '#8A7F6D' },
] as const;

export const DEFAULT_PROJECT_COLOR = BRAND.primary;

export interface Theme {
  dark: boolean;
  bg: string;
  card: string;
  text: string;
  /** Texte secondaire (contraste ≥ 4,5:1 sur le fond). */
  muted: string;
  border: string;
  track: string;
  /** Boutons principaux et éléments actifs. */
  action: string;
  onAction: string;
  /** Remplissage des barres de progression. */
  bar: string;
  success: string;
  error: string;
  accent: string;
}

const light: Theme = {
  dark: false,
  bg: BRAND.backgroundLight,
  card: '#FBF7EE',
  text: BRAND.primaryDark,
  muted: '#6B6152',
  border: '#DDD0B4',
  track: '#E3D7BC',
  action: BRAND.primary,
  onAction: '#FFFFFF',
  bar: BRAND.primary,
  success: BRAND.success,
  error: BRAND.error,
  accent: BRAND.accent,
};

// Le primary (bleu) est trop sombre sur le fond nuit : l'or de la charte porte les actions en mode sombre.
// Les tons success / error sont éclaircis pour rester lisibles sur le bleu nuit.
const dark: Theme = {
  dark: true,
  bg: BRAND.backgroundDark,
  card: '#1D2B4B',
  text: BRAND.backgroundLight,
  muted: '#B4AC9A',
  border: '#31426A',
  track: '#2F3F65',
  action: BRAND.accent,
  onAction: BRAND.primaryDark,
  bar: BRAND.secondary,
  success: '#5FB58A',
  error: '#E0906B',
  accent: BRAND.accentWarm,
};

const ThemeContext = createContext<Theme>(light);

export function ThemeProvider({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const system = useColorScheme();
  const theme = useMemo(() => {
    const isDark = mode === 'dark' || (mode === 'auto' && system === 'dark');
    return isDark ? dark : light;
  }, [mode, system]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Couleur de texte lisible posée sur `background`. */
export function onColor(background: string): string {
  return contrastRatio(background, '#FFFFFF') >= contrastRatio(background, BRAND.primaryDark) ? '#FFFFFF' : BRAND.primaryDark;
}

/** Couleur du projet utilisable comme texte sur `background` ; sinon le texte normal du thème. */
export function readableAccent(color: string, theme: Theme): string {
  return contrastRatio(color, theme.bg) >= 3 ? color : theme.text;
}

export function formatPercent(fraction: number): string {
  const value = Math.round(fraction * 1000) / 10;
  return `${Number.isInteger(value) ? value : value.toFixed(1)} %`;
}
