import { isComplete } from './progress';
import { childrenOf, subtreeIds } from './tree';
import type { NodeId, ProgressNode } from './types';

/**
 * Fonctions pures : elles renvoient un nouveau tableau et conservent la même référence
 * pour les nœuds inchangés (le store s'en sert pour ne sauvegarder que les différences).
 */

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Fixe l'avancement de toutes les feuilles de la sous-arborescence (cocher = 100, décocher = 0). */
export function setSubtreeProgress(nodes: readonly ProgressNode[], id: NodeId, percent: number): ProgressNode[] {
  const value = clampPercent(percent);
  const scope = new Set(subtreeIds(nodes, id));
  const hasChildren = new Set(nodes.map((n) => n.parentId).filter((p): p is NodeId => p !== null));
  return nodes.map((n) =>
    scope.has(n.id) && !hasChildren.has(n.id) && n.progress !== value ? { ...n, progress: value } : n,
  );
}

/** Coche (tout à 100 %) si l'élément n'est pas terminé, sinon décoche (tout à 0 %). */
export function toggleComplete(nodes: readonly ProgressNode[], id: NodeId): ProgressNode[] {
  return setSubtreeProgress(nodes, id, isComplete(nodes, id) ? 0 : 100);
}

/**
 * Met à jour `completedAt` : renseigné (à `now`) quand un nœud passe à 100 %, effacé quand il repasse dessous.
 * Un nœud déjà terminé garde sa date d'origine.
 */
export function syncCompletion(nodes: readonly ProgressNode[], now: number): ProgressNode[] {
  return nodes.map((n) => {
    const done = isComplete(nodes, n.id);
    if (done && n.completedAt === null) return { ...n, completedAt: now };
    if (!done && n.completedAt !== null) return { ...n, completedAt: null };
    return n;
  });
}

/** Échange la position d'un élément avec son voisin (-1 = monter, +1 = descendre). */
export function moveSibling(nodes: readonly ProgressNode[], id: NodeId, direction: -1 | 1): ProgressNode[] {
  const node = nodes.find((n) => n.id === id);
  if (!node) return [...nodes];
  const siblings = childrenOf(nodes, node.parentId);
  const from = siblings.findIndex((s) => s.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= siblings.length) return [...nodes];
  const reordered = [...siblings];
  const [moved] = reordered.splice(from, 1);
  reordered.splice(to, 0, moved as ProgressNode);
  const newPosition = new Map(reordered.map((s, i) => [s.id, i]));
  return nodes.map((n) => {
    const pos = newPosition.get(n.id);
    return pos !== undefined && pos !== n.position ? { ...n, position: pos } : n;
  });
}
