import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui';
import { nowISO } from '@/lib/date';
import { slugId, uid } from '@/lib/id';
import { useJournal } from '@/store/journal';
import { colors, radius, spacing, type } from '@/theme';
import type { TemplateField } from '@/types';

const ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'sunny-outline',
  'moon-outline',
  'heart-outline',
  'airplane-outline',
  'barbell-outline',
  'briefcase-outline',
  'people-outline',
  'restaurant-outline',
  'bulb-outline',
  'musical-notes-outline',
];

/** Create or edit a template: a name, an icon and an ordered list of prompts. */
export default function TemplateEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const existing = useJournal((s) => (id === 'new' ? undefined : s.getTemplate(id)));
  const saveTemplate = useJournal((s) => s.saveTemplate);

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [icon, setIcon] = useState<string>(existing?.icon ?? ICONS[0]);
  const [fields, setFields] = useState<TemplateField[]>(
    existing?.fields ?? [{ id: slugId('otazka'), label: '', multiline: true }]
  );

  const updateField = (fieldId: string, label: string) =>
    setFields((current) => current.map((f) => (f.id === fieldId ? { ...f, label } : f)));

  const addField = () =>
    setFields((current) => [...current, { id: slugId('otazka'), label: '', multiline: true }]);

  const removeField = (fieldId: string) =>
    setFields((current) => current.filter((f) => f.id !== fieldId));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    setFields((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = () => {
    const cleanName = name.trim();
    const cleanFields = fields
      .map((field) => ({ ...field, label: field.label.trim() }))
      .filter((field) => field.label);

    if (!cleanName) {
      Alert.alert('Chýba názov', 'Pomenuj šablónu, aby si ju našiel pri písaní.');
      return;
    }
    if (!cleanFields.length) {
      Alert.alert('Chýbajú otázky', 'Pridaj aspoň jednu otázku.');
      return;
    }

    saveTemplate({
      id: existing?.id ?? uid(),
      name: cleanName,
      description: description.trim() || undefined,
      icon,
      fields: cleanFields,
      createdAt: existing?.createdAt ?? nowISO(),
      updatedAt: nowISO(),
      builtIn: existing?.builtIn,
    });
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} accessibilityLabel="Späť" />
        <Text style={styles.headerTitle}>{existing ? 'Upraviť šablónu' : 'Nová šablóna'}</Text>
        <Pressable onPress={save} style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
          <Text style={styles.saveLabel}>Uložiť</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Názov</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="napr. Daily Self"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Krátky popis (voliteľné)"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Ikona</Text>
          <View style={styles.iconRow}>
            {ICONS.map((candidate) => (
              <Pressable
                key={candidate}
                onPress={() => setIcon(candidate)}
                style={[styles.iconOption, icon === candidate && styles.iconOptionActive]}
              >
                <Ionicons
                  name={candidate}
                  size={20}
                  color={icon === candidate ? colors.accent : colors.textMuted}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>Otázky</Text>
          {fields.map((field, index) => (
            <View key={field.id} style={styles.fieldRow}>
              <View style={styles.reorder}>
                <Pressable onPress={() => move(index, -1)} hitSlop={6} disabled={index === 0}>
                  <Ionicons
                    name="chevron-up"
                    size={15}
                    color={index === 0 ? colors.textFaint : colors.textMuted}
                  />
                </Pressable>
                <Pressable
                  onPress={() => move(index, 1)}
                  hitSlop={6}
                  disabled={index === fields.length - 1}
                >
                  <Ionicons
                    name="chevron-down"
                    size={15}
                    color={index === fields.length - 1 ? colors.textFaint : colors.textMuted}
                  />
                </Pressable>
              </View>
              <TextInput
                value={field.label}
                onChangeText={(label) => updateField(field.id, label)}
                placeholder={`Otázka ${index + 1}…`}
                placeholderTextColor={colors.textFaint}
                style={[styles.input, styles.fieldInput]}
              />
              <Pressable onPress={() => removeField(field.id)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.textFaint} />
              </Pressable>
            </View>
          ))}

          <Pressable onPress={addField} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
            <Ionicons name="add" size={17} color={colors.accent} />
            <Text style={styles.addLabel}>Pridať otázku</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.65 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...type.bodyStrong, color: colors.text, flex: 1, textAlign: 'center' },
  save: {
    paddingHorizontal: spacing.lg,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: { ...type.small, fontWeight: '700', color: colors.accentText },

  group: { gap: spacing.sm },
  groupLabel: {
    ...type.overline,
    color: colors.textFaint,
    textTransform: 'uppercase',
    marginLeft: spacing.xs,
  },

  input: {
    ...type.small,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconOption: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionActive: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },

  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reorder: { gap: 2, alignItems: 'center' },
  fieldInput: { flex: 1 },

  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentBorder,
    borderStyle: 'dashed',
    marginTop: spacing.xs,
  },
  addLabel: { ...type.small, color: colors.accent },
});
