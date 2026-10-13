import * as Crypto from 'expo-crypto';
import { secureStore } from './secureStore';

/**
 * Staff PINs (caregiver / ASHA / doctor). Only a salted SHA-256 hash is
 * stored, in the OS keystore (services/secureStore). Patients never need a PIN.
 */
type StoredPin = { salt: string; hash: string };

export const PIN_LENGTH = 4;

/** Patient's phone (cloud): the family PIN that guards the family corner. */
export const FAMILY_PIN_ID = 'family';

const keyFor = (userId: string) => `pin.${userId}`;

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function setPin(userId: string, pin: string): Promise<void> {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) throw new Error(`PIN must be ${PIN_LENGTH} digits`);
  const salt = Crypto.randomUUID();
  const stored: StoredPin = { salt, hash: await hashPin(pin, salt) };
  await secureStore.set(keyFor(userId), JSON.stringify(stored));
}

export async function hasPin(userId: string): Promise<boolean> {
  return (await secureStore.get(keyFor(userId))) !== null;
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const raw = await secureStore.get(keyFor(userId));
  if (!raw) return false;
  const stored = JSON.parse(raw) as StoredPin;
  return (await hashPin(pin, stored.salt)) === stored.hash;
}

/** Gives demo users the demo PIN on first launch. Never overwrites a PIN. */
export async function ensurePins(userIds: readonly string[], pin: string): Promise<void> {
  for (const id of userIds) {
    if (!(await hasPin(id))) await setPin(id, pin);
  }
}
