# Lumen

Osobný denník — náhrada za Day One. Expo (SDK 57) + expo-router + TypeScript, dark mode only.

## Spustenie

```bash
npm install
npx expo run:ios      # dev build (react-native-maps potrebuje natívny build, Expo Go nestačí)
npx expo run:android
```

## Čo appka vie

| Obrazovka | Súbor | Popis |
|---|---|---|
| Denník | `app/(tabs)/index.tsx` | Zoznam zápiskov po dňoch — dátum vľavo, začiatok textu v strede, fotka vpravo. Vyhľadávanie. |
| Galéria | `app/(tabs)/gallery.tsx` | Mriežka fotiek zoradená podľa dátumu (Dni / Mesiace), s dátumom na dlaždiciach. |
| Mapa | `app/(tabs)/map.tsx` | Klastrované piny s počtom zápiskov; ťuknutie otvorí zoznam zápiskov z daného miesta. |
| Nastavenia | `app/(tabs)/settings.tsx` | PIN, biometria, automatická poloha, šablóny, ukážkové dáta. |
| Zápisok | `app/entry/[id].tsx`, `app/entry/edit.tsx` | Čítanie a písanie. Editovateľný dátum aj čas, fotky, miesto. |
| Miesto | `app/entry/location-picker.tsx` | Posúvanie mapy pod fixným pinom + ručný názov miesta. |
| Prehliadač | `app/viewer.tsx` | Fullscreen fotka/video, dátum je stále na obrazovke. |
| Šablóny | `app/templates/` | Vlastné sady otázok, pod ktorými sa píše zápisok. |
| Zámok | `components/LockScreen.tsx` | PIN (SHA-256 + salt v SecureStore) a Face ID. |

## Architektúra

```
app/            expo-router obrazovky
components/     zdieľané UI (ui.tsx = primitívy, EntryCard, PinPad, LockScreen)
lib/            date, location, media, storage, templates, id, demo
store/          zustand — journal (dáta), editor (rozpísaný zápisok), lock (PIN)
theme/          všetky farby, spacing, typografia, dark map style
types/          dátový model
```

**Dátový model** (`types/index.ts`) je zámerne nadmnožinou Day One CSV exportu — `date`,
`text`, `location`, `weather`, `mediaMD5s` aj `meta.dayOneUuid` — takže import
neskôr mapuje 1:1 a nič sa nestratí.

## Cloudflare R2 — kam patria kľúče

Krátko: **do appky nie, na server áno.**

Expo vkladá každú `EXPO_PUBLIC_*` premennú priamo do JS bundle. Ktokoľvek si vie
rozbaliť `.ipa` alebo `.apk` a prečítať ju, takže R2 `Access Key ID` a
`Secret Access Key` by v mobilnej appke boli verejné.

| Hodnota | Kam patrí | Kde konkrétne |
|---|---|---|
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | **len server** | Coolify → Environment Variables (lokálne `.env` v `lumen-api`) |
| `R2_ENDPOINT`, `R2_BUCKET`, `DB_PASSWORD`, `APP_KEY` | **len server** | to isté |
| `EXPO_PUBLIC_API_URL` | appka | `.env` (podľa `.env.example`) |
| `EXPO_PUBLIC_MEDIA_BASE_URL` | appka, len ak je bucket verejný | `.env` |
| API token appky | appka, ale **nie** do `.env` | `expo-secure-store` po prihlásení |

```bash
cp .env.example .env   # appka — len URL nášho API
```

Server je samostatné repo: **`~/www/laravel_projects/lumen-api`**. Tam sa
kopíruje `.env.example` → `.env` a tam idú reálne R2 kľúče.

V oboch projektoch je `.env` v `.gitignore`; commituje sa len `.env.example`.

### Ako tečú dáta

Fotky nikdy neprechádzajú cez Laravel — server iba podpisuje URL:

```
1. appka   →  POST /api/media/presign  { filename, mime }
2. Laravel →  Storage::disk('r2')->temporaryUploadUrl(...)   →  { url, key }
3. appka   →  PUT <url> + bajty                              →  R2
4. appka   →  POST /api/media  { key, entry_id, width, height }
5. Laravel →  uloží riadok do DB
```

Čítanie funguje naopak: server vráti podpísané GET URL platné hodinu,
`expo-image` si ich cachuje. Vďaka tomu nerieši PHP `upload_max_filesize`,
VPS neplatí za prenos a R2 nemá egress poplatky.

R2 kľúče tak neopustia server. Appka sa autentifikuje jedným Sanctum tokenom —
keďže ju používaš len ty, viac netreba.

Konfiguráciu appky číta `lib/config.ts`.

Server je **samostatný projekt** v `~/www/laravel_projects/lumen-api` (Laravel 13,
Sanctum, sync endpointy, importér z Day One) — nie podpriečinok tohto repa.
Detaily v jeho vlastnom `README.md`.

### Nasadenie na Coolify

Postup je v README projektu `lumen-api` — Postgres ako resource, aplikácia
z repa `lumen-api` cez **Dockerfile**, kľúče do Environment Variables, port 8080.

## Čo ešte chýba

Server stojí a je otestovaný, appka s ním zatiaľ nekomunikuje:

1. **`lib/storage.ts`** — jediná perzistentná hranica appky. Dnes AsyncStorage;
   treba doplniť API klienta a sync slučku (pull podľa `updatedAt`, push lokálnych
   zmien). Obrazovky s ňou už komunikujú asynchrónne, takže sa nič iné nemení.
2. **`Media.remoteKey`** (`types/index.ts`) — dnes vždy `null`. Treba napojiť tok
   presign → PUT do R2 → potvrdenie. `lib/media.ts` už kopíruje súbory do document
   dir, čo je presne zdroj pre upload.
3. **Prihlásenie v appke** — obrazovka na `POST /api/login` a uloženie tokenu do
   `expo-secure-store`.
4. **Ostrý import** — spustiť `lumen:import-dayone` na serveri s celým exportom
   (s médiami). Postup je v README projektu `lumen-api`.

## Šablóny

Appka si šablóny nevytvára — vlastní ich server a prídu prvým synchronizovaním.
Keby si ich seedovala aj lokálne, tá istá sada otázok by existovala pod dvomi
rôznymi id a po prihlásení by si ju videl dvakrát.
