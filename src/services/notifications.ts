import * as Notifications from '@/services/notificationsApi';
import { Platform } from 'react-native';

import type { Reminder, ReminderType } from '@/db/models';
import { displayName, getPatient } from '@/db/repos/patients';
import { listEnabledReminders } from '@/db/repos/reminders';
import { listUnseenSos } from '@/db/repos/sos';
import { getSetting } from '@/db/repos/settings';
import type { DbClient } from '@/db/types';
import { atTimeOnDay, parseTime, startOfDay } from '@/engine/reminders';
import i18n, { type LanguageCode } from '@/i18n';
import { formatTime } from '@/services/datetime';

/**
 * Local (on-device) notifications for reminders — no server, works offline
 * and in Expo Go. All scheduled reminder notifications use the `rem-` id
 * prefix so they can be rebuilt from the database at any time.
 */
const CHANNEL_ID = 'reminders';
const ID_PREFIX = 'rem-';
export const SNOOZE_MINUTES = 10;

export const REMINDER_ICON: Record<ReminderType, string> = {
  medicine: '💊',
  hydration: '💧',
  activity: '🚶',
  appointment: '🩺',
};

/** Data attached to every reminder notification. */
export type ReminderPayload = {
  kind: 'reminder';
  reminderId: string;
  /** Exact due time (one-off, snooze, test). */
  dueAt?: number;
  /** "HH:MM" for daily repeats; due time = that time on the day it fired. */
  time?: string;
};

export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Our own high-priority "Reminders" channel. Expo Go cannot create channels
 * (native NotificationsChannelsProvider is null there), so on failure we fall
 * back to the app's default channel; a real build gets the dedicated one.
 */
let channelId: string | undefined;
let channelTried = false;

async function ensureChannel(): Promise<string | undefined> {
  if (Platform.OS !== 'android' || channelTried) return channelId;
  channelTried = true;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    channelId = CHANNEL_ID;
  } catch (e) {
    console.info('Custom notification channel unavailable (expected in Expo Go); using default channel.', e);
    channelId = undefined;
  }
  return channelId;
}

/** Spread into a trigger: adds the channel only when it exists. */
const channel = () => (channelId ? { channelId } : {});

/** Creates the channel and asks for permission if still possible. */
export async function ensureNotificationPermission(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

async function contentFor(db: DbClient, r: Reminder, data: ReminderPayload) {
  const patient = await getPatient(db, r.patientId);
  const name = patient ? displayName(patient) : '';
  return {
    title: `${REMINDER_ICON[r.type]} ${i18n.t(`reminders.prompt.${r.type}.title`)}`,
    body: i18n.t('reminders.notifBody', { name, title: r.title }),
    data,
    sound: true,
    ...(Platform.OS === 'android' ? { priority: Notifications.AndroidNotificationPriority.MAX } : {}),
  };
}

async function cancelReminderNotifications(filter: (id: string) => boolean): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX) && filter(n.identifier))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Rebuilds the device patient's reminder notifications from the database. Idempotent —
 * called at startup, after any reminder change, and on language change.
 * Snoozes and tests (`rem-snooze-*`, `rem-test-*`) are left alone.
 */
export async function syncReminderNotifications(db: DbClient, now = Date.now()): Promise<void> {
  if (!(await ensureNotificationPermission())) return;
  await cancelReminderNotifications(
    (id) => !id.startsWith(`${ID_PREFIX}snooze-`) && !id.startsWith(`${ID_PREFIX}test-`),
  );

  // Only the patient who uses this phone gets alerts here; other patients (e.g. an
  // ASHA worker's list) have their own phones.
  const devicePatientId = await getSetting(db, 'device_patient_id');
  const reminders = (await listEnabledReminders(db)).filter((r) => r.patientId === devicePatientId);
  for (const r of reminders) {
    if (r.schedule.kind === 'daily') {
      for (const time of r.schedule.times) {
        const t = parseTime(time);
        if (!t) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: `${ID_PREFIX}${r.id}-${time.replace(':', '')}`,
          content: await contentFor(db, r, { kind: 'reminder', reminderId: r.id, time }),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: t.hour,
            minute: t.minute,
            ...channel(),
          },
        });
      }
    } else if (r.schedule.at > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${r.id}-once`,
        content: await contentFor(db, r, { kind: 'reminder', reminderId: r.id, dueAt: r.schedule.at }),
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.schedule.at, ...channel() },
      });
    }
  }
  if (__DEV__) {
    const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) =>
      n.identifier.startsWith(ID_PREFIX),
    );
    console.info(
      `Reminder notifications scheduled: ${scheduled.length} (device patient ${devicePatientId}, ${reminders.length} enabled reminders)`,
    );
  }
}

/** "Remind me later": one-off notification for the same occurrence. */
export async function snoozeReminder(db: DbClient, r: Reminder, dueAt: number, minutes = SNOOZE_MINUTES) {
  if (!(await ensureNotificationPermission())) return;
  await Notifications.scheduleNotificationAsync({
    identifier: `${ID_PREFIX}snooze-${r.id}-${dueAt}`,
    content: await contentFor(db, r, { kind: 'reminder', reminderId: r.id, dueAt }),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
      ...channel(),
    },
  });
}

/** Caregiver / demo: fire this reminder in a few seconds. */
export async function sendTestReminder(db: DbClient, r: Reminder, seconds = 10): Promise<boolean> {
  if (!(await ensureNotificationPermission())) return false;
  const dueAt = Date.now() + seconds * 1000;
  await Notifications.scheduleNotificationAsync({
    identifier: `${ID_PREFIX}test-${r.id}-${dueAt}`,
    content: await contentFor(db, r, { kind: 'reminder', reminderId: r.id, dueAt }),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, ...channel() },
  });
  return true;
}

export function isReminderPayload(data: unknown): data is ReminderPayload {
  return !!data && typeof data === 'object' && (data as ReminderPayload).kind === 'reminder';
}

/** Which occurrence a tapped notification refers to. */
export function dueAtFromPayload(payload: ReminderPayload, firedAt: number): number {
  if (payload.dueAt != null) return payload.dueAt;
  const t = payload.time ? parseTime(payload.time) : null;
  return t ? atTimeOnDay(startOfDay(firedAt), t) : firedAt;
}

/**
 * Staff phones (F21, D53): a new SOS press arrived with the last pull. One notification for
 * the newest one, shown now. Best-effort: no permission or no notifications (web) = banner only.
 */
export async function notifySos(db: DbClient, now = Date.now()): Promise<void> {
  try {
    const ids = (await db.getAllAsync<{ id: string }>('SELECT id FROM patient', [])).map((r) => r.id);
    const [latest] = await listUnseenSos(db, ids, now - 2 * 60 * 60 * 1000);
    if (!latest || !(await ensureNotificationPermission())) return;
    const time = formatTime(new Date(latest.createdAt), i18n.language as LanguageCode);
    await Notifications.scheduleNotificationAsync({
      identifier: `sos-${latest.id}`,
      content: {
        title: i18n.t('sos.notifTitle', { name: latest.patientName }),
        body: i18n.t('sos.notifBody', { name: latest.patientName, time }),
        sound: true,
        ...(Platform.OS === 'android' ? { priority: Notifications.AndroidNotificationPriority.MAX } : {}),
      },
      trigger: null,
    });
  } catch (e) {
    console.info('SOS notification not shown', e);
  }
}
