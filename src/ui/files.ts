// Version mobile : partage via la feuille de partage du système (enregistrer, envoyer, copier…).
import { Share } from 'react-native';

export const canPickFile = false;

export async function shareText(filename: string, content: string): Promise<void> {
  await Share.share({ message: content, title: filename });
}

export async function pickTextFile(): Promise<string | null> {
  return null; // sur mobile, l'import se fait en collant le contenu
}
