// Mobile (Android / iOS) : les données sont dans l'espace privé de l'application, rien à demander au système.
// La version web est dans durability.web.ts.

/**
 * - `app-private` : espace privé de l'application (mobile)
 * - `persistent` : le navigateur ne videra pas le stockage de lui-même
 * - `best-effort` : le navigateur peut le vider (manque de place, ou longue absence sur iPhone)
 * - `unsupported` : ce navigateur ne sait pas protéger le stockage
 */
export type Durability = 'app-private' | 'persistent' | 'best-effort' | 'unsupported';

export async function durabilityStatus(): Promise<Durability> {
  return 'app-private';
}

export async function requestPersistence(): Promise<Durability> {
  return 'app-private';
}
