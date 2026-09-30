import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { isBackupDue, normalizeAutoBackup, type AutoBackupSettings } from '../domain/autobackup';
import { DEFAULT_SETTINGS, type Settings, type ThemeMode } from '../domain/settings';
import { moveSibling, setSubtreeProgress, syncCompletion, toggleComplete } from '../domain/mutations';
import { childrenOf, subtreeIds } from '../domain/tree';
import { createNode, type NodeId, type ProgressNode } from '../domain/types';
import { cancelReminder, scheduleReminder, syncReminders } from '../notifications';
import { persistence } from '../storage/persistence';
import type { BackupKind, BackupMeta } from '../storage/types';
import { prepareRestore, takeSnapshot, type SnapshotResult } from './snapshots';

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
  /** Note qu'une sauvegarde vient d'être exportée (date affichée dans les réglages). */
  markBackedUp(at: number): void;
  /** Remplace toutes les données (import). */
  replaceAll(nodes: ProgressNode[]): void;
  /** Efface définitivement projets, réglages et copies de l'appareil (aucune copie n'existe ailleurs). */
  eraseAll(): void;

  /** Historique des copies gardées sur l'appareil, de la plus récente à la plus ancienne. */
  backups: BackupMeta[];
  /** Change les réglages des copies automatiques ; en les activant, une première copie est faite aussitôt. */
  setAutoBackup(patch: Partial<Pick<AutoBackupSettings, 'enabled' | 'every' | 'unit' | 'keep'>>): void;
  /** Ajoute une copie à l'historique maintenant. */
  backupNow(): Promise<SnapshotOutcome>;
  /** Remplace les données par celles d'une copie (l'état actuel est d'abord gardé dans l'historique). */
  restoreBackup(id: string): Promise<boolean>;
  deleteBackup(id: string): Promise<void>;
  /** Contenu (JSON) d'une copie, pour l'exporter dans un fichier. */
  readBackup(id: string): Promise<string | null>;
  /** La proposition d'activer les copies automatiques doit être affichée (création du tout premier projet). */
  backupPromptOpen: boolean;
  dismissBackupPrompt(): void;
}

export type SnapshotOutcome = SnapshotResult | { status: 'failed' };

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
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [backupPromptOpen, setBackupPromptOpen] = useState(false);
  const nodesRef = useRef<ProgressNode[]>([]);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
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

  /** Point d'entrée unique des réglages : la référence reste à jour pour les traitements asynchrones. */
  const updateSettings = useCallback(
    (fn: (current: Settings) => Settings) => {
      const next = fn(settingsRef.current);
      settingsRef.current = next;
      setSettingsState(next);
      enqueue(() => persistence.saveSettings(next));
    },
    [enqueue],
  );

  const refreshBackups = useCallback(async () => {
    try {
      setBackups(await persistence.listBackups());
    } catch (e) {
      console.warn('Historique des copies illisible', e);
    }
  }, []);

  /**
   * Fait une copie, dans la file des écritures (elle voit donc les données à jour). Une copie automatique vérifie
   * à nouveau qu'elle est due : plusieurs déclencheurs proches (ouverture, retour au premier plan) n'en font qu'une.
   * Le délai repart à chaque copie automatique réussie ou inutile (contenu inchangé), jamais quand il n'y a rien à copier.
   */
  const runSnapshot = useCallback(
    (kind: BackupKind): Promise<SnapshotOutcome | null> =>
      new Promise((resolve) => {
        enqueue(async () => {
          try {
            const now = Date.now();
            const config = settingsRef.current.autoBackup;
            if (kind === 'auto' && !isBackupDue(config, now)) return resolve(null);
            const result = await takeSnapshot(persistence, nodesRef.current, kind, now, config.keep);
            const restartsTimer =
              (kind === 'auto' && result.status !== 'empty') || (kind === 'manual' && result.status === 'created');
            if (restartsTimer) updateSettings((s) => ({ ...s, autoBackup: { ...s.autoBackup, lastRunAt: now } }));
            if (result.status === 'created') await refreshBackups();
            resolve(result);
          } catch (e) {
            console.warn('Copie impossible', e);
            resolve({ status: 'failed' });
          }
        });
      }),
    [enqueue, updateSettings, refreshBackups],
  );

  /** Remplace toutes les données (import, restauration d'une copie). */
  const replaceAllNodes = useCallback(
    (imported: ProgressNode[]) => {
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
    [enqueue],
  );

  // Copie automatique : à l'ouverture, puis à chaque retour au premier plan (l'application n'a pas de tâche de fond).
  useEffect(() => {
    if (!ready) return;
    const check = () => {
      if (isBackupDue(settingsRef.current.autoBackup, Date.now())) void runSnapshot('auto');
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => subscription.remove();
  }, [ready, runSnapshot]);

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
        settingsRef.current = data.settings;
        setSettingsState(data.settings);
        setReady(true);
        void syncReminders(data.nodes);
        void refreshBackups();
      })
      .catch((e) => {
        console.warn('Chargement échoué', e);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshBackups]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      nodes,
      currentProjectId,
      settings,

      addNode(parentId, title, color = null) {
        const isFirstProject = parentId === null && !nodesRef.current.some((n) => n.parentId === null);
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
        // Tout premier projet : on propose une seule fois de configurer les copies automatiques.
        if (isFirstProject && !settingsRef.current.backupPromptSeen && !settingsRef.current.autoBackup.enabled) {
          updateSettings((s) => ({ ...s, backupPromptSeen: true }));
          setBackupPromptOpen(true);
        }
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

      setThemeMode: (mode) => updateSettings((s) => ({ ...s, themeMode: mode })),
      markBackedUp: (at) => updateSettings((s) => ({ ...s, lastBackupAt: at })),

      replaceAll: replaceAllNodes,

      eraseAll() {
        nodesRef.current = [];
        setNodesState([]);
        currentRef.current = null;
        setCurrentState(null);
        settingsRef.current = DEFAULT_SETTINGS;
        setSettingsState(DEFAULT_SETTINGS);
        setBackups([]);
        setBackupPromptOpen(false);
        enqueue(() => persistence.eraseAll()); // projets, réglages ET copies
        void syncReminders([]); // annule tous les rappels programmés
      },

      backups,

      setAutoBackup(patch) {
        const before = settingsRef.current.autoBackup;
        const after = normalizeAutoBackup({ ...before, ...patch });
        updateSettings((s) => ({ ...s, autoBackup: after }));
        // En l'activant : une première copie tout de suite, pour voir l'historique se remplir.
        if (after.enabled && !before.enabled) void runSnapshot('auto');
      },

      async backupNow() {
        return (await runSnapshot('manual')) ?? { status: 'failed' };
      },

      restoreBackup: (id) =>
        new Promise<boolean>((resolve) => {
          enqueue(async () => {
            try {
              const restored = await prepareRestore(persistence, id, nodesRef.current, Date.now(), settingsRef.current.autoBackup.keep);
              if (restored) replaceAllNodes(restored);
              await refreshBackups();
              resolve(restored !== null);
            } catch (e) {
              console.warn('Restauration impossible', e);
              resolve(false);
            }
          });
        }),

      deleteBackup: (id) =>
        new Promise<void>((resolve) => {
          enqueue(async () => {
            try {
              await persistence.deleteBackup(id);
              await refreshBackups();
            } finally {
              resolve();
            }
          });
        }),

      readBackup: (id) => persistence.readBackup(id).catch(() => null),

      backupPromptOpen,
      dismissBackupPrompt: () => setBackupPromptOpen(false),
    }),
    [
      ready,
      nodes,
      currentProjectId,
      settings,
      backups,
      backupPromptOpen,
      mutate,
      setCurrent,
      enqueue,
      updateSettings,
      runSnapshot,
      replaceAllNodes,
      refreshBackups,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return ctx;
}
