import { DEFAULT_AUTO_BACKUP, normalizeAutoBackup, type AutoBackupSettings } from './autobackup';

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface Settings {
  themeMode: ThemeMode;
  /** Date (ms) de la dernière sauvegarde exportée en fichier ; null si aucune. Les données n'existent que sur l'appareil. */
  lastBackupAt: number | null;
  /** Copies automatiques gardées sur l'appareil (facultatives, désactivées par défaut). */
  autoBackup: AutoBackupSettings;
  /** La proposition d'activer les copies automatiques (à la création du tout premier projet) a déjà été affichée. */
  backupPromptSeen: boolean;
  /** Dossier (adresse fournie par le système) où les sauvegardes exportées sont écrites ; null tant qu'il n'est pas choisi. */
  exportFolder: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'auto',
  lastBackupAt: null,
  autoBackup: DEFAULT_AUTO_BACKUP,
  backupPromptSeen: false,
  exportFolder: null,
};

export function normalizeSettings(raw: unknown): Settings {
  const obj = (raw ?? {}) as Partial<Settings>;
  const mode = obj.themeMode;
  const backup = obj.lastBackupAt;
  return {
    themeMode: mode === 'light' || mode === 'dark' || mode === 'auto' ? mode : 'auto',
    lastBackupAt: typeof backup === 'number' && Number.isFinite(backup) ? backup : null,
    autoBackup: normalizeAutoBackup(obj.autoBackup),
    backupPromptSeen: obj.backupPromptSeen === true,
    exportFolder: typeof obj.exportFolder === 'string' && obj.exportFolder !== '' ? obj.exportFolder : null,
  };
}
