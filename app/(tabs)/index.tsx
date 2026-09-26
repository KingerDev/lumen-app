import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryCard } from '@/components/EntryCard';
import { StreakBadge } from '@/components/StreakBadge';
import { Button, EmptyState, Glass, IconButton, useTabBarInset } from '@/components/ui';
import { plural } from '@/lib/plural';
import { computeStreak } from '@/lib/streak';
import { useJournal } from '@/store/journal';
import { colors, radius, shadow, spacing, type } from '@/theme';
import type { Entry } from '@/types';

/**
 * No day headers: each card carries its own date, so a separating strip would
 * only repeat what the row already says.
 */

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const entries = useJournal((s) => s.entries);
  const sortOrder = useJournal((s) => s.settings.sortOrder);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const rows = useMemo<Entry[]>(() => {
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

    return sortOrder === 'oldest'
      ? [...filtered].sort((a, b) => a.date.localeCompare(b.date))
      : filtered;
  }, [entries, query, sortOrder]);

  // Whole-journal figure, so it is deliberately not derived from `rows` — a
  // search narrowing the list must not make the streak look shorter.
  const streak = useMemo(() => computeStreak(entries), [entries]);

  const hasEntries = entries.length > 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {searching ? (
          <Glass style={styles.searchBar}>
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
          </Glass>
        ) : (
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Denník</Text>
              <Text style={styles.subtitle}>
                {entries.length} {plural(entries.length, 'zápisok', 'zápisky', 'zápiskov')}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <StreakBadge days={streak.current} writtenToday={streak.writtenToday} />
              <IconButton
                name="search"
                onPress={() => setSearching(true)}
                accessibilityLabel="Hľadať"
              />
            </View>
          </View>
        )}
      </View>

      <FlashList
        data={rows}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={{ paddingBottom: 96, paddingHorizontal: spacing.lg }}
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <EntryCard
              entry={item}
              onPress={() => router.push({ pathname: '/entry/[id]', params: { id: item.id } })}
            />
          </View>
        )}
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
          { bottom: tabBarInset + spacing.lg },
          pressed && styles.fabPressed,
        ]}
      >
        <Glass interactive tint={colors.accent} style={styles.fabGlass}>
          <Ionicons name="add" size={28} color={colors.accentText} />
        </Glass>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...type.display, color: colors.text },
  subtitle: { ...type.caption, color: colors.textFaint, marginTop: 2 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 44,
  },
  searchInput: { flex: 1, ...type.body, color: colors.text, paddingVertical: 0 },
  cancel: { ...type.small, color: colors.accent },

  cardWrap: { paddingBottom: spacing.sm },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    // `bottom` is set inline: on iOS the scene runs under the glass tab bar.
    borderRadius: radius.pill,
    ...shadow.float,
  },
  fabGlass: {
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
