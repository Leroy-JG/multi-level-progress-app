import type { Settings } from '../domain/settings';
import type { ProgressNode } from '../domain/types';

export interface LoadedData {
  nodes: ProgressNode[];
  currentProjectId: string | null;
  settings: Settings;
}

export interface Persistence {
  load(): Promise<LoadedData>;
  upsert(nodes: ProgressNode[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
  /** Remplace toutes les données (import). */
  replaceAll(nodes: ProgressNode[], currentProjectId: string | null): Promise<void>;
  saveCurrentProject(id: string | null): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
}
