import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

/**
 * PIN lock.
 *
 * The PIN is never stored in clear text: a random salt goes into SecureStore
 * alongside a SHA-256 of `salt + pin`. Verification re-hashes and compares, so
 * reading the keychain does not hand over the code.
 */

const HASH_KEY = 'lumen.pin.hash';
const SALT_KEY = 'lumen.pin.salt';

export const PIN_LENGTH = 4;

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

interface LockState {
  /** true once we know whether a PIN exists */
  ready: boolean;
  hasPin: boolean;
  /** the app is currently covered by the lock screen */
  locked: boolean;
  /** timestamp of the last background transition, for the grace period */
  backgroundedAt: number | null;

  init: () => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  unlock: () => void;
  lock: () => void;
  markBackgrounded: () => void;
  /** locks if the app stayed in background longer than the grace period */
  maybeLockAfterForeground: (graceSeconds: number) => void;

  supportsBiometrics: () => Promise<boolean>;
  authenticateBiometrics: () => Promise<boolean>;
}

export const useLock = create<LockState>((set, get) => ({
  ready: false,
  hasPin: false,
  locked: false,
  backgroundedAt: null,

  async init() {
    const hash = await SecureStore.getItemAsync(HASH_KEY);
    set({ ready: true, hasPin: Boolean(hash), locked: Boolean(hash) });
  },

  async setPin(pin) {
    const salt = Crypto.randomUUID();
    const hash = await hashPin(pin, salt);
    await SecureStore.setItemAsync(SALT_KEY, salt);
    await SecureStore.setItemAsync(HASH_KEY, hash);
    set({ hasPin: true, locked: false });
  },

  async removePin() {
    await SecureStore.deleteItemAsync(HASH_KEY);
    await SecureStore.deleteItemAsync(SALT_KEY);
    set({ hasPin: false, locked: false });
  },

  async verifyPin(pin) {
    const [hash, salt] = await Promise.all([
      SecureStore.getItemAsync(HASH_KEY),
      SecureStore.getItemAsync(SALT_KEY),
    ]);
    if (!hash || !salt) return false;
    return (await hashPin(pin, salt)) === hash;
  },

  unlock() {
    set({ locked: false, backgroundedAt: null });
  },

  lock() {
    if (get().hasPin) set({ locked: true });
  },

  markBackgrounded() {
    set({ backgroundedAt: Date.now() });
  },

  maybeLockAfterForeground(graceSeconds) {
    const { backgroundedAt, hasPin, locked } = get();
    if (!hasPin || locked || backgroundedAt === null) return;
    if (Date.now() - backgroundedAt >= graceSeconds * 1000) set({ locked: true });
    set({ backgroundedAt: null });
  },

  async supportsBiometrics() {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hardware && enrolled;
  },

  async authenticateBiometrics() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Odomkni Lumen',
      fallbackLabel: 'Zadať PIN',
      cancelLabel: 'Zrušiť',
    });
    return result.success;
  },
}));
