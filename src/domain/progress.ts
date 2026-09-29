import { childrenOf } from './tree';
import type { NodeId, ProgressNode } from './types';

/**
 * Poids (fractions, somme = 1) de chaque frère.
 * - Poids fixés : ils prennent leur pourcentage.
 * - Poids automatiques : ils se partagent le reste à parts égales.
 * - Sans automatique et somme ≠ 100 : normalisation proportionnelle.
 * - Somme fixée > 100 : normalisée à 100, les automatiques valent 0.
 */
export function resolveWeights(siblings: readonly ProgressNode[]): Map<NodeId, number> {
  const result = new Map<NodeId, number>();
  if (siblings.length === 0) return result;

  const fixed = siblings.filter((s) => s.weight !== null);
  const autos = siblings.filter((s) => s.weight === null);
  const fixedSum = fixed.reduce((sum, s) => sum + (s.weight ?? 0), 0);

  if (autos.length === 0) {
    if (fixedSum <= 0) {
      for (const s of siblings) result.set(s.id, 1 / siblings.length);
    } else {
      for (const s of siblings) result.set(s.id, (s.weight ?? 0) / fixedSum);
    }
    return result;
  }

  if (fixedSum > 100) {
    for (const s of fixed) result.set(s.id, (s.weight ?? 0) / fixedSum);
    for (const s of autos) result.set(s.id, 0);
    return result;
  }

  const autoShare = (100 - fixedSum) / 100 / autos.length;
  for (const s of fixed) result.set(s.id, (s.weight ?? 0) / 100);
  for (const s of autos) result.set(s.id, autoShare);
  return result;
}

/** Progression d'un nœud entre 0 et 1. */
export function progressOf(nodes: readonly ProgressNode[], id: NodeId): number {
  const node = nodes.find((n) => n.id === id);
  if (!node) return 0;
  return computeProgress(nodes, node);
}

function computeProgress(nodes: readonly ProgressNode[], node: ProgressNode): number {
  const children = childrenOf(nodes, node.id);
  if (children.length === 0) return Math.min(1, Math.max(0, node.progress / 100));
  const weights = resolveWeights(children);
  let total = 0;
  for (const child of children) {
    total += (weights.get(child.id) ?? 0) * computeProgress(nodes, child);
  }
  return Math.min(1, Math.max(0, total));
}

export interface WeightSummary {
  /** Somme des pourcentages effectifs (toujours 100 si le groupe n'est pas vide). */
  fixedTotal: number;
  autoCount: number;
  /** true si les pourcentages fixés dépassent 100 ou ne laissent rien aux automatiques. */
  overflow: boolean;
}

export function summarizeWeights(siblings: readonly ProgressNode[]): WeightSummary {
  const fixed = siblings.filter((s) => s.weight !== null);
  const fixedTotal = fixed.reduce((sum, s) => sum + (s.weight ?? 0), 0);
  const autoCount = siblings.length - fixed.length;
  return {
    fixedTotal,
    autoCount,
    overflow: fixedTotal > 100 || (autoCount > 0 && fixedTotal >= 100),
  };
}

/** Pourcentage effectif d'un enfant dans son parent (0–100). */
export function effectivePercent(siblings: readonly ProgressNode[], id: NodeId): number {
  return (resolveWeights(siblings).get(id) ?? 0) * 100;
}

const EPSILON = 1e-9;

/** Un nœud est terminé quand sa progression atteint 100 %. */
export function isComplete(nodes: readonly ProgressNode[], id: NodeId): boolean {
  return progressOf(nodes, id) >= 1 - EPSILON;
}
