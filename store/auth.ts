import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { ApiError, request, setAuthToken } from '@/lib/api';
import { t } from '@/lib/i18n';

/**
 * Session state.
 *
 * The Sanctum token lives in SecureStore (Keychain / Keystore), never in
 * AsyncStorage — it grants full access to the journal, so it belongs behind the
 * same protection as the PIN.
 */

export const TOKEN_KEY = 'lumen.api.token';
export const USER_KEY = 'lumen.api.user';

export interface AuthUser {
  id: number;
  name: string;
  /** null for a Sign in with Apple account that shared no e-mail */
  email: string | null;
  /** signed in with Apple, so deletion also revokes the link at Apple */
  apple?: boolean;
}

interface Session {
  token: string;
  user: AuthUser;
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
  /** Shows Apple's sheet; false when it failed or the user cancelled it. */
  loginWithApple: () => Promise<boolean>;
  logout: () => Promise<void>;
  /** Deletes the account and all its data on the server — irreversible. Throws on failure. */
  deleteAccount: () => Promise<void>;
  /** stores a fresh session from either sign-in path */
  start: (session: Session) => Promise<void>;
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
      const session = await request<Session>('login', {
        method: 'POST',
        body: { email: email.trim(), password, device: 'mobil' },
      });
      await get().start(session);

      return true;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? // Laravel returns the useful text per field, not in `message`.
            (err.errors?.email?.[0] ?? err.message)
          : t.login.failed;

      set({ busy: false, error: message });

      return false;
    }
  },

  async loginWithApple() {
    set({ error: null });

    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    } catch (err: any) {
      // Closing Apple's sheet is a choice, not an error.
      if (err?.code !== 'ERR_REQUEST_CANCELED') set({ error: t.login.appleFailed });
      return false;
    }

    if (!credential.identityToken) {
      set({ error: t.login.appleFailed });
      return false;
    }

    set({ busy: true });

    try {
      // Apple hands out the name only on the very first sign-in, to the app —
      // the server can't ask for it later.
      const name = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ');

      const session = await request<Session>('auth/apple', {
        method: 'POST',
        body: {
          identityToken: credential.identityToken,
          authorizationCode: credential.authorizationCode,
          name: name || undefined,
          device: 'mobil',
        },
      });
      await get().start(session);

      return true;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? (err.errors?.identityToken?.[0] ?? err.message)
          : t.login.appleFailed;

      set({ busy: false, error: message });

      return false;
    }
  },

  async start(session: Session) {
    await SecureStore.setItemAsync(TOKEN_KEY, session.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));

    setAuthToken(session.token);
    set({ token: session.token, user: session.user, busy: false, error: null });
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

  async deleteAccount() {
    await request('user', { method: 'DELETE' });
    await get().invalidate();
  },

  async invalidate() {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    setAuthToken(null);
    set({ token: null, user: null });
  },
}));
