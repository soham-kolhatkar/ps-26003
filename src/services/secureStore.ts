import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { kv } from './kv';

/**
 * OS keystore on phones; plain browser storage on web (Chromium testing only,
 * never a production target).
 */
export const secureStore = {
  async get(key: string): Promise<string | null> {
    return Platform.OS === 'web' ? kv.get(`secure.${key}`) : SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') kv.set(`secure.${key}`, value);
    else await SecureStore.setItemAsync(key, value);
  },
};
