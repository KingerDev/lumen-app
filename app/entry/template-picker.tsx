import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, useModalTopInset } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useJournal } from '@/store/journal';
import { colors, radius, spacing, type } from '@/theme';

/** Step one of writing: pick the shape of the entry, or skip straight to free text. */
export default function TemplatePickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useModalTopInset();
  const templates = useJournal((s) => s.templates);

  const start = (templateId?: string) => {
    router.replace({
      pathname: '/entry/edit',
      params: templateId ? { templateId } : {},
    });
  };

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            {t.templatePicker.title}
          </Text>
          <Text style={styles.subtitle}>{t.templatePicker.subtitle}</Text>
        </View>
        <IconButton name="close" onPress={() => router.back()} accessibilityLabel={t.common.close} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => start()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.option, styles.freeOption, pressed && styles.pressed]}
        >
          <View style={[styles.optionIcon, styles.freeIcon]}>
            <Ionicons name="create-outline" size={20} color={colors.accent} />
          </View>
          <View style={styles.optionBody}>
            <Text style={styles.optionTitle}>{t.templatePicker.free}</Text>
            <Text style={styles.optionSubtitle}>{t.templatePicker.freeSubtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.decorative} />
        </Pressable>

        <Text style={styles.groupLabel}>{t.templatePicker.templates}</Text>

        {templates.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => start(template.id)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name={template.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={colors.textMuted}
              />
            </View>
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>{template.name}</Text>
              <Text style={styles.optionSubtitle} numberOfLines={1}>
                {template.description ?? t.templatePicker.questions(template.fields.length)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.decorative} />
          </Pressable>
        ))}

        <Pressable
          onPress={() => {
            router.back();
            router.push('/templates');
          }}
          style={({ pressed }) => [styles.manage, pressed && styles.pressed]}
        >
          <Ionicons name="options-outline" size={16} color={colors.accent} />
          <Text style={styles.manageLabel}>{t.templatePicker.manage}</Text>
        </Pressable>
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1 },
  title: { ...type.title, color: colors.text },
  subtitle: { ...type.caption, color: colors.textFaint, marginTop: 2 },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  freeOption: { borderColor: colors.accentBorder },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeIcon: { backgroundColor: colors.accentSoft },
  optionBody: { flex: 1, gap: 2 },
  optionTitle: { ...type.bodyStrong, color: colors.text },
  optionSubtitle: { ...type.caption, color: colors.textFaint },

  groupLabel: {
    ...type.overline,
    color: colors.textFaint,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },

  manage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  manageLabel: { ...type.small, color: colors.accent },
});
