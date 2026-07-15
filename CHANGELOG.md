# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### 🐛 Oprava – Globální zábrana horizontálního přetečení (KROK 1)

- **Kontext**: Na mobilu byla celá aplikace příliš široká (horizontální posuv). `body` měl jen `text-foreground`, chybělo `overflow-x-hidden`. Marketing layout navíc obsahuje glow div (`w-[860px]`) bez vlastního `overflow-hidden`, což přispívalo k přetečení.
- **Změny**: `src/app/globals.css` — v `@layer base` přidáno `overflow-x-hidden` do pravidla `body` (`@apply text-foreground overflow-x-hidden`). Horizontální posuv mizí plošně napříč aplikací a zároveň se ořízne přetečení od glow divu.
- **Ověření**: `npx tsc --noEmit` ✅, manuální test na mobilu ✅ (zmizel horizontální scroll na landing/dashboard).
- **Upravené soubory**: `src/app/globals.css`.

### 🐛 Oprava – Burger menu na landing page (chybějící tlačítko zpět)

- **Kontext**: Na mobilu se po rozkliknutí burger menu na landing page nezobrazovalo tlačítko zpět/zavřít. Celoobrazovkový overlay měl `z-40`, zatímco plovoucí header s hamburgerem `z-50` – zavírací X overlaye bylo schované pod headerem a nedostupné (klik na hamburger znovu jen volal `setOpen(true)`).
- **Změny**: `src/components/marketing/marketing-nav.tsx` — z-index overlaye zvednut z `z-40` na `z-[60]`, takže jeho horní lišta s tlačítkem X je nyní nad headerem viditelná a klikatelná.
- **Ověření**: manuální test na mobilu ✅ (X zavírá menu).
- **Upravené soubory**: `src/components/marketing/marketing-nav.tsx`.

### 🐛 Oprava – Mobilní responzivita cookie dialogu + footer newsletter (KROK 3)

- **Kontext**: Cookie dialog („Nastavení souborů cookie") na mobilu přesahoval výšku i šířku obrazovky – zavírací X i tlačítka byla mimo dosah („nelze zpět"). Po přidání tlačítka „Zavřít" footer dialogu (3 tlačítka vedle sebe) způsobil horizontální přetečení. Navíc newsletter formulář ve footeru (input + tlačítko „Odebírat" v `flex` bez zalomení) vytlačoval tlačítko vpravo mimo rámeček.
- **Změny**: `src/components/ui/dialog.tsx` — `DialogContent` nově `max-h-[90vh] overflow-y-auto overflow-x-hidden` (obsah se posouvá, žádný horizontální posuv). `src/components/cookie-consent.tsx` — do zápatí dialogu přidáno explicitní tlačítko „Zavřít" (i18n klíč `cookie.close` v cs/en/uk); footer nyní složí tlačítka pod sebe na mobilu (`flex-col-reverse sm:flex-row`). `src/components/marketing/newsletter-form.tsx` — formulář `flex-col sm:flex-row`, tlačítko `w-full sm:w-auto`, input `min-w-0` (zabránění horizontálnímu přetečení).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test na mobilu ✅ (dialog i footer vejdou do obrazovky, zavírá se přes X i „Zavřít").
- **Upravené soubory**: `src/components/ui/dialog.tsx`, `src/components/cookie-consent.tsx`, `src/components/marketing/newsletter-form.tsx`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

### 🐦 Hybridní X režim — UI text + i18n (Prompt 031-X-COMBO, Krok 4)

- **Kontext**: Po Krocích 1–3 uživatel nepoznal, že „odeslání" manuálního X postu neznamená reálné zveřejnění, ale jen přípravu k ručnímu vyřízení. Tlačítko v editoru i toast hlásily „publikováno".
- **Změny**: `posts/new/page.tsx` — `AccountInfo` nově nese `publishing_type`; `hasManualTwitter` detekuje výběr manuálního X účtu (`platform=twitter` + `publishing_type='manual'`). Hlavní tlačítko zní pak `posts.prepareToDo` („Připravit k vyřízení 🔔") místo `posts.publishNow`; success toast používá `dashboard.markPublishedToast` („Označeno jako publikované") místo „Příspěvek byl úspěšně publikován!". i18n — přidány klíče `posts.prepareToDo` + `dashboard.markPublishedToast` (cs/en/uk).
- **Ověření**: `npx tsc --noEmit` ✅, manuální test ✅.
- **Upravené soubory**: `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`.

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
