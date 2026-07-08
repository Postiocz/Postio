# Changelog

> Všechny podstatné změny v projektu Postio jsou zapisovány do tohoto souboru.
> Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/1.1.0/).

### ✨ Feat — Informativní toast při 0 Facebook Pages po OAuth (Prompt 025, Krok 7)

- **Kontext**: Krok 7 úkolu Prompt 025 – po návratu z Facebook OAuth (`?fb=connected`) se při nulovém počtu spravovatelných stránek query parametr jen tiše mazal, takže uživatel nedostal žádnou zpětnou vazbu.
- **Změna** (`src/app/[locale]/(dashboard)/accounts/page.tsx`):
  1. Effect pro `?fb=connected` čeká na dokončení načtení pending Pages i připojených účtů, aby nevyhodnotil stav předčasně.
  2. Pokud po načtení neexistují žádné pending Facebook Pages ani nově připojený Facebook/Instagram účet, zobrazí `toast.info(t("noPagesFound"))`.
  3. Pokud OAuth připojil aspoň Facebook nebo Instagram účet, parametr se dál jen uklidí bez toastu, aby se nezobrazovala zavádějící hláška.
- **Ověření**: manuální test v prohlížeči ✅ (uživatel potvrdil, že krok 7 je hotový a zkontrolovaný).
- **Upravené soubory**: `src/app/[locale]/(dashboard)/accounts/page.tsx`, `ukol.md` (Krok 7 ✅)

### 🔧 Fix — Idempotentní POST /api/accounts (žádné duplicity u ručního připojení)

- **Kontext**: Návaznost na Krok 6 (Prompt 025). `POST /api/accounts` používal prostý `.insert()` bez `platform_id`/onConflict → při opakovaném ručním připojení (onboarding) vznikal druhý řádek. Endpoint není mrtvý – volá ho `onboarding/client.tsx` (krok 1 „připoj účet"), takže jej nelze jen zlikvidovat.
- **Změna** (`src/app/api/accounts/route.ts`):
  1. Před zápisem se zkontroluje existence ručního záznamu (`user_id, platform, platform_id IS NULL`); pokud existuje, `update`, jinak `insert` → idempotentní připojení bez duplicit.
  2. Reconnect existujícího ručního účtu povolen i na limitu plánu (nový účet blokován až po vyčerpání kapacity).
- **Ověření**: `npx tsc --noEmit` ✅.
- **Upravené soubory**: `src/app/api/accounts/route.ts`.

### ✨ Feat — Ověření reconnect: žádné duplicity (Prompt 025, Krok 6)

- **Kontext**: Krok 6 úkolu Prompt 025 – ověřit, že Reconnect u všech platforem (zejm. Instagram/TikTok) dělá upsert a nevytváří druhý řádek v `social_accounts`.
- **Změna**: Žádná (verifikační krok). Všechny OAuth routy (`tiktok`, `linkedin`, `x`, `auth/callback` pro FB/IG i YouTube) již používají `.upsert(..., { onConflict: "user_id,platform,platform_id" })`. Migrace `012` definuje unikátní index `social_accounts_user_platform_platform_id_key` na `(user_id, platform, platform_id)`, takže upsert koliduje se stávajícím řádkem a aktualizuje ho – **žádné duplicity** při reconnectu.
- **Zjištění (mimo rozsah Kroku 6)**: `POST /api/accounts` stále používá `.insert()` bez `platform_id`/onConflict (legacy ruční token formulář). Není mrtvý – volá ho `onboarding/client.tsx`. Oddělený úklid viz následující akce.
- **Ověření**: Code/DB review všech OAuth route + migrace `012` ✅. Manuální test reconnectu v prohlížeči ✅ (uživatel potvrdil závěr).
- **Upravené soubory**: `ukol.md` (Krok 6 ✅).

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

*Starší historii projektu a předchozí milníky najdeš v historii Git commitů na GitHubu.*
