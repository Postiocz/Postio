# 📋 Úkoly — Stránka "Příspěvky" (Posts)

> Vytvořeno: 2026-06-27  
> Poslední aktualizace: 2026-06-28 (relace 3)  
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
| 4 (správné) | **Cursor-based pagination** | `6f51594` + `e087798` | Keyset paginace (20/page + "Load more"), server action fetchMorePosts, normalizace postů do sdílené funkce. Žádný URL change — čistý client-side append. Split normalizePost z actions.ts kvůli "use server" constraintu. |

---

## 🔄 Zbývá

### 🔴 Vysoká priorita

*(vše hotovo)*

---

### 🟡 Střední priorita

*(vše hotovo — #7 dokončen 2026-06-28)*

---

### 🟢 Nízká priorita — UX vylepšení

#### #9 — Žádné setřídění (sorting)
- **Problém:** Uživatel může filtrovat, ale nemůže třídit ("nejnovější první", "nejstarší první", "podle data publikování").
- **Řešení:** Přidat dropdown/select pro sort order do `PostFiltersRow`. Předat sort param do DB dotazu (`.order("created_at", { ascending: true/false })`).
- **Odhad:** 40 min

#### #10 — Bulk akce chybí
- **Problém:** Uživatel nemůže vybrat více příspěvků a smazat/republishnout je najednou.
- **Řešení:** Checkboxy na PostCard + bulk action bar s "Smazat vybrané" / "Archivovat vybrané".
- **Odhad:** 2h

#### #12 — Media preview pointer-events-none
- **Soubor:** `_post-card.tsx`, řádek 470
- **Problém:** `className="relative pointer-events-none ..."` — uživatel nemůže rozkliknout/zvětšit obrázek.
- **Řešení:** Odstranit `pointer-events-none` a přidat onClick → otevřít PreviewDialog nebo lightbox.
- **Odhad:** 20 min

#### #13 — Content truncation na 3 řádky bez "Show more"
- **Soubor:** `_post-card.tsx`, řádek 552
- **Problém:** `line-clamp-3` ořezává dlouhé příspěvky bez možnosti rozbalit.
- **Řešení:** Přidat expand/collapse state ("Zobrazit více" / "Zobrazit méně").
- **Odhad:** 25 min

---

### 🔵 Refactor — Čistota kódu

#### #14 — Obří props drilling (zbylá část)
- **Soubory:** `page.tsx` → `_posts-container.tsx` → `_post-card.tsx` (PostsList → PostCard)
- **Problém:** `tLabels` (30+ properties) a `tAi` se předávají přes 4 úrovně. #14b už vyřešil PostCard zbyvá doladit EditPostDialog + PreviewDialog.
- **Řešení:** Dokončit — zbývající dialogy přepnout na vlastní `useTranslations()`.
- **Odhad:** 30 min

#### #14b — ~~Konkrétní krok: odstranit tLabels/tAi props z PostsList → PostCard~~ ✅ Hotovo (`5cdcf88`)

---

## 📊 Shrnutí priorit pro příští relaci

| Pořadí | # | Co | Odhad | Priorita |
|--------|---|----|-------|----------|
| 1 | #7 | Server-side filtrování | 1h | Střední |
| 2 | #9 | Sorting | 40 min | Nízká |
| 3 | #12 | Media preview click → lightbox | 20 min | Nízká |
| 4 | #13 | Expand/collapse text | 25 min | Nízká |
| 5 | #10 | Bulk akce | 2h | Nízká |

**Hotovo:** #17 + #4(limit) + #11 + #6 + #14b + **#4 (správné — cursor pagination)** + **#7 (server-side filtrování)** = ✅ typová bezpečnost, cron, vizuální konzistence, −133 řádků props drilling, cursor-based paginace s "Load more", server-side filtry s Subquery intersection.
