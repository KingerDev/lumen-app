import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, type } from '@/theme';

/** Primitives shared across screens. Screen-specific styling stays in the screen. */

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  full?: boolean;
}

export const Button = forwardRef<View, ButtonProps>(function Button(
  { label, icon, variant = 'primary', loading, full, disabled, ...rest },
  ref
) {
  const tint =
    variant === 'primary' ? colors.accentText : variant === 'danger' ? colors.danger : colors.text;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      disabled={disabled || loading}
      {...rest}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        full && styles.buttonFull,
        pressed && styles.buttonPressed,
        (disabled || loading) && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tint} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={tint} /> : null}
          <Text style={[styles.buttonLabel, { color: tint }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
});

/** Circular icon button used in headers and over photos. */
export function IconButton({
  name,
  onPress,
  size = 20,
  tint = colors.text,
  background = colors.surfaceRaised,
  accessibilityLabel,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  tint?: string;
  background?: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: background, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={name} size={size} color={tint} />
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

/** Full-screen spinner shown while the stores hydrate. */
export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  buttonDanger: { backgroundColor: colors.dangerSoft },
  buttonFull: { alignSelf: 'stretch' },
  buttonPressed: { opacity: 0.75 },
  buttonDisabled: { opacity: 0.4 },
  buttonLabel: { ...type.bodyStrong },

  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { ...type.section, color: colors.text, textAlign: 'center' },
  emptyMessage: {
    ...type.small,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  emptyAction: { marginTop: spacing.lg },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
