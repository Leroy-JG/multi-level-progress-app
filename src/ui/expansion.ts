import { useSyncExternalStore } from 'react';
import type { NodeId } from '../domain/types';

/**
 * Accordéons ouverts. Gardé pour la durée de la session (pas enregistré) : on retrouve ses accordéons
 * ouverts en revenant sur l'écran, en changeant d'onglet ou en ouvrant un élément puis en revenant.
 */
let expanded: ReadonlySet<NodeId> = new Set();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => expanded;

export function toggleExpanded(id: NodeId): void {
  const next = new Set(expanded);
  if (!next.delete(id)) next.add(id);
  expanded = next;
  listeners.forEach((l) => l());
}

/** Lecture directe, hors composant. */
export const getExpanded = (): ReadonlySet<NodeId> => expanded;

export function useExpanded(): ReadonlySet<NodeId> {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Remet tout à zéro (tests). */
export function resetExpanded(): void {
  expanded = new Set();
  listeners.forEach((l) => l());
}
