import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinDots, PinPad } from '@/components/PinPad';
import { t } from '@/lib/i18n';
import { useJournal } from '@/store/journal';
import { PIN_LENGTH, useLock } from '@/store/lock';
import { colors, radius, spacing, type } from '@/theme';

/**
 * Covers the whole app while locked. Rendered as an overlay rather than a route
 * so no navigation state — or screen content — is reachable behind it.
 */
export function LockScreen() {
  const insets = useSafeAreaInsets();
  const verifyPin = useLock((s) => s.verifyPin);
  const unlock = useLock((s) => s.unlock);
  const supportsBiometrics = useLock((s) => s.supportsBiometrics);
  const authenticateBiometrics = useLock((s) => s.authenticateBiometrics);
  const biometricsEnabled = useJournal((s) => s.settings.biometricsEnabled);

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    void supportsBiometrics().then(setBioAvailable);
  }, [supportsBiometrics]);

  const tryBiometrics = useCallback(async () => {
    if (!biometricsEnabled || !bioAvailable) return;
    if (await authenticateBiometrics()) unlock();
  }, [authenticateBiometrics, bioAvailable, biometricsEnabled, unlock]);

  // Offer Face ID immediately — typing the PIN stays available underneath.
  useEffect(() => {
    if (bioAvailable && biometricsEnabled) void tryBiometrics();
  }, [bioAvailable, biometricsEnabled, tryBiometrics]);

  const submit = useCallback(
    async (candidate: string) => {
      if (await verifyPin(candidate)) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPin('');
        unlock();
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        AccessibilityInfo.announceForAccessibility(t.pin.wrong);
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 550);
      }
    },
    [unlock, verifyPin]
  );

  const onDigit = (digit: string) => {
    if (error || pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) void submit(next);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.head}>
        <View style={styles.mark}>
          <Ionicons name="sparkles" size={26} color={colors.accent} />
        </View>
        <Text style={styles.name}>Lumen</Text>
        <Text style={styles.hint}>
          {error ? t.pin.wrong : t.pin.enter}
        </Text>
        <View style={styles.dotsWrap}>
          <PinDots filled={pin.length} error={error} />
        </View>
      </View>

      <View style={styles.padWrap}>
        <PinPad
          onDigit={onDigit}
          onDelete={() => setPin((p) => p.slice(0, -1))}
          onBiometrics={tryBiometrics}
          showBiometrics={bioAvailable && biometricsEnabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 100,
  },
  head: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxxl },
  mark: {
    width: 62,
    height: 62,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  name: { ...type.display, color: colors.text },
  hint: { ...type.small, color: colors.textMuted, textAlign: 'center' },
  dotsWrap: { marginTop: spacing.xl },
  padWrap: { paddingBottom: spacing.xxl },
});
