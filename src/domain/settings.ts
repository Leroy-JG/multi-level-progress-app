export type ThemeMode = 'auto' | 'light' | 'dark';

export interface Settings {
  themeMode: ThemeMode;
}

export const DEFAULT_SETTINGS: Settings = { themeMode: 'auto' };

export function normalizeSettings(raw: unknown): Settings {
  const mode = (raw as Partial<Settings> | null)?.themeMode;
  return { themeMode: mode === 'light' || mode === 'dark' || mode === 'auto' ? mode : 'auto' };
}
