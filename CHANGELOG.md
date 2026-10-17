# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

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









