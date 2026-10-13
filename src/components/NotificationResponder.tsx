import * as Notifications from '@/services/notificationsApi';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { getDb } from '@/db/client';
import { occurrenceFor } from '@/db/repos/reminders';
import { dueAtFromPayload, isReminderPayload } from '@/services/notifications';
import { useSession } from '@/store/session';

/**
 * When a reminder notification is tapped (app closed or open), switch to the
 * reminder's patient (patients need no PIN) and open its "time for…" screen.
 */
export function NotificationResponder() {
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const data = response.notification.request.content.data;
    if (!isReminderPayload(data)) return;

    let cancelled = false;
    (async () => {
      const dueAt = dueAtFromPayload(data, response.notification.date);
      const occurrence = await occurrenceFor(getDb(), data.reminderId, dueAt);
      await Notifications.clearLastNotificationResponseAsync();
      if (cancelled || !occurrence) return;
      useSession.getState().signInPatient(occurrence.patientId);
      if (router.canDismiss()) router.dismissAll();
      router.replace('/patient');
      router.push({ pathname: '/patient/reminder/[eventId]', params: { eventId: occurrence.eventId } });
    })().catch((e) => console.warn('Could not open reminder from notification', e));

    return () => {
      cancelled = true;
    };
  }, [response]);

  return null;
}
