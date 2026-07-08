# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### ✨ Feat — Očistění getTokenStatus (čistý render) (Prompt 025, Krok 5)

- **Kontext**: Krok 5 úkolu Prompt 025 – `getTokenStatus` volala `Date.now()` přímo v render-fázi (u každého účtu v `.map`), což dělalo komponentu nečistou a vyžadovalo file-level `eslint-disable react-hooks/purity`.
- **Změna** (`src/app/[locale]/(dashboard)/accounts/page.tsx`):
  1. `Date.now()` přesunuto z těla `getTokenStatus` do `useMemo(() => Date.now(), [])` (`now`) – počítá se jednou při mountu, ne při každém renderu.
  2. `getTokenStatus(account)` → `getTokenStatus(account, now)` (čistá funkce, žádné `Date.now()` v těle).
  3. File-level `/* eslint-disable react-hooks/purity */` odstraněn; ponechán jen scoped `// eslint-disable-next-line react-hooks/purity` přesně na `useMemo` inicializéru (který je vnitřně nečistý).
- **Ověření**: `npx tsc --noEmit` ✅; `npx eslint` na souboru ✅ (0 errors, jen 3 pre-existing warningy mimo tento zásah: `Clock` nepoužitý, 2× hook deps). Manuální test v prohlížeči ✅ (uživatel potvrdil – token-expiry badge se zobrazuje správně).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/accounts/page.tsx`, `ukol.md` (Krok 5 ✅)

### 🔧 Fix — Vrácení TikTok OAuth route do produkčního stavu + poznámka

- **Kontext**: TikTok OAuth fungoval na produkci (`https://postio-alpha.vercel.app/api/accounts/tiktok`), ale selhával na localhostu. Zkouška s `/callback` variantou (lokální route, která redirectovala zpět) na produkci neprošla – správná je původní prod adresa bez trailing lomítka.
- **Změna**:
  1. Smazána dočasná `/src/app/callback/route.ts` (lokální `/callback` varianta) – v kódu nezůstala žádná `/callback` reference kromě `/auth/callback`.
  2. `src/app/api/accounts/tiktok/route.ts` obnovena z HEAD do původního stavu (hardcoded prod URL, `sha256`/`base64url` PKCE, `secure`/`sameSite:"none"` cookies).
  3. Frontend reference v `accounts/page.tsx` vráceny z `/callback` zpět na `/api/accounts/tiktok` (OAuth handler i komentáře).
  4. Zapsána poznámka do `CLAUDE.md` (sekce 5 "TikTok OAuth – produkční Redirect URI"): URL je hardcoded na prod, na localhostu nefunguje, netrailing lomítko, žádná `/callback` route.
- **Ověření**: `grep -rn "/callback"` (kromě `/auth/callback`) → žádné ✅; `npx tsc --noEmit` po smazání `.next` → čisté ✅.

### ✨ Feat — Náhrada hardcoded textů za i18n na stránce Účty (Prompt 025, Krok 4)

- **Kontext**: Krok 4 úkolu Prompt 025 – na stránce Účty zůstaly natvrdo psané řetězce a mixed fallbacky (`t("x") || "y"`), které obcházely překlad a rozbíjely lokalizaci (chyba `MISSING_MESSAGE: accounts.loading`).
- **Změna**:
  1. `Načítání…` (early-return při načítání) → `{t("loading")}`.
  2. Mixed fallback `{t("active") || "Aktivní"}` → `{t("active")}` (čistý překlad, bez hardcodu).
  3. Doplněn chybějící klíč `loading` do `accounts` namespace v cs/en/uk (dříve existoval jen v jiném namespace → `MISSING_MESSAGE`).
- **Ověření**: JSON validní ve všech 3 souborech ✅, `npx tsc --noEmit` ✅. Manuální test v prohlížeči ✅ (uživatel potvrdil, chyba `MISSING_MESSAGE` odstraněna).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/accounts/page.tsx`, `src/messages/cs.json`/`en.json`/`uk.json`, `ukol.md` (Krok 4 ✅)

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

*Starší historii projektu a předchozí milníky najdeš v historii Git commitů na GitHubu.*
