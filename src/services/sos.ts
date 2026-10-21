import { Alert, Linking } from 'react-native';

import { formatPhone } from '@/cloud/phone';
import { getDb } from '@/db/client';
import { recordSos, type FamilyContact } from '@/db/repos/sos';
import i18n from '@/i18n';
import { syncNow } from '@/sync/run';

/** Opens the phone's dialer with the number filled in (no call permission needed, works in Expo Go). */
export async function dial(phone: string): Promise<boolean> {
  try {
    await Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * The patient pressed SOS and chose who to call: save the press (it reaches the care
 * team's phones as an urgent banner, D53), send it now if online, then open the dialer.
 */
export async function callForHelp(patientId: string, contact: FamilyContact): Promise<void> {
  await recordSos(getDb(), { patientId, calledUserId: contact.userId });
  syncNow().catch(() => {}); // offline: it stays queued and goes with the next sync
  if (!(await dial(contact.phone))) {
    Alert.alert(i18n.t('sos.dialFailed', { phone: formatPhone(contact.phone) }));
  }
}
