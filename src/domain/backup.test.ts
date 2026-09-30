import { describe, expect, it } from 'vitest';
import { BACKUP_STALE_DAYS, backupStatus } from './backup';
import { DEFAULT_SETTINGS, normalizeSettings } from './settings';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 30, 12);

describe('état de la sauvegarde', () => {
  it('jamais sauvegardé', () => {
    expect(backupStatus(null, NOW)).toEqual({ kind: 'never' });
  });

  it('sauvegarde récente', () => {
    expect(backupStatus(NOW - 2 * DAY, NOW)).toEqual({ kind: 'ok', at: NOW - 2 * DAY });
    expect(backupStatus(NOW - (BACKUP_STALE_DAYS - 1) * DAY, NOW).kind).toBe('ok');
  });

  it('sauvegarde ancienne à partir du seuil', () => {
    expect(backupStatus(NOW - BACKUP_STALE_DAYS * DAY, NOW)).toEqual({
      kind: 'old',
      at: NOW - BACKUP_STALE_DAYS * DAY,
      days: BACKUP_STALE_DAYS,
    });
  });

  it("une date dans le futur (horloge changée) n'est pas ancienne", () => {
    expect(backupStatus(NOW + DAY, NOW).kind).toBe('ok');
  });
});

describe('réglages', () => {
  it('valeurs par défaut : thème auto, jamais sauvegardé, copies automatiques désactivées', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.autoBackup.enabled).toBe(false);
    expect(DEFAULT_SETTINGS.backupPromptSeen).toBe(false);
  });

  it("garde la date de sauvegarde et ignore les valeurs invalides (anciens réglages sans ce champ)", () => {
    expect(normalizeSettings({ themeMode: 'dark', lastBackupAt: 123 })).toEqual({
      ...DEFAULT_SETTINGS,
      themeMode: 'dark',
      lastBackupAt: 123,
    });
    expect(normalizeSettings({ themeMode: 'dark' }).lastBackupAt).toBeNull();
    expect(normalizeSettings({ lastBackupAt: 'hier' }).lastBackupAt).toBeNull();
    expect(normalizeSettings({ lastBackupAt: Number.NaN }).lastBackupAt).toBeNull();
    expect(normalizeSettings({ themeMode: 'rose' }).themeMode).toBe('auto');
  });
});

describe('formatBytes', () => {
  it('formate en octets, Ko et Mo à la française', async () => {
    const { formatBytes } = await import('../i18n');
    expect(formatBytes(512)).toBe('512 o');
    expect(formatBytes(1024)).toBe('1,0 Ko');
    expect(formatBytes(24600)).toBe('24,0 Ko');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3,5 Mo');
  });
});
