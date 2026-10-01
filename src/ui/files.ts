// Version mobile : les sauvegardes sont de vrais fichiers .json, écrits dans un dossier que l'utilisateur choisit
// une fois (système de fichiers du téléphone, accès par le sélecteur Android). Le sélecteur d'import s'ouvre
// dans ce même dossier. Android interdit aux sélecteurs de parcourir le stockage privé d'une application,
// d'où un dossier visible choisi par l'utilisateur plutôt qu'un dossier caché dans l'application.
import { Directory, File } from 'expo-file-system';

export const canChooseFolder = true;

export interface SaveResult {
  /** false si l'utilisateur a refusé de choisir un dossier (la sauvegarde n'a alors pas eu lieu). */
  saved: boolean;
  /** Dossier utilisé (à mémoriser), ou celui reçu en entrée si rien n'a été enregistré. */
  folder: string | null;
}

function usableFolder(uri: string | null): Directory | null {
  if (!uri) return null;
  try {
    const dir = new Directory(uri);
    return dir.exists ? dir : null; // dossier supprimé ou accès retiré : on en redemande un
  } catch {
    return null;
  }
}

/** Ouvre le sélecteur de dossier système ; null si l'utilisateur annule. */
export async function chooseFolder(startAt?: string | null): Promise<string | null> {
  try {
    return (await Directory.pickDirectoryAsync(startAt ?? undefined)).uri;
  } catch {
    return null;
  }
}

function writeTo(dir: Directory, filename: string, content: string): void {
  dir.createFile(filename, 'application/json').write(content);
}

/** Écrit la sauvegarde dans le dossier mémorisé ; en demande un si aucun n'est utilisable. */
export async function saveExport(filename: string, content: string, folder: string | null): Promise<SaveResult> {
  const known = usableFolder(folder);
  if (known) {
    try {
      writeTo(known, filename, content);
      return { saved: true, folder: known.uri };
    } catch {
      // accès retiré entre-temps : on redemande un dossier ci-dessous
    }
  }
  const uri = await chooseFolder(folder);
  if (!uri) return { saved: false, folder };
  writeTo(new Directory(uri), filename, content);
  return { saved: true, folder: uri };
}

/** Ouvre le sélecteur de fichiers dans le dossier des sauvegardes ; renvoie le contenu, ou null si annulé. */
export async function pickBackupFile(folder: string | null): Promise<string | null> {
  const result = await File.pickFileAsync({ initialUri: folder ?? undefined });
  return result.canceled ? null : await result.result.text();
}
