import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { ApiError, request, setAuthToken } from '@/lib/api';

/**
 * Session state.
 *
 * The Sanctum token lives in SecureStore (Keychain / Keystore), never in
 * AsyncStorage — it grants full access to the journal, so it belongs behind the
 * same protection as the PIN.
 */

const TOKEN_KEY = 'lumen.api.token';
const USER_KEY = 'lumen.api.user';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  /** true once we know whether a stored session exists */
  ready: boolean;
  token: string | null;
  user: AuthUser | null;
  /** message from the last failed login, for the form to show */
  error: string | null;
  busy: boolean;

  restore: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  /** called when the API rejects the token — drops the session without a round trip */
  invalidate: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  token: null,
  user: null,
  error: null,
  busy: false,

  async restore() {
    try {
      const [token, rawUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);

      setAuthToken(token);
      set({
        token,
        user: rawUser ? (JSON.parse(rawUser) as AuthUser) : null,
        ready: true,
      });
    } catch (err) {
      console.warn('[lumen] could not restore session', err);
      set({ ready: true });
    }
  },

  async login(email, password) {
    set({ busy: true, error: null });

    try {
      const result = await request<{ token: string; user: AuthUser }>('login', {
        method: 'POST',
        body: { email: email.trim(), password, device: 'mobil' },
      });

      await SecureStore.setItemAsync(TOKEN_KEY, result.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.user));

      setAuthToken(result.token);
      set({ token: result.token, user: result.user, busy: false, error: null });

      return true;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? // Laravel returns the useful text per field, not in `message`.
            (err.errors?.email?.[0] ?? err.message)
          : 'Prihlásenie zlyhalo.';

      set({ busy: false, error: message });

      return false;
    }
  },

  async logout() {
    // Best effort — a revoked or offline token still has to clear locally,
    // otherwise the app would be stuck logged in with a dead session.
    try {
      if (get().token) await request('logout', { method: 'POST' });
    } catch {
      // ignored on purpose
    }

    await get().invalidate();
  },

  async invalidate() {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    setAuthToken(null);
    set({ token: null, user: null });
  },
}));
