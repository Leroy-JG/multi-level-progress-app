import { useCallback } from 'react';
import { useStore } from '../store/store';
import { saveExport } from './files';

/** Écrit une sauvegarde dans un fichier (dossier mémorisé) ; renvoie false si l'utilisateur a annulé. */
export function useExportFile() {
  const { settings, setExportFolder } = useStore();
  return useCallback(
    async (filename: string, content: string): Promise<boolean> => {
      const result = await saveExport(filename, content, settings.exportFolder);
      if (result.folder !== settings.exportFolder) setExportFolder(result.folder);
      return result.saved;
    },
    [settings.exportFolder, setExportFolder],
  );
}
