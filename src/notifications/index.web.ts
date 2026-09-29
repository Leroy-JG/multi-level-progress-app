// Web / PWA : un site ne peut pas programmer de notification locale hors connexion de façon fiable
// (surtout sur iPhone). Les rappels restent enregistrés et visibles, mais ne sonnent que sur l'app Android.
import type { ProgressNode } from '../domain/types';

export const remindersSupported = false;

export async function cancelReminder(_id: string): Promise<void> {}
export async function scheduleReminder(_node: ProgressNode): Promise<void> {}
export async function syncReminders(_nodes: readonly ProgressNode[]): Promise<void> {}
