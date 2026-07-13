# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🔧 Refactor — Account-aware mazání: Backend (Prompt 031, Krok 1)

- **Kontext**: `DeletePostDialog` volí cíl mazání dle `platform` (`.find(r => r.platform === input.platform)`), což je nejednoznačné u více účtů téže sítě (2× Facebook Page) – vždy trefí první řádek. Krok 1 přepisuje backend `deleteFromMeta` na cílení přes `account_id`.
- **Změny**: `src/lib/actions/publish.ts` — signatura `deleteFromMeta` rozšířena na `{ postId; platform?; accountId? }`; centrální lookup řádku `post_platforms` (pokud `accountId` → `r.account_id === accountId && status==="published"`, jinak `platform` fallback pro zpětnou kompatibilitu); odvozená `platform` z nalezeného řádku; všechny větve (linkedin/tiktok/twitter/instagram/facebook) používají sdílený `targetRow` a cílí přes `.eq("id", targetRow.id)`; token lookup account-scoped (`.eq("id", accountId)` přednostně).
- **Ověření**: `npx tsc --noEmit` ✅.
- **Upravené soubory**: `src/lib/actions/publish.ts`.

### 🔧 Refactor — Sjednocení výběru účtů: cleanup & design (Prompt 029, Krok 4)

- **Kontext**: Po Krocích 1–3 je výběr účtů na stránce „Nový příspěvek" plně sjednocen s `EditPostDialog`. Zbývalo vyčistit mrtvý kód a ověřit design (Pravidlo 8).
- **Změny**: Odstraněn nepoužitý `togglePlatform` (UI od Krok 2 volá `toggleAccount`). `selectedPlatforms` ponechán (používá ho `isInstagramVideoIncompatible`), `PLATFORMS` ponechán (lokalizované názvy skupin). Ověřeny překlady `noConnectedAccounts`/`connectAccount` (cs/en/uk). Account-picker dodržuje design manuály: radius 20px, glassmorphism, indigo akcenty, grid `grid-cols-2 md:grid-cols-3 gap-3` shodný s Editorem.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test v prohlížeči ✅ (shoda s EditPostDialog, publikování/naplánování).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/posts/new/page.tsx`.

### 🔧 Refactor — Sjednocení výběru účtů: ukládání (Prompt 029, Krok 3)

- **Kontext**: Po Krocích 1–2 volí UI konkrétní účty (`selectedAccountIds`), ale submit handlery stále posílaly `platforms: selectedPlatforms`. Výběr konkrétního účtu (i 2× Facebook Page) by se tak neuložil.
- **Změny**: Ve všech 3 submit handlerech (`handleSubmit`, `handlePublishNow`, `handleQueueToSchedule`) změněno `platforms: selectedPlatforms` → `accountIds: selectedAccountIds`; backend `createPostAction` už `accountIds` zpracovává (lookup platformy dle `account_id`, zápis do `post_platforms`). Kontroly `selectedPlatforms.length === 0` → `selectedAccountIds.length === 0` na guardu handleru, disabled tlačítkách i `newPostHint`. `handleRemoveMedia` (účty dle platformy) již hotovo v Krok 1. `selectedPlatforms` zůstalo jen jako odvozený `useMemo` (instagram-block).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test v prohlížeči ✅ (vytvoření s konkrétním účtem i 2× FB, publikování/naplánování, media-gating auto-odebírání).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/posts/new/page.tsx`.

### 🔧 Refactor — Sjednocení výběru účtů: UI (Prompt 029, Krok 2)

- **Kontext**: Stránka „Nový příspěvek" (`posts/new/page.tsx`) po Krok 1 měla logiku na účty, ale UI stále renderovala textové chips obecných platforem. Cílem bylo sjednotit UI s `EditPostDialog` (výběr konkrétních účtů, i 2× Facebook Page).
- **Změny**: Blok „Platform selection" nahrazen account-pickerem ze `EditPostDialog` (grid skupin dle sítě, čipy s ikonou sítě + avatarem/jménem, selected = indigo, disabled = opacity-40 + Tooltip při nesplněném media-gatingu). Empty state (`allAccounts.length === 0`) s tlačítkem „Připojit účet" (`noConnectedAccounts`/`connectAccount`) → `/accounts`. Přidán import sdíleného `PlatformIconMap` z `post-calendar-chip.tsx`. Čipy volají `toggleAccount(id)`. Názvy skupin lokalizovány dle `locale` z `PLATFORMS` (labelCs/labelEn/labelUk).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test v prohlížeči ✅ (shoda s EditPostDialog, výběr konkrétního účtu).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/posts/new/page.tsx`.

### 🔧 Refactor — Sjednocení výběru účtů: logika (Prompt 029, Krok 1)

- **Kontext**: Stránka „Nový příspěvek" (`posts/new/page.tsx`) stále používala starý výběr obecných platforem (stav `selectedPlatforms`), zatímco `EditPostDialog` už volí konkrétní účty. Cílem je sjednotit obě UI (viz též Prompt 027 Krok 3).
- **Změny**: `selectedPlatforms` převeden z `useState` na odvozený `useMemo` z `selectedAccountIds` + `allAccounts`; přidány stavy `selectedAccountIds`/`allAccounts`; načítání účtů z `GET /api/accounts` (efekt po `userId`); přidán `toggleAccount`; `togglePlatform` nyní vybírá všechny účty dané sítě; `handleRemoveMedia` odebírá účty dle platformy (zrcadlo `EditPostDialog`).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test v prohlížeči ✅ (výběr platformy funkční, edit OK).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/posts/new/page.tsx`.

### 🔧 Fix — Oprava inicializace Stripe při buildu (Prompt 030)

- **Kontext**: Při deploy na Vercel selhal build s chybou "Neither apiKey nor config.authenticator provided", protože `src/lib/stripe.ts` inicializoval Stripe i když `STRIPE_SECRET_KEY` nebyl nastaven (s prázdným řetězcem).
- **Změny**: `src/lib/stripe.ts` nyní inicializuje skutečnou instanci Stripe pouze pokud `STRIPE_SECRET_KEY` existuje; jinak vrátí dummy objekt s typovou kompatibilitou, který nehazuje chybu při buildu.
- **Ověření**: Lokální `npm run build` úspěšně dokončen ✅.
- **Upravené soubory**: `src/lib/stripe.ts`.

### 🌐 Refactor — Lokalizace a finální cleanup (Prompt 027, Krok 5)

- **Kontext**: Po zrušení manuálního publikování (Kroky 1–2) zůstala v překladech řada nepoužívaných klíčů z původního výběru typu účtu (Profesionální vs Osobní) a rozcestníku `profileChoice*`.
- **Změny**: Odstraněny nepoužívané klíče ze `src/messages/{cs,en,uk}.json`:
  1. Blok v `accounts`: `howToConnect`, `professional`, `professionalDesc`, `personal`, `personalDesc`, `autoPostingBadge`, `notificationsBadge`, `autoPublishing`, `autoPublishingDesc`, `communityReplies`, `communityRepliesDesc`, `postMetrics`, `postMetricsDesc`, `onlyNotifications`, `onlyNotificationsDesc`, `connectProfessional`, `setupPersonal`, `selectTypeSubtitle`.
  2. `accounts.connectModal.profileChoice*` (5 klíčů: `profileChoiceTitle`, `profileChoiceDirectTitle`, `profileChoiceDirectDesc`, `profileChoiceManualTitle`, `profileChoiceManualDesc`).
  Zachovány klíče pro výběr účtů (Krok 3: `posts.connectAccount`, `posts.noConnectedAccounts`).
- **Ověření**: JSON validní ve všech 3 jazycích, `npx tsc --noEmit` ✅, kontrola překladů ✅.
- **Upravené soubory**: `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

### 🔧 Fix — Oprava odesílacího motoru (target `account_id`) (Prompt 027, Krok 4)

- **Kontext**: `publishPost` publikoval jen první `post_platforms` řádek, takže výběr více účtů téže sítě (např. 2× Facebook Page) vedl k publikaci na jediný účet.
- **Změny**: `src/lib/actions/publish.ts` — `publishPost` nyní iteruje přes VŠECHNY pending `post_platforms` řádky a každý cílí přes vlastní `account_id` (`resolveTargetAccount`). Odstraněn legacy IG→FB fallback (čtení `instagram_id` z FB metadat); TikTok používá `row.metadata`; duplicitní guard přepsán z platform-only na `account_id` scope (již publikovaný řádek = no-op success). Cron edge function (`process-scheduled-posts`) již `account_id` používá, žádná změna.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test publikování na konkrétní účet i na 2× FB ✅.
- **Upravené soubory**: `src/lib/actions/publish.ts`.

### 🖼️ Feat — PreviewDialog z Dashboardu + TikTok soft-delete (Prompt 028)

- **Kontext**: Kliknutí na příspěvek v sekci "Poslední příspěvky" na Dashboardu navigovalo na editační stránku, místo aby otevřelo náhled. TikTok nebyl podporován v chytrém mazání (chyběl handler v `deleteFromMeta` a chyběl v `noApiPlatforms`). Archivované účty v editoru nebyly vizuálně odlišeny.
- **Změny**:
  1. `src/app/[locale]/(dashboard)/dashboard/page.tsx`: Rozšířen dotaz na `post_platforms` o `external_id`, `published_at`; `<Link>` nahrazen `<div>` s `onClick` → otevírá `PreviewDialog` (stejný jako v Kalendáři) včetně "Zobrazit na síti" tlačítka.
  2. `src/components/dashboard/delete-post-dialog.tsx`: Přidán `"tiktok"` do `noApiPlatforms` — TikTok se chová jako Instagram/LinkedIn (API warning overlay, badge "Ruční smazání").
  3. `src/lib/actions/publish.ts` (`deleteFromMeta`): Nový handler pro TikTok — archivace `post_platforms` řádku (`status: "archived"`, smazán `external_id`), vrací `cannotDeleteViaApi: true`.
  4. `src/components/edit-post-dialog.tsx`: Přidána detekce `archivedAccountIds`; archivované účty se v editoru zobrazí šedé (`opacity-50`, `pointer-events-none`), nejsou přepínatelné; metadata save zachovává vazbu.
- **Ověření**: `npx tsc --noEmit` ✅.
- **Upravené soubory**: `src/app/[locale]/(dashboard)/dashboard/page.tsx`, `src/components/dashboard/delete-post-dialog.tsx`, `src/lib/actions/publish.ts`, `src/components/edit-post-dialog.tsx`.

### ✨ Feature — Plná podpora více účtů v Editoru (Prompt 027, Krok 3)

- **Kontext**: Uživatel může mít připojeno více účtů stejné sítě (např. 2× Facebook Page). Editor umožňoval výběr jen 6 statických platforem bez vazby na konkrétní účet. Cílem bylo přepracovat výběr na seznam všech připojených účtů seskupených dle sítě.
- **Změny**:
  1. `src/components/edit-post-dialog.tsx`: Přidáno načítání účtů z `/api/accounts`; stav `platforms: string[]` nahrazen `selectedAccountIds: string[]`; UI přepracováno na grid 3 (desktop) / 2 (mobil) platformových karet s kompaktními chipy uvnitř.
  2. `src/lib/actions/posts.ts`: `createPostAction` a `updatePost` přijímají `accountIds`; ukládá se `account_id` do `post_platforms`; legacy fallback pro NULL `account_id`.
  3. `src/lib/supabase/types.ts`: Typy již obsahují `account_id`.
  4. `src/messages/{cs,en,uk}.json`: Přidány klíče `posts.connectAccount` a `posts.noConnectedAccounts`.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `src/components/edit-post-dialog.tsx`, `src/lib/actions/posts.ts`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

### 🔧 Refactor — Zjednodušení připojování účtů (Prompt 027, Krok 2)

- **Kontext**: Po odstranění manuální logiky (Krok 1) je potřeba dokončit zjednodušení připojování — odstranit `publishing_type` z OAuth redirect URL a `profileChoice*` překlady. Připojení nového účtu vždy rovnou spouští OAuth bez výběru typu profilu.
- **Změny**:
  1. `src/components/connect-account-modal.tsx`: `onConnect` i `handleConnect` již nepřijímají `publishingType` parametr; odstraněny `profileChoice*` klíče z typové definice `t`.
  2. `src/app/[locale]/(dashboard)/accounts/page.tsx`: odstraněno předávání `publishing_type` z OAuth redirect URL pro Instagram i Facebook; odstraněny `profileChoice*` překladové mapování; `onConnect` handler bez parametru.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test připojení v prohlížeči ✅ (uživatel potvrdil).
*Starší historii projektu a předchozí milníky najdeš v historii Git commitů na GitHubu.
