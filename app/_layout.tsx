import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LockScreen } from '@/components/LockScreen';
import { LoginScreen } from '@/components/LoginScreen';
import { StreakCelebration } from '@/components/StreakCelebration';
import { Loading } from '@/components/ui';
import { isDemo, seedDemo, useDemoRoute } from '@/lib/demo';
import { forgetPreviousInstall } from '@/lib/install';
import { useAuth } from '@/store/auth';
import { useJournal } from '@/store/journal';
import { useLock } from '@/store/lock';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});

export default function RootLayout() {
  const hydrate = useJournal((s) => s.hydrate);
  const hydrated = useJournal((s) => s.hydrated);
  const lockAfterSeconds = useJournal((s) => s.settings.lockAfterSeconds);

  const initLock = useLock((s) => s.init);
  const lockReady = useLock((s) => s.ready);
  const locked = useLock((s) => s.locked);

  const restoreSession = useAuth((s) => s.restore);
  const authReady = useAuth((s) => s.ready);
  const token = useAuth((s) => s.token);
  const sync = useJournal((s) => s.sync);

  const appState = useRef<AppStateStatus>(AppState.currentState);

  // iOS snapshots the screen for the app switcher as soon as the app goes
  // inactive — before the lock screen would come back. With a PIN set, the
  // journal must not show up there.
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    // Before anything reads the Keychain: a reinstall starts clean.
    void forgetPreviousInstall().then(() => {
      void initLock();
      if (isDemo) {
        // Screenshot build: a made-up journal and session, never synced.
        void seedDemo().then(hydrate);
        return;
      }
      void hydrate();
      void restoreSession();
    });
  }, [hydrate, initLock, restoreSession]);

  // Catch up with the server once the session and the local store are both up.
  useEffect(() => {
    if (token && hydrated && !isDemo) void sync();
  }, [token, hydrated, sync]);

  useEffect(() => {
    if (hydrated && lockReady) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated, lockReady]);

  // Re-lock after the app has been away long enough.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      const previous = appState.current;
      appState.current = next;

      if (next.match(/inactive|background/)) {
        if (useLock.getState().hasPin) setCovered(true);
        useLock.getState().markBackgrounded();
      } else if (previous.match(/inactive|background/) && next === 'active') {
        setCovered(false);
        useLock.getState().maybeLockAfterForeground(lockAfterSeconds);
        // Coming back is the moment another device's changes are most likely
        // to be waiting.
        if (!isDemo) void useJournal.getState().sync();
      }
    });
    return () => subscription.remove();
  }, [lockAfterSeconds]);

  const ready = hydrated && lockReady && authReady;
  useDemoRoute(ready);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.root}>
          {ready ? (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="entry/[id]" />
              <Stack.Screen
                name="entry/edit"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="entry/template-picker"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="entry/location-picker"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="viewer" options={{ animation: 'fade' }} />
              <Stack.Screen name="templates/index" />
              <Stack.Screen name="templates/[id]" />
              <Stack.Screen name="settings/pin" options={{ presentation: 'modal' }} />
            </Stack>
          ) : (
            <Loading />
          )}

          {ready ? <StreakCelebration /> : null}

          {/* Login sits under the lock: a stolen phone must not reach the
              sign-in form's stored email either. */}
          {ready && !token ? <LoginScreen /> : null}
          {ready && locked ? <LockScreen /> : null}
          {covered ? (
            <View style={styles.cover}>
              <Ionicons name="sparkles" size={34} color={colors.accent} />
            </View>
          ) : null}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
