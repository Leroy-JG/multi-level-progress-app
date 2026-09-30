// Implémentation web / PWA (localStorage). Les données restent sur l'appareil.
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from '../domain/settings';
import { normalizeStoredNode, type ProgressNode } from '../domain/types';
import type { Persistence } from './types';

const KEY = 'w:data:v2';
const LEGACY_KEY = 'mlp:data:v1';

interface Data {
  nodes: ProgressNode[];
  currentProjectId: string | null;
  settings: Settings;
}

function parse(raw: string | null | undefined): Data | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as { nodes?: Record<string, unknown>[]; currentProjectId?: string | null; settings?: unknown };
    return {
      nodes: (obj.nodes ?? []).map(normalizeStoredNode),
      currentProjectId: obj.currentProjectId ?? null,
      settings: normalizeSettings(obj.settings),
    };
  } catch {
    return null; // données illisibles
  }
}

function read(): Data {
  const storage = globalThis.localStorage;
  return (
    parse(storage?.getItem(KEY)) ??
    parse(storage?.getItem(LEGACY_KEY)) ?? { nodes: [], currentProjectId: null, settings: DEFAULT_SETTINGS }
  );
}

function write(data: Data): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Stockage indisponible', e);
  }
}

export const persistence: Persistence = {
  async load() {
    return read();
  },
  async upsert(nodes) {
    const data = read();
    const byId = new Map(data.nodes.map((n) => [n.id, n]));
    for (const n of nodes) byId.set(n.id, n);
    write({ ...data, nodes: [...byId.values()] });
  },
  async remove(ids) {
    const data = read();
    const gone = new Set(ids);
    write({ ...data, nodes: data.nodes.filter((n) => !gone.has(n.id)) });
  },
  async replaceAll(nodes, currentProjectId) {
    write({ ...read(), nodes, currentProjectId });
  },
  async saveCurrentProject(id) {
    write({ ...read(), currentProjectId: id });
  },
  async saveSettings(settings) {
    write({ ...read(), settings });
  },
  async eraseAll() {
    // Les deux clés : l'ancienne (v1) ne doit pas survivre à un effacement.
    for (const key of [KEY, LEGACY_KEY]) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch (e) {
        console.warn('Stockage indisponible', e);
      }
    }
  },
};
