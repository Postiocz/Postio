# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🎨 Status architektura — `archived` status v kalendáři a detailech (Prompt 030, Krok 3)

- **Kontext**: Po Kroku 2 se data archivují v DB, ale kalendář neznal `archived` status — chyběl v status computation i ve vizuálních stylech.
- **Změny**: `getPost` (`posts.ts`) a `calendar/page.tsx` — přidán `archived` do status computation (všechny platformy 'archived' → computed 'archived'). `post-calendar-chip.tsx` — přidán `archived` do `STATUS_STYLES` (gray/opacity). `getPosts` a `normalize-post.ts` již měly hotovo.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test v kalendáři ✅.
- **Upravené soubory**: `src/lib/actions/posts.ts`, `src/app/[locale]/(dashboard)/calendar/page.tsx`, `src/components/calendar/post-calendar-chip.tsx`.

### 💿 Soft delete — `deletePost` převeden na archivační režim (Prompt 030, Krok 2)

- **Kontext**: Místo hard-delete z DB nyní `deletePost` archivuje příspěvek — nastaví `deleted_at`, vymaže `media_urls` a přepne všechny `post_platforms` na `status='archived'`. Meta API část (volání Graph API) zůstává zachována.
- **Změny**: `src/lib/actions/posts.ts` — `deletePost`: hard-delete (`supabase.from("posts").delete()`) nahrazen UPDATE: `deleted_at = now()`, `media_urls = []` na `posts` tabulce + archivace všech nearchivovaných `post_platforms` řádků na `status='archived'` s `archived_at` a `archive_reason`. Komentář funkce aktualizován.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test smazání v prohlížeči ✅.
- **Upravené soubory**: `src/lib/actions/posts.ts`.

### 🗄️ SQL Migrace — Přidání `deleted_at` do tabulky `posts` (Prompt 030, Krok 1)

- **Kontext**: Příprava DB pro soft-delete příspěvků. Místo hard-delete se budou příspěvky označovat `deleted_at` a zůstanou v DB jako historické otisky v kalendáři.
- **Změny**: Nová migrace `038_add_archived_status_to_posts.sql` přidává sloupec `deleted_at TIMESTAMPTZ` do `public.posts` + parciální index `idx_posts_deleted_at`. CHECK constraint na `posts.status` není měněn — sloupec `status` byl smazán v migraci 025 (status se dopočítává z `post_platforms`, který už 'archived' povoluje).
- **Ověření**: SQL provedeno v Supabase DB ✅.
- **Upravené soubory**: `supabase/migrations/038_add_archived_status_to_posts.sql` (nový).

### 🔧 Refactor — Account-aware mazání: Propojení (Prompt 031, Krok 4)

- **Kontext**: Po Krocích 1–3 dialog cílí na konkrétní účty v UI, ale `onConfirm` stále posílal odvozené platformy (`selectedPlatforms`), takže 2× Facebook Page pořád trefil první řádek. Krok 4 propojuje výběr účtů až do backendu.
- **Změny**: `delete-post-dialog.tsx` — typ prop `onConfirm` změněn na `(selectedAccountIds: string[], deleteFromApp: boolean)`; `handleConfirm` i `handleWarningConfirm` volají `onConfirm(selectedAccountIds, deleteFromApp)`. `_post-card.tsx` — `handleDeleteConfirm(selectedAccountIds, deleteFromApp)` iteruje `for (const accountId of selectedAccountIds) await deleteFromMeta({ postId, accountId })`; `hasArchivedPlatform` odvozen z platforem vybraných účtů přes `post.post_platforms.find(p => p.account_id === accountId)?.platform` (linkedin/instagram). 2× FB nyní maže přesně jeden účet.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅ (2× FB selektivní mazání z jednoho účtu, LinkedIn ruční, trvalé smazání z aplikace).
- **Upravené soubory**: `src/components/dashboard/delete-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/_post-card.tsx`.

### 🔧 Refactor — Account-aware mazání: UI dialogu (Prompt 031, Krok 3)

- **Kontext**: Modál `DeletePostDialog` stále volil cíl mazání dle PLATFORMY („Smazat z Facebook"), takže u více účtů téže sítě (2× Facebook Page) byl nepoužitelný. Krok 1–2 připravily backend + data; Krok 3 přepisuje UI na výběr konkrétních účtů.
- **Změny**: Interní stav `selectedPlatforms` → `selectedAccountIds` (init z `publishedAccounts`), `toggleAccount(id)`. Checkboxy renderují `publishedAccounts`: avatar (`<img>` / iniciála) + jméno účtu + ikona sítě (`PlatformIcon[acc.platform]`), text „Smazat z {jméno}". `noApiPlatforms` badge („Ruční smazání") vázán na `acc.platform` vybraného účtu; warning overlay odvozen z platforem vybraných účtů. `descriptionText` přepsán na account-aware. Zachováno „Trvale smazat z aplikace" + design (`rounded-[24px]`, glassmorphism, indigo). (Přesné cílení na 1 z 2× FB účtů přijde v Krok 4.)
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅ (1 účet i 2× FB zobrazí dva řádky s různými jmény).
- **Upravené soubory**: `src/components/dashboard/delete-post-dialog.tsx`.

### 🔧 Refactor — Account-aware mazání: Typy + načítání (Prompt 031, Krok 2)

- **Kontext**: Po Krok 1 (backend cílí na `account_id`) potřebuje dialog data o konkrétních účtech (jméno + avatar), aby v Krok 3 mohl nabídnout výběr per-účet místo per-platforma.
- **Změny**: `PostPlatform` typ rozšířen o `account_id: string | null`. Refresh dotaz v `delete-post-dialog.tsx` rozšířen na `post_platforms(account_id, platform, status, external_id, social_accounts(account_name, avatar_url))`; přidán stav `publishedAccounts` (`{ id, platform, name, avatar }`) sestavený z publikovaných řádků (+ fallback z props). Hlavní seznam (`post_platforms(*)`) vrací `account_id` automaticky.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅ (modál otevřen, žádná regrese mazání).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/posts/_post-card.tsx`, `src/components/dashboard/delete-post-dialog.tsx`.

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
