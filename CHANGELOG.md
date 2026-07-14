# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🐦 Hybridní X režim — Uložení manuálního účtu (Prompt 031-X, Krok 2)

- **Kontext**: Po Krok 1 (rozcestník) musí API přijmout manuální X účet bez tokenu. Sloupec `publishing_type` a status `post_platforms.status='ready'` už v DB existují (migrace 036).
- **Změny**: `src/app/api/accounts/route.ts` (POST) — přijímá `publishingType`; pro `"manual"` NEvyžaduje `accessToken`, ukládá `publishing_type:"manual"`, `platform_id:null`, `is_active:true`. Pro `direct` (legacy onboarding) zůstává původní chování. `access_token` je NOT NULL → pro manuální účet prázdný řetězec. Zachována deduplikace na `(user_id, platform)` s `platform_id IS NULL` a kontrola limitu účtů. `GET` už `publishing_type` vrací, takže účet se zobrazí v seznamu.
- **Ověření**: `npx tsc --noEmit` ✅, manuální E2E test (uložení @handle, účet se objeví v seznamu Účtů) ✅.
- **Upravené soubory**: `src/app/api/accounts/route.ts`.

### 🐦 Hybridní X režim — Rozcestník pro X (Prompt 031-X, Krok 1)

- **Kontext**: Kvůli ceně X API ($200+) zavádíme hybridní X režim. Uživatel připojí X manuálně (zdarma, jen `@jméno`); Postio mu místo volání API v naplánovaný čas připraví podklady. Krok 1 přidává rozcestník v UI.
- **Změny**: `src/components/x-connect-modal.tsx` (nový) — glassmorphism modal s volbou "Manuální režim (Zdarma)" (input na `@handle` → `POST /api/accounts` s `publishingType:"manual"`) a zašedlým/disabled tlačítkem "Automatické odesílání (Připravujeme)". `src/app/[locale]/(dashboard)/accounts/page.tsx` — klik na X dlaždici otevírá `XConnectModal` místo univerzálního OAuth modalu; přidán `handleXManualConnect`. Lokalizace `xConnect.*` v cs/en/uk. OAuth route `/api/accounts/x` ponechán (skryt v UI).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅.
- **Upravené soubory**: `src/components/x-connect-modal.tsx` (nový), `src/app/[locale]/(dashboard)/accounts/page.tsx`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

### 👁️ Vizuální vylepšení — Grayscale, datum smazání, archivovaný preview (Prompt 030, Krok 6)

- **Kontext**: Dokončení vizuálního zážitku pro archivované (soft-deleted) příspěvky. 5 refinements: černobílý filtr, datum smazání, oprava preview dialogu, lokalizace. Tlačítka Edit/Delete již byla skryta v Kroku 4.
- **Změny**: `_post-card.tsx` — grayscale(100%) filtr s group-hover grayscale-0 + transition; přidán `deleted_at` do typu a zobrazení data smazání vedle chipu "Archivováno". `preview-dialog.tsx` — pro archivované posty se filtrují platformy se statusem 'archived' místo 'published', takže se vykreslí high-fidelity náhled. Typy — `deleted_at` doplněn do `PostListItem`, `NormalizedPost` a `Post` (calendar). Lokalizace — nový klíč `deletedOn` (cs: "smazáno", en: "deleted", uk: "видалено").
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅.
- **Upravené soubory**: `src/app/[locale]/(dashboard)/posts/_post-card.tsx`, `src/components/preview-dialog.tsx`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`, `src/types/calendar.ts`, `src/app/[locale]/(dashboard)/posts/normalize-post.ts`.

### 🌐 i18n — Překlady pro archivované příspěvky (Prompt 030, Krok 5)

- **Kontext**: Chybějící překladové klíče `archivedBannerTitle` a `archivedBannerDesc` pro read-only banner v detailu archivovaného postu. Klíč `statusArchived` již existoval.
- **Změny**: Přidány 2 nové klíče do `messages/cs.json`, `en.json`, `uk.json`. Čeština: "Historický záznam" / "Tento příspěvek byl smazán...". Angličtina: "Historical Record" / "This post was deleted...". Ukrajinština: "Історичний запис" / "Цей допис було видалено...".
- **Ověření**: `npx tsc --noEmit` ✅, JSON validní ✅.
- **Upravené soubory**: `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

### 👁️ Vizuální odlišení — read-only režim pro archivované příspěvky (Prompt 030, Krok 4)

- **Kontext**: Archivované (soft-deleted) příspěvky potřebují vizuálně odlišit od aktivních — zašedlý vzhled, zámek v kalendáři, read-only režim v detailu, skrytí editačních tlačítek.
- **Změny**: `_post-card.tsx` — opacity-50 pro archivované, skrytí Edit/Delete (jen Preview). `post-calendar-chip.tsx` — Lock ikona. `posts/[id]/page.tsx` — isArchived detekce, read-only banner, disabled textarea/status/platform/location, hidden media section a action buttons. `preview-dialog.tsx` — banner "Historický záznam — tento příspěvek byl smazán". `deletePost` — `media_urls` již nemažeme (zachování vizuální hodnoty).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅.
- **Upravené soubory**: `src/app/[locale]/(dashboard)/posts/_post-card.tsx`, `src/components/calendar/post-calendar-chip.tsx`, `src/app/[locale]/(dashboard)/posts/[id]/page.tsx`, `src/components/preview-dialog.tsx`, `src/lib/actions/posts.ts`.

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
