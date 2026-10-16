# Lumen — App Store Connect

Všetko, čo treba vyplniť pre verziu 1.1.0. Texty sú pripravené na skopírovanie; limity znakov sú overené.

Primárny jazyk: **English (U.S.)**, pridaná lokalizácia **Slovak**.

---

## 1. App Information

| Pole | Hodnota |
| --- | --- |
| Name (EN) | `Lumen: Private Journal` |
| Name (SK) | `Lumen: Súkromný denník` |
| Subtitle (EN) | `Your days, in your words` |
| Subtitle (SK) | `Tvoje dni, tvojimi slovami` |
| Bundle ID | `com.martinbalaz.lumen` |
| Primary Category | Lifestyle |
| Secondary Category | Productivity |
| Content Rights | No, it does not contain, show, or access third-party content |
| Age Rating | všetko „None“ / „No“ → **4+** (obsah je súkromný, nikto iný ho nevidí, nie je to sociálna sieť) |

Samotné „Lumen“ je v App Store skoro určite obsadené, preto názov s dovetkom. Ak niektorý neprejde, skús `Lumen Journal` / `Lumen — denník`.

## 2. Pricing and Availability

- Price: **Free**
- Availability: všetky krajiny (alebo len tie, kde chceš)
- iPad: appka je len pre iPhone (`supportsTablet: false`), iPad screenshoty netreba

## 3. App Privacy

**Privacy Policy URL:** `https://lumen-api.kinger.dev/privacy`

**Do you or your third-party partners collect data from this app?** Yes

| Data type | Use | Linked to user | Tracking |
| --- | --- | --- | --- |
| Contact Info → **Email Address** | App Functionality | Yes | No |
| Contact Info → **Name** | App Functionality | Yes | No |
| User Content → **Photos or Videos** | App Functionality | Yes | No |
| User Content → **Other User Content** (zápisky) | App Functionality | Yes | No |
| Location → **Precise Location** | App Functionality | Yes | No |
| Identifiers → **User ID** | App Functionality | Yes | No |

Všetko ostatné (Health, Financial, Browsing, Search History, Diagnostics, Usage Data, Contacts…) → nezbierané. Face ID a PIN zostávajú v telefóne, preto sa neuvádzajú.

## 4. App Review Information

- **Sign-in required:** Yes
- **User name / Password:** demo účet zo servera (`php artisan lumen:user`) — vyplň sám, sem ho nepíš
- **Contact:** tvoje meno, telefón, e-mail
- **Notes:**

```
Lumen is a private journal. Entries, photos and places are synced to the developer's own server so they are backed up and available on a new phone.

Sign-in: use the demo account above (email + password), or "Continue with Apple". The demo account already contains sample entries with photos, places and a template.

Account deletion: Settings → Delete Account. It permanently deletes the account, entries, photos and templates on the server and revokes Sign in with Apple.

Optional permissions, all requested only when the feature is used:
- Location: saves where a new entry was written, shown on the Map tab. Can be turned off in Settings → Automatic Location.
- Photos / Camera: to attach photos and videos to an entry (PHPicker, no full library access).
- Face ID: unlocks the journal when a passcode is set in Settings.

No ads, no tracking, no analytics, no in-app purchases.
```

## 5. Export Compliance

V `app.json` je `ITSAppUsesNonExemptEncryption: false` → otázka sa pri builde nezobrazí. (Appka používa len HTTPS a šifrovanie systému.)

## 6. URLs

| Pole | Hodnota |
| --- | --- |
| Support URL | `https://lumen-api.kinger.dev/support` |
| Privacy Policy URL | `https://lumen-api.kinger.dev/privacy` |
| Marketing URL | (nechaj prázdne) |
| Copyright | `2026 Martin Baláž` |

Stránky si samé vyberú jazyk podľa prehliadača; `?lang=sk` / `?lang=en` ho vynúti.

---

## 7. Version 1.1.0 — English (U.S.)

**Promotional Text** (max 170)

```
A quiet place for your days. Write, add photos and places, and watch your streak grow — private, backed up, and locked behind Face ID when you want it to be.
```

**Description** (max 4000)

```
Lumen is a private journal for the days you want to remember. Write a few lines or a few pages, add the photos from that day, and Lumen keeps the date and place for you.

YOUR DAYS, IN YOUR WORDS
• Write freely, or start from a template like Evening Reflection, Gratitude or Trip
• Add photos and videos to any entry
• Mark the entries that matter as favorites
• Search everything you’ve ever written

SEE WHERE IT HAPPENED
• Every new entry remembers where you wrote it
• The Map shows your journal across cities, trips and favorite places
• Change or remove the place anytime

PHOTOS BY THE DAYS YOU LIVED
• A gallery ordered by day, not by album
• Open any photo full screen and jump to the entry it belongs to

SMALL STEPS, DAY BY DAY
• A streak that counts the days you wrote
• A quiet celebration when you keep it going
• Stats for entries, photos and places

PRIVATE BY DESIGN
• Lock the journal with a passcode and Face ID
• With a passcode, your entries are hidden in the app switcher
• No ads, no tracking, no analytics
• Your entries are backed up to your account, so a new phone doesn’t mean a lost journal
• Works offline and syncs when you’re back online
• Delete your account and all its data anytime, right in the app

Lumen is available in English and Slovak.
```

**Keywords** (max 100, bez medzier za čiarkou)

```
diary,daily,memories,gratitude,reflection,mood,notes,photos,travel,log,streak,writing,private,map
```

**Support URL:** `https://lumen-api.kinger.dev/support?lang=en`

**Screenshots (iPhone 6.9"):** `appstore/screenshots/en/1-journal.png` … `6-settings.png` (v tomto poradí)

---

## 8. Version 1.1.0 — Slovak

**Propagačný text** (max 170)

```
Tiché miesto pre tvoje dni. Píš, pridávaj fotky a miesta a sleduj, ako rastie tvoja séria — súkromne, so zálohou a pod zámkom Face ID, keď chceš.
```

**Popis** (max 4000)

```
Lumen je súkromný denník pre dni, ktoré si chceš zapamätať. Napíš pár riadkov alebo pár strán, pridaj fotky z toho dňa a Lumen si dátum aj miesto zapamätá za teba.

TVOJE DNI, TVOJIMI SLOVAMI
• Píš voľne alebo začni zo šablóny – Večerné ohliadnutie, Vďačnosť, Výlet
• Ku každému zápisku pridaj fotky a videá
• Dôležité zápisky si označ ako obľúbené
• Vyhľadávaj vo všetkom, čo si kedy napísal

POZRI SA, KDE SA TO STALO
• Každý nový zápisok si zapamätá, kde vznikol
• Mapa ukáže tvoj denník naprieč mestami, výletmi a obľúbenými miestami
• Miesto môžeš kedykoľvek zmeniť alebo odstrániť

FOTKY PODĽA DNÍ, KTORÉ SI PREŽIL
• Galéria zoradená podľa dní, nie albumov
• Otvor fotku na celú obrazovku a prejdi na zápisok, ku ktorému patrí

MALÉ KROKY, DEŇ PO DNI
• Séria, ktorá počíta dni, keď si písal
• Malá oslava, keď v nej vydržíš
• Prehľad zápiskov, fotiek a miest

SÚKROMIE NA PRVOM MIESTE
• Zamkni denník PIN kódom a Face ID
• S PIN kódom sa zápisky nezobrazia ani v prepínači appiek
• Žiadne reklamy, sledovanie ani analytika
• Zápisky sa zálohujú do tvojho účtu, takže nový telefón neznamená stratený denník
• Funguje aj offline a zosynchronizuje sa, keď budeš znova online
• Účet aj všetky dáta môžeš kedykoľvek zmazať priamo v appke

Lumen je po slovensky aj po anglicky.
```

**Kľúčové slová** (max 100)

```
denník,diár,zápisky,spomienky,vďačnosť,nálada,poznámky,fotky,výlety,mapa,séria,písanie,súkromný
```

**Support URL:** `https://lumen-api.kinger.dev/support?lang=sk`

**Screenshoty (iPhone 6.9"):** `appstore/screenshots/sk/1-journal.png` … `6-settings.png`

---

## 9. Pred odoslaním

- [ ] Nastaviť `LUMEN_CONTACT_EMAIL` v Coolify (zobrazí sa na /privacy a /support)
- [ ] Demo účet na serveri s pár zápiskami + fotkami, údaje do App Review Information
- [ ] Nový build s `supportsTablet: false` (`eas build --platform ios --profile production --auto-submit`)
- [ ] V Build sekcii verzie vybrať ten nový build
- [ ] Skontrolovať, že /privacy a /support sa otvoria
- [ ] Submit for Review
