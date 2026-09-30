import { MAX_DEPTH, type NodeId, type ProgressNode } from './types';

export type NodeIndex = Map<NodeId, ProgressNode>;

export function indexNodes(nodes: readonly ProgressNode[]): NodeIndex {
  return new Map(nodes.map((n) => [n.id, n]));
}

export function childrenOf(nodes: readonly ProgressNode[], parentId: NodeId | null): ProgressNode[] {
  return nodes.filter((n) => n.parentId === parentId).sort((a, b) => a.position - b.position);
}

/** Enfants triés de chaque parent, calculés en une seule passe (clé `null` = les projets). */
export function groupByParent(nodes: readonly ProgressNode[]): Map<NodeId | null, ProgressNode[]> {
  const groups = new Map<NodeId | null, ProgressNode[]>();
  for (const n of nodes) {
    const list = groups.get(n.parentId);
    if (list) list.push(n);
    else groups.set(n.parentId, [n]);
  }
  for (const list of groups.values()) list.sort((a, b) => a.position - b.position);
  return groups;
}

/** 1 pour un projet, 2 pour un sous-projet, etc. */
export function depthOf(index: NodeIndex, id: NodeId): number {
  let depth = 0;
  let current = index.get(id);
  while (current) {
    depth += 1;
    if (depth > MAX_DEPTH) throw new Error(`Arbre invalide autour de ${id}`);
    current = current.parentId === null ? undefined : index.get(current.parentId);
  }
  return depth;
}

export function canAddChild(index: NodeIndex, id: NodeId): boolean {
  return depthOf(index, id) < MAX_DEPTH;
}

/** Ids du nœud et de tous ses descendants. */
export function subtreeIds(nodes: readonly ProgressNode[], id: NodeId): NodeId[] {
  const result: NodeId[] = [];
  const stack = [id];
  while (stack.length > 0) {
    const current = stack.pop() as NodeId;
    result.push(current);
    for (const n of nodes) if (n.parentId === current) stack.push(n.id);
  }
  return result;
}

/** Chemin du projet jusqu'au nœud (inclus). */
export function pathTo(index: NodeIndex, id: NodeId): ProgressNode[] {
  const path: ProgressNode[] = [];
  let current = index.get(id);
  while (current) {
    path.unshift(current);
    current = current.parentId === null ? undefined : index.get(current.parentId);
  }
  return path;
}
