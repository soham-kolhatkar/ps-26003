/**
 * The local-notification subset of expo-notifications, imported from its
 * individual modules on purpose.
 *
 * Importing the package root (`expo-notifications`) runs a push-token
 * auto-registration side effect that THROWS in Expo Go on Android since
 * SDK 53 ("Android Push notifications … removed from Expo Go"), which crashes
 * the root layout. We only use local notifications, which work in Expo Go.
 * ESLint forbids importing the package root anywhere else.
 */
export { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
export { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
export { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
export { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
export {
  clearLastNotificationResponseAsync,
  DEFAULT_ACTION_IDENTIFIER,
} from 'expo-notifications/build/NotificationsEmitter';
export { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
export { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
export { useLastNotificationResponse } from 'expo-notifications/build/useLastNotificationResponse';
export {
  AndroidImportance,
  AndroidNotificationVisibility,
} from 'expo-notifications/build/NotificationChannelManager.types';
export {
  AndroidNotificationPriority,
  SchedulableTriggerInputTypes,
} from 'expo-notifications/build/Notifications.types';
