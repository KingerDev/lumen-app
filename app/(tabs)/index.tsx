import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryCard } from '@/components/EntryCard';
import { Button, EmptyState } from '@/components/ui';
import { dayKey, formatRelativeDay } from '@/lib/date';
import { useJournal } from '@/store/journal';
import { colors, radius, shadow, spacing, type } from '@/theme';
import type { Entry } from '@/types';

/** Flat list of day headers interleaved with entries — one list, one scroll. */
type Row = { kind: 'header'; key: string; label: string; count: number } | { kind: 'entry'; key: string; entry: Entry };

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const entries = useJournal((s) => s.entries);
  const sortOrder = useJournal((s) => s.settings.sortOrder);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? entries.filter(
          (entry) =>
            entry.text.toLowerCase().includes(needle) ||
            entry.templateName?.toLowerCase().includes(needle) ||
            entry.location?.placeName?.toLowerCase().includes(needle) ||
            entry.location?.localityName?.toLowerCase().includes(needle)
        )
      : entries;

    const ordered =
      sortOrder === 'oldest' ? [...filtered].sort((a, b) => a.date.localeCompare(b.date)) : filtered;

    // Count per day up front — the list is long enough that a nested scan hurts.
    const perDay = new Map<string, number>();
    ordered.forEach((entry) => {
      const key = dayKey(entry.date);
      perDay.set(key, (perDay.get(key) ?? 0) + 1);
    });

    const out: Row[] = [];
    let current = '';
    ordered.forEach((entry) => {
      const key = dayKey(entry.date);
      if (key !== current) {
        current = key;
        out.push({
          kind: 'header',
          key: `h-${key}`,
          label: formatRelativeDay(entry.date),
          count: perDay.get(key) ?? 1,
        });
      }
      out.push({ kind: 'entry', key: entry.id, entry });
    });
    return out;
  }, [entries, query, sortOrder]);

  const hasEntries = entries.length > 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {searching ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={17} color={colors.textFaint} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Hľadať v zápiskoch…"
              placeholderTextColor={colors.textFaint}
              style={styles.searchInput}
              returnKeyType="search"
            />
            <Pressable
              onPress={() => {
                setQuery('');
                setSearching(false);
              }}
              hitSlop={8}
            >
              <Text style={styles.cancel}>Zrušiť</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Denník</Text>
              <Text style={styles.subtitle}>
                {entries.length} {plural(entries.length, 'zápisok', 'zápisky', 'zápiskov')}
              </Text>
            </View>
            <Pressable
              onPress={() => setSearching(true)}
              hitSlop={8}
              style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
              accessibilityLabel="Hľadať"
            >
              <Ionicons name="search" size={20} color={colors.text} />
            </Pressable>
          </View>
        )}
      </View>

      <FlashList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: spacing.lg }}
        keyboardDismissMode="on-drag"
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{item.label}</Text>
              <View style={styles.dayLine} />
            </View>
          ) : (
            <View style={styles.cardWrap}>
              <EntryCard
                entry={item.entry}
                onPress={() => router.push({ pathname: '/entry/[id]', params: { id: item.entry.id } })}
              />
            </View>
          )
        }
        ListEmptyComponent={
          hasEntries ? (
            <EmptyState
              icon="search-outline"
              title="Nič sa nenašlo"
              message={`Pre „${query.trim()}" nemáme žiadny zápisok. Skús iné slovo.`}
            />
          ) : (
            <EmptyState
              icon="book-outline"
              title="Zatiaľ prázdno"
              message="Napíš prvý zápisok. Lumen si k nemu automaticky uloží dátum aj miesto."
              action={
                <Button
                  label="Nový zápisok"
                  icon="add"
                  onPress={() => router.push('/entry/template-picker')}
                />
              }
            />
          )
        }
      />

      <Pressable
        onPress={() => router.push('/entry/template-picker')}
        accessibilityRole="button"
        accessibilityLabel="Nový zápisok"
        style={({ pressed }) => [
          styles.fab,
          { bottom: (insets.bottom || spacing.lg) + 78 },
          pressed && styles.fabPressed,
        ]}
      >
        <Ionicons name="add" size={28} color={colors.accentText} />
      </Pressable>
    </View>
  );
}

/** Slovak 1 / 2–4 / 5+ noun forms. */
function plural(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  if (count >= 2 && count <= 4) return few;
  return many;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.display, color: colors.text },
  subtitle: { ...type.caption, color: colors.textFaint, marginTop: 2 },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.6 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 44,
  },
  searchInput: { flex: 1, ...type.body, color: colors.text, paddingVertical: 0 },
  cancel: { ...type.small, color: colors.accent },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  dayLabel: { ...type.overline, color: colors.textMuted, textTransform: 'uppercase' },
  dayLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },

  cardWrap: { paddingBottom: spacing.sm },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
