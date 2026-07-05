# Prompt 020 – Auto-Queue (Automatická fronta příspěvků)

## ⚠️ STRIKTNÍ PRAVIDLA SPOLUPRÁCE (Nejvyšší priorita)

1. **VÝBĚR ÚKOLU A DOPORUČENÍ:**
   Před zahájením jakékoliv práce se mě VŽDY zeptej, kterým konkrétním krokem z plánu v `ukol.md` chceme začít. Ke své otázce vždy připoj stručné doporučení, který krok je teď nejlogičtější a proč.

2. **JEDEN KROK AT A TIME (Krokování):**
   Vždy proveď POUZE ten jeden vybraný nebo schválený krok. Jakmile daný krok naprogramuješ, OKAMŽITĚ ZASTAV PRÁCI, nepokračuj na další bod a zeptej se mě, jak chceme pokračovat. Nikdy nedělej více kroků najednou!

3. **TESTOVÁNÍ PŘED ZÁPISEM:**
   Po dokončení kroku vždy vyčkej na mé manuální otestování v prohlížeči/aplikaci. Teprve až ti výslovně napíšu, že je krok otestovaný a funkční, provedeš tyto dvě administrativní věci:
   - Označíš daný krok v `ukol.md` jako hotový (např. odškrtnutím [x] nebo ✅).
   - Zepíšeš stručný záznam o této změně do souboru `CHANGELOG.md`.
   (Dříve než po mém schválení do těchto souborů stav nedopisuj!)

4. **GIT COMMIT (Automaticky po schválení Kroku 3):**
   Jakmile dokončíš Krok 3 (vše je otestované, ✅ v `ukol.md`, záznam v `CHANGELOG.md`), **automaticky sám provedeš `git add` + `git commit`** aktuálního stavu. Tím se trvale zachová i případný záznam, který v budoucnu propadne prořezáním `CHANGELOG.md` (Pravidlo 6) – historie zůstává v Gitu a nic se neztratí. Po commitu se zastav a zeptej se mě, jak chceme pokračovat (dle Pravidla 2). **Neprováděj `git push`** – ten dělá výhradně uživatel sám.

5. **ÚSPORA KONTEXTU A LIMIT 81 920 TOKENŮ:**
   Pracujeme s lokálním modelem (Ornith) a máme tvrdý limit kontextového okna přesně **81 920 tokenů**. Pro ochranu před přehlcením paměti:
   - Buď ve svých odpovědích maximálně věcný a stručný (žádné dlouhé úvahy okolo, rovnou ukaž kód nebo položenou otázku).
   - Nečti zbytečně celé obří soubory, pokud v nich potřebuješ najít jen jednu funkci – používej cílené vyhledávání nebo čti jen relevantní řádky.
   - Udržuj kontext čistý: po dokončení kroku se soustřeď výhradně na aktuální bod z `ukol.md` a netahej do paměti starý kód z již hotových částí, pokud to není nezbytně nutně nutné.
   - Poznámka: staré záznamy, které propadnou prořezáním `CHANGELOG.md` (Pravidlo 6), nejsou ztraceny – zůstávají zachovány v Git history díky automatickému commitu v Kroku 4.

6. **AUTOMATICKÉ PROŘEZÁVÁNÍ CHANGELOGU (Zero-Token Auto-Drop):**
   Soubor `CHANGELOG.md` smí obsahovat STRIKTNĚ MAXIMÁLNĚ 10 nejnovějších časových záznamů/milníků. Pokaždé, když po manuálním schválení uživatelem (Pravidlo 3) zapíšeš nový záznam na začátek `CHANGELOG.md`, zkontroluješ celkový počet záznamů v tomto souboru. Pokud přidáním nového záznamu celkový počet překročí 10, ten úplně nejstarší záznam ze dna `CHANGELOG.md` JEDNODUŠE SMAŽ (odstraň ze souboru). Žádný archivní soubor neotevírej, nečti ani nevytvářej – stará historie zůstává trvale v Gitu (zachráněna committem v Kroku 4) a my tímto šetříme 100 % kontextových tokenů pro programování.

---

## Kontext analýzy

### Aktuální stav
- **Tabulka `users`** už obsahuje preference: `timezone`, `time_format`, `start_of_week`, `default_posting_time` (migrace `006`).
- **Stránka `/settings/preferences`** načte data serverově a předá je do client komponenty `PreferencesForm`. Ukládání probíhá přes server action `updatePreferences` (FormData → `supabase.from("users").update(...)`).
- **Vytváření postů:** `createPostAction` (server action) vytvoří řádek v `posts` + duální zápis do `post_platforms`. Podporuje `status: "draft" | "scheduled" | "published"` a volitelné `scheduledAt`.
- **Editace postů:** `updatePost` (server action)允许 pouze `draft`/`scheduled` změny. Published/failed jsou chráněny publish flow.
- **EditPostDialog** má tři hlavní tlačítka: "Koncept" (`handleSubmit("draft")`), "Naplánovat" (`handleSubmit("scheduled")`) a "Publikovat" (`handlePublishNow`).
- **NewPostModal** (v kalendáři) má stejnou trojici tlačítek.

---

## Plán implementace – Checklist

### 1. Datová struktura pro rozvrh fronty

#### 1.1 Nový JSONB sloupec `posting_schedule` v tabulce `users`
- **Soubor:** `supabase/migrations/034_add_posting_schedule.sql`
- **Sloupec:** `posting_schedule JSONB DEFAULT NULL`
- **Struktura JSONB:**
  ```jsonc
  {
    "enabled": true,                       // globální spínač Auto-Queue
    "0": ["09:00", "14:00"],              // Sunday – pole časů (HH:MM)
    "1": ["10:30"],                        // Monday
    "2": ["09:00", "15:00"],              // Tuesday
    "3": [],                               // Wednesday – den vypnutý (prázdné pole)
    "4": ["11:00"],                        // Thursday
    "5": ["09:00", "17:00"],              // Friday
    "6": []                                // Saturday
  }
  ```
- **Proč JSONB v `users` a ne nová tabulka:** Rozvrh je úzkě svázán s uživatelskými preferencemi (timezone, default_posting_time). Jedna řádka na uživatele je jednodušší na čtení (žádný JOIN) a ideální pro JSONB. Pokud by šlo o týmové rozvrhy nebo sdílené šablony, dávalo by smysl samostatnou tabulku, ale pro current scope stačí sloupec.
- **Poznámka:** Dny jsou uloženy jako `0` (Sunday) – `6` (Saturday), což odpovídá JS `Date.getUTCDay()`.

---

### 2. Algoritmus – `getNextAvailableQueueSlot` (Server Action)

#### 2.1 Nový soubor: `src/lib/actions/queue.ts`
- **Funkce:** `export async function getNextAvailableQueueSlot(): Promise<{ success: boolean; scheduledAt?: string; error?: string }>`

**Algoritmus:**
```
1. Načti aktuálního uživatele (supabase.auth.getUser)
2. Načti users řádek: timezone, posting_schedule, default_posting_time
3. Pokud posting_schedule je NULL nebo enabled === false:
   → Fallback: zítra v default_posting_time (respektuj user timezone)
   → Return ISO string
4. Načti všechny scheduled posts uživatele:
   supabase.from("posts").select("id").eq("user_id", userId).eq("status", "scheduled")
   + JOIN na post_platforms pro přesná scheduled_at
5. Pro každý den v budoucnosti (max 30 dní dopředu):
   a. Zjisti den v týdnu (0-6)
   b. Najdi časové sloty z rozvrhu pro tento den
   c. Pro každý slot:
      - Vypočítej plné datetime v timezone uživatele
      - Zkontroluj, zda tento čas NENÍ již obsazen jiným scheduled postem (tolerance ±15 minut)
      - Pokud je volný → return ISO string
6. Pokud se nedaří najít slot do 30 dní → fallback na default_posting_time za 31 dní
```

**Klíčové detaily:**
- Timezone handling: Použij `Intl.DateTimeFormat` a ruční výpočet offsetu, protože v server actions nemáme přístup k `luxon` nebo `date-fns` bez instalace. Nebo použij jednoduchý přístup – pracuj s UTC a přepočítej pomocí timezone offsetu z `new Date().toLocaleString("en-US", { timeZone })`.
- Tolerance ±15 minut mezi příspěvky: Zabrání kolizi, kdy by dva příspěvky šly téměř ve stejnou dobu.

---

### 3. UI – Nastavení rozvrhu (Settings → Předvolby)

#### 3.1 Rozšíření `preferences-form.tsx`
- Nová sekce **"Rozvrh fronty"** pod stávající sekcemi (Timezone, Time Format, Start of Week, Default Posting Action).
- **Design:** Stejný card styl (`rounded-[20px]`, glassmorphism, ikonová barva = cyan/teal).
- **Komponenta:** `QueueScheduleSection` – vnitřní komponenta nebo samostatný soubor.

**UI prvek obsahuje:**
- Toggle spínač "Automatická fronta" (enabled/disabled)
- 7 řádků pro dny v týdnu:
  - Každý řádek: název dne + mini toggle (zapnuto/vypnuto den) + seznam časových slotů
  - Tlačítko "+ Přidat čas" pro každý zapnutý den
  - Každý časový slot: `<input type="time">` + tlačítko smazání (X)
- Vzor inspirovaný Buffer-styleUI

#### 3.2 Rozšíření `actions.ts` (updatePreferences)
- Přidat do FormData zpracování: `posting_schedule` (JSON string → parse → JSONB update).
- Server action `updatePreferences` rozšířit o nový parametr.

#### 3.3 Rozšíření `page.tsx` (preferences page)
- Při načítání uživatelských dat přidat `posting_schedule` do SELECT query.
- Předat jako prop do `PreferencesForm`.

---

### 4. UI – Tlačítko "Přidat do fronty" v editorech

#### 4.1 EditPostDialog (`src/components/edit-post-dialog.tsx`)
- **Nový handler:** `handleQueueToSchedule` – zavolá server action `getNextAvailableQueueSlot()`, dostane `scheduledAt` a pak zavolá `handleSubmit("scheduled")` s vypočteným časem.
- **Nové tlačítko:** Mezi "Koncept" a "Naplánovat" (nebo jako sekundární akce vedle "Naplánovat").
  - Ikona: `ListOrdered` nebo `Clock` z lucide-react
  - Label: "Přidat do fronty"
  - Variant: outline s jemným gradientem (odlišné od "Naplánovat")
- **Toast notifikace:** "Příspěvek byl zařazen do fronty na [vypočítané datum a čas]" – formátované podle user timezone a time_format preference.

#### 4.2 NewPostModal (`src/components/calendar/new-post-modal.tsx`)
- Stejné tlačítko "Přidat do fronty" přidat mezi stávající tři akční tlačítka.
- Stejný handler pattern.

---

### 5. Lokalizace

#### 5.1 Nové klíče pro `cs.json` (posts namespace):
```json
"addToQueue": "Přidat do fronty",
"queuedSuccess": "Příspěvek byl zařazen do fronty na {date}",
"queueLoading": "Výpočet času..."
```

#### 5.2 Nové klíče pro `cs.json` (settings namespace):
```json
"queueSchedule": "Rozvrh fronty",
"queueScheduleDescription": "Nastavte dny a časy, kdy se příspěvky automaticky zařazují do fronty publikování.",
"autoQueueEnabled": "Automatická fronta",
"addTime": "Přidat čas",
"monday": "Pondělí",
"tuesday": "Úterý",
"wednesday": "Středa",
"thursday": "Čtvrtek",
"friday": "Pátek",
"saturday": "Sobota",
"sunday": "Neděle"  // už existí
```

#### 5.3 Stejné klíče pro `en.json` a `uk.json`

---

## Pořadí implementace (krok za krokem)

| Krok | Soubory | Popis |
|------|---------|-------|
| ✅ **Krok 1** | `supabase/migrations/034_add_posting_schedule.sql` | DB migrace – nový sloupec `posting_schedule JSONB` |
| ✅ **Krok 2** | `src/lib/supabase/types.ts` | Aktualizace TypeScript typů pro `users` tabulku |
| ✅ **Krok 3** | `src/lib/actions/queue.ts` (nový) | Server action `getNextAvailableQueueSlot()` – algoritmus fronty |
| ✅ **Krok 4** | `src/messages/cs.json`, `en.json`, `uk.json` | Přidat všechny nové i18n klíče |
| ✅ **Krok 5** | `src/app/[locale]/(dashboard)/settings/preferences/actions.ts` | Rozšířit `updatePreferences` o `posting_schedule` |
| ✅ **Krok 6** | `src/app/[locale]/(dashboard)/settings/preferences/page.tsx` | Načíst `posting_schedule` z DB a předat do formu |
| ✅ **Krok 7** | `src/app/[locale]/(dashboard)/settings/preferences/preferences-form.tsx` | Přidat sekci "Rozvrh fronty" s UI pro editaci rozvrhu |
| ✅ **Krok 8** | `src/components/edit-post-dialog.tsx` | Přidat tlačítko "Přidat do fronty" + handler `handleQueueToSchedule` |
| ✅ **Krok 9** | `src/components/calendar/new-post-modal.tsx` | Přidat tlačítko "Přidat do fronty" do modálu nového postu |

---

## Rizika a poznámky

- **Timezone handling v JS:** Server actions běží na serveru, kde je systémový čas obvykle UTC. Musíme explicitně pracovat s uživatelskou timezone (`users.timezone`). Použijeme `Intl` API nebo ruční offset výpočet.
- **Kolize slotů:** Tolerance ±15 minut mezi příspěvky zabraňuje přetížení jednoho časového okna.
- **Backward compatibility:** `posting_schedule` je NULL po defaultu – uživatelé bez nastaveného rozvrhu dostanou fallback na `default_posting_time` + zítra. Žádný breaking change.
- **NEZMĚNÍME:** Okamžité publikování, manuální plánování, náhledy, analytiky, publish flow, post_platforms logiku.

---

## Prompt 021 – Opravy stránky Příspěvky (Posts page)

> Tato sekce vznikla na základě statické kontroly stránky `/posts` (`page.tsx`, `_posts-container.tsx`, `_post-card.tsx`, `actions.ts`, `normalize-post.ts`).
> Všechny 4 body níže jsou **čekající na implementaci** – zavádějí se krok za krokem podle Striktních pravidel spolupráce (jeden krok, pak zastavit a čekat na otestování uživatelem).

### Kontext analýzy

Stránka Příspěvky používá **keyset (cursor) paginaci** s PAGE_SIZE = 20. První stránka se renderuje serverově v `page.tsx`, další stránky načítá client-side server action `fetchMorePosts`, po změně filtrů pak `fetchFilteredPosts`. Řazení (`PostFiltersRow`) je client-side stav s hodnotami `"newest" | "oldest" | "publishDate"`. Aktuální implementace má nekonzistenci mezi směrem řazení a operátorem kurzoru, což rozbíjí „Load more" v některých režimech řazení.

### Plán implementace – Checklist

#### 1. 🔴 Oprava kurzoru pro `sort=oldest` (ASC řazení)

- **Soubor:** `src/app/[locale]/(dashboard)/posts/actions.ts` (řádky ~122–149, funkce `fetchPostPage`)
- **Problém:** Při `sort="oldest"` se řadí `created_at ASC` (`orderAsc = true`), ale kurzor se vždy aplikuje přes `.gt("created_at", cursor)`. Při ASC by se mělo pokračovat `.lt()` (less-than), jinak „Load more" nic nevrátí nebo vrátí špatnou stránku. Stejně tak samotný `nextCursor` by měl brát první (nikoli poslední) vykreslený řádek pro ASC směr.
- **Oprava:**
  1. Zavést proměnnou `sortAsc` odpovídající aktivnímu `orderAsc`.
  2. Kurzor aplikovat podmíněně:
     - `publishDate` → `.gt("scheduled_at", cursor)` (zůstává DESC).
     - `newest` → `.gt("created_at", cursor)` (zůstává DESC).
     - `oldest` → `.lt("created_at", cursor)` (nově ASC).
  3. V `fetchMorePosts` a `fetchFilteredPosts` spočítat `nextCursor` podle směru:
     - DESC (`newest`, `publishDate`): Kurzor = `created_at`/`scheduled_at` **posledního** vykresleného řádku (stávající chování).
     - ASC (`oldest`): Kurzor = `created_at` **prvního** vykresleného řádku.
- **Ověření:** `npx tsc --noEmit` ✅ + manuální test – přepnout na „Nejstarší first", kliknout „Load more" a ověřit, že se načte další stránka bez duplicit/přeskakování.

---

#### 2. 🟡 Oprava zobrazení „Load more" při přesně násobku PAGE_SIZE

- **Soubor:** `src/app/[locale]/(dashboard)/posts/page.tsx` (řádky ~68–79)
- **Problém:** `page.tsx` počítá `lastCursor` vždy, když `pagedPosts.length >= PAGE_SIZE`, bez ohledu na to, zda existuje další stránka. `_posts-container` pak ukáže tlačítko „Load more" i když další stránka neexistuje (přesný násobek 20, např. 40 příspěvků = 2 plné stránky). Po kliknutí se vrátí prázdná stránka.
- **Oprava:**
  1. V `page.tsx` spočítat `hasMore = (rawPosts?.length ?? 0) > PAGE_SIZE` (už se děje, ale `nextCursor` se posílá nezávisle).
  2. `nextCursor` posílat **pouze když `hasMore`**: `const lastCursor = hasMore ? pagedPosts[pagedPosts.length - 1]?.created_at : undefined;`
- **Ověření:** Vytvořit uživatele s přesně 20 (nebo 40) příspěvky a ověřit, že se na první stránce „Load more" nezobrazí. S 21 příspěvky se zobrazí a po kliknutí přinese 1 zbytek.

---

#### 3. 🟢 Konzistentní kurzorový sloupec mezi `page.tsx` a `actions.ts`

- **Soubor:** `src/app/[locale]/(dashboard)/posts/page.tsx` (řádek ~78)
- **Problém:** `page.tsx` vždy počítá `lastCursor` z `created_at`, ale `fetchMorePosts`/`fetchFilteredPosts` mohou při `sort="publishDate"` porovnávat kurzor vůči `scheduled_at`. Vzniká tichá nekonzistence (porovnávání `created_at` vs `scheduled_at`).
- **Poznámka:** Reálně je nibá marginální, protože `PostFiltersRow` inicializuje `sort` na `"newest"` a jakákoliv změna sortu spouští `applyFilters` → `fetchFilteredPosts`, který `currentCursor` přepíše korektně. Bug se projeví jen v neobvyklém scénáři (změna sortu bez vyvolání `applyFilters`). I tak je architektonicky křehké, že `page.tsx` nezná aktivní sort.
- **Oprava (minimální, nízkoiziková):** Centrovat kurzorovou logiku na `created_at` jen pro defaultní `newest` režim, a udržovat poznámku, že při initial render je sort vždy `newest`. Případně rozšířit o prop `initialSort` z `page.tsx` do `_posts-container`, aby initial kurzor odpovídal sortu. **Usnesení:** provést minimální variantu – ponechat `created_at` (protože initial sort = `newest` vzdy) a doplnit komentář vysvětlující invariantu.
- **Ověření:** `npx tsc --noEmit` ✅ + manuální test – přepínání sortů + „Load more" / změna filtrů nevyhazují kurzor.

---

#### 4. 🟢 Framer Motion `layout` + AnimatePresence exit (potenciální runtime warning)

- **Soubor:** `src/app/[locale]/(dashboard)/posts/_post-card.tsx` (řádek ~297, `motion.article` s `layout`)
- **Problém:** `motion.article` má `layout` + `AnimatePresence` exit animaci v `PostsList`. Při mazání s exit animací může Framer Motion vyhazovat layout warní hlášky, zejména v kombinaci s `min-h-[400px]` prázdným stavem. Nepotvrzené – pouze vizuální/mezní konsistence.
- **Oprava (zvážit, nízkoiziková):**
  1. Ověřit v konzoli prohlížeče, zda se runtime warn zobrazuje při mazání postu.
  2. Pokud ano, zvážit odstranění `layout` (nebo `layout="position"`) z `motion.article`, případně isolation přes `LayoutGroup`.
  3. Pokud se warn nezobrazuje, ponechat beze změny a tento bod označit jako „no-op ověřeno".
- **Ověření:** Manuální test v prohlížeči – smazat post v seznamu a sledovat konzoli.

---

### Pořadí implementace

| Krok | Soubor | Popis |
|------|--------|-------|
| ✅ **Krok 1** | `src/app/[locale]/(dashboard)/posts/actions.ts` | Oprava `.gt()` → `.lt()` pro `sort=oldest` + ASC kurzor = první řádek |
| ✅ **Krok 2** | `src/app/[locale]/(dashboard)/posts/page.tsx` | `nextCursor` posílat jen když `hasMore` |
| ✅ **Krok 3** | `src/app/[locale]/(dashboard)/posts/page.tsx` | Komentář invarianty: initial sort = `newest`, kurzor z `created_at` |
| ✅ **Krok 4** | `src/app/[locale]/(dashboard)/posts/_post-card.tsx` | Ověřit/no-op Framer `layout` runtime warn — žádné varování, layout animace funguje korektně (expand/collapse) |

### Rizika a poznámky

- **Zásah do paginace:** Kroky 1–2 se dotýkají klíčové logiky kurzoru, ale mění jen okrajové případy (ASC řazení, přesný násobek PAGE_SIZE). Defaultní `newest` režim zůstává beze změny – nejnižší riziko regrese.
- **NEZMĚNÍME:** Filtry, bulk delete, publish flow, editace, tiktok logiku, prázdný stav, design – pouze paginace/cursor matematika a případný Framer layout warn.
- **Testování:** Po každém kroku manuální test v prohlížeči (různé sorty + Load more + přesný násobek PAGE_SIZE) dle Striktního pravidla 3. Teprve po schválení uživatelem → odškrtnout ✅, zapsat do CHANGELOG.md a provést automatický commit (Pravidlo 4).

---

## Prompt 022 – Zprovoznění High-Fidelity TikTok náhledu na stránce Příspěvky

> **Problém:** Po kliknutí na ikonu "Oka" (samostatný náhled) na stránce `/posts` se zobrazí věrné náhledy pro FB, IG, LI, YT – ale **TikTok záložka chybí**. Komponenta `TikTokPreview` v `post-preview.tsx` je plně funkční, ale `preview-dialog.tsx` ji nenapojuje.

### Analýza příčiny

Soubor `src/components/preview-dialog.tsx` má **pěť míst**, kde je TikTok explicitně vynechán:

| # | Místo (řádek) | Aktuální stav | Co chybí |
|---|---------------|---------------|----------|
| 1 | ř. 53 – typ `PreviewPlatform` | `"facebook" \| "instagram" \| "youtube" \| "linkedin"` | přidat `\| "tiktok"` |
| 2 | ř. 70–75 – `PREVIEWABLE_PLATFORMS` | 4 platformy bez TikTok | přidat `"tiktok"` do pole |
| 3 | ř. 78–83 – `PLATFORM_ACCENTS` | 4 barvy bez TikTok | přidat `tiktok: "#00f2fe"` |
| 4 | ř. 86–91 – `PLATFORM_LABELS` | 4 labely bez TikTok | přidat `tiktok: "TikTok"` |
| 5 | ř. 122–127 – init state `profiles` | fb, ig, yt, li | přidat `tiktok: null` |
| 6 | ř. 220–231 – `getTabLabel` | map pro 4 platformy | přidat `tiktok: t("previewTikTokTab")` |
| 7 | ř. 467–693 – `renderPreviewForPlatform` | switch s 4 cases + default null | přidat case `"tiktok"` s vertikálním přehrávačem |

**Proč to nefunguje:** `PREVIEWABLE_PLATFORMS` filtruje, které záložky se zobrazí. Protože `'tiktok'` není v tomto poli → `availableTabs` ho nikdy neobsahuje → žádná záložka TikTok → `renderPreviewForPlatform` pro tiktok se nikdy nespustí.

**i18n:** Klíč `previewTikTokTab` už existuje ve všech 3 jazycích (cs, en, uk) – **žádná změna i18n není potřeba**.

**TikTok pravidla splněná v `post-preview.tsx`:**
- ✅ High-Fidelity: vertikální přehrávač bez černých okrajů, akční ikony vpravo (❤️💬🔖↗️), text dole přes video, gradient overlay, rotující disk
- ✅ `external_id` → `buildLiveUrl` už má case pro `"tiktok"` (ř. 362–363)
- ✅ Uzamčení 🔒 – TikTok není v `SUPPORTED_UPDATE_PLATFORMS` (edit-post-dialog.tsx ř. 82), po publikování nelze editovat

### Plán implementace – Checklist

#### Krok 1: Rozšířit typy a konstanty o `'tiktok'`
- **Soubor:** `src/components/preview-dialog.tsx`
- **Změny:**
  - Typ `PreviewPlatform` (ř. 53): přidat `\| "tiktok"`
  - Pole `PREVIEWABLE_PLATFORMS` (ř. 70–75): přidat `"tiktok"` na konec
  - Record `PLATFORM_ACCENTS` (ř. 78–83): přidat `tiktok: "#00f2fe"`
  - Record `PLATFORM_LABELS` (ř. 86–91): přidat `tiktok: "TikTok"`
- **Ověření:** `npx tsc --noEmit` ✅

#### Krok 2: Přidat `'tiktok'` do profiles state a getTabLabel
- **Soubor:** `src/components/preview-dialog.tsx`
- **Změny:**
  - Init state `profiles` (ř. 122–127): přidat `tiktok: null`
  - Callback `getTabLabel` (ř. 220–231): přidat `tiktok: t("previewTikTokTab") ?? PLATFORM_LABELS.tiktok`
- **Ověření:** `npx tsc --noEmit` ✅ + manuální test – záložka TikTok se zobrazí u příspěvků publikovaných na TikToku

#### Krok 3: Přidat case `"tiktok"` do `renderPreviewForPlatform`
- **Soubor:** `src/components/preview-dialog.tsx` (funkce od ř. 467)
- **Změna:** Před `default: return null` přidat nový case pro TikTok, který vykreslí High-Fidelity vertikální náhled:
  - Černé pozadí (`bg-black`)
  - Video na celou výšku (object-cover / contain) nebo placeholder s 🎵
  - Gradient overlay dole pro čitelnost textu
  - Levý sloupec: `@username` + caption (line-clamp-3) + původní zvuk
  - Pravý sloupec: Avatar + Follow tlačítko + akční ikony (❤️ 💬 🔖 ↗️) + rotující disk
  - Použít pomocné funkce `AvatarInline` a `PreviewMediaArea` (už existují v souboru)
- **Ověření:** Manuální test – kliknout na Oko u TikTok příspěvku → náhled se zobrazí věrně

#### Krok 4: Ověřit "Zobrazit na síti" + uzamčení 🔒
- **Soubor:** `src/components/preview-dialog.tsx` (žádná změna kódu, pouze ověření)
- **Ověření:**
  - Tlačítko "Zobrazit na síti" se zobrazí pro TikTok (pokud má `external_id`) – `buildLiveUrl` už vrací `https://www.tiktok.com/@user/video/{id}`
  - Ověřit, že u publikovaného TikTok příspěvku není možnost editace (uzamčení)

### Pořadí implementace

| Krok | Soubor | Popis |
|------|--------|-------|
| ✅ **Krok 1** | `src/components/preview-dialog.tsx` | Rozšířit typ `PreviewPlatform` + konstanty (`PREVIEWABLE_PLATFORMS`, `PLATFORM_ACCENTS`, `PLATFORM_LABELS`) o `'tiktok'` |
| ✅ **Krok 2** | `src/components/preview-dialog.tsx` | Přidat `tiktok: null` do profiles state + `getTabLabel` map |
| ⬜ **Krok 3** | `src/components/preview-dialog.tsx` | Přidat case `"tiktok"` do `renderPreviewForPlatform` (High-Fidelity vertikální náhled) |
| ⬜ **Krok 4** | Žádný (ověření) | Ověřit "Zobrazit na síti" odkaz + uzamčení po publikování |

### Rizika a poznámky

- **Jeden soubor:** Všechny změny jsou pouze v `preview-dialog.tsx` – minimální riziko regrese.
- **Žádný breaking change:** Přidání `'tiktok'` do typů a polí je plně aditivní. Existující náhledy (FB, IG, YT, LI) se nemění.
- **i18n hotové:** `previewTikTokTab` existuje ve všech jazycích.
- **NEZMĚNÍME:** `post-preview.tsx`, `_post-card.tsx`, i18n soubory, databázi, server actions.
