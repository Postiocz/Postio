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
| 14 | **Dokončení props drilling cleanup** | TBD | EditPostDialog, PreviewDialog, AIAssistantButton nyní používají vlastní `useTranslations()` místo 30+ tLabels + 9 tAi props předávaných přes 4 úrovně (page.tsx → PostsContainer → PostsList → PostCard → dialogy). Vyčištěno z page.tsx, _posts-container.tsx, _post-card.tsx, _calendar-client.tsx, _calendar-view.tsx, calendar/page.tsx, posts/new/page.tsx.
| 4 (správné) | **Cursor-based pagination** | `6f51594` + `e087798` | Keyset paginace (20/page + "Load more"), server action fetchMorePosts, normalizace postů do sdílené funkce. Žádný URL change — čistý client-side append. Split normalizePost z actions.ts kvůli "use server" constraintu. |
| 9 | **Sorting (setřídění)** | TBD | Dropdown se 3 režimy: nejnovější první, nejstarší první, podle data publikování. Server-side order v DB dotazu, cursor respektuje sort sloupec (created_at / scheduled_at). i18n pro CS/EN/UK. |
| 10 | **Bulk akce (checkboxy + „Smazat vybrané")** | TBD | Checkbox na každém PostCard, bulk action bar (sticky) s počtem vybraných, „Vybrat vše", „Smazat vybrané". Server action `bulkDeletePosts` v `posts.ts`. Automatické čištění výběru při změně filtrů. i18n pro CS/EN/UK. |
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

**Hotovo:** #17 + #4(limit) + #11 + #6 + #14b + **#4 (správné — cursor pagination)** + **#7 (server-side filtrování)** + **#9 (sorting)** + **#10 (bulk akce)** + **#12 (media preview lightbox)** + **#13 (expand/collapse text)** = ✅ typová bezpečnost, cron, vizuální konzistence, −133 řádků props drilling, cursor-based paginace s "Load more", server-side filtry s Subquery intersection, **setřídění (3 režimy) s dynamickým cursor**, **bulk výběr + smazání vybraných**, **fullscreen media preview s navigací**, **expand/collapse textu**.

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

#### #13 — Rozdělení `_calendar-view.tsx` (1561 řádků) ⬜

**Soubor:** `_calendar-view.tsx` — 1561 řádků, everything in one file

**Co udělat:** Rozdělit na samostatné komponenty v `src/components/calendar/`:
- `month-grid-view.tsx` — Month view (ř. 694–824)
- `week-grid-view.tsx` — Week view (ř. 829–931)
- `day-timeline-view.tsx` — Day view s 24h osou (ř. 938–1045)
- `agenda-list-view.tsx` — Desktop Agenda (ř. 1050–1138)
- `year-mini-grid.tsx` — Year overview (ř. 1145–1215)
- `mobile-agenda-view.tsx` — Mobile agenda (ř. 1224–1368)
- `new-post-modal.tsx` — Dialog pro nový příspěvek (ř. 1371–1571)
- `hover-preview.tsx` — Hover preview tooltip (ř. 1605–1691)
- `post-calendar-chip.tsx` — Opakující se post chip s platform ikonami + status barvami

**Odhad:** ~90 min (největší úkol, dělat po částech)

---

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

#### #15 — ~~ARIA / Keyboard navigace~~ ⬜

**Soubor:** `_calendar-view.tsx`  
**Problém:** Month grid nemá `role="grid"`, dny nejsou focusovatelné tabem.

**Co udělat:**
1. Month/Week grid: přidat `role="grid"` na kontejner, `role="row"` na řádky, `role="gridcell"` na buňky
2. Dny: `tabIndex={isToday(day) ? 0 : -1}` pro focus na dnešek
3. Keyboard navigation: šipky pro pohyb mezi dny (Enter = otevřít detail)

**Odhad:** ~40 min

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
| 3 | **#15** | ARIA / Keyboard navigace | 40 min | 🟢 A11y | ⬜ Zbývá |

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
**Zbývá:** 1 úkol kalendáře (#15 — ARIA/Keyboard navigace) = **~40 min**
