import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, IconButton } from '@/components/ui';
import { useJournal } from '@/store/journal';
import { colors, radius, spacing, type } from '@/theme';

/** Manage the prompt sets entries can be written under. */
export default function TemplatesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const templates = useJournal((s) => s.templates);
  const entries = useJournal((s) => s.entries);
  const deleteTemplate = useJournal((s) => s.deleteTemplate);

  const usageOf = (templateId: string) =>
    entries.filter((entry) => entry.templateId === templateId).length;

  const confirmDelete = (id: string, name: string) => {
    const used = usageOf(id);
    Alert.alert(
      `Zmazať „${name}"?`,
      used
        ? `Šablónu používa ${used} zápiskov. Tie zostanú nedotknuté — zmaže sa len šablóna.`
        : 'Šablóna sa odstráni zo zoznamu pri písaní.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        { text: 'Zmazať', style: 'destructive', onPress: () => deleteTemplate(id) },
      ]
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} accessibilityLabel="Späť" />
        <Text style={styles.title}>Šablóny</Text>
        <IconButton
          name="add"
          tint={colors.accentText}
          background={colors.accent}
          onPress={() => router.push({ pathname: '/templates/[id]', params: { id: 'new' } })}
          accessibilityLabel="Nová šablóna"
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.sm,
        }}
        showsVerticalScrollIndicator={false}
      >
        {templates.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="Žiadne šablóny"
            message="Šablóna je sada otázok, ktoré ti Lumen predloží pri písaní zápisku."
          />
        ) : null}

        {templates.map((template) => {
          const used = usageOf(template.id);
          return (
            <Pressable
              key={template.id}
              onPress={() =>
                router.push({ pathname: '/templates/[id]', params: { id: template.id } })
              }
              onLongPress={() => confirmDelete(template.id, template.name)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardIcon}>
                <Ionicons
                  name={template.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={colors.accent}
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{template.name}</Text>
                <Text style={styles.cardMeta}>
                  {template.fields.length} otázok
                  {used ? ` · použitá v ${used} zápiskoch` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          );
        })}

        <Text style={styles.hint}>Podržaním šablóny ju zmažeš.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.7 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { ...type.title, color: colors.text },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { ...type.bodyStrong, color: colors.text },
  cardMeta: { ...type.caption, color: colors.textFaint },

  hint: { ...type.caption, color: colors.textFaint, textAlign: 'center', marginTop: spacing.lg },
});
