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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDateTime } from '@/lib/date';
import { plural } from '@/lib/plural';
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
      'Odhlásiť sa?',
      pending
        ? `${pending} zápiskov ešte nie je odoslaných na server. Odhlásením o ne prídeš.`
        : 'Zápisky zostanú na serveri, z tohto zariadenia sa zmažú.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Odhlásiť',
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

  const streak = useMemo(() => computeStreak(entries), [entries]);

  const mediaCount = entries.reduce((sum, entry) => sum + entry.media.length, 0);
  const locatedCount = entries.filter((entry) => entry.location).length;

  const togglePin = () => {
    if (hasPin) {
      Alert.alert('Vypnúť PIN?', 'Denník sa bude otvárať bez zámku.', [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Vypnúť',
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
      'Zmazať všetky dáta?',
      'Zmažú sa všetky zápisky, šablóny a nastavenia z tohto zariadenia. Nedá sa to vrátiť.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať všetko',
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
        <Text style={styles.title}>Nastavenia</Text>

        <View style={styles.stats}>
          <Stat value={entries.length} label="zápiskov" />
          <Stat value={mediaCount} label="fotiek" />
          <Stat value={locatedCount} label="s miestom" />
        </View>

        <Group label="Zabezpečenie">
          <Row
            icon="lock-closed-outline"
            title="PIN kód"
            subtitle={hasPin ? 'Zapnutý — vyžaduje sa pri otvorení' : 'Vypnutý'}
            right={<Switch value={hasPin} onValueChange={togglePin} {...switchColors} />}
          />
          {hasPin ? (
            <>
              <Row
                icon="finger-print-outline"
                title="Face ID / odtlačok"
                subtitle={
                  bioAvailable ? 'Rýchle odomknutie namiesto PIN-u' : 'Na tomto zariadení nedostupné'
                }
                right={
                  <Switch
                    value={settings.biometricsEnabled}
                    disabled={!bioAvailable}
                    onValueChange={(value) => updateSettings({ biometricsEnabled: value })}
                    {...switchColors}
                  />
                }
              />
              <Row
                icon="timer-outline"
                title="Zamknúť po"
                subtitle={`${settings.lockAfterSeconds} s na pozadí`}
                onPress={() =>
                  updateSettings({
                    lockAfterSeconds: nextGrace(settings.lockAfterSeconds),
                  })
                }
                right={<Ionicons name="chevron-forward" size={16} color={colors.textFaint} />}
              />
              <Row
                icon="lock-open-outline"
                title="Zmeniť PIN"
                onPress={() => router.push('/settings/pin')}
                right={<Ionicons name="chevron-forward" size={16} color={colors.textFaint} />}
              />
              <Row
                icon="power-outline"
                title="Zamknúť teraz"
                onPress={lock}
                right={<Ionicons name="chevron-forward" size={16} color={colors.textFaint} />}
              />
            </>
          ) : null}
        </Group>

        <Group label="Zápisky">
          <Row
            icon="flame-outline"
            title="Séria"
            subtitle={streakSubtitle(streak)}
            right={
              <Text style={[styles.streakValue, streak.current === 0 && styles.streakValueOff]}>
                {streak.current}
              </Text>
            }
          />
          <Row
            icon="navigate-outline"
            title="Automatická poloha"
            subtitle="Pri novom zápisku sa uloží aktuálne miesto"
            right={
              <Switch
                value={settings.autoLocation}
                onValueChange={(value) => updateSettings({ autoLocation: value })}
                {...switchColors}
              />
            }
          />
          <Row
            icon="swap-vertical-outline"
            title="Zoradenie"
            subtitle={settings.sortOrder === 'newest' ? 'Najnovšie hore' : 'Najstaršie hore'}
            onPress={() =>
              updateSettings({ sortOrder: settings.sortOrder === 'newest' ? 'oldest' : 'newest' })
            }
            right={<Ionicons name="chevron-forward" size={16} color={colors.textFaint} />}
          />
          <Row
            icon="documents-outline"
            title="Šablóny"
            subtitle={`${templates.length} šablón`}
            onPress={() => router.push('/templates')}
            right={<Ionicons name="chevron-forward" size={16} color={colors.textFaint} />}
          />
        </Group>

        <Group label="Dáta">
          <Row
            icon={syncError ? 'cloud-offline-outline' : 'cloud-done-outline'}
            title="Synchronizácia"
            subtitle={
              syncError ??
              (lastSyncAt ? `Naposledy ${formatDateTime(lastSyncAt)}` : 'Zatiaľ neprebehla')
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
            title="Účet"
            subtitle={user?.email ?? 'Neprihlásený'}
            onPress={confirmLogout}
            right={<Text style={styles.soon}>odhlásiť</Text>}
          />
          <Row
            icon="trash-outline"
            title="Zmazať všetky dáta"
            danger
            onPress={confirmWipe}
            right={<Ionicons name="chevron-forward" size={16} color={colors.danger} />}
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
  const days = (count: number) => `${count} ${plural(count, 'deň', 'dni', 'dní')}`;

  if (streak.current > 0) {
    return streak.current >= streak.longest
      ? `${days(streak.current)} v rade — zatiaľ najviac`
      : `${days(streak.current)} v rade · rekord ${days(streak.longest)}`;
  }

  if (streak.totalDays === 0) return 'Zatiaľ žiadna — napíš prvý zápisok';

  return `Pretrhnutá · rekord ${days(streak.longest)}`;
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
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }}>
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
  rowSubtitle: { ...type.caption, color: colors.textFaint, fontSize: 11 },

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
