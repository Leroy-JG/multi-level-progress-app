/** Niveaux : 1 = projet, 2 = sous-projet, 3 = tâche, 4 = sous-tâche. */
export const MAX_DEPTH = 4;

export const LEVEL_KEYS = ['level.project', 'level.subproject', 'level.task', 'level.subtask'] as const;

export type NodeId = string;

export interface ProgressNode {
  id: NodeId;
  /** null = projet (racine). */
  parentId: NodeId | null;
  title: string;
  /** Avancement 0–100. Utilisé uniquement quand le nœud n'a aucun enfant. */
  progress: number;
  /** Pourcentage (0–100) fixé par l'utilisateur parmi ses frères ; null = automatique (1/N). */
  weight: number | null;
  /** Ordre d'affichage parmi les frères. */
  position: number;
  /** Couleur du projet (projets uniquement). */
  color: string | null;
  note: string;
  /** Date limite locale, format AAAA-MM-JJ. */
  dueDate: string | null;
  /** Rappel : horodatage (ms) ou null. */
  reminderAt: number | null;
  /** Horodatage (ms) de la dernière complétion à 100 %, null si non terminé. */
  completedAt: number | null;
}

/** Couleur de projet valide (#RRGGBB) ; tout le reste (import, base corrompue) devient null. */
export function validColor(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

export function createNode(partial: Pick<ProgressNode, 'id' | 'parentId' | 'title'> & Partial<ProgressNode>): ProgressNode {
  return {
    progress: 0,
    weight: null,
    position: 0,
    color: null,
    note: '',
    dueDate: null,
    reminderAt: null,
    completedAt: null,
    ...partial,
  };
}

/** Reconstruit un nœud depuis une donnée stockée, en tolérant l'ancien format (`done`) et les champs manquants. */
export function normalizeStoredNode(raw: Record<string, unknown>): ProgressNode {
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const progress = num(raw.progress) ?? (raw.done === true || raw.done === 1 ? 100 : 0);
  return createNode({
    id: String(raw.id),
    parentId: typeof raw.parentId === 'string' ? raw.parentId : null,
    title: typeof raw.title === 'string' ? raw.title : '',
    progress: Math.min(100, Math.max(0, progress)),
    weight: num(raw.weight),
    position: num(raw.position) ?? 0,
    color: validColor(raw.color),
    note: typeof raw.note === 'string' ? raw.note : '',
    dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : null,
    reminderAt: num(raw.reminderAt),
    completedAt: num(raw.completedAt),
  });
}
