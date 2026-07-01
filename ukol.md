# 📋 Úkoly — Stránka "Příspěvky" (Posts)

> Vytvořeno: 2026-06-27  
> Poslední aktualizace: 2026-07-01 (relace 5)  
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
| — | — | Vše hotovo | — | — |

**Hotovo:** #17 + #4(limit) + #11 + #6 + #14b + **#4 (správné — cursor pagination)** + **#7 (server-side filtrování)** + **#9 (sorting)** + **#10 (bulk akce)** + **#12 (media preview lightbox)** + **#13 (expand/collapse text)** = ✅ typová bezpečnost, cron, vizuální konzistence, −133 řádků props drilling, cursor-based paginace s "Load more", server-side filtry s Subquery intersection, **setřídění (3 režimy) s dynamickým cursor**, **bulk výběr + smazání vybraných**, **fullscreen media preview s navigací**, **expand/collapse textu**.
