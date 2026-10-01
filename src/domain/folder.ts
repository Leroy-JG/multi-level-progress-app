/** Nom lisible d'un dossier choisi par l'utilisateur. Android : « content://…/tree/primary%3ADocuments%2FAlam » → « Documents/Alam ». */
export function folderLabel(uri: string | null): string {
  if (!uri) return '';
  const tree = /\/tree\/([^/?#]+)/.exec(uri)?.[1] ?? uri.replace(/\/+$/, '').split('/').pop() ?? '';
  let decoded = tree;
  try {
    decoded = decodeURIComponent(tree);
  } catch {
    // adresse mal encodée : on garde le texte brut
  }
  const path = decoded.replace(/^[^:/]+:/, ''); // retire « primary: » ou l'identifiant du volume
  return path === '' ? 'Stockage interne' : path;
}
