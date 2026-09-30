export type ThemeMode = 'auto' | 'light' | 'dark';

export interface Settings {
  themeMode: ThemeMode;
  /** Date (ms) de la dernière sauvegarde exportée ; null si aucune. Les données n'existent que sur l'appareil. */
  lastBackupAt: number | null;
}

export const DEFAULT_SETTINGS: Settings = { themeMode: 'auto', lastBackupAt: null };

export function normalizeSettings(raw: unknown): Settings {
  const obj = (raw ?? {}) as Partial<Settings>;
  const mode = obj.themeMode;
  const backup = obj.lastBackupAt;
  return {
    themeMode: mode === 'light' || mode === 'dark' || mode === 'auto' ? mode : 'auto',
    lastBackupAt: typeof backup === 'number' && Number.isFinite(backup) ? backup : null,
  };
}
