# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

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

### 🐛 Preview: media přetékala přes zooblené rohy na FB/LinkedIn karte ✅

- **Kontext:** `MediaArea` v `post-preview.tsx` má `overflow-hidden` ale bez `border-radius`; FB/LinkedIn article mají `rounded-lg` ale bez klipovania enfants → ostré rohy obrázku přetékaly mimo zaoblené rohy karty. IG bola v pořádku (media flush k vnější viewportu `rounded-[20px] overflow-hidden`).
- **Změny** (`post-preview.tsx`): FB media zamykana v `overflow-hidden rounded-lg` (r. 891), LinkedIn media dostala `rounded-lg` na wrapper (r. 1153). Vzor ze X preview (`overflow-hidden rounded-2xl`).
- **Ověření:** `npx tsc --noEmit` ✅. Manuál vizuální test uživatelem (přetékání opravené).

### ⚙️ Media validace: per-platform policies registry + validator (KROK 1/5) ✅

- **Kontext**: Validace médií v Postio byla obecná (MIME allow-list, velikostové capy, video rez. warning) + jediný IG-specific block (video <640 px). Pravidlo „IG = JPEG-only + poměr 4:5–1.91:1" z CLAUDE.md „Bibla pravidel" existovalo JEN v dokumentaci, nikdy v kódu. Rozhodováno: sjednotit validaci per-platform pro všech 6 platforem (FB, IG, LI, YT, X, TikTok) je moderný mechanismus.
- **Změny**:
  - ✅ Nový čistý (pure TS) modul `src/lib/media/platform-policies.ts` – jediný zdroj pravdy: `MediaPolicy` per platform (support, allowed MIME, max velikost, poměr, min rez., max délku, max počet médií), registry `MEDIA_POLICIES` + `getPlatformPolicy`, validator `validateCandidate` / `validateMediaForPolicies` / `isMediaCompatibleWithPlatform`. Poměr → warning, ostatní → error. Požiadavky z officialní dokumentace (Meta Graph API, LinkedIn Assets API, Sprout Social specs, X API, TikTok API).
  - ✅ KROK 2 – `posts/new` editor: platform badge + tooltip u platform card, konsolidovane varování banner, hard-block Publish/Schedule/Queue na media error (nahradil IG-specific video block).
  - ✅ KROK 3 – `edit-post-dialog`: integráci validatoru + sdílená komponenta `PlatformMediaBadge` (extrahovaná z posts/new, používaná obojí editorom), nahrazené 5 IG-only guardov obecným mechanismem.
  - ✅ KROK 4 – Server-side media pre-flight v `publish.ts` (`preflightPlatformMedia`): refuze publish před platform API (obraz → TikTok/YouTube, video → LinkedIn, count > maxFiles), skip row s explicit error; obojí entry points (`publishPost` + `publishAdditionalPlatforms`); nová `validateMediaCount` v platform-policies (count check sdílený klient/server); poznámka pro scheduled Edge Function. Otestováno: X+5 obrázków → blokován, TikTok+obrázek → skip s msg.
  - ✅ KROK 5 – i18n: `ValidationIssue.params` + nový čistý helper `src/lib/media/media-message.ts` (`mediaIssueText`), badge aria-label/tooltip a banner v obojích editeřech mapujú `mediaPolicy_*` klíče (cs/en/uk); natvrdo slovenský title nahrazen `mediaPolicyBlockTitle`. Aktualizovaná „Bibla pravidel" (CLAUDE.md + AGENTS.md) – validace médií teraz platí pro všech 6 platforem přes `platform-policies.ts`.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb) – čistý modul, editorské integrace, i18n, dev server kompiluje `/cs/posts/new`.

### 🎨 Onboarding checklist: trvale schování po 4/4 (`onboarding_checklist_dismissed`) ✅

- **Kontext**: Setup-guide modál „Dokončete nastavení" se schovával křížkem jen přes `localStorage` (`setup-dismissed`) – po přihlášení v jiném browseru/device se vrátil i po kompletním checklistu (4/4).
- **Změny**:
  - ✅ Migrace `059_add_onboarding_checklist_dismissed.sql` – nový sloupec `users.onboarding_checklist_dismissed BOOLEAN NOT NULL DEFAULT false` (bezpečný pro existující uživatele: výchozí false = chování bez změny).
  - ✅ `setup-guide.tsx` – `handleDismiss` píše flag do DB jen po kliku na křížek při 4/4 (automatické schování bez kliku se nedělá – užívatel musí scena zavřít). Čtenie flag na mount před `ready` (bez bliknutí modálu); `localStorage` zůstává jako rychlá session cesta.
  - ✅ `types.ts` – sloupec doplnen v users Row/Insert/Update.
  - ✅ i18n: bez nových textů (Variant A – zero extra UI). RLS bez změny – „Users can update own row" existuje.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Migrace spuštěná ručně na produkční DB. Commit `ffaee8c`, push main + `feature/fix_checklist_modal` (fast-forward).

### 🎨 Notifikace: dedikovaná stránka /settings/notifications ✅

- **Kontext**: Menu položka „Notifikace" mířila na /settings/notifications, jež nikdy neexistovala → 404 na každé dashboard stránce. Dle výboru Opci A přesunuta sekci „E-mailová upozornění" z /settings/preferences na vlastnu stránku, aby menu vedlo na reálně existující stránku a „Notifikace"/„Předvolby" byly opravdu dvě oddělené věci.
- **Změny**:
  - ✅ Nová stránka `settings/notifications/` (page.tsx + notifications-form.tsx + actions.ts). Nová akce `updateNotifications` píše **jen** pole `email_low_credit_alert`/`email_weekly_summary` do **stejných DB sloupců** jako dřív preferences (žádná nová migrácia, žádná ztráta nastavení uživatelů).
  - ✅ `preferences-form.tsx`/`page.tsx` – sekci, state, submit, labels a importy pro e-mail toggle odstranené (−84 řádků).
  - ✅ Sidebar/mobile-nav – href „Notifikace" opět na /settings/notifications; menu už nevede dvě položky na stejné místo.
  - ✅ i18n: nové klíče `notificationsDescription`, `notificationsSaved` v cs/en/uk.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). UI test manuálně (potřebuje Supabase env + přihlašenie).

### 🐛 Meta Insights sync – parsování metrik opraveno (Meta Graph API `values[]`) ✅

- **Kontext**: Sync analytiky ve `analytics/actions.ts` (`fetchMetaInsights`) četl `item.value`, ale Meta Graph API Insights vracá itemy jako `{"name":"impressions","values":[{"value":123}]}` – hodnota je uvnitř poles `values[0].value`. Následek: `item.value` byl vždy `undefined`, žádná smyčka větev se nevykonala a všechny metriky se zapísaly jako 0.
- **Změny** (`analytics/actions.ts`):
  - ✅ Zdroj hodnoty změnený na `item.values?.[0]?.value ?? 0` (bezpečný fallback na 0) – metriky (impressions, engagement, likes, comments, shares, clicks, saves) nyní se reálně populují z Meta.
  - ✅ Odstranený mrtvý kód: větev `Array.isArray(val)` s obranou `[{ metric_name, value }]` – `val` je nyní vždy number, takže ta větev by se nikdy nevykonala. Smyčka zjednodušena na `if (name) metricMap.set(name, val)`.
  - ✅ **Fáza 2 – verze API v26.0 + skutečné metriky per platform**: sjednoceno na `graph.facebook.com/v26.0`; IG `external_id` ve formě `shortcode|media_id` → extrakce `media_id` (zrcadlí `resolveMetaReconcileId`); FB new valid Page-post metrics `post_clicks, post_total_media_view_unique, post_media_view` + `&period=lifetime` (IG default `day`).
  - ✅ **Fáza 3 – IG přepnuto na media-level insights**: Meta account-level metric names (`follower_count, website_clicks, profile_views, online_followers, accounts_engaged`) Meta pro `/{media_id}/insights` odmítala #100; nahrazeny media-level sadou `impressions, reach, likes, comments, shares, saved, follows, total_interactions, profile_visits, link_clicks`. Mapování: `impressions ← reach ?? impressions` (karta „Celkový dosah" čte pole `impressions`, i18n label je „reach" – proto reach primární), `engagements ← total_interactions`, `likes ← likes`, `comments ← comments`, `shares ← shares`, `clicks ← link_clicks`, `saves ← saved`. IG likes/comments/shares/saved už **nejsou natvrdo 0** (media-level je poskytuje). FB likes/comments/shares/saved zůstávají 0 (Page-post v26.0 je neposkytuje, TODO viz komentár v kódu).
  - ✅ **Dokumentácia App Review zaktualizowana do stanu kódu**: `docs/meta-review-justifications.md`, `docs/meta-review-submission-notes.md`, `docs/meta-review-v2.md` — staré insight endpoint příklady (v20.0, metric `impressions,engagement,likes_count,comments_count,shares,outbound_clicks,saved_posts`) nahrazené aktuálními: FB `GET /{external_id}/insights?metric=post_clicks,post_total_media_view_unique,post_media_view&period=lifetime` (v26.0) + IG media-level `GET /{media_id}/insights?metric=impressions,reach,likes,comments,shares,saved,follows,total_interactions,profile_visits,link_clicks`. Checklist PŘÍPRAVA PŘED NATÁČENÍM popisuje precisa scattere text, coa reviewer v Scene 8 uvidí.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb).



