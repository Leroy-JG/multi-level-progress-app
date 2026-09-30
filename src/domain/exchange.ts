import { MAX_DEPTH, createNode, validColor, type ProgressNode } from './types';

/** Garde-fou : une sauvegarde plus grosse que ça n'est pas une sauvegarde de cette application. */
const MAX_NODES = 20000;

export const EXPORT_APP = 'w-progress';
export const EXPORT_VERSION = 2;

export interface ExportFile {
  app: typeof EXPORT_APP;
  version: number;
  exportedAt: number;
  nodes: ProgressNode[];
}

/** `compact` : sans mise en forme (environ 40 % plus léger) — pour les copies automatiques gardées sur l'appareil. */
export function exportData(nodes: readonly ProgressNode[], now: number, compact = false): string {
  const file: ExportFile = { app: EXPORT_APP, version: EXPORT_VERSION, exportedAt: now, nodes: [...nodes] };
  return compact ? JSON.stringify(file) : JSON.stringify(file, null, 2);
}

export class ImportError extends Error {}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Lit et valide un export. Rejette tout fichier incohérent plutôt que de corrompre les données. */
export function parseImport(text: string): ProgressNode[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError('invalid_json');
  }
  if (!raw || typeof raw !== 'object') throw new ImportError('invalid_format');
  const file = raw as Partial<ExportFile>;
  if (file.app !== EXPORT_APP || !Array.isArray(file.nodes) || file.nodes.length > MAX_NODES) throw new ImportError('invalid_format');

  const nodes: ProgressNode[] = [];
  const ids = new Set<string>();
  for (const item of file.nodes as unknown as Record<string, unknown>[]) {
    const id = str(item?.id);
    if (!id || ids.has(id)) throw new ImportError('invalid_nodes');
    ids.add(id);
    const legacyDone = item.done === true ? 100 : 0; // format v1
    const progress = num(item.progress) ?? legacyDone;
    const weight = num(item.weight);
    const due = str(item.dueDate);
    nodes.push(
      createNode({
        id,
        parentId: item.parentId === null || item.parentId === undefined ? null : str(item.parentId),
        title: str(item.title, '—').slice(0, 200),
        progress: Math.min(100, Math.max(0, progress)),
        weight: weight === null ? null : Math.min(100, Math.max(0, weight)),
        position: num(item.position) ?? 0,
        color: validColor(item.color),
        note: str(item.note).slice(0, 10000),
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
        reminderAt: num(item.reminderAt),
        completedAt: num(item.completedAt),
      }),
    );
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const n of nodes) {
    let depth = 1;
    let current = n;
    while (current.parentId !== null) {
      const parent = byId.get(current.parentId);
      if (!parent) throw new ImportError('invalid_nodes');
      current = parent;
      depth += 1;
      if (depth > MAX_DEPTH) throw new ImportError('invalid_nodes');
    }
  }
  return nodes;
}
