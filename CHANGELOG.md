# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🐛 Meta Insights sync – parsování metrik opraveno (Meta Graph API `values[]`) ✅

- **Kontext**: Sync analytiky ve `analytics/actions.ts` (`fetchMetaInsights`) četl `item.value`, ale Meta Graph API Insights vracá itemy jako `{"name":"impressions","values":[{"value":123}]}` – hodnota je uvnitř poles `values[0].value`. Následek: `item.value` byl vždy `undefined`, žádná smyčka větev se nevykonala a všechny metriky se zapísaly jako 0.
- **Změny** (`analytics/actions.ts`):
  - ✅ Zdroj hodnoty změnený na `item.values?.[0]?.value ?? 0` (bezpečný fallback na 0) – metriky (impressions, engagement, likes, comments, shares, clicks, saves) nyní se reálně populují z Meta.
  - ✅ Odstranený mrtvý kód: větev `Array.isArray(val)` s obranou `[{ metric_name, value }]` – `val` je nyní vždy number, takže ta větev by se nikdy nevykonala. Smyčka zjednodušena na `if (name) metricMap.set(name, val)`.
  - ✅ **Fáza 2 – verze API v26.0 + skutečné metriky per platform**: sjednoceno na `graph.facebook.com/v26.0`; IG `external_id` ve formě `shortcode|media_id` → extrakce `media_id` (zrcadlí `resolveMetaReconcileId`); FB new valid Page-post metrics `post_clicks, post_total_media_view_unique, post_media_view` + `&period=lifetime` (IG default `day`).
  - ✅ **Fáza 3 – IG přepnuto na media-level insights**: Meta account-level metric names (`follower_count, website_clicks, profile_views, online_followers, accounts_engaged`) Meta pro `/{media_id}/insights` odmítala #100; nahrazeny media-level sadou `impressions, reach, likes, comments, shares, saved, follows, total_interactions, profile_visits, link_clicks`. Mapování: `impressions ← reach ?? impressions` (karta „Celkový dosah" čte pole `impressions`, i18n label je „reach" – proto reach primární), `engagements ← total_interactions`, `likes ← likes`, `comments ← comments`, `shares ← shares`, `clicks ← link_clicks`, `saves ← saved`. IG likes/comments/shares/saved už **nejsou natvrdo 0** (media-level je poskytuje). FB likes/comments/shares/saved zůstávají 0 (Page-post v26.0 je neposkytuje, TODO viz komentár v kódu).
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

### 🎨 Prompt 070 – KROK 1-3: Sjednocení EditPostDialog s /posts/new + fix obnovy modálu ✅

- **Kontext**: EditPostDialog (z `/posts`) měl v sekci „Čas" jen `DateTimePicker`; `/posts/new` navíc nabízí Quick slot čipy (Fronta / Dnes 18:00 / Zítra 09:00) + odkaz do nastavení rozvrhu. Sjednocení vyžadoval i Light mod v poli „Interní štítky" – vybrané štítky měly moc tmavé pozadí.
- **Změny**:
  - ✅ KROK 1 – `edit-post-dialog.tsx`: pod `DateTimePicker` vložena sdílená `<ScheduleQuickSlots>` (props `value`/`onSelect`/`locale`, `labels` přes `t("quickSlot*")` z posts namespace). Toggle odznačení aktivního čipu funguje přes `onSelect("")` (vynuluje `scheduledAt`).
  - ✅ `tag-picker.tsx` (Light fix, platí i pro `/posts/new` – sdílená komponenta): pole čipů `bg-black/20`→`bg-white/50 dark:bg-black/20`, dropdown `bg-card/95`→`bg-white/95 dark:bg-card/95`, inputy `bg-black/30`→`bg-white/60 dark:bg-black/30`, hover `bg-white/5`→`bg-black/5 dark:hover:bg-white/5`, text „Vytvořit štítek" `text-indigo-600 dark:text-indigo-400`, bordery `border-white/10`→`border-black/5 dark:border-white/10`.
  - ✅ KROK 2 – `edit-post-dialog.tsx`: vedle labelu sekce „Čas" ikona `Settings` (Lucide) v Radix tooltipu + `Link` na `/{locale}/settings/preferences`, i18n `editSchedule` (cs/en/uk), `aria-label` – shodně s `/posts/new`.
  - ✅ Bugfix – `_post-card.tsx`: otevření edit modálu přesunuto z lokálního `useState` do URL query (`?edit=<postId>`). Po kliku na ozubené kolečko (→ `/settings/preferences`) a návratu zpět se modál znovu otevře místo prázdné stránky příspěvků.
  - ✅ KROK 3 – vizuální kontrola Light/Dark: aktivní čip `text-indigo-700` / dark `text-indigo-200` (WCAG AA), settings ikona `text-slate-500 hover:text-indigo-600 dark:text-muted-foreground` – dle design manuálů.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem (čipy + Light/Dark Interní štítky + odkaz + nová navigace i obnovení modálu).

### 🎨 Prompt 068 – KROK 1-3: Dynamický čip Fronty + odkaz do nastavení rozvrhu + kontrast Light ✅

- **Kontext**: Čip Fronty (CalendarClock) v Quick slotech `/posts/new` ukazoval jen statický text „Fronta (příští volný slot)" + čas; aktivní čip šlo odznačit jen kliknutím na jiný čip. Chyběl rychlý přístup k nastavení rozvrhu.
- **Změny** (`schedule-quick-slots.tsx`, `posts/new/page.tsx`, messages cs/en/uk):
  - ✅ Dynamický text čipu Fronty: místo statického `labels.queue` zobrazuje i DEN odvozený z `queueAt` ISO (user timezone) přes novou funkci `fmtDay` – „Dnes · 09:00" / „Zítra · 09:00" / zkrácený název dne (Po, Tue, пн) lokálně dle locale. Nové i18n klíče `quickSlotWordToday`/`quickSlotWordTomorrow`.
  - ✅ Toggle odznačení: klik na aktivní čip vymaže `scheduledAt` (`onSelect("")`) – čip se odznačí a deaktivuje Schedule; konzistentně pro všechny 3 čipy.
  - ✅ Rychlý odkaz do nastavení rozvrhu: v hlavičce sekce „Čas a publikace" (ml-auto vpravo) ikona `Settings` v Radix tooltipu, `Link` na `/{locale}/settings/preferences`, i18n `editSchedule` (cs/en/uk), `aria-label`.
  - ✅ Kontrast Light: aktivní chip text `text-indigo-300`→`text-indigo-700` (~2.3:1→~5.5:1, WCAG AA), dark `text-indigo-200` zachován; neaktivní chip `text-slate-700`, link `text-slate-500 hover:text-indigo-600` – dle manuálů.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem (čipy + odkaz + Light/Dark).

### 🎨 Prompt 069 – KROK 5: Kontrast captionu + Final polish ✅

- **Kontext**: Po KROKU 1–4 mají všechny platformy Light skiny; zbývalo doladit čitelnost captionu a jednotných mikro-detailů v live preview.
- **Změny** (`post-preview.tsx`):
  - ✅ Kontrastní audit napříč 6 platformami (Light + Dark): primární texty `#0f0f0f`–`#050505` na bílých kartách (~15–20:1), sekundární `#536471`/`#606060`/`#666`/`#65676b` čitelné, `--muted-foreground` ≈ AA – žádný kódový edit nebyl nutný.
  - ✅ TikTok overlay nad médiem sjednocen na vždy bílý text/ikony + tmavý scrim (`from-black/80 via-black/20 to-transparent`), nezávisle na tématu (lépe čitelné na videu); v empty stavu zůstává adaptivní dle tématu.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), dev server kompiluje (`/cs/posts/new` → 307). Manuálně potvrzeno uživatelem (všech 6 platforem, Light + Dark, bez refresh).

### 🎨 Prompt 067 – KROK 5: i18n a Final Polish ✅

- **Kontext**: Dle 📌 POZNÁMKY se KROK 5 Promptu 067 dokončuje spolu s dokončením Promptu 069 – sjednocení live preview se týká i editoru a edit dialogu.
- **Změny**:
  - ✅ Sjednocení náhledu (Live Preview) s Light modem finální: editor `/posts/new` i `EditPostDialog` zobrazují identický `PostPreview` s plnými Light/Dark skiny všech 6 platforem.
  - ✅ i18n konzistence: nové/přepsané klíče v cs/en/uk validní, žádný `MISSING_MESSAGE`.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Manuálně potvrzeno uživatelem.

### 🎨 Prompt 069 – KROK 4: Light skiny TikTok + X + MediaArea ✅

- **Kontext**: Po KROKU 3 (YT/LI) zůstávaly TikTok a X karty v Light modu tmavé; prázdný stav médií byl poblýsknutý.
- **Změny** (`post-preview.tsx`):
  - ✅ TikTok: light = světlá simulace (`bg-white` + text `#0f0f0f`), placeholder `bg-slate-100`, overlay gradient v light zesvětlen (`from-white/90 via-white/30`) aby texty zůstaly čitelné nad videem → dark zachován (`bg-black` / `from-black/80`).
  - ✅ X (Twitter): light = reálná X paleta (`bg-white` + text `#0f1419`, sekundární `#536471`, bordery `#e1e8ed`) → dark zachován (`#e7e9ea` / `#71767b` / `#2f3336`).
  - ✅ MediaArea: empty state light `bg-slate-100 text-slate-500`, media kontejner light `bg-white` (dark zachovány). Avatar: gradient indigo→purple + bílé písmo funguje v obou režimech, úprava netřeba.
  - 🐛 Bonus fix: chybějící `]` v `text-[#e7e9ea>` u Views count v X (statistika dědila špatnou barvu) – opraveno a vloženo do light varianty.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), dev server kompiluje (`/cs/posts/new` → 307). Manuálně potvrzeno uživatelem (Light + Dark pro obě platformy).

### 🎨 Prompt 069 – KROK 3: Light skiny YouTube + LinkedIn ✅

- **Kontext**: Po KROKU 2 (FB/IG) zůstávaly YouTube a LinkedIn karty v Light modu tmavé.
- **Změny** (`post-preview.tsx`):
  - ✅ YouTube: light = `bg-white` + text `#0f0f0f`, sekundární `#606060`, popisný chip `bg-slate-100` → dark zachován (`bg-[#0f0f0f]` / `text-white`). Červené tlačítko Subscribe drží v obou režimech (věrně realitě YT).
  - ✅ LinkedIn: light = reálný světlý LI (`bg-[#f3f2ef]`, karta `bg-white`, text `#191919`, sekundární `#666`, divider `border-black/10`, media rám `bg-white`) → dark zachován (`#1a1a2e` / `#1e1e36` / `#e4e6eb` / `#b0b3b8`).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), dev server kompiluje (`/cs/posts/new` → 307). Manuálně potvrzeno uživatelem (Light + Dark pro obě platformy).

### 🎨 Prompt 069 – KROK 2: Light skiny Facebook + Instagram ✅

- **Kontext**: Po KROKU 1 panel Live Preview v Light modu „sedí" (Milky Glass), ale vnitřní karty sociálních sítí zůstávaly vždy tmavé.
- **Změny** (`post-preview.tsx`):
  - ✅ Facebook: light = skutečný světlý FB feed (pozadí `#f0f2f5`, karta `bg-white`, text `#050505`, sekundární `#65676b`, divider `border-black/10`, hover akcí `bg-black/5`) → dark zachován (`#242526` / `#18191a` / `#e4e6eb` / `#b0b3b8`).
  - ✅ Instagram: light = `bg-white` + text `#262626`, avatar mezikruží `bg-white`, caption hint `#8e8e8e` → dark `bg-black` + `text-white` zachován. Gradient ring `#F58529→#DD2A7B→#8134AF` drží v obou režimech.
  - ✅ Shodné třídy s jinými platformami (LinkedIn jméno, TikTok root) vyčleněny přes okolní kontext – KROK 3 a 4.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), dev server kompiluje (`/cs/posts/new` → 307). Manuálně potvrzeno uživatelem (Light + Dark).
