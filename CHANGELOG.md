# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

## 2026-07-05

### 🐛 Fix — EditPostDialog + PostPreview: TikTok náhled chyběl v pravém panelu editoru

- **Kontext**: V dialogu "Upravit příspěvek" se pro Facebook, IG, YT, LI zobrazovaly věrné náhledy v pravém panelu – ale TikTok ukazoval jen prázdný placeholder s ikonou. Důvod: `renderPlatformPreview` v `edit-post-dialog.tsx` neměl case pro `"tiktok"` a `TikTokPreview` v `post-preview.tsx` používal `MediaArea aspect="square"` (1:1 čtverec) místo vertikálního 9:16.
- **Oprava**: 1) `edit-post-dialog.tsx` – přidán `tiktok: tiktokProfile` do `profileMap` + celý TikTok case do `renderPlatformPreview` (High-Fidelity vertikální náhled). 2) `post-preview.tsx` – `TikTokPreview` přepsán z `MediaArea aspect="square"` na přímé `<video>`/`<img>` s `h-full w-full object-cover` + `flex-1 overflow-y-auto` pattern jako Facebook. Náhled teď odpovídá PreviewDialog (Oko).
- **Ověření**: `npx tsc --noEmit` ✅ + manuální test – TikTok náhled v editoru i v "Oko" vypadají stejně, vertikálně 9:16 ✅ (uživatel potvrdil)
- **Upravené soubory**:
  - `src/components/edit-post-dialog.tsx`
  - `src/components/post-preview.tsx`
  - `ukol.md` (Krok 4 označen ✅)
  - `CHANGELOG.md`

### 🐛 Fix — PreviewDialog: TikTok náhled plně funkční v samostatném náhledu (Oko) na stránce Příspěvky

- **Kontext**: Dialog "Oko" (`preview-dialog.tsx`) po kliknutí na ikonu oka na stránce `/posts` zobrazoval věrné náhledy pro FB, IG, YT, LI – ale TikTok chyběl.
- **Oprava (Krok 1+2)**: Typ `PreviewPlatform`, konstanty (`PREVIEWABLE_PLATFORMS`, `PLATFORM_ACCENTS`, `PLATFORM_LABELS`), profiles state a `getTabLabel` rozšířeny o `'tiktok'`. **(Krok 3)**: Přidán case `"tiktok"` do `renderPreviewForPlatform` – High-Fidelity vertikální náhled s `h-full w-full object-cover` videem, gradient overlay, akční ikony vpravo (❤️💬🔖↗️), text + původní zvuk dole, rotující disk.
- **Ověření**: `npx tsc --noEmit` ✅ + manuální test – záložka i náhled TikTok se zobrazují správně ve stejné velikosti jako ostatní platformy ✅ (uživatel potvrdil)
- **Upravené soubory**:
  - `src/components/preview-dialog.tsx`
  - `ukol.md` (Krok 1–3 označeny ✅)
  - `CHANGELOG.md`

## 2026-07-05

### ✅ No-op — Framer `layout` na PostCard nevyvolává runtime warning

- **Kontext**: `_post-card.tsx` používá `<motion.article layout>` bez `layoutId`. Původní obava byla, že Framer Motion v12.x by mohl hlásit runtime warning pro layout animace bez `layoutId`.
- **Zjištění**: Framer Motion 12.38.0 nevyvolává žádný warning pro `layout` bez `layoutId`. Prop `layout` animuje změny vlastního layoutu karty (velikost/pozice), což je užitečné pro expand/collapse obsahu (`isExpanded`) a změnu select stavu (ring/border). Žádná oprava nepotřebná.
- **Ověření**: Code review + kontrola Framer Motion 12 docs — warning existuje jen pro deprecated `layout="position"` / `layout="size"` string hodnoty, ne pro boolean `layout`. ✅
- **Upravené soubory**: žádný (no-op)
  - `ukol.md` (Krok 4 označen ✅)
  - `CHANGELOG.md`

### 📝 Docs — Posts page: invarianta kurzorového sloupce v `posts/page.tsx`

- **Kontext**: Po opravách Kurzorů (Kroky 1–2) zůstávala v `page.tsx` tichá architektonická křehkost: `lastCursor` se počítá z `created_at`, ale `_posts-container` podporuje i `sort="publishDate"` (porovnává kurzor vůči `scheduled_at`). Reálně se bug neprojevoval, protože initial render je vždy `newest` a jakákoliv změna sortu přepíše `currentCursor` přes `fetchFilteredPosts`. Nicméně kód nezdokumentoval, proč je `created_at` kurzor safe — future úpravce by mohl změnit initial sort a kurzorový sloupec přehlídnout.
- **Oprava (dokumentace, žádná změna chování)**: Rozšířen komentář u `lastCursor` o explicitní invariantu — *initial render je vždy `newest` (DESC na `created_at`), proto kurzor z `created_at` odpovídá aktivnímu sortu; změna sortu jde přes `applyFilters` → `fetchFilteredPosts`, který `currentCursor` přepíše*. Doplněno varování: pokud kdy initial render změní sort, musí se upravit i kurzorový sloupec (nebo předat `initialSort` dolů).
- **Ověření**: `npx tsc --noEmit` ✅ + manuální kontrola („Load more" v `newest` režimu nadále funguje) ✅ (uživatel potvrdil)
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/posts/page.tsx`
  - `ukol.md` (Krok 3 označen ✅)
  - `CHANGELOG.md`

### 🐛 Fix — Posts page: zbytečné „Load more" při přesném násobku PAGE_SIZE (keyset paginace)

- **Kontext**: V `posts/page.tsx` se `lastCursor` (kurzor pro další stránku) počítal z podmínky `pagedPosts.length >= PAGE_SIZE` — tedy „pošli kurzor, kdykoli je první stránka plná". To nebralo v úvahu, zda další stránka reálně existuje. Při přesném násobku PAGE_SIZE (např. 20 nebo 40 příspěvků) byl `hasMore` sice `false` (PAGE_SIZE + 1 probe nic extra nepřinesl), ale `lastCursor` se **stejně odeslal** do `_posts-container`. Ten pak zobrazil tlačítko „Load more", po jehož kliknutí přišla prázdná stránka.
- **Oprava**: `lastCursor` se nově počítá výhradně z `hasMore` (`const lastCursor = hasMore ? pagedPosts[...].created_at : undefined`). `hasMore` z PAGE_SIZE + 1 probe je nyní single source of truth — kurzor se pošle jen tehdy, když reálně existuje další stránka.
- **Komentář**: Doplněn invariant, aby se bug nevrátil (vysvětluje proč `hasMore` a ne `length >= PAGE_SIZE`).
- **Ověření**: `npx tsc --noEmit` ✅ + manuální test (přesně 20/40 postů → žádné „Load more"; 21 postů → „Load more" přinese 1 zbytek) ✅ (uživatel potvrdil)
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/posts/page.tsx`
  - `ukol.md` (Krok 2 označen ✅)
  - `CHANGELOG.md`

### 🐛 Fix — Posts page: „Load more" rozbíjeno při `sort=oldest` (keyset paginace ASC)

- **Kontext**: Stránka Příspěvky (`/posts`) používá keyset (cursor) paginaci s PAGE_SIZE = 20. V `actions.ts` se při `sort="oldest"` (ASC) řadilo `created_at ASC`, ale kurzor se vždy aplikoval přes `.gt()` (greater-than). Při ASC by se ale mělo pokračovat `.lt()`, jinak „Load more" pod `sort=oldest` vrátil prázdnou/špatnou stránku. Stejně tak `nextCursor` se pro ASC bral z posledního řádku místo prvního, takže by další stránka začínala až za koncem seznamu.
- **Oprava**:
  1. V `fetchPostPage()` se kurzor pro `sort="oldest"` nově aplikuje přes `.lt("created_at", cursor)`. `newest` a `publishDate` (DESC) zachovávají `.gt()`.
  2. V `fetchMorePosts()` a `fetchFilteredPosts()` se `nextCursor` pro `sort="oldest"` počítá z **prvního** vykresleného řádku (ASC), pro DESC zůstává z **posledního** řádku (beze změny).
  3. Logika okomentována, aby se kurzorový bug nevrátil.
- **Ověření**: `npx tsc --noEmit` ✅ + manuální test „Load more" pod `sort=oldest` ✅ (uživatel potvrdil)
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/posts/actions.ts`
  - `ukol.md` (Krok 1 označen ✅)
  - `CHANGELOG.md`

## 2026-07-04

### Feat — Auto-Queue: updatePreferences + page.tsx rozšířeni o `posting_schedule` (Krok 5+6)

- **Kontext**: Auto-Queue feature vyžaduje ukládání uživatelského rozvrhu publikování do DB.
- **Změny**:
  1. `actions.ts` – `updatePreferences` čte `posting_schedule` z FormData jako JSON string, parsuje a přidá do update dat s `try/catch`.
  2. `page.tsx` – SELECT query načítá `posting_schedule` z DB (JSONB), předává jako `PostingSchedule | null` prop.
  3. `preferences-form.tsx` – nový `export interface PostingSchedule`, stav s default hodnotou (`enabled: false`, Po–Pá 09:00), FormData serializuje rozvrh jako JSON.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test uložení předvoleb ✅
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/settings/preferences/actions.ts`
  - `src/app/[locale]/(dashboard)/settings/preferences/page.tsx`
  - `src/app/[locale]/(dashboard)/settings/preferences/preferences-form.tsx`

## 2026-07-04

### 🐛 Fix — Dashboard: data pro Recent Posts / Top Labels / Platform Breakdown byla namapovaná na špatné query výsledky

- **Kontext**: Dashboard v `src/app/[locale]/(dashboard)/page.tsx` po předchozím client-side přepisu rozbil synchronizaci proti stránce Příspěvky. V `Promise.all` bylo po páté položce špatně seřazené destructuring pořadí, takže:
  1. `post_tags` widget dostával data z recent posts query,
  2. donut chart dostával data z `post_tags` místo `post_platforms`,
  3. consistency/streak/trend pracovaly s cizím shape,
  4. recent posts četly jen `created_at` a zároveň query sahala na neexistující sloupce `posts.title` a `posts.status`.
- **Oprava**:
  1. Srovnáno pořadí výsledků z `Promise.all`, aby každá dashboard karta četla správný dataset.
  2. Recent posts query nově bere `id, content, created_at, post_platforms(platform, status)` místo neexistujících `title/status`.
  3. Dashboard recent posts nově používají stejnou status logiku jako stránka Příspěvky přes `normalizePost()`, takže badge i obsah vycházejí ze stejného source of truth.
  4. Dočištěn lokální technický dluh v dashboard souboru (`any`, nepoužitý import, `Math.random()` v React key), aby soubor znovu prošel lintem bez warningů a errorů.
- **Ověření**:
  - `npx eslint 'src/app/[locale]/(dashboard)/page.tsx'` ✅
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/page.tsx`
  - `CHANGELOG.md`

### 🐛 Fix — Dashboard #2: Hardcoded CZ text v ConsistencyScore → i18n (CS/EN/UK)

- **Kontext**: Komponenta `ConsistencyScore` na dashboardu (`page.tsx`) zobrazovala hardcoded české texty `"Výborná konzistence!"`, `"Dobrá, můžeš lepší!"`, `"Zkus postovat pravidelněji."` — EN/UK uživatelé viděli češtinu.
- **Oprava**:
  1. Do `src/messages/cs.json`, `en.json`, `uk.json` přidány klíče `consistencyExcellent`, `consistencyGood`, `consistencyImprove`.
  2. Komponenta `ConsistencyScore` nově přijímá prop `t: (key: string) => string` a volá `t("consistencyExcellent")` / `t("consistencyGood")` / `t("consistencyImprove")` místo hardcoded řetězců.
  3. Volání na ř. 184 rozšířeno o `t={t}`.
- **Ověření**:
  - `node -e "JSON.parse(...)"` pro cs.json, en.json, uk.json ✅
  - `npx tsc --noEmit` ✅
- **Upravené soubory**:
  - `src/app/[locale]/(dashboard)/page.tsx`
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`
  - `CHANGELOG.md`
  - `ukol.md`

### 🐛 Fix — TikTok private-only policy: detekce podle `error.code` + přesnější UX text

- **Kontext**: TikTok `video/init` dál padal i při `privacy_level: "SELF_ONLY"`. Runtime log ukázal, že API vrací policy identifikátor v `error.code = unaudited_client_can_only_post_to_private_accounts`, zatímco naše app private-only chybu hledala v `error.message`, kde je jen obecný odkaz na guidelines. Tím pádem se nespouštěl lokalizovaný handler a uživatel viděl syrový anglický toast.
- **Oprava**:
  1. V [publish-tiktok.ts](file:///c:/VS_Code/Postio/src/lib/actions/publish-tiktok.ts) se TikTok private-only chyba nově mapuje primárně z `initData.error.code`, ne jen z `error.message`, takže UI dostane správný `errorCode`.
  2. V [tiktok-publish-errors.ts](file:///c:/VS_Code/Postio/src/lib/tiktok-publish-errors.ts) a překladech `cs/en/uk` zpřesněn text chyby: u neauditované TikTok app nestačí pouze `SELF_ONLY` na příspěvku, ale samotný TikTok účet musí být při publish nastaven jako soukromý.
  3. V [process-scheduled-posts/index.ts](file:///c:/VS_Code/Postio/supabase/functions/process-scheduled-posts/index.ts) se stejná TikTok policy chyba ukládá i s `error.code`, aby scheduled flow nereportoval jen neurčitý guideline odkaz a private-only retry logika měla konzistentní vstup.
  4. Pro aktivní debug session `tiktok-private-publish` zůstává do potvrzení uživatele dočasně zapnutá instrumentace do Debug Serveru v app publish flow a v UI error mapperu.
- **Ověření**:
  - `npx eslint src/lib/actions/publish-tiktok.ts src/components/edit-post-dialog.tsx supabase/functions/process-scheduled-posts/index.ts src/lib/tiktok-publish-errors.ts` ✅
  - `npx tsc --noEmit` ✅
  - `npm run build` ✅
- **Upravené soubory**:
  - `src/lib/actions/publish-tiktok.ts`
  - `src/lib/tiktok-publish-errors.ts`
  - `src/components/edit-post-dialog.tsx`
  - `src/messages/cs.json`
  - `src/messages/en.json`
  - `src/messages/uk.json`
  - `supabase/functions/process-scheduled-posts/index.ts`
  - `debug-tiktok-private-publish.md`
  - `CHANGELOG.md`

*Starší historii projektu a předchozí milníky najdete v historii Git commitů na GitHubu.*
