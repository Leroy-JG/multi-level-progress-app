// Version web / PWA : fichier .json téléchargé ou enregistré, et sélecteur de fichier.
// Le navigateur décide du dossier (Téléchargements en général). Sur les navigateurs de bureau qui le permettent
// (Chrome, Edge), l'enregistrement et l'import partagent le même identifiant de sélecteur : le navigateur
// rouvre l'import dans le dernier dossier utilisé pour l'export.
export const canChooseFolder = false;

export interface SaveResult {
  saved: boolean;
  folder: string | null;
}

const PICKER_ID = 'alam-sauvegardes';
const JSON_TYPES = [{ description: 'Sauvegarde Alam', accept: { 'application/json': ['.json'] } }];

interface PickerWindow {
  showSaveFilePicker?: (options: object) => Promise<{ createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }> }>;
  showOpenFilePicker?: (options: object) => Promise<{ getFile(): Promise<File> }[]>;
}

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

function download(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveExport(filename: string, content: string, folder: string | null): Promise<SaveResult> {
  const picker = (window as unknown as PickerWindow).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker.call(window, { id: PICKER_ID, suggestedName: filename, types: JSON_TYPES });
      const writable = await handle.createWritable();
      await writable.write(new Blob([content], { type: 'application/json' }));
      await writable.close();
      return { saved: true, folder };
    } catch (e) {
      if (isAbort(e)) return { saved: false, folder };
      // sélecteur indisponible dans ce contexte : repli sur le téléchargement
    }
  }
  download(filename, content);
  return { saved: true, folder };
}

export async function chooseFolder(): Promise<string | null> {
  return null;
}

export async function pickBackupFile(_folder: string | null): Promise<string | null> {
  const picker = (window as unknown as PickerWindow).showOpenFilePicker;
  if (picker) {
    try {
      const [handle] = await picker.call(window, { id: PICKER_ID, types: JSON_TYPES });
      return handle ? await (await handle.getFile()).text() : null;
    } catch (e) {
      if (isAbort(e)) return null;
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? await file.text() : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
