# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🌐 i18n titulek karty (metadata) podle locale – title/description + `<html lang>` ✅

- **Kontext**: Na `/en` zůstal titulek karty prohlížeče česky ("Postio – Tvůj chytrý AI plánovač sociálních sítí"). Kořenový `layout.tsx` měl staticky česky `title`/`description`, `[locale]/layout.tsx` nastavoval jen OpenGraph/Twitter a `<html lang="cs">` bylo natvrdo.
- **Změny**:
  - ✅ Nový `Metadata` namespace v `messages/{cs,en,uk}.json` – `title` (cs: "Postio – Tvůj chytrý AI plánovač", en: "Postio – Your smart AI scheduler", uk: "Postio – Твій розумний AI-планувальник") + `description` (překlady existujícího českého textu).
  - ✅ `[locale]/layout.tsx` – `generateMetadata` čte `getTranslations({ locale, namespace: "Metadata" })`; nastavuje top-level `title: { default, template: "%s | Postio" }` + `description`; OpenGraph/Twitter berou tytéž hodnoty. Hardcoded `localeMeta` záznam smazán.
  - ✅ Kořenový `layout.tsx` – statická čeština nahrazena neutrálním fallbackem (`title: "Postio"`); `<html lang>` se řeší dynamicky (`X-NEXT-INTL-LOCALE` hlavička z middleware → cookie `NEXT_LOCALE` → `Accept-Language` → `cs`; fallback kryje dev, kde middleware neběží).
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), `npm run build` ✅ (EXIT=0). Runtime (`next start` + curl): `/en` a `/en/login` → 200 s EN titulkem a `lang="en"`; `/cs`, `/uk`, `/uk/login` → vlastní jazykové titulky i `lang`; chráněné trasy (dashboard/accounts/posts/posts/new) → 307 na `/en/login` a dědí stejný layout titulek (žádná stránka nemá vlastní metadata).

### 🗑️ Chytré mazání příspěvků (+ TikTok/LinkedIn) – obnovení modalu ✅

- **Kontext**: Regrese – ikona koše u příspěvku zobrazovala jen obecné „Are you sure you want to delete this post?" místo chytrého modalu. Příčina: per-account refaktor (742dc20/f1576be) zavedl filtr published řádků na `external_id`, takže publikovaný TikTok (bez publish ID) spadl na generický text (regrese z 79bfb54 #15).
- **Změny**:
  - ✅ Nový `src/lib/delete-capabilities.ts` – **jediný zdroj pravdy** `DELETE_CAPABILITIES` (facebook/twitter/youtube/instagram = ✅, linkedin/tiktok = ❌) + čistá funkce `buildDeleteTargets` (co modal nabídne) + `platformDisplayName`.
  - ✅ `delete-post-dialog.tsx` – chytrý modal: per-síť checkboxy „Smazat z <účet>" (default zaškrtnuté, jen apiDelete + external_id), informační boxy pro sítě bez API mazání či bez referenčního ID (TikTok/LinkedIn i síť bez `external_id`), červený checkbox „Trvale smazat z aplikace Postio" **default NEzaškrtnutý** (= archivace, zachová publikování + data sítí).
  - ✅ Backend: `deleteFromMeta` (publish.ts) – LinkedIn/TikTok větve sloučeny do jedné `if (!canDeleteViaApi(platform) || !externalId)` (archivace, ŽÁDNÉ API volání, token se nesáhne); `deletePost` (posts.ts) – guard `canDeleteViaApi(targetPlatform)` před Meta API DELETE.
  - ✅ Krok 2 handleru `_post-card.tsx` – neúspěch archivace se hlásí jako failed (příspěvek se neztratí); toast ≥8 s „smaž ručně".
  - ✅ Instagram zůstává `true` (pokus o API DELETE), při selhání (v praxi vždy) → archivace + informační box; přepnutí na `false` = jeden řádek.
  - ✅ i18n klíče v cs/en/uk (286 posts klíčů shodně): `deleteDialogDescSelective`, `deleteKeepNote`, `deleteInfoNoApi*`, `deleteInfoNoExternalId`, `toastArchived*`, `toastPermanentDeleteReminder`, `toastDeleteFailedPlatforms`.
  - ✅ CLAUDE.md tabulka sítí aktualizována (apiDelete per platforma + poznámka o single source of truth).
- **Testy**: nový `src/lib/delete-capabilities.test.ts` – 15 testů (TikTok-only bez external_id → info box bez checkboxu, TikTok+Facebook, TikTok+LinkedIn, draft → žádné cíle, apiDelete bez external_id → info no_reference, negativní-API sítě nikdy neprodukují checkbox…). **Vitest 40/40 ✅, `tsc --noEmit` ✅ (0 chyb), `npm run build` ✅ (EXIT=0).**
- **Ruční test**: TikTok-only post → koš → info box + „Trvale smazat" nezaškrtnuté → Potvrdit → archivace (karta zůstává ve filtru All i Archived, šedá ikona bez zelené fajfky).

### 🌐 i18n: české popisky v EN/UK UI + náhled bez čísel (text-only) ✅

- **Kontext**: V EN/UK UI zůstávaly natvrdo české popisky – „Lokace" (New Post, Edit Post, kalendář, detail postu) a „Platforma"/„Stav"/„Seřadit" (české defaulty filtrů v `PostFiltersRow`). V TikTok náhledu (`preview-dialog.tsx`) se u akčních ikon zobrazovala smyšlená čísla (12.4K/134/456/12) a TikTok sandbox hint mluvil o „private section", zatímco video je v sekci Videos se zámkem.
- **Změny**:
  - ✅ Nové klíče `location` (namespace `posts` i `calendar`) a `platform` (posts) v cs/en/uk; existující `posts.status`/`posts.sortBy` napojeny do filtru Posts.
  - ✅ `PostFiltersRow` na seznamu Posts dostává `platformLabel`/`statusLabel`/`sortLabel` (`_posts-container.tsx`).
  - ✅ „Lokace" → `t("location")` v `edit-post-dialog`, `posts/new`, `posts/[id]` a přes `tCalendar.location` v `_calendar-view` (propojeno v `calendar/page.tsx` + typ v `_calendar-client`).
  - ✅ `preview-dialog.tsx`: odstraněna čísla u TikTok ikon (ikony zůstávají vertikálně vystředěné) – zůstává video, nickname, avatar, caption.
  - ✅ `tiktokSandboxProfileHint` přepsán ve všech jazycích: „Sandbox mode links to the profile – the video appears under Videos with a lock icon (private)."
- **Ověření**: JSON validní a klíče shodné ve 3 localech (posts 280, calendar 134), `npx tsc --noEmit` ✅ (0 chyb), `npm run build` ✅ (EXIT=0). Žádná změna logiky publikování.

### ✏️ Connect TikTok modal – TikTok-specific texty (text-only, i18n) ✅

- **Kontext**: Modal „Connect TikTok" sdílel s ostatními platformami texty (`autoPublishing`, `analytics`, `connectButton`), obsahoval nedoložitelné „Tokens expire in 15 days" a „securely" a odkaz „Have a personal account? Learn how to switch". Ověřeno: kód i TikTok docs znají access token 24h / refresh 365 dní, číslo 15 dní nelze doložit.
- **Změny**: Nové TikTok klíče `autoPublishingTikTok`/`analyticsTikTok`/`connectButtonTikTok` + úprava `warningDescTikTok` ve cs/en/uk (bez počtu dní, bez „securely" – jen věta o uložení na serveru); pro TikTok odebrán `learnMoreUrl` (= `undefined`), takže odkaz zmizí. Žádná změna logiky, OAuth, scopes ani publikování.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), JSON validní a klíče shodné ve 3 localech.

### 🐛 Marketing page: hydration mismatch (Reveal / framer-motion) ✅

- **Kontext**: Console „A tree hydrated but some attributes of the server rendered HTML didn't match" na marketing stránce. `Reveal` (`src/components/marketing/reveal.tsx`) má `initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}` + `whileInView`; framer-motion 12 v SSR vykreslí inline initial styly a v React 19 / Next 16.2.4 hydration pas loguje mismatch (vizuálně nenáviděné – animace funguje, jen hlučí).
- **Změny**: `motion.div` v `Reveal` dostal `suppressHydrationWarning` – standardní náprava tohoto framer-motion SSR warningu; SSR HTML i animace beze změny.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb). Dev server: marketing stránka renderuje OK, žádné jiné console chyby. (Preview prohlížeč má reduced-motion → tento warning se u něj nereprodukuje; finální potvrzení čisté konzole v uživatelově prohlížeči formou hard reload).
- **Poznámka (bez kódu)**: separátní console error „AuthApiError Invalid Refresh Token" je zastaralá session cookie prohlížeče (benigní, vyřeší se přihlášením/odhlášením) – nesouvisí s tímto fixem, není to bug v kódu.

### 🌐 Detekce jazyka z prohlížeče (Accept-Language) – root "/" redirect ✅

- **Kontext**: Při zadání web adresy (root `/`) se aplikace vždy otevřela v `/cs`, i pro uživatele s EN/UK browser jazykem. Hlubší šetření odhalilo **skutečnou příčinu**: `src/app/page.tsx` (RootPage fallback) mělo natvrdo `redirect("/cs")` – a protože v dev serveru (Next 16.2.4 `--webpack`) se middleware vůbec nedetekuje (`middleware-manifest.json` = `{}`; build/prod middleware kompiluje a spouští, dev ne), přesně tato stránka root redirect fakticky obstarávala. Zároveň auth redirect na dashboard používal `locale` z URL, takže nelokalizovaný vstup hodil přihlášeného uživatele vždy do `/cs/dashboard`.
- **Změny**:
  - ✅ `src/app/page.tsx` – hardcoded `redirect("/cs")` nahrazen async detekcí jazyka ze requestu (RSC `cookies()` + `headers()`): **cookie `NEXT_LOCALE`** (poslední explicitní volba switcherem) → **hlavička `Accept-Language`** (jazyk prohlížeče, q-value parsing) → fallback `cs`. Kryje localhost/dev, kde middleware neběží.
  - ✅ `middleware.ts` – nový helper `detectLocale(request)` se stejným pořadím (cesta → cookie → Accept-Language → `cs`); root `/` redirect → `/{detectLocale(request)}`; auth redirect `restPath === "/"` → `/{detectLocale(request)}/dashboard`. Toto běží na produkci (Vercel) a kryje i nelokalizované cesty jako `/login`.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb) + `npm run build` ✅ (EXIT=0, „ƒ Proxy (Middleware)") + runtime matice:
  - **Dev** (RootPage): bez hlaviček → `/cs`; `Accept-Language: en` → `/en`; `uk` → `/uk`; cookie `NEXT_LOCALE=en` přebije `cs` Accept-Language → `/en`.
  - **Prod** (`next start`, debug hlavičky `x-debug-locale`/`x-debug-cookie` prokázaly vykonání middleware): `en` → `/en`; `uk` → `/uk`; cookie → `/en`; `/login` s `en` → `/en/login`.

### 🌐 Dashboard loading text: i18n převod (bugfix) ✅

- **Kontext**: Po přihlášení se v loading stavu dashboardu zobrazoval natvrdo český text „Načítám dashboard..." i v EN/UK locale – `src/app/[locale]/(dashboard)/dashboard/page.tsx` (loading branch, komponenta `DashboardPage` neměla žádné `useTranslations`).
- **Změny**:
  - ✅ Nový ICU klíč `dashboard.loading` v cs/en/uk (`cs`: „Načítám dashboard...", `en`: „Loading dashboard...", `uk`: „Завантажую панель...").
  - ✅ `DashboardPage` – přidán `useTranslations("dashboard")`; hardcoded text nahrazen `{t("loading")}`.
- **Ověření**: `npx tsc --noEmit` ✅ (0 chyb), JSON validní ve 3 localech, klíč `dashboard.loading` přítomen ve všech.
- **Následující krok**: detekce jazyka z prohlížeče (Accept-Language) v `middleware.ts` – root `/` dnes redirectuje natvrdo do `/cs`.

### 🐛 Fix: Vercel build ERESOLVE – @types/node ^20 → ^22 ✅

- **Kontext**: `vercel build` na větvi `feature/tiktok-direct-post-ux` selhal při `npm install` chybou ERESOLVE – `vitest@5.0.3` (přidaný pro testy) deklaruje peerOptional `@types/node@"^22.0.0 || >=24.0.0"`, projekt měl `"@types/node": "^20"`.
- **Změny**: `package.json` – `"@types/node": "^20"` → `"^22"`; `package-lock.json` regenerován (`@types/node@22.20.5`).
- **Ověření**: `npm install` čistý (žádný ERESOLVE), `npm run test` → vitest 5.0.3, 25/25 ✅, `npx tsc --noEmit` ✅ (0 chyb).

### 🌐 Publish toasty: plný i18n převod (publish/schedule) ✅

- **Kontext**: Po úspěšném publikování se zobrazil toast „Příspěvek byl úspěšně publikován!" natvrdo česky ve všech jazycích. Průzkum celého publish flow (publish akce, edit dialog, schedule, delete, update on networks) odkryl 9 natvrdo napsaných uživatelských hlášek bez `t()` v cs.json mimo namespace.
- **Změny**:
  - ✅ 3 nové ICU klíče v namespace `posts` **i** `calendar` v cs/en/uk: `publishSuccess`, `publishFailed`, `selectPlatformToPublish`.
  - ✅ Napojené 9 míst na `t(...)`: `edit-post-dialog` (publish now + catch), `_calendar-view` (publish now + typy v `_calendar-client`/`page.tsx`), `posts/new` (validace platformy, publish now **s zachovaným X fallbackem** `td("markPublishedToast")`, catch, schedule), `posts/[id]` (validace + publish now).
  - ✅ Schedule: opraven reálný bug – klíč `queuedSuccess` byl duplikovaný s oposným placeholderem (`posts` = `__DATE__`, `calendar` = `{date}`) → **datum se v toastě nezobrazoval**. Sjednoceno na ICU `{date}` v obou namespacech; `posts/new` napojen na `t("queuedSuccess", { date })`, calendar na `.replace("{date}")`. Formátování datumu v `posts/new` sjednoteno na vzor `cs-CZ`/`uk-UA` (dříve neplatný tag `cs-CS`).
  - ✅ 2 budoucí úkoly zapsané do `ukol.md` (čištění mrtvých českých fallbacků `?? "…"` v publish flow; server-side české chybové stringy v `publish.ts`).
- **Ověření**: `tsc --noEmit` ✅ (0 chyb) + `npm run build` ✅ (EXIT=0), JSON validní a shodný ve 3 localech (258 posts / 133 calendar), grep bez zbytého toast bez `t()` v publish flow.

### 🌐 Delete modály (koš) – plný i18n převod obou dialogů (Bug #2, KROK 1+2+3) ✅

- **Kontext**: Bug #2 z ukol.md – delete modály (`DeletePostDialog` + `SmartDeleteDialog`) měly natvrdo česky texty, EN/UK chyběly.
- **Změny (KROK 1)**:
  - ✅ 30 nových klíčů v `posts` namespace (cs/en/uk): `deleteDialogDescNoPlatform`/`LinkedinOnly`/`Mixed`/`Selective`, `deleteDialogLoading`, `deleteFromAccount` ({account}), `manualDeletion`, `deleteFromApp`, `deleteKeepNote`, `deleting`, `confirmDeleteButton`, `smartDeleteDialogTitle`/`Desc`, `smartDeleteKeepDraft`/`Hint`, `smartDeleteDeleteApp`/`Hint`, `smartDeletePermanently`, `smartDeleteAuto`/`Hint`, `smartDeleteAutoOptionNever|3d|7d|30d|365d`, `smartDeleteInProgress`.
  - 🛠️ Odchylka od plánu: klíč `confirmDelete` kolizoval s existujícím („Opravdu chcete smazat tento příspěvek?") → tlačítko „Potvrdit smazání" dostalo vlastní `confirmDeleteButton`.
- **Změny (KROK 2)**:
  - ✅ `DeletePostDialog` – hardcoded čeština → `t("...")`: titulek `deletePost`, 4 větve `descriptionText`, `deleteDialogLoading`, `deleteFromAccount` ({account}), `manualDeletion`, `deleteFromApp`, `deleteKeepNote`, `cancel`, `deleting`, `confirmDeleteButton`. Zároveň opraveny překlepy „příspěběk" → „příspěvek" (texty teď žijí v cs.json).
- **Změny (KROK 3)**:
  - ✅ `SmartDeleteDialog` – `useTranslations("posts")` + hardcoded čeština → `t(...)`: `smartDeleteDialogTitle`/`Desc`, `smartDeleteKeepDraft`/`Hint`, `smartDeleteDeleteApp`/`Hint`, `smartDeleteAuto`/`Hint`, `smartDeleteAutoOptionNever|3d|7d|30d|365d`, `smartDeletePermanently`, `smartDeleteInProgress`, `cancel`. `AUTO_DELETE_LABELS` (natvrdo české) nahrazeno mapováním `AUTO_DELETE_KEYS` → `t(AUTO_DELETE_KEYS[option])`.
- **Ověření**: JSON validní ve 3 localech (255 klíčů shodně) + `npx tsc --noEmit` ✅ (exit 0) po KROKU 2 i KROKU 3. Celý Bug #2 hotový, čeká na schválení + commit.
