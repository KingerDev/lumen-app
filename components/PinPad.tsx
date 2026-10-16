import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/lib/i18n';
import { PIN_LENGTH } from '@/store/lock';
import { colors, radius, spacing, type } from '@/theme';

/** Numeric keypad + filled/empty dots. Shared by the lock screen and PIN setup. */

export function PinDots({ filled, error }: { filled: number; error?: boolean }) {
  return (
    <View
      style={styles.dots}
      accessible
      accessibilityLabel={t.pin.dotsA11y(filled, PIN_LENGTH)}
    >
      {Array.from({ length: PIN_LENGTH }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index < filled && styles.dotFilled,
            error && styles.dotError,
          ]}
        />
      ))}
    </View>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'] as const;

export function PinPad({
  onDigit,
  onDelete,
  onBiometrics,
  showBiometrics,
}: {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onBiometrics?: () => void;
  showBiometrics?: boolean;
}) {
  const press = (key: (typeof KEYS)[number]) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'del') onDelete();
    else if (key === 'bio') onBiometrics?.();
    else onDigit(key);
  };

  return (
    <View style={styles.pad}>
      {KEYS.map((key) => {
        const isBio = key === 'bio';
        if (isBio && !showBiometrics) return <View key={key} style={styles.key} />;

        return (
          <Pressable
            key={key}
            onPress={() => press(key)}
            accessibilityRole="button"
            accessibilityLabel={isBio ? t.pin.biometrics : key === 'del' ? t.pin.deleteDigit : key}
            style={({ pressed }) => [
              styles.key,
              !isBio && key !== 'del' && styles.keyFilled,
              pressed && styles.keyPressed,
            ]}
          >
            {key === 'del' ? (
              <Ionicons name="backspace-outline" size={24} color={colors.textMuted} />
            ) : isBio ? (
              <Ionicons name="finger-print-outline" size={26} color={colors.accent} />
            ) : (
              <Text style={styles.keyLabel}>{key}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const KEY_SIZE = 74;

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
  dot: {
    width: 13,
    height: 13,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  dotFilled: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotError: { borderColor: colors.danger, backgroundColor: 'transparent' },

  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.lg,
    maxWidth: KEY_SIZE * 3 + spacing.lg * 2 + 2,
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyFilled: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  keyPressed: { backgroundColor: colors.surfacePressed, opacity: 0.8 },
  keyLabel: { ...type.title, fontSize: 26, color: colors.text, fontWeight: '500' },
});
