import { describe, expect, it } from 'vitest';
import { snapshotHash } from '../domain/autobackup';
import { ImportError } from '../domain/exchange';
import { createNode, type ProgressNode } from '../domain/types';
import type { BackupBackend, BackupMeta } from '../storage/types';
import { prepareRestore, takeSnapshot } from './snapshots';

/** Historique en mémoire, avec les mêmes règles que les vrais stockages (récent d'abord, purge des plus anciennes). */
function fakeBackend() {
  const metas = new Map<string, BackupMeta>();
  const payloads = new Map<string, string>();
  const backend: BackupBackend = {
    async listBackups() {
      return [...metas.values()].sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1));
    },
    async readBackup(id) {
      return payloads.get(id) ?? null;
    },
    async addBackup(meta, payload, keep) {
      metas.set(meta.id, meta);
      payloads.set(meta.id, payload);
      const all = [...metas.values()].sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1));
      for (const old of all.slice(keep)) {
        metas.delete(old.id);
        payloads.delete(old.id);
      }
    },
    async deleteBackup(id) {
      metas.delete(id);
      payloads.delete(id);
    },
  };
  return { backend, metas, payloads };
}

const project = (title = 'Projet'): ProgressNode => createNode({ id: 'p', parentId: null, title });
const task = (progress: number): ProgressNode => createNode({ id: 't', parentId: 'p', title: 'Tâche', progress });
let counter = 0;
const uid = () => `id-${++counter}`;
const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 0, 1);

describe('copies : historique qui s’empile', () => {
  it('ne crée rien quand il n’y a aucune donnée', async () => {
    const { backend, metas } = fakeBackend();
    expect(await takeSnapshot(backend, [], 'auto', T0, 10, uid)).toEqual({ status: 'empty' });
    expect(metas.size).toBe(0);
  });

  it('enregistre le nombre de projets, d’éléments, la taille et l’origine', async () => {
    const { backend } = fakeBackend();
    const result = await takeSnapshot(backend, [project(), task(30)], 'manual', T0, 10, uid);
    expect(result.status).toBe('created');
    if (result.status !== 'created') return;
    expect(result.meta).toMatchObject({ kind: 'manual', projects: 1, elements: 2, createdAt: T0 });
    expect(result.meta.bytes).toBeGreaterThan(50);
    expect(result.meta.hash).toBe(snapshotHash([project(), task(30)]));
  });

  it('une nouvelle copie s’ajoute sans écraser la précédente', async () => {
    const { backend, payloads } = fakeBackend();
    await takeSnapshot(backend, [project(), task(10)], 'auto', T0, 10, uid);
    await takeSnapshot(backend, [project(), task(60)], 'auto', T0 + 7 * DAY, 10, uid);
    const list = await backend.listBackups();
    expect(list).toHaveLength(2);
    expect(list.map((m) => m.createdAt)).toEqual([T0 + 7 * DAY, T0]); // la plus récente d'abord
    // Les deux contenus sont toujours là, chacun avec ses données d'origine.
    expect(payloads.get(list[1]!.id)).toContain('"progress":10');
    expect(payloads.get(list[0]!.id)).toContain('"progress":60');
  });

  it('n’empile pas deux copies identiques', async () => {
    const { backend } = fakeBackend();
    const first = await takeSnapshot(backend, [project(), task(10)], 'auto', T0, 10, uid);
    const again = await takeSnapshot(backend, [task(10), project()], 'manual', T0 + DAY, 10, uid);
    expect(again.status).toBe('unchanged');
    expect(again.status === 'unchanged' && first.status === 'created' && again.meta.id === first.meta.id).toBe(true);
    expect(await backend.listBackups()).toHaveLength(1);
  });

  it('repart sur une nouvelle copie dès que le contenu change', async () => {
    const { backend } = fakeBackend();
    await takeSnapshot(backend, [project(), task(10)], 'auto', T0, 10, uid);
    await takeSnapshot(backend, [project(), task(11)], 'auto', T0 + DAY, 10, uid);
    // Revenir à un état déjà copié plus tôt crée bien une entrée (la dernière copie est différente).
    const back = await takeSnapshot(backend, [project(), task(10)], 'auto', T0 + 2 * DAY, 10, uid);
    expect(back.status).toBe('created');
    expect(await backend.listBackups()).toHaveLength(3);
  });

  it('au-delà du nombre à garder, seule la plus ancienne est supprimée', async () => {
    const { backend, payloads } = fakeBackend();
    for (let i = 0; i < 5; i++) await takeSnapshot(backend, [project(), task(i * 10)], 'auto', T0 + i * DAY, 3, uid);
    const list = await backend.listBackups();
    expect(list.map((m) => m.createdAt)).toEqual([T0 + 4 * DAY, T0 + 3 * DAY, T0 + 2 * DAY]);
    expect(payloads.size).toBe(3);
  });
});

describe('restauration', () => {
  it('rend les données de la copie et garde d’abord l’état actuel dans l’historique', async () => {
    const { backend } = fakeBackend();
    const old = await takeSnapshot(backend, [project('Ancien'), task(20)], 'auto', T0, 10, uid);
    if (old.status !== 'created') throw new Error('copie attendue');

    const current = [project('Actuel'), task(90)];
    const restored = await prepareRestore(backend, old.meta.id, current, T0 + 3 * DAY, 10);
    expect(restored?.find((n) => n.parentId === null)?.title).toBe('Ancien');

    const list = await backend.listBackups();
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ kind: 'before-restore', createdAt: T0 + 3 * DAY });
    expect(list[0]!.hash).toBe(snapshotHash(current));
  });

  it('copie disparue : null, rien n’est modifié', async () => {
    const { backend } = fakeBackend();
    expect(await prepareRestore(backend, 'inconnue', [project()], T0, 10)).toBeNull();
    expect(await backend.listBackups()).toHaveLength(0);
  });

  it('copie illisible : erreur, et l’état actuel n’est pas touché', async () => {
    const { backend, metas, payloads } = fakeBackend();
    metas.set('x', { id: 'x', createdAt: T0, kind: 'auto', projects: 1, elements: 1, bytes: 3, hash: 'h' });
    payloads.set('x', '{pas du json');
    await expect(prepareRestore(backend, 'x', [project()], T0 + DAY, 10)).rejects.toBeInstanceOf(ImportError);
    expect(await backend.listBackups()).toHaveLength(1); // pas de copie « avant restauration » pour rien
  });

  it('restaurer une copie identique à l’état actuel n’ajoute pas de doublon', async () => {
    const { backend } = fakeBackend();
    const nodes = [project(), task(50)];
    const first = await takeSnapshot(backend, nodes, 'auto', T0, 10, uid);
    if (first.status !== 'created') throw new Error('copie attendue');
    await prepareRestore(backend, first.meta.id, nodes, T0 + DAY, 10);
    expect(await backend.listBackups()).toHaveLength(1);
  });
});
