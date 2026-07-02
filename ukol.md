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
> Poslední aktualizace: 2026-07-02 (relace 1 — #1,#3,#4,#5,#6,#8,#11,#12,#17 hotovo)  
> Soubory: `src/app/[locale]/(dashboard)/calendar/page.tsx`, `_calendar-client.tsx`, `_calendar-view.tsx`  
> Komponenty: `src/components/calendar/stats-cards.tsx`, `view-switcher.tsx`, `mini-calendar.tsx`, `current-time-indicator.tsx`

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
| #17 | Odstranit nepoužité importy | hotovo | `ArrowLeft`, `Film`, `ImageIcon` pryč z lucide-react |

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

#### #7 — ~~Mobile view: přidat přepínač pohledů~~ ⬜

**Soubor:** `_calendar-view.tsx` řádky 1224–1368  
**Problém:** Mobilní uživatelé vidí vždy jen "Agenda" (seznam dní). Nemají přístup k Month/Week/Day pohledům.

**Co udělat:**
1. Přidat zjednodušený ViewSwitcher do mobile headeru (Month + Agenda)
2. Mobile month grid — zjednodušená verze desktop gridu (menší buňky, max 2 posty na den)

**Odhad:** ~45 min

---

#### #9 — ~~Modal pro nový příspěvek: chybí upload médií~~ ⬜

**Soubor:** `_calendar-view.tsx` řádky 1371–1571  
**Problém:** Formulář v kalendáři neumí nahrát obrázky/videa, zatímco `/posts/new` a `EditPostDialog` ano. Inkonzistence.

**Co udělat:**
1. Přidat media upload sekci do New Post modalu (stejný pattern jako v `posts/new/page.tsx`)
2. Předat `mediaUrls` do `createPostAction`

**Odhad:** ~60 min

---

#### #10 — ~~Klik na prázdný den: chování~~ ⬜

**Odhad:** ~20 min

---

#### #11 — ~~Hover preview skryt při scrollu~~ ✅ Hotovo

---

#### #12 — ~~Dynamický character limit podle platforem~~ ✅ Hotovo

---

### 🔵 Refactor — Čistota kódu

#### #3+4 — ~~Duplicitní typy a konstanty~~ ✅ Hotovo

---

#### #13 — ~~Rozdělení `_calendar-view.tsx` (1695 řádků)~~ ⬜

**Soubor:** `_calendar-view.tsx` — 1695 řádků, everything in one file

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

#### #14 — ~~`PostCalendarChip` — extrakce opakujícího se JSX~~ ⬜

**Soubor:** `_calendar-view.tsx` — platform ikony + status barvy se opakuje ~6× (Month, Week, Day, Agenda desktop, Agenda mobile, hover preview)

**Co udělat:**
1. Vytvořit `post-calendar-chip.tsx`:
   ```tsx
   interface PostCalendarChipProps {
     post: Post;
     size?: 'xs' | 'sm' | 'md'; // kontroluje text-truncate délku + ikona velikost
     showTime?: boolean;
     onClick: (e: React.MouseEvent) => void;
     onHoverEnter?: (el: HTMLDivElement) => void;
     onHoverLeave?: () => void;
   }
   ```
2. Nahradit všech ~6 opakujících se bloků

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

#### #16 — ~~Unifikovat status styling ve Week view~~ ⬜

**Soubor:** `_calendar-view.tsx` řádky 886–894  
**Problém:** Week view má jen `published/scheduled/failed/fallback`, ale Month view má i `removed_externally` a `publishing`.

**Co udělat:** Po extrakci `PostCalendarChip` (#14) bude automaticky vyřešeno.

**Odhad:** ~5 min (nebo řešeno jako součást #14)

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
| 1 | **#14** | PostCalendarChip extrakce | 30 min | 🔵 Refactor | ⬜ Zbývá |
| 2 | **#16** | Unifikovat status styling Week view | 5 min | 🔵 (součást #14) | ⬜ Zbývá |
| 3 | **#10** | Klik na prázdný den — chování | 20 min | 🟢 UX | ⬜ Zbývá |
| 4 | **#7** | Mobile view přepínač pohledů | 45 min | 🟢 UX | ⬜ Zbývá |
| 5 | **#9** | Media upload do calendar modalu | 60 min | 🟢 UX | ⬜ Zbývá |
| 6 | **#15** | ARIA / Keyboard navigace | 40 min | 🟢 A11y | ⬜ Zbývá |
| 7 | **#13** | Rozdělení souboru (1695 → ~10 souborů) | 90 min | 🔵 Refactor | ⬜ Zbývá |

**Hotovo relace 1:** #1 + #8 + #6 + #17 + #5 + #3+4 + #11 + #12 = **8 úkolů, ~107 min**  
**Zbývá:** 7 úkolů, ~290 min (~4.8 hodiny)
