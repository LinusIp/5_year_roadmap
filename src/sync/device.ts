/**
 * Ids for GitHub Sync: this device's id, and ids for day-log entries. Random, short, and never derived from
 * anything personal.
 */

/** A random id: 12 characters of base 36, about 62 bits. */
export function newId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return n.toString(36).padStart(12, '0').slice(-12);
}

let current = newId();

/**
 * This device's id. A fresh one exists from the start so nothing ever waits for it; `adoptDeviceId` replaces it
 * with the stored one when the database opens.
 */
export function deviceId(): string {
  return current;
}

export function adoptDeviceId(id: string): void {
  current = id;
}

/** The time stamps use: ISO with milliseconds, in UTC, so two devices compare as text. */
export function stampNow(now: number = Date.now()): string {
  return new Date(now).toISOString();
}
