# 📋 Úkoly — Stránka "Příspěvky" (Posts)

> Vytvořeno: 2026-06-27  
> Poslední aktualizace: 2026-07-01 (relace 6)  
> Status auditu: [originální audit z konverzace]

---

## ✅ Hotovo

| # | Popis | Commit | Dopad |
|---|-------|--------|-------|
| 1+2 | **Hardcoded CZ text → i18n** (banner + toasty) | `ed608f0` | EN/UK uživatelé vidí správný jazyk |
| 5+15 | **Double-fetch router.refresh() + IIFE anti-pattern** | `eceacbb` | Žádný redundantní RSC re-render, čistší kód |
| 3+16 | **Mrtvý _posts-filters.tsx smazán** | `24ce8c4` | −151 řádků mrtvého kódu |
| 8 | **Filter count indikace ("X z Y")** | `86703ca` | Uživatel vidí kolik příspěvků se zobrazuje po filtrování |
| 17 | **Typ PostStatus (union type)** | `2c6f0cb` | Typová bezpečnost — TS nyní chytá chybějící statusy a typy v porovnáních |
| 4 (rychlé) | **Pagination `.limit(100)`** | `2c6f0cb` | Ochranná brzda proti fetchnutí všech příspěvků najednou |
| 11 | **border-radius `24px` → `20px`** | `2c6f0cb` | Konzistence s design systémem |
| 6 | **Sync/cleanup → Vercel Cron** | `5cdcf88` | Žádný blocking server action při loadu stránky, cron každé 2h |
| 14b | **Redukce props drilling (−14 props z PostCard)** | `5cdcf88` | PostCard používá useTranslations() místo 14 předávaných stringů |
| 14 | **Dokončení props drilling cleanup** | `fa69710` | EditPostDialog, PreviewDialog, AIAssistantButton nyní používají vlastní `useTranslations()` místo 30+ tLabels + 9 tAi props předávaných přes 4 úrovně (page.tsx → PostsContainer → PostsList → PostCard → dialogy). Vyčištěno z page.tsx, _posts-container.tsx, _post-card.tsx, _calendar-client.tsx, _calendar-view.tsx, calendar/page.tsx, posts/new/page.tsx.
| 4 (správné) | **Cursor-based pagination** | `6f51594` + `e087798` | Keyset paginace (20/page + "Load more"), server action fetchMorePosts, normalizace postů do sdílené funkce. Žádný URL change — čistý client-side append. Split normalizePost z actions.ts kvůli "use server" constraintu. |
| 9 | **Sorting (setřídění)** | `eccf211` + `c8ddc6a` + `98567b3` | Dropdown se 3 režimy: nejnovější první, nejstarší první, podle data publikování. Server-side order v DB dotazu, cursor respektuje sort sloupec (created_at / scheduled_at). i18n pro CS/EN/UK. |
| 10 | **Bulk akce (checkboxy + „Smazat vybrané")** | `c72a5e2` | Checkbox na každém PostCard, bulk action bar (sticky) s počtem vybraných, „Vybrat vše", „Smazat vybrané". Server action `bulkDeletePosts` v `posts.ts`. Automatické čištění výběru při změně filtrů. i18n pro CS/EN/UK. |
| 12 | **Media preview lightbox** | `3b55d81` + `3b7d4c0` | Klik na thumbnail otevře fullscreen dialog s navigací (šipky, klávesnice ←/→), tečkový indikátor pro více médií. Odstraněn `pointer-events-none`, přidán hover ring. Radix a11y fix — vizuálně skrytý `DialogTitle`. |

---

## 🔄 Zbývá

### 🔴 Vysoká priorita

*(vše hotovo)*

---

### 🟡 Střední priorita

*(vše hotovo — #7 dokončen 2026-06-28)*

---

### 🟢 Nízká priorita — UX vylepšení

*(vše hotovo — #13 dokončen 2026-07-01)*

---

### 🔵 Refactor — Čistota kódu

*(vše hotovo — #14 dokončen 2026-07-01)*

#### #14b — ~~Konkrétní krok: odstranit tLabels/tAi props z PostsList → PostCard~~ ✅ Hotovo (`5cdcf88`)

---

## 📊 Shrnutí priorit pro příští relaci

| Pořadí | # | Co | Odhad | Priorita |
|--------|---|----|-------|----------|
| — | — | Vše hotovo | — | — |

**Hotovo:** #17 + #4(limit) + #11 + #6 + #14b + **#14 (props drilling cleanup)** + **#4 (správné — cursor pagination)** + **#7 (server-side filtrování)** + **#9 (sorting)** + **#10 (bulk akce)** + **#12 (media preview lightbox)** + **#13 (expand/collapse text)** = ✅ typová bezpečnost, cron, vizuální konzistence, −400+ řádků props drilling (`fa69710`), cursor-based paginace s "Load more", server-side filtry s Subquery intersection, **setřídění (3 režimy) s dynamickým cursor**, **bulk výběr + smazání vybraných**, **fullscreen media preview s navigací**, **expand/collapse textu**.

---

# 📋 Úkoly — Stránka "Kalendář" (Calendar)

> Vytvořeno: 2026-07-02  
> Poslední aktualizace: 2026-07-03 (relace 4 — #13 hotovo)  
> Soubory: `src/app/[locale]/(dashboard)/calendar/page.tsx`, `_calendar-client.tsx`, `_calendar-view.tsx`  
> Komponenty: `src/components/calendar/stats-cards.tsx`, `view-switcher.tsx`, `mini-calendar.tsx`, `current-time-indicator.tsx`, `post-calendar-chip.tsx`, `month-grid-view.tsx`, `week-grid-view.tsx`, `day-timeline-view.tsx`, `agenda-list-view.tsx`, `year-mini-grid.tsx`, `mobile-agenda-view.tsx`, `hover-preview.tsx`, `new-post-modal.tsx`

---

## ✅ Hotovo

| # | Popis | Commit / Status | Dopad |
|---|-------|-----------------|-------|
| #1 | `window.location.reload()` → `router.refresh()` | hotovo | Žádný tvrdý reload, RSC refresh zachovává stav filtrů a view módu |
| #3+4 | Duplicitní typy a konstanty → sdílené soubory | hotovo | `src/types/calendar.ts` + `src/lib/constants/platforms.ts`, single source of truth |
| #5 | Memoizace postsByDay (Map) | hotovo | O(1) lookup místo O(n×35) filteru pro každý den |
| #6 | DB query `.limit(500)` | hotovo | Ochranná brzda proti fetchnutí všech postů najednou |
| #8 | StatsCards filtrovat podle aktuálního měsíce | hotovo | Generická komponenta, `isSameMonth()` filtr — label "Tento měsíc" odpovídá realitě |
| #11 | Hover preview skryt při scrollu | hotovo | Scroll listener resetuje `hoveredPost`, passive event |
| #12 | Dynamický character limit podle platforem | hotovo | Twitter 280, Instagram 2200, LinkedIn 3000… Math.min() z vybraných platforem |
| #10 | Klik na prázdný den — blokování minulosti | `fadf202` | Toast upozornění při kliku na minulý den bez postů, existující posty se otevírají normálně |
| #14 | PostCalendarChip extrakce opakujícího se JSX | `fadf202` | 5× duplicitní čipy → `PostCalendarChip` + `PlatformIconsGroup`, unified status styling |
| #16 | Unifikovat status styling ve Week view | `fadf202` | Součást #14 — Week view používá stejný PostCalendarChip jako Month |
| #17 | Odstranit nepoužité importy | hotovo | `ArrowLeft`, `Film`, `ImageIcon` pryč z lucide-react |
| #13 | Rozdělení `_calendar-view.tsx` (980 řádků) | `60e2d39` | 8 extrahovaných komponent, −581 řádků (−37%), TypeScript čistý |

---

## 🔄 Zbývá

### 🔴 Vysoká priorita

#### #1 — ~~`window.location.reload()` → `router.refresh()`~~ ✅ Hotovo

#### #8 — ~~StatsCards počítají ze všech postů, ne jen aktuální měsíc~~ ✅ Hotovo

---

### 🟡 Střední priorita

#### #5 — ~~Memoizace postsByDay (výkon)~~ ✅ Hotovo

#### #6 — ~~Limit dotazu na DB (page.tsx)~~ ✅ Hotovo

---

### 🟢 Nízká priorita — UX vylepšení

#### #7 — Mobile view: přidat přepínač pohledů ✅ Hotovo

**Soubor:** `mobile-agenda-view.tsx`  
**Problém byl:** Mobilní uživatelé viděli vždy jen "Agenda" (seznam dní). Neměli přístup k Month/Week/Day pohledům.

**Řešení:**
1. Přidán zjednodušený ViewSwitcher do mobile headeru (Month + Agenda) — mini pill s ikonami Grid3x3/List, konzistentní s desktop ViewSwitcher (gradient indigo/purple)
2. Mobile month grid — kompaktní verze desktop gridu (min-h-[64px] buňky, max 2 posty na den, menší fonty text-[9px]/text-[11px])
3. i18n pro Month/Agenda label z `tCalendar.month` / `tCalendar.agenda`

**Odhad:** ~45 min ✅

---

#### #9 — Modal pro nový příspěvek: upload médií ✅ Hotovo

**Soubor:** `_calendar-view.tsx`  
**Problém byl:** Formulář v kalendáři neumí nahrát obrázky/videa, zatímco `/posts/new` a `EditPostDialog` ano. Inkonzistence.

**Řešení:**
1. Přidán `useMediaUpload` hook do `_calendar-view.tsx` (userId fetch, upload labels)
2. Media upload sekce do inline modálu — drag & drop + click, max 10 souborů, grid preview (obrázky i videa), status indikátory (optimizing/uploading/ready)
3. `mediaUrls: getMediaUrls()` předáváno do `createPostAction` místo hardcoded `[]`
4. `hasUploading()` blokuje submit tlačítka během nahrávání
5. AI Vision integrace — `firstImageUrl` předáván do `AIAssistantButton`

**Odhad:** ~60 min ✅

---

#### #10 — ~~Klik na prázdný den: chování~~ ✅ Hotovo

**Implementováno:** Zakázáno vytváření NOVÝCH příspěvků v minulosti. Pokud uživatel klikne na prázdný den v minulosti, zobrazí se toast: *"Nelze vytvořit příspěvek pro minulý den."* Klik na den s existujícími příspěvky funguje normálně (otevře se Preview/Edit stávajícího příspěvku).

**Odhad:** ~20 min ✅

---

#### #11 — ~~Hover preview skryt při scrollu~~ ✅ Hotovo

---

#### #12 — ~~Dynamický character limit podle platforem~~ ✅ Hotovo

---

### 🔵 Refactor — Čistota kódu

#### #3+4 — ~~Duplicitní typy a konstanty~~ ✅ Hotovo

---

#### #13 — ~~Rozdělení `_calendar-view.tsx`~~ ✅ Hotovo (`60e2d39`)

**Původní stav:** `_calendar-view.tsx` — 980 řádků, everything in one file  
**Výsledek:** 8 extrahovaných komponent v `src/components/calendar/`, soubor nyní 1168 řádků (obsahuje orchestraci + hooky, vizuální komponenty vyčleněny). −581 řádků kódu přesunuto do samostatných souborů.

**Extrahované komponenty:**
- `month-grid-view.tsx` — Month view
- `week-grid-view.tsx` — Week view
- `day-timeline-view.tsx` — Day view s 24h osou
- `agenda-list-view.tsx` — Desktop Agenda
- `year-mini-grid.tsx` — Year overview
- `mobile-agenda-view.tsx` — Mobile agenda (rozšířen o view switcher)
- `new-post-modal.tsx` — Dialog pro nový příspěvek (rozšířen o media upload)
- `hover-preview.tsx` — Hover preview tooltip

**Odhad:** ~90 min ✅

#### #14 — ~~`PostCalendarChip` — extrakce opakujícího se JSX~~ ✅ Hotovo

**Soubor:** `src/components/calendar/post-calendar-chip.tsx` (nový, 170 řádků)

**Co vytvořeno:**
- `PostCalendarChip` — kompletní čip pro Month/Week/Mobile view
- `PlatformIconsGroup` — sdílený renderer platform ikon s badgey (použit v Day, Agenda, Mobile)
- `getChipStatusStyles(status)` — single source of truth pro status barvy
- `getPlatformIconColor(status)` — single source of truth pro ikony platforem
- `STATUS_STYLES` + `FALLBACK_STATUS` — exportované konstanty

**Nahrazeno:** 5 opakujících se bloků v Month, Week, Day, Agenda desktop, Mobile Agenda view. Všech 6 statusů (published/scheduled/publishing/failed/draft/removed_externally) + fallback nyní jednotné.

**Odhad:** ~30 min

---

#### #15 — ARIA / Keyboard navigace ✅ Hotovo

**Soubory:** `month-grid-view.tsx`, `week-grid-view.tsx`  
**Problém byl:** Month/Week grid neměl `role="grid"`, dny nebyly focusovatelné tabem, žádná klávesnicová navigace.

**Řešení:**
1. `role="grid"` na kontejner, `role="row"` na řádky, `role="gridcell"` na buňky, `role="columnheader"` na hlavičky dnů
2. `aria-label` s i18n („Kalendář měsíce" / „Календар місяця" / „Month calendar")
3. `aria-current="date"` na dnešní den
4. `tabIndex={isFocused ? 0 : -1}` — tabloop jen na fokusední buňce (roving tabindex pattern)
5. Defaultní focus na dnešek (`todayIndex`), reset při změně měsíce
6. Keyboard navigation: ←→↑↓ šipky, Home/End (řádek), PageUp/PageDown (měsíc), Enter/Space = otevřít den
7. Vizuální feedback: `!bg-indigo-500/10 ring-2 ring-inset ring-indigo-500/40` na fokusední buňku
8. Week view stejně jako Month view

**Odhad:** ~40 min ✅

---

#### #16 — ~~Unifikovat status styling ve Week view~~ ✅ Hotovo (součást #14)

**Problém byl:** Week view měl jen `published/scheduled/failed/fallback`, ale Month view měl i `removed_externally` a `publishing`.

**Řešení:** `getChipStatusStyles()` v `post-calendar-chip.tsx` vrací všech 6+1 statusů pro všechny pohledy. Week view nyní používá `PostCalendarChip` se stejným stylingem jako Month.

**Odhad:** ~5 min (řešeno jako součást #14)

---

#### #17 — ~~Odstranit nepoužité importy~~ ✅ Hotovo

---

## 📊 Shrnutí priorit pro příští relaci

| Pořadí | # | Co | Odhad | Priorita | Status |
|--------|---|----|-------|----------|--------|
| ~~1~~ | ~~**#1**~~ | ~~`window.location.reload()` → `router.refresh()`~~ | 15 min | 🔴 Vysoká | ✅ Hotovo |
| ~~2~~ | ~~**#8**~~ | ~~StatsCards filtrovat podle aktuálního měsíce~~ | 30 min | 🔴 Vysoká | ✅ Hotovo |
| ~~3~~ | ~~**#6**~~ | ~~DB query `.limit(500)` + date filter~~ | 5 min | 🟡 Střední | ✅ Hotovo |
| ~~4~~ | ~~**#5**~~ | ~~Memoizace postsByDay Map~~ | 20 min | 🟡 Střední | ✅ Hotovo |
| ~~5~~ | ~~**#17**~~ | ~~Odstranit nepoužité importy~~ | 2 min | 🔵 Quick win | ✅ Hotovo |
| ~~6~~ | ~~**#3+4**~~ | ~~Duplicitní typy a konstanty~~ | 15 min | 🔵 Refactor | ✅ Hotovo |
| ~~7~~ | ~~**#11**~~ | ~~Hover preview skryt při scrollu~~ | 5 min | 🟢 UX | ✅ Hotovo |
| ~~8~~ | ~~**#12**~~ | ~~Dynamický character limit~~ | 15 min | 🟢 UX | ✅ Hotovo |
| ~~9~~ | ~~**#14**~~ | ~~PostCalendarChip extrakce~~ | 30 min | 🔵 Refactor | ✅ Hotovo (`fadf202`) |
| ~~10~~ | ~~**#16**~~ | ~~Unifikovat status styling Week view~~ | 5 min | 🔵 (součást #14) | ✅ Hotovo (`fadf202`) |
| ~~11~~ | ~~**#10**~~ | ~~Klik na prázdný den — chování~~ | 20 min | 🟢 UX | ✅ Hotovo (`fadf202`) |
| ~~12~~ | ~~**#13**~~ | ~~Rozdělení souboru (980 řádků → 8 komponent)~~ | 90 min | 🔵 Refactor | ✅ Hotovo (`60e2d39`) |
| ~~1~~ | ~~**#7**~~ | ~~Mobile view přepínač pohledů~~ | 45 min | 🟢 UX | ✅ Hotovo |
| ~~2~~ | ~~**#9**~~ | ~~Media upload do calendar modalu~~ | 60 min | 🟢 UX | ✅ Hotovo |
| ~~13~~ | ~~**#15**~~ | ~~ARIA / Keyboard navigace~~ | 40 min | 🟢 A11y | ✅ Hotovo |

## 📋 Úkoly — Rozšíření (nové)

### #18 — Kalendář: Omezení tvorby postů v minulosti + rozšíření platforem u existujících postů

|část|Popis|Odhad|Stav|
|---|---|---|---|
|~~18a~~|~~`_calendar-view.tsx`: `handleDayClick` – blokovat otevírání New Post modalu pro minulé datumy~~|30 min|✅ Hotovo (`fadf202`) — toast CS/EN/UK, existující posty se otevírají normálně|
|18b|`EditPostDialog`: Přidat platform selector pro editaci platforem u existujícího postu|45 min|✅ Hotovo — `hasMetadataChanges` detekuje změny platforem, `handleSaveMetadata` volá `updatePost` s `platforms`, publikované platformy zůstávají zamčené (`pointer-events-none`)
|18c|Server action `updatePostPlatformsAction` (nebo rozšíření `createPostAction`) pro přidání/odebrání platforem|15 min|✅ Hotovo — `updatePost` v `posts.ts` (ř.179-218) již umí dual-write sync platforem do `post_platforms` (add new as draft, remove non-published)
|18d|Integrace + testy|15 min|✅ Hotovo — platformy se ukládají přes "Uložit interní metadata" tlačítko u publikovaných postů, toggle funguje pro nepublikované platformy

**Celkem #18 zbývá: 0 — vše hotovo**

---

**Hotovo relace 1:** #1 + #8 + #6 + #17 + #5 + #3+4 + #11 + #12 = **8 úkolů, ~107 min**  
**Hotovo relace 2:** #14 + #16 = **2 úkoly, ~35 min**  
**Hotovo relace 3:** #10 + #18a (součást commitu `fadf202`) = **1 úkol, ~20 min**  
**Hotovo relace 4:** #13 = **1 úkol, ~90 min** (8 nových komponent, −581 řádků)  
**Hotovo relace 5:** #15 = **1 úkol, ~40 min** (ARIA grid + keyboard navigace v Month & Week view)  
**Zbývá:** 0 — vše hotovo ✅

---

# 🔧 Úkoly — TikTok OAuth připojení účtu (Accounts page)

> Vytvořeno: 2026-07-04  
> Soubory: `src/app/[locale]/(dashboard)/accounts/page.tsx`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`  
> API route již existuje: `src/app/api/accounts/tiktok/route.ts` (OAuth flow kompletní — authorize → token exchange → user/info → DB upsert → redirect s `?tiktok=connected`)

---

## 🐛 Analýza problému

Uživatel klikne na TikTok ikonu na stránce Accounts → očekává OAuth připojení přes `ConnectAccountModal` + redirect na TikTok authorize URL. Namísto toho:

1. **TikTok není v `isOAuthPlatform`** (ř. 450–455) → klikne-li uživatel na ikonu, spadne do `else` větve a zobrazí se legacy manuální formulář (account name + access token inputy), ne OAuth modal.
2. **Žádná větev pro `"tiktok"` v `onConnect` handleru** (ř. 845–918) → kdyby modal otevřen byl (např. přes Reconnect tlačítko u existujícího účtu), spadl by do default Facebook OAuth větve — uživatel by byl redirectnut na Facebook consent místo TikTok.
3. **Chybí callback signal handler pro `?tiktok=connected`** (ř. 295–339) → API route po úspěšném OAuth redirectne zpět s `?tiktok=connected`, ale page tento parametru nečte — žádný toast, žádný re-fetch účtů, uživatel neuvidí změnu.
4. **Chybí i18n klíč `tiktokConnectedShort`** → toast pro úspěšné připojení nemá překlad (ostatní platformy mají: `ytConnectedShort`, `liConnectedShort`, `xConnectedShort`).

---

## ✅ Plán opravy

| # | Část | Co udělat | Soubor | Řádky | Odhad |
|---|------|-----------|--------|-------|-------|
| ~~1~~ | ~~`isOAuthPlatform`~~ | ~~Přidat `platform.id === "tiktok"` do condition na ř. 450–455~~ | `page.tsx` | ~450–455 | ~~5 min~~ |
| ~~2~~ | ~~`onConnect` větev~~ | ~~Přidat `else if (connectModalPlatform.id === "tiktok")` s redirectem na `/api/accounts/tiktok?state=...&locale=...` (vzor: LinkedIn/X/YouTube)~~ | `page.tsx` | ~845–918 | ~~10 min~~ |
| ~~3~~ | ~~Callback signal~~ | ~~Přidat `const tiktokSignal = searchParams.get("tiktok")` + handler v useEffect (toast + fetchAccounts + cleanup URL)~~ | `page.tsx` | ~295–339 | ~~10 min~~ |
| ~~4~~ | ~~i18n klíče~~ | ~~Přidat `tiktokConnectedShort` do cs.json, en.json, uk.json~~ | `src/messages/*.json` | — | ~~5 min~~ |
| ~~5~~ | ~~Komentář~~ | ~~Aktualizovat komentář ř. 445–449 — TikTok už má OAuth flow, není to "legacy platform"~~ | `page.tsx` | ~445–449 | ~~2 min~~ |

**Celkem: ~32 min — ✅ Vše hotovo**

---

## 📝 Konkrétní změny

### Změna 1 — `isOAuthPlatform` (ř. 450–455)
```
// PŘED:
const isOAuthPlatform =
  platform.id === "instagram" ||
  platform.id === "facebook" ||
  platform.id === "linkedin" ||
  platform.id === "youtube" ||
  platform.id === "twitter";

// PO:
const isOAuthPlatform =
  platform.id === "instagram" ||
  platform.id === "facebook" ||
  platform.id === "linkedin" ||
  platform.id === "youtube" ||
  platform.id === "twitter" ||
  platform.id === "tiktok";
```

### Změna 2 — `onConnect` větev pro TikTok (mezi YouTube a Instagram, ~ř. 876)
```ts
} else if (connectModalPlatform.id === "tiktok") {
  // TikTok OAuth – custom flow via /api/accounts/tiktok
  const localeMatch = window.location.pathname.match(/\/(cs|en|uk)(?:\/|$)/);
  const locale = localeMatch?.[1] ?? "cs";
  const tiktokAuthUrl = `/api/accounts/tiktok?state=${encodeURIComponent(next)}&locale=${locale}`;
  window.location.assign(tiktokAuthUrl);
```

### Změna 3 — Callback signal handler (~ř. 295–300)
```ts
// Přidat vedle ytSignal / liSignal / xSignal:
const tiktokSignal = searchParams.get("tiktok");

// Do useEffect condition a tělo:
if (!ytSignal && !liSignal && !xSignal && !tiktokSignal && !errorSignal) return;
// ...
if (tiktokSignal === "connected") {
  fetchAccounts();
  toast.success(t("tiktokConnectedShort"));
  return;
}

// Do dependency array: [ytSignal, liSignal, xSignal, tiktokSignal, errorSignal, router, t]
```

### Změna 4 — i18n klíče
Do `src/messages/cs.json` (sekce accounts):
```json
"tiktokConnectedShort": "TikTok účet byl úspěšně propojen s Postiem.",
```
Do `src/messages/en.json`:
```json
"tiktokConnectedShort": "TikTok account has been successfully connected to Postio.",
```
Do `src/messages/uk.json`:
```json
"tiktokConnectedShort": "Обліковий запис TikTok успішно підключено до Postio.",
```

### Změna 5 — Komentář (ř. 445–449)
```
// PŘED:
// The "else" branch shows the legacy manual token +
// account-name form, which is kept for platforms that
// do not yet have an OAuth flow (TikTok, X).

// PO:
// The "else" branch shows the legacy manual token +
// account-name form — no platform currently uses this
// (all platforms have OAuth flows). Kept as fallback.
```

---

## 🔄 Status

| Část | Status |
|------|--------|
| ~~1~~ | ~~`isOAuthPlatform`~~ | ✅ Hotovo |
| ~~2~~ | ~~`onConnect` větev~~ | ✅ Hotovo |
| ~~3~~ | ~~Callback signal~~ | ✅ Hotovo |
| ~~4~~ | ~~i18n klíče~~ | ✅ Hotovo |
| ~~5~~ | ~~Komentář~~ | ✅ Hotovo |

**Celkem zbývá: 0/5 — vše hotovo ✅**

---

# 📊 Prompt 018 — Implementace reálné analytiky

> Vytvořeno: 2026-07-04  
> Soubory: `src/app/[locale]/(dashboard)/analytics/actions.ts`, `page.tsx`, `analytics-dashboard.tsx`  
> Komponenty: `src/components/analytics/tag-breakdown.tsx`  
> DB tabulky: `analytics` (impressions, engagements, likes, comments, shares, clicks, saves, recorded_at), `post_platforms` (external_id, last_sync_at, status, platform), `social_accounts` (access_token, platform_id, metadata)  
> Lokalizace: `src/messages/cs.json`, `en.json`, `uk.json`

---

## 🔍 Analýza současného stavu

### Co funguje
- **`getTagBreakdown()`** v `actions.ts` — reálná funkce čtecí data z DB (post_tags, tags, post_platforms) → funguje správně, zachovat.
- **`AnalyticsDashboard`** komponenta — glassmorphism design (20px radius, backdrop-blur-md), Recharts grafy (AreaChart + BarChart), metric karty, period filtr (7/30/90 dní), Empty State → vše zachovat.
- **TagBreakdown** komponenta — dialog s detaily (status/platform breakdown) → zachovat.
- **i18n** — sekce `analytics` existuje ve všech 3 jazycích (~35 klíčů).

### Co je třeba změnit
- **`generateDemoAnalytics()`** v `actions.ts` (ř. 194–285) — generuje náhodná demo data a vkládá je do DB. Musí být nahrazen reálným syncem z API sociálních sítí.
- **`page.tsx`** (ř. 48–71) — auto-generuje demo data, když jsou analytics prázdné. Musí číst pouze reálná data z DB + nabízet tlačítko pro manuální sync.
- Tabulka `analytics` nemá sloupec `platform` ani `external_id` — analytická data jsou vázána jen na `post_id`. Pro upsert podle platformy bude potřeba buď rozšířit tabulku, nebo použít `post_id` jako unikátní klíč a agregovat.

### Struktura DB `analytics`
```sql
analytics (
  id uuid PK,
  post_id uuid FK → posts(id),
  impressions int,
  engagements int,
  likes int,
  comments int,
  shares int,
  clicks int,
  saves int,
  recorded_at timestamptz
)
```

### Struktura `post_platforms` (relevantní sloupce)
```sql
post_platforms (
  id uuid PK,
  post_id uuid FK → posts(id),
  platform text,            -- 'instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok'
  status text,              -- 'published', 'failed', atd.
  external_id text,         -- ID příspěvku na externí platformě
  last_sync_at timestamptz, -- už existuje! (cron-sync.ts ho používá)
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
```

### Struktura `social_accounts` (relevantní sloupce)
```sql
social_accounts (
  id uuid PK,
  user_id uuid FK,
  platform text,            -- 'instagram', 'facebook', atd.
  access_token text,        -- access token pro API
  platform_id text,         -- ID účtu na externí platformě
  token_expires_at timestamptz,
  metadata jsonb,           -- refresh_token u YouTube
  is_active boolean
)
```

---

## ✅ Checklist implementace

### Fáze A: Odstranění demo logiky

| # | Popis | Soubor | Status |
|---|-------|--------|--------|
| ~~A1~~ | ~~Smazat `generateDemoAnalytics()` z `actions.ts`~~ | `analytics/actions.ts` | ✅ Hotovo |
| ~~A2~~ | ~~Odstranit auto-generaci demo dat z `page.tsx` (ř. 48–71) — nahradit čistým fetchem z DB~~ | `analytics/page.tsx` | ✅ Hotovo |
| A3 | Přidat prop `lastSyncAt` a `syncError` do `AnalyticsDashboard` pro info o synchronizaci | `analytics/analytics-dashboard.tsx` | ⏭️ Skočeno (stačí toast report) |
| ~~A4~~ | ~~Implementovat vylepšený "Empty State" — rozlišit 3 případy: (a) žádné publikované posty, (b) posty bez analytiky + tlačítko Sync, (c) sync se selhal~~ | `analytics/analytics-dashboard.tsx` | ✅ Hotovo |

### Fáze B: Server Action pro Insights Sync

| # | Popis | Soubor | Status |
|---|-------|--------|--------|
| ~~B1~~ | ~~Vytvořit `syncAnalyticsInsights()` server action — hlavní orchestrátor~~ | `analytics/actions.ts` | ✅ Hotovo |
| ~~B2~~ | ~~Načíst všechny `post_platforms` se status='published' + external_id pro aktuálního uživatele~~ | `analytics/actions.ts` | ✅ Hotovo |
| ~~B3~~ | ~~Kontrola throttlingu: přeskočit položky s `last_sync_at` < 60 minut (new Date().getTime() - last_sync_at < 3_600_000)~~ | `analytics/actions.ts` | ✅ Hotovo |
| ~~B4~~ | ~~Implementovat `fetchMetaInsights()` — Meta Graph API pro Facebook i Instagram (`/{post-id}/insights?metric=impressions,engagement,likes_count,comments_count,shares,clicks`)~~ | `analytics/actions.ts` | ✅ Hotovo |
| ~~B5~~ | ~~Implementovat `fetchYouTubeInsights()` — YouTube Data API v3 (`videos.list?part=statistics&id={videoId}`) → viewCount, likeCount, commentCount~~ | `analytics/actions.ts` | ✅ Hotovo |
| ~~B6~~ | ~~Placeholder pro X (Twitter) — uložit nulové hodnoty s logem TODO~~ | `analytics/actions.ts` | ✅ Hotovo |
| ~~B7~~ | ~~Placeholder pro LinkedIn — uložit nulové hodnoty s logem TODO~~ | `analytics/actions.ts` | ✅ Hotovo |
| ~~B8~~ | ~~Placeholder pro TikTok — uložit nulové hodnoty s logem TODO~~ | `analytics/actions.ts` | ✅ Hotovo |
| ~~B9~~ | ~~Upsert výsledků do `analytics` tabulky (přes `post_id` jako unikátní klíč, nebo insert + on_conflict)~~ | `analytics/actions.ts` | ✅ Hotovo |
| ~~B10~~ | ~~Aktualizovat `last_sync_at` v `post_platforms` po úspěšném syncu~~ | `analytics/actions.ts` | ✅ Hotovo |
| ~~B11~~ | ~~Error handling: logovat chyby, pokračovat u dalších položek, vrátit souhrnný report (successCount, errorCount, skippedCount)~~ | `analytics/actions.ts` | ✅ Hotovo |

### Fáze C: API implementace — detaily

#### Meta Graph API (Facebook + Instagram)
- **Endpoint:** `GET https://graph.facebook.com/v20.0/{post-id}/insights?metric=impressions,engagement,likes_count,comments_count,shares&access_token={token}`
- **Token:** z `social_accounts.access_token` pro platform='facebook' (pro Instagram se používá FB page token s IG business account)
- **Platform_id:** `social_accounts.platform_id` = Facebook Page ID nebo IG Business Account ID
- **External_id mapping:** 
  - Facebook: `post_platforms.external_id` = `{page-id}_{post-id}` → Graph API ID přímo
  - Instagram: `post_platforms.external_id` = IG media ID → Graph API ID přímo
- **Response parsing:** `values[{metric, value:{impressions, engaged_users, at}}]` → mapovat na naši schémata

#### YouTube Data API v3
- **Endpoint:** `GET https://www.googleapis.com/youtube/v3/videos?part=statistics&id={videoId}&key={apiKey}` nebo s OAuth tokenem
- **Token:** použít `getValidYouTubeAccessToken()` z `publish-youtube.ts` (už existuje!)
- **Response parsing:** `items[0].statistics { viewCount, likeCount, commentCount }` → impressions=viewCount, likes=likeCount, comments=commentCount

### Fáze D: UI aktualizace

| # | Popis | Soubor | Status |
|---|-------|--------|--------|
| ~~D1~~ | ~~Přidat tlačítko "Synchronizovat analytiku" do headeru dashboardu (s loading stavem)~~ | `analytics-dashboard.tsx` | ✅ Hotovo |
| D2 | Zobrazení "Poslední synchronizace: {čas}" pod headerem | `analytics/analytics-dashboard.tsx` | ⏭️ Skočeno (stačí toast report) |
| ~~D3~~ | ~~Metric karty sčítají z reálných dat (už funguje přes `filteredAnalytics.reduce`) — ověřit, že po odstranění demo to chodí~~ | `analytics/analytics-dashboard.tsx` | ✅ Hotovo |
| ~~D4~~ | ~~Vylepšený Empty State: ikonka + text "Zatím žádné analytické údaje" + tlačítko Sync (pokud jsou publikované posty)~~ | `analytics/analytics-dashboard.tsx` | ✅ Hotovo |

### Fáze E: Lokalizace

| # | Popis | Klíč | Status |
|---|-------|------|--------|
| ~~E1~~ | ~~"syncAnalytics" (titulek tlačítka)~~ | `analytics.syncAnalytics` | ✅ CS/EN/UK |
| ~~E2~~ | ~~"syncingAnalytics" (loading text)~~ | `analytics.syncingAnalytics` | ✅ CS/EN/UK |
| ~~E3~~ | ~~"lastSynced" (info o poslední sync)~~ | `analytics.lastSynced` | ✅ CS/EN/UK |
| ~~E4~~ | ~~"syncSuccess" (toast úspěch)~~ | `analytics.syncSuccess` | ✅ CS/EN/UK |
| ~~E5~~ | ~~"syncError" (toast chyba)~~ | `analytics.syncError` | ✅ CS/EN/UK |
| ~~E6~~ | ~~"noPublishedPosts" (empty state — žádné posty)~~ | `analytics.noPublishedPosts` | ✅ CS/EN/UK |
| ~~E7~~ | ~~"noAnalyticsYet" (empty state — posty jsou, ale bez dat)~~ | `analytics.noAnalyticsYet` | ✅ CS/EN/UK |
| ~~E8~~ | ~~"syncAnalyticsDescription" (popisek pod tlačítkem)~~ | `analytics.syncAnalyticsDescription` | ✅ CS/EN/UK |

---

## 📝 Konkrétní implementační kroky

### Krok B1-B3: Hlavní orchestrátor `syncAnalyticsInsights()`
```ts
export async function syncAnalyticsInsights(): Promise<{
  success: boolean;
  data?: { synced: number; skipped: number; errors: number };
  error?: string;
}> {
  // 1. Auth check
  // 2. Načíst post_platforms WHERE status='published' AND external_id IS NOT NULL
  // 3. Pro každý záznam:
  //    a. Kontrola last_sync_at (throttle 60 min)
  //    b. Získat access_token z social_accounts pro danou platformu
  //    c. Vyvolat příslušný fetcher podle platformy
  //    d. Upsert do analytics
  //    e. Update last_sync_at v post_platforms
  // 4. Return report
}
```

### Krok B4: `fetchMetaInsights()` — Meta Graph API
```ts
async function fetchMetaInsights(params: {
  accessToken: string;
  externalId: string;
  platform: 'facebook' | 'instagram';
}): Promise<AnalyticsMetrics | null> {
  // GET /{externalId}/insights?metric=impressions,engagement,likes_count,comments_count,shares
  // Parse response → mapovat na naše metriky
}
```

### Krok B5: `fetchYouTubeInsights()` — YouTube Data API v3
```ts
async function fetchYouTubeInsights(params: {
  account: SocialAccountRow;
  videoId: string;
}): Promise<AnalyticsMetrics | null> {
  // Použít getValidYouTubeAccessToken() pro refresh tokenu
  // GET /youtube/v3/videos?part=statistics&id={videoId}
  // Parse statistics → viewCount→impressions, likeCount→likes, commentCount→comments
}
```

### Krok B9: Upsert do analytics
```ts
// Použít Supabase upsert s on_conflict na post_id
// Pokud analytika pro post_id již existuje → update
// Pokud ne → insert
await supabase.from('analytics').upsert(
  { post_id, impressions, engagements, likes, comments, shares, clicks, saves, recorded_at: new Date().toISOString() },
  { onConflict: 'post_id' } // nebo composite key pokud je potřeba
).eq('post_id', postId)
```

---

## ⚠️ Rizika a poznámky

1. **`analytics` tabulka nemá unikátní constraint na `post_id`** — upsert vyžaduje ON CONFLICT klíč. Buď přidat unique index na `post_id`, nebo použít `.upsert()` s `{ onConflict: 'post_id' }` (Supabase to zvládne, ale potřebuje constraint). Alternativně: nejprve SELECT a pak INSERT nebo UPDATE.
2. **Meta Graph API rate limity** — 200 requestů/hodinu pro user token, 500 pro page token. Throttling 60 min by měl stačit.
3. **Instagram insights vyžadují Business Account** — osobní účty nemají přístup k insights přes Graph API.
4. **YouTube statistics mohou být delayed** — po publikování videa může trvat několik minut/hodin, než se statistiky objeví.
5. **Zachovat stávající design** — glassmorphism (bg-card/40, backdrop-blur-md), 20px radius (rounded-[20px]), Recharts grafy.

---

## 📊 Prioritní pořadí implementace

| Priorita | Krok | Odhad | Status |
|----------|------|-------|--------|
| 🔴 Vysoká | ~~A1+A2 (odstranit demo logiku)~~ | 15 min | ✅ Hotovo |
| 🔴 Vysoká | ~~B1+B2+B3 (orchestrátor + throttling)~~ | 40 min | ✅ Hotovo |
| 🔴 Vysoká | ~~B5 (YouTube insights — máme hotový token refresh)~~ | 30 min | ✅ Hotovo |
| 🟡 Střední | ~~B4 (Meta Graph API insights)~~ | 45 min | ✅ Hotovo |
| 🟡 Střední | ~~B9+B10 (upsert + last_sync_at update)~~ | 20 min | ✅ Hotovo |
| 🟢 Nízká | ~~B6-B8 (placeholdery X, LinkedIn, TikTok)~~ | 15 min | ✅ Hotovo |
| 🟢 Nízká | ~~D1-D4 (UI tlačítko sync, empty state)~~ | 30 min | ✅ Hotovo |
| 🟢 Nízká | ~~E1-E8 (lokalizace)~~ | 15 min | ✅ Hotovo |

**Celkový odhad: ~210 min (~3,5 hodiny)** — **Vše hotovo ✅**

---

## ⚠️ Důležité — před nasazením

> Spustit SQL migraci `supabase/migrations/033_analytics_unique_post_id.sql` v Supabase projektu (SQL editor nebo CLI), aby fungoval upsert s `ON CONFLICT post_id`.

---

# 📋 Úkoly — Dashboard (přehledová stránka)

> Vytvořeno: 2026-07-04  
> Soubory: `src/app/[locale]/(dashboard)/page.tsx`, `src/lib/dashboard-stats.ts`  
> Komponenty: `src/components/dashboard/platform-donut-chart.tsx`, `src/components/dashboard/top-labels-chart.tsx`  
> Lokalizace: `src/messages/cs.json`, `en.json`, `uk.json`

---

## 🐛 #1 — Zdvojené nadpisy v "Rychlé akce" ✅ Hotovo

**Soubor:** `page.tsx` (ř. 214–232)  
**Problém:** Každý `QuickActionCard` dostával **stejný i18n klíč** pro `title` i `description`:
- `title={t("newPost")}` + `description={t("newPost")}` → "Nový příspěvek" / "Nový příspěvek"
- `title={navT("templates")}` + `description={navT("templates")}` → "Šablony" / "Šablony"
- `title={navT("analytics")}` + `description={navT("analytics")}` → "Analytika" / "Analytika"

**Řešení:**
1. `description` u "Nový příspěvek" → nový klíč `dashboard.newPostDescription` ("Vytvořit a naplánovat obsah")
2. `description` u "Šablony" → existující klíč `dashboard.browseTemplates` ("Prohlédnout šablony")
3. `description` u "Analytika" → nový klíč `dashboard.viewAnalytics` ("Sledovat výkon a metriky")
4. Přidány překladové klíče do cs.json, en.json, uk.json

**Status:** ✅ Hotovo

---

## 🔄 Zbývá — Analýza dashboardu

### 🔴 Vysoká priorita

#### #2 — Hardcoded CZ text v ConsistencyScore

**Soubor:** `page.tsx` (ř. 349–351)  
**Problém:** Texty "Výborná konzistence!", "Dobrá, můžeš lepší!", "Zkus postovat pravidelněji." jsou hardcoded v češtině. EN/UK uživatelé uvidí český text.

```tsx
// AKTUÁLNĚ (ř. 349–351):
<p className="text-xs text-muted-foreground/60">
  {score >= 80 ? "Výborná konzistence!" : score >= 50 ? "Dobrá, můžeš lepší!" : "Zkus postovat pravidelněji."}
</p>

// MĚLO BY BÝT:
<p className="text-xs text-muted-foreground/60">
  {score >= 80 ? t("consistencyExcellent") : score >= 50 ? t("consistencyGood") : t("consistencyImprove")}
</p>
```

**Kroky:**
1. Přidat klíče `consistencyExcellent`, `consistencyGood`, `consistencyImprove` do cs.json, en.json, uk.json
2. Upravit `ConsistencyScore` komponentu — přijmout `translations` prop nebo předat `t` funkci
3. Otestovat ve všech 3 jazycích

**Odhad:** ~15 min

---

### 🟡 Střední priorita

#### #3 — ConsistencyScore je hardcoded na 89%

**Soubor:** `page.tsx` (ř. 35, 151)  
**Problém:** `consistencyScore` je vždy `89` — nikde se nevypočítává z reálných dat. V `try/catch` i v catch bloku je default 89.

**Navrhované řešení:**
Vypočítat konzistenci z publikovaných datumů — měřit pravidelnost (počet dní s publikací / celkový rozsah dnů). Nebo použít existující `calculateStreak()` a převést na procentuální skóre.

Možné přístupy:
- **A) Jednoduché:** `min(100, round(streak * 10))` — 5 dní = 50%, 10+ dní = 100%
- **B) Přesné:** Z `publishedPlatformsRows.data` spočítat days-with-publish / total-days-in-range
- **C) DB stored:** Uložit do `users.consistency_score`, aktualizovat cron jobem

**Doporučení:** Začít s přístupem A (rychlý win), později přejít na B.

**Odhad:** ~20 min (A), ~45 min (B)

---

#### #4 — Streak card: "0d" vypadá divně při hodnotě 0

**Soubor:** `page.tsx` (ř. 174–179)  
**Problém:** Když je `streak === 0`, zobrazuje se "0d" bez jakéhokoliv kontextu. Uživatel neví, co to znamená nebo jak sérii začít.

**Navrhované řešení:**
- Při `streak === 0`: zobrazit "—" nebo "0" s podtextem "Začněte publikovat!" (i18n)
- Přidat trend prop do Streak card (jako u TotalPosts) — např. "Nejdelší série: X dní"

**Odhad:** ~15 min

---

#### #5 — Missing empty state pro nového uživatele

**Soubor:** `page.tsx`  
**Problém:** Když je uživatel zcela nový (0 postů, 0 účtů, 0 šablon), dashboard zobrazuje jen prázdná čísla "0" a prázdné grafy. Chybí onboarding guidance.

**Navrhované řešení:**
- Pokud `totalPosts === 0 && connectedAccounts === 0`: zobrazit welcome banner s CTA:
  1. "Propojte první účet" → `/accounts`
  2. "Vytvořte první příspěvek" → `/posts/new`
- Použít existující `SetupGuide` komponentu (`src/components/dashboard/setup-guide.tsx`) pokud je dostupná

**Odhad:** ~30 min

---

### 🟢 Nízká priorita — UX vylepšení

#### #6 — QuickActionCard: description má stejnou barvu jako title u primary varianty

**Soubor:** `page.tsx` (ř. 387)  
**Problém:** U primary (gradient) karty je description `text-sm text-white` — bílý na bílém/gradientu má nízký kontrast. Title je `font-semibold` ale description není vizuálně odlišený.

**Řešení:** Změnit na `text-sm text-white/80` pro lepší hierarchii a čitelnost.

**Odhad:** ~2 min

---

#### #7 — UpgradeBanner: "pro"/"creator" label není i18n

**Soubor:** `page.tsx` (ř. 412–417)  
**Problém:** `planLabel` vrací hardcoded `"pro"` / `"creator"` / `translations.free`. Mělo by to být i18n.

```tsx
// AKTUÁLNĚ:
const planLabel =
  currentPlan === "pro" ? "pro"
  : currentPlan === "creator" ? "creator"
  : translations.free;

// MĚLO BY BÝT (přidat do translations props):
const planLabel =
  currentPlan === "pro" ? commonT("pro") // nebo billing.pro
  : currentPlan === "creator" ? commonT("creator")
  : translations.free;
```

**Odhad:** ~10 min

---

#### #8 — Dashboard: Chybí sekce "Poslední příspěvky"

**Soubor:** `page.tsx`  
**Problém:** i18n klíč `dashboard.recentPosts` existuje, ale v dashboardu není žádná sekce s posledními příspěvky. Uživatel po publikaci nemá rychlý přehled co dělal naposledy.

**Navrhované řešení:**
- Přidat sekci pod "Rychlé akce" s 3–5 nejnovějšími příspěvky
- Zobrazit: náhled textu (truncate 80 znaků), platform ikony, status badge, datum
- Link na `/posts` pro "Zobrazit vše"
- Může použít stávající DB dotaz z `postsData` s `.order('created_at', { ascending: false }).limit(5)`

**Odhad:** ~40 min

---

#### #9 — StatCards: Chybí klikací chování / navigace

**Soubor:** `page.tsx` (ř. 162–180)  
**Problém:** Statistikové karty jsou pouze informativní — nelze na ně kliknout pro detail. Uživatel očekává, že kliknutím na "Naplánované: 5" ho to dovede k filtrovanému seznamu naplánovaných příspěvků.

**Navrhované řešení:**
- Obalit každou StatCard do `<Link>` nebo přidat `onClick` navigaci
- Celkem příspěvků → `/posts`
- Naplánované → `/calendar?filter=scheduled` (nebo `/posts?status=scheduled`)
- Propojené účty → `/accounts`
- Streak → žádná navigace (nebo tooltip s vysvětlením)

**Odhad:** ~20 min

---

#### #10 — Scheduled count zahrnuje i publishing status

**Soubor:** `page.tsx` (ř. 72–76)  
**Problém:** Dotaz pro "Naplánované" počítá jen `status = 'scheduled'`. Příspěvky ve stavu `publishing` se nepočítají. Uživatel může videt pokles čísla během procesu publikování.

**Řešení:** Přidat `.or('status.eq.scheduled,status.eq.publishing')` nebo zkontrolovat zda je to zamýšlené.

**Odhad:** ~5 min

---

#### #11 — Trend indikátor: "tento týden" ukazuje count, ne trend % 

**Soubor:** `page.tsx` (ř. 167–170) + `dashboard-stats.ts` (ř. 104–118)  
**Problém:** `calculateTrend()` vrací absolutní počet postů za posledních 7 dní (např. "+3 tento týden"). Vizualizace s TrendingUp/TrendingDown ikonou naznačuje změnu %, ale ve skutečnosti jde o count. Uživatel si může myslet, že "+3" znamená "+3%".

**Navrhované řešení:**
- Buď přejmenovat label na "3 nových tento týden" (i18n)
- Nebo implementovat skutečný trend: porovnat minulý 7d vs aktuální 7d a vypočítat % změnu
- Doporučení: přidat i18n klíč `thisWeekCount` = "{count} nových tento týden"

**Odhad:** ~15 min (label fix), ~30 min (skutečný %)

---

#### #12 — Gradient ID kolize v ConsistencyScore SVG

**Soubor:** `page.tsx` (ř. 337)  
**Problém:** `<linearGradient id="consistencyGradient">` — pokud by se kdy zobrazily 2+ ConsistencyScore komponenty na jedné stránce, gradient ID by kolovalo. Nyní je jen jedna instance, ale pro budoucí robustnost:

**Řešení:** Přidat unikátní suffix, např. `id="consistencyGradient-${Date.now()}"` nebo statický prefix `postio-consistency-gradient`.

**Odhad:** ~3 min

---

#### #13 — Indentace v JSX je nekonzistentní

**Soubor:** `page.tsx` (ř. 155–248)  
**Problém:** Hlavní `<div>` na ř. 155 má children s různou indentací:
- Ř. 156: `    <div className="space-y-1">` (4 mezery — správně)
- Ř. 162: `      <div className="grid gap-4...` (6 mezer — o 2 víc)
- Některé sekce jsou začištěné na 4, jiné na 6

**Řešení:** Unifikovat na 4 mezere indentaci pro všechny direct children hlavního divu.

**Odhad:** ~5 min

---

## 📊 Shrnutí priorit

| # | Popis | Priorita | Odhad | Status |
|---|-------|----------|-------|--------|
| ~~1~~ | ~~Zdvojené nadpisy v Rychlé akce~~ | 🔴 Vysoká | ~~10 min~~ | ✅ Hotovo |
| ~~2~~ | ~~Hardcoded CZ text v ConsistencyScore~~ | ~~🔴 Vysoká~~ | ~~15 min~~ | ✅ Hotovo |
| 3 | ConsistencyScore hardcoded na 89% | 🟡 Střední | 20–45 min | ⏳ |
| 4 | Streak "0d" bez kontextu | 🟡 Střední | 15 min | ⏳ |
| 5 | Missing empty state pro nového uživatele | 🟡 Střední | 30 min | ⏳ |
| 6 | QuickActionCard kontrast description | 🟢 Nízká | 2 min | ⏳ |
| 7 | UpgradeBanner planLabel ne-i18n | 🟢 Nízká | 10 min | ⏳ |
| 8 | Chybí sekce "Poslední příspěvky" | 🟢 Nízká | 40 min | ⏳ |
| 9 | StatCards bez navigace | 🟢 Nízká | 20 min | ⏳ |
| 10 | Scheduled count chybí publishing status | 🟢 Nízká | 5 min | ⏳ |
| 11 | Trend ukazuje count místo % | 🟢 Nízká | 15–30 min | ⏳ |
| 12 | SVG gradient ID kolize | 🟢 Nízká | 3 min | ⏳ |
| 13 | Nekonzistentní indentace JSX | 🟢 Nízká | 5 min | ⏳ |

**Celkový odhad zbývá: ~190–230 min (~3–4 hodiny)**

---

## 🎯 Doporučené pořadí implementace

1. **#2** (hardcoded CZ) — kritický bug pro EN/UK uživatele, rychlá oprava
2. **#6** (kontrast description) — 2 min quick fix, viditelný okamžitě po #1
3. **#7** (planLabel i18n) — podobný problém jako #2, malý effort
4. **#4** (streak 0d UX) — viditelné改善 pro většinu uživatelů
5. **#3** (reálný consistency score) — core feature, která nyní nefunguje
6. **#13 + #12** (code quality) — quick wins při refaktoru
7. **#10 + #11** (data accuracy) — správnost metrik
8. **#9** (StatCards navigace) — UX vylepšení
9. **#5** (empty state) — onboarding experience
10. **#8** (recent posts) — nejvyšší effort, nejnižší priorita
