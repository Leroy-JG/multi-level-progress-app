import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUTO_BACKUP,
  clampEvery,
  isBackupDue,
  nextBackupAt,
  normalizeAutoBackup,
  periodMs,
  snapshotHash,
  type AutoBackupSettings,
} from './autobackup';
import { exportData, parseImport } from './exchange';
import { normalizeSettings } from './settings';
import { createNode } from './types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 30, 12);
const on = (patch: Partial<AutoBackupSettings> = {}): AutoBackupSettings => ({ ...DEFAULT_AUTO_BACKUP, enabled: true, ...patch });

describe('réglages des copies automatiques', () => {
  it('désactivées par défaut, une semaine, 10 copies', () => {
    expect(DEFAULT_AUTO_BACKUP).toEqual({ enabled: false, every: 1, unit: 'weeks', keep: 10, lastRunAt: null });
    expect(normalizeAutoBackup(undefined)).toEqual(DEFAULT_AUTO_BACKUP);
    expect(normalizeAutoBackup('n’importe quoi')).toEqual(DEFAULT_AUTO_BACKUP);
  });

  it('borne le nombre d’unités selon l’unité (jours : 365, semaines : 52) et impose au moins 1', () => {
    expect(clampEvery(0, 'days')).toBe(1);
    expect(clampEvery(-3, 'weeks')).toBe(1);
    expect(clampEvery(400, 'days')).toBe(365);
    expect(clampEvery(400, 'weeks')).toBe(52);
    expect(clampEvery(2.6, 'days')).toBe(3);
    expect(normalizeAutoBackup({ enabled: true, every: 100, unit: 'weeks' }).every).toBe(52);
  });

  it('ignore les valeurs invalides sans perdre le reste', () => {
    expect(normalizeAutoBackup({ enabled: 'oui', every: 'x', unit: 'mois', keep: 0, lastRunAt: 'hier' })).toEqual({
      enabled: false,
      every: 1,
      unit: 'weeks',
      keep: 1,
      lastRunAt: null,
    });
    expect(normalizeAutoBackup({ enabled: true, every: 3, unit: 'days', keep: 500, lastRunAt: 42 })).toEqual({
      enabled: true,
      every: 3,
      unit: 'days',
      keep: 100,
      lastRunAt: 42,
    });
  });

  it('les anciens réglages (sans ce champ) restent lisibles', () => {
    expect(normalizeSettings({ themeMode: 'dark', lastBackupAt: 5 }).autoBackup).toEqual(DEFAULT_AUTO_BACKUP);
    expect(normalizeSettings({ autoBackup: { enabled: true, every: 2, unit: 'days' } }).autoBackup).toMatchObject({
      enabled: true,
      every: 2,
      unit: 'days',
    });
  });
});

describe('quand faire une copie', () => {
  it('période en jours ou en semaines', () => {
    expect(periodMs({ every: 3, unit: 'days' })).toBe(3 * DAY);
    expect(periodMs({ every: 2, unit: 'weeks' })).toBe(14 * DAY);
    expect(periodMs(DEFAULT_AUTO_BACKUP)).toBe(7 * DAY);
  });

  it('jamais quand c’est désactivé', () => {
    expect(isBackupDue({ ...DEFAULT_AUTO_BACKUP, lastRunAt: null }, NOW)).toBe(false);
    expect(isBackupDue({ ...DEFAULT_AUTO_BACKUP, lastRunAt: NOW - 100 * DAY }, NOW)).toBe(false);
  });

  it('tout de suite quand aucune copie n’a encore été faite', () => {
    expect(isBackupDue(on(), NOW)).toBe(true);
  });

  it('une fois le délai écoulé, pas avant', () => {
    expect(isBackupDue(on({ lastRunAt: NOW - 6 * DAY }), NOW)).toBe(false);
    expect(isBackupDue(on({ lastRunAt: NOW - 7 * DAY }), NOW)).toBe(true);
    expect(isBackupDue(on({ lastRunAt: NOW - 9 * DAY }), NOW)).toBe(true);
    expect(isBackupDue(on({ every: 2, unit: 'days', lastRunAt: NOW - DAY }), NOW)).toBe(false);
    expect(isBackupDue(on({ every: 2, unit: 'days', lastRunAt: NOW - 2 * DAY }), NOW)).toBe(true);
  });

  it('horloge remise en arrière : une copie est due', () => {
    expect(isBackupDue(on({ lastRunAt: NOW + 30 * DAY }), NOW)).toBe(true);
  });

  it('prochaine copie', () => {
    expect(nextBackupAt(on())).toBeNull();
    expect(nextBackupAt(on({ lastRunAt: NOW }))).toBe(NOW + 7 * DAY);
  });
});

describe('empreinte du contenu', () => {
  const a = createNode({ id: 'a', parentId: null, title: 'Projet' });
  const b = createNode({ id: 'b', parentId: 'a', title: 'Tâche', progress: 40 });

  it('identique quel que soit l’ordre des éléments', () => {
    expect(snapshotHash([a, b])).toBe(snapshotHash([b, a]));
  });

  it('change dès qu’une donnée change', () => {
    const base = snapshotHash([a, b]);
    expect(snapshotHash([a, { ...b, progress: 41 }])).not.toBe(base);
    expect(snapshotHash([a, { ...b, title: 'Tâche ' }])).not.toBe(base);
    expect(snapshotHash([a, { ...b, note: 'x' }])).not.toBe(base);
    expect(snapshotHash([a, { ...b, dueDate: '2026-10-01' }])).not.toBe(base);
    expect(snapshotHash([a])).not.toBe(base);
  });

  it('ne dépend pas de l’ordre des champs ni de la copie (export compact → import)', () => {
    const reordered = { ...b, title: b.title, id: b.id, parentId: b.parentId } as typeof b;
    expect(snapshotHash([a, reordered])).toBe(snapshotHash([a, b]));
    const roundTrip = parseImport(exportData([a, b], NOW, true));
    expect(snapshotHash(roundTrip)).toBe(snapshotHash([a, b]));
  });
});

describe('export compact', () => {
  it('est plus léger que l’export lisible et se réimporte à l’identique', () => {
    const nodes = [createNode({ id: 'p', parentId: null, title: 'P' }), createNode({ id: 't', parentId: 'p', title: 'T', note: 'é' })];
    const pretty = exportData(nodes, NOW);
    const compact = exportData(nodes, NOW, true);
    expect(compact.length).toBeLessThan(pretty.length * 0.75);
    expect(compact).not.toContain('\n');
    expect(parseImport(compact)).toEqual(parseImport(pretty));
  });
});
