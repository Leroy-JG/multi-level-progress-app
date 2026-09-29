import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type Settings, type ThemeMode } from '../domain/settings';
import { moveSibling, setSubtreeProgress, syncCompletion, toggleComplete } from '../domain/mutations';
import { childrenOf, subtreeIds } from '../domain/tree';
import { createNode, type NodeId, type ProgressNode } from '../domain/types';
import { cancelReminder, scheduleReminder, syncReminders } from '../notifications';
import { persistence } from '../storage/persistence';

export interface WeightUpdate {
  id: NodeId;
  weight: number | null;
}

export type NodePatch = Partial<Pick<ProgressNode, 'title' | 'color' | 'note' | 'dueDate' | 'reminderAt'>>;

interface StoreValue {
  ready: boolean;
  nodes: ProgressNode[];
  currentProjectId: NodeId | null;
  settings: Settings;
  addNode(parentId: NodeId | null, title: string, color?: string | null): NodeId;
  updateNode(id: NodeId, patch: NodePatch): void;
  /** Avancement manuel d'une feuille (0–100). */
  setProgress(id: NodeId, percent: number): void;
  /** Coche / décoche (sur un parent : toute la sous-arborescence). */
  toggleComplete(id: NodeId): void;
  deleteNode(id: NodeId): void;
  setWeights(updates: WeightUpdate[]): void;
  moveSibling(id: NodeId, direction: -1 | 1): void;
  selectProject(id: NodeId): void;
  setThemeMode(mode: ThemeMode): void;
  /** Remplace toutes les données (import). */
  replaceAll(nodes: ProgressNode[]): void;
}

const StoreContext = createContext<StoreValue | null>(null);

function newId(): NodeId {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const byPosition = (a: ProgressNode, b: ProgressNode) => a.position - b.position;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [nodes, setNodesState] = useState<ProgressNode[]>([]);
  const [currentProjectId, setCurrentState] = useState<NodeId | null>(null);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const nodesRef = useRef<ProgressNode[]>([]);
  const currentRef = useRef<NodeId | null>(null);
  // Sérialise les écritures pour garder l'ordre des opérations.
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback((job: () => Promise<void>) => {
    writeQueue.current = writeQueue.current.then(job).catch((e) => console.warn('Écriture échouée', e));
  }, []);

  const setCurrent = useCallback(
    (id: NodeId | null) => {
      currentRef.current = id;
      setCurrentState(id);
      enqueue(() => persistence.saveCurrentProject(id));
    },
    [enqueue],
  );

  /**
   * Applique une modification : recalcule les dates de complétion puis ne sauvegarde que
   * les nœuds réellement modifiés ou supprimés.
   */
  const mutate = useCallback(
    (fn: (nodes: ProgressNode[]) => ProgressNode[]) => {
      const before = nodesRef.current;
      const after = syncCompletion(fn(before), Date.now());
      const beforeById = new Map(before.map((n) => [n.id, n]));
      const afterIds = new Set(after.map((n) => n.id));
      const changed = after.filter((n) => beforeById.get(n.id) !== n);
      const removed = before.filter((n) => !afterIds.has(n.id)).map((n) => n.id);
      nodesRef.current = after;
      setNodesState(after);
      if (changed.length > 0) enqueue(() => persistence.upsert(changed));
      if (removed.length > 0) enqueue(() => persistence.remove(removed));
      // Rappels : uniquement pour les éléments dont le rappel, le titre ou l'état terminé a changé.
      for (const n of changed) {
        const old = beforeById.get(n.id);
        if (!old || old.reminderAt !== n.reminderAt || old.title !== n.title || (old.completedAt === null) !== (n.completedAt === null)) {
          void scheduleReminder(n);
        }
      }
      for (const id of removed) void cancelReminder(id);
    },
    [enqueue],
  );

  useEffect(() => {
    let cancelled = false;
    persistence
      .load()
      .then((data) => {
        if (cancelled) return;
        const roots = data.nodes.filter((n) => n.parentId === null).sort(byPosition);
        const current = roots.find((r) => r.id === data.currentProjectId) ?? roots[0] ?? null;
        nodesRef.current = data.nodes;
        setNodesState(data.nodes);
        currentRef.current = current?.id ?? null;
        setCurrentState(current?.id ?? null);
        setSettingsState(data.settings);
        setReady(true);
        void syncReminders(data.nodes);
      })
      .catch((e) => {
        console.warn('Chargement échoué', e);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      nodes,
      currentProjectId,
      settings,

      addNode(parentId, title, color = null) {
        const siblings = childrenOf(nodesRef.current, parentId);
        const position = siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.position)) + 1;
        const node = createNode({
          id: newId(),
          parentId,
          title: title.trim(),
          position,
          color: parentId === null ? color : null,
        });
        mutate((all) => [...all, node]);
        if (parentId === null) setCurrent(node.id);
        return node.id;
      },

      updateNode(id, patch) {
        mutate((all) =>
          all.map((n) =>
            n.id === id ? { ...n, ...patch, title: patch.title !== undefined ? patch.title.trim() : n.title } : n,
          ),
        );
      },

      setProgress: (id, percent) => mutate((all) => setSubtreeProgress(all, id, percent)),
      toggleComplete: (id) => mutate((all) => toggleComplete(all, id)),
      moveSibling: (id, direction) => mutate((all) => moveSibling(all, id, direction)),

      deleteNode(id) {
        const target = nodesRef.current.find((n) => n.id === id);
        if (!target) return;
        const gone = new Set(subtreeIds(nodesRef.current, id));
        mutate((all) => all.filter((n) => !gone.has(n.id)));
        if (target.parentId === null && currentRef.current === id) {
          const next = nodesRef.current.filter((n) => n.parentId === null).sort(byPosition)[0];
          setCurrent(next?.id ?? null);
        }
      },

      setWeights(updates) {
        const byId = new Map(updates.map((u) => [u.id, u.weight]));
        mutate((all) =>
          all.map((n) => (byId.has(n.id) && byId.get(n.id) !== n.weight ? { ...n, weight: byId.get(n.id) ?? null } : n)),
        );
      },

      selectProject: setCurrent,

      setThemeMode(mode) {
        const next = { ...settings, themeMode: mode };
        setSettingsState(next);
        enqueue(() => persistence.saveSettings(next));
      },

      replaceAll(imported) {
        const synced = syncCompletion(imported, Date.now());
        const roots = synced.filter((n) => n.parentId === null).sort(byPosition);
        const current = roots[0]?.id ?? null;
        nodesRef.current = synced;
        setNodesState(synced);
        currentRef.current = current;
        setCurrentState(current);
        enqueue(() => persistence.replaceAll(synced, current));
        void syncReminders(synced);
      },
    }),
    [ready, nodes, currentProjectId, settings, mutate, setCurrent, enqueue],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return ctx;
}
