# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

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

### 🔄 Prompt 065 – Meta App Review fix v2 (DOKONČENO): Revize justifikací + scénář v3 + config_id verifikace + submission notes ✅

- **Kontext**: Meta revizor i po Prompt 065 zamítl 3 oprávnění (`pages_manage_posts`, `pages_read_engagement`, `instagram_content_publish`) s důvodem "Screencast fails to demonstrate the end-to-end experience". Chyběl live proof na FB/IG, ukázka obsahu postu v UI a editace/smazání. Zároveň consent dialog (Facebook Login for Business) nezobrazoval `pages_manage_posts` — i když byl v scope stringech, v Login Configu ho nebylo.
- **Změny** (dokumentace + úprava OAuth scope stringu v `accounts/page.tsx`):
  - ✅ `docs/meta-review-justifications.md` (v2.1): nové zdůvodnění všech 3 oprávnění kotvené v reálném kódu (publish.ts: `POST /{page_id}/feed`/`photos`/`videos`; IG `media` + `media_publish`; `updateOnPlatformAction` = remote edit `POST /{external_id}`; `deleteFromMeta` = `DELETE /{external_id}`; `analytics/actions.ts` = `GET /insights?metric=…`; `_post-card.tsx` = obsah post.Is v UI). `pages_read_engagement` nyní pokrývá OBĚ strany: zobrazení obsahu postů (Posts) i metriky (Analytics).
  - ✅ `docs/meta-review-v2.md` (v3): kompletní přepis scénáře pro nahrávání. Nové POVINNÉ scény: **Scene 4** live FB Page po publishi, **Scene 5** remote EDIT captionu (→ live FB ukáže změněný text), **Scene 6** DELETE (→ live FB post zmizí), **Scene 7** obsah postu v UI (`/posts`, obsah+karta+thumbnail+datum+odkaz), **Scene 8** Analytics s reálnými nenulovými daty (48h přednatáčení post + engagement ze 2. účtu), samostatný **modul B pro IG** (`instagram_content_publish`, publish fotky + live IG profil). Modrý Facebook consent dialog ≥5 s se všemi zaškrtnutými scopy; na začátek PŘÍPRAVY přidán ✅ bod „`pages_manage_posts` přidán do Login Configu `891876470597727`"; k Scene 5/6 doplněno **HARD REQUIREMENT** – scény MUSÍ proběhnout bez chybové hlášky (capability error #3), jinak se video nesmí použít.
  - ✅ Submission Notes šablona na konci justifikací: demo účet (placeholdery), postup pro revizora (kde Connect Facebook, kde Analytics), Business Verification = COMPLETED, mapping oprávnění↔scény↔timestamps.
  - ✅ (Meta dashboard, mimo kód) `pages_manage_posts` přidáno do Login Configu `891876470597727` (uživatelem). Consent dialog nyní zobrazuje přesně 6 oprávnění: `business_management`, `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` (text „Create, edit and delete posts on your Pages").
  - ✅ `accounts/page.tsx` — config_id `891876470597727` ověřen: hardcoded ve 2 blocích (r. 1100 IG, r. 1121 FB), NENÍ v `.env.local`/`.env.example`, žádný zdvojení → kód neměněn. Z IG scopes (r. 1096) odebrány `instagram_manage_comments` a `instagram_manage_insights` (v Login Configu nejsou a fully repo grep ukázal, že je kód reálně NEPOUŽÍVÁ – jediný výskyt byl scope string). IG větev = `public_profile,email,instagram_basic,instagram_content_publish,business_management,pages_show_list,pages_read_engagement,pages_manage_posts` — nyní odpovídá configu.
  - ✅ `docs/meta-review-submission-notes.md` (NOVÝ): čistý anglický copy-paste text pro Meta App Dashboard (Use case description + App Verification Details), placeholdery `[DEMO_EMAIL]`, `[DEMO_PASSWORD]`, `[VIDEO_URL]`, `[MM:SS]`, tabulka oprávnění↔scény↔timestamps.
  - ✅ `posts.ts` — fix falešného `removed_externally` u IG post: Meta reconcile (`syncPostStatus` a `syncPublishedPosts`) vkládal do URL celý `external_id` = `"shortcode|media_id"`, co Meta odmítal s 400/#100 → post omylou označen jako „removed on Instagram". Nová sdílená helper `resolveMetaReconcileId` extrahuje `media_id` z pipe formátu (analogicky k `deleteFromMeta`); FB chování beze změny; nepoužitélný/poškozený id → skip reconcile s `console.warn`, output: `npx tsc --noEmit` ✅ (0 chyb). POZNÁMKA: `cron-sync.ts` nemá Meta reconcile branch (IG/FB padají do `else` a jen zapisují `last_sync_at`), proto tam oprava nebyla nutná.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Code-level audit bod 2a (Analytics má `?? 0`, EmptyChartMessage, žádné NaN/undefined), 2b (obrazovka obsahu = `/posts` přes `_post-card.tsx`), 2c (EDIT/DELETE funkční přes Graph API u FB). 🐛 POZOR: remote edit u FB může narazit na Meta capability chybu #3 ("remote editing requires App Review") – toto právě řeší submission; v kódu je ošetřeno.
- **STOP dle Pravidla 2**: texty + audit hotové, video nahrává uživatel sám.

### 🔄 Prompt 065 – Meta App Review fix: Revidované justifikace + scénář videa v2 + UI audit ✅

- **Kontext**: Meta revizor zamítl 3 oprávnění (`pages_manage_posts`, `pages_read_engagement`, `instagram_content_publish`) s důvodem "Screencast fails to demonstrate the end-to-end experience". Revizor chce vidět (1) skutečný post na FB/IG po odeslání z app a (2) jak app zobrazuje engagement data v UI.
- **Změny**:
  - ✅ `docs/meta-review-justifications.md` (nový): Konkrétné anglické zdůvodnění pro všech 3 zamítnuté permissiony. Kotví každý text v pravdom kódu: publish přes Graph API v20.0 (`POST /{page_id}/feed`; IG media container + `media_publish`), čtení engagement přes `GET /{external_id}/insights` (metric `impressions,engagement,likes_count,comments_count,shares,outbound_clicks,saved_posts`) a jeho zobrazení na stránce **Analytics** (metric cards Reach/Engagements/Engagement Rate/Likes/Comments/Shares/Clicks/Saves, area chart Performance Over Time, Top Performing Posts, Posts by Tag) – ospravedlnuje `pages_read_engagement`.
  - ✅ `docs/meta-review-v2.md` (nový): Vylepšený scénář screencastu. Nová **povinná Scene 5** – otevření live Facebook Page + Instagram profilu v stejném browseru a ukázka publikovaného postu; **Scene 6** – Sync Analytics a ukázka renderovaných engagement metrik v UI; **Scene 7** – čistý prázdný stav s nulami jako poctivý fallback.
  - ✅ UI audit (bez code změn): Stránka `/analytics` už zobrazuje čisté nuly na metric kartách a vkusné empty stavy v chartech (EmptyChartMessage), Top Performing Posts (ikona + `noDataSubtitle`) a Posts by Tag (`noTagsBreakdown`), plus Skeleton na Dashboardu prý prázdném stavu – nemusel být žádný kód meněn.
- **Ověření**: Code-level audit (úprava netřeba). Dokumenty připravené pro natočení nového videa – uživatel nahrává video sám.


