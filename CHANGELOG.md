# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🐛 HOTFIX: Publish tlačítko – stabilizace pozice (KROK 1) ⏳

- **Kontext**: Bug #1 z ukol.md (branch `fix/publish-button-layout-and-delete-i18n`): publish tlačítko „cukne a posune se dolů", první klik neproběhne. Analýza: nad řadou tlačítek se vykresluje media-policy banner, který při objevení/skrytí posouvá řadu tlačítek dolů (layout shift → klik se spolkne).
- **Změny (KROK 1)**:
  - ✅ `posts/new/page.tsx` – media-policy banner obalen rezervovaným slotem `min-h-[44px]` (aktivní jen když `selectedPlatforms.length > 0`), aby se řada tlačítek nepohla při objevení banneru.
  - ✅ `edit-post-dialog.tsx` – stejný rezervovaný slot kolem banneru (2714/2749).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuál test v prohlížeči (1. klik musí publikovat bez posunu) – čeká na uživatele. Další kroky dle plánu: KROK 2 (stabilizace šířky tlačítka), KROK 3 (press animace).

### 🧹 ESLint: oprava `react-hooks/set-state-in-effect` v edit-post-dialog (2 errori) ✅

- **Kontext**: `npx eslint src/components/edit-post-dialog.tsx` hlásil 2 errori `react-hooks/set-state-in-effect` (synchronní `setState` v těle efektu) – na ř. 793 (X gating filtr) a ř. 855 (TikTok username seed). Oba ležaly mimo i18n diffu (commit `49c7141`), proto zapsané jako oddělený TODO úkol.
- **Změny** (`src/components/edit-post-dialog.tsx`):
  - ✅ **X gating** – filtr direct X účtů (při `twitterAutoCredits <= 0`) přesunut z `useEffect` do async fetch callbacku `loadAccounts` (data-load event → legitimní `setState` po `await`; chování identické, žádná regrese).
  - ✅ **TikTok username** – state `tiktokUsername` nahrazen derivaciou `tiktokUsernameFromDb ?? tiktokCreatorInfo?.creatorUsername ?? null` (DB-resolved hodnota má prioriteto, jinak `creator_info` cache); efekt robí jen async fetch do `tiktokUsernameFromDb`, `tiktokCreatorInfo` vypadl z efekt deps. Žádný synchronní set v efektě.
- **Ověření**: `npx eslint src/components/edit-post-dialog.tsx` ✅ **0 errors** (3 warningy předexistující – exhaustive-deps, media-has-caption, no-img-element), `npx tsc --noEmit` ✅ (0 chyb), `npm run build` ✅ (EXITCODE=0). Manuál test X gating + TikTok live URL u uživatele ✅ (2026-09-28).

### 🌐 Editace postu: tlačítko „Aktualizovat na {platform}" + info popisek – i18n oprava ✅

- **Kontext**: Na stránce editace publikovaného postu se u sítí s podporou editace (napr. Facebook) zobrazuje tlačítko „Aktualizovat na {platform}" a nad ním info popisek „Text byl změněn…" – obojí mělo natvrdo zacompilované české stringy ve frontend kódu, takže v EN/UK (a částečně i češtině, hybrid „Publikovat na Facebook") zůstávalo špatně. Kritické řádky: `src/components/edit-post-dialog.tsx` 1166, 2761, 2794, 2810.
- **Změny**:
  - ✅ 4 nové ICU klíče s placeholderem `{platform}` v namespacech `posts` **i** `calendar` v cs/en/uk: `publishToPlatform` (nahradil hybrid `{t("publishToSelected")} na {platformLabel}`), `updateOnPlatform`, `contentChangedUpdatePrompt`, `remoteUpdateSuccess` (toast po aktualizaci).
  - ✅ Hardcoded stringy nahrazené voláním `t("...", { platform: platformLabel })` – překlad se nyní řídí vybranou lokálí (cs/en/uk).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), `npm run build` ✅ (EXITCODE=0), ICU formátování ověřeno přes `next-intl` translator (vše 3 locale: „Update on Facebook", „Оновити на Facebook"…). ESLint: 2 errory na ř. 793/855 jsou **předexistující** (mimo diff hunky, `react-hooks/set-state-in-effect`), zatím netknuto.

### 🐛 Preview modal: light mode – oprava natvrdo tmavého chrome ✅

- **Kontext**: Modal "Zobrazit náhled" (`preview-dialog.tsx`, používán na Kalendáři i Posts) zůstával v light mode natvrdo tmavý – neladil s okolím. Samotná high-fidelity simulace feedů (FB/X/IG/TikTok) zůstává tmavá záměrně (věrná reálným sítím); opraveno okolní chrome modalu.
- **Změny**:
  - ✅ `DialogContent` – `bg-black/95 border-white/10` → `bg-background/95 border-black/5 dark:border-white/10` (theme-aware pomocí CSS proměnných).
  - ✅ Tab bar – `border-white/10 bg-white/[0.03]` → `border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03]`.
  - ✅ View Live tlačítko – `text-indigo-300` → `text-indigo-600 dark:text-indigo-300` (kontrast ve světlém).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuál test v light + dark režimu (uživatel potvrdil).

### 📊 Kalendář: per-target analytics (KROK 2+3, FÁZE 1B) + rozšíření Posts ✅

- **Kontext**: FÁZE 1 per-target analytiky hotová pro DB/backend/Posts/Analytics; Kalendář byl poslední vynechaný dílek. Přidána server-side agregace + UI badge na kalendáři, stejný vzor přenesen na Posts stránku.
- **Změny**:
  - ✅ **KROK 2 (fetch + agregace)** – `calendar/page.tsx`: `postIds` + fetch `analytics` `.in("post_id")` (bez period filtru, aktuální stav snapshotu), agregace `Map<post_id,{impressions,engagements}>` reduce **SUM přes řádky**. Klíčové: tabulka není time-series (migrace 060/061 = `UNIQUE(post_platform_id)`, 1 řádek = 1 platforma) → FB+IG post = součet obou řádků, žádné dvojnásobení. `src/types/calendar.ts` – `Post.analytics?`.
  - ✅ **KROK 3 (UI)** – `post-calendar-chip.tsx`: pro published se `engagements > 0` badge `Heart` + krácené číslo (`ml-auto`, jemné); `hover-preview.tsx`: published se `analytics` → řádek `Eye` (dosah) + `Heart` (interakce). Bez nových i18n klíčů.
  - ✅ **Rozšíření Posts** – sdílený helper `src/lib/analytics-summary.ts` (`fetchAnalyticsByPost`, single source of truth, použit i Kalendářem – žádná duplicitní fetch logika); `formatCompactNumber` přesunut do `src/lib/format.ts` (re-export z calendar chip); analytics připojen ve 3 entry pointech Posts (`page.tsx`, `fetchMorePosts`, `fetchFilteredPosts`); `_post-card.tsx`: jemná pilulka `Eye`+`Heart` **v patičce karty** (datum vlevo, metriky vpravo `ml-auto`; hlavička kolidovala s hover ikonami → přesunuto).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb) + `npm run build` ✅ (celý projekt kompiluje). Viz open retest Kalendáře (refaktor 1:1 na helper, chování identické) a manuál test Posts (published badge, Load more/filtr).

### 🔶 FÁZE 2 (příprava): LinkedIn Analytics – ukládání scope_list (KROK C) ⏳

- **Kontext**: Pokračování FÁZE 2. Migrace 062 (`scope_list` TEXT[] nullable) aplikovaná na produkci 2026-09-17; KROK B (banner + data flow) commitnutý (`9da23e9`). KROK C připravuje ukládání `scope_list` při OAuth reconnectu, akivace proběhne s KROKEM D (přidání `r_member_postAnalytics` do scope, až LinkedIn schválí CM API).
- **Změny**:
  - ✅ `src/app/api/accounts/linkedin/route.ts` – konstanta `TARGET_SCOPES` (single source of truth pro authorize URL i `scope_list`); hardcoded scope string nahrazen `TARGET_SCOPES.join(" ")` (identické chování, žádný scope navíc); upsert doplněn o `scope_list` s KROK D gate – uloží se jen když `TARGET_SCOPES` obsahuje `r_member_postAnalytics` (dnes NULL).
  - ✅ `src/lib/scope-utils.ts` (nový) – dva helpery: `hasScope(scopeList, scope)` (NULL/undefined → `false`, použit v gate v route) a `needsReconnect(scopeList, scope)` (banner).
  - ✅ `page.tsx` – banner přepnut na `needsReconnect(...)`. 🐛 **Bugfix:** `!hasScope()` sloučil „scope neznámo" (NULL) s „víme, že nemá" a banner se chybně zobrazil u legacy účtu (Kateřina Nyklová); `needsReconnect` vrací `true` jen pro ne-null pole bez scope → NULL účty se neobtěžují.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Banner se dnes nikde nezobrazuje (`scope_list = NULL` u všech účtů → `needsReconnect` = `false`).
- **Následující kroky (čekají na LinkedIn schválení)**: KROK D (přidání `r_member_postAnalytics` do `TARGET_SCOPES` – zapne ukládání i banner), KROK E (analytics stránka).

### 🔶 FÁZE 2 (příprava): LinkedIn Analytics – DB migrace + UI banner (KROK A+B) ⏳

- **Kontext**: Čekáme na schválení LinkedIn produktu „Community Management API" (mimo appku). Až projde, začneme žádat scope `r_member_postAnalytics` (Member Post Analytics – impressions/engagement na osobním profilu). Stávající tokeny scope ale získají až po reconnectu, takže aplikace potřebuje vědět, které účty ho nemají.
- **⚠️ Rozlišení**: `r_member_postAnalytics` (analytics, cíl této fáze) ≠ `r_member_social` (čtení posts, historický scope – byl přidán a zase odebrán 2026-08, protože LinkedIn developer app ho nemá schválený). Historie `r_member_social` se touto fází neřeší.
- **Změny**:
  - ✅ **KROK A** – `supabase/migrations/062_social_accounts_scope_list.sql`: `ALTER TABLE social_accounts ADD COLUMN scope_list TEXT[] DEFAULT NULL` (záměrně bez NOT NULL → legacy účty zůstanou `NULL` = „scope neznámo"). Bez indexu – tabulka je malá, GIN by byl zbytečná režie. **Aplikováno na produkční DB 2026-09-17** (sloupec `scope_list` TEXT[] nullable potvrzen).
  - ✅ `src/lib/supabase/types.ts` – `scope_list: string[] | null` doplněn do `social_accounts` Row/Insert/Update. Čistě typová definice na straně klienta (nic nespouští, nic nemění chování appky, dokud sloupec reálně nevznikne v DB) – připravuje kód pro KROK B/C.
  - ✅ **KROK B** – LinkedIn scope-warning banner v `src/app/[locale]/(dashboard)/accounts/page.tsx` (inline blok za existující expired/expiring varováními): ikona `Lock` + `scopeReconnectPrompt` + Reconnect. Podmínka: `platform === "linkedin" && scope_list != null && !scope_list.includes("r_member_postAnalytics")` (NULL = legacy = nezobrazí). Reconnect využuje existující `handleReconnect` → `/api/accounts/linkedin` (scope string SE NEMĚNÍ – až KROK D).
  - ✅ **KROK B (data flow):** `src/app/api/accounts/route.ts` – `scope_list` doplněn do `.select()` GET + typ `SocialAccountRow` + `sanitizeSocialAccount` (scope list je nesenzitivní, na rozdíl od `metadata`); typ `SocialAccount` v page.tsx + `scope_list?: string[] | null`. i18n klíč `scopeReconnectPrompt` v cs/en/uk (key-tree identický).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). JSON i18n validní ve všech 3 localech. **Banner se dnes NIKDE nezobrazí** (scope_list u všech účtů NULL → podmínka false) – správně, ověřeno staticky.
- **Následující kroky (čekají)**: KROK B (UI banner na `/accounts` pro účty bez scope), KROK C (ukládání `scope_list` v `linkedin/route.ts`), KROK D (přidání scope do OAuth stringu – až po LinkedIn schválení).

### 📊 Analytics: per-target drill-down v "Výkon příspěvků" (KROK C) ✅

- **Kontext**: Po migraci per-target (1 řádek analytiky na `post_platform_id`) zůstávala Analytics stránka agregovaná – post s FB+IG se zobrazoval jak jeden řádek, nešlo vidět, kolik přinesla konkrétní síť/účet. KROK C přidává per-post rozpad podle cílených sítí.
- **Změny**:
  - ✅ **C1** (`analytics/page.tsx` + `analytics-dashboard.tsx`): nový server-side fetch `post_platforms` (id, post_id, platform, account_id + join `social_accounts(account_name, avatar_url)`) pro `postIds`; nová typ `PostTarget`; prop `postPlatforms`; `AnalyticsRecord` rozšířen o `post_platform_id`. Žádná UI změna v C1.
  - ✅ **C2** Drill-down akordeon v Top Performing Posts: chevron ikona (jen u multi-target postů, `aria-expanded`) → rozpad per platforma/účet s avatarem/ikonou **znovupoužitým z Posts přepínače** (sdílená `platformIconFor` v `social-icons.tsx`, `_post-card` přepnut na ňu), metrika Dosah/Interakce + podíl %. **Podíl % se počítá z interakcí (stejná metrika co hlavní číslo karty), ne z dosahu** – guard `total > 0` jinak `0 %` (bez NaN); platformy bez analytics řádku → 0 (Varianta B). Mapy `targetById`/`targetsByPost`/`analyticsByTarget`.
  - ✅ **C3** i18n: **žádné nové klíče** – rozpad reusuje existující `platformBreakdown` (cs/en/uk); CHANGELOG.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuál test: post s interakcemi 2/2 → postio.cz 100 % / druhá 0 % (bugfix % z interakcí potvrzený).

### 📊 Analytics page: server-side filtr období (KROK A) ✅

- **Kontext**: Analytics stránka `/[locale]/analytics` četla všechny analytics řádky ze Supabase bez server-side filtru na období. V per-target modelu to znamenalo větší payload (všechny historické řádky).
- **Změny** (`src/app/[locale]/(dashboard)/analytics/page.tsx`):
  - ✅ Přidán server-side filtr `gte("recorded_at", cutoff.toISOString())` do fetch query `analytics` – klient dostane jen řádky z daného období (7/30/90 dní).
  - ✅ Přidán URL `searchParams` parameter `period` pro synchronizaci filtru mezi server-side a client-side.
  - ✅ `AnalyticsDashboard` stále vlastní lokální `period` state a filtruje `analytics.filter(recorded_at >= cutoff)` – server-side filtr je optimace, klient si ponechává kontrolu nad UI.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb).

### 🔄 Analytika per-target (KROK 1–4): DB + sync + UI přepínač účtů ✅

- **Kontext**: Analytika přechází z agregovaného modelu (1 řádek na `post_id`, sčítá FB+IG) na per-target model (1 řádek na `post_platform_id`). Na Posts kartě se u multi-target postů zobrazí přepínač účtů.
- **Změny**:
  - ✅ **KROK 1** `060_analytics_post_platform_id.sql`: DROP `analytics_post_id_unique`, sloupec `post_platform_id` (FK CASCADE), `UNIQUE(post_platform_id)`; `post_id` zůstává běžný indexovaný sloupec. Prod: DELETE test řádků + migrace OK.
  - ✅ **KROK 1b** `061_analytics_post_platform_id_not_null.sql`: `post_platform_id SET NOT NULL` (+ safety DELETE NULL).
  - ✅ **KROK 2** `analytics/actions.ts`: per-target upsert (`onConflict: post_platform_id`), lookup tokenu přes `account_id`, zero-overwrite guard (skip zápisu nul přes nenulová data). `types.ts` + `post_platform_id`.
  - ✅ **KROK 3–4** Posts: select join `social_accounts(account_name, avatar_url)`; `normalize-post` flatten; `_post-card` hover-přepínač (jen `length > 1`) — indigo ring + pilulky se jmény/avatary (mobile vždy, desktop group-hover).
- **Ověření**: `npx tsc --noEmit` ✅. Manuál UI test přepínače na `/posts` (2026-09-15). Analytics page + Kalendář = budoucí krok.







