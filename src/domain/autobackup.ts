import type { ProgressNode } from './types';

export type BackupUnit = 'days' | 'weeks';

export interface AutoBackupSettings {
  /** Désactivé par défaut : c'est l'utilisateur qui décide. */
  enabled: boolean;
  /** Nombre d'unités entre deux copies (1 semaine par défaut). */
  every: number;
  unit: BackupUnit;
  /** Nombre de copies gardées ; au-delà, la plus ancienne est supprimée à la copie suivante. */
  keep: number;
  /** Dernière fois que l'on a fait (ou vérifié) une copie automatique ; null = jamais. */
  lastRunAt: number | null;
}

export const DEFAULT_AUTO_BACKUP: AutoBackupSettings = { enabled: false, every: 1, unit: 'weeks', keep: 10, lastRunAt: null };

/** Nombres de copies proposés dans les réglages. */
export const KEEP_CHOICES = [5, 10, 20, 50] as const;
const MAX_KEEP = 100;

export const MAX_EVERY: Record<BackupUnit, number> = { days: 365, weeks: 52 };

const DAY_MS = 24 * 60 * 60 * 1000;

export function clampEvery(value: number, unit: BackupUnit): number {
  return Math.min(MAX_EVERY[unit], Math.max(1, Math.round(value)));
}

const int = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;

/** Lit des réglages enregistrés en tolérant l'absence de champ (anciennes versions) et les valeurs invalides. */
export function normalizeAutoBackup(raw: unknown): AutoBackupSettings {
  const obj = (raw ?? {}) as Partial<AutoBackupSettings>;
  const unit: BackupUnit = obj.unit === 'days' || obj.unit === 'weeks' ? obj.unit : DEFAULT_AUTO_BACKUP.unit;
  return {
    enabled: obj.enabled === true,
    unit,
    every: clampEvery(int(obj.every, DEFAULT_AUTO_BACKUP.every), unit),
    keep: Math.min(MAX_KEEP, Math.max(1, int(obj.keep, DEFAULT_AUTO_BACKUP.keep))),
    lastRunAt: typeof obj.lastRunAt === 'number' && Number.isFinite(obj.lastRunAt) ? obj.lastRunAt : null,
  };
}

export function periodMs(config: Pick<AutoBackupSettings, 'every' | 'unit'>): number {
  return config.every * (config.unit === 'weeks' ? 7 : 1) * DAY_MS;
}

/**
 * Une copie est due quand le délai est écoulé. Une horloge remise en arrière (dernière copie « dans le futur »)
 * déclenche aussi une copie : sans cela, elle n'aurait plus lieu avant d'avoir rattrapé cette date.
 */
export function isBackupDue(config: AutoBackupSettings, now: number): boolean {
  if (!config.enabled) return false;
  if (config.lastRunAt === null) return true;
  const elapsed = now - config.lastRunAt;
  return elapsed < 0 || elapsed >= periodMs(config);
}

/** Date à partir de laquelle la prochaine copie aura lieu (à l'ouverture de l'application) ; null si aucune n'a encore été faite. */
export function nextBackupAt(config: AutoBackupSettings): number | null {
  return config.lastRunAt === null ? null : config.lastRunAt + periodMs(config);
}

/** Empreinte 53 bits (cyrb53) : sert uniquement à repérer « rien n'a changé depuis la dernière copie ». */
function cyrb53(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/** Empreinte du contenu (indépendante de l'ordre des éléments) : deux états identiques donnent la même valeur. */
export function snapshotHash(nodes: readonly ProgressNode[]): string {
  const rows = [...nodes]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((n) => [n.id, n.parentId, n.title, n.progress, n.weight, n.position, n.color, n.note, n.dueDate, n.reminderAt, n.completedAt]);
  return cyrb53(JSON.stringify(rows));
}
