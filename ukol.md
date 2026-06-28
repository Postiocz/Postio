# 📋 Úkoly — Stránka "Příspěvky" (Posts)

> Vytvořeno: 2026-06-27  
> Poslední aktualizace: 2026-06-28  
> Status auditu: [originální audit z konverzace]

---

## ✅ Hotovo

| # | Popis | Commit | Dopad |
|---|-------|--------|-------|
| 1+2 | **Hardcoded CZ text → i18n** (banner + toasty) | `ed608f0` | EN/UK uživatelé vidí správný jazyk |
| 5+15 | **Double-fetch router.refresh() + IIFE anti-pattern** | `eceacbb` | Žádný redundantní RSC re-render, čistší kód |
| 3+16 | **Mrtvý _posts-filters.tsx smazán** | `24ce8c4` | −151 řádků mrtvého kódu |
| 8 | **Filter count indikace ("X z Y")** | `86703ca` | Uživatel vidí kolik příspěvků se zobrazuje po filtrování |
| 17 | **Typ PostStatus (union type)** | TBD | Typová bezpečnost — TS nyní chytá chybějící statusy a typy v porovnáních |
| 4 (rychlé) | **Pagination `.limit(100)`** | TBD | Ochranná brzda proti fetchnutí všech příspěvků najednou |
| 11 | **border-radius `24px` → `20px`** | TBD | Konzistence s design systémem |

---

## 🔄 Zbývá

### 🔴 Vysoká priorita

#### #4 — Chybějící pagination v DB dotazu
- **Soubor:** `src/app/[locale]/(dashboard)/posts/page.tsx`, řádek 43-47
- **Problém:** `.select(...).eq("user_id", user.id).order("created_at", { ascending: false })` — žádné `.limit()`. Všechny příspěvky se fetchují najednou.
- **Dopad:** Při stovkách příspěvků = velký payload, pomalý load, vysoká paměť na klientovi.
- **Řešení (rychlé):** Přidat `.limit(100)` jako ochrannou brzdu.
- **Řešení (správné):** Cursor-based pagination s `.range(from, to)` + "Load more" tlačítko v UI.
- **Odhad:** 30 min (rychlý) / 2h (správný)

---

### 🟡 Střední priorita

#### #6 — syncPublishedPosts() a cleanupAutoDeletedPosts() při každém loadu
- **Soubor:** `page.tsx`, řádky 35, 38
- **Problém:** Dva server actions iterující přes všechny příspěvky běží při každém načtení stránky.
- **Dopad:** Pomalý initial load, zbytečná zátěž DB + externích API.
- **Řešení:** Přesunout do cron job (Vercel Cron / Supabase Edge Function) nebo alespoň throttling s delším cooldownem (např. 1h místo 30min).
- **Odhad:** 45 min

#### #7 — Client-side filtrování místo server-side
- **Soubor:** `_posts-container.tsx`, řádek 159-176
- **Problém:** Filtry (platforma, status, štítek) běží v `useMemo` na klientovi po stažení všech dat.
- **Dopad:** U většího počtu příspěvků se stáhne vše a filtruje se lokálně.
- **Řešení:** Při změně filtru udělat nový Supabase dotaz s `.eq()` / `.or()` conditions místo client-side filteru. Vyžaduje přepracování na server action nebo API route pro filtrované data.
- **Odhad:** 1h

#### #17 — Typ PostStatus
- **Soubory:** `src/lib/supabase/types.ts` (řádek 116), `_post-card.tsx`, `page.tsx`
- **Problém:** Status se pracuje jako holý `string`. Supabase typ má `'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'` — chybí `'removed_externally'` a `'archived'`, které se v runtime používají.
- **Dopad:** Typová nebezpečnost, TS nechyta chyby jako `post.status === "removd_externally"` (typo).
- **Řešení:**
  1. Vytvořit `export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'removed_externally' | 'archived'` v `lib/types.ts`.
  2. Aktualizovat `PostListItem.status: PostStatus` v `_post-card.tsx`.
  3. Aktualizovat Supabase types v `lib/supabase/types.ts`.
  4. Nahradit `string` porovnání typově bezpečnými operacemi.
- **Odhad:** 20 min

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

#### #11 — Inconsistent border-radius
- **Soubor:** `_post-card.tsx`, řádek 403
- **Problém:** Design systém říká `rounded-[20px]`, ale PostCard má `rounded-[24px]`.
- **Řešení:** Změnit na `rounded-[20px]` pro konzistenci.
- **Odhad:** 2 min

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

#### #14 — Obří props drilling
- **Soubory:** `page.tsx` → `_posts-container.tsx` → `_post-card.tsx` (PostsList → PostCard)
- **Problém:** `tLabels` (30+ properties) a `tAi` se předávají přes 4 úrovně. Každá změna v typech se kaskádově promítá.
- **Řešení:** Vytvořit React Context pro lokalizaci (`PostsI18nContext`) nebo použít `useTranslations()` přímo v komponentách (už částečně hotové — `_posts-container.tsx` a `_post-card.tsx` již mají `useTranslations("posts")`).
- **Odhad:** 1h

#### #14b — Konkrétní krok: odstranit tLabels/tAi props z PostsList → PostCard
- PostCard už má `const t = useTranslations("posts")` (řádek 214 `_post-card.tsx`).
- Mnoho položek z `tLabels` se nepoužívá přímo v PostCard — předávají se dál do `EditPostDialog` a `PreviewDialog`.
- Ty dialogy by mohly používat `useTranslations()` vlastní.
- **Cíl:** Zkrátit props interface PostCard o ~40 properties.
- **Odhad:** 45 min

---

## 📊 Shrnutí priorit pro příští relaci

| Pořadí | # | Co | Odhad | Priorita |
|--------|---|----|-------|----------|
| 1 | #6 | Cron pro sync/cleanup | 45 min | Střední |
| 2 | #14b | Redukce props drilling (dialogy → useTranslations) | 45 min | Refactor |
| 3 | #9 | Sorting | 40 min | Nízká |
| 4 | #12 | Media preview click → lightbox | 20 min | Nízká |
| 5 | #13 | Expand/collapse text | 25 min | Nízká |
| 6 | #7 | Server-side filtrování | 1h | Střední |
| 7 | #4 (správné) | Cursor-based pagination | 2h | Vysoká |
| 8 | #10 | Bulk akce | 2h | Nízká |

**Quick wins hotovy:** #17 + #4(limit) + #11 = ✅ typová bezpečnost, ochranný limit, vizuální konzistence.
