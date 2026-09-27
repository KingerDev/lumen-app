import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass, IconButton, useModalTopInset } from '@/components/ui';
import { formatLongDate, formatTime, toLocalISO } from '@/lib/date';
import { captureCurrentLocation, formatLocation } from '@/lib/location';
import { capturePhoto, MediaPickError, mediaSource, pickMedia } from '@/lib/media';
import { renderSections } from '@/lib/templates';
import { useEditor } from '@/store/editor';
import { useJournal } from '@/store/journal';
import { colors, radius, spacing, type } from '@/theme';

/**
 * Write / edit an entry.
 *
 * On a new entry the date defaults to now and the GPS fix is fetched in the
 * background — both stay fully editable, which is the whole point of showing
 * them as tappable rows rather than fixed metadata.
 */
export default function EditEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useModalTopInset();
  const params = useLocalSearchParams<{ id?: string; templateId?: string }>();

  const draft = useEditor((s) => s.draft);
  const beginNew = useEditor((s) => s.beginNew);
  const beginEdit = useEditor((s) => s.beginEdit);
  const patch = useEditor((s) => s.patch);
  const setSection = useEditor((s) => s.setSection);
  const addMedia = useEditor((s) => s.addMedia);
  const removeMedia = useEditor((s) => s.removeMedia);
  const clear = useEditor((s) => s.clear);

  const getEntry = useJournal((s) => s.getEntry);
  const getTemplate = useJournal((s) => s.getTemplate);
  const createEntry = useJournal((s) => s.createEntry);
  const updateEntry = useJournal((s) => s.updateEntry);
  const autoLocation = useJournal((s) => s.settings.autoLocation);

  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);

  const keyboardInset = useKeyboardInset();

  const isEditing = Boolean(params.id);

  // Seed the draft once per screen mount.
  useEffect(() => {
    if (params.id) {
      const entry = getEntry(params.id);
      if (entry) beginEdit(entry);
    } else {
      beginNew(params.templateId ? getTemplate(params.templateId) : undefined);
    }
  }, [beginEdit, beginNew, getEntry, getTemplate, params.id, params.templateId]);

  // Auto-capture the location for brand new entries.
  useEffect(() => {
    if (isEditing || !autoLocation) return;
    let cancelled = false;
    setLocating(true);
    captureCurrentLocation()
      .then((location) => {
        if (cancelled || !location) return;
        // Only fill in if the user has not already set a place by hand.
        if (!useEditor.getState().draft?.location) {
          useEditor.setState((state) =>
            state.draft ? { draft: { ...state.draft, location } } : state
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLocating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [autoLocation, isEditing]);

  if (!draft) return <View style={styles.root} />;

  const hasContent =
    draft.text.trim().length > 0 ||
    draft.sections?.some((s) => s.value.trim()) ||
    draft.media.length > 0;

  const save = () => {
    if (!hasContent) {
      Alert.alert('Prázdny zápisok', 'Napíš aspoň niečo alebo pridaj fotku.');
      return;
    }

    const text = draft.sections
      ? renderSections(draft.templateName, draft.sections)
      : draft.text.trim();

    const payload = {
      date: draft.date,
      text,
      templateId: draft.templateId,
      templateName: draft.templateName,
      sections: draft.sections,
      media: draft.media,
      location: draft.location ?? undefined,
      starred: draft.starred,
    };

    if (draft.entryId) updateEntry(draft.entryId, payload);
    else createEntry(payload);

    clear();
    router.back();
  };

  const close = () => {
    if (!draft.dirty) {
      clear();
      router.back();
      return;
    }
    Alert.alert('Zahodiť zápisok?', 'Zmeny sa neuložia.', [
      { text: 'Pokračovať v písaní', style: 'cancel' },
      {
        text: 'Zahodiť',
        style: 'destructive',
        onPress: () => {
          clear();
          router.back();
        },
      },
    ]);
  };

  const attach = async (source: 'library' | 'camera') => {
    setBusy(true);
    try {
      if (source === 'camera') {
        const shot = await capturePhoto();
        if (shot) addMedia([shot]);
      } else {
        addMedia(await pickMedia());
      }
    } catch (err) {
      // A photo iOS cannot hand over must not take the whole editor down —
      // attach whatever did come through and say what was skipped.
      if (err instanceof MediaPickError) {
        addMedia(err.picked);
        Alert.alert(
          'Niektoré fotky sa nenačítali',
          `${err.message} Ak sú uložené v iCloude, otvor ich najprv vo Fotkách, aby sa stiahli.`
        );
      } else {
        console.warn('[lumen] attach failed', err);
        Alert.alert('Nepodarilo sa pridať médiá', 'Skús to prosím znova.');
      }
    } finally {
      setBusy(false);
    }
  };

  const refreshLocation = async () => {
    setLocating(true);
    const location = await captureCurrentLocation();
    setLocating(false);
    if (location) patch({ location });
    else
      Alert.alert(
        'Polohu sa nepodarilo získať',
        'Skontroluj, či má Lumen povolený prístup k polohe v nastaveniach telefónu.'
      );
  };

  const onPickDate = (_: unknown, picked?: Date) => {
    const mode = picker;
    if (Platform.OS !== 'ios') setPicker(null);
    if (!picked) return;

    const current = new Date(draft.date);
    const next = new Date(current);
    if (mode === 'date') {
      next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    } else {
      next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    }
    patch({ date: toLocalISO(next) });
  };

  return (
    <View style={[styles.root, { paddingBottom: keyboardInset }]}>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: topInset }]}>
          <IconButton name="close" onPress={close} accessibilityLabel="Zavrieť" />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {draft.templateName ?? (isEditing ? 'Upraviť zápisok' : 'Voľný zápis')}
            </Text>
          </View>
          <Pressable
            onPress={save}
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
          >
            <Text style={styles.saveLabel}>Uložiť</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: insets.bottom + 140,
            gap: spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Date & time — always editable, defaulted to the moment of writing. */}
          <View style={styles.metaCard}>
            <Pressable
              onPress={() => setPicker(picker === 'date' ? null : 'date')}
              style={({ pressed }) => [styles.metaRow, pressed && styles.pressed]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.accent} />
              <Text style={styles.metaLabel}>{formatLongDate(draft.date)}</Text>
              <Ionicons name="chevron-down" size={15} color={colors.textFaint} />
            </Pressable>

            <View style={styles.metaSeparator} />

            <Pressable
              onPress={() => setPicker(picker === 'time' ? null : 'time')}
              style={({ pressed }) => [styles.metaRow, styles.metaRowNarrow, pressed && styles.pressed]}
            >
              <Ionicons name="time-outline" size={18} color={colors.accent} />
              <Text style={styles.metaLabel}>{formatTime(draft.date)}</Text>
            </Pressable>
          </View>

          {picker ? (
            <View style={styles.pickerCard}>
              <DateTimePicker
                value={new Date(draft.date)}
                mode={picker}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="dark"
                locale="sk-SK"
                maximumDate={picker === 'date' ? new Date() : undefined}
                onChange={onPickDate}
              />
              {Platform.OS === 'ios' ? (
                <Pressable onPress={() => setPicker(null)} style={styles.pickerDone}>
                  <Text style={styles.pickerDoneLabel}>Hotovo</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Location — auto-filled, editable by tapping. */}
          <Pressable
            onPress={() => router.push('/entry/location-picker')}
            style={({ pressed }) => [styles.locationRow, pressed && styles.pressed]}
          >
            <Ionicons
              name={draft.location ? 'location' : 'location-outline'}
              size={18}
              color={draft.location ? colors.accent : colors.textFaint}
            />
            <View style={styles.locationBody}>
              <Text style={styles.locationLabel} numberOfLines={1}>
                {formatLocation(draft.location) ??
                  (locating ? 'Zisťujem polohu…' : 'Pridať miesto')}
              </Text>
              {draft.location?.auto ? (
                <Text style={styles.locationHint}>automaticky z GPS · ťukni pre úpravu</Text>
              ) : null}
            </View>
            {locating ? (
              <ActivityIndicator size="small" color={colors.textFaint} />
            ) : (
              <Pressable onPress={refreshLocation} hitSlop={10}>
                <Ionicons name="refresh" size={16} color={colors.textFaint} />
              </Pressable>
            )}
          </Pressable>

          {/* Body — template prompts, or one open field. */}
          {draft.sections ? (
            draft.sections.map((section) => (
              <View key={section.fieldId} style={styles.field}>
                <Text style={styles.fieldLabel}>{section.label}</Text>
                <TextInput
                  value={section.value}
                  onChangeText={(value) => setSection(section.fieldId, value)}
                  multiline
                  placeholder="…"
                  placeholderTextColor={colors.textFaint}
                  style={styles.fieldInput}
                />
              </View>
            ))
          ) : (
            <TextInput
              value={draft.text}
              onChangeText={(text) => patch({ text })}
              multiline
              autoFocus={!isEditing}
              placeholder="Ako bol dnešný deň?"
              placeholderTextColor={colors.textFaint}
              style={[styles.fieldInput, styles.freeInput]}
            />
          )}

          {/* Attached media */}
          {draft.media.length ? (
            <View style={styles.mediaGrid}>
              {draft.media.map((media) => (
                <View key={media.id} style={styles.mediaTile}>
                  <Image
                    source={mediaSource(media)}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <Pressable
                    onPress={() => removeMedia(media.id)}
                    style={styles.mediaRemove}
                    hitSlop={6}
                    accessibilityLabel="Odobrať fotku"
                  >
                    <Ionicons name="close" size={13} color="#fff" />
                  </Pressable>
                  {media.kind === 'video' ? (
                    <View style={styles.mediaVideo}>
                      <Ionicons name="play" size={10} color="#fff" />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {/* Attachment bar */}
        <Glass
          style={[
            styles.toolbar,
            // With the keyboard up the home-indicator inset is under the keys.
            { paddingBottom: keyboardInset ? spacing.md : insets.bottom || spacing.lg },
          ]}
        >
          <Pressable
            onPress={() => attach('library')}
            disabled={busy}
            style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
          >
            <Ionicons name="images-outline" size={20} color={colors.text} />
            <Text style={styles.toolLabel}>Fotky</Text>
          </Pressable>
          <Pressable
            onPress={() => attach('camera')}
            disabled={busy}
            style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
          >
            <Ionicons name="camera-outline" size={20} color={colors.text} />
            <Text style={styles.toolLabel}>Odfotiť</Text>
          </Pressable>
          <Pressable
            onPress={() => patch({ starred: !draft.starred })}
            style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
          >
            <Ionicons
              name={draft.starred ? 'star' : 'star-outline'}
              size={20}
              color={draft.starred ? colors.accent : colors.text}
            />
            <Text style={styles.toolLabel}>Obľúbené</Text>
          </Pressable>
          {busy ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
        </Glass>
      </View>
    </View>
  );
}

/**
 * How much of the screen's bottom the iOS keyboard covers, to pad it away.
 *
 * Not KeyboardAvoidingView, and not measureInWindow either: under Fabric both
 * see a modal sheet at y = 0, although iOS draws it well below the top of the
 * screen, so they under-shoot by that offset and the toolbar stays under the
 * keys. The sheet is always anchored to the bottom edge of the screen, though,
 * so the overlap is just the distance from the keyboard's top to that edge.
 */
function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const animate = (duration: number) =>
      LayoutAnimation.configureNext({
        duration: Math.max(duration, 10),
        update: { duration: Math.max(duration, 10), type: 'keyboard' },
      });

    const change = Keyboard.addListener('keyboardWillChangeFrame', (event) => {
      animate(event.duration);
      setInset(Math.max(0, Dimensions.get('screen').height - event.endCoordinates.screenY));
    });
    const hide = Keyboard.addListener('keyboardWillHide', (event) => {
      animate(event.duration);
      setInset(0);
    });

    return () => {
      change.remove();
      hide.remove();
    };
  }, []);

  return inset;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.65 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...type.bodyStrong, color: colors.text },
  saveButton: {
    paddingHorizontal: spacing.lg,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: { ...type.small, fontWeight: '700', color: colors.accentText },

  metaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  metaRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  metaRowNarrow: { flex: 0 },
  metaSeparator: { width: StyleSheet.hairlineWidth, height: 24, backgroundColor: colors.border },
  metaLabel: { ...type.small, color: colors.text, flexShrink: 1 },

  pickerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pickerDone: { alignItems: 'center', paddingVertical: spacing.md },
  pickerDoneLabel: { ...type.small, color: colors.accent, fontWeight: '600' },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  locationBody: { flex: 1, gap: 1 },
  locationLabel: { ...type.small, color: colors.text },
  locationHint: { ...type.caption, color: colors.textFaint, fontSize: 11 },

  field: { gap: spacing.xs, marginTop: spacing.sm },
  fieldLabel: { ...type.caption, color: colors.accent, fontWeight: '600' },
  fieldInput: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 54,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  freeInput: { minHeight: 220 },

  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  mediaTile: {
    width: 92,
    height: 92,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.scrimStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaVideo: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.scrimStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tool: { alignItems: 'center', gap: 3 },
  toolLabel: { ...type.caption, color: colors.textFaint, fontSize: 10 },
});
