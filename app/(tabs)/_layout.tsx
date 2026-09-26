import { Ionicons } from '@expo/vector-icons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors, type } from '@/theme';

/**
 * Native tab bar: on iOS 26 the system draws it as liquid glass (and lets it
 * shrink while scrolling); older iOS and Android get their platform bar.
 * SF Symbols on iOS, the same Ionicons as before everywhere else.
 */
export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={colors.accent}
      iconColor={{ default: colors.textMuted, selected: colors.accent }}
      labelStyle={{
        default: { ...type.caption, fontSize: 11, color: colors.textMuted },
        selected: { ...type.caption, fontSize: 11, color: colors.accent },
      }}
      indicatorColor={colors.accentSoft}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index" contentStyle={{ backgroundColor: colors.bg }}>
        <NativeTabs.Trigger.Label>Denník</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'book', selected: 'book.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="book" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="gallery" contentStyle={{ backgroundColor: colors.bg }}>
        <NativeTabs.Trigger.Label>Galéria</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'photo.on.rectangle', selected: 'photo.fill.on.rectangle.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="images" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="map" contentStyle={{ backgroundColor: colors.bg }}>
        <NativeTabs.Trigger.Label>Mapa</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'map', selected: 'map.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="map" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings" contentStyle={{ backgroundColor: colors.bg }}>
        <NativeTabs.Trigger.Label>Nastavenia</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="settings" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
