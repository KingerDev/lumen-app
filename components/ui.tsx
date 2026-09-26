import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const liquidGlass = isLiquidGlassAvailable();

/**
 * Liquid glass surface for the floating control layer (buttons, bars, sheets
 * over maps and photos) — not for content like entry cards. Where iOS 26 glass
 * is unavailable it falls back to `fallback`, a solid surface by default, so
 * the same markup still reads on older iOS and Android.
 */
export function Glass({
  tint,
  interactive,
  fallback = colors.surface,
  style,
  children,
  ...rest
}: ViewProps & {
  /** tints the glass, e.g. the accent for a primary action */
  tint?: string;
  /** the glass reacts to touch (press highlight, shimmer) */
  interactive?: boolean;
  fallback?: string;
}) {
  if (liquidGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor={tint}
        isInteractive={interactive}
        style={[styles.glass, style]}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <View
      style={[styles.glass, !tint && styles.glassFallback, { backgroundColor: tint ?? fallback }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

/**
 * Space the native tab bar takes at the bottom of a tab screen. On iOS the
 * scene runs under the (glass) bar and each tab gets its own safe-area
 * provider that already includes it; on Android the scene sits above the bar.
 */
export function useTabBarInset() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? insets.bottom : 0;
}

/**
 * Top padding for a screen presented as a modal. On iOS a modal is a sheet
 * that starts below the status bar, yet the safe-area top inset still reports
 * the status bar — adding it leaves a tall empty band above the header. On
 * Android the modal is full-screen, so the inset is real.
 */
export function useModalTopInset() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? spacing.sm : insets.top + spacing.sm;
}

/** Circular glass icon button used in headers and over photos and maps. */
export function IconButton({
  name,
  onPress,
  size = 20,
  tint = colors.text,
  background,
  accessibilityLabel,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  tint?: string;
  /** tints the glass (solid colour where glass is unavailable) */
  background?: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed && !liquidGlass ? 0.6 : 1 })}
    >
      <Glass
        interactive
        tint={background}
        fallback={colors.surfaceRaised}
        style={styles.iconButton}
      >
        <Ionicons name={name} size={size} color={tint} />
      </Glass>
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

  glass: { overflow: 'hidden' },
  glassFallback: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },

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
