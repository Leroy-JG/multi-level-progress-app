/** Au-delà de ce délai, on invite à refaire une sauvegarde. */
export const BACKUP_STALE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type BackupStatus = { kind: 'never' } | { kind: 'ok'; at: number } | { kind: 'old'; at: number; days: number };

/** État de la dernière sauvegarde exportée (la seule copie des données hors de l'appareil). */
export function backupStatus(lastBackupAt: number | null, now: number): BackupStatus {
  if (lastBackupAt === null) return { kind: 'never' };
  const days = Math.max(0, Math.floor((now - lastBackupAt) / DAY_MS));
  return days >= BACKUP_STALE_DAYS ? { kind: 'old', at: lastBackupAt, days } : { kind: 'ok', at: lastBackupAt };
}
