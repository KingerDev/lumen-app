import { type Href, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Settings } from 'react-native';

import { toLocalISO } from '@/lib/date';
import { lang } from '@/lib/i18n';
import { repo } from '@/lib/storage';
import { renderSections } from '@/lib/templates';
import { useAuth } from '@/store/auth';
import { DEFAULT_SETTINGS, type Entry, type EntryLocation, type Media, type Template } from '@/types';

/**
 * Demo journal for App Store screenshots.
 *
 * Only reachable in a dev build started with EXPO_PUBLIC_DEMO=1 (see
 * `isDemo`). It replaces the local store with a made-up journal in the device
 * language, fakes a session so the login overlay stays away, and the root
 * layout skips sync — nothing here ever reaches the server.
 *
 * Photos are Unsplash images served by picsum.photos, loaded like synced media
 * (remote URL, no local file).
 */

export const isDemo = __DEV__ && process.env.EXPO_PUBLIC_DEMO === '1';

type L = { sk: string; en: string };
const pick = (text: L) => text[lang];

const PLACES: Record<string, EntryLocation> = {
  bb: { latitude: 48.7359, longitude: 19.1462, placeName: 'Námestie SNP', localityName: 'Banská Bystrica' },
  urpin: { latitude: 48.7391, longitude: 19.1569, placeName: 'Urpín', localityName: 'Banská Bystrica' },
  ba: { latitude: 48.1436, longitude: 17.1077, placeName: 'Hlavné námestie', localityName: 'Bratislava' },
  danube: { latitude: 48.1385, longitude: 17.1032, placeName: 'Eurovea nábrežie', localityName: 'Bratislava' },
  tatry: { latitude: 49.1194, longitude: 20.0617, placeName: 'Štrbské Pleso', localityName: 'Vysoké Tatry' },
  rysy: { latitude: 49.1795, longitude: 20.0881, placeName: 'Rysy', localityName: 'Vysoké Tatry' },
  stiavnica: { latitude: 48.4588, longitude: 18.896, placeName: 'Starý zámok', localityName: 'Banská Štiavnica' },
  kosice: { latitude: 48.7206, longitude: 21.2578, placeName: 'Hlavná ulica', localityName: 'Košice' },
  vienna: { latitude: 48.2082, longitude: 16.3738, placeName: 'Stephansplatz', localityName: 'Wien' },
  donovaly: { latitude: 48.8806, longitude: 19.2269, placeName: 'Donovaly', localityName: 'Donovaly' },
};

const TEMPLATES: { id: string; icon: string; name: L; description: L; fields: L[] }[] = [
  {
    id: 'demo-evening',
    icon: 'moon-outline',
    name: { sk: 'Večerné ohliadnutie', en: 'Evening Reflection' },
    description: { sk: 'Tri otázky na koniec dňa', en: 'Three questions to close the day' },
    fields: [
      { sk: 'Čo ma dnes potešilo?', en: 'What made me happy today?' },
      { sk: 'Čo som sa naučil?', en: 'What did I learn?' },
      { sk: 'Na čo sa teším zajtra?', en: 'What am I looking forward to tomorrow?' },
    ],
  },
  {
    id: 'demo-gratitude',
    icon: 'heart-outline',
    name: { sk: 'Vďačnosť', en: 'Gratitude' },
    description: { sk: 'Tri veci, za ktoré som vďačný', en: 'Three things I’m grateful for' },
    fields: [
      { sk: 'Som vďačný za…', en: 'I’m grateful for…' },
      { sk: 'Kto mi dnes pomohol?', en: 'Who helped me today?' },
    ],
  },
  {
    id: 'demo-trip',
    icon: 'airplane-outline',
    name: { sk: 'Výlet', en: 'Trip' },
    description: { sk: 'Kde, s kým a čo si zapamätať', en: 'Where, with whom, what to remember' },
    fields: [
      { sk: 'Kam sme šli?', en: 'Where did we go?' },
      { sk: 'Najlepší moment', en: 'Best moment' },
    ],
  },
];

interface Spec {
  daysAgo: number;
  at: [number, number];
  place?: keyof typeof PLACES;
  photos?: number[];
  starred?: boolean;
  text?: L;
  template?: string;
  answers?: L[];
}

const SPECS: Spec[] = [
  {
    daysAgo: 0,
    at: [21, 14],
    place: 'urpin',
    photos: [110],
    template: 'demo-evening',
    answers: [
      { sk: 'Západ slnka z Urpína. Celé mesto sa na pár minút zafarbilo do oranžova.', en: 'The sunset from Urpín. The whole town turned orange for a few minutes.' },
      { sk: 'Že prechádzka bez telefónu v ruke trvá dvakrát dlhšie a je trikrát lepšia.', en: 'A walk without a phone in hand takes twice as long and is three times better.' },
      { sk: 'Sobotné raňajky na trhu.', en: 'Saturday breakfast at the market.' },
    ],
  },
  {
    daysAgo: 1,
    at: [8, 32],
    place: 'bb',
    photos: [431, 42],
    starred: true,
    text: {
      sk: 'Ranná káva na námestí\nPrvý raz tento týždeň som si sadol von. Vzduch už vonia jeseňou a kaviareň pustila staré platne.',
      en: 'Morning coffee on the square\nFirst time this week I sat outside. The air already smells of autumn and the café was playing old records.',
    },
  },
  {
    daysAgo: 2,
    at: [19, 48],
    place: 'bb',
    photos: [488],
    template: 'demo-gratitude',
    answers: [
      { sk: 'Večeru s Luciou. Konečne sme uvarili to kari, o ktorom hovoríme od leta.', en: 'Dinner with Lucia. We finally cooked the curry we’ve talked about since summer.' },
      { sk: 'Kolega Peter, ktorý za mňa vybavil celú prezentáciu.', en: 'Peter from work, who sorted out the whole presentation for me.' },
    ],
  },
  {
    daysAgo: 3,
    at: [17, 5],
    place: 'donovaly',
    photos: [1044, 17],
    text: {
      sk: 'Les po daždi\nHmla sa držala v korunách stromov celé popoludnie. Ticho, len potok a moje kroky.',
      en: 'The forest after rain\nMist hung in the treetops all afternoon. Silence, just the stream and my footsteps.',
    },
  },
  {
    daysAgo: 4,
    at: [22, 10],
    place: 'bb',
    text: {
      sk: 'Dočítal som knihu, ktorú mám na nočnom stolíku od jari. Posledná kapitola stála za to čakanie.',
      en: 'Finished the book that’s been on my nightstand since spring. The last chapter was worth the wait.',
    },
  },
  {
    daysAgo: 5,
    at: [12, 40],
    place: 'stiavnica',
    photos: [167, 76],
    template: 'demo-trip',
    answers: [
      { sk: 'Banská Štiavnica, celá partia z vysokej.', en: 'Banská Štiavnica, the whole gang from uni.' },
      { sk: 'Keď sme na Kalvárii zistili, že sme si všetci priniesli koláč.', en: 'Realising at the Calvary that every one of us had brought a cake.' },
    ],
  },
  {
    daysAgo: 6,
    at: [20, 22],
    place: 'bb',
    photos: [225],
    text: {
      sk: 'Pomalý večer. Čaj, deka, a konečne som zavolal babke.',
      en: 'A slow evening. Tea, a blanket, and I finally called grandma.',
    },
  },
  {
    daysAgo: 7,
    at: [7, 15],
    place: 'urpin',
    photos: [103],
    text: {
      sk: 'Beh pred prácou\nPäť kilometrov, prvýkrát bez zastavenia. Malé víťazstvo.',
      en: 'A run before work\nFive kilometres, the first time without stopping. A small win.',
    },
  },
  {
    daysAgo: 8,
    at: [18, 30],
    place: 'ba',
    photos: [57, 1047],
    text: {
      sk: 'Služobka do Bratislavy. Po meetingu som sa prešiel Starým Mestom a našiel úzku uličku, ktorú som za desať rokov nevidel.',
      en: 'Work trip to Bratislava. After the meeting I walked through the Old Town and found a narrow street I hadn’t seen in ten years.',
    },
  },
  {
    daysAgo: 9,
    at: [21, 0],
    place: 'danube',
    photos: [16],
    template: 'demo-evening',
    answers: [
      { sk: 'Dunaj večer, svetlá mosta na hladine.', en: 'The Danube at night, the bridge lights on the water.' },
      { sk: 'Že sa netreba báť povedať nie.', en: 'That it’s fine to say no.' },
      { sk: 'Cesta domov vlakom a dobrý podcast.', en: 'The train ride home and a good podcast.' },
    ],
  },
  {
    daysAgo: 10,
    at: [13, 20],
    place: 'bb',
    photos: [429],
    text: {
      sk: 'Posledné maliny zo záhrady. Mama z nich spravila džem, ktorý vydrží do Vianoc. Možno.',
      en: 'The last raspberries from the garden. Mum made jam that will last until Christmas. Maybe.',
    },
  },
  {
    daysAgo: 11,
    at: [16, 45],
    place: 'bb',
    photos: [152],
    text: {
      sk: 'Na balkóne ešte stále kvitnú petúnie. Október sa tvári, že je máj.',
      en: 'The petunias on the balcony are still in bloom. October is pretending to be May.',
    },
  },
  {
    daysAgo: 23,
    at: [10, 5],
    place: 'tatry',
    photos: [1036, 1043, 29],
    starred: true,
    template: 'demo-trip',
    answers: [
      { sk: 'Štrbské Pleso a hore na Popradské.', en: 'Štrbské Pleso and up to Popradské pleso.' },
      { sk: 'Prvý sneh na štítoch, kým sme dole ešte chodili v tričkách.', en: 'The first snow on the peaks while we were still in T-shirts below.' },
    ],
  },
  {
    daysAgo: 24,
    at: [6, 50],
    place: 'rysy',
    photos: [1018, 1016],
    text: {
      sk: 'Výstup na Rysy\nVyšli sme za tmy, na vrchole sme boli s prvým slnkom. Nohy bolia, hlava je čistá.',
      en: 'Climbing Rysy\nWe set off in the dark and reached the top with the first sun. Legs ache, head is clear.',
    },
  },
  {
    daysAgo: 38,
    at: [19, 30],
    place: 'vienna',
    photos: [164, 1060],
    text: {
      sk: 'Víkend vo Viedni. Viac kaviarní ako hodín v dni.',
      en: 'A weekend in Vienna. More cafés than hours in the day.',
    },
  },
  {
    daysAgo: 52,
    at: [15, 10],
    place: 'kosice',
    photos: [1015],
    text: {
      sk: 'Košice s bratom. Prešli sme celú Hlavnú a skončili v čajovni, kde sme sedeli do zatvárania.',
      en: 'Košice with my brother. We walked the whole main street and ended up in a tea room until closing.',
    },
  },
  {
    daysAgo: 66,
    at: [20, 40],
    place: 'bb',
    photos: [360, 106],
    text: {
      sk: 'Narodeniny. Kytica od Lucie a večera, ktorú som si nemusel variť sám.',
      en: 'Birthday. Flowers from Lucia and a dinner I didn’t have to cook myself.',
    },
  },
  {
    daysAgo: 80,
    at: [11, 0],
    place: 'tatry',
    photos: [1039, 15],
    text: {
      sk: 'Vodopády za Popradským plesom. Voda tak studená, že som cítil prsty ešte o hodinu.',
      en: 'The waterfalls past Popradské pleso. Water so cold I could still feel my fingers an hour later.',
    },
  },
];

function isoDaysAgo(days: number, [hours, minutes]: [number, number]): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hours, minutes, 0, 0);
  return toLocalISO(date);
}

function buildTemplates(now: string): Template[] {
  return TEMPLATES.map((tpl) => ({
    id: tpl.id,
    name: pick(tpl.name),
    description: pick(tpl.description),
    icon: tpl.icon,
    fields: tpl.fields.map((label, index) => ({
      id: `${tpl.id}-${index}`,
      label: pick(label),
      multiline: true,
    })),
    createdAt: now,
    updatedAt: now,
    dirty: false,
  }));
}

function buildEntries(templates: Template[]): Entry[] {
  return SPECS.map((spec, index) => {
    const date = isoDaysAgo(spec.daysAgo, spec.at);
    const media: Media[] = (spec.photos ?? []).map((photo) => ({
      id: `demo-photo-${photo}`,
      kind: 'photo',
      uri: '',
      remoteUrl: `https://picsum.photos/id/${photo}/1200/1600`,
      width: 1200,
      height: 1600,
      date,
    }));

    const template = templates.find((tpl) => tpl.id === spec.template);
    const sections = template
      ? template.fields.map((field, i) => ({
          fieldId: field.id,
          label: field.label,
          value: spec.answers?.[i] ? pick(spec.answers[i]) : '',
        }))
      : undefined;

    return {
      id: `demo-${index + 1}`,
      date,
      text: sections ? renderSections(template?.name, sections) : pick(spec.text!),
      templateId: template?.id,
      templateName: template?.name,
      sections,
      media,
      location: spec.place ? { ...PLACES[spec.place] } : undefined,
      tags: [],
      starred: Boolean(spec.starred),
      createdAt: date,
      updatedAt: date,
      dirty: false,
    };
  });
}

/**
 * Opens the screen named by the `-demoRoute /gallery` launch argument, so the
 * capture script reaches every screen without a deep link (which iOS guards
 * with an "Open in Lumen?" prompt).
 */
export function useDemoRoute(ready: boolean): void {
  const router = useRouter();
  useEffect(() => {
    if (!isDemo || !ready) return;
    const route = Settings.get('demoRoute') as string | undefined;
    if (!route) return;
    const timer = setTimeout(() => router.push(route as Href), 300);
    return () => clearTimeout(timer);
  }, [ready, router]);
}

/** Overwrites the local journal with the demo one and fakes a signed-in user. */
export async function seedDemo(): Promise<void> {
  const now = toLocalISO(new Date());
  const templates = buildTemplates(now);

  await repo.wipe();
  await Promise.all([
    repo.saveTemplates(templates),
    repo.saveEntries(buildEntries(templates)),
    repo.saveSettings({ ...DEFAULT_SETTINGS, autoLocation: false }),
  ]);

  useAuth.setState({
    ready: true,
    token: 'demo',
    user: { id: 0, name: 'Demo', email: lang === 'sk' ? 'martin@lumen.app' : 'alex@lumen.app' },
  });
}
