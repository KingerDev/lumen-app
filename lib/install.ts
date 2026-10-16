import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { TOKEN_KEY, USER_KEY } from '@/store/auth';
import { HASH_KEY, SALT_KEY } from '@/store/lock';

/**
 * The iOS Keychain outlives the app: delete Lumen, install it again, and the
 * old PIN and session are still there. Someone who forgot their PIN could
 * never get back in — reinstalling is exactly what they would try.
 *
 * AsyncStorage *is* wiped on uninstall, so a missing marker there means a
 * fresh install, and anything left in the Keychain belongs to a previous one.
 */

const MARKER = 'lumen/installed';

export async function forgetPreviousInstall(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(MARKER)) return;

    // Installs from before this marker existed already have local data —
    // an update, not a reinstall; their PIN and session stay.
    const existing = (await AsyncStorage.getAllKeys()).some((key) => key.startsWith('lumen/'));

    if (!existing) {
      await Promise.all(
        [HASH_KEY, SALT_KEY, TOKEN_KEY, USER_KEY].map((key) =>
          SecureStore.deleteItemAsync(key).catch(() => {})
        )
      );
    }

    await AsyncStorage.setItem(MARKER, '1');
  } catch (err) {
    console.warn('[lumen] install check failed', err);
  }
}
