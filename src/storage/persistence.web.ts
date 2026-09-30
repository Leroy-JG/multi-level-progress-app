// Implémentation web / PWA (localStorage). Les données restent sur l'appareil.
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from '../domain/settings';
import { normalizeStoredNode, type ProgressNode } from '../domain/types';
import type { BackupMeta, Persistence } from './types';

const KEY = 'w:data:v2';
const LEGACY_KEY = 'mlp:data:v1';

interface Data {
  nodes: ProgressNode[];
  currentProjectId: string | null;
  settings: Settings;
}

function parse(raw: string | null | undefined): Data | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as { nodes?: Record<string, unknown>[]; currentProjectId?: string | null; settings?: unknown };
    return {
      nodes: (obj.nodes ?? []).map(normalizeStoredNode),
      currentProjectId: obj.currentProjectId ?? null,
      settings: normalizeSettings(obj.settings),
    };
  } catch {
    return null; // données illisibles
  }
}

function read(): Data {
  const storage = globalThis.localStorage;
  return (
    parse(storage?.getItem(KEY)) ??
    parse(storage?.getItem(LEGACY_KEY)) ?? { nodes: [], currentProjectId: null, settings: DEFAULT_SETTINGS }
  );
}

function write(data: Data): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Stockage indisponible', e);
  }
}

/* ---------- Historique des copies : IndexedDB ----------
 * Pas dans localStorage : son quota (~5 Mo) est partagé avec les données principales, et l'écriture de celles-ci
 * ne doit jamais échouer à cause des copies. `meta` = liste légère, `payloads` = contenu (lu à la demande). */

const BACKUP_DB = 'alam-backups';

function openBackupDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const factory = globalThis.indexedDB;
    if (!factory) return reject(new Error('IndexedDB indisponible'));
    const request = factory.open(BACKUP_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('meta', { keyPath: 'id' });
      request.result.createObjectStore('payloads');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const wait = <T,>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** Ouvre la base le temps d'une transaction puis la referme (une base ouverte empêcherait de l'effacer). */
async function inBackupDb<T>(
  mode: IDBTransactionMode,
  run: (meta: IDBObjectStore, payloads: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openBackupDb();
  try {
    const tx = db.transaction(['meta', 'payloads'], mode);
    const finished = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    finished.catch(() => undefined); // si `run` échoue avant qu'on l'attende : pas de rejet sans écouteur
    const result = await run(tx.objectStore('meta'), tx.objectStore('payloads'));
    await finished;
    return result;
  } finally {
    db.close();
  }
}

const newestFirst = (a: BackupMeta, b: BackupMeta) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

async function eraseBackupDb(): Promise<void> {
  await new Promise<void>((resolve) => {
    const request = globalThis.indexedDB?.deleteDatabase(BACKUP_DB);
    if (!request) return resolve();
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

export const persistence: Persistence = {
  async load() {
    return read();
  },
  async upsert(nodes) {
    const data = read();
    const byId = new Map(data.nodes.map((n) => [n.id, n]));
    for (const n of nodes) byId.set(n.id, n);
    write({ ...data, nodes: [...byId.values()] });
  },
  async remove(ids) {
    const data = read();
    const gone = new Set(ids);
    write({ ...data, nodes: data.nodes.filter((n) => !gone.has(n.id)) });
  },
  async replaceAll(nodes, currentProjectId) {
    write({ ...read(), nodes, currentProjectId });
  },
  async saveCurrentProject(id) {
    write({ ...read(), currentProjectId: id });
  },
  async saveSettings(settings) {
    write({ ...read(), settings });
  },
  async listBackups() {
    const all = await inBackupDb('readonly', (meta) => wait(meta.getAll() as IDBRequest<BackupMeta[]>));
    return all.sort(newestFirst);
  },
  async readBackup(id) {
    const payload = await inBackupDb('readonly', (_meta, payloads) => wait(payloads.get(id) as IDBRequest<string | undefined>));
    return payload ?? null;
  },
  async addBackup(meta, payload, keep) {
    await inBackupDb('readwrite', async (metas, payloads) => {
      metas.put(meta);
      payloads.put(payload, meta.id);
      const all = (await wait(metas.getAll() as IDBRequest<BackupMeta[]>)).sort(newestFirst);
      // On ne supprime que les plus anciennes, au-delà du nombre de copies à garder.
      for (const old of all.slice(Math.max(1, keep))) {
        metas.delete(old.id);
        payloads.delete(old.id);
      }
    });
  },
  async deleteBackup(id) {
    await inBackupDb('readwrite', async (metas, payloads) => {
      metas.delete(id);
      payloads.delete(id);
    });
  },
  async eraseAll() {
    await eraseBackupDb();
    // Les deux clés : l'ancienne (v1) ne doit pas survivre à un effacement.
    for (const key of [KEY, LEGACY_KEY]) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch (e) {
        console.warn('Stockage indisponible', e);
      }
    }
  },
};
