/**
 * Web stand-in for notificationsApi.ts (Chromium testing only). The app's
 * reminders are local phone notifications; in the browser they are no-ops,
 * so staff screens and sync can be tested without a phone.
 */
type Any = any;

export async function cancelScheduledNotificationAsync(_id: string): Promise<void> {}
export async function getAllScheduledNotificationsAsync(): Promise<Any[]> {
  return [];
}
export async function getPermissionsAsync(): Promise<Any> {
  return { granted: false, status: 'denied', canAskAgain: false };
}
export async function requestPermissionsAsync(): Promise<Any> {
  return { granted: false, status: 'denied', canAskAgain: false };
}
export function setNotificationHandler(_handler: Any): void {}
export async function clearLastNotificationResponseAsync(): Promise<void> {}
export const DEFAULT_ACTION_IDENTIFIER = 'expo.modules.notifications.actions.DEFAULT';
export async function scheduleNotificationAsync(_request: Any): Promise<string> {
  return 'web-noop';
}
export async function setNotificationChannelAsync(_id: string, _channel: Any): Promise<null> {
  return null;
}
export function useLastNotificationResponse(): null {
  return null;
}
export {
  AndroidImportance,
  AndroidNotificationVisibility,
} from 'expo-notifications/build/NotificationChannelManager.types';
export {
  AndroidNotificationPriority,
  SchedulableTriggerInputTypes,
} from 'expo-notifications/build/Notifications.types';
