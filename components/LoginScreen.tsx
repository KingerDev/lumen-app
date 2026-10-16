import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { legalUrl } from '@/lib/config';
import { lang, t } from '@/lib/i18n';
import { useAuth } from '@/store/auth';
import { useJournal } from '@/store/journal';
import { colors, radius, spacing, type } from '@/theme';

/**
 * Sign in.
 *
 * An overlay rather than a route, for the same reason as the lock screen: no
 * navigation state — and no journal content — is reachable behind it. Once a
 * session exists the app is fully offline-capable, so this appears only on the
 * first launch or after the token is revoked.
 */
export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const login = useAuth((s) => s.login);
  const loginWithApple = useAuth((s) => s.loginWithApple);
  const busy = useAuth((s) => s.busy);
  const error = useAuth((s) => s.error);
  const sync = useJournal((s) => s.sync);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // false on Android and on the rare iPhone without an Apple Account.
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  // First sync pulls the journal down straight away, so the list is not
  // empty for the seconds it takes the user to notice.
  const submit = async () => {
    if (await login(email, password)) void sync();
  };

  const signInWithApple = async () => {
    if (busy) return;
    if (await loginWithApple()) void sync();
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.mark}>
          <Ionicons name="sparkles" size={28} color={colors.accent} />
        </View>

        <Text style={styles.title}>Lumen</Text>
        <Text style={styles.subtitle}>{t.login.subtitle}</Text>
        <Text style={styles.why}>{t.login.why}</Text>

        <View style={styles.form}>
          {appleAvailable ? (
            <>
              {/* Apple's own button — App Review rejects a hand-drawn one. */}
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={26}
                onPress={signInWithApple}
                style={[styles.apple, busy && styles.dimmed]}
              />

              <View style={styles.divider} accessible={false}>
                <View style={styles.rule} />
                <Text style={styles.dividerText}>{t.login.or}</Text>
                <View style={styles.rule} />
              </View>
            </>
          ) : null}

          <View style={styles.field}>
            <Ionicons name="mail-outline" size={18} color={colors.textFaint} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t.login.email}
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textFaint} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t.login.password}
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              textContentType="password"
              onSubmitEditing={submit}
              returnKeyType="go"
              style={styles.input}
            />
          </View>

          {error ? (
            <View style={styles.error}>
              <Ionicons name="alert-circle" size={15} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            label={t.login.submit}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
            full
          />
        </View>

        <Text
          style={styles.privacy}
          accessibilityRole="link"
          onPress={() => void Linking.openURL(legalUrl('privacy', lang))}
        >
          {t.login.privacy}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
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
    zIndex: 90,
  },
  content: { paddingHorizontal: spacing.xl, alignItems: 'center' },

  mark: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...type.display, color: colors.text },
  subtitle: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
  why: {
    ...type.small,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.lg,
    maxWidth: 300,
  },

  form: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.xxxl },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  apple: { height: 52, alignSelf: 'stretch' },
  dimmed: { opacity: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xs },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dividerText: { ...type.caption, color: colors.textFaint },

  input: { flex: 1, ...type.body, color: colors.text, paddingVertical: 0 },

  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
  },
  privacy: {
    ...type.small,
    color: colors.textMuted,
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  errorText: { ...type.small, color: colors.danger, flex: 1 },
});
