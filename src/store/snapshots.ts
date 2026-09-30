import { snapshotHash } from '../domain/autobackup';
import { exportData, parseImport } from '../domain/exchange';
import type { ProgressNode } from '../domain/types';
import type { BackupBackend, BackupKind, BackupMeta } from '../storage/types';

export type SnapshotResult =
  | { status: 'created'; meta: BackupMeta }
  /** Le contenu est identique à la dernière copie : on n'en empile pas une seconde. */
  | { status: 'unchanged'; meta: BackupMeta }
  /** Rien à sauvegarder. */
  | { status: 'empty' };

const randomId = (now: number) => `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Ajoute une copie de `nodes` à l'historique. Les copies précédentes ne sont jamais écrasées : seules les plus
 * anciennes, au-delà de `keep`, sont supprimées. Une copie identique à la dernière n'est pas empilée.
 */
export async function takeSnapshot(
  backend: BackupBackend,
  nodes: readonly ProgressNode[],
  kind: BackupKind,
  now: number,
  keep: number,
  newId: (now: number) => string = randomId,
): Promise<SnapshotResult> {
  if (nodes.length === 0) return { status: 'empty' };
  const hash = snapshotHash(nodes);
  const latest = (await backend.listBackups())[0];
  if (latest && latest.hash === hash) return { status: 'unchanged', meta: latest };

  const payload = exportData(nodes, now, true);
  const meta: BackupMeta = {
    id: newId(now),
    createdAt: now,
    kind,
    projects: nodes.filter((n) => n.parentId === null).length,
    elements: nodes.length,
    bytes: payload.length,
    hash,
  };
  await backend.addBackup(meta, payload, keep);
  return { status: 'created', meta };
}

/**
 * Prépare la restauration d'une copie : la lit et la valide (elle peut être illisible), et garde d'abord l'état
 * actuel dans l'historique pour pouvoir revenir en arrière. Renvoie null si la copie n'existe plus.
 * Lève `ImportError` si son contenu est invalide.
 */
export async function prepareRestore(
  backend: BackupBackend,
  id: string,
  current: readonly ProgressNode[],
  now: number,
  keep: number,
): Promise<ProgressNode[] | null> {
  const payload = await backend.readBackup(id);
  if (payload === null) return null;
  const restored = parseImport(payload);
  await takeSnapshot(backend, current, 'before-restore', now, keep);
  return restored;
}
