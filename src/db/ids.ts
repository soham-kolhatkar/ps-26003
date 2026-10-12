import * as Crypto from 'expo-crypto';

/** UUIDv4 for new rows. Demo seed rows use stable readable ids instead. */
export function newId(): string {
  // Node (tests) exposes Web Crypto globally; on device use expo-crypto.
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return webCrypto?.randomUUID?.() ?? Crypto.randomUUID();
}
