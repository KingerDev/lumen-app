import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinDots, PinPad } from '@/components/PinPad';
import { IconButton, useModalTopInset } from '@/components/ui';
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
        <IconButton name="close" onPress={() => router.back()} accessibilityLabel="Zavrieť" />
      </View>

      <View style={styles.head}>
        <Text style={styles.title}>
          {stage === 'enter' ? 'Zvoľ si PIN' : 'Zopakuj PIN'}
        </Text>
        <Text style={styles.hint}>
          {error
            ? 'PIN kódy sa nezhodujú, skús to znova'
            : stage === 'enter'
              ? `${PIN_LENGTH} číslice, ktorými odomkneš denník`
              : 'Zadaj ten istý kód ešte raz'}
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
