import { Alert, Platform } from 'react-native';

/**
 * Yes/no question that works on phones (native dialog) and in the browser
 * (react-native-web's Alert does nothing, and Chromium is our test bed).
 */
export function confirm(title: string, message: string, yes: string, no: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: no, style: 'cancel', onPress: () => resolve(false) },
        { text: yes, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** One-button notice. */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') globalThis.alert?.(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}
