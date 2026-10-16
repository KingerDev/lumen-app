import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  Linking,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';
import { legalUrl } from '@/lib/config';
import { formatDateTime } from '@/lib/date';
import { lang, t } from '@/lib/i18n';
import { repo } from '@/lib/storage';
import { computeStreak, type Streak } from '@/lib/streak';
import { useAuth } from '@/store/auth';
import { useJournal } from '@/store/journal';
import { useLock } from '@/store/lock';
import { colors, radius, spacing, type } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const settings = useJournal((s) => s.settings);
  const updateSettings = useJournal((s) => s.updateSettings);
  const entries = useJournal((s) => s.entries);
  const templates = useJournal((s) => s.templates);

  const syncing = useJournal((s) => s.syncing);
  const lastSyncAt = useJournal((s) => s.lastSyncAt);
  const syncError = useJournal((s) => s.syncError);
  const sync = useJournal((s) => s.sync);

  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const deleteAccount = useAuth((s) => s.deleteAccount);
  const [deleting, setDeleting] = useState(false);

  const hasPin = useLock((s) => s.hasPin);
  const removePin = useLock((s) => s.removePin);
  const lock = useLock((s) => s.lock);
  const supportsBiometrics = useLock((s) => s.supportsBiometrics);

  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    void supportsBiometrics().then(setBioAvailable);
  }, [supportsBiometrics]);

  const confirmLogout = () => {
    const pending = entries.filter((entry) => entry.dirty).length;

    Alert.alert(
      t.settings.logoutTitle,
      pending ? t.settings.logoutPending(pending) : t.settings.logoutMessage,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.settings.logoutConfirm,
          style: 'destructive',
          onPress: async () => {
            await logout();
            await repo.wipe();
            await useJournal.getState().hydrate();
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(t.settings.deleteAccountTitle, t.settings.deleteAccountMessage, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.settings.deleteAccountConfirm,
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount();
            // The server copy is gone; a local one would be an orphan.
            await repo.wipe();
            await useJournal.getState().hydrate();
          } catch (err) {
            Alert.alert(
              t.settings.deleteAccountFailed,
              err instanceof ApiError ? err.message : t.errors.unreachable
            );
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const streak = useMemo(() => computeStreak(entries), [entries]);

  const mediaCount = entries.reduce((sum, entry) => sum + entry.media.length, 0);
  const locatedCount = entries.filter((entry) => entry.location).length;

  const togglePin = () => {
    if (hasPin) {
      Alert.alert(t.settings.pinOffTitle, t.settings.pinOffMessage, [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.settings.turnOff,
          style: 'destructive',
          onPress: async () => {
            await removePin();
            updateSettings({ pinEnabled: false, biometricsEnabled: false });
          },
        },
      ]);
    } else {
      router.push('/settings/pin');
    }
  };

  const confirmWipe = () => {
    Alert.alert(
      t.settings.wipeTitle,
      t.settings.wipeMessage,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.settings.wipeConfirm,
          style: 'destructive',
          onPress: async () => {
            await repo.wipe();
            await useJournal.getState().hydrate();
          },
        },
      ]
    );
  };

  return (
    // The scroll view starts below the status bar (like the other tabs), so
    // rows never slide under the clock — iOS 26 draws no bar behind it.
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          {t.settings.title}
        </Text>

        <View style={styles.stats}>
          <Stat value={entries.length} label={t.settings.statEntries(entries.length)} />
          <Stat value={mediaCount} label={t.settings.statPhotos(mediaCount)} />
          <Stat value={locatedCount} label={t.settings.statLocated} />
        </View>

        <Group label={t.settings.security}>
          <Row
            icon="lock-closed-outline"
            title={t.settings.pin}
            subtitle={hasPin ? t.settings.pinOn : t.settings.pinOff}
            right={
              <Switch
                value={hasPin}
                onValueChange={togglePin}
                accessibilityLabel={t.settings.pin}
                {...switchColors}
              />
            }
          />
          {hasPin ? (
            <>
              <Row
                icon="finger-print-outline"
                title={t.settings.biometrics}
                subtitle={
                  bioAvailable ? t.settings.biometricsOn : t.settings.biometricsUnavailable
                }
                right={
                  <Switch
                    value={settings.biometricsEnabled}
                    disabled={!bioAvailable}
                    accessibilityLabel={t.settings.biometrics}
                    onValueChange={(value) => updateSettings({ biometricsEnabled: value })}
                    {...switchColors}
                  />
                }
              />
              <Row
                icon="timer-outline"
                title={t.settings.lockAfter}
                subtitle={t.settings.lockAfterValue(settings.lockAfterSeconds)}
                onPress={() =>
                  updateSettings({
                    lockAfterSeconds: nextGrace(settings.lockAfterSeconds),
                  })
                }
                right={<Ionicons name="chevron-forward" size={16} color={colors.decorative} />}
              />
              <Row
                icon="lock-open-outline"
                title={t.settings.changePin}
                onPress={() => router.push('/settings/pin')}
                right={<Ionicons name="chevron-forward" size={16} color={colors.decorative} />}
              />
              <Row
                icon="power-outline"
                title={t.settings.lockNow}
                onPress={lock}
                right={<Ionicons name="chevron-forward" size={16} color={colors.decorative} />}
              />
            </>
          ) : null}
        </Group>

        <Group label={t.settings.entries}>
          <Row
            icon="flame-outline"
            title={t.settings.streak}
            subtitle={streakSubtitle(streak)}
            right={
              <Text style={[styles.streakValue, streak.current === 0 && styles.streakValueOff]}>
                {streak.current}
              </Text>
            }
          />
          <Row
            icon="navigate-outline"
            title={t.settings.autoLocation}
            subtitle={t.settings.autoLocationHint}
            right={
              <Switch
                value={settings.autoLocation}
                accessibilityLabel={t.settings.autoLocation}
                onValueChange={(value) => updateSettings({ autoLocation: value })}
                {...switchColors}
              />
            }
          />
          <Row
            icon="swap-vertical-outline"
            title={t.settings.sort}
            subtitle={settings.sortOrder === 'newest' ? t.settings.newest : t.settings.oldest}
            onPress={() =>
              updateSettings({ sortOrder: settings.sortOrder === 'newest' ? 'oldest' : 'newest' })
            }
            right={<Ionicons name="chevron-forward" size={16} color={colors.decorative} />}
          />
          <Row
            icon="documents-outline"
            title={t.settings.templates}
            subtitle={t.settings.templateCount(templates.length)}
            onPress={() => router.push('/templates')}
            right={<Ionicons name="chevron-forward" size={16} color={colors.decorative} />}
          />
        </Group>

        <Group label={t.settings.data}>
          <Row
            icon={syncError ? 'cloud-offline-outline' : 'cloud-done-outline'}
            title={t.settings.sync}
            subtitle={
              syncError ??
              (lastSyncAt ? t.settings.lastSync(formatDateTime(lastSyncAt)) : t.settings.neverSynced)
            }
            danger={Boolean(syncError)}
            onPress={() => void sync()}
            right={
              syncing ? (
                <ActivityIndicator size="small" color={colors.textFaint} />
              ) : (
                <Ionicons name="refresh" size={16} color={colors.textFaint} />
              )
            }
          />
          <Row
            icon="person-outline"
            title={t.settings.account}
            subtitle={
              user?.email ?? (user?.apple ? t.settings.appleAccount : t.settings.signedOut)
            }
            onPress={confirmLogout}
            right={<Text style={styles.soon}>{t.settings.logout}</Text>}
          />
          <Row
            icon="trash-outline"
            title={t.settings.wipe}
            danger
            onPress={confirmWipe}
            right={<Ionicons name="chevron-forward" size={16} color={colors.danger} />}
          />
          {user ? (
            <Row
              icon="person-remove-outline"
              title={t.settings.deleteAccount}
              danger
              onPress={deleting ? undefined : confirmDeleteAccount}
              right={
                deleting ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={colors.danger} />
                )
              }
            />
          ) : null}
        </Group>

        <Group label={t.settings.about}>
          <Row
            icon="shield-checkmark-outline"
            title={t.settings.privacy}
            onPress={() => void Linking.openURL(legalUrl('privacy', lang))}
            right={<Ionicons name="open-outline" size={16} color={colors.decorative} />}
          />
          <Row
            icon="help-circle-outline"
            title={t.settings.support}
            onPress={() => void Linking.openURL(legalUrl('support', lang))}
            right={<Ionicons name="open-outline" size={16} color={colors.decorative} />}
          />
        </Group>

        <Text style={styles.version}>Lumen {Constants.expoConfig?.version}</Text>
      </ScrollView>
    </View>
  );
}

/**
 * "12 dní v rade · rekord 34" — the one line under "Séria".
 *
 * The record is dropped while the current run *is* the record; repeating the
 * same number twice on one line reads like a bug.
 */
function streakSubtitle(streak: Streak): string {
  if (streak.current > 0) {
    return streak.current >= streak.longest
      ? t.settings.streakBest(streak.current)
      : t.settings.streakCurrent(streak.current, streak.longest);
  }

  if (streak.totalDays === 0) return t.settings.streakNone;

  return t.settings.streakBroken(streak.longest);
}

/** Cycles the background grace period through sensible values. */
function nextGrace(current: number): number {
  const options = [0, 30, 60, 300];
  const index = options.indexOf(current);
  return options[(index + 1) % options.length];
}

const switchColors = {
  trackColor: { false: colors.borderStrong, true: colors.accent },
  thumbColor: colors.text,
  ios_backgroundColor: colors.borderStrong,
};

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  right,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const content = (
    <View style={styles.row}>
      <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.textMuted} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { ...type.display, color: colors.text },

  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  statValue: { ...type.title, color: colors.accent },
  statLabel: { ...type.caption, color: colors.textFaint, marginTop: 2 },

  group: { marginTop: spacing.xl, gap: spacing.sm },
  groupLabel: {
    ...type.overline,
    color: colors.textFaint,
    textTransform: 'uppercase',
    marginLeft: spacing.xs,
  },
  groupCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 58,
  },
  rowBody: { flex: 1, gap: 1 },
  rowTitle: { ...type.small, color: colors.text },
  rowSubtitle: { ...type.caption, color: colors.textFaint },

  streakValue: { ...type.title, color: colors.accent },
  streakValueOff: { color: colors.textFaint },

  soon: { ...type.caption, color: colors.textFaint },
  version: {
    ...type.caption,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
