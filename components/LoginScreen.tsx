import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { config } from '@/lib/config';
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
  const busy = useAuth((s) => s.busy);
  const error = useAuth((s) => s.error);
  const sync = useJournal((s) => s.sync);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    if (await login(email, password)) {
      // First sync pulls the journal down straight away, so the list is not
      // empty for the seconds it takes the user to notice.
      void sync();
    }
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
        <Text style={styles.subtitle}>Prihlás sa k svojmu denníku</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Ionicons name="mail-outline" size={18} color={colors.textFaint} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
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
              placeholder="Heslo"
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
            label="Prihlásiť sa"
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
            full
          />
        </View>

        <Text style={styles.server} numberOfLines={1}>
          {config.apiUrl || 'Server nie je nastavený'}
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

  form: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.xxxl },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
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
  errorText: { ...type.small, color: colors.danger, flex: 1 },

  server: { ...type.caption, color: colors.textFaint, marginTop: spacing.xxxl },
});
