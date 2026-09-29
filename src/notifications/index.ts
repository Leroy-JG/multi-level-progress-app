// Rappels : notifications locales programmées sur l'appareil (Android / iOS natif).
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { ProgressNode } from '../domain/types';
import { t } from '../i18n';

export const remindersSupported = true;

const CHANNEL_ID = 'reminders';
let configured = false;

async function configure(): Promise<void> {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: t('notif.channel'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function cancelReminder(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // rien de programmé sous cet identifiant
  }
}

/** Programme (ou reprogramme) le rappel d'un élément ; l'annule s'il n'y en a plus, s'il est passé ou si l'élément est terminé. */
export async function scheduleReminder(node: ProgressNode): Promise<void> {
  try {
    await configure();
    await cancelReminder(node.id);
    if (node.reminderAt === null || node.completedAt !== null || node.reminderAt <= Date.now()) return;
    if (!(await ensurePermission())) return;
    await Notifications.scheduleNotificationAsync({
      identifier: node.id,
      content: { title: node.title, body: t('notif.body') },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(node.reminderAt),
        channelId: CHANNEL_ID,
      },
    });
  } catch (e) {
    console.warn('Rappel non programmé', e);
  }
}

/** Reprogramme tous les rappels à venir (démarrage, import) et annule ceux qui n'existent plus. */
export async function syncReminders(nodes: readonly ProgressNode[]): Promise<void> {
  try {
    await configure();
    const wanted = new Set(nodes.filter((n) => n.reminderAt !== null && n.completedAt === null).map((n) => n.id));
    for (const scheduled of await Notifications.getAllScheduledNotificationsAsync()) {
      if (!wanted.has(scheduled.identifier)) await cancelReminder(scheduled.identifier);
    }
    for (const node of nodes) if (wanted.has(node.id)) await scheduleReminder(node);
  } catch (e) {
    console.warn('Synchronisation des rappels échouée', e);
  }
}
