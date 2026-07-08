# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### ✨ Feat — Odstranění mrtvého manuálního token formuláře (Prompt 025, Krok 3)

- **Kontext**: Krok 3 úkolu Prompt 025 – na stránce Účty zůstal legacy manuální formulář (jméno účtu + access token), který nepoužívala žádná platforma (vše jede přes OAuth). Technický dluh a matoucí UI.
- **Změna** (`src/app/[locale]/(dashboard)/accounts/page.tsx`):
  1. Smazán `handleConnect` i celý JSX manuálního formuláře včetně jeho `ternary`/`IIFE` obálky v gridu platforem.
  2. Odebrány mrtvé stavy `selectedPlatform`, `accountName`, `accessToken`, `connecting` (používaly výhradně tento formulář).
  3. `onClick` zjednodušen: všechny platformy jdou rovnou přes OAuth modal (`ConnectAccountModal`); odstraněna nedosažitelná `else` větev i legacy komentář.
  4. Stav `error` (jeho jediné vykreslení bylo ve formuláři) zcela odstraněn; chyby z delete/OAuth handlerů převedeny na `toast.error` (zachována zpětná vazba, dříve se ztratily).
  5. Odebrány nepoužité importy `Input`, `Label`, `X`.
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint` ✅ (zbývají jen 3 pre-existing warningy: `Clock` nepoužitý, 2× hook deps mimo tento zásah). Manuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/accounts/page.tsx`, `ukol.md` (Krok 3 ✅)

### ✨ Feat — Fallback pro nefunkční avatary na stránce Účty (Prompt 025, Krok 2)

- **Kontext**: Krok 2 úkolu Prompt 025 – avatary připojených účtů i pending FB stránek se načítaly z CDN bez ošetření chyby. Při 403/expiraci CDN se zobrazoval rozbitý obrázek.
- **Změna** (`src/app/[locale]/(dashboard)/accounts/page.tsx`):
  1. Nová komponenta `PlatformAvatar` (lokální `useState` `errored` + `<img onError>`): při selhání načtení skryje `<img>` a renderuje fallback (ikona platformy), místo rozbitého obrázku. Při chybějícím `src` jde rovnou na fallback.
  2. Nahrazena obě místa s nativním `<img>`: připojené účty (fallback = `Icon`, jinak 🔗) i pending FB stránky (fallback = `<Facebook>` ikona).
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint` ✅ (jen pre-existing warningy: `Clock` nepoužitý, 2× hook deps mimo tento zásah). Manuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/accounts/page.tsx`, `ukol.md` (Krok 2 ✅)

### ✨ Feat — Vynucení limitu účtů podle plánu (Prompt 025, Krok 1: server + klient)

- **Kontext**: Krok 1 úkolu Prompt 025 – zabránit připojení více účtů, než povoluje plán uživatele (Free=1, Creator=5, Pro=∞). Dříve šlo limit obejít na straně klienta.
- **Změna**:
  - Nový sdílený helper `src/lib/account-limit.ts`: `ACCOUNT_LIMITS`, `getAccountLimitInfo` (počítá aktivní účty `is_active=true`), `isNewAccountAllowed` (reconnect existujícího účtu povolen i na limitu), `accountLimitErrorMessage`.
  - Server-side kontrola v `POST /api/accounts/route.ts`, OAuth routech `linkedin`/`x`/`tiktok`, server action `toggleAccountActive` (aktivace FB stránky) a `auth/callback/route.ts` (IG auto-aktivace ve FB OAuth). Při překročení: 403 JSON / redirect `?error=` / toast.
  - Klientská proaktivní blokace v `accounts/page.tsx`: pokud `activeAccounts >= limit`, kliknutí na nepřipojenou platformu zobrazí `toast.error` (`accountLimitReached`) a neotevře OAuth; reconnect připojeného účtu povolen.
  - i18n klíč `accountLimitReached` v cs/en/uk.
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint` na změněných souborech ✅ (jen pre-existing warningy). Manuální test v prohlížeči potvrdil uživatel jako hotové bez vlastního testu (nemá jak otestovat).
- **Upravené soubory**: `src/lib/account-limit.ts` (nový), `src/app/api/accounts/route.ts`, `linkedin/route.ts`, `x/route.ts`, `tiktok/route.ts`, `src/lib/actions/social-accounts.ts`, `src/app/auth/callback/route.ts`, `src/app/[locale]/(dashboard)/accounts/page.tsx`, `src/messages/cs.json`/`en.json`/`uk.json`, `ukol.md` (Krok 1 ✅)

### ✨ Feat — Dashboard: kompaktnější karty "Poslední příspěvky" (Prompt 024, Krok 3: texty & padding)

- **Kontext**: Závěrečný krok Prompt 024 (po Krok 1 grid xl:4 a Krok 2 max-h thumbnailu). Krok 3 zkompaktí vnitřek karty pro čitelnost v užším formátu.
- **Změna** (`src/app/[locale]/(dashboard)/page.tsx`):
  1. `CardContent` padding `p-4` → `p-3.5` (úspornější vnitřek).
  2. Nadpis příspěvku `h3` doplněn o `text-sm` (menší, stále čitelný).
- **Ověření**: manuální test v prohlížeči ✅ (uživatel potvrdil — karty vypadají přesně podle zadání).
- **Upravené soubory**: `page.tsx`, `ukol.md` (Krok 3 označen ✅)

### ✨ Feat — Dashboard: kompaktnější karty "Poslední příspěvky" (Prompt 024, Krok 2)

- **Kontext**: Pokračování Prompt 024 (Krok 1 změnil grid na xl:grid-cols-4). Krok 2 omezuje výšku media náhledu v užší 4-sloupcové kartě.
- **Změna** (`src/app/[locale]/(dashboard)/page.tsx`):
  1. Media kontejner (ř. 669) rozšířen o `max-h-[140px]` → výška náhledu nepřesáhne 140px (při 4 sloupcích se mírně zúží/ořízne přes `object-cover`).
  2. `rounded-xl` → `rounded-lg` (menší radius sedí ke kompaktnější kartě).
- **Ověření**: manuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `page.tsx`, `ukol.md` (Krok 2 označen ✅)

### ✨ Feat — Dashboard: kompaktnější karty "Poslední příspěvky" (Prompt 024, Krok 1)

- **Kontext**: Úkol Prompt 024 — karty v sekci Poslední příspěvky byly vizuálně příliš velké a disproporční oproti ostatním widgetům. Krok 1 mění pouze rozložení gridu.
- **Změna** (`src/app/[locale]/(dashboard)/page.tsx`):
  1. Grid sekce Poslední příspěvky (ř. 602) rozšířen o `xl:grid-cols-4` → na xl (≥1280px) **4 karty na řádek**, lg zůstává 3, sm 2.
- **Ověření**: manuální test v prohlížeči ✅ (uživatel potvrdil).
- **Upravené soubory**: `page.tsx`, `ukol.md` (Krok 1 označen ✅)

### ✨ Feat — Chytrá validace platforem podle příloh (Prompt 023, Krok 4: Auto-Deselect)

- **Kontext**: Finální krok úkolu Prompt 023. Krok 1 přidal `disabled` logiku, Krok 2 vizuální zpětnou vazbu (zeslabení + tooltip), Krok 3 překlady. Krok 4 zajišťuje, že vybraná platforma se automaticky odškrtne, když uživatel smaže médium, které požaduje.
- **Změna** (`src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx`):
  1. Nový handler `handleRemoveMedia(id)` nahrazuje přímé volání `removeMediaItem` na tlačítku pro mazání média.
  2. Handler spočítá množinu médií *po* smazání (`nextMedia`) a odvodí `nextHasVideo` / `nextHasAnyMedia`, pak z `platforms`/`selectedPlatforms` odfiltruje jen platformy, jejichž požadavek je v nové množině splněn (TikTok/YouTube → video, Instagram → jakékoliv médium).
  3. Odfiltrují se **pouze** platformy, které přestaly vyhovovat — nikdy se nepřidávají zpět (vrátí-li uživatel média, musí platformu zaškrtnout znovu).
  4. Záměrně implementováno jako handler události, ne `useEffect` + `setState` (lint pravidlo `react-hooks/set-state-in-effect` by to zamítlo).
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint` na obou souborech ✅ (zbývá jen pre-existing warning na nepoužitý `eslint-disable` v TikTok náhledu).
- **Upravené soubory**: `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `ukol.md` (Krok 4 označen ✅, sekce úkolu smazána dle Pravidla 7), `CHANGELOG.md`

### ✨ Feat — Chytrá validace platforem podle příloh (Prompt 023, Krok 2: UI)

- **Kontext**: Pokračování úkolu Prompt 023. Krok 1 přidal logiku `disabled`; Krok 2 přidává vizuální zpětnou vazbu (zeslabení + tooltip s vysvětlením).
- **Změna**:
  1. Nová komponenta `src/components/ui/tooltip.tsx` (Radix `Tooltip`, portálovaná do `<body>`, takže ji neoorízne scroll kontejner dialogu).
  2. `edit-post-dialog.tsx` i `posts/new/page.tsx`: zakázaná tlačítka platforem dostala `opacity-50 cursor-not-allowed`.
  3. Když je tlačítko zakázané kvůli chybějící příloze, je obaleno `Tooltipem` s i18n vysvětlením (`tiktokRequiresVideo` / `youtubeRequiresVideo` / `instagramRequiresMedia`, klíče z Krok 3).
  4. Disabled `<button>` je zabalen do vždy-interaktivního `<span>`u (disabled tlačítko nevysílá hover události, tooltip by nefungoval). Sekce platforem obalena `TooltipProvider`.
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint` na všech 3 souborech ✅ (jediná výtka je pre-existing warning v TikTok náhledu).
- **Upravené soubory**: `src/components/ui/tooltip.tsx` (nový), `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `ukol.md` (Krok 2 označen ✅)

### ✨ Feat — Chytrá validace platforem podle příloh (Prompt 023, Krok 3: překlady)

- **Kontext**: Pokračování úkolu Prompt 023. Krok 3 přidává i18n klíče pro tooltipy, které se použijí v Krok 2 (Tooltip při najetí na zakázané tlačítko platformy).
- **Změna** (`src/messages/cs.json`, `en.json`, `uk.json`):
  1. Do namespace `posts` (a záložně i `calendar`, kde stejné klíče duplikovaně existují) přidány 3 klíče: `tiktokRequiresVideo`, `youtubeRequiresVideo`, `instagramRequiresMedia`.
  2. Překlady cs / en / uk s vysvětlením požadavku na přílohu (video / médium).
- **Ověření**: JSON validní ve všech 3 souborech ✅ (`node -e JSON.parse`).
- **Upravené soubory**: `src/messages/cs.json`, `src/messages/en.json`, `src/messages/uk.json`, `ukol.md` (Krok 3 označen ✅)

### ✨ Feat — Chytrá validace platforem podle příloh (Prompt 023, Krok 1)

- **Kontext**: Úkol Prompt 023 – zabránit výběru platformy, která nepodporuje nahraný typ obsahu (např. TikTok bez videa). Krok 1 zavádí pouze validační logiku (disabled stav); vizuální zvýraznění (opacity-50 / Tooltip) přijde v Krok 2 a auto-odškrtnutí vybrané platformy po smazání média v Krok 4.
- **Změna** (`src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx`):
  1. Přidány memoizované příznaky `hasVideoAttachment` / `hasAnyMediaAttachment` odvozené z `mediaItems` (vynechány chybné uploady `status === "error"`).
  2. Přidána `isPlatformMediaRequirementMet(platformId)`: TikTok & YouTube vyžadují video, Instagram vyžaduje jakékoliv médium, Facebook/X/LinkedIn podporují cokoliv.
  3. Tlačítka platforem dostala `disabled`, když požadavek není splněn a platforma není již publikovaná (`isPublished`).
- **Ověření**: `npx tsc --noEmit` ✅, `npx eslint` na obou souborech ✅ (jediná výtka je pre-existing warning na řádku 1550 v TikTok náhledu, mimo tento zásah).
- **Upravené soubory**: `src/components/edit-post-dialog.tsx`, `src/app/[locale]/(dashboard)/posts/new/page.tsx`, `ukol.md` (Krok 1 označen ✅)

*Starší historii projektu a předchozí milníky najdeš v historii Git commitů na GitHubu.*
