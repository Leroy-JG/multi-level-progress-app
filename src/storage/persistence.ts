// Implémentation mobile (Android / iOS) : SQLite. La version web est dans persistence.web.ts.
import * as SQLite from 'expo-sqlite';
import { DEFAULT_SETTINGS, normalizeSettings } from '../domain/settings';
import { normalizeStoredNode, type ProgressNode } from '../domain/types';
import type { BackupKind, BackupMeta, Persistence } from './types';

const SCHEMA_VERSION = 2;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY NOT NULL,
      parent_id TEXT,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      weight REAL,
      position INTEGER NOT NULL DEFAULT 0,
      color TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT);
    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY NOT NULL,
      created_at INTEGER NOT NULL,
      kind TEXT NOT NULL,
      projects INTEGER NOT NULL,
      elements INTEGER NOT NULL,
      bytes INTEGER NOT NULL,
      hash TEXT NOT NULL,
      payload TEXT NOT NULL
    );
  `);
  if (version < SCHEMA_VERSION) {
    // Transaction : une migration interrompue ne laisse pas la base à moitié modifiée.
    await db.withTransactionAsync(async () => {
      if (version < 2) {
        // v2 : avancement en %, notes, échéance, rappel, date de complétion.
        await db.execAsync(`
          ALTER TABLE nodes ADD COLUMN progress REAL NOT NULL DEFAULT 0;
          ALTER TABLE nodes ADD COLUMN note TEXT NOT NULL DEFAULT '';
          ALTER TABLE nodes ADD COLUMN due_date TEXT;
          ALTER TABLE nodes ADD COLUMN reminder_at INTEGER;
          ALTER TABLE nodes ADD COLUMN completed_at INTEGER;
          UPDATE nodes SET progress = CASE WHEN done = 1 THEN 100 ELSE 0 END;
        `);
      }
      await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    });
  }
}

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('progress.db');
      await migrate(db);
      return db;
    })();
  }
  return dbPromise;
}

const UPSERT = `INSERT INTO nodes (id, parent_id, title, weight, position, color, progress, note, due_date, reminder_at, completed_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET parent_id = excluded.parent_id, title = excluded.title, weight = excluded.weight,
    position = excluded.position, color = excluded.color, progress = excluded.progress, note = excluded.note,
    due_date = excluded.due_date, reminder_at = excluded.reminder_at, completed_at = excluded.completed_at`;

const params = (n: ProgressNode) => [
  n.id, n.parentId, n.title, n.weight, n.position, n.color, n.progress, n.note, n.dueDate, n.reminderAt, n.completedAt,
];

async function getMeta(db: SQLite.SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

const setMeta = (db: SQLite.SQLiteDatabase, key: string, value: string | null) =>
  db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value]);

export const persistence: Persistence = {
  async load() {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>('SELECT * FROM nodes');
    const nodes = rows.map((r) =>
      normalizeStoredNode({
        id: r.id,
        parentId: r.parent_id,
        title: r.title,
        progress: r.progress,
        weight: r.weight,
        position: r.position,
        color: r.color,
        note: r.note,
        dueDate: r.due_date,
        reminderAt: r.reminder_at,
        completedAt: r.completed_at,
      }),
    );
    let settings = DEFAULT_SETTINGS;
    try {
      settings = normalizeSettings(JSON.parse((await getMeta(db, 'settings')) ?? 'null'));
    } catch {
      // réglages illisibles : valeurs par défaut
    }
    return { nodes, currentProjectId: await getMeta(db, 'currentProjectId'), settings };
  },

  async upsert(nodes) {
    if (nodes.length === 0) return;
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const n of nodes) await db.runAsync(UPSERT, params(n));
    });
  },

  async remove(ids) {
    if (ids.length === 0) return;
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const id of ids) await db.runAsync('DELETE FROM nodes WHERE id = ?', [id]);
    });
  },

  async replaceAll(nodes, currentProjectId) {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM nodes');
      for (const n of nodes) await db.runAsync(UPSERT, params(n));
      await setMeta(db, 'currentProjectId', currentProjectId);
    });
  },

  async saveCurrentProject(id) {
    await setMeta(await getDb(), 'currentProjectId', id);
  },

  async saveSettings(settings) {
    await setMeta(await getDb(), 'settings', JSON.stringify(settings));
  },

  async listBackups() {
    const db = await getDb();
    // Sans la colonne payload : la liste reste légère, quelle que soit la taille des copies.
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT id, created_at, kind, projects, elements, bytes, hash FROM backups ORDER BY created_at DESC, id DESC',
    );
    return rows.map(
      (r): BackupMeta => ({
        id: String(r.id),
        createdAt: Number(r.created_at),
        kind: r.kind as BackupKind,
        projects: Number(r.projects),
        elements: Number(r.elements),
        bytes: Number(r.bytes),
        hash: String(r.hash),
      }),
    );
  },

  async readBackup(id) {
    const db = await getDb();
    const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM backups WHERE id = ?', [id]);
    return row?.payload ?? null;
  },

  async addBackup(meta, payload, keep) {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'INSERT INTO backups (id, created_at, kind, projects, elements, bytes, hash, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [meta.id, meta.createdAt, meta.kind, meta.projects, meta.elements, meta.bytes, meta.hash, payload],
      );
      // On ne supprime que les plus anciennes, au-delà du nombre de copies à garder.
      await db.runAsync(
        'DELETE FROM backups WHERE id NOT IN (SELECT id FROM backups ORDER BY created_at DESC, id DESC LIMIT ?)',
        [Math.max(1, keep)],
      );
    });
  },

  async deleteBackup(id) {
    const db = await getDb();
    await db.runAsync('DELETE FROM backups WHERE id = ?', [id]);
  },

  async eraseAll() {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM nodes');
      await db.runAsync('DELETE FROM meta');
      await db.runAsync('DELETE FROM backups');
    });
    // Réécrit le fichier : les anciennes données ne restent ni dans les pages libres ni dans le journal (WAL).
    await db.execAsync('VACUUM');
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
  },
};
