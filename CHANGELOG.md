# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🐦 Hybridní X režim — Označit jako publikované (Prompt 031-X-COMBO, Krok 2+3)

- **Kontext**: Po Krocích 1 a 5 šel manuální X post do sekce „K vyřízení", ale uživatel ho po ručním zveřejnění na X nemohl odtud odebrat. Chyběla akce, která přepne `post_platforms.status` z `'ready'` na `'published'`.
- **Změny**: `src/lib/actions/publish.ts` — nová `"use server"` funkce `markAsPublishedManual({ postId, platform?, accountId? })`: ověří vlastnictví postu, nastaví `status='published'`, `published_at=now()`, `publish_error=null` (scope přes `status='ready'` + volitelně `platform`/`accountId`), standardní revalidace. `dashboard/page.tsx` — widget „K vyřízení": `TodoPostItem` nově nese `postId`/`accountId`; emerald tlačítko „Označit jako publikované" volá akci a karta se po úspěchu optimisticky skryje. `_post-card.tsx` — tlačítko v zápatí karty (pouze pro twitter řádek ve stavu `'ready'`), po úspěchu `toast.success` + `router.refresh()`. i18n — `dashboard.markPublished` + `posts.markPublished` (cs/en/uk).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅.
- **Upravené soubory**: `src/lib/actions/publish.ts`, `src/app/[locale]/(dashboard)/dashboard/page.tsx`, `src/app/[locale]/(dashboard)/posts/_post-card.tsx`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

### 🐦 Indikátor „K vyřízení" pro manuální X posty (Prompt 031-X-COMBO, Krok 5)

- **Kontext**: Po Krocích 1–4 chyběla v seznamu Příspěvky a v kalendáři viditelná indikace, že manuální X post (platforma ve stavu `post_platforms.status='ready'`) se ještě musí ručně publikovat. V kartě byla `ready` ikona šedá bez popisku.
- **Změny**: `src/lib/types.ts` — `PlatformStatus` nyní zahrnuje `'ready'`. `_post-card.tsx` — ikona `ready` platformy má sky barvu + hodinový badge; vedle stavového badge přibyl odznáček „K vyřízení" (sky) s tooltipem „Manuální připomínka". `post-calendar-chip.tsx` — ikona `ready` platformy sky + hodinový badge (při `showBadges`). i18n — nové klíče `posts.todoTitle` + `posts.manualReminder` (cs/en/uk).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅.
- **Upravené soubory**: `src/lib/types.ts`, `src/app/[locale]/(dashboard)/posts/_post-card.tsx`, `src/components/calendar/post-calendar-chip.tsx`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

### 🐦 Oprava — Manuální X účet padal na validaci access_token (Prompt 031-X-COMBO, Krok 1)

- **Kontext**: Při „Odeslat"/naplánování příspěvku určeného jen pro manuální X účet (hybridní režim, `publishing_type='manual'`, `access_token` uložen jako prázdný řetězec) funkce `publishPost` padla na kontrole `if (!twAccount?.access_token)` s chybou „Chybí propojený X (Twitter) účet (access_token)." Manuální post se nedal odeslat.
- **Změny**: `src/lib/actions/publish.ts` — větev `twitter` v `publishPost` i `publishAdditionalPlatforms` nyní před kontrolou tokenu zjišťuje `publishing_type`. Pro `'manual'` přeskočí X API a zavolá novou `handleManualReady`, která zapíše `post_platforms.status='ready'` (zachovává `scheduled_at`). Řádek tak skončí v sekci „K vyřízení" na Dashboardu místo chyby.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅.
- **Upravené soubory**: `src/lib/actions/publish.ts`.

### 🎨 Oprava — Jednotná čistá ikona X napříč aplikací

- **Kontext**: Ikona X se na různých místech vykreslovala špatně — stránka „Sociální účty" (připojit účet) i univerzální connect modal používaly starý pták (`Twitter` z `social-icons`), zatímco `XIcon` už byl opraven.
- **Změny**: `src/components/ui/social-icons.tsx` — export `Twitter` nyní vykresluje stejnou čistou SVG cestu loga X jako `XIcon`. Tím se opraví ikona X na všech 5 místech: dlaždice „připojit účet", connect modal, kalendářní chip, preview dialog i edit dialog.
- **Ověření**: `npx tsc --noEmit` ✅.
- **Upravené soubory**: `src/components/ui/social-icons.tsx`.

### 🎨 Oprava — Barevné rozlišení stavu platforem v dashboardu (Poslední příspěvky)

- **Kontext**: V sekci „Poslední příspěvky" na dashboardu byly ikony všech platforem vždy šedé (`text-muted-foreground`), zatímco na stránce Příspěvky se barví podle stavu (zelená + fajfka při `published`). Nekonzistentní.
- **Změny**: `dashboard/page.tsx` — render ikon platforem nyní iteruje `post.post_platforms_raw` (místo deduplikovaného seznamu `post.platforms`) a aplikuje stejnou logiku jako `_post-card.tsx`: `published` → `text-emerald-400` + bílá fajfka v rohu, `failed` → červená, `removed_externally` → oranžová, ostatní → šedá. Přidán import `Check`.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅.
- **Upravené soubory**: `src/app/[locale]/(dashboard)/dashboard/page.tsx`.
### 🎨 Oprava — Čistá ikona X (místo poškozené SVG cesty)

- **Kontext**: `XIcon` v `social-icons.tsx` mělo ztvárněnou/neplatnou SVG cestu, která se v UI vykreslovala hrozně.
- **Změny**: `src/components/ui/social-icons.tsx` — `XIcon` nahrazen oficiální cestou loga X (čisté „X" písmo, viewBox 0 0 24 24, `fill="currentColor"`), dědí barvu z `className` (např. zelená při `published`).
- **Ověření**: `npx tsc --noEmit` ✅.
- **Upravené soubory**: `src/components/ui/social-icons.tsx`.

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
