import { isComplete } from './progress';
import { childrenOf, subtreeIds } from './tree';
import type { NodeId, ProgressNode } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Clé de jour locale AAAA-MM-JJ. */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface DayEvents {
  completed: ProgressNode[];
  due: ProgressNode[];
}

/** Événements d'un projet regroupés par jour : éléments terminés ce jour-là et échéances. */
export function eventsByDay(nodes: readonly ProgressNode[], projectId: NodeId): Map<string, DayEvents> {
  const result = new Map<string, DayEvents>();
  const get = (key: string) => {
    let entry = result.get(key);
    if (!entry) {
      entry = { completed: [], due: [] };
      result.set(key, entry);
    }
    return entry;
  };
  for (const id of subtreeIds(nodes, projectId)) {
    const n = nodes.find((x) => x.id === id);
    if (!n) continue;
    if (n.completedAt !== null) get(dayKey(n.completedAt)).completed.push(n);
    if (n.dueDate) get(n.dueDate).due.push(n);
  }
  return result;
}

export interface ProjectStats {
  total: number;
  completed: number;
  /** Éléments de niveau feuille. */
  leaves: number;
  leavesCompleted: number;
  overdue: number;
  completedLast7Days: number;
  /** Éléments non terminés avec échéance dans les 7 prochains jours (aujourd'hui inclus). */
  dueSoon: number;
}

export function projectStats(nodes: readonly ProgressNode[], projectId: NodeId, now: number): ProjectStats {
  const scope = subtreeIds(nodes, projectId)
    .filter((id) => id !== projectId)
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is ProgressNode => !!n);
  const today = dayKey(now);
  const weekAgo = now - 7 * 24 * 3600 * 1000;
  const inAWeek = dayKey(now + 7 * 24 * 3600 * 1000);
  const stats: ProjectStats = {
    total: scope.length,
    completed: 0,
    leaves: 0,
    leavesCompleted: 0,
    overdue: 0,
    completedLast7Days: 0,
    dueSoon: 0,
  };
  for (const n of scope) {
    const done = isComplete(nodes, n.id);
    const leaf = childrenOf(nodes, n.id).length === 0;
    if (done) stats.completed += 1;
    if (leaf) {
      stats.leaves += 1;
      if (done) stats.leavesCompleted += 1;
    }
    if (n.completedAt !== null && n.completedAt >= weekAgo) stats.completedLast7Days += 1;
    if (!done && n.dueDate) {
      if (n.dueDate < today) stats.overdue += 1;
      else if (n.dueDate <= inAWeek) stats.dueSoon += 1;
    }
  }
  return stats;
}
