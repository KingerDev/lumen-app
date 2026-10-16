import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinDots, PinPad } from '@/components/PinPad';
import { IconButton, useModalTopInset } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useJournal } from '@/store/journal';
import { PIN_LENGTH, useLock } from '@/store/lock';
import { colors, spacing, type } from '@/theme';

/** Two-step PIN setup: enter, then confirm. */
export default function PinSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useModalTopInset();
  const setPin = useLock((s) => s.setPin);
  const updateSettings = useJournal((s) => s.updateSettings);

  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [first, setFirst] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const onDigit = (digit: string) => {
    if (error || value.length >= PIN_LENGTH) return;
    const next = value + digit;
    setValue(next);
    if (next.length < PIN_LENGTH) return;

    if (stage === 'enter') {
      setFirst(next);
      setStage('confirm');
      AccessibilityInfo.announceForAccessibility(t.pin.repeatHint);
      setValue('');
      return;
    }

    if (next === first) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void setPin(next).then(() => {
        updateSettings({ pinEnabled: true });
        router.back();
      });
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      AccessibilityInfo.announceForAccessibility(t.pin.mismatch);
      setError(true);
      setTimeout(() => {
        setError(false);
        setValue('');
        setFirst('');
        setStage('enter');
      }, 600);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: topInset, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <IconButton name="close" onPress={() => router.back()} accessibilityLabel={t.common.close} />
      </View>

      <View style={styles.head}>
        <Text style={styles.title}>
          {stage === 'enter' ? t.pin.choose : t.pin.repeat}
        </Text>
        <Text style={styles.hint}>
          {error
            ? t.pin.mismatch
            : stage === 'enter'
              ? t.pin.chooseHint(PIN_LENGTH)
              : t.pin.repeatHint}
        </Text>
        <View style={styles.dots}>
          <PinDots filled={value.length} error={error} />
        </View>
      </View>

      <View style={styles.padWrap}>
        <PinPad onDigit={onDigit} onDelete={() => setValue((v) => v.slice(0, -1))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: { alignSelf: 'stretch', paddingHorizontal: spacing.lg },
  head: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  title: { ...type.title, color: colors.text },
  hint: { ...type.small, color: colors.textMuted, textAlign: 'center' },
  dots: { marginTop: spacing.xl },
  padWrap: { paddingBottom: spacing.xxl },
});
