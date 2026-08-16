import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';

import { uid } from '@/lib/id';
import { useJournal } from '@/store/journal';
import type { Entry, EntrySection, Media } from '@/types';

/**
 * Preview data.
 *
 * A 26-entry slice of the real Day One export — same dates, same places, same
 * answers, photos downscaled to 900px — so the layouts can be judged against
 * real content instead of lorem ipsum. This whole file goes away once the real
 * CSV import lands.
 */

const PHOTOS: Record<string, number> = {
  '0be7685e19e63180a7c8a381259b6569': require('../assets/demo/0be7685e19e63180a7c8a381259b6569.jpg'),
  '109cc7536e7fc4626d372d5b4f25f60c': require('../assets/demo/109cc7536e7fc4626d372d5b4f25f60c.jpg'),
  '125159b0d875702c9497156a8dadbd76': require('../assets/demo/125159b0d875702c9497156a8dadbd76.jpg'),
  '1891f5df69dbb36eb287cde24fdffe8f': require('../assets/demo/1891f5df69dbb36eb287cde24fdffe8f.jpg'),
  '208a3d64f17f643db2146dc06cbf5b17': require('../assets/demo/208a3d64f17f643db2146dc06cbf5b17.jpg'),
  '24793697fae1122e676c8bcacc6b6b29': require('../assets/demo/24793697fae1122e676c8bcacc6b6b29.jpg'),
  '33eb802a52c5ebafc7ec46c784f5381c': require('../assets/demo/33eb802a52c5ebafc7ec46c784f5381c.jpg'),
  '3a927d2b24e795aed9cb09acbfb7e0ff': require('../assets/demo/3a927d2b24e795aed9cb09acbfb7e0ff.jpg'),
  '4b3741a537e21e14f75827d19a77a2a7': require('../assets/demo/4b3741a537e21e14f75827d19a77a2a7.jpg'),
  '510b0d6aa936b71a9da65f70c696038a': require('../assets/demo/510b0d6aa936b71a9da65f70c696038a.jpg'),
  '6472b1aaf1ea2698a2415822f21ba7fe': require('../assets/demo/6472b1aaf1ea2698a2415822f21ba7fe.jpg'),
  '7a5024ebf94a7f74118dd40ed4511a73': require('../assets/demo/7a5024ebf94a7f74118dd40ed4511a73.jpg'),
  '7c3bb09b0860c9f7cd668f02f3767964': require('../assets/demo/7c3bb09b0860c9f7cd668f02f3767964.jpg'),
  '7c6ab502e563e0051853c7d0fffcd8a5': require('../assets/demo/7c6ab502e563e0051853c7d0fffcd8a5.jpg'),
  '9da56e92480ecbdc28599e67a72738cc': require('../assets/demo/9da56e92480ecbdc28599e67a72738cc.jpg'),
  'a295a88aaac86d0ed77b14e385ec1f1f': require('../assets/demo/a295a88aaac86d0ed77b14e385ec1f1f.jpg'),
  'a4ee573690151c87c2623f259ccfa1b2': require('../assets/demo/a4ee573690151c87c2623f259ccfa1b2.jpg'),
  'a8dec7a3a8279d9e862a454b2e5c7971': require('../assets/demo/a8dec7a3a8279d9e862a454b2e5c7971.jpg'),
  'a93dcdaf2bbb9fe1b8383e68afb81405': require('../assets/demo/a93dcdaf2bbb9fe1b8383e68afb81405.jpg'),
  'ac770dff7d576fb9410b32a6ff9ea6f7': require('../assets/demo/ac770dff7d576fb9410b32a6ff9ea6f7.jpg'),
  'b7b80b21daf9a7afa62096e4da0748ee': require('../assets/demo/b7b80b21daf9a7afa62096e4da0748ee.jpg'),
  'cb3bdd1318151dc4b5545cdf56fb932d': require('../assets/demo/cb3bdd1318151dc4b5545cdf56fb932d.jpg'),
  'd139fe28339f755d74e580eb5cadbd51': require('../assets/demo/d139fe28339f755d74e580eb5cadbd51.jpg'),
  'd55a24d95626cb98a398bc4aee921644': require('../assets/demo/d55a24d95626cb98a398bc4aee921644.jpg'),
  'e507cf9bdc71dd6f2dceb5839e52b29d': require('../assets/demo/e507cf9bdc71dd6f2dceb5839e52b29d.jpg'),
  'f646a7e2f3d71dfc316a9276a816d361': require('../assets/demo/f646a7e2f3d71dfc316a9276a816d361.jpg'),
};

interface DemoEntry {
  date: string;
  sections: { label: string; value: string }[];
  media: string[];
  location: {
    latitude: number;
    longitude: number;
    placeName?: string;
    localityName?: string;
    administrativeArea?: string;
    country?: string;
  };
}

const DEMO_ENTRIES: DemoEntry[] = [
  {
    date: "2025-08-04T23:10:18.285+02:00",
    sections: [
      { label: "Where I've been...", value: "Doma, Detva, byt" },
      { label: "My mood is...", value: "Supeer. Dnes som sa stretol s Mirom a Nikolasom a bolo fakt super. Do bytu som prišiel okolo 20:30. Zajtra chcem doobedu porobit veci do roboty a potom poobede niekedy by som išiel domov. A v Stredu možno zase pôjdem do bb" },
      { label: "People i saw...", value: "Rodina, Sandra, Miro, Nikolas" },
      { label: "Accomplishments...", value: "Pracoval som, čítal som" },
      { label: "Food i ate...", value: "Pizza, slané, sladké" },
    ],
    media: ["4b3741a537e21e14f75827d19a77a2a7"],
    location: { latitude: 48.737446, longitude: 19.16256, placeName: "Navrat", localityName: "Banská Bystrica", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2025-08-05T23:18:33.623+02:00",
    sections: [
      { label: "Where I've been...", value: "Byt, doma" },
      { label: "My mood is...", value: "Ťažko povedať. Ráno som si bol kúpiť knihu Moderná psychológia a zatiaľ sa mi páči. Potom to ale išlo dole kopcom. Bola chyba pri zákazníckej karte, potom s objednavkami a potom s release na ios. Objednávky som ešte nespravil a dúfam že ráno sa mi to podarí. Ake užil som si tento deň" },
      { label: "People i saw...", value: "Rodina" },
      { label: "Accomplishments...", value: "Pracoval som, čítal som" },
      { label: "Food i ate...", value: "McDonald's, sladké" },
    ],
    media: ["ac770dff7d576fb9410b32a6ff9ea6f7"],
    location: { latitude: 48.352604, longitude: 19.655333, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2025-09-03T22:35:27.333+02:00",
    sections: [
      { label: "Where I've been...", value: "Doma" },
      { label: "My mood is...", value: "Dobre. Včera keď som išiel spať tak som nemal úplne najkrajšie myšlienky, ale myslím si, že mi to pomohlo vlastne aj sa tak uistiť alebo ako, že ja som nezávislá osoba a od nikoho nie som závislý a všetkého som schopný sám, veď som si to dokazoval 19 rokov. Dnes sa chválim za to, že som spravil všetky úlohy na TSV, cvičil som, čítal som a zostavil som si rozvrh so Sandrinou pomocou. Zajtra by som chcel poriadne testovať tie oznámenia, začať študovať meditácie ako pomoc s anxiety a overthinking a to je asi všetko okrem iného" },
      { label: "People i saw...", value: "Rodina" },
      { label: "Accomplishments...", value: "Pracoval som, cvičil som, čítal som" },
      { label: "Food i ate...", value: "Krkovicka so zemiakmi a slaninou, hrozno s parenicou" },
    ],
    media: ["510b0d6aa936b71a9da65f70c696038a"],
    location: { latitude: 48.352604, longitude: 19.655342, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2025-09-04T22:02:41.479+02:00",
    sections: [
      { label: "Where I've been...", value: "Doma" },
      { label: "My mood is...", value: "Super. Nálada sa mi o dosť zlepšila, čo je super. Zase som nič nerobil z notifikacii, lebo mi do toho prišli iné veci. Ale je dobrá správa, že už mám odrobenych 22 hodín. Za September by som chcel aspoň tých 120 hodín, aby som si mohol odložiť 1000 na budúci Firefish. Dnes sa chválim za to, že som toho dosť odrobil, aj že som dosť čítal a cvičil a odolal som sladkemu. Mindfullness som hľadal iba teochu, tak si za to nedám \"bod\", ale dám si také, že by som chcel, aby som si zajtra spravil novú Notion page, kde si to všetko zapisem, lebo to teraz práve čítam" },
      { label: "People i saw...", value: "Rodina, Sandra" },
      { label: "Accomplishments...", value: "Pracoval som, cvičil som, čítal som" },
      { label: "Food i ate...", value: "Mäso so syrom, slaninou a opekanými zemiakmi, paradajková polievka, hrozno, gulicky" },
    ],
    media: ["f646a7e2f3d71dfc316a9276a816d361"],
    location: { latitude: 48.35265, longitude: 19.6554, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2025-10-01T23:49:58.081+02:00",
    sections: [
      { label: "Where I've been...", value: "Škola, byt" },
      { label: "My mood is...", value: "V pohode. Dnes bol bol dobrý deň až na anj. Ale ani to zase nebolo až také zlé. Doobedu som si ju precvicoval a pracoval som. Na obed som si dal pizzu. A na večeru sme si spravili cestoviny. Zajtra idem do školy až na 12:30 ale ideme si dať raňajky do Manuele tak som zvedavý aké to bude" },
      { label: "People i saw...", value: "Sandra" },
      { label: "Accomplishments...", value: "Pracoval som" },
      { label: "Food i ate...", value: "Pizza, paradajková polievka, cestoviny" },
    ],
    media: ["a8dec7a3a8279d9e862a454b2e5c7971"],
    location: { latitude: 48.737247, longitude: 19.16262, placeName: "29. augusta 1498/25", localityName: "Banská Bystrica", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2025-10-02T22:22:56.116+02:00",
    sections: [
      { label: "Where I've been...", value: "Doma, byt" },
      { label: "My mood is...", value: "Super. Škola bola v pohode aj celkovo deň. Na zajtra som si objednal Lego na stavanie popri formulke a verím že spravím všetko čo som si naplánoval" },
      { label: "People i saw...", value: "Rodina, Sandra" },
      { label: "Accomplishments...", value: "Pracoval som" },
      { label: "Food i ate...", value: "Sladké, hranolky, slaný croissant, bebe s mliekom" },
    ],
    media: ["7c3bb09b0860c9f7cd668f02f3767964"],
    location: { latitude: 48.35258, longitude: 19.655361, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2025-11-03T23:21:04.963+01:00",
    sections: [
      { label: "Where I've been...", value: "Škola, byt" },
      { label: "My mood is...", value: "Dobrá. Dnes bol v pohode deň. Až nato že Sandra mala radu o 17 a ja som sa zatiaľ ako debil prechádzal tak som bol úplne vyčerpaný a ani štatistiku sme nerobili... Zajtra sa tomu budeme musieť venovať naplno" },
      { label: "People i saw...", value: "Sandra" },
      { label: "Food i ate...", value: "Vývar, hranolky, koláče" },
    ],
    media: ["7a5024ebf94a7f74118dd40ed4511a73"],
    location: { latitude: 48.737522, longitude: 19.162596, placeName: "Navrat", localityName: "Banská Bystrica", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2025-11-05T23:31:12.855+01:00",
    sections: [
      { label: "Where I've been...", value: "Škola, byt" },
      { label: "My mood is...", value: "Dobrá. Dnes bol dobrý deň. Mali sme len financie a štatistiku. Zajtra to bude horšie. Máme zase prezentáciu z manažmentu, potom možno prezentujem z krypta a nakoniec ešte test zo štatistiky. Verím, že to všetko bude super" },
      { label: "People i saw...", value: "Sandra" },
      { label: "Accomplishments...", value: "Pracoval som" },
      { label: "Food i ate...", value: "Sladké, mäso na hubách so zemiakovými plackami" },
    ],
    media: ["b7b80b21daf9a7afa62096e4da0748ee"],
    location: { latitude: 48.737354, longitude: 19.162588, placeName: "29. augusta 1498/25", localityName: "Banská Bystrica", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2025-12-02T23:08:27.562+01:00",
    sections: [
      { label: "Where I've been...", value: "Škola, byt, vystúpenie" },
      { label: "My mood is...", value: "Dobrá. Nádcha je lepšia než včera, čo je super. Verím, že zajtra to bude ešte lepšie. Škola bola v pohode a poobede som išiel do kostola na Sandrino vystúpenie a potom sme išli na punč" },
      { label: "People i saw...", value: "Sandra" },
      { label: "Food i ate...", value: "Pizza, paradajková polievka, koláč, špagety" },
    ],
    media: ["24793697fae1122e676c8bcacc6b6b29"],
    location: { latitude: 48.73729, longitude: 19.16247, placeName: "29. augusta 1498/25", localityName: "Banská Bystrica", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2025-12-03T23:20:27.025+01:00",
    sections: [
      { label: "Where I've been...", value: "Byt, škola" },
      { label: "My mood is...", value: "V pohode. Nakoniec som na punci nebol, lebo som pochopil že by som tam nemal čo robiť. A Sandra tam bola tak dlho že už rovno ostala na intraku. Ale aspoň som si precvicil svoju časť ma prezentáciu z manažmentu na zajtra a tiež som spravil celý obsah seminarky zo sociológie" },
      { label: "People i saw...", value: "Sandra" },
      { label: "Accomplishments...", value: "Robil som veci do školy" },
      { label: "Food i ate...", value: "Paradajková polievka, trdelnik, chipsy, suchare" },
    ],
    media: ["7c6ab502e563e0051853c7d0fffcd8a5"],
    location: { latitude: 48.737324, longitude: 19.162481, placeName: "29. augusta 1498/25", localityName: "Banská Bystrica", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-01-01T23:10:00.000+01:00",
    sections: [
      { label: "Kde som bol...", value: "Doma" },
      { label: "Čo som robil...", value: "Tak vstal som pred 11 a doobedu som pracoval. Potom som išiel behať a strašne ma boleli pri pistale svaly čiže ďalšie 2 dni budem bez behu. Super. Potom som ešte kus pracoval, čítal a pozrel som si Dumledorove tajomstvá a večer som sa ešte prechádzal popri pozeraní kurzu. Zajtra sa máme ísť korčuľovať tak som zvedavý čo to bude. A tiež bude Vianočná Eisking megasutaz a mohol by som vyhraaat" },
      { label: "Koho som videl...", value: "Rodina" },
      { label: "Čo som dosiahol...", value: "Pracoval som, cvičil som, čítal som, pozeral som kurz Langchain" },
      { label: "Čo som jedol...", value: "Sladké, zemiakový šalát s rezňom, Mana, hrozno" },
      { label: "Príbehový moment dňa...", value: "Ako ma straaasne boleli nohy pri cvičení" },
      { label: "Čo ma dnes potešilo, alebo komu som ja dnes pomohol?", value: "Potešilo ma, že som sa viac držal na uzde s jedením" },
    ],
    media: ["3a927d2b24e795aed9cb09acbfb7e0ff"],
    location: { latitude: 48.35255, longitude: 19.655346, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-01-06T23:17:58.522+01:00",
    sections: [
      { label: "Kde som bol...", value: "Doma" },
      { label: "Čo som robil...", value: "Zobudil som sa už o pol 10 a keďže som mal mobil mimo dosah, tak ešte v posteli som čítal aj pozeral kurz. Potom som sa učil sociológiu a naučil som sa 3 témy. Potom som už bol na mobile. Ďalej som išiel behať. Potom skm išiel kus von, následne som si pozrel Spark video a spravil som si špagety. A večer som ešte pracoval a pozrel som si ešte jedno Spark video. A už asi od 15 sneží a teda že dosť. Ešte asi do 4 má snežiť a ak to bude takýmto tempom tak ráno bude dosť snehu. A ešte pred 9 musím odísť z domu aby som bol v škole najneskôr o 9:45" },
      { label: "Koho som videl...", value: "Rodinu" },
      { label: "Čo som dosiahol...", value: "Pracoval som, cvičil som, čítal som, pozeral som kurz Langchain, učil som sa sociológiu" },
      { label: "Čo som jedol...", value: "Proteín, proteínová tycinka, špagety" },
      { label: "Príbehový moment dňa...", value: "Rannajsia produktivita" },
      { label: "Jedna vec, ktorú som sa dnes naučil...", value: "Aký veľký je rozdiel keď ráno hneď nechytim mobil do ruky" },
      { label: "Čo ma dnes potešilo, alebo komu som ja dnes pomohol?", value: "Potešilo na ako sneziii" },
    ],
    media: ["6472b1aaf1ea2698a2415822f21ba7fe"],
    location: { latitude: 48.35254, longitude: 19.655298, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-02-01T23:40:44.239+01:00",
    sections: [
      { label: "Kde som bol...", value: "Doma" },
      { label: "Čo som robil...", value: "Ráno po krupici som išiel ocinovi vyzdvihnúť veci do Alzaboxu a dobrá je tá ps5, ale tak na chvíľku. Aj som pracoval a začal som robiť ai sumarizacie produktov a verím tomu, že to pomôže pri vyhľadávaní" },
      { label: "Koho som videl...", value: "Rodinu" },
      { label: "Čo som dosiahol...", value: "Pracoval som, cvičil som, čítal som, pozeral som kurz Langgraph" },
      { label: "Čo som jedol...", value: "krupica, vývar, mäso s ryžou a omáčkou, muffiny" },
      { label: "Príbehový moment dňa...", value: "Setup ps5" },
      { label: "Jedna vec, ktorú som sa dnes naučil...", value: "Tento rok mal byť o tom prevziať nad sebou kontrolu ale zatiaľ to tak nevyzerá" },
      { label: "Čo ma dnes potešilo, alebo komu som ja dnes pomohol?", value: "Potešil ma unboxing ps5" },
    ],
    media: ["d55a24d95626cb98a398bc4aee921644"],
    location: { latitude: 48.352577, longitude: 19.655378, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-02-04T23:29:58.993+01:00",
    sections: [
      { label: "Kde som bol...", value: "Doma" },
      { label: "Čo som robil...", value: "Ráno klasika, potom som pracoval, čítal a pozeral kurz. Poobede som išiel starkej pomôcť s mikrovlnkou a tak. Večer sme si ešte zostavovali ideálny rozvrh a verím tomu, že sa nám to zajtra podarí" },
      { label: "Koho som videl...", value: "Rodinu, Sandru" },
      { label: "Čo som dosiahol...", value: "Pracoval som, cvičil som, čítal som, pozeral som kurz Langgraph" },
      { label: "Čo som jedol...", value: "Sladké, proteinovy jogurt x2, zeleninová polievka, vyprážaný syr s hranolkami, hrozno s parenicou" },
      { label: "Príbehový moment dňa...", value: "Integrovanie ai na web" },
      { label: "Čo ma dnes potešilo, alebo komu som ja dnes pomohol?", value: "Potešil ma večerný hovor so Sandrou" },
    ],
    media: ["d139fe28339f755d74e580eb5cadbd51"],
    location: { latitude: 48.352547, longitude: 19.655352, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-03-01T23:06:21.146+01:00",
    sections: [
      { label: "Kde som bol...", value: "Doma, byt" },
      { label: "Čo som robil...", value: "Doobedu som deployoval life app a aj sa mi to podarilo, potom som išiel do bb, tam som ešte pozmyval, pozrel si kus Eiskingu a pracoval. Potom okolo 20 prišla Sandra a pred 22 som ju išiel odviezť na intrak. A teraz o 23 ešte pracujem" },
      { label: "Koho som videl...", value: "Rodinu, Sandru, Sandrinu rodinu" },
      { label: "Čo som dosiahol...", value: "Pracoval som, pozeral som kurz Langgraph" },
      { label: "Čo som jedol...", value: "Sladké, krupica, vývar, mäso s ryžou a omáčkou, hurik so zemiakmi" },
      { label: "Príbehový moment dňa...", value: "Ako mi Sandra rozprávala zážitky" },
      { label: "Jedna vec, ktorú som sa dnes naučil...", value: "Retry policy v Langgraph" },
      { label: "Čo ma dnes potešilo, alebo komu som ja dnes pomohol?", value: "Potešilo ma koľko som zarobil za Február" },
    ],
    media: ["125159b0d875702c9497156a8dadbd76"],
    location: { latitude: 48.737267, longitude: 19.16251, placeName: "29. augusta 1498/25", localityName: "Banská Bystrica", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-03-02T22:59:45.535+01:00",
    sections: [
      { label: "Kde som bol...", value: "Byt, škola" },
      { label: "Čo som robil...", value: "Do 11:25 sme boli v škole, potom sme išli do bytu, potom išla Sandra na ŠR, potom som jej išiel oproti a potom sme išli na spev a ja som sa zatiaľ prechádzal a počúval ai podcast" },
      { label: "Koho som videl...", value: "Sandru" },
      { label: "Čo som dosiahol...", value: "Pracoval som" },
      { label: "Čo som jedol...", value: "Sladké, proteinovy jogurt, vývar, mäso s ryžou a omáčkou, gulicky" },
      { label: "Príbehový moment dňa...", value: "Prechádzanie sa kým bola Sandra na speve" },
      { label: "Jedna vec, ktorú som sa dnes naučil...", value: "Kam možno chcem smerovať toho ai agenta čo robím" },
      { label: "Čo ma dnes potešilo, alebo komu som ja dnes pomohol?", value: "Odprevadil som Sandru na spev" },
    ],
    media: ["0be7685e19e63180a7c8a381259b6569"],
    location: { latitude: 48.737274, longitude: 19.162502, placeName: "29. augusta 1498/25", localityName: "Banská Bystrica", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-04-01T23:33:00.000+02:00",
    sections: [
      { label: "Kde som bol...", value: "Byt, škola, intrak" },
      { label: "Čo som robil...", value: "Na anj budeme nakoniec prezentovať až o týždeň, a potom sme boli až na filozofii takže tak. Potom sme išli na intrak pre veci a do bytu. Potom sem prišiel aj Sandrin ocino sa najesť a odišli okolo 20. A už som toho veľa nespravil. Zajtra idem okolo 10 domov a dnes ma veľmi zaujala Kia K4" },
      { label: "Koho som videl...", value: "Sandru" },
      { label: "Čo som dosiahol...", value: "Pracoval som" },
      { label: "Čo som jedol...", value: "Alfredo cestoviny, rezeň so zemiakmi, sladké" },
      { label: "Príbehový moment dňa...", value: "Večer" },
    ],
    media: ["e507cf9bdc71dd6f2dceb5839e52b29d"],
    location: { latitude: 48.737453, longitude: 19.162502, placeName: "Damirol", localityName: "Banská Bystrica", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-04-02T23:33:00.000+02:00",
    sections: [
      { label: "Kde som bol...", value: "Doma, byt" },
      { label: "Čo som robil...", value: "Okolo 10 som odchádzal z bytu a potom doma som kus pracoval ale väčšinu som bol s rodičmi. A s ocinom som mal už aj serioznejsiu debatu a aute a vyzerá to byť reálnejšie s Kiou K4, tak som zvedavý" },
      { label: "Koho som videl...", value: "Rodinu" },
      { label: "Čo som dosiahol...", value: "Pracoval som" },
      { label: "Čo som jedol...", value: "Špagety, proteinovy drink, rožok, sladké" },
      { label: "Príbehový moment dňa...", value: "Bytie s rodičmi" },
    ],
    media: ["109cc7536e7fc4626d372d5b4f25f60c"],
    location: { latitude: 48.352562, longitude: 19.655348, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-05-01T23:01:00.000+02:00",
    sections: [
      { label: "Kde som bol...", value: "Doma" },
      { label: "Čo som robil...", value: "Skoro celý deň som sa učil podnikove. A prešiel som si skoro všetko. A bol som aj v obchode a pre starku. Zajtra ideme k babke takže sa toho veľa nenaucim ake verím že aspoň niečo sa mi podarí. A večer išla po 5 týždňoch formulkaaa" },
      { label: "Koho som videl...", value: "Rodinu" },
      { label: "Čo som dosiahol...", value: "Pracoval som, učil som sa" },
      { label: "Čo som jedol...", value: "Pizzu, zmrzlinu" },
      { label: "Príbehový moment dňa...", value: "Pozeranie formulky" },
      { label: "Čo ma dnes potešilo, alebo komu som ja dnes pomohol?", value: "Potešilo ma že som sa toľko naučil" },
    ],
    media: ["a93dcdaf2bbb9fe1b8383e68afb81405"],
    location: { latitude: 48.352623, longitude: 19.655346, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-05-02T23:13:00.000+02:00",
    sections: [
      { label: "Kde som bol...", value: "Doma, babka" },
      { label: "Čo som robil...", value: "Okolo pol 10 sme odchádzali k babke, prišli sme okolo 12. Poobede sme išli do fantázia park či ako sa to volá a tam bolo super. Potom sme sa ešte vrátili a domov sme prišli okolo 20. Pozrel som si formulky a to je tak všetko. Zajtra sa môžem učiť a učit. A už som dal 1000km na aute" },
      { label: "Koho som videl...", value: "Rodinu" },
      { label: "Čo som dosiahol...", value: "Učil som sa" },
      { label: "Čo som jedol...", value: "Všetko možné, vývar, maďarský guláš, korbaciky, pizza" },
    ],
    media: ["a295a88aaac86d0ed77b14e385ec1f1f"],
    location: { latitude: 48.35258, longitude: 19.655508, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-06-01T23:02:59.178+02:00",
    sections: [
      { label: "Kde som bol...", value: "Doma" },
      { label: "Čo som robil...", value: "Doobedu som pracoval a bol som reklamovať ústnu sprchu a vrátil som novú lampu čo som si kúpil minulý týždeň, potom poobede som dopozeral Rivalov a pracoval som a potom som ešte s mamkou išiel do drogerie" },
      { label: "Koho som videl...", value: "Rodinu" },
      { label: "Čo som dosiahol...", value: "Pracoval som, čítal som" },
      { label: "Čo som jedol...", value: "Sladké, špagety, hrozno s parenicou" },
      { label: "Príbehový moment dňa...", value: "Pozeranie rivalov" },
    ],
    media: ["a4ee573690151c87c2623f259ccfa1b2"],
    location: { latitude: 48.35255, longitude: 19.655382, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-06-02T23:16:20.786+02:00",
    sections: [
      { label: "Kde som bol...", value: "Doma" },
      { label: "Čo som robil...", value: "Doobedu som pracoval, potom sme boli na obede, poobede som zase pracoval, išiel som s mamkou kúpiť priesady a tak. Nič viac k tomuto dňu nemám" },
      { label: "Koho som videl...", value: "Rodinu" },
      { label: "Čo som dosiahol...", value: "Pracoval som, čítal som" },
      { label: "Čo som jedol...", value: "Sladké, mäso s ryžou a omáčkou a hranolkami, kura s ryžou" },
      { label: "Príbehový moment dňa...", value: "Obed" },
    ],
    media: ["208a3d64f17f643db2146dc06cbf5b17"],
    location: { latitude: 48.35255, longitude: 19.65537, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-07-02T23:11:00.000+02:00",
    sections: [
      { label: "Kde som bol...", value: "Doma" },
      { label: "Čo som robil...", value: "Doobedu práca a išli sme pre starku, potom obed, práca a tak. Už mi aj prišlo Temu, dron a fukar ale nešiel som si pre to lebo si to chcem rozbaliť cez formulky" },
      { label: "Koho som videl...", value: "Rodinu, Sandru" },
      { label: "Čo som dosiahol...", value: "Pracoval som, čítal som" },
      { label: "Čo som jedol...", value: "Sladké, špagety bolognese, proteinovy puding, mäso s ryžou a omáčkou" },
      { label: "Príbehový moment dňa...", value: "Obed" },
    ],
    media: ["33eb802a52c5ebafc7ec46c784f5381c"],
    location: { latitude: 48.352554, longitude: 19.65537, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-07-03T23:31:00.000+02:00",
    sections: [
      { label: "Kde som bol...", value: "Doma" },
      { label: "Čo som robil...", value: "Doobedu som pracoval a išiel pre starku a pre všetky balíky, potom som robil špagety a pri formulke som si rozbalil všetky balíky a som zvedavý ako to bude s dronom ale je to super zatiaľ len si musím tie doklady vybaviť. A je sprintovy vikend v Silverstone a Lewis vyhral sprintovu kvalifikaciuuuu" },
      { label: "Koho som videl...", value: "Rodinu" },
      { label: "Čo som dosiahol...", value: "Pracoval som" },
      { label: "Čo som jedol...", value: "Zmrzlina, sladké, špagety, cereálie s mliekom" },
      { label: "Príbehový moment dňa...", value: "Formulkyyy" },
    ],
    media: ["9da56e92480ecbdc28599e67a72738cc"],
    location: { latitude: 48.352554, longitude: 19.65537, placeName: "Pivovarská 208/8", localityName: "Vidiná", administrativeArea: "Banská Bystrica", country: "Slovakia" },
  },
  {
    date: "2026-08-01T23:55:56.146+02:00",
    sections: [
      { label: "Kde som bol...", value: "Dovolenka" },
      { label: "Čo som robil...", value: "Okolo pol 12 sme prišli k moru, bol som tam do cca 17:30. Večer sme ešte išli na večeru a ocino sa na mňa nahneval" },
      { label: "Koho som videl...", value: "Rodinu" },
      { label: "Čo som jedol...", value: "Cereálie s mliekom, pizza, sladké" },
    ],
    media: ["1891f5df69dbb36eb287cde24fdffe8f"],
    location: { latitude: 45.64984, longitude: 13.097098, placeName: "Camping Village Pino Mare", localityName: "Lignano Sabbiadoro", administrativeArea: "Friuli-Venezia Giulia", country: "Italy" },
  },
  {
    date: "2026-08-02T23:03:00.000+02:00",
    sections: [
      { label: "Kde som bol...", value: "Dovolenka" },
      { label: "Čo som robil...", value: "Okolo 12 sme prišli k moru, bol som tam asi do pol 18, potom som dal sprchu, pobalil som sa a večer sme išli na večeru. A zákona doobedu konečne odchádzame domov. Ale bolo tu dobre až na to teplo a komáre" },
      { label: "Koho som videl...", value: "Rodinu, Sandru" },
      { label: "Čo som jedol...", value: "Pizza, cereálie s mliekom, croissant, sladké" },
    ],
    media: ["cb3bdd1318151dc4b5545cdf56fb932d"],
    location: { latitude: 45.649612, longitude: 13.09706, placeName: "Camping Village Pino Mare", localityName: "Lignano Sabbiadoro", administrativeArea: "Friuli-Venezia Giulia", country: "Italy" },
  },
];
const DEMO_DIR = 'demo-media';

/** Bundled asset → a real file:// uri, so demo media behaves exactly like picked media. */
async function materialise(md5: string): Promise<Media | null> {
  try {
    const dir = new Directory(Paths.document, DEMO_DIR);
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });

    const target = new File(dir, `${md5}.jpg`);
    if (!target.exists) {
      const asset = Asset.fromModule(PHOTOS[md5]);
      await asset.downloadAsync();
      if (!asset.localUri) return null;
      await new File(asset.localUri).copy(target);
    }

    return { id: uid(), kind: 'photo', uri: target.uri, md5, remoteKey: null };
  } catch (err) {
    console.warn('[lumen] demo photo failed', md5, err);
    return null;
  }
}

/**
 * Fills an empty journal with the preview slice. No-op if entries already
 * exist, so it can never overwrite real writing.
 */
export async function seedDemoData(): Promise<number> {
  const store = useJournal.getState();
  if (store.entries.length) return 0;

  const template = store.templates.find((t) => t.name === 'Daily Self');

  const entries: Entry[] = [];
  for (const demo of DEMO_ENTRIES) {
    const media = (await Promise.all(demo.media.map(materialise))).filter(
      (item): item is Media => item !== null
    );

    const sections: EntrySection[] = demo.sections.map((section) => {
      const match = template?.fields.find((f) => f.label === section.label);
      return {
        fieldId: match?.id ?? section.label,
        label: section.label,
        value: section.value,
      };
    });

    entries.push({
      id: uid(),
      date: demo.date,
      text: ['Daily Self', ...demo.sections.flatMap((s) => [s.label, s.value])].join('\n'),
      templateId: template?.id,
      templateName: 'Daily Self',
      sections,
      media,
      location: { ...demo.location, auto: true },
      tags: [],
      starred: false,
      createdAt: demo.date,
      updatedAt: demo.date,
    });
  }

  await store.replaceAll(entries);
  return entries.length;
}
