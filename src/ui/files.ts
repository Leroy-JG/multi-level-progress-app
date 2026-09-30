// Version mobile : partage via la feuille de partage du système (enregistrer, envoyer, copier…).
import { Share } from 'react-native';

export const canPickFile = false;

/** Renvoie false si l'utilisateur a fermé la feuille de partage sans rien choisir (la sauvegarde n'a alors pas eu lieu). */
export async function shareText(filename: string, content: string): Promise<boolean> {
  const result = await Share.share({ message: content, title: filename });
  return result.action !== Share.dismissedAction;
}

export async function pickTextFile(): Promise<string | null> {
  return null; // sur mobile, l'import se fait en collant le contenu
}
