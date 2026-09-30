// Web / PWA : les données ne sont qu'ici. Par défaut le navigateur peut les vider (manque de place, ou après
// ~7 jours sans visite sur iPhone hors application installée) : on demande le stockage « persistant ».
import type { Durability } from './durability';

export type { Durability };

export async function durabilityStatus(): Promise<Durability> {
  const storage = globalThis.navigator?.storage;
  if (!storage?.persisted) return 'unsupported';
  try {
    return (await storage.persisted()) ? 'persistent' : 'best-effort';
  } catch {
    return 'unsupported';
  }
}

/** À appeler depuis un geste de l'utilisateur (certains navigateurs affichent alors une demande d'autorisation). */
export async function requestPersistence(): Promise<Durability> {
  const storage = globalThis.navigator?.storage;
  if (!storage?.persist) return 'unsupported';
  try {
    await storage.persist();
  } catch {
    // refusé ou indisponible : le statut ci-dessous le reflète
  }
  return durabilityStatus();
}
