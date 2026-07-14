# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🐦 Hybridní X režim — Logika publish + sekce „K vyřízení" (Prompt 031-X, Krok 3)

- **Kontext**: Po Krocích 1–2 se manuální X účet uloží, ale scheduler neměl twitter větev (padal do „Unsupported platform"). Hybridní režim vyžaduje, aby se manuální X posty NEposílaly přes API, ale označily k ručnímu vyřízení.
- **Změny**: `supabase/functions/process-scheduled-posts/index.ts` — přidána twitter větev: načte `social_accounts.publishing_type`; pro existující X účet nastaví `manualReady` (žádné volání API) a finální update zapíše `post_platforms.status='ready'` (zachovává `scheduled_at`). `ready` řádky se nepočítají do published/failed a nevkládají analytics; dotaz na začátku bere jen `status='scheduled'`, takže se znovu netahají. `dashboard/page.tsx` — nový dotaz na `post_platforms` (status 'ready', ilike twitter, přes posts!inner pro RLS) + sekce „K vyřízení" s kartami (náhled textu/obrázku, plánované datum, tlačítka „Kopírovat text" → schránka s feedbackem, „Stáhnout obrázek" → media_urls). `accounts/page.tsx` — badge „Manuální připomínka" u manuálního X účtu.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅.
- **Upravené soubory**: `supabase/functions/process-scheduled-posts/index.ts`, `src/app/[locale]/(dashboard)/dashboard/page.tsx`, `src/app/[locale]/(dashboard)/accounts/page.tsx`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.
### 🌐 i18n — Lokalizace Hybridního X režimu (Prompt 031-X, Krok 4)

- **Kontext**: Chybějící překladové klíče pro rozcestník (xConnect.*) a sekci „K vyřízení" (dashboard.*). xConnect.* přidány v Krocích 1, dashboard.* + accounts.manualReminder v Kroku 3 (nutné pro funkčnost sekce).
- **Změny**: Do `messages/cs.json`, `en.json`, `uk.json` přidány klíče `dashboard.todoTitle`, `dashboard.copyText`, `dashboard.copied`, `dashboard.downloadImage`, `dashboard.manualReminder` a `accounts.manualReminder` (cs: „K vyřízení"/„Kopírovat text"/„Zkopírováno"/„Stáhnout obrázek"/„Manuální připomínka"; en: „To do"/„Copy text"/„Copied"/„Download image"/„Manual reminder"; uk: „До виконання"/„Копіювати текст"/„Скопійовано"/„Завантажити зображення"/„Ручне нагадування").
- **Ověření**: JSON validní ✅, `npx tsc --noEmit` ✅.
- **Upravené soubory**: `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

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
