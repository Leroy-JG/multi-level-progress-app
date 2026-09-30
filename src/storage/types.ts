import type { Settings } from '../domain/settings';
import type { ProgressNode } from '../domain/types';

export interface LoadedData {
  nodes: ProgressNode[];
  currentProjectId: string | null;
  settings: Settings;
}

/** Origine d'une copie : automatique (période), manuelle, ou faite juste avant une restauration. */
export type BackupKind = 'auto' | 'manual' | 'before-restore';

/** Une copie de l'historique, sans son contenu (léger : la liste n'a pas besoin des données). */
export interface BackupMeta {
  id: string;
  createdAt: number;
  kind: BackupKind;
  projects: number;
  elements: number;
  /** Taille du contenu (caractères ≈ octets). */
  bytes: number;
  /** Empreinte du contenu, pour ne pas empiler deux copies identiques. */
  hash: string;
}

/** Historique des copies, gardé sur l'appareil (même espace privé que les données). */
export interface BackupBackend {
  /** Du plus récent au plus ancien. */
  listBackups(): Promise<BackupMeta[]>;
  readBackup(id: string): Promise<string | null>;
  /** Ajoute une copie sans toucher aux précédentes, puis supprime les plus anciennes au-delà de `keep`. */
  addBackup(meta: BackupMeta, payload: string, keep: number): Promise<void>;
  deleteBackup(id: string): Promise<void>;
}

export interface Persistence extends BackupBackend {
  load(): Promise<LoadedData>;
  upsert(nodes: ProgressNode[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
  /** Remplace toutes les données (import). */
  replaceAll(nodes: ProgressNode[], currentProjectId: string | null): Promise<void>;
  saveCurrentProject(id: string | null): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;
  /** Efface tout (projets, réglages, copies) de l'appareil, sans laisser de trace récupérable dans le fichier de la base. */
  eraseAll(): Promise<void>;
}
