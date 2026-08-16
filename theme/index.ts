/**
 * Lumen design tokens — dark only.
 * Everything visual reads from here so the whole app can be retuned in one file.
 */

export const colors = {
  /** page background */
  bg: '#0B0B0E',
  /** cards, list rows */
  surface: '#141419',
  /** raised things on top of a surface: inputs, chips, sheets */
  surfaceRaised: '#1C1C23',
  /** pressed / hovered state of a surface */
  surfacePressed: '#22222B',

  border: '#26262F',
  borderStrong: '#33333F',

  text: '#F2F2F5',
  textMuted: '#9A9AA8',
  textFaint: '#5E5E6B',

  /** warm lamp-light amber — the "lumen" */
  accent: '#E8B54D',
  accentText: '#1A1206',
  accentSoft: 'rgba(232, 181, 77, 0.14)',
  accentBorder: 'rgba(232, 181, 77, 0.35)',

  danger: '#E5484D',
  dangerSoft: 'rgba(229, 72, 77, 0.14)',
  success: '#4CC38A',

  /** scrims over photos so white text stays readable */
  scrim: 'rgba(0, 0, 0, 0.55)',
  scrimStrong: 'rgba(0, 0, 0, 0.78)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 32, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  section: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: '400' },
  bodyStrong: { fontSize: 16, fontWeight: '600' },
  small: { fontSize: 14, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0.2 },
  /** all-caps micro label above a group */
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  float: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
} as const;

/** Dark map style for react-native-maps (Google provider). */
export const mapDarkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#16161c' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b8b99' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b0b0e' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a2a34' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#22222b' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#33333f' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d14' }] },
];
